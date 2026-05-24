package handlers

import (
	"db/internal/dto"
	"db/internal/model"
	"db/internal/pkg/apperr"
	"db/internal/service"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	AutherService  service.AuthService
	JwtService     service.JwtService
	RedisClient    *redis.Client
	db             *gorm.DB
	AccountService service.AccountService
}

func NewAuthHandler(AuthService service.AuthService, JwtService service.JwtService, RedisClient *redis.Client, db *gorm.DB, AccountService service.AccountService) *AuthHandler {
	return &AuthHandler{
		AutherService:  AuthService,
		JwtService:     JwtService,
		RedisClient:    RedisClient,
		db:             db,
		AccountService: AccountService,
	}
}

func (h *AuthHandler) Login(ctx *gin.Context) {
	var input dto.LoginInput

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu đầu vào không đúng định dạng JSON",
			"error":   err.Error(),
		})
		return
	}

	res, err := h.AutherService.Login(input)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	ctx.SetCookie("access_token", res.AccessToken, 300, "/", "localhost", false, true)
	ctx.SetCookie("refresh_token", res.RefreshToken, 7*24*3600, "/", "localhost", false, true)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đăng nhập thành công và đã cấu hình Cookie!",
	})
}

func (h *AuthHandler) LoginWithLocalStorage(ctx *gin.Context) {
	var input dto.LoginInput

	// 1. Đọc dữ liệu đăng nhập từ Frontend gửi lên
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}

	// 2. Gọi Service xử lý (Kiểm tra pass, sinh cả 2 token AC và RF)
	res, err := h.AutherService.Login(input)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// 3. TRẢ VỀ JSON THUẦN TÚY: Không cài Cookie gì hết!
	ctx.JSON(http.StatusOK, gin.H{
		"success":       true,
		"message":       "Đăng nhập thành công!",
		"access_token":  res.AccessToken,  // Chuỗi JWT ngắn hạn
		"refresh_token": res.RefreshToken, // Chuỗi JWT dài hạn
		"token_type":    "Bearer",
	})
}

func (h *AuthHandler) RefreshToken(ctx *gin.Context) {
	var input dto.RefreshInput

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}

	res, err := h.JwtService.Refresh(input)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":       true,
		"access_token":  res.AccessToken,
		"refresh_token": res.RefreshToken,
	})
}
func (h *AuthHandler) Logout(ctx *gin.Context) {
	ctx.SetCookie("access_token", "", -1, "/", "localhost", false, true)
	ctx.SetCookie("refresh_token", "", -1, "/", "localhost", false, true)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đăng xuất thiết bị hiện tại thành công! Các thiết bị khác vẫn hoạt động bình thường.",
	})
}

func (h *AuthHandler) LogoutAllService(ctx *gin.Context) {
	userID, _ := ctx.Get("current_user_id")
	err := h.db.Model(&model.Account{}).
		Where("user_id = ?", userID).
		Update("token_version", gorm.Expr("token_version + 1")).Error
	if err != nil {
		ctx.JSON(500, gin.H{"error": "Không thể cập nhật version mới"})
		return
	}
	var account model.Account
	if err = h.db.Where("user_id = ?", userID).First(&account).Error; err != nil {
		ctx.JSON(500, gin.H{"error": "Không thể lấy dữ liệu"})
		return
	}
	userIDUint := userID.(uint)
	redisKey := "user_version:" + strconv.Itoa(int(userIDUint))
	if err = h.RedisClient.Set(ctx, redisKey, account.TokenVersion, 30*24*time.Hour).Err(); err != nil {
		ctx.JSON(500, gin.H{"error": "Không thể cập nhật redis"})
		return
	}
	ctx.SetCookie("access_token", "", -1, "/", "localhost", false, true)
	ctx.SetCookie("refresh_token", "", -1, "/", "localhost", false, true)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đăng xuất thành công, Cookie đã được xóa sạch và token đã bị vô hiệu hóa!",
	})
}

func (h *AuthHandler) VerifyResetToken(ctx *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": "Thiếu token"})
		return
	}

	var resetObj model.PasswordReset
	// Tìm token trong DB và xem còn hạn (ExpiredAt > Hiện tại) không
	err := h.db.Where("token = ? AND expired_at > ?", req.Token, time.Now()).First(&resetObj).Error
	if err != nil {
		ctx.JSON(400, gin.H{"error": "Mã xác nhận không hợp lệ hoặc đã hết hạn!"})
		return
	}

	ctx.JSON(200, gin.H{"success": true, "message": "Token hợp lệ, mời nhập mật khẩu mới", "email": resetObj.Email})
}

func (h *AuthHandler) ResetPassword(ctx *gin.Context) {
	var req struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": "Dữ liệu nhập vào không hợp lệ"})
		return
	}
	var resetObj model.PasswordReset
	// Tìm token trong DB và xem còn hạn (ExpiredAt > Hiện tại) không
	err := h.db.Where("token = ? AND expired_at > ?", req.Token, time.Now()).First(&resetObj).Error
	if err != nil {
		ctx.JSON(400, gin.H{"error": "Mã xác nhận không hợp lệ hoặc đã hết hạn!"})
		return
	}

	hashedPass, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		ctx.JSON(500, gin.H{"error": "Lỗi mã hóa mật khẩu"})
		return
	}

	err = h.db.Model(&model.Account{}).
		Where("user_id = (?)", h.db.Model(&model.User{}).Select("id").Where("gmail = ?", resetObj.Email)).
		Update("password_hash", string(hashedPass)).Error
	if err != nil {
		ctx.JSON(500, gin.H{"error": "Không thể cập nhật mật khẩu"})
		return
	}
	h.db.Delete(&resetObj)
	ctx.JSON(200, gin.H{"success": true, "message": "Chúc mừng! Mật khẩu của bạn đã được đổi thành công!"})
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Email không hợp lệ"})
		return
	}

	err := h.AccountService.SendResetPassWord(req.Email)
	if err != nil {
		c.JSON(200, gin.H{"message": "Nếu email tồn tại, một liên kết đặt lại mật khẩu đã được gửi!"})
		return
	}

	c.JSON(200, gin.H{"message": "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn!"})
}

func (h *AuthHandler) ChangePassword(ctx *gin.Context) {
	userIDInter, exists := ctx.Get("current_user_id")
	if !exists || userIDInter == nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Phiên làm việc không hợp lệ hoặc đã hết hạn"})
		ctx.Abort()
		return
	}
	userID := userIDInter.(uint)

	var input dto.ChangePasswordInput
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu đầu vào không hợp lệ hoặc mật khẩu quá ngắn!"})
		return
	}

	err := h.AccountService.ChangePassWord(userID, input.NewPassword, input.OldPassword)
	if err != nil {
		if err == apperr.ErrInvalidCredentials {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Mật khẩu cũ không chính xác!"})
			return
		}

		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đổi mật khẩu thành công! Tất cả các thiết bị khác sử dụng token cũ đã bị kích out lập tức.",
	})
}
