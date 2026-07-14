package repository

import (
	"db/internal/dto"
	"db/internal/model"
	"fmt"
	"net/http"

	"gorm.io/gorm"
)

type SQLUserRepository struct {
	db *gorm.DB
}

func NewSQLUserRepository(db *gorm.DB) UserRepository {
	return &SQLUserRepository{
		db: db,
	}
}

func (ur *SQLUserRepository) Create(user *model.User) error {
	if err := ur.db.Create(user).Error; err != nil {
		return err
	}
	return nil
}

// FindById - Tìm thông tin người dân và bốc kèm luôn cả account_id (nếu có)
func (ur *SQLUserRepository) FindUserAndAccountByUserId(userWithAcc *dto.UserWithAccount, id int) error {
	err := ur.db.Table("users").
		Select("users.*, accounts.id AS account_id").
		Joins("LEFT JOIN public.accounts ON accounts.user_id = users.id").
		Where("users.id = ?", id).
		First(userWithAcc).Error

	return err
}

func (ur *SQLUserRepository) FindById(user *model.User, id int) error {
	if err := ur.db.First(user, id).Error; err != nil {
		return err
	}
	return nil
}

func (ur *SQLUserRepository) DeleteUserById(id int) error {
	var user model.User
	if err := ur.FindById(&user, id); err != nil {
		return err
	}
	if err := ur.db.Delete(&user).Error; err != nil {
		return err
	}

	return nil
}

func (ur *SQLUserRepository) Update(user *model.User) error {
	if err := ur.db.Save(user).Error; err != nil {
		return err
	}
	return nil
}

func (ur *SQLUserRepository) FindAll(types string, users *[]model.User, page int, limit int) error {
	offset := (page - 1) * limit

	if err := ur.db.Order("id " + types).Offset(offset).Limit(limit).Find(users).Error; err != nil {
		return err
	}
	return nil
}

func (ur *SQLUserRepository) FindUserByName(name string, users *[]model.User) error {
	if err := ur.db.Where("ho_ten LIKE ?", name).Find(users).Error; err != nil {
		return err
	}
	return nil
}

func (ur *SQLUserRepository) FindUserByMaso(maso string, users *[]model.User) error {
	if err := ur.db.Where("ma_so LIKE ?", maso).Find(users, maso).Error; err != nil {
		return err
	}
	return nil
}

func (ur *SQLUserRepository) IsUniqueField(fiel string, value string) (bool, error) {
	var count int64
	query := fmt.Sprintf("%s = ?", fiel)
	err := ur.db.Model(&model.User{}).Where(query, value).Count(&count).Error
	return count == 0, err
}

func (ur *SQLUserRepository) CheckUnique(registerInput dto.RegisterInput) map[string]string {
	errors := make(map[string]string)
	checkFields := []struct {
		Name  string
		Value string
		Label string
	}{
		{"ma_so", registerInput.MaSo, "Mã số"},
		{"so_cccd", registerInput.CCCD, "Số CCCD"},
		{"so_dien_thoai", registerInput.SoDienThoai, "Số điện thoại"},
		{"email", registerInput.Mail, "Email"},
	}

	for _, f := range checkFields {
		isUnique, _ := ur.IsUniqueField(f.Name, f.Value)
		if !isUnique {
			errors[f.Name] = fmt.Sprintf("%s này đã tồn tại trên hệ thống", f.Label)
		}
	}
	return errors
}

func (ur *SQLUserRepository) ThanhViensSearchUsers(name string, maso string, sortOrder string, page int, size int, users *[]model.User) error {
	query := ur.db.Model(&model.User{})

	if name != "" {
		query = query.Where("ho_ten LIKE ?", "%"+name+"%")
	}

	if maso != "" {
		query = query.Where("ma_so LIKE ?", "%"+maso+"%")
	}

	query = query.Order("id " + sortOrder)

	offset := (page - 1) * size

	return query.Offset(offset).Limit(size).Find(users).Error
}

func (ur *SQLUserRepository) GetUserWithCusor(request dto.CursorPagingUser) ([]model.User, dto.PagingInfo, error) {
	limit := request.Limit
	var users []model.User
	if limit <= 0 {
		limit = 10
	}

	query := ur.db.Order("id ASC").Limit(limit + 1)
	if request.Cusor > 0 {
		query = query.Where("id > ?", request.Cusor)
	}

	if err := query.Find(&users).Error; err != nil {
		return nil, dto.PagingInfo{}, err
	}

	hasMore := false
	var nextCursor uint = 0
	if len(users) > limit {
		hasMore = true
		users = users[:limit]
	}

	if len(users) > 0 {
		nextCursor = users[len(users)-1].ID
	}

	pagingInfo := dto.PagingInfo{
		Limit:      request.Limit,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}

	return users, pagingInfo, nil
}

func (ur *SQLUserRepository) ConvertUserToResponse(user model.User) dto.Response {
	userDTO := dto.ConvertUserToResponse(user)
	response := dto.NewSuccessResponse(
		"Tạo người dùng thành công,",
		http.StatusCreated,
		userDTO,
	)
	return response
}

//func (ur *SQLUserRepository) UploadFile(dst string, file multipart.File file) {
//	err := ur.db.SaveUp
//}

func (ur *SQLUserRepository) CheckUserUnique(registerInput dto.RegisterAccountInput) []string {
	// Khởi tạo một slice rỗng để chứa tên các trường bị trùng (ví dụ: ["so_cccd", "gmail"])
	var duplicateFields []string

	// Khai báo danh sách các trường thuộc bảng USERS cần quét trùng
	checkFields := []struct {
		Name  string // Tên cột chính xác dưới Database (cũng dùng làm tên trường trả về)
		Value string // Giá trị người dùng nhập vào từ DTO
	}{
		{"ma_so", registerInput.MaSo},
		{"so_cccd", registerInput.CCCD},
		{"so_dien_thoai", registerInput.SoDienThoai},
		{"gmail", registerInput.Mail},
	}

	// Chạy vòng lặp kiểm tra từng trường
	for _, f := range checkFields {
		// Nếu người dùng không nhập trường này (để trống) thì bỏ qua không check
		if f.Value == "" {
			continue
		}

		var count int64
		// Tạo câu lệnh điều kiện động, ví dụ: "ma_so = ?"
		query := fmt.Sprintf("%s = ?", f.Name)

		// Thực hiện đếm số dòng trùng trong bảng users
		err := ur.db.Model(&model.User{}).Where(query, f.Value).Count(&count).Error

		// Nếu không lỗi và tìm thấy ít nhất 1 dòng trùng dữ liệu
		if err == nil && count > 0 {
			// Ném thẳng tên trường bị trùng dưới DB vào slice kết quả
			duplicateFields = append(duplicateFields, f.Name)
		}
	}

	// Trả về slice (Nếu slice bằng nil hoặc rỗng đồng nghĩa với việc không có trường nào bị trùng)
	return duplicateFields
}

func (ur *SQLUserRepository) CreateUserWithTx(tx *gorm.DB, user *model.User) error {
	db := ur.db
	if tx != nil {
		db = tx
	}
	return db.Create(user).Error
}
