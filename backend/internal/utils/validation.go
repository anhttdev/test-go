package utils

import (
	"fmt"
	"regexp"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

func HandleValidationErrors(err error) gin.H {
	if validationError, ok := err.(validator.ValidationErrors); ok {
		errors := make(map[string]string)

		for _, e := range validationError {
			switch e.Tag() {
			case "gt":
				errors[e.Field()] = errors[e.Field()] + "phai lon hon gia tri toi thieu"
			case "min":
				errors[e.Field()] = fmt.Sprintf("%s phải lớn hơn %s", e.Field(), e.Param())
			case "max":
				errors[e.Field()] = fmt.Sprintf("%s phải nhỏ hơn %s", e.Field(), e.Param())
			case "is_phone":
				errors[e.Field()] = fmt.Sprintf("Số điện thoại không đúng định dạng")
			case "is_cccd":
				errors[e.Field()] = fmt.Sprintf("Số căn cước không đúng định dạng")
			case "required":
				errors[e.Field()] = fmt.Sprintf("%s không được để trống", e.Field())

			}
		}
		return gin.H{"errors": errors}
	}
	return gin.H{"error": "Yeu cau khong hop le " + err.Error()}
}

func RegisterValidation() error {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		err := v.RegisterValidation("is_phone", func(fl validator.FieldLevel) bool {
			phone := fl.Field().String()
			re := regexp.MustCompile(`^0[3579][0-9]{8}$`)
			return re.MatchString(phone)
		})
		if err != nil {
			return err
		}

		err = v.RegisterValidation("is_cccd", func(fl validator.FieldLevel) bool {
			cccd := fl.Field().String()
			re := regexp.MustCompile(`^0[0-9]{11}$`)
			return re.MatchString(cccd)
		})
		if err != nil {
			return err
		}

	}
	return nil
}
