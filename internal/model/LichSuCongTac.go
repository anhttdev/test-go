package model

import "time"

type LichSuCongTac struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	NoiLamViec  string     `gorm:"size:255;notnull" json:"noi_lam_viec"`
	ChucVu      string     `gorm:"size:100" json:"chuc_vu"`
	NgayBatDau  time.Time  `json:"ngay_bat_dau"`
	NgayKetThuc *time.Time `json:"ngay_ket_thuc"`

	UserID    uint      `gorm:"not null" json:"nguoi_dan_id"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	CreatedAt time.Time `json:"created_at"`
}
