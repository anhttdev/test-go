package service

import (
	"db/internal/dto"
	"db/internal/model"
	"db/internal/pkg/apperr"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type RoleService struct {
	db *gorm.DB
}

func NewRoleService(db *gorm.DB) *RoleService {
	return &RoleService{
		db: db,
	}
}

// Thêm Role mới
func (rs *RoleService) CreateRole(input dto.CreateRoleInput) error {
	var count int64
	if err := rs.db.Where("role_code = ?", input.RoleCode).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return apperr.ErrRoleAlreadyExists
	}
	role := rs.ConvertDTOToModel(&input)
	if err := rs.db.Create(role).Error; err != nil {
		return apperr.ErrRoleCreateFailed
	}
	return nil
}
func (rs *RoleService) ConvertDTOToModel(input *dto.CreateRoleInput) *model.Role {
	return &model.Role{
		RoleCode:    input.RoleCode,
		RoleName:    input.RoleName,
		Description: input.Description,
	}
}

// Lấy tất cả các Role
func (rs *RoleService) GetAllRoles() ([]model.Role, error) {
	var roles []model.Role
	err := rs.db.Preload("Permissions").Find(&roles).Error
	if err != nil {
		return nil, apperr.ErrRoleFetchFailed
	}

	return roles, nil
}

// Chỉnh sửa Role
func (rs *RoleService) UpdateRole(id uint, input dto.CreateRoleInput) error {
	var role model.Role
	if err := rs.db.First(&role, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.ErrRoleNotFound
		}
		return err
	}
	if role.RoleCode == "SUPER_ADMIN" && input.RoleCode != "SUPER_ADMIN" {
		return apperr.ErrUpdateSuperAdminCode
	}

	var count int64
	err := rs.db.Model(&model.Role{}).
		Where("role_code = ? AND id != ?", input.RoleCode, id).
		Count(&count).Error
	if err != nil {
		return err
	}
	if count > 0 {
		return apperr.ErrRoleCodeInUse
	}

	role.RoleCode = input.RoleCode
	role.RoleName = input.RoleName
	role.Description = input.Description

	if err := rs.db.Save(&role).Error; err != nil {
		return apperr.ErrUpdateFailed
	}

	return nil
}

// Xoá role
func (rs *RoleService) DeleteRole(id uint) error {
	var role model.Role
	if err := rs.db.First(&role, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.ErrRoleNotFound
		}
		return err
	}

	if role.RoleCode == "SUPER_ADMIN" {
		return apperr.ErrDeleteSuperAdmin
	}

	if err := rs.db.Delete(&role).Error; err != nil {
		return apperr.ErrDeleteFailed
	}

	return nil
}

func (rs *RoleService) AssignPermissionsToRole(roleID uint, permissionIDs []uint) error {
	var role model.Role
	if err := rs.db.First(&role, roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.ErrRoleNotFound
		}
		return err
	}

	if role.RoleCode == "SUPER_ADMIN" {
		return apperr.ErrUpdateSuperAdminCode
	}

	var perms []model.Permission
	if len(permissionIDs) > 0 {
		if err := rs.db.Find(&perms, permissionIDs).Error; err != nil {
			return err
		}
	}

	err := rs.db.Model(&role).Association("Permissions").Replace(perms)
	if err != nil {
		return fmt.Errorf("gán quyền cho vai trò thất bại: %w", err)
	}

	return nil
}

func (rs *RoleService) DeletePermissionsToRole(roleID uint, permissionIDs []uint) error {
	var role model.Role
	if err := rs.db.First(&role, roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.ErrRoleNotFound
		}
		return err
	}

	if role.RoleCode == "SUPER_ADMIN" {
		return apperr.ErrUpdateSuperAdminCode
	}

	var perms []model.Permission
	if len(permissionIDs) > 0 {
		if err := rs.db.Find(&perms, permissionIDs).Error; err != nil {
			return err
		}
	}

	err := rs.db.Model(&role).Association("Permissions").Delete(perms)
	if err != nil {
		return fmt.Errorf("gỡ quyền cho vai trò thất bại: %w", err)
	}

	return nil
}
