package service

import (
	"context"
	"db/internal/dto"
	"encoding/json"
	"time"

	"github.com/rabbitmq/amqp091-go"
)

type RabbitMQService struct {
	rabbitChan *amqp091.Channel
}

func NewRabbitMQService(rabbit *amqp091.Channel) *RabbitMQService {
	return &RabbitMQService{
		rabbitChan: rabbit,
	}
}

func (rb *RabbitMQService) ResetPassRabbitMQ(email string, body string) error {
	queueName := "reset_password_queue"

	_, err := rb.rabbitChan.QueueDeclare(queueName, true, false, false, false, nil)
	if err != nil {
		return err
	}
	payload := dto.EmailTaskPayload{
		Email: email,
		Body:  body,
	}
	bodyBytes, _ := json.Marshal(payload)

	c, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = rb.rabbitChan.PublishWithContext(c,
		"",
		queueName,
		false,
		false,
		amqp091.Publishing{
			ContentType: "application/json",
			Body:        bodyBytes,
		})

	return err
}
