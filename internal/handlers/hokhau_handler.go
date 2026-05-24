package handlers

import (
	"db/internal/dto"
	"db/internal/repository"
	"db/internal/service"
	"net/http"

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
