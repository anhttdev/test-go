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

type RoleHandler struct {
	rs *service.RoleService
}

func NewRoleHandler(rs *service.RoleService) *RoleHandler {
	return &RoleHandler{
		rs: rs,
	}
}

func (rh *RoleHandler) CreateRole(ctx *gin.Context) {
	var input dto.CreateRoleInput
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu đầu vào không đúng định dạng: " + err.Error()})
		return
	}

	if err := rh.rs.CreateRole(input); err != nil {
		// Check trùng mã RoleCode
		if errors.Is(err, apperr.ErrRoleAlreadyExists) {
			ctx.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		// Lỗi hệ thống khi tạo
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{"message": "Tạo vai trò mới thành công!"})
}

func (rh *RoleHandler) GetAllRoles(ctx *gin.Context) {
	roles, err := rh.rs.GetAllRoles()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"data": roles})
}

func (rh *RoleHandler) UpdateRole(ctx *gin.Context) {
	// Bốc ID từ URL biến động (:id)
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID vai trò không hợp lệ"})
		return
	}

	var input dto.CreateRoleInput
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu đầu vào không đúng định dạng: " + err.Error()})
		return
	}

	if err := rh.rs.UpdateRole(uint(id), input); err != nil {

		if errors.Is(err, apperr.ErrRoleNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, apperr.ErrUpdateSuperAdminCode) || errors.Is(err, apperr.ErrRoleCodeInUse) {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Cập nhật thông tin vai trò thành công!"})
}

func (rh *RoleHandler) DeleteRole(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID vai trò không hợp lệ"})
		return
	}

	if err := rh.rs.DeleteRole(uint(id)); err != nil {
		if errors.Is(err, apperr.ErrRoleNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, apperr.ErrDeleteSuperAdmin) {
			ctx.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Xóa vai trò thành công!"})
}

func (rh *RoleHandler) AssignPermissionsToRole(ctx *gin.Context) {
	idStr := ctx.Param("id")
	roleID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID vai trò không hợp lệ"})
		return
	}

	var input struct {
		PermissionIDs []uint `json:"permission_ids" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Danh sách mã quyền không hợp lệ"})
		return
	}

	if err := rh.rs.AssignPermissionsToRole(uint(roleID), input.PermissionIDs); err != nil {
		if errors.Is(err, apperr.ErrRoleNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, apperr.ErrUpdateSuperAdminCode) {
			ctx.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Đồng bộ túi quyền cho vai trò thành công!"})
}

func (rh *RoleHandler) DeletePermissionsToRole(ctx *gin.Context) {
	idStr := ctx.Param("id")
	roleID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID vai trò không hợp lệ"})
		return
	}

	var input struct {
		PermissionIDs []uint `json:"permission_ids" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Danh sách mã quyền không hợp lệ"})
		return
	}

	if err := rh.rs.DeletePermissionsToRole(uint(roleID), input.PermissionIDs); err != nil {
		if errors.Is(err, apperr.ErrRoleNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, apperr.ErrUpdateSuperAdminCode) {
			ctx.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Gỡ bỏ các quyền khỏi vai trò thành công!"})
}
