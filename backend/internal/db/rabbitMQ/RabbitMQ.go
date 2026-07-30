package rabbitMQ

import (
	"os"

	"github.com/rabbitmq/amqp091-go"
)

func InitRabbitMQ() (*amqp091.Channel, error) {
	conn, err := amqp091.Dial(os.Getenv("rabbitMQ_url"))
	if err != nil {
		return nil, err
	}

	channel, err := conn.Channel()
	if err != nil {
		return nil, err
	}
	return channel, nil
}
