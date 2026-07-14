package db

import (
	"db/internal/model"
	"log"

	"gorm.io/gorm"
)

func SeedRolesAndPermissions(db *gorm.DB) {
	log.Println("🌱 [Seed] Đang kiểm tra và khởi tạo dữ liệu phân quyền mặc định...")

	// 1. Danh sách 21 Quyền hạn hạt nhân của bác
	permissions := []model.Permission{
		// Nhóm Người Dân
		{PermissionCode: "nguoi_dan:view", PermissionName: "Xem danh sách người dân"},
		{PermissionCode: "nguoi_dan:view_detail", PermissionName: "Xem chi tiết người dân"},
		{PermissionCode: "nguoi_dan:create", PermissionName: "Thêm mới người dân"},
		{PermissionCode: "nguoi_dan:update", PermissionName: "Cập nhật thông tin người dân"},
		{PermissionCode: "nguoi_dan:delete", PermissionName: "Xóa người dân"},
		{PermissionCode: "nguoi_dan:export", PermissionName: "Xuất danh sách người dân"},

		// Nhóm Hộ Khẩu
		{PermissionCode: "ho_khau:view", PermissionName: "Xem danh sách hộ khẩu"},
		{PermissionCode: "ho_khau:view_detail", PermissionName: "Xem chi tiết hộ khẩu"},
		{PermissionCode: "ho_khau:create", PermissionName: "Tạo hộ khẩu"},
		{PermissionCode: "ho_khau:update", PermissionName: "Cập nhật hộ khẩu"},
		{PermissionCode: "ho_khau:delete", PermissionName: "Xóa hộ khẩu"},
		{PermissionCode: "ho_khau:add_member", PermissionName: "Thêm thành viên vào hộ"},
		{PermissionCode: "ho_khau:remove_member", PermissionName: "Xóa thành viên khỏi hộ"},
		{PermissionCode: "ho_khau:change_owner", PermissionName: "Đổi chủ hộ"},
		{PermissionCode: "ho_khau:export", PermissionName: "Xuất danh sách hộ khẩu"},

		// Nhóm Lịch Sử Công Tác
		{PermissionCode: "lich_su_cong_tac:view", PermissionName: "Xem lịch sử công tác"},
		{PermissionCode: "lich_su_cong_tac:create", PermissionName: "Thêm lịch sử công tác"},
		{PermissionCode: "lich_su_cong_tac:update", PermissionName: "Cập nhật lịch sử công tác"},
		{PermissionCode: "lich_su_cong_tac:delete", PermissionName: "Xóa lịch sử công tác"},
		{PermissionCode: "lich_su_cong_tac:approve", PermissionName: "Duyệt lịch sử công tác"},
		{PermissionCode: "lich_su_cong_tac:export", PermissionName: "Xuất báo cáo lịch sử công tác"},
	}

	// Lưu Permissions vào DB nếu chưa tồn tại
	for _, p := range permissions {
		db.FirstOrCreate(&p, model.Permission{PermissionCode: p.PermissionCode})
	}

	// 2. Định nghĩa 6 Vai trò mặc định và Map quyền luôn cho tụi nó
	var allPerms []model.Permission
	db.Find(&allPerms)

	// Lọc nhanh danh sách quyền phục vụ gán mặc định
	permMap := make(map[string]model.Permission)
	for _, p := range allPerms {
		permMap[p.PermissionCode] = p
	}

	// Hàm hỗ trợ gom cụm quyền
	getPerms := func(codes ...string) []model.Permission {
		var res []model.Permission
		for _, c := range codes {
			if p, ok := permMap[c]; ok {
				res = append(res, p)
			}
		}
		return res
	}

	// Định nghĩa túi Role kèm ruột Permission dán sẵn
	roles := []model.Role{
		{
			RoleCode:    "SUPER_ADMIN",
			RoleName:    "Quản trị hệ thống",
			Description: "Toàn quyền tối cao",
			Permissions: allPerms,
		},
		{
			RoleCode:    "CAN_BO_TIEP_NHAN",
			RoleName:    "Cán bộ tiếp nhận",
			Description: "Tạo/cập nhật hồ sơ ban đầu",
			Permissions: getPerms("nguoi_dan:create", "nguoi_dan:view", "ho_khau:create", "ho_khau:view"),
		},
		{
			RoleCode:    "CAN_BO_HO_KHAU",
			RoleName:    "Cán bộ hộ khẩu",
			Description: "Quản lý người dân và hộ khẩu",
			Permissions: getPerms(
				"nguoi_dan:view", "nguoi_dan:view_detail", "nguoi_dan:create", "nguoi_dan:update",
				"ho_khau:view", "ho_khau:view_detail", "ho_khau:create", "ho_khau:update",
				"ho_khau:add_member", "ho_khau:remove_member", "ho_khau:change_owner",
			),
		},
		{
			RoleCode:    "CAN_BO_CONG_TAC",
			RoleName:    "Cán bộ công tác",
			Description: "Quản lý lịch sử công tác",
			Permissions: getPerms("lich_su_cong_tac:view", "lich_su_cong_tac:create", "lich_su_cong_tac:update", "lich_su_cong_tac:delete"),
		},
		{
			RoleCode:    "TRUONG_PHONG",
			RoleName:    "Trưởng phòng",
			Description: "Xem, duyệt, xuất báo cáo",
			Permissions: getPerms(
				"nguoi_dan:view", "nguoi_dan:view_detail", "nguoi_dan:export",
				"ho_khau:view", "ho_khau:view_detail", "ho_khau:export",
				"lich_su_cong_tac:view", "lich_su_cong_tac:approve", "lich_su_cong_tac:export",
			),
		},
		{
			RoleCode:    "AUDITOR",
			RoleName:    "Thanh tra/Kiểm tra",
			Description: "Chỉ xem dữ liệu, không sửa",
			Permissions: getPerms("nguoi_dan:view", "nguoi_dan:view_detail", "ho_khau:view", "ho_khau:view_detail", "lich_su_cong_tac:view"),
		},
	}

	// Lưu mớ Role này xuống DB. Nếu có rồi thì cập nhật lại đống Quyền (Association)
	for _, r := range roles {
		var existingRole model.Role
		err := db.Where("role_code = ?", r.RoleCode).First(&existingRole).Error
		if err == gorm.ErrRecordNotFound {
			db.Create(&r)
		} else {
			// Nếu role có sẵn, cập nhật lại dán đè đống quyền mới nhất
			db.Model(&existingRole).Association("Permissions").Replace(r.Permissions)
		}
	}
	log.Println("✨ [Seed] Bơm dữ liệu RBAC thành công rực rỡ!")
}
