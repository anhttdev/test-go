package dto

// Hứng dữ liệu đăng nhập từ Postman
type LoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Trả dữ liệu về cho Client sau khi đăng nhập thành công
type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"` // Thường là "Bearer"
}

type RefreshInput struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type ChangePasswordInput struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"` // Bắt buộc nhập và tối thiểu 6 ký tự
}
