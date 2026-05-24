package dto

import (
	"db/internal/model"
	"time"
)

// DiaChiResponse đại diện cho thông tin địa chỉ trong JSON trả về
type DiaChiResponse struct {
	SoNha     string `json:"so_nha"`
	TenDuong  string `json:"ten_duong"`
	PhuongXa  string `json:"phuong_xa"`
	QuanHuyen string `json:"quan_huyen"`
	ThanhPho  string `json:"thanh_pho"`
}

// HoKhauResponse là cấu trúc chính trả về cho Client
type HoKhauResponse struct {
	ID       uint           `json:"id"`
	MaHoKhau string         `json:"ma_ho_khau"`
	DiaChi   DiaChiResponse `json:"dia_chi"`
	// Danh sách thành viên (Dùng UserResponse DTO bạn đã có)
	ThanhViens []UserResponse `json:"thanh_viens,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
}

func ConvertHoKhauToResponse(hk model.HoKhau) HoKhauResponse {
	// Map địa chỉ từ embedded struct sang DTO
	addr := DiaChiResponse{
		SoNha:     hk.DiaChi.SoNha,
		TenDuong:  hk.DiaChi.TenDuong,
		PhuongXa:  hk.DiaChi.PhuongXa,
		QuanHuyen: hk.DiaChi.QuanHuyen,
		ThanhPho:  hk.DiaChi.ThanhPho,
	}

	// Map danh sách thành viên (nếu có)
	var members []UserResponse
	for _, m := range hk.ThanhViens {
		members = append(members, ConvertUserToResponse(m))
	}

	return HoKhauResponse{
		ID:         hk.ID,
		MaHoKhau:   hk.MaHoKhau,
		DiaChi:     addr,
		ThanhViens: members,
		CreatedAt:  hk.CreatedAt,
		UpdatedAt:  hk.UpdatedAt,
	}
}
