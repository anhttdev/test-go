package model

import "time"

type HoKhau struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	MaHoKhau   string    `gorm:"size:50;notnull;unique" json:"ma_ho_khau"`
	DiaChi     DiaChi    `gorm:"embedded;embeddedPrefix:dc_" json:"dia_chi"`
	ThanhViens []User    `gorm:"foreignKey:HoKhauID" json:"thanh_viens,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type DiaChi struct {
	// Tất cả dùng chung tên index "idx_unique_address" để GORM gộp chúng lại
	SoNha     string `json:"so_nha" gorm:"index:idx_unique_address,unique"`
	TenDuong  string `json:"ten_duong" gorm:"index:idx_unique_address,unique"`
	PhuongXa  string `json:"phuong_xa" gorm:"not null;index:idx_unique_address,unique"`
	QuanHuyen string `json:"quan_huyen" gorm:"not null;index:idx_unique_address,unique"`
	ThanhPho  string `json:"thanh_pho" gorm:"not null;index:idx_unique_address,unique"`
}
