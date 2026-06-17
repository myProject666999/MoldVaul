package models

import (
	"time"
)

type Location struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	LocationCode string    `gorm:"size:50;not null;uniqueIndex" json:"location_code"`
	LocationName string    `gorm:"size:100;not null" json:"location_name"`
	Area         string    `gorm:"size:50;not null;default:''" json:"area"`
	Shelf        string    `gorm:"size:50;not null;default:''" json:"shelf"`
	Layer        int       `gorm:"not null;default:0" json:"layer"`
	Status       int8      `gorm:"not null;default:1" json:"status"`
	Remark       string    `gorm:"size:255;not null;default:''" json:"remark"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Location) TableName() string {
	return "locations"
}

type Machine struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	MachineCode   string    `gorm:"size:50;not null;uniqueIndex" json:"machine_code"`
	MachineName   string    `gorm:"size:100;not null" json:"machine_name"`
	MachineType   string    `gorm:"size:50;not null;default:''" json:"machine_type"`
	Specification string    `gorm:"size:255;not null;default:''" json:"specification"`
	Workshop      string    `gorm:"size:50;not null;default:''" json:"workshop"`
	Status        int8      `gorm:"not null;default:1" json:"status"`
	Remark        string    `gorm:"size:255;not null;default:''" json:"remark"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Machine) TableName() string {
	return "machines"
}
