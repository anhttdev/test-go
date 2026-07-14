package handlers

import (
	"db/internal/dto"
	"db/internal/pkg/apperr"
	"db/internal/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AccountHandler struct {
	as service.AccountService
}

func NewAccountHandler(as service.AccountService) *AccountHandler {
	return &AccountHandler{
		as: as,
	}
}

func (ah *AccountHandler) RegisterNewAccount(ctx *gin.Context) {
	var input dto.RegisterAccountInput

	// Bind và validate dữ liệu theo các tag binding đã đặt ở DTO
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Gọi xuống repo xử lý transaction tạo 2 bảng
	if err := ah.as.RegisterAccount(input); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Tạo tài khoản người dùng thành công!",
	})
}

func (ah *AccountHandler) AssignRoleAccount(ctx *gin.Context) {
	var input dto.AssignRoleToAccount

	if err := ctx.BindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Định dạng JSON đầu vào không hợp lệ: " + err.Error()})
		return
	}

	if err := ah.as.AssignRolesToAccount(input.AccountID, input.Roles); err != nil {
		if errors.Is(err, apperr.ErrAccountNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		if errors.Is(err, apperr.ErrAssignRoleFailed) {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Hệ thống gặp sự cố, vui lòng thử lại sau"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Bổ nhiệm chức vụ cho cán bộ thành công!",
	})
}

func (ah *AccountHandler) RemoveRoleAccount(ctx *gin.Context) {
	var input dto.AssignRoleToAccount

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Định dạng JSON đầu vào không hợp lệ: " + err.Error()})
		return
	}

	if err := ah.as.RemoveRolesFromAccount(input.AccountID, input.Roles); err != nil {
		if errors.Is(err, apperr.ErrAccountNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		if errors.Is(err, apperr.ErrRemoveRoleFailed) {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Hệ thống gặp sự cố, vui lòng thử lại sau"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Bãi nhiệm chức vụ của cán bộ thành công!",
	})
}

func (ah *AccountHandler) GetCurrentAccountRoles(ctx *gin.Context) {
	// 🔒 BỐC AN TOÀN: Lấy ID từ con Middleware gác cổng check JWT Token
	accountIDValue, exists := ctx.Get("current_account_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Tài khoản chưa được xác thực hoặc phiên đăng nhập hết hạn"})
		return
	}

	accountID, ok := accountIDValue.(uint)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống: Định dạng tài khoản không hợp lệ"})
		return
	}

	roles, err := ah.as.GetAccountRoles(accountID)
	if err != nil {
		if errors.Is(err, apperr.ErrAccountNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"data": roles,
	})
}

func (ah *AccountHandler) GetCurrentAccountPermissions(ctx *gin.Context) {
	accountIDValue, exists := ctx.Get("current_account_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Tài khoản chưa được xác thực hoặc phiên đăng nhập hết hạn"})
		return
	}

	accountID, ok := accountIDValue.(uint)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống: Định dạng tài khoản không hợp lệ"})
		return
	}

	permissions, err := ah.as.GetAccountPermission(accountID)
	if err != nil {
		if errors.Is(err, apperr.ErrAccountNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"data": permissions,
	})
}

// GetProfile - API lấy thông tin hồ sơ của chính tài khoản đang đăng nhập
func (ah *AccountHandler) GetProfile(ctx *gin.Context) {
	// 1. Bốc account_id đã được con Middleware AuthRequired giải mã và gán sẵn trước đó
	accountIDValue, exists := ctx.Get("current_account_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Yêu cầu đăng nhập để lấy thông tin hồ sơ"})
		return
	}

	// 2. Ép kiểu any sang uint thần thánh mà anh em mình vừa học
	accountID, ok := accountIDValue.(uint)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống: Định dạng tài khoản trong session không hợp lệ"})
		return
	}

	// 3. Gọi xuống tầng Service để quét DB
	accountProfile, err := ah.as.GetProfileByAccountID(accountID)
	if err != nil {
		// Nếu không tìm thấy bản ghi dưới DB
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy hồ sơ tài khoản hợp lệ"})
		return
	}

	// 4. Trả về cục JSON "đặc ruột" cực kỳ sạch sẽ cho Frontend render giao diện
	ctx.JSON(http.StatusOK, gin.H{
		"message": "Lấy thông tin hồ sơ thành công",
		"data":    accountProfile,
	})
}
