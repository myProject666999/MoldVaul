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

type ProductionListQuery struct {
	Page           int    `form:"page,default=1"`
	PageSize       int    `form:"page_size,default=20"`
	Keyword        string `form:"keyword"`
	MoldID         uint64 `form:"mold_id"`
	MachineID      uint64 `form:"machine_id"`
	OperatorID     uint64 `form:"operator_id"`
	Status         int8   `form:"status"`
	ProductionDate string `form:"production_date"`
	StartDate      string `form:"start_date"`
	EndDate        string `form:"end_date"`
}

func GetProductionList(c *gin.Context) {
	var query ProductionListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	db := database.DB.Model(&models.ProductionReport{})

	if query.Keyword != "" {
		db = db.Where("report_no LIKE ? OR mold_code LIKE ? OR operator_name LIKE ?",
			"%"+query.Keyword+"%", "%"+query.Keyword+"%", "%"+query.Keyword+"%")
	}
	if query.MoldID > 0 {
		db = db.Where("mold_id = ?", query.MoldID)
	}
	if query.MachineID > 0 {
		db = db.Where("machine_id = ?", query.MachineID)
	}
	if query.OperatorID > 0 {
		db = db.Where("operator_id = ?", query.OperatorID)
	}
	if query.Status > 0 {
		db = db.Where("status = ?", query.Status)
	}
	if query.ProductionDate != "" {
		db = db.Where("production_date = ?", query.ProductionDate)
	}
	if query.StartDate != "" {
		db = db.Where("production_date >= ?", query.StartDate)
	}
	if query.EndDate != "" {
		db = db.Where("production_date <= ?", query.EndDate)
	}

	var total int64
	db.Count(&total)

	var reports []models.ProductionReport
	offset := (query.Page - 1) * query.PageSize
	db.Order("id DESC").Offset(offset).Limit(query.PageSize).Find(&reports)

	utils.Success(c, gin.H{
		"list":      reports,
		"total":     total,
		"page":      query.Page,
		"page_size": query.PageSize,
	})
}

type CreateProductionRequest struct {
	MoldID          uint64 `json:"mold_id" binding:"required"`
	MachineID       uint64 `json:"machine_id"`
	MachineCode     string `json:"machine_code"`
	OperatorID      uint64 `json:"operator_id" binding:"required"`
	OperatorName    string `json:"operator_name" binding:"required"`
	ProductionDate  string `json:"production_date"`
	Shift           string `json:"shift"`
	CycleCount      uint   `json:"cycle_count" binding:"required,min=1"`
	ProductQuantity uint   `json:"product_quantity"`
	DefectQuantity  uint   `json:"defect_quantity"`
	StartTime       string `json:"start_time"`
	EndTime         string `json:"end_time"`
	Remark          string `json:"remark"`
}

