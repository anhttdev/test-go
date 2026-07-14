package service

import (
	"db/internal/dto"
	"db/internal/model"
	"db/internal/pkg/apperr"
	"db/internal/repository"

	"fmt"
	"strings"

	"gorm.io/gorm"
)

type HoKhauService struct {
	db  *gorm.DB                    // 1. Chìa khóa để quản lý Transaction
	hkr repository.HoKhauRepository // 2. Repo chính của Hộ Khẩu
	ur  repository.UserRepository   // 3. Repo phụ để check/update User (nếu cần)
}

func NewHoKhauService(
	db *gorm.DB,
	hkr repository.HoKhauRepository,
	ur repository.UserRepository,
) *HoKhauService {
	return &HoKhauService{
		db:  db,
		hkr: hkr,
		ur:  ur,
	}
}

func (hks *HoKhauService) CreateHoKhau(input dto.HoKhauInput) (dto.HoKhauResponse, error) {
	var res dto.HoKhauResponse
	err := hks.db.Transaction(func(tx *gorm.DB) error {
		var count int64
		tx.Model(&model.HoKhau{}).Where(
			"dc_so_nha = ? AND dc_ten_duong = ? AND dc_phuong_xa = ? AND dc_quan_huyen = ? AND dc_thanh_pho = ?",
			input.DiaChi.SoNha, input.DiaChi.TenDuong, input.DiaChi.PhuongXa, input.DiaChi.QuanHuyen, input.DiaChi.ThanhPho,
		).Count(&count)

		if count > 0 {
			return apperr.ErrAddressAlreadyExists
		}

		if len(input.UserIDs) > 0 {
			var names []string
			tx.Model(&model.User{}).Where(
				"id IN ? AND ho_khau_id IS NOT NULL AND ho_khau_id <> 0", input.UserIDs).Pluck("ho_ten", &names)

			if len(names) > 0 {
				return fmt.Errorf("%s : %w", strings.Join(names, ", "), apperr.ErrUserAlreadyInAnotherHouse)
			}
		}
		hkRepoTx := repository.NewSQLHoKhauRepository(tx)
		usRepoTx := repository.NewSQLUserRepository(tx)
		hokhau := input.ToModel()
		fmt.Printf("--- LOG DEBUG --- MaHoKhau: %s, UserIDs: %+v, Len: %d\n",
			input.MaHoKhau, input.UserIDs, len(input.UserIDs))
		if err := hkRepoTx.CreateHoKhau(&hokhau); err != nil {
			return err
		}
		if len(input.UserIDs) > 0 {
			for _, id := range input.UserIDs {
				var user model.User

				if err := usRepoTx.FindById(&user, int(id)); err != nil {
					return fmt.Errorf("người dùng ID %d không tồn tại, không thể tạo hộ khẩu", id)
				}

				if err := tx.Model(&user).Update("ho_khau_id", hokhau.ID).Error; err != nil {
					return err
				}
			}
		}
		res = dto.ConvertHoKhauToResponse(hokhau)
		return nil
	})
	return res, err
}

func (hks *HoKhauService) TransferMembers(input dto.TransferMemberInput) error {
	return hks.db.Transaction(func(tx *gorm.DB) error {
		var count int64
		DiaChiCu := input.FromHoKhauID
		tx.Model(&model.HoKhau{}).Where("id = ?", DiaChiCu).Count(&count)
		if count == 0 {
			return apperr.HouseHoldNotFound
		}

		var validCount int64
		tx.Model(&model.User{}).
			Where("id IN ? AND ho_khau_id = ?", input.UserIDs, input.FromHoKhauID).
			Count(&validCount)

		if int(validCount) != len(input.UserIDs) {
			return apperr.MemberNotExists
		}

		result := tx.Model(&model.User{}).Where("id IN ? AND ho_khau_id = ?", input.UserIDs, input.FromHoKhauID).Update("ho_khau_id", input.ToHoKhauID)
		if result.Error != nil {
			return result.Error
		}

		return nil
	})
}

func (hks *HoKhauService) BurnGetAllHoKhau() ([]model.HoKhau, error) {
	var danhSachHoKhau []model.HoKhau

	// Quét danh sách, nạp kèm thông tin thành viên lồng bên trong
	err := hks.db.Preload("ThanhViens").Find(&danhSachHoKhau).Error
	if err != nil {
		return nil, err
	}

	return danhSachHoKhau, nil
}

func (hks *HoKhauService) GetHoKhauById(id uint) (*model.HoKhau, error) {
	var count int64
	// 1. Kiểm tra xem cuốn sổ hộ khẩu này có tồn tại dưới DB không
	hks.db.Model(&model.HoKhau{}).Where("id = ?", id).Count(&count)
	if count == 0 {
		return nil, apperr.HouseHoldNotFound
	}

	var hoKhau model.HoKhau
	// 2. Tồn tại xịn thì nạp trọn gói thông tin chi tiết kèm mảng thành viên
	err := hks.db.Preload("ThanhViens").First(&hoKhau, id).Error
	if err != nil {
		return nil, err
	}

	return &hoKhau, nil
}

func (hks *HoKhauService) DeleteHoKhau(hoKhauID uint) error {
	return hks.db.Transaction(func(tx *gorm.DB) error {
		// Bước 1: Kiểm tra tồn tại sổ hộ khẩu
		var count int64
		tx.Model(&model.HoKhau{}).Where("id = ?", hoKhauID).Count(&count)
		if count == 0 {
			return apperr.HouseHoldNotFound
		}

		// Bước 2: Kiểm tra xem sổ có còn con dân nào đang kẹt lại bên trong không
		var memberCount int64
		tx.Model(&model.User{}).Where("ho_khau_id = ?", hoKhauID).Count(&memberCount)
		if memberCount > 0 {
			// Trả về lỗi tự định nghĩa: Không thể xóa sổ hộ khẩu đang có thành viên
			return apperr.HouseHoldNotEmpty
		}

		// Bước 3: Đạt điều kiện an toàn -> Phát lệnh xóa sổ vĩnh viễn
		result := tx.Where("id = ?", hoKhauID).Delete(&model.HoKhau{})
		if result.Error != nil {
			return result.Error
		}

		return nil
	})
}
