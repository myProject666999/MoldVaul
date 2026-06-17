package handlers

import (
	"log"
	"mold-vaul/database"
	"mold-vaul/models"
	"mold-vaul/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type BorrowListQuery struct {
	Page       int    `form:"page,default=1"`
	PageSize   int    `form:"page_size,default=20"`
	Keyword    string `form:"keyword"`
	MoldID     uint64 `form:"mold_id"`
	BorrowerID uint64 `form:"borrower_id"`
	MachineID  uint64 `form:"machine_id"`
	Status     int8   `form:"status"`
	StartTime  string `form:"start_time"`
	EndTime    string `form:"end_time"`
}

func GetBorrowList(c *gin.Context) {
	var query BorrowListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	db := database.DB.Table("borrow_records br").
		Select("br.*, m.mold_name, ma.machine_name").
		Joins("LEFT JOIN molds m ON br.mold_id = m.id").
		Joins("LEFT JOIN machines ma ON br.machine_id = ma.id")

	if query.Keyword != "" {
		db = db.Where("br.mold_code LIKE ? OR br.borrower_name LIKE ? OR br.record_no LIKE ?",
			"%"+query.Keyword+"%", "%"+query.Keyword+"%", "%"+query.Keyword+"%")
	}
	if query.MoldID > 0 {
		db = db.Where("br.mold_id = ?", query.MoldID)
	}
	if query.BorrowerID > 0 {
		db = db.Where("br.borrower_id = ?", query.BorrowerID)
	}
	if query.MachineID > 0 {
		db = db.Where("br.machine_id = ?", query.MachineID)
	}
	if query.Status > 0 {
		db = db.Where("br.status = ?", query.Status)
	}
	if query.StartTime != "" {
		db = db.Where("br.borrow_time >= ?", query.StartTime)
	}
	if query.EndTime != "" {
		db = db.Where("br.borrow_time <= ?", query.EndTime)
	}

	var total int64
	db.Count(&total)

	type BorrowWithName struct {
		models.BorrowRecord
		MoldName    string `json:"mold_name"`
		MachineName string `json:"machine_name"`
	}
	var records []BorrowWithName
	offset := (query.Page - 1) * query.PageSize
	db.Order("br.id DESC").Offset(offset).Limit(query.PageSize).Scan(&records)

	utils.Success(c, gin.H{
		"list":      records,
		"total":     total,
		"page":      query.Page,
		"page_size": query.PageSize,
	})
}

type BorrowMoldRequest struct {
	MoldID       uint64 `json:"mold_id" binding:"required"`
	BorrowerID   uint64 `json:"borrower_id" binding:"required"`
	BorrowerName string `json:"borrower_name" binding:"required"`
	MachineID    uint64 `json:"machine_id"`
	MachineCode  string `json:"machine_code"`
	BorrowRemark string `json:"borrow_remark"`
}

func BorrowMold(c *gin.Context) {
	var req BorrowMoldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[DEBUG] Borrow mold bind error: %v", err)
		utils.Fail(c, 400, "参数错误")
		return
	}

	var mold models.Mold
	if err := database.DB.First(&mold, req.MoldID).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	if mold.Status != models.MoldStatusInStock {
		statusText := map[int8]string{
			models.MoldStatusBorrowed:  "借出中",
			models.MoldStatusRepairing: "维修中",
			models.MoldStatusScrapped:  "已报废",
		}
		utils.Fail(c, 400, "模具状态不允许借出，当前状态: "+statusText[mold.Status])
		return
	}

	recordNo := utils.GenerateRecordNo("BR")

	operatorID, _ := c.Get("user_id")

	record := models.BorrowRecord{
		RecordNo:     recordNo,
		MoldID:       req.MoldID,
		MoldCode:     mold.MoldCode,
		BorrowerID:   req.BorrowerID,
		BorrowerName: req.BorrowerName,
		MachineID:    req.MachineID,
		MachineCode:  req.MachineCode,
		BorrowTime:   time.Now(),
		Status:       models.BorrowStatusBorrowing,
		BorrowRemark: req.BorrowRemark,
		OperatorID:   operatorID.(uint64),
	}

	tx := database.DB.Begin()

	if err := tx.Create(&record).Error; err != nil {
		tx.Rollback()
		log.Printf("[DEBUG] Create borrow record error: %v", err)
		utils.Fail(c, 500, "借出失败")
		return
	}

	if err := tx.Model(&mold).Update("status", models.MoldStatusBorrowed).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "更新模具状态失败")
		return
	}

	tx.Commit()

	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))
	database.RDB.Del(database.Ctx, database.GetMoldCyclesKey(mold.ID))

	log.Printf("[DEBUG] Mold %s borrowed by %s", mold.MoldCode, req.BorrowerName)
	utils.Success(c, record)
}