func CreateProduction(c *gin.Context) {
	var req CreateProductionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[DEBUG] Create production bind error: %v", err)
		utils.Fail(c, 400, "参数错误")
		return
	}

	var mold models.Mold
	if err := database.DB.First(&mold, req.MoldID).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	if req.ProductionDate == "" {
		req.ProductionDate = time.Now().Format("2006-01-02")
	}

	reportNo := utils.GenerateRecordNo("PR")

	report := models.ProductionReport{
		ReportNo:        reportNo,
		MoldID:          req.MoldID,
		MoldCode:        mold.MoldCode,
		MachineID:       req.MachineID,
		MachineCode:     req.MachineCode,
		OperatorID:      req.OperatorID,
		OperatorName:    req.OperatorName,
		ProductionDate:  req.ProductionDate,
		Shift:           req.Shift,
		CycleCount:      req.CycleCount,
		ProductQuantity: req.ProductQuantity,
		DefectQuantity:  req.DefectQuantity,
		Status:          models.ReportStatusValid,
		Remark:          req.Remark,
	}

	if req.StartTime != "" {
		t, err := time.ParseInLocation("2006-01-02 15:04:05", req.StartTime, time.Local)
		if err == nil {
			report.StartTime = &t
		}
	}
	if req.EndTime != "" {
		t, err := time.ParseInLocation("2006-01-02 15:04:05", req.EndTime, time.Local)
		if err == nil {
			report.EndTime = &t
		}
	}

	tx := database.DB.Begin()

	if err := tx.Create(&report).Error; err != nil {
		tx.Rollback()
		log.Printf("[DEBUG] Create production report error: %v", err)
		utils.Fail(c, 500, "创建报工记录失败")
		return
	}

	beforeCycles := mold.TotalCycles
	afterCycles := beforeCycles + uint64(req.CycleCount)

	if err := tx.Model(&mold).Update("total_cycles", afterCycles).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "更新模具模次失败")
		return
	}

	cycleLog := models.CycleLog{
		MoldID:       mold.ID,
		MoldCode:     mold.MoldCode,
		ChangeType:   models.CycleChangeTypeProduction,
		ChangeCycles: int64(req.CycleCount),
		BeforeCycles: beforeCycles,
		AfterCycles:  afterCycles,
		RelatedID:    report.ID,
		RelatedType:  "production_report",
		OperatorID:   req.OperatorID,
		OperatorName: req.OperatorName,
		Remark:       "生产报工增加模次",
	}
	if err := tx.Create(&cycleLog).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "创建模次流水失败")
		return
	}

	isWarning := int8(0)
	warningType := ""
	if afterCycles >= uint64(mold.ScrapCycles) {
		isWarning = 1
		warningType = "scrap"
	} else if afterCycles >= uint64(mold.MaintenanceCycles) {
		isWarning = 1
		warningType = "maintenance"
	}

	if err := tx.Model(&mold).Updates(map[string]interface{}{
		"is_warning":   isWarning,
		"warning_type": warningType,
	}).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "更新预警状态失败")
		return
	}

	tx.Commit()

	cyclesKey := database.GetMoldCyclesKey(mold.ID)
	database.RDB.Set(database.Ctx, cyclesKey, strconv.FormatUint(afterCycles, 10), 24*time.Hour)
	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))

	log.Printf("[DEBUG] Production report created, mold %s cycles: %d -> %d",
		mold.MoldCode, beforeCycles, afterCycles)

	utils.Success(c, gin.H{
		"report":        report,
		"before_cycles": beforeCycles,
		"after_cycles":  afterCycles,
		"is_warning":    isWarning,
		"warning_type":  warningType,
	})
}

func GetProductionDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var report models.ProductionReport
	if err := database.DB.First(&report, id).Error; err != nil {
		utils.Fail(c, 404, "报工记录不存在")
		return
	}

	utils.Success(c, report)
}

func VoidProduction(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var report models.ProductionReport
	if err := database.DB.First(&report, id).Error; err != nil {
		utils.Fail(c, 404, "报工记录不存在")
		return
	}

	if report.Status != models.ReportStatusValid {
		utils.Fail(c, 400, "该报工单已作废")
		return
	}

	var mold models.Mold
	if err := database.DB.First(&mold, report.MoldID).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	beforeCycles := mold.TotalCycles
	afterCycles := beforeCycles - uint64(report.CycleCount)
	if afterCycles < 0 {
		afterCycles = 0
	}

	operatorID, _ := c.Get("user_id")
	operatorName, _ := c.Get("username")

	tx := database.DB.Begin()

	if err := tx.Model(&report).Update("status", models.ReportStatusVoided).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "作废失败")
		return
	}

	if err := tx.Model(&mold).Update("total_cycles", afterCycles).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "回退模次失败")
		return
	}

	cycleLog := models.CycleLog{
		MoldID:       mold.ID,
		MoldCode:     mold.MoldCode,
		ChangeType:   models.CycleChangeTypeManual,
		ChangeCycles: -int64(report.CycleCount),
		BeforeCycles: beforeCycles,
		AfterCycles:  afterCycles,
		RelatedID:    report.ID,
		RelatedType:  "production_void",
		OperatorID:   operatorID.(uint64),
		OperatorName: operatorName.(string),
		Remark:       "作废生产报工回退模次",
	}
	if err := tx.Create(&cycleLog).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "创建模次流水失败")
		return
	}

	isWarning := int8(0)
	warningType := ""
	if afterCycles >= uint64(mold.ScrapCycles) {
		isWarning = 1
		warningType = "scrap"
	} else if afterCycles >= uint64(mold.MaintenanceCycles) {
		isWarning = 1
		warningType = "maintenance"
	}

	if err := tx.Model(&mold).Updates(map[string]interface{}{
		"is_warning":   isWarning,
		"warning_type": warningType,
	}).Error; err != nil {
		tx.Rollback()
		utils.Fail(c, 500, "更新预警状态失败")
		return
	}

	tx.Commit()

	cyclesKey := database.GetMoldCyclesKey(mold.ID)
	database.RDB.Set(database.Ctx, cyclesKey, strconv.FormatUint(afterCycles, 10), 24*time.Hour)
	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))

	log.Printf("[DEBUG] Production report %d voided, mold %s cycles: %d -> %d",
		report.ID, mold.MoldCode, beforeCycles, afterCycles)

	utils.Success(c, nil)
}

