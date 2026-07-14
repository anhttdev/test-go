package main

import (
	db2 "db/internal/db/cache"
	db "db/internal/db/migrations"
	"db/internal/handlers"
	"db/internal/middleware"
	"db/internal/repository"
	"db/internal/service"
	"db/internal/utils"
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 1. KHỞI TẠO HỆ THỐNG NỀN TẢNG (Cấu hình, DB, Cache, Validator)
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ Không tìm thấy file .env, sử dụng cấu hình mặc định")
	}
	db.InitDB()
	db2.InitRedis()

	if err := utils.RegisterValidation(); err != nil {
		panic("❌ Không thể đăng ký validator: " + err.Error())
	}

	r := gin.Default()
	r.Use(middleware.GlobalErrorHandler())

	// 2. KHỞI TẠO DI (DEPENDENCY INJECTION) - REPOSITORY & SERVICE & HANDLER
	// Hộ khẩu & User
	userRepository := repository.NewSQLUserRepository(db.DB)
	userHandler := handlers.NewUserHandler(userRepository)

	hokhauRepository := repository.NewSQLHoKhauRepository(db.DB)
	hokhauService := service.NewHoKhauService(db.DB, hokhauRepository, userRepository)
	hokhauHandler := handlers.NewHoKhauHandler(hokhauRepository, *hokhauService)

	// Tài khoản & Xác thực (Có nhét RedisClient vào phục vụ Token Version)
	accountRepository := repository.NewSQLAccountRepository(db.DB)
	accountService := service.NewAccountService(db.DB, accountRepository, userRepository, db2.RedisClient)
	accountHandler := handlers.NewAccountHandler(*accountService)

	jwtService := service.NewJwtService(db.DB)
	authService := service.NewAuthService(db.DB, *accountService, *jwtService, db2.RedisClient)
	authHandler := handlers.NewAuthHandler(*authService, *jwtService, db2.RedisClient, db.DB, *accountService)

	// =========================================================================
	// 3. QUẢN LÝ ĐỊNH TUYẾN (ROUTE MANAGEMENT)
	// =========================================================================

	// 🌐 NHÓM 1: CÁC API PUBLIC (Không cần đăng nhập, ai gọi cũng được)
	apiV1 := r.Group("/api/v1")
	{
		// Luồng Auth chuẩn (Cookie)
		auth := apiV1.Group("/auth")
		{
			auth.POST("/register", accountHandler.RegisterNewAccount)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken) // Khuyên dùng: Trong ruột hàm này có check version như anh em mình sửa lúc nãy
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/verify-reset-token", authHandler.VerifyResetToken)
			auth.POST("/reset-password", authHandler.ResetPassword)
		}
	}

	// 💻 NHÓM 2: CÁC API LOCAL STORAGE (Dành cho môi trường test/local không dùng cookie)
	apiLocal := r.Group("/api/local/auth")
	{
		apiLocal.POST("/register", accountHandler.RegisterNewAccount)
		apiLocal.POST("/login", authHandler.LoginWithLocalStorage)
		apiLocal.POST("/refresh", authHandler.RefreshToken)
	}

	// =========================================================================
	// 🔒 NHÓM 3: CÁC API PROTECTED (BẮT BUỘC PHẢI CHECK TOKEN VERSION & BLACKLIST)
	// Đổi mật khẩu/Logout xong là tất cả các Route dưới này của thiết bị cũ sẽ bị CHẶN SẠCH
	// =========================================================================

	// Tạo hẳn chốt chặn tối cao cho toàn bộ tài nguyên hệ thống v1
	protectedV1 := r.Group("/api/v1")
	protectedV1.Use(middleware.AuthRequiredWithCookieAndBlacklist(db2.RedisClient)) // VÁ LỖ HỔNG: Truyền thêm db.DB vào để cứu viện Cache Miss
	{
		// Các API Auth nhạy cảm
		authSecured := protectedV1.Group("/auth")
		{
			authSecured.POST("/logout", authHandler.Logout)
			authSecured.POST("/change-password", authHandler.ChangePassword)
			authSecured.POST("/logoutall", authHandler.LogoutAllService)
		}

		// Tài nguyên Người dùng (Đã được vá lỗi, thiết bị khác đổi pass là máy này mất quyền xem profile ngay)
		users := protectedV1.Group("/users")
		{
			users.GET("/profile", userHandler.GetAll) // Đường dẫn cũ: /api/v1/users/profile
			users.GET("/", userHandler.GetAll)        // Đường dẫn cũ: /api/v1/users/
		}

		// Tài nguyên cá lẻ liên quan đến User
		user := protectedV1.Group("/user")
		{
			user.POST("/", userHandler.CreateUser)
			user.GET("/:id", userHandler.GetUserById)
			user.PUT("/:id", userHandler.UpdateUser)
			user.DELETE("/:id", userHandler.DeleteUserById)
		}

		// Tài nguyên Hộ Khẩu
		hokhau := protectedV1.Group("/hokhau")
		{
			hokhau.POST("/", hokhauHandler.CreateHoKhau)
			hokhau.PATCH("/", hokhauHandler.TransferHoKhau)
		}

		// Đăng ký tài khoản nội bộ nâng cao
		protectedV1.POST("/account", accountHandler.RegisterNewAccount)
	}

	protectedV2V3 := r.Group("/api")
	protectedV2V3.Use(middleware.AuthRequiredWithCookieAndBlacklist(db2.RedisClient)) // Đồng bộ bảo mật tuyệt đối cho V2/V3
	{
		protectedV2V3.GET("/v2/users", userHandler.GetAllV2)
		protectedV2V3.GET("/v2/users/profiles", userHandler.GetAll) // Đã sửa lại đúng tiền tố v2 group
		protectedV2V3.GET("/v3/users", userHandler.GetUserCursor)
	}

	// =========================================================================
	// 4. SERVE FRONTEND (SPA) CHUNG PORT 8080
	// Yêu cầu: build frontend trước để có thư mục ./frontend/dist
	// =========================================================================
	r.Static("/assets", "./frontend/dist/assets")
	r.StaticFile("/favicon.svg", "./frontend/dist/favicon.svg")
	r.StaticFile("/icons.svg", "./frontend/dist/icons.svg")
	r.GET("/", func(c *gin.Context) {
		c.File("./frontend/dist/index.html")
	})
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.JSON(404, gin.H{"error": "Not Found"})
			return
		}
		c.File("./frontend/dist/index.html")
	})

	r.Run(":8080")
}
