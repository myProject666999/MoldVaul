package models

import (
	"time"
)

type MaintenanceRecord struct {
	ID                 uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	RecordNo           string    `gorm:"size:50;not null;uniqueIndex" json:"record_no"`
	MoldID             uint64    `gorm:"not null;index" json:"mold_id"`
	MoldCode           string    `gorm:"size:50;not null" json:"mold_code"`
	MaintenanceType    int8      `gorm:"not null;default:1" json:"maintenance_type"`
	MaintenanceDate    string    `gorm:"type:date;not null;index" json:"maintenance_date"`
	MaintenanceCycle   uint64    `gorm:"not null;default:0" json:"maintenance_cycle"`
	FaultDescription   string    `gorm:"size:500;not null;default:''" json:"fault_description"`
	MaintenanceContent string    `gorm:"size:500;not null;default:''" json:"maintenance_content"`
	PartsCost          float64   `gorm:"type:decimal(12,2);not null;default:0.00" json:"parts_cost"`
	LaborCost          float64   `gorm:"type:decimal(12,2);not null;default:0.00" json:"labor_cost"`
	TotalCost          float64   `gorm:"type:decimal(12,2);not null;default:0.00" json:"total_cost"`
	Maintainer         string    `gorm:"size:50;not null;default:''" json:"maintainer"`
	MaintainerID       uint64    `gorm:"not null;default:0" json:"maintainer_id"`
	Status             int8      `gorm:"not null;default:1;index" json:"status"`
	Remark             string    `gorm:"size:500;not null;default:''" json:"remark"`
	CreatedAt          time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time `gorm:"autoUpdateTime" json:"updated_at"`
	MoldName           string    `gorm:"-" json:"mold_name,omitempty"`
}

func (MaintenanceRecord) TableName() string {
	return "maintenance_records"
}

const (
	MaintenanceTypeMaintenance int8 = 1
	MaintenanceTypeRepair      int8 = 2
	MaintenanceTypeOverhaul    int8 = 3

	MaintenanceStatusRepairing int8 = 1
	MaintenanceStatusDone      int8 = 2
)

type CycleLog struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	MoldID       uint64    `gorm:"not null;index" json:"mold_id"`
	MoldCode     string    `gorm:"size:50;not null" json:"mold_code"`
	ChangeType   int8      `gorm:"not null" json:"change_type"`
	ChangeCycles int64     `gorm:"not null" json:"change_cycles"`
	BeforeCycles uint64    `gorm:"not null" json:"before_cycles"`
	AfterCycles  uint64    `gorm:"not null" json:"after_cycles"`
	RelatedID    uint64    `gorm:"not null;default:0" json:"related_id"`
	RelatedType  string    `gorm:"size:50;not null;default:''" json:"related_type"`
	OperatorID   uint64    `gorm:"not null;default:0" json:"operator_id"`
	OperatorName string    `gorm:"size:50;not null;default:''" json:"operator_name"`
	Remark       string    `gorm:"size:255;not null;default:''" json:"remark"`
	CreatedAt    time.Time `gorm:"autoCreateTime;index" json:"created_at"`
}

func (CycleLog) TableName() string {
	return "cycle_logs"
}

const (
	CycleChangeTypeProduction  int8 = 1
	CycleChangeTypeMaintenance int8 = 2
	CycleChangeTypeManual      int8 = 3
)
