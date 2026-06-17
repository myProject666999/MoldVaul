package models

import (
	"time"
)

type BorrowRecord struct {
	ID           uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	RecordNo     string     `gorm:"size:50;not null;uniqueIndex" json:"record_no"`
	MoldID       uint64     `gorm:"not null;index" json:"mold_id"`
	MoldCode     string     `gorm:"size:50;not null" json:"mold_code"`
	BorrowerID   uint64     `gorm:"not null;index" json:"borrower_id"`
	BorrowerName string     `gorm:"size:50;not null" json:"borrower_name"`
	MachineID    uint64     `gorm:"not null;default:0" json:"machine_id"`
	MachineCode  string     `gorm:"size:50;not null;default:''" json:"machine_code"`
	BorrowTime   time.Time  `gorm:"not null;index" json:"borrow_time"`
	ReturnTime   *time.Time `json:"return_time"`
	Status       int8       `gorm:"not null;default:1;index" json:"status"`
	BorrowRemark string     `gorm:"size:255;not null;default:''" json:"borrow_remark"`
	ReturnRemark string     `gorm:"size:255;not null;default:''" json:"return_remark"`
	OperatorID   uint64     `gorm:"not null;default:0" json:"operator_id"`
	CreatedAt    time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	MoldName     string     `gorm:"-" json:"mold_name,omitempty"`
	MachineName  string     `gorm:"-" json:"machine_name,omitempty"`
}

func (BorrowRecord) TableName() string {
	return "borrow_records"
}

const (
	BorrowStatusBorrowing int8 = 1
	BorrowStatusReturned  int8 = 2
)

type ProductionReport struct {
	ID              uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	ReportNo        string     `gorm:"size:50;not null;uniqueIndex" json:"report_no"`
	MoldID          uint64     `gorm:"not null;index" json:"mold_id"`
	MoldCode        string     `gorm:"size:50;not null" json:"mold_code"`
	MachineID       uint64     `gorm:"not null;default:0" json:"machine_id"`
	MachineCode     string     `gorm:"size:50;not null;default:''" json:"machine_code"`
	OperatorID      uint64     `gorm:"not null" json:"operator_id"`
	OperatorName    string     `gorm:"size:50;not null" json:"operator_name"`
	ProductionDate  string     `gorm:"type:date;not null;index" json:"production_date"`
	Shift           string     `gorm:"size:20;not null;default:''" json:"shift"`
	CycleCount      uint       `gorm:"not null;default:0" json:"cycle_count"`
	ProductQuantity uint       `gorm:"not null;default:0" json:"product_quantity"`
	DefectQuantity  uint       `gorm:"not null;default:0" json:"defect_quantity"`
	StartTime       *time.Time `json:"start_time"`
	EndTime         *time.Time `json:"end_time"`
	Status          int8       `gorm:"not null;default:1;index" json:"status"`
	Remark          string     `gorm:"size:255;not null;default:''" json:"remark"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (ProductionReport) TableName() string {
	return "production_reports"
}

const (
	ReportStatusValid  int8 = 1
	ReportStatusVoided int8 = 2
)
