package config

import (
	"db/internal/utils"
	"fmt"
)

type DatabaseConfig struct {
	Host       string
	Port       string
	User       string
	Password   string
	DBName     string
	SSLMode    string
	REDIS_HOST string
	REDIS_PORT string
}

type Config struct {
	DB DatabaseConfig
}

func NewConfig() *Config {
	return &Config{
		DB: DatabaseConfig{
			Host:       utils.GetEnv("DB_HOST", "localhost"),
			Port:       utils.GetEnv("DB_PORT", "5433"),
			User:       utils.GetEnv("DB_USER", "root"),
			Password:   utils.GetEnv("DB_PASSWORD", "123456"),
			DBName:     utils.GetEnv("DB_NAME", "test"),
			SSLMode:    utils.GetEnv("DB_SLLMODE", "disable"),
			REDIS_HOST: utils.GetEnv("REDIS_HOST", "redis"),
			REDIS_PORT: utils.GetEnv("REDIS_PORT", "6379"),
		},
	}
}

func (c *Config) DNS() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", c.DB.Host, c.DB.Port, c.DB.User, c.DB.Password, c.DB.DBName, c.DB.SSLMode)
}
