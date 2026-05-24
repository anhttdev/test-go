package dto

import "db/internal/model"

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Code    int         `json:"code"`
	Details interface{} `json:"details,omitempty"`
}

func NewErrorResponse(message string, code int, details interface{}) Response {
	return Response{
		Success: false,
		Message: message,
		Code:    code,
		Details: details,
	}
}

func NewSuccessResponse(message string, code int, details interface{}) Response {
	return Response{
		Success: true,
		Message: message,
		Code:    code,
		Details: details,
	}
}

type UserResponse struct {
	MaSo        string `json:"ma_so"`
	HoTen       string `json:"ho_ten"`
	SoCCCD      string `json:"so_cccd"`
	SoDienThoai string `json:"so_dien_thoai"`
	Gmail       string `json:"email"`
}

func ConvertUserToResponse(user model.User) UserResponse {
	return UserResponse{
		MaSo:        user.MaSo,
		HoTen:       user.HoTen,
		SoCCCD:      user.SoCCCD,
		SoDienThoai: user.SoDienThoai,
		Gmail:       user.Gmail,
	}
}