type ReturnMoldRequest struct {
	ReturnRemark string `json:"return_remark"`
}

func ReturnMold(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var req ReturnMoldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	var record models.BorrowRecord
	if err := database.DB.First(&record, id).Error; err != nil {
		utils.Fail(c, 404, "借还记录不存在")
		return
	}

	if record.Status != models.BorrowStatusBorrowing {
		utils.Fail(c, 400, "该记录已归还")
		return
	}

	var mold models.Mold
	if err := database.DB.First(&mold, record.MoldID).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	now := time.Now()
	operatorID, _ := c.Get("user_id")

	tx := database.DB.Begin()

	if err := tx.Model(&record).Updates(map[string]interface{}{
		"status":        models.BorrowStatusReturned,
		"return_time":   now,
		"return_remark": req.ReturnRemark,
		"operator_id":   operatorID,
	}).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "归还失败")
		return
	}

	if err := tx.Model(&mold).Update("status", models.MoldStatusInStock).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "更新模具状态失败")
		return
	}

	tx.Commit()

	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))
	database.RDB.Del(database.Ctx, database.GetMoldCyclesKey(mold.ID))

	log.Printf("[DEBUG] Mold %s returned", mold.MoldCode)
	utils.Success(c, record)
}

func QuickBorrowByCode(c *gin.Context) {
	var req struct {
		MoldCode     string `json:"mold_code" binding:"required"`
		BorrowerID   uint64 `json:"borrower_id" binding:"required"`
		BorrowerName string `json:"borrower_name" binding:"required"`
		MachineCode  string `json:"machine_code"`
		BorrowRemark string `json:"borrow_remark"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	var mold models.Mold
	if err := database.DB.Where("mold_code = ?", req.MoldCode).First(&mold).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	if mold.Status != models.MoldStatusInStock {
		utils.Fail(c, 400, "模具不在库，无法借出")
		return
	}

	var machineID uint64
	var machineCode string
	if req.MachineCode != "" {
		var machine models.Machine
		if err := database.DB.Where("machine_code = ?", req.MachineCode).First(&machine).Error; err == nil {
			machineID = machine.ID
			machineCode = machine.MachineCode
		}
	}

	recordNo := utils.GenerateRecordNo("BR")
	operatorID, _ := c.Get("user_id")

	record := models.BorrowRecord{
		RecordNo:     recordNo,
		MoldID:       mold.ID,
		MoldCode:     mold.MoldCode,
		BorrowerID:   req.BorrowerID,
		BorrowerName: req.BorrowerName,
		MachineID:    machineID,
		MachineCode:  machineCode,
		BorrowTime:   time.Now(),
		Status:       models.BorrowStatusBorrowing,
		BorrowRemark: req.BorrowRemark,
		OperatorID:   operatorID.(uint64),
	}

	tx := database.DB.Begin()

	if err := tx.Create(&record).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "借出失败")
		return
	}

	if err := tx.Model(&mold).Update("status", models.MoldStatusBorrowed).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "更新模具状态失败")
		return
	}

	tx.Commit()

	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))

	log.Printf("[DEBUG] Quick borrow mold %s by code", mold.MoldCode)
	utils.Success(c, record)
}

func QuickReturnByCode(c *gin.Context) {
	var req struct {
		MoldCode     string `json:"mold_code" binding:"required"`
		ReturnRemark string `json:"return_remark"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	var mold models.Mold
	if err := database.DB.Where("mold_code = ?", req.MoldCode).First(&mold).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	var record models.BorrowRecord
	if err := database.DB.Where("mold_id = ? AND status = ?", mold.ID, models.BorrowStatusBorrowing).
		Order("id DESC").First(&record).Error; err != nil {
		utils.Fail(c, 400, "该模具没有借出记录")
		return
	}

	now := time.Now()
	operatorID, _ := c.Get("user_id")

	tx := database.DB.Begin()

	if err := tx.Model(&record).Updates(map[string]interface{}{
		"status":        models.BorrowStatusReturned,
		"return_time":   now,
		"return_remark": req.ReturnRemark,
		"operator_id":   operatorID,
	}).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "归还失败")
		return
	}

	if err := tx.Model(&mold).Update("status", models.MoldStatusInStock).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "更新模具状态失败")
		return
	}

	tx.Commit()

	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))

	log.Printf("[DEBUG] Quick return mold %s by code", mold.MoldCode)
	utils.Success(c, record)
}

func GetBorrowDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var record models.BorrowRecord
	if err := database.DB.First(&record, id).Error; err != nil {
		utils.Fail(c, 404, "记录不存在")
		return
	}

	utils.Success(c, record)
}
