package repository

import (
	"db/internal/dto"
	"db/internal/model"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *model.User) error
	FindById(user *model.User, id int) error
	DeleteUserById(id int) error
	Update(user *model.User) error
	FindAll(types string, users *[]model.User, page int, limit int) error
	FindUserByName(name string, users *[]model.User) error
	FindUserByMaso(maso string, users *[]model.User) error
	SearchUsers(name string, maso string, sortOrder string, page int, size int, users *[]model.User) error
	IsUniqueField(fiel string, value string) (bool, error)
	CheckUnique(registerInput dto.RegisterInput) map[string]string
	ConvertUserToResponse(user model.User) dto.Response
	GetUserWithCusor(request dto.CursorPagingUser) ([]model.User, dto.PagingInfo, error)
	//UploadFile(dst string, file multipart.File file)
	CheckUserUnique(registerInput dto.RegisterAccountInput) []string
	CreateUserWithTx(tx *gorm.DB, user *model.User) error
}

type HoKhauRepository interface {
	CreateHoKhau(hokhau *model.HoKhau) error
}

type AccountRepository interface {
	CreateAccountWithTx(tx *gorm.DB, account *model.Account) error
}
