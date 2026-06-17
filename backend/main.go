package main

import (
	"log"
	"mold-vaul/config"
	"mold-vaul/database"
	"mold-vaul/handlers"
	"mold-vaul/middleware"
	"mold-vaul/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	gin.SetMode(cfg.Server.Mode)

	if err := database.InitMySQL(&cfg.Database); err != nil {
		log.Fatalf("Failed to init MySQL: %v", err)
	}

	if err := database.InitRedis(&cfg.Redis); err != nil {
		log.Printf("[WARN] Failed to init Redis: %v, continue without cache", err)
	}

	utils.InitJWT(cfg.JWT.SecretKey)

	r := gin.Default()

	r.Use(middleware.CORSMiddleware())

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"msg":    "模具工装管理柜系统运行正常",
		})
	})

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
		}

		api.Use(middleware.AuthMiddleware())

		user := api.Group("/user")
		{
			user.GET("/info", handlers.GetUserInfo)
			user.POST("/change-password", handlers.ChangePassword)
			user.GET("/list", handlers.GetUserList)
			user.GET("/:id", handlers.GetUserByID)
			user.POST("", handlers.CreateUser)
			user.PUT("/:id", handlers.UpdateUser)
			user.DELETE("/:id", handlers.DeleteUser)
		}

		mold := api.Group("/mold")
		{
			mold.GET("/list", handlers.GetMoldList)
			mold.GET("/detail/:id", handlers.GetMoldDetail)
			mold.GET("/status/:id", handlers.GetMoldStatus)
			mold.GET("/cycles/:id", handlers.GetMoldCycles)
			mold.GET("/stats", handlers.GetMoldStats)
			mold.GET("/production-stats/:id", handlers.GetMoldProductionStats)
			mold.POST("", handlers.CreateMold)
			mold.PUT("/:id", handlers.UpdateMold)
			mold.DELETE("/:id", handlers.DeleteMold)
			mold.GET("/cycle-logs/:mold_id", handlers.GetCycleLogs)
		}

		borrow := api.Group("/borrow")
		{
			borrow.GET("/list", handlers.GetBorrowList)
			borrow.GET("/detail/:id", handlers.GetBorrowDetail)
			borrow.POST("/borrow", handlers.BorrowMold)
			borrow.POST("/return/:id", handlers.ReturnMold)
			borrow.POST("/quick-borrow", handlers.QuickBorrowByCode)
			borrow.POST("/quick-return", handlers.QuickReturnByCode)
		}

		production := api.Group("/production")
		{
			production.GET("/list", handlers.GetProductionList)
			production.GET("/detail/:id", handlers.GetProductionDetail)
			production.POST("", handlers.CreateProduction)
			production.POST("/void/:id", handlers.VoidProduction)
		}

		maintenance := api.Group("/maintenance")
		{
			maintenance.GET("/list", handlers.GetMaintenanceList)
			maintenance.GET("/detail/:id", handlers.GetMaintenanceDetail)
			maintenance.GET("/mold/:mold_id", handlers.GetMoldMaintenanceList)
			maintenance.GET("/stats", handlers.GetMaintenanceStats)
			maintenance.POST("", handlers.CreateMaintenance)
			maintenance.POST("/complete/:id", handlers.CompleteMaintenance)
			maintenance.DELETE("/:id", handlers.DeleteMaintenance)
		}

		location := api.Group("/location")
		{
			location.GET("/list", handlers.GetLocationList)
			location.POST("", handlers.CreateLocation)
		}

		machine := api.Group("/machine")
		{
			machine.GET("/list", handlers.GetMachineList)
			machine.POST("", handlers.CreateMachine)
		}
	}

	log.Printf("[DEBUG] Server starting on port %s", cfg.Server.Port)
	log.Printf("[DEBUG] API base: http://localhost:%s/api", cfg.Server.Port)
	log.Printf("[DEBUG] Test account: admin / 123456")

	if err := r.Run(":" + cfg.Server.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
