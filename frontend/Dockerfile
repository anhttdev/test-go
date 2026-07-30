# Stage 1: Build các tệp static của Frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Dùng Nginx để phục vụ web static cực nhanh và nhẹ
FROM nginx:alpine

# Copy kết quả build từ stage 1 vào thư mục công khai của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]