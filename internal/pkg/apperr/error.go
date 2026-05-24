package apperr

import "errors"

var ErrAddressAlreadyExists = errors.New("địa chỉ này đã tồn tại một hộ khẩu khác")

var ErrDuplicateAddress = errors.New("DUPLICATE_ADDRESS")
var ErrUserNotFound = errors.New("USER_NOT_FOUND")
var ErrUserAlreadyInAnotherHouse = errors.New("đã ở hộ khẩu khác")
var HouseHoldNotFound = errors.New("Hộ khẩu đích không tồn tại")
var MemberNotExists = errors.New("một số thành viên không thuộc hộ khẩu nguồn")
var SomeInfoAlready = errors.New("đã tồn tại trên hệ thống")
var ErrInvalidCredentials = errors.New("tai khoan hoac mat khau khong chinh xac")
var ErrAccountLocked = errors.New("tai khoan cua ban hien dang bi khoa")
