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

type MaintenanceListQuery struct {
	Page            int    `form:"page,default=1"`
	PageSize        int    `form:"page_size,default=20"`
	Keyword         string `form:"keyword"`
	MoldID          uint64 `form:"mold_id"`
	MaintenanceType int8   `form:"maintenance_type"`
	Status          int8   `form:"status"`
	StartDate       string `form:"start_date"`
	EndDate         string `form:"end_date"`
}

func GetMaintenanceList(c *gin.Context) {
	var query MaintenanceListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	db := database.DB.Table("maintenance_records mr").
		Select("mr.*, m.mold_name").
		Joins("LEFT JOIN molds m ON mr.mold_id = m.id")

	if query.Keyword != "" {
		db = db.Where("mr.record_no LIKE ? OR mr.mold_code LIKE ? OR mr.maintainer LIKE ?",
			"%"+query.Keyword+"%", "%"+query.Keyword+"%", "%"+query.Keyword+"%")
	}
	if query.MoldID > 0 {
		db = db.Where("mr.mold_id = ?", query.MoldID)
	}
	if query.MaintenanceType > 0 {
		db = db.Where("mr.maintenance_type = ?", query.MaintenanceType)
	}
	if query.Status > 0 {
		db = db.Where("mr.status = ?", query.Status)
	}
	if query.StartDate != "" {
		db = db.Where("mr.maintenance_date >= ?", query.StartDate)
	}
	if query.EndDate != "" {
		db = db.Where("mr.maintenance_date <= ?", query.EndDate)
	}

	var total int64
	db.Count(&total)

	type MaintenanceWithName struct {
		models.MaintenanceRecord
		MoldName string `json:"mold_name"`
	}
	var records []MaintenanceWithName
	offset := (query.Page - 1) * query.PageSize
	db.Order("mr.id DESC").Offset(offset).Limit(query.PageSize).Scan(&records)

	utils.Success(c, gin.H{
		"list":      records,
		"total":     total,
		"page":      query.Page,
		"page_size": query.PageSize,
	})
}

type CreateMaintenanceRequest struct {
	MoldID             uint64  `json:"mold_id" binding:"required"`
	MaintenanceType    int8    `json:"maintenance_type" binding:"required"`
	MaintenanceDate    string  `json:"maintenance_date"`
	FaultDescription   string  `json:"fault_description"`
	MaintenanceContent string  `json:"maintenance_content"`
	PartsCost          float64 `json:"parts_cost"`
	LaborCost          float64 `json:"labor_cost"`
	Maintainer         string  `json:"maintainer"`
	MaintainerID       uint64  `json:"maintainer_id"`
	Remark             string  `json:"remark"`
}

func CreateMaintenance(c *gin.Context) {
	var req CreateMaintenanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[DEBUG] Create maintenance bind error: %v", err)
		utils.Fail(c, 400, "参数错误")
		return
	}

	var mold models.Mold
	if err := database.DB.First(&mold, req.MoldID).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	if req.MaintenanceDate == "" {
		req.MaintenanceDate = time.Now().Format("2006-01-02")
	}

	totalCost := req.PartsCost + req.LaborCost

	recordNo := utils.GenerateRecordNo("MT")

	record := models.MaintenanceRecord{
		RecordNo:           recordNo,
		MoldID:             req.MoldID,
		MoldCode:           mold.MoldCode,
		MaintenanceType:    req.MaintenanceType,
		MaintenanceDate:    req.MaintenanceDate,
		MaintenanceCycle:   mold.TotalCycles,
		FaultDescription:   req.FaultDescription,
		MaintenanceContent: req.MaintenanceContent,
		PartsCost:          req.PartsCost,
		LaborCost:          req.LaborCost,
		TotalCost:          totalCost,
		Maintainer:         req.Maintainer,
		MaintainerID:       req.MaintainerID,
		Status:             models.MaintenanceStatusRepairing,
		Remark:             req.Remark,
	}

	tx := database.DB.Begin()

	if err := tx.Create(&record).Error; err != nil {
		tx.Rollback()
		log.Printf("[DEBUG] Create maintenance record error: %v", err)
		utils.Fail(c, 500, "创建维修记录失败")
		return
	}

	if mold.Status != models.MoldStatusRepairing {
		if err := tx.Model(&mold).Update("status", models.MoldStatusRepairing).Error; err != nil {
			tx.Rollback()
			utils.Fail(c, 500, "更新模具状态失败")
			return
		}
	}

	tx.Commit()

	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))

	log.Printf("[DEBUG] Maintenance record created for mold %s, type: %d", mold.MoldCode, req.MaintenanceType)
	utils.Success(c, record)
}

