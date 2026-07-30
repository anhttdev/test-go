package dto

type RegisterAccountInput struct {
	MaSo        string `json:"ma_so" binding:"required"`
	HoTen       string `json:"ho_ten" binding:"required"`
	CCCD        string `json:"so_cccd" binding:"required,len=12"` // Ép đúng 12 số CCCD
	SoDienThoai string `json:"so_dien_thoai"`
	Mail        string `json:"gmail" binding:"omitempty,email"`

	Username string `json:"username" binding:"required,min=4"`
	Password string `json:"password" binding:"required,min=6"`
}
