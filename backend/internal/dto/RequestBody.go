package dto

type RegisterInput struct {
	MaSo        string `json:"ma_so" binding:"required,min=6,max=10"`
	HoTen       string `json:"ho_ten" binding:"required,min=2,max=50"`
	CCCD        string `json:"so_cccd" binding:"required,is_cccd"`
	SoDienThoai string `json:"so_dien_thoai" binding:"required,is_phone"`
	Mail        string `json:"email" binding:"required,email"`
}
