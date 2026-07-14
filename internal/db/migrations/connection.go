package db

import (
	"context"
	"db/internal/config"
	"db/internal/model"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() error {
	connectStr := config.NewConfig().DNS()
	fmt.Println(connectStr)
	var err error
	config := &gorm.Config{Logger: logger.Default.LogMode(logger.Info)}
	DB, err = gorm.Open(postgres.New(postgres.Config{
		DSN: connectStr,
	}), config)
	if err != nil {
		return fmt.Errorf("error opening DB connection...")
	}
	err = DB.AutoMigrate(
		&model.Account{},
		&model.Role{},
		&model.Permission{},
		&model.HoKhau{},
		&model.User{},
		&model.LichSuCongTac{},
	)
	SeedRolesAndPermissions(DB)
	if err != nil {
		return fmt.Errorf("error during migration: %w", err)
	}
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("error")
	}

	// SetMaxIdleConns sets the maximum number of connections in the idle connection pool.
	sqlDB.SetMaxIdleConns(10)

	// SetMaxOpenConns sets the maximum number of open connections to the database.
	sqlDB.SetMaxOpenConns(50)

	// SetConnMaxLifetime sets the maximum amount of time a connection may be reused.
	sqlDB.SetConnMaxLifetime(time.Hour)

	sqlDB.SetConnMaxIdleTime(5 * time.Minute)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		sqlDB.Close()
		return fmt.Errorf("DBPing error")
	}
	log.Println("Connected")

	return nil
}
