package database

import (
	"context"
	"fmt"
	"log"
	"mold-vaul/config"

	"github.com/go-redis/redis/v8"
)

var RDB *redis.Client
var Ctx = context.Background()

func InitRedis(cfg *config.RedisConfig) error {
	RDB = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	_, err := RDB.Ping(Ctx).Result()
	if err != nil {
		return fmt.Errorf("failed to connect redis: %w", err)
	}

	log.Println("[DEBUG] Redis connected successfully")
	return nil
}

func GetMoldStatusKey(moldID uint64) string {
	return fmt.Sprintf("mold:status:%d", moldID)
}

func GetMoldCyclesKey(moldID uint64) string {
	return fmt.Sprintf("mold:cycles:%d", moldID)
}
