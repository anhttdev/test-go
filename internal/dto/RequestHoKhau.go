package dto

import "db/internal/model"

type HoKhauInput struct {
	MaHoKhau string `json:"ma_ho_khau" binding:"required"`
	DiaChi   struct {
		SoNha     string `json:"so_nha" binding:"required,max=100"`
		TenDuong  string `json:"ten_duong" binding:"required,max=255"`
		PhuongXa  string `json:"phuong_xa" binding:"required"`
		QuanHuyen string `json:"quan_huyen" binding:"required"`
		ThanhPho  string `json:"thanh_pho" binding:"required"`
	} `json:"dia_chi"`
	UserIDs []uint `json:"user_ids"`
}

func (input HoKhauInput) ToModel() model.HoKhau {
	return model.HoKhau{
		MaHoKhau: input.MaHoKhau,
		// Ánh xạ phần địa chỉ vào embedded struct
		DiaChi: model.DiaChi{
			SoNha:     input.DiaChi.SoNha,
			TenDuong:  input.DiaChi.TenDuong,
			PhuongXa:  input.DiaChi.PhuongXa,
			QuanHuyen: input.DiaChi.QuanHuyen,
			ThanhPho:  input.DiaChi.ThanhPho,
		},
	}
}

type TransferMemberInput struct {
	FromHoKhauID uint   `json:"tu_ho_khau_id" binding:"required"`
	ToHoKhauID   uint   `json:"den_ho_khau_id" binding:"required"`
	UserIDs      []uint `json:"user_ids" binding:"required,gt=0"`
}
