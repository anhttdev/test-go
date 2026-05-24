package service

import (
	"crypto/sha256"
	"crypto/tls"
	"db/internal/dto"
	"db/internal/model"
	"db/internal/pkg/apperr"
	"db/internal/repository"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/gomail.v2"
	"gorm.io/gorm"
)

type AccountService struct {
	db          *gorm.DB
	ur          repository.UserRepository
	ar          repository.AccountRepository
	redisClient *redis.Client
}

func NewAccountService(db *gorm.DB, ar repository.AccountRepository, ur repository.UserRepository, redisClient *redis.Client) *AccountService {
	return &AccountService{
		db:          db,
		ar:          ar,
		ur:          ur,
		redisClient: redisClient,
	}
}

func (as *AccountService) RegisterAccount(input dto.RegisterAccountInput) error {
	var count int64
	if err := as.FindByUserName(input.Username, &count); err != nil {
		return err
	}
	errs := as.ur.CheckUserUnique(input)
	if len(errs) > 0 {
		return fmt.Errorf("%s %w", strings.Join(errs, ","), apperr.SomeInfoAlready)
	}
	return as.db.Transaction(func(tx *gorm.DB) error {
		newUser := model.User{
			MaSo:        input.MaSo,
			HoTen:       input.HoTen,
			SoCCCD:      input.CCCD,
			SoDienThoai: input.SoDienThoai,
			Gmail:       input.Mail,
		}
		if err := as.ur.CreateUserWithTx(tx, &newUser); err != nil {
			return err
		}
		hashedPass, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		newAccount := model.Account{
			UserID:       newUser.ID,
			Username:     input.Username,
			PasswordHash: string(hashedPass),
			IsActive:     true,
		}

		if err := as.ar.CreateAccountWithTx(tx, &newAccount); err != nil {
			return err
		}
		return nil
	})
}

func (as *AccountService) FindByUserName(username string, count *int64) error {
	if username == "" {
		return nil
	}
	err := as.db.Model(&model.Account{}).Where("username = ?", username).Count(count).Error
	if err != nil {
		*count = 0
		return err
	}

	return nil
}

func (as *AccountService) SendResetPassWord(email string) error {
	var account model.Account

	err := as.db.Joins("JOIN users ON users.id = accounts.user_id").Where("users.gmail = ?", email).First(&account).Error
	if err != nil {
		return errors.New("email không tồn tại trên hệ thống")
	}
	rawToken := uuid.New().String() + uuid.New().String()
	hasher := sha256.New()
	hasher.Write([]byte(rawToken))
	resetToken := hex.EncodeToString(hasher.Sum(nil))

	resetPasswordObj := model.PasswordReset{
		Email:     email,
		Token:     resetToken,
		ExpiredAt: time.Now().Add(15 * time.Minute),
	}
	as.db.Create(&resetPasswordObj)
	resetLink := fmt.Sprintf("http://localhost:3000/reset-password?token=%s", resetToken)
	emailBody := fmt.Sprintf(`
		<h3>Yêu cầu đặt lại mật khẩu</h3>
		<p>Chào bạn, chúng tôi nhận được yêu cầu đổi mật khẩu cho tài khoản ứng dụng của bạn.</p>
		<p>Vui lòng bấm vào nút bấm dưới đây để tiến hành đổi mật khẩu mới (Liên kết này có hiệu lực trong 15 phút):</p>
		<p>
			<a href="%s" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; border-radius: 5px;">
				Đổi Mật Khẩu Ngay
			</a>
		</p>
		<p>Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này.</p>
	`, resetLink)

	go as.SendEmail(email, "Khôi phục mật khẩu ứng dụng", emailBody)

	return nil
}

func (AccountService *AccountService) SendEmail(toEmail string, subject string, body string) error {
	// 1. Khai báo các thông tin cấu hình tài khoản Gmail
	fromEmail := "anhtt.dev.16@gmail.com"
	appPassword := "mgir lxrv vwoj daxs"

	m := gomail.NewMessage()
	m.SetHeader("From", fromEmail)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", subject)

	m.SetBody("text/html", body)

	//2. Cấu hình Dial tới SMTP server của gg
	d := gomail.NewDialer("smtp.gmail.com", 587, fromEmail, appPassword)

	// Cấu hình TLS bảo mật để tránh lỗi chứng chỉ khi chạy ở localhost
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	if err := d.DialAndSend(m); err != nil {
		fmt.Println("Lỗi gửi email thật thất bại:", err)
		return err
	}

	fmt.Printf("📬 Đã gửi một email thật thành công tới hộp thư: %s\n", toEmail)
	return nil
}

func (AccountService *AccountService) ChangePassWord(userID uint, newPassword string, oldPassWord string) error {
	var account model.Account
	if err := AccountService.db.Where("user_id = ?", userID).First(&account).Error; err != nil {
		return err
	}

	err := bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(oldPassWord))
	if err != nil {
		return apperr.ErrInvalidCredentials
	}
	ps, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("HashPassword khong thanh cong")
	}

	// 3. Cập nhật mật khẩu mới VÀ tăng TokenVersion dưới MySQL
	err = AccountService.db.Model(&account).Updates(map[string]interface{}{
		"password_hash": string(ps),
	}).Error
	if err != nil {
		return errors.New("cập nhật mật khẩu mới không thành công")
	}

	return nil
}
