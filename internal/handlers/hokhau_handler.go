package handlers

import (
	"db/internal/dto"
	"db/internal/pkg/apperr"
	"db/internal/repository"
	"db/internal/service"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type HoKhauHandler struct {
	hkr repository.HoKhauRepository
	hks service.HoKhauService
}

func NewHoKhauHandler(hkr repository.HoKhauRepository, hks service.HoKhauService) *HoKhauHandler {
	return &HoKhauHandler{
		hkr: hkr,
		hks: hks,
	}
}

func (hkh *HoKhauHandler) CreateHoKhau(ctx *gin.Context) {
	var input dto.HoKhauInput

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.Error(err)
		return
	}
	var res dto.HoKhauResponse
	var err error
	res, err = hkh.hks.CreateHoKhau(input)
	if err != nil {
		ctx.Error(err)
		//ctx.JSON(http.StatusInternalServerError, dto.NewErrorResponse("Lỗi lưu dữ liệu", 500, nil))
		return
	}
	ctx.JSON(http.StatusCreated, res)
}

func (hkh *HoKhauHandler) TransferHoKhau(ctx *gin.Context) {
	var input dto.TransferMemberInput
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.Error(err)
		return
	}

	if err := hkh.hks.TransferMembers(input); err != nil {
		ctx.Error(err) // Middleware sẽ lo việc phân loại lỗi
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Chuyển thành viên thành công"})
}

func (hkh *HoKhauHandler) GetAllHoKhau(ctx *gin.Context) {
	// 1. Gọi xuống service để quét danh sách dưới DB
	danhSach, err := hkh.hks.BurnGetAllHoKhau()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống khi lấy danh sách hộ khẩu"})
		return
	}

	// 2. Trả về 200 OK kèm mảng dữ liệu đặc ruột
	ctx.JSON(http.StatusOK, gin.H{
		"message": "Lấy danh sách hộ khẩu thành công",
		"data":    danhSach,
	})
}

// GetHoKhauById - API xem chi tiết 1 sổ hộ khẩu theo ID trên URL
func (hkh *HoKhauHandler) GetHoKhauById(ctx *gin.Context) {
	// 1. Bốc ID từ Param trên URL về dạng chuỗi chữ (Ví dụ: /hokhau/12 -> "12")
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Định dạng tham số ID hộ khẩu không hợp lệ"})
		return
	}

	// 2. Gọi xuống Service check gate và Preload dữ liệu
	hoKhau, err := hkh.hks.GetHoKhauById(uint(id))
	if err != nil {
		// Bắt trúng chóc lỗi không tìm thấy hộ khẩu từ Service trả lên
		if errors.Is(err, apperr.HouseHoldNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Sổ hộ khẩu này không tồn tại trên hệ thống"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống khi truy vấn chi tiết hộ khẩu"})
		return
	}

	// 3. Trả về cục dữ liệu chi tiết
	ctx.JSON(http.StatusOK, gin.H{
		"message": "Lấy thông tin chi tiết hộ khẩu thành công",
		"data":    hoKhau,
	})
}

// DeleteHoKhau - API xóa sổ hộ khẩu (Yêu cầu kiểm tra an toàn)
func (hkh *HoKhauHandler) DeleteHoKhau(ctx *gin.Context) {
	// 1. Bốc ID cần xóa trên URL
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Định dạng tham số ID cần xóa không hợp lệ"})
		return
	}

	// 2. Gọi Service thực thi Transaction hủy sổ
	err = hkh.hks.DeleteHoKhau(uint(id))
	if err != nil {
		switch {
		case errors.Is(err, apperr.HouseHoldNotFound):
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Không thể xóa vì sổ hộ khẩu không tồn tại"})
		case errors.Is(err, apperr.HouseHoldNotEmpty):
			// Trả về lỗi 400 Bad Request nếu sổ vẫn còn con dân kẹt lại bên trong
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Thao tác bị từ chối: Sổ hộ khẩu hiện tại đang có thành viên cư trú, hãy chuyển họ đi trước khi xóa sổ!"})
		default:
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống trong quá trình hủy sổ hộ khẩu"})
		}
		return
	}

	// 3. Xóa láng coóng thành công dưới DB
	ctx.JSON(http.StatusOK, gin.H{
		"message": "Đã tiến hành xóa và hủy sổ hộ khẩu thành công khỏi hệ thống dữ liệu dân cư",
	})
}
