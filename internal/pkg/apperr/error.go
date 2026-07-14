package apperr

import "errors"

var ErrAddressAlreadyExists = errors.New("địa chỉ này đã tồn tại một hộ khẩu khác")

var ErrDuplicateAddress = errors.New("DUPLICATE_ADDRESS")
var ErrUserNotFound = errors.New("USER_NOT_FOUND")
var ErrUserAlreadyInAnotherHouse = errors.New("đã ở hộ khẩu khác")
var HouseHoldNotFound = errors.New("Hộ khẩu đích không tồn tại")
var HouseHoldNotEmpty = errors.New("Không thể xoá hộ khẩu khi có thành viên")
var MemberNotExists = errors.New("một số thành viên không thuộc hộ khẩu nguồn")
var SomeInfoAlready = errors.New("đã tồn tại trên hệ thống")
var ErrInvalidCredentials = errors.New("tai khoan hoac mat khau khong chinh xac")
var ErrAccountLocked = errors.New("tai khoan cua ban hien dang bi khoa")
var (
	ErrRoleNotFound         = errors.New("vai trò cần chỉnh sửa không tồn tại trên hệ thống")
	ErrRoleAlreadyExists    = errors.New("mã vai trò (Role Code) này đã tồn tại")
	ErrRoleCodeInUse        = errors.New("mã vai trò này đã được sử dụng bởi một vai trò khác")
	ErrDeleteSuperAdmin     = errors.New("lệnh cấm: Tuyệt đối không được xóa vai trò tối cao SUPER_ADMIN")
	ErrUpdateSuperAdminCode = errors.New("không được phép thay đổi mã hệ thống của SUPER_ADMIN")
	ErrRoleCreateFailed     = errors.New("Tạo Role mới không thành công")
	ErrRoleFetchFailed      = errors.New("không thể lấy danh sách vai trò")
	ErrUpdateFailed         = errors.New("Update Role không thành công")
	ErrDeleteFailed         = errors.New("Delete Role không thành công")
)

var (
	ErrPermissionNotFound      = errors.New("quyền hạn yêu cầu không tồn tại")
	ErrPermissionAlreadyExists = errors.New("mã quyền hạn (Permission Code) này đã tồn tại")
	ErrPermissionCodeInUse     = errors.New("mã quyền hạn này đã được sử dụng bởi một quyền khác")
	ErrPermissionFetchFailed   = errors.New("không thể lấy danh sách quyền")
	ErrPermissionCreateFailed  = errors.New("Tạo Permission mới không thành công")
	ErrUpdatePermissionFailed  = errors.New("Update Permission không thành công")
	ErrPermissionDeleteFailed  = errors.New("Delete Permission không thành công")
)

var (
	ErrAccountNotFound  = errors.New("tài khoản cán bộ không tồn tại trên hệ thống")
	ErrAssignRoleFailed = errors.New("bổ nhiệm chức vụ cho tài khoản thất bại")
	ErrRemoveRoleFailed = errors.New("bãi nhiệm chức vụ của tài khoản thất bại")
)

var (
	ErrAccountRolesFetchFailed = errors.New("không thể lấy danh sách chức vụ của tài khoản")
)
