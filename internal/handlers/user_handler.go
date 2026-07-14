package handlers

import (
	"db/internal/dto"
	"db/internal/model"
	"db/internal/repository"
	"db/internal/utils"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserHandler struct {
	repo repository.UserRepository
}

func NewUserHandler(repo repository.UserRepository) *UserHandler {
	return &UserHandler{
		repo: repo,
	}
}

func (uh *UserHandler) GetUserById(ctx *gin.Context) {
	//idStr := ctx.Param("id")
	//id, err := strconv.Atoi(idStr)
	//if err != nil {
	//	ctx.JSON(http.StatusBadRequest, "Vui long nhap id hop le")
	//}
	var pathData dto.RequestUserByParam
	err := ctx.ShouldBindUri(&pathData)
	if err != nil {
		ctx.JSON(400, utils.HandleValidationErrors(err))
		return
	}
	var output = dto.UserWithAccount{}
	if err := uh.repo.FindUserAndAccountByUserId(&output, pathData.ID); err != nil {
		ctx.JSON(http.StatusBadRequest, "User not found")
		return
	}
	ctx.JSON(http.StatusOK, output)
}

func (uh *UserHandler) CreateUser(ctx *gin.Context) {
	var registerInput dto.RegisterInput
	if err := ctx.ShouldBindJSON(&registerInput); err != nil {
		ctx.Error(err)
		return
	}
	duplicateErrors := uh.repo.CheckUnique(registerInput)
	if len(duplicateErrors) > 0 {
		ctx.JSON(http.StatusConflict, dto.Response{
			false,
			"Xung đột dữ liệu",
			http.StatusConflict,
			duplicateErrors,
		})
		return
	}
	user := model.User{
		MaSo:        registerInput.MaSo,
		HoTen:       registerInput.HoTen,
		SoCCCD:      registerInput.CCCD,
		SoDienThoai: registerInput.SoDienThoai,
		Gmail:       registerInput.Mail,
	}
	if err := uh.repo.Create(&user); err != nil {
		ctx.Error(err)
		ctx.JSON(http.StatusInternalServerError, dto.NewErrorResponse("Lỗi lưu dữ liệu", 500, nil))
		return
	}
	ctx.JSON(http.StatusOK, uh.repo.ConvertUserToResponse(user))
}

func (uh *UserHandler) DeleteUserById(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}
	if err := uh.repo.DeleteUserById(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng để xóa"})
			return
		}

		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi khi xóa người dùng: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Đã xóa người dùng thành công",
		"id":      id,
	})
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var user model.User
	if err := h.repo.FindById(&user, id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng"})
		return
	}

	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}

	user.ID = uint(id)

	if err := h.repo.Update(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cập nhật thất bại"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (uh *UserHandler) GetAll(ctx *gin.Context) {
	var users []model.User
	var request dto.RequestSearchQuery
	if err := ctx.ShouldBindQuery(&request); err != nil {
		ctx.JSON(400, gin.H{"error": "dữ liệu không hợp lệ"})
		return
	}
	sortOrder := ctx.DefaultQuery("sort", "asc")
	page := request.Page
	size := request.Size
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 10
	}

	name := request.Name
	maso := request.MaSo
	if name != "" {
		if err := uh.repo.FindUserByName(name, &users); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lấy dữ liệu"})
			return
		}
		ctx.JSON(http.StatusOK, users)
		return
	}
	if maso != "" {
		if err := uh.repo.FindUserByMaso(maso, &users); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lấy dữ liệu"})
			return
		}
		ctx.JSON(http.StatusOK, users)
		return
	}

	if sortOrder != "asc" && sortOrder != "desc" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error": "Tham số sort không hợp lệ. Chỉ chấp nhận 'asc' hoặc 'desc'",
		})
		return
	}
	if err := uh.repo.FindAll(sortOrder, &users, page, size); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lấy dữ liệu"})
		return
	}
	ctx.JSON(http.StatusOK, users)
}

//func (uh *UserHandler) GetAllV2(ctx *gin.Context) {
//	var users []model.User
//	var request dto.RequestSearchQuery
//
//	if err := ctx.ShouldBindQuery(&request); err != nil {
//		ctx.JSON(400, gin.H{"error": "dữ liệu không hợp lệ"})
//		return
//	}
//
//	page := request.Page
//	size := request.Size
//	if page < 1 {
//		page = 1
//	}
//	if size < 1 {
//		size = 10
//	}
//
//	sortOrder := ctx.DefaultQuery("sort", "asc")
//
//	err := uh.repo.SearchUsers(request.Name, request.MaSo, sortOrder, page, size, &users)
//
//	if err != nil {
//		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lấy dữ liệu"})
//		return
//	}
//
//	ctx.JSON(http.StatusOK, users)
//}

func (uh *UserHandler) GetUserCursor(ctx *gin.Context) {
	var request dto.CursorPagingUser
	if err := ctx.ShouldBindQuery(&request); err != nil {
		ctx.Error(err)
		return
	}
	users, pagingInfo, err := uh.repo.GetUserWithCusor(request)
	if err != nil {
		ctx.Error(err)
		return
	}

	// Trả về JSON theo cấu trúc chuẩn hóa
	ctx.JSON(http.StatusOK, dto.UserCursorResponse{
		Success: true,
		Data:    users,
		Paging:  pagingInfo,
	})
}

//func (uh *UserHandler) UploadFile(ctx *gin.Context) {
//	if file, err := ctx.FormFile("image"); err != nil {
//		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lấy dữ liệu"})
//		filepath.Ext()
//		return
//	}Z
//
//}
