package middleware

import (
	db "db/internal/db/migrations"
	"db/internal/model"
	"db/internal/service"
	"db/internal/utils"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

var jwtSecret = []byte(utils.GetEnv("secret_key", "secretkey"))

func AuthRequired() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Yêu cầu cung cấp token xác thực (Header Authorization bị trống)"})
			ctx.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Định dạng token không hợp lệ (Phải là Bearer <token>)"})
			ctx.Abort()
			return
		}

		tokenString := parts[1]
		claims := &service.MyClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Token đã hết hạn hoặc không hợp lệ"})
			ctx.Abort()
			return
		}

		ctx.Set("current_user_id", claims.UserID)
		ctx.Set("current_username", claims.Username)

		ctx.Next()
	}
}

func AuthRequiredWithCookie() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		accessToken, err := ctx.Cookie("access_token")
		if err != nil || accessToken == "" {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"error": "Không tìm thấy cookie xác thực hoặc phiên làm việc đã hết hạn",
			})
			ctx.Abort()
			return
		}
		claims := &service.MyClaims{}

		token, err := jwt.ParseWithClaims(accessToken, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Cookie không hợp lệ hoặc đã hết hạn"})
			ctx.Abort()
			return
		}
		ctx.Set("current_user_id", claims.UserID)
		ctx.Set("current_username", claims.Username)

		ctx.Next()
	}
}

func AuthRequiredWithCookieAndBlacklist(redisClient *redis.Client) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		tokenString, err := ctx.Cookie("access_token")
		if err != nil {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Phiên làm việc đã hết hạn hoặc không tồn tại"})
			ctx.Abort()
			return
		}
		var claims service.MyClaims
		token, err := jwt.ParseWithClaims(tokenString, &claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Mã token không hợp lệ"})
			ctx.Abort()
			return
		}
		tokenVersion := int(claims.TokenVersion)
		userIDStr := strconv.Itoa(int(claims.UserID))

		redisKey := "user_version:" + userIDStr
		currentVersionStr, err := redisClient.Get(ctx, redisKey).Result()
		var currentVersion int
		var account model.Account
		if err != nil {
			if dbErr := db.DB.Where("user_id = ?", claims.UserID).First(&account).Error; dbErr == nil {
				currentVersion = int(account.TokenVersion)
				redisClient.Set(ctx.Request.Context(), redisKey, account.TokenVersion, 30*24*time.Hour)
			} else {
				ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Tài khoản không tồn tại trên hệ thống"})
				ctx.Abort()
				return
			}
		} else {
			currentVersion, _ = strconv.Atoi(currentVersionStr)
			db.DB.Model(&model.Account{}).Where("user_id = ?", claims.UserID).Select("id").First(&account)
		}

		if tokenVersion != currentVersion {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Tài khoản của bạn đã đăng xuất hoặc đổi mật khẩu trên thiết bị khác!"})
			ctx.Abort()
			return
		}
		ctx.Set("current_user_id", claims.UserID)
		ctx.Set("current_account_id", account.ID)
		ctx.Next()
	}
}

func AuthPermission(as *service.AccountService, perms string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		accountIDValue, ok := ctx.Get("current_account_id")
		if !ok {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Chưa đăng nhập"})
			ctx.Abort()
			return
		}

		accountID, ok := accountIDValue.(uint)
		if !ok {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống: Ép kiểu ID thất bại"})
			ctx.Abort()
			return
		}
		hasPerms, err := as.CheckAccountPermission(accountID, perms)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống: Truy vấn Permission thất bại"})
			ctx.Abort()
			return
		}
		if !hasPerms {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "Bạn không có quyền truy cấp chức năng này"})
			ctx.Abort()
			return
		}
		ctx.Next()
	}
}
