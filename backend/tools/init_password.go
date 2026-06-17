package main

import (
	"fmt"
	"log"
	"mold-vaul/config"
	"mold-vaul/database"
	"mold-vaul/models"
	"mold-vaul/utils"
)

func main() {
	cfg := config.LoadConfig()

	if err := database.InitMySQL(&cfg.Database); err != nil {
		log.Fatalf("Failed to init MySQL: %v", err)
	}

	password := "123456"
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	fmt.Printf("Password: %s\n", password)
	fmt.Printf("Hash: %s\n", hashedPassword)

	result := database.DB.Model(&models.User{}).Where("username IN ?", []string{"admin", "operator01"}).Update("password", hashedPassword)
	if result.Error != nil {
		log.Fatalf("Failed to update password: %v", result.Error)
	}

	fmt.Printf("Updated %d users\n", result.RowsAffected)
	fmt.Println("Password update done!")
}
