package main

import (
	db2 "db/internal/db/cache"
	db "db/internal/db/migrations"
	"db/internal/db/rabbitMQ"
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
	channel, err := rabbitMQ.InitRabbitMQ()
	if err != nil {
		log.Println("Không thể khởi tạo channel RabbitMQ")
	}
	r := gin.Default()
	r.Use(middleware.GlobalErrorHandler())

	mqservice := service.NewRabbitMQService(channel)

	// 2. KHỞI TẠO DI (DEPENDENCY INJECTION)
	userRepository := repository.NewSQLUserRepository(db.DB)
	userHandler := handlers.NewUserHandler(userRepository)

	hokhauRepository := repository.NewSQLHoKhauRepository(db.DB)
	hokhauService := service.NewHoKhauService(db.DB, hokhauRepository, userRepository)
	hokhauHandler := handlers.NewHoKhauHandler(hokhauRepository, *hokhauService)

	accountRepository := repository.NewSQLAccountRepository(db.DB)
	accountService := service.NewAccountService(db.DB, accountRepository, userRepository, db2.RedisClient, *mqservice)
	accountHandler := handlers.NewAccountHandler(*accountService)

	jwtService := service.NewJwtService(db.DB)
	authService := service.NewAuthService(db.DB, *accountService, *jwtService, db2.RedisClient)
	authHandler := handlers.NewAuthHandler(*authService, *jwtService, db2.RedisClient, db.DB, *accountService)

	roleService := service.NewRoleService(db.DB)
	roleHandler := handlers.NewRoleHandler(roleService)
	permissionService := service.NewPermissionService(db.DB)
	permissionHandler := handlers.NewPermissionHandler(permissionService)

	apiV1 := r.Group("/api/v1")
	{
		// 🚪 PHÂN KHU 1: API PUBLIC
		auth := apiV1.Group("/auth")
		{
			auth.POST("/register", accountHandler.RegisterNewAccount)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/verify-reset-token", authHandler.VerifyResetToken)
			auth.POST("/reset-password", authHandler.ResetPassword)
		}

		// 🔒 PHÂN KHU 2: API PROTECTED
		protected := apiV1.Group("")
		protected.Use(middleware.AuthRequiredWithCookieAndBlacklist(db2.RedisClient))
		{
			// --- Bảo mật tài khoản cá nhân ---
			authSecured := protected.Group("/auth")
			{
				authSecured.POST("/logout", authHandler.Logout)
				authSecured.POST("/change-password", authHandler.ChangePassword)
				authSecured.POST("/logoutall", authHandler.LogoutAllService)
			}

			users := protected.Group("/users")
			{
				// 👑 ĐẨY CÁC ROUTE TĨNH LÊN TRÊN (Tránh bị đè bởi /:id)
				users.GET("/permissions", accountHandler.GetCurrentAccountPermissions) // Đọc quyền để gác cổng UI Frontend
				users.GET("/roles", accountHandler.GetCurrentAccountRoles)
				users.GET("/profile", accountHandler.GetProfile) // Xem hồ sơ chính tôi

				// 👥 Nhóm nghiệp vụ quản trị danh sách người dân
				users.GET("", middleware.AuthPermission(accountService, "nguoi_dan:view"), userHandler.GetAll)
				users.POST("", middleware.AuthPermission(accountService, "nguoi_dan:create"), userHandler.CreateUser)

				// 🚨 CÁC ROUTE ĐỘNG CHỨA PARAMETER ĐỂ XUỐNG DƯỚI CÙNG
				users.GET("/:id", middleware.AuthPermission(accountService, "nguoi_dan:view"), userHandler.GetUserById)
				users.PUT("/:id", middleware.AuthPermission(accountService, "nguoi_dan:update"), userHandler.UpdateUser)
				users.DELETE("/:id", middleware.AuthPermission(accountService, "nguoi_dan:delete"), userHandler.DeleteUserById)
			}

			// --- Nghiệp vụ Hộ Khẩu ---
			hokhau := protected.Group("/hokhau")
			{
				hokhau.GET("/", middleware.AuthPermission(accountService, "ho_khau:view"), hokhauHandler.GetAllHoKhau)
				hokhau.POST("/", middleware.AuthPermission(accountService, "ho_khau:create"), hokhauHandler.CreateHoKhau)
				hokhau.PATCH("/transfer", middleware.AuthPermission(accountService, "ho_khau:update"), hokhauHandler.TransferHoKhau)

				// Route động /:id đẩy xuống dưới cùng nhóm Hộ khẩu
				hokhau.GET("/:id", middleware.AuthPermission(accountService, "ho_khau:view"), hokhauHandler.GetHoKhauById)
				hokhau.DELETE("/:id", middleware.AuthPermission(accountService, "ho_khau:delete"), hokhauHandler.DeleteHoKhau)
			}

			// --- Đăng ký tài khoản nội bộ cho cán bộ ---
			protected.POST("/account", middleware.AuthPermission(accountService, "account:create"), accountHandler.RegisterNewAccount)

			// 👑 PHÂN KHU 3: QUẢN TRỊ PHÂN QUYỀN (Hệ thống phân quyền Many-To-Many)
			admin := protected.Group("/admin")
			{
				// Điều phối danh mục quyền gốc
				admin.POST("/permissions", middleware.AuthPermission(accountService, "permission:create"), permissionHandler.CreatePermission)
				admin.GET("/permissions", middleware.AuthPermission(accountService, "permission:view"), permissionHandler.GetAllPermissions)
				admin.PUT("/permissions/:id", middleware.AuthPermission(accountService, "permission:update"), permissionHandler.UpdatePermission)
				admin.DELETE("/permissions/:id", middleware.AuthPermission(accountService, "permission:delete"), permissionHandler.DeletePermission)

				// Quản lý cơ cấu chức vụ
				admin.POST("/roles", middleware.AuthPermission(accountService, "role:create"), roleHandler.CreateRole)
				admin.GET("/roles", middleware.AuthPermission(accountService, "role:view"), roleHandler.GetAllRoles)
				admin.PUT("/roles/:id", middleware.AuthPermission(accountService, "role:update"), roleHandler.UpdateRole)
				admin.DELETE("/roles/:id", middleware.AuthPermission(accountService, "role:delete"), roleHandler.DeleteRole)

				// Gán/gỡ mảng liên kết Many-to-Many của Chức vụ và Quyền hạn
				admin.POST("/roles/:id/permissions", middleware.AuthPermission(accountService, "role:assign_permission"), roleHandler.AssignPermissionsToRole)
				admin.DELETE("/roles/:id/permissions", middleware.AuthPermission(accountService, "role:remove_permission"), roleHandler.DeletePermissionsToRole)

				// 🎯 ĐƯỜNG DẪN CHUẨN XỊN: /api/v1/admin/account/assignroles
				admin.POST("/account/assignroles", middleware.AuthPermission(accountService, "account:update_role"), accountHandler.AssignRoleAccount)
				admin.DELETE("/account/deleteroles", middleware.AuthPermission(accountService, "account:delete_role"), accountHandler.RemoveRoleAccount)
			}
		}
	}

	// =========================================================================
	// 4. SERVE FRONTEND (SPA) CHUNG PORT 8080
	// =========================================================================
	r.Static("/assets", "./frontend/dist/assets")
	r.StaticFile("/favicon.svg", "./frontend/dist/favicon.svg")
	r.StaticFile("/icons.svg", "./frontend/dist/icons.svg")
	r.GET("/", func(c *gin.Context) {
		c.File("./frontend/dist/index.html")
	})
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.JSON(404, gin.H{"error": "Not Founds"})
			return
		}
		c.File("./frontend/dist/index.html")
	})

	r.Run(":8080")
}
