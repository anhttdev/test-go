# Bước 1: Mượn một container có sẵn Go để build code
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o test-golang ./cmd/api/

# Bước 2: Mang file đã build sang môi trường chạy siêu nhẹ
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/test-golang .
COPY .env .
COPY global-bundle.pem .
RUN chmod +x ./test-golang
CMD ["./test-golang"]