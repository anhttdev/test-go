package repository

import (
	"db/internal/model"

	"gorm.io/gorm"
)

type SQLHoKhauRepository struct {
	db *gorm.DB
}

func NewSQLHoKhauRepository(db *gorm.DB) HoKhauRepository {
	return &SQLHoKhauRepository{
		db: db,
	}
}

func (hkr *SQLHoKhauRepository) CreateHoKhau(hokhau *model.HoKhau) error {
	return hkr.db.Create(hokhau).Error
}
