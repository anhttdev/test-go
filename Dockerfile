FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY test-golang .

COPY .env .

RUN chmod +x ./test-golang

CMD ["./test-golang"]
