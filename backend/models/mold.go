package models

import (
	"time"
)

type Mold struct {
	ID                   uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	MoldCode             string    `gorm:"size:50;not null;uniqueIndex" json:"mold_code"`
	MoldName             string    `gorm:"size:100;not null" json:"mold_name"`
	ProductName          string    `gorm:"size:100;not null;default:''" json:"product_name"`
	ProductCode          string    `gorm:"size:50;not null;default:''" json:"product_code"`
	MoldType             string    `gorm:"size:50;not null;default:''" json:"mold_type"`
	CavityCount          int       `gorm:"not null;default:1" json:"cavity_count"`
	LocationID           uint64    `gorm:"not null;default:0;index" json:"location_id"`
	Status               int8      `gorm:"not null;default:1;index" json:"status"`
	TotalCycles          uint64    `gorm:"not null;default:0" json:"total_cycles"`
	MaintenanceCycles    uint      `gorm:"not null;default:100000" json:"maintenance_cycles"`
	ScrapCycles          uint      `gorm:"not null;default:500000" json:"scrap_cycles"`
	LastMaintenanceCycle uint64    `gorm:"not null;default:0" json:"last_maintenance_cycle"`
	LastMaintenanceDate  *string   `gorm:"type:date" json:"last_maintenance_date"`
	Manufacturer         string    `gorm:"size:100;not null;default:''" json:"manufacturer"`
	PurchaseDate         *string   `gorm:"type:date" json:"purchase_date"`
	PurchasePrice        float64   `gorm:"type:decimal(12,2);not null;default:0.00" json:"purchase_price"`
	IsWarning            int8      `gorm:"not null;default:0;index" json:"is_warning"`
	WarningType          string    `gorm:"size:50;not null;default:''" json:"warning_type"`
	Remark               string    `gorm:"size:500;not null;default:''" json:"remark"`
	LocationName         string    `gorm:"-" json:"location_name,omitempty"`
	CreatedAt            time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Mold) TableName() string {
	return "molds"
}

const (
	MoldStatusInStock   int8 = 1
	MoldStatusBorrowed  int8 = 2
	MoldStatusRepairing int8 = 3
	MoldStatusScrapped  int8 = 4
)
