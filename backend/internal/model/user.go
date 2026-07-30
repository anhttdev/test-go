package model

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID            uint            `gorm:"primaryKey" json:"id"`
	MaSo          string          `gorm:"size:255;not null;unique;<-:create" json:"ma_so" vault:"transit"` // Đánh dấu mã hóa
	HoTen         string          `gorm:"size:255;not null" json:"ho_ten"`
	SoCCCD        string          `gorm:"size:255;not null;unique" json:"so_cccd" vault:"transit"` // Đánh dấu mã hóa
	SoDienThoai   string          `gorm:"size:20" json:"so_dien_thoai"`
	Gmail         string          `gorm:"size:255" json:"gmail"`
	HoKhauID      *uint           `json:"ho_khau_id"`
	Account       *Account        `gorm:"foreignKey:UserID" json:"account,omitempty"`
	LichSuCongTac []LichSuCongTac `gorm:"foreignKey:UserID" json:"lich_su_cong_tacs,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	DeletedAt     gorm.DeletedAt  `gorm:"index" json:"-"`
}
