package model

import "time"

type Permission struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	PermissionCode string    `gorm:"type:varchar(100);unique;not null;index" json:"permission_code"` // Ví dụ: ho_khau:create
	PermissionName string    `gorm:"type:varchar(100);not null" json:"permission_name"`              // Ví dụ: Tạo hộ khẩu
	CreatedAt      time.Time `json:"created_at"`
}
