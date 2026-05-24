package repository

import (
	"db/internal/model"

	"gorm.io/gorm"
)

type SQLAccountRepository struct {
	db *gorm.DB
}

func NewSQLAccountRepository(db *gorm.DB) AccountRepository {
	return &SQLAccountRepository{
		db: db,
	}
}

func (ar *SQLAccountRepository) CreateAccountWithTx(tx *gorm.DB, account *model.Account) error {
	db := ar.db
	if tx != nil {
		db = tx
	}
	return db.Create(account).Error
}
