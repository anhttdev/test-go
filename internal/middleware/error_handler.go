package middleware

import (
	"db/internal/dto"
	"db/internal/pkg/apperr"
	"db/internal/utils"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

func GlobalErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Cho phép các Handler xử lý tiếp
		c.Next()

		// Sau khi Handler chạy xong, kiểm tra xem có lỗi nào được đẩy vào c.Errors không
		if len(c.Errors) > 0 {
			err := c.Errors.Last() // Lấy lỗi mới nhất

			// 2. CHUẨN HÓA: Nếu Handler chưa trả về JSON, Middleware sẽ trả về theo chuẩn
			if !c.Writer.Written() {
				status := c.Writer.Status()
				if status == http.StatusOK { // Nếu quên set status, mặc định là 500
					status = http.StatusInternalServerError
				}
				var details any
				message := "Đã xảy ra lỗi hệ thống"
				var vErrs validator.ValidationErrors
				switch {
				case errors.As(err, &vErrs):
					details = utils.HandleValidationErrors(vErrs)
					message = "Dữ liệu đầu vào không hợp lệ"
					status = http.StatusBadRequest

				case errors.Is(err, apperr.ErrAddressAlreadyExists):
					status = http.StatusConflict
					message = err.Error()
				case errors.Is(err, apperr.ErrUserNotFound):
					status = http.StatusNotFound
					message = err.Error()
				case errors.Is(err, apperr.ErrUserAlreadyInAnotherHouse):
					status = http.StatusConflict
					message = err.Error()
				case errors.Is(err, apperr.SomeInfoAlready):
					status = http.StatusConflict
					message = err.Error()
				}
				c.JSON(status, dto.NewErrorResponse(
					message,
					status,
					details,
				))
			}

		}
	}
}
