package utils

import (
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GenerateRecordNo(prefix string) string {
	now := time.Now()
	return fmt.Sprintf("%s%s%06d", prefix, now.Format("20060102150405"), time.Now().UnixNano()%1000000)
}