func GetMoldCycles(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	cyclesKey := database.GetMoldCyclesKey(id)
	cachedCycles, err := database.RDB.Get(database.Ctx, cyclesKey).Result()
	if err == nil && cachedCycles != "" {
		cycles, _ := strconv.ParseUint(cachedCycles, 10, 64)
		log.Printf("[DEBUG] Get mold %d cycles from Redis: %d", id, cycles)
		utils.Success(c, gin.H{
			"mold_id":      id,
			"total_cycles": cycles,
			"from_cache":   true,
		})
		return
	}

	var mold models.Mold
	if err := database.DB.Select("id, total_cycles").First(&mold, id).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	database.RDB.Set(database.Ctx, cyclesKey, strconv.FormatUint(mold.TotalCycles, 10), 24*time.Hour)

	log.Printf("[DEBUG] Get mold %d cycles from DB: %d", id, mold.TotalCycles)
	utils.Success(c, gin.H{
		"mold_id":      id,
		"total_cycles": mold.TotalCycles,
		"from_cache":   false,
	})
}

func GetCycleLogs(c *gin.Context) {
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

	db := database.DB.Model(&models.CycleLog{}).Where("mold_id = ?", moldID)

	var total int64
	db.Count(&total)

	var logs []models.CycleLog
	offset := (page - 1) * pageSize
	db.Order("id DESC").Offset(offset).Limit(pageSize).Find(&logs)

	utils.Success(c, gin.H{
		"list":      logs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func GetMoldProductionStats(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var mold models.Mold
	if err := database.DB.First(&mold, id).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	var totalReports int64
	database.DB.Model(&models.ProductionReport{}).
		Where("mold_id = ? AND status = ?", id, models.ReportStatusValid).
		Count(&totalReports)

	var totalCyclesFromReports struct {
		Cycles   uint64
		Products uint64
	}
	database.DB.Model(&models.ProductionReport{}).
		Where("mold_id = ? AND status = ?", id, models.ReportStatusValid).
		Select("COALESCE(SUM(cycle_count),0) as cycles, COALESCE(SUM(product_quantity),0) as products").
		Scan(&totalCyclesFromReports)

	var monthReports int64
	monthStart := time.Now().Format("2006-01") + "-01"
	database.DB.Model(&models.ProductionReport{}).
		Where("mold_id = ? AND status = ? AND production_date >= ?", id, models.ReportStatusValid, monthStart).
		Count(&monthReports)

	utils.Success(c, gin.H{
		"mold":             mold,
		"total_reports":    totalReports,
		"total_cycles":     mold.TotalCycles,
		"total_products":   totalCyclesFromReports.Products,
		"month_reports":    monthReports,
		"maintenance_rate": float64(mold.TotalCycles) / float64(mold.MaintenanceCycles) * 100,
		"scrap_rate":       float64(mold.TotalCycles) / float64(mold.ScrapCycles) * 100,
	})
}

func GetLocationList(c *gin.Context) {
	var locations []models.Location
	db := database.DB.Model(&models.Location{})

	statusStr := c.Query("status")
	if statusStr != "" {
		status, err := strconv.Atoi(statusStr)
		if err == nil {
			db = db.Where("status = ?", status)
		}
	}

	db.Order("id ASC").Find(&locations)
	utils.Success(c, locations)
}

func GetMachineList(c *gin.Context) {
	var machines []models.Machine
	db := database.DB.Model(&models.Machine{})

	statusStr := c.Query("status")
	if statusStr != "" {
		status, err := strconv.Atoi(statusStr)
		if err == nil {
			db = db.Where("status = ?", status)
		}
	}

	db.Order("id ASC").Find(&machines)
	utils.Success(c, machines)
}

func CreateLocation(c *gin.Context) {
	var loc models.Location
	if err := c.ShouldBindJSON(&loc); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}
	loc.Status = 1
	if err := database.DB.Create(&loc).Error; err != nil {
		utils.Fail(c, 500, "创建失败")
		return
	}
	utils.Success(c, loc)
}

func CreateMachine(c *gin.Context) {
	var machine models.Machine
	if err := c.ShouldBindJSON(&machine); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}
	machine.Status = 1
	if err := database.DB.Create(&machine).Error; err != nil {
		utils.Fail(c, 500, "创建失败")
		return
	}
	utils.Success(c, machine)
}

func UpdateLocation(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var loc models.Location
	if err := database.DB.First(&loc, id).Error; err != nil {
		utils.Fail(c, 404, "库位不存在")
		return
	}

	var req struct {
		LocationCode string `json:"location_code"`
		LocationName string `json:"location_name"`
		Area         string `json:"area"`
		Shelf        string `json:"shelf"`
		Layer        *int   `json:"layer"`
		Status       *int8  `json:"status"`
		Remark       string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	updates := make(map[string]interface{})
	if req.LocationCode != "" {
		updates["location_code"] = req.LocationCode
	}
	if req.LocationName != "" {
		updates["location_name"] = req.LocationName
	}
	if req.Area != "" {
		updates["area"] = req.Area
	}
	if req.Shelf != "" {
		updates["shelf"] = req.Shelf
	}
	if req.Layer != nil {
		updates["layer"] = *req.Layer
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}

	if err := database.DB.Model(&loc).Updates(updates).Error; err != nil {
		utils.Fail(c, 500, "更新失败")
		return
	}

	utils.Success(c, loc)
}

func DeleteLocation(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var loc models.Location
	if err := database.DB.First(&loc, id).Error; err != nil {
		utils.Fail(c, 404, "库位不存在")
		return
	}

	var count int64
	database.DB.Model(&models.Mold{}).Where("location_id = ?", id).Count(&count)
	if count > 0 {
		utils.Fail(c, 400, "该库位下有模具，不能删除")
		return
	}

	database.DB.Delete(&loc)
	utils.Success(c, nil)
}

func UpdateMachine(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var machine models.Machine
	if err := database.DB.First(&machine, id).Error; err != nil {
		utils.Fail(c, 404, "设备不存在")
		return
	}

	var req struct {
		MachineCode   string `json:"machine_code"`
		MachineName   string `json:"machine_name"`
		MachineType   string `json:"machine_type"`
		Specification string `json:"specification"`
		Workshop      string `json:"workshop"`
		Status        *int8  `json:"status"`
		Remark        string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	updates := make(map[string]interface{})
	if req.MachineCode != "" {
		updates["machine_code"] = req.MachineCode
	}
	if req.MachineName != "" {
		updates["machine_name"] = req.MachineName
	}
	if req.MachineType != "" {
		updates["machine_type"] = req.MachineType
	}
	if req.Specification != "" {
		updates["specification"] = req.Specification
	}
	if req.Workshop != "" {
		updates["workshop"] = req.Workshop
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}

	if err := database.DB.Model(&machine).Updates(updates).Error; err != nil {
		utils.Fail(c, 500, "更新失败")
		return
	}

	utils.Success(c, machine)
}

func DeleteMachine(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var machine models.Machine
	if err := database.DB.First(&machine, id).Error; err != nil {
		utils.Fail(c, 404, "设备不存在")
		return
	}

	database.DB.Delete(&machine)
	utils.Success(c, nil)
}
