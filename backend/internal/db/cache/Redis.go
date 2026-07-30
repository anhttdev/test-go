package db

import (
	"context"
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client
var Ctx = context.Background()

func InitRedis() {
	redisHost := os.Getenv("REDIS_HOST")
	redisPort := os.Getenv("REDIS_PORT")

	// 🌟 3. Cơ chế dự phòng (Fallback): Nếu chạy local ngoài máy Mac không có .env thì tự dùng localhost
	if redisHost == "" {
		redisHost = "localhost"
	}
	if redisPort == "" {
		redisPort = "6379"
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", redisHost, redisPort), // 🌟 4. Nối chuỗi động thành "redis-cache:6379"
		Password: "",
		DB:       0,
	})

	_, err := RedisClient.Ping(Ctx).Result()
	if err != nil {
		panic(fmt.Sprintf("Không thể kết nối tới Redis: %v", err))
	}
	fmt.Println("🚀 Kết nối thành công tới Redis Server bằng Go!")
}