func CompleteMaintenance(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var req struct {
		MaintenanceContent string  `json:"maintenance_content"`
		PartsCost          float64 `json:"parts_cost"`
		LaborCost          float64 `json:"labor_cost"`
		Maintainer         string  `json:"maintainer"`
		Remark             string  `json:"remark"`
	}
	c.ShouldBindJSON(&req)

	var record models.MaintenanceRecord
	if err := database.DB.First(&record, id).Error; err != nil {
		utils.Fail(c, 404, "维修记录不存在")
		return
	}

	if record.Status == models.MaintenanceStatusDone {
		utils.Fail(c, 400, "该维修记录已完成")
		return
	}

	var mold models.Mold
	if err := database.DB.First(&mold, record.MoldID).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	totalCost := req.PartsCost + req.LaborCost

	tx := database.DB.Begin()

	updates := map[string]interface{}{
		"status": models.MaintenanceStatusDone,
	}
	if req.MaintenanceContent != "" {
		updates["maintenance_content"] = req.MaintenanceContent
	}
	if req.PartsCost > 0 {
		updates["parts_cost"] = req.PartsCost
	}
	if req.LaborCost > 0 {
		updates["labor_cost"] = req.LaborCost
	}
	if totalCost > 0 {
		updates["total_cost"] = totalCost
	}
	if req.Maintainer != "" {
		updates["maintainer"] = req.Maintainer
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}

	if err := tx.Model(&record).Updates(updates).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "更新维修记录失败")
		return
	}

	today := time.Now().Format("2006-01-02")

	lastMaintenanceCycle := mold.TotalCycles
	if record.MaintenanceCycle > 0 {
		lastMaintenanceCycle = record.MaintenanceCycle
	}

	moldUpdates := map[string]interface{}{
		"status":                 models.MoldStatusInStock,
		"last_maintenance_cycle": lastMaintenanceCycle,
		"last_maintenance_date":  today,
	}

	remainingCycles := mold.TotalCycles - lastMaintenanceCycle
	if remainingCycles < uint64(mold.MaintenanceCycles) {
		moldUpdates["is_warning"] = 0
		moldUpdates["warning_type"] = ""
	}

	if err := tx.Model(&mold).Updates(moldUpdates).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "更新模具状态失败")
		return
	}

	cycleLog := models.CycleLog{
		MoldID:       mold.ID,
		MoldCode:     mold.MoldCode,
		ChangeType:   models.CycleChangeTypeMaintenance,
		ChangeCycles: 0,
		BeforeCycles: mold.TotalCycles,
		AfterCycles:  mold.TotalCycles,
		RelatedID:    record.ID,
		RelatedType:  "maintenance",
		OperatorID:   0,
		OperatorName: req.Maintainer,
		Remark:       "维修保养完成，重置保养计数",
	}
	if err := tx.Create(&cycleLog).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "创建模次流水失败")
		return
	}

	tx.Commit()

	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))
	database.RDB.Del(database.Ctx, database.GetMoldCyclesKey(mold.ID))

	log.Printf("[DEBUG] Maintenance record %d completed for mold %s", record.ID, mold.MoldCode)
	utils.Success(c, record)
}

func GetMaintenanceDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var record models.MaintenanceRecord
	if err := database.DB.First(&record, id).Error; err != nil {
		utils.Fail(c, 404, "维修记录不存在")
		return
	}

	utils.Success(c, record)
}

func GetMoldMaintenanceList(c *gin.Context) {
	moldIDStr := c.Param("mold_id")
	moldID, err := strconv.ParseUint(moldIDStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "模具ID格式错误")
		return
	}

	page := 1
	pageSize := 20
	if p, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil && p > 0 {
		page = p
	}
	if ps, err := strconv.Atoi(c.DefaultQuery("page_size", "20")); err == nil && ps > 0 {
		pageSize = ps
	}

	db := database.DB.Model(&models.MaintenanceRecord{}).Where("mold_id = ?", moldID)

	var total int64
	db.Count(&total)

	var records []models.MaintenanceRecord
	offset := (page - 1) * pageSize
	db.Order("id DESC").Offset(offset).Limit(pageSize).Find(&records)

	utils.Success(c, gin.H{
		"list":      records,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func GetMaintenanceStats(c *gin.Context) {
	var totalRecords int64
	database.DB.Model(&models.MaintenanceRecord{}).Count(&totalRecords)

	var repairingCount int64
	database.DB.Model(&models.MaintenanceRecord{}).Where("status = ?", models.MaintenanceStatusRepairing).Count(&repairingCount)

	var totalCost struct {
		Total float64
	}
	database.DB.Model(&models.MaintenanceRecord{}).
		Where("status = ?", models.MaintenanceStatusDone).
		Select("COALESCE(SUM(total_cost), 0) as total").
		Scan(&totalCost)

	var monthCost struct {
		Total float64
	}
	monthStart := time.Now().Format("2006-01") + "-01"
	database.DB.Model(&models.MaintenanceRecord{}).
		Where("status = ? AND maintenance_date >= ?", models.MaintenanceStatusDone, monthStart).
		Select("COALESCE(SUM(total_cost), 0) as total").
		Scan(&monthCost)

	utils.Success(c, gin.H{
		"total_records":   totalRecords,
		"repairing_count": repairingCount,
		"total_cost":      totalCost.Total,
		"month_cost":      monthCost.Total,
	})
}

func DeleteMaintenance(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var record models.MaintenanceRecord
	if err := database.DB.First(&record, id).Error; err != nil {
		utils.Fail(c, 404, "记录不存在")
		return
	}

	database.DB.Delete(&record)
	utils.Success(c, nil)
}
