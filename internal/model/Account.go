package model

import "time"

type Account struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"not null;uniqueIndex" json:"user_id"`           // Khóa ngoại liên kết 1-1 sang User
	Username     string    `gorm:"size:255;not null;uniqueIndex" json:"username"` // Tài khoản đăng nhập
	PasswordHash string    `gorm:"size:255;not null" json:"-"`                    // Dấu gạch ngang "-" để không bao giờ biến thành JSON trả về client
	RefreshToken string    `gorm:"size:500" json:"-"`
	TokenVersion uint      `gorm:"default:1"`
	IsActive     bool      `gorm:"default:true" json:"is_active"` // Dùng để khóa/mở tài khoản đột ngột (Stateful)
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type PasswordReset struct {
	ID        uint      `gorm:"primaryKey"`
	Email     string    `gorm:"index;not null"`
	Token     string    `gorm:"not null"`
	ExpiredAt time.Time `gorm:"not null"`
}
