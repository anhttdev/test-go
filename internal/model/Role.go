package model

import "time"

type Role struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	RoleCode    string    `gorm:"type:varchar(50);unique;not null;index" json:"role_code"` // Ví dụ: SUPER_ADMIN
	RoleName    string    `gorm:"type:varchar(100);not null" json:"role_name"`             // Ví dụ: Quản trị hệ thống
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
}
