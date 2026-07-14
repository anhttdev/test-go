package dto

// CreateRoleInput dùng để hứng dữ liệu khi tạo/sửa Role
type CreateRoleInput struct {
	RoleCode    string `json:"role_code" binding:"required,alphanum,gt=3"` // Bắt buộc, chỉ chứa chữ/số, dài > 3 ký tự
	RoleName    string `json:"role_name" binding:"required,gt=3"`
	Description string `json:"description"`
}

// CreatePermissionInput dùng để tạo Permission mới độc lập
type CreatePermissionInput struct {
	PermissionCode string `json:"permission_code" binding:"required"` // Ví dụ: ho_khau:create
	PermissionName string `json:"permission_name" binding:"required"`
}

// AssignPermissionToRoleInput phục vụ Task 5
type AssignPermissionToRoleInput struct {
	PermissionIDs []uint `json:"permission_ids" binding:"required,min=1"` // Danh sách ID các quyền muốn gán
}

// AssignRoleToUserInput phục vụ Task 6
type AssignRoleToUserInput struct {
	RoleIDs []uint `json:"role_ids" binding:"required,min=1"` // Danh sách ID các role muốn cấp cho Account
}

type AssignRoleToAccount struct {
	AccountID uint   `json:"account_id" binding:"required"`
	Roles     []uint `json:"roles" binding:"required"`
}
