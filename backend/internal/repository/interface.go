package repository

import (
	dto2 "backend/internal/dto"
	model2 "backend/internal/model"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *model2.User) error
	FindUserAndAccountByUserId(userWithAcc *dto2.UserWithAccount, id int) error
	FindById(user *model2.User, id int) error
	DeleteUserById(id int) error
	Update(user *model2.User) error
	FindAll(types string, users *[]model2.User, page int, limit int) error
	FindUserByName(name string, users *[]model2.User) error
	FindUserByMaso(maso string, users *[]model2.User) error
	//SearchUsers(name string, maso string, sortOrder string, page int, size int, users *[]model.User) error
	IsUniqueField(fiel string, value string) (bool, error)
	CheckUnique(registerInput dto2.RegisterInput) map[string]string
	ConvertUserToResponse(user model2.User) dto2.Response
	GetUserWithCusor(request dto2.CursorPagingUser) ([]model2.User, dto2.PagingInfo, error)
	//UploadFile(dst string, file multipart.File file)
	CheckUserUnique(registerInput dto2.RegisterAccountInput) []string
	CreateUserWithTx(tx *gorm.DB, user *model2.User) error
}

type HoKhauRepository interface {
	CreateHoKhau(hokhau *model2.HoKhau) error
}

type AccountRepository interface {
	CreateAccountWithTx(tx *gorm.DB, account *model2.Account) error
}
