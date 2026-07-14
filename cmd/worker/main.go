package main

import (
	db2 "db/internal/db/cache"
	db "db/internal/db/migrations"
	"db/internal/db/rabbitMQ"
	"db/internal/dto"
	"db/internal/repository"
	"db/internal/service"
	"encoding/json"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ Không tìm thấy file .env, sử dụng cấu hình mặc định")
	}
	db.InitDB()
	channel, err := rabbitMQ.InitRabbitMQ()
	mqservice := service.NewRabbitMQService(channel)
	userRepository := repository.NewSQLUserRepository(db.DB)
	accountRepository := repository.NewSQLAccountRepository(db.DB)
	accountService := service.NewAccountService(db.DB, accountRepository, userRepository, db2.RedisClient, *mqservice)
	if err != nil {
		log.Fatalln("Không thể mở channel RabbitMQ")
	}

	queueName := "reset_password_queue"
	_, err = channel.QueueDeclare(queueName, true, false, false, false, nil)
	if err != nil {
		log.Fatalln("Lỗi khi khởi tạo hoặc mở queue")
	}

	_ = channel.Qos(1, 0, false)

	msgs, err := channel.Consume(queueName, "", false, false, false, false, nil)

	for d := range msgs {
		var payload dto.EmailTaskPayload
		if err = json.Unmarshal(d.Body, &payload); err != nil {
			log.Printf("Lỗi giải mã gói tin JSON: %v", err)
			_ = d.Nack(false, true)
		}
		accountService.SendEmail(payload.Email, "Khôi phục mật khẩu ứng dụng", payload.Body)
		d.Ack(false)
	}

}
