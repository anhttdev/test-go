package service

import (
	"db/internal/dto"
	"db/internal/model"
	"db/internal/utils"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

var access_secret = []byte(utils.GetEnv("access_secret_key", "secretkey"))
var refresh_secret = []byte(utils.GetEnv("refresh_secret_key", "refreshkey"))

type JwtService struct {
	db *gorm.DB
}

func NewJwtService(db *gorm.DB) *JwtService {
	return &JwtService{
		db: db,
	}
}

type MyClaims struct {
	UserID       uint   `json:"user_id"`
	Username     string `json:"username"`
	TokenVersion uint   `json:"token_version"`
	jwt.RegisteredClaims
}

func (js *JwtService) Refresh(input dto.RefreshInput) (*dto.LoginResponse, error) {
	claims := &MyClaims{}

	token, err := jwt.ParseWithClaims(input.RefreshToken, claims, func(token *jwt.Token) (interface{}, error) {
		return refresh_secret, nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("refresh khong hop le hoac da het han")
	}

	var account model.Account
	err = js.db.Where("user_id = ? AND refresh_token = ? ", claims.UserID, input.RefreshToken).First(&account).Error
	if err != nil {
		return nil, errors.New("phiên làm việc không tồn tại hoặc đã bị đăng xuất từ xa")
	}

	newAccestoken, err := js.generateToken(claims.UserID, claims.Username, access_secret, 5*time.Minute, account.TokenVersion)
	if err != nil {
		return nil, err
	}
	newRefreshToken, err := js.generateToken(claims.UserID, claims.Username, refresh_secret, 7*24*time.Hour, account.TokenVersion)
	if err != nil {
		return nil, err
	}

	return &dto.LoginResponse{
		AccessToken:  newAccestoken,
		RefreshToken: newRefreshToken,
		TokenType:    "Bearer",
	}, nil
}
func (js *JwtService) generateToken(userId uint, username string, secretkey []byte, durian time.Duration, tokenversion uint) (string, error) {
	claims := MyClaims{
		UserID:       userId,
		Username:     username,
		TokenVersion: tokenversion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(durian)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(secretkey)
}
