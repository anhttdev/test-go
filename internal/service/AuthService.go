package service

import (
	"context"
	"db/internal/dto"
	"db/internal/model"
	"db/internal/pkg/apperr"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db             *gorm.DB
	AccountService AccountService
	JwtService     JwtService
	redisClient    *redis.Client
}

func NewAuthService(db *gorm.DB, AccountService AccountService, JwtService JwtService, redisClient *redis.Client) *AuthService {
	return &AuthService{
		db:             db,
		AccountService: AccountService,
		JwtService:     JwtService,
		redisClient:    redisClient,
	}
}

func (AuthService *AuthService) Login(input dto.LoginInput) (*dto.LoginResponse, error) {
	var account model.Account

	err := AuthService.db.Where("username = ?", input.Username).First(&account).Error

	if err != nil {
		return nil, apperr.ErrInvalidCredentials
	}

	if !account.IsActive {
		return nil, apperr.ErrAccountLocked
	}

	err = bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(input.Password))
	if err != nil {
		return nil, apperr.ErrInvalidCredentials
	}

	accessToken, err := AuthService.JwtService.generateToken(account.UserID, account.Username, access_secret, 5*time.Minute, account.TokenVersion)
	if err != nil {
		return nil, err
	}

	refreshToken, err := AuthService.JwtService.generateToken(account.UserID, account.Username, refresh_secret, 7*24*time.Hour, account.TokenVersion)
	if err != nil {
		return nil, err
	}
	AuthService.db.Model(&account).Update("refresh_token", refreshToken)

	redisKey := "user_version:" + strconv.Itoa(int(account.UserID))
	AuthService.redisClient.Set(context.Background(), redisKey, account.TokenVersion, 30*24*time.Hour)

	return &dto.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
	}, nil
}
