package service

import (
	"db/internal/dto"
	"db/internal/model"
	"db/internal/pkg/apperr"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type PermissionService struct {
	db *gorm.DB
}

func NewPermissionService(db *gorm.DB) *PermissionService {
	return &PermissionService{db: db}
}

func (ps *PermissionService) CreatePermission(input dto.CreatePermissionInput) error {
	var count int64
	err := ps.db.Model(&model.Permission{}).
		Where("permission_code = ?", input.PermissionCode).
		Count(&count).Error
	if err != nil {
		return fmt.Errorf("lỗi kiểm tra trùng lặp quyền: %w", err)
	}
	if count > 0 {
		return apperr.ErrPermissionAlreadyExists
	}

	permission := model.Permission{
		PermissionCode: input.PermissionCode,
		PermissionName: input.PermissionName,
	}

	if err := ps.db.Create(&permission).Error; err != nil {
		return apperr.ErrPermissionCreateFailed
	}
	return nil
}

func (ps *PermissionService) GetAllPermissions() ([]model.Permission, error) {
	var perms []model.Permission
	// Sắp xếp theo mã quyền cho Frontend dễ quản lý, hiển thị theo cụm
	err := ps.db.Order("permission_code ASC").Find(&perms).Error
	if err != nil {
		return nil, apperr.ErrPermissionFetchFailed
	}
	return perms, nil
}

func (ps *PermissionService) UpdatePermission(id uint, input dto.CreatePermissionInput) error {
	var perm model.Permission

	// Bước 1: Tìm xem quyền cần sửa có tồn tại không
	if err := ps.db.First(&perm, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.ErrPermissionNotFound
		}
		return err
	}

	var count int64
	err := ps.db.Model(&model.Permission{}).
		Where("permission_code = ? AND id != ?", input.PermissionCode, id).
		Count(&count).Error
	if err != nil {
		return err
	}
	if count > 0 {
		return apperr.ErrPermissionCodeInUse
	}

	perm.PermissionCode = input.PermissionCode
	perm.PermissionName = input.PermissionName

	if err := ps.db.Save(&perm).Error; err != nil {
		return apperr.ErrUpdatePermissionFailed
	}
	return nil
}

func (ps *PermissionService) DeletePermission(id uint) error {
	var perm model.Permission
	if err := ps.db.First(&perm, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.ErrPermissionNotFound
		}
		return err
	}

	if err := ps.db.Delete(&perm).Error; err != nil {
		return apperr.ErrPermissionDeleteFailed
	}
	return nil
}
