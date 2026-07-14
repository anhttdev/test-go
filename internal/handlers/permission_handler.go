package handlers

import (
	"db/internal/dto"
	"db/internal/pkg/apperr"
	"db/internal/service"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type PermissionHandler struct {
	ps *service.PermissionService
}

func NewPermissionHandler(ps *service.PermissionService) *PermissionHandler {
	return &PermissionHandler{
		ps: ps,
	}
}

func (ph *PermissionHandler) CreatePermission(ctx *gin.Context) {
	var input dto.CreatePermissionInput
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu đầu vào không đúng định dạng: " + err.Error()})
		return
	}

	if err := ph.ps.CreatePermission(input); err != nil {
		// Trùng mã quyền hạn (permission_code) trả về 409 Conflict
		if errors.Is(err, apperr.ErrPermissionAlreadyExists) {
			ctx.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		// Lỗi hệ thống khác
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{"message": "Tạo quyền hạn mới thành công!"})
}

func (ph *PermissionHandler) GetAllPermissions(ctx *gin.Context) {
	perms, err := ph.ps.GetAllPermissions()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"data": perms})
}

func (ph *PermissionHandler) UpdatePermission(ctx *gin.Context) {
	// Bóc ID trên URL
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID quyền hạn không hợp lệ"})
		return
	}

	var input dto.CreatePermissionInput
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu đầu vào không đúng định dạng: " + err.Error()})
		return
	}

	if err := ph.ps.UpdatePermission(uint(id), input); err != nil {
		// Không tìm thấy quyền cần sửa (404 Not Found)
		if errors.Is(err, apperr.ErrPermissionNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		// Mã quyền mới bị trùng với dòng khác (400 Bad Request)
		if errors.Is(err, apperr.ErrPermissionCodeInUse) {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		// Lỗi hệ thống khi lưu
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Cập nhật thông tin quyền hạn thành công!"})
}

func (ph *PermissionHandler) DeletePermission(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID quyền hạn không hợp lệ"})
		return
	}

	if err := ph.ps.DeletePermission(uint(id)); err != nil {
		// Không tìm thấy quyền để xóa
		if errors.Is(err, apperr.ErrPermissionNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		// Lỗi DB khi xóa
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Xóa quyền hạn thành công!"})
}
