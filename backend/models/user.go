package models

import (
	"time"
)

type User struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Username  string    `gorm:"size:50;not null;uniqueIndex" json:"username"`
	Password  string    `gorm:"size:255;not null" json:"-"`
	RealName  string    `gorm:"size:50;not null;default:''" json:"real_name"`
	Phone     string    `gorm:"size:20;not null;default:''" json:"phone"`
	Role      int8      `gorm:"not null;default:2" json:"role"`
	Status    int8      `gorm:"not null;default:1" json:"status"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}
