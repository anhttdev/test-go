package handlers

import (
	"db/internal/dto"
	"db/internal/service"
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
