package handlers

import (
	"encoding/json"
	"log"
	"mold-vaul/database"
	"mold-vaul/models"
	"mold-vaul/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type MoldListQuery struct {
	Page       int    `form:"page,default=1"`
	PageSize   int    `form:"page_size,default=20"`
	Keyword    string `form:"keyword"`
	MoldType   string `form:"mold_type"`
	Status     int8   `form:"status"`
	LocationID uint64 `form:"location_id"`
	IsWarning  int8   `form:"is_warning"`
}

func GetMoldList(c *gin.Context) {
	var query MoldListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	db := database.DB.Table("molds m").Select("m.*, l.location_name").
		Joins("LEFT JOIN locations l ON m.location_id = l.id")

	if query.Keyword != "" {
		db = db.Where("m.mold_code LIKE ? OR m.mold_name LIKE ? OR m.product_name LIKE ? OR m.product_code LIKE ?",
			"%"+query.Keyword+"%", "%"+query.Keyword+"%", "%"+query.Keyword+"%", "%"+query.Keyword+"%")
	}
	if query.MoldType != "" {
		db = db.Where("m.mold_type = ?", query.MoldType)
	}
	if query.Status > 0 {
		db = db.Where("m.status = ?", query.Status)
	}
	if query.LocationID > 0 {
		db = db.Where("m.location_id = ?", query.LocationID)
	}
	if query.IsWarning > 0 {
		db = db.Where("m.is_warning = ?", query.IsWarning)
	}

	var total int64
	db.Count(&total)

	type MoldWithLocation struct {
		models.Mold
		LocationName string `json:"location_name"`
	}
	var molds []MoldWithLocation
	offset := (query.Page - 1) * query.PageSize
	db.Order("m.id DESC").Offset(offset).Limit(query.PageSize).Scan(&molds)

	utils.Success(c, gin.H{
		"list":      molds,
		"total":     total,
		"page":      query.Page,
		"page_size": query.PageSize,
	})
}

func GetMoldDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	cacheKey := database.GetMoldStatusKey(id)
	cachedData, err := database.RDB.Get(database.Ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		var mold models.Mold
		if json.Unmarshal([]byte(cachedData), &mold) == nil {
			log.Printf("[DEBUG] Get mold %d from Redis cache", id)
			utils.Success(c, mold)
			return
		}
	}

	var mold models.Mold
	if err := database.DB.First(&mold, id).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	var location models.Location
	if mold.LocationID > 0 {
		database.DB.Select("location_name").First(&location, mold.LocationID)
		mold.LocationName = location.LocationName
	}

	moldJSON, _ := json.Marshal(mold)
	database.RDB.Set(database.Ctx, cacheKey, moldJSON, 30*time.Minute)

	log.Printf("[DEBUG] Get mold %d from DB and cached", id)
	utils.Success(c, mold)
}

type CreateMoldRequest struct {
	MoldCode          string  `json:"mold_code" binding:"required"`
	MoldName          string  `json:"mold_name" binding:"required"`
	ProductName       string  `json:"product_name"`
	ProductCode       string  `json:"product_code"`
	MoldType          string  `json:"mold_type"`
	CavityCount       int     `json:"cavity_count"`
	LocationID        uint64  `json:"location_id"`
	MaintenanceCycles uint    `json:"maintenance_cycles"`
	ScrapCycles       uint    `json:"scrap_cycles"`
	Manufacturer      string  `json:"manufacturer"`
	PurchaseDate      string  `json:"purchase_date"`
	PurchasePrice     float64 `json:"purchase_price"`
	Remark            string  `json:"remark"`
}

func CreateMold(c *gin.Context) {
	var req CreateMoldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[DEBUG] Create mold bind error: %v", err)
		utils.Fail(c, 400, "参数错误")
		return
	}

	var count int64
	database.DB.Model(&models.Mold{}).Where("mold_code = ?", req.MoldCode).Count(&count)
	if count > 0 {
		utils.Fail(c, 400, "模具编号已存在")
		return
	}

	if req.MaintenanceCycles == 0 {
		req.MaintenanceCycles = 100000
	}
	if req.ScrapCycles == 0 {
		req.ScrapCycles = 500000
	}

	mold := models.Mold{
		MoldCode:          req.MoldCode,
		MoldName:          req.MoldName,
		ProductName:       req.ProductName,
		ProductCode:       req.ProductCode,
		MoldType:          req.MoldType,
		CavityCount:       req.CavityCount,
		LocationID:        req.LocationID,
		Status:            models.MoldStatusInStock,
		MaintenanceCycles: req.MaintenanceCycles,
		ScrapCycles:       req.ScrapCycles,
		Manufacturer:      req.Manufacturer,
		PurchasePrice:     req.PurchasePrice,
		Remark:            req.Remark,
	}

	if req.PurchaseDate != "" {
		mold.PurchaseDate = &req.PurchaseDate
	}

	if err := database.DB.Create(&mold).Error; err != nil {
		log.Printf("[DEBUG] Create mold error: %v", err)
		utils.Fail(c, 500, "创建失败")
		return
	}

	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))
	database.RDB.Del(database.Ctx, database.GetMoldCyclesKey(mold.ID))

	log.Printf("[DEBUG] Mold %s created successfully", mold.MoldCode)
	utils.Success(c, mold)
}

type UpdateMoldRequest struct {
	MoldName          string  `json:"mold_name"`
	ProductName       string  `json:"product_name"`
	ProductCode       string  `json:"product_code"`
	MoldType          string  `json:"mold_type"`
	CavityCount       int     `json:"cavity_count"`
	LocationID        uint64  `json:"location_id"`
	Status            int8    `json:"status"`
	MaintenanceCycles uint    `json:"maintenance_cycles"`
	ScrapCycles       uint    `json:"scrap_cycles"`
	Manufacturer      string  `json:"manufacturer"`
	PurchaseDate      string  `json:"purchase_date"`
	PurchasePrice     float64 `json:"purchase_price"`
	Remark            string  `json:"remark"`
}

func UpdateMold(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var req UpdateMoldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	var mold models.Mold
	if err := database.DB.First(&mold, id).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	updates := make(map[string]interface{})
	if req.MoldName != "" {
		updates["mold_name"] = req.MoldName
	}
	if req.ProductName != "" {
		updates["product_name"] = req.ProductName
	}
	if req.ProductCode != "" {
		updates["product_code"] = req.ProductCode
	}
	if req.MoldType != "" {
		updates["mold_type"] = req.MoldType
	}
	if req.CavityCount > 0 {
		updates["cavity_count"] = req.CavityCount
	}
	if req.LocationID > 0 {
		updates["location_id"] = req.LocationID
	}
	if req.Status > 0 {
		updates["status"] = req.Status
	}
	if req.MaintenanceCycles > 0 {
		updates["maintenance_cycles"] = req.MaintenanceCycles
	}
	if req.ScrapCycles > 0 {
		updates["scrap_cycles"] = req.ScrapCycles
	}
	if req.Manufacturer != "" {
		updates["manufacturer"] = req.Manufacturer
	}
	if req.PurchasePrice > 0 {
		updates["purchase_price"] = req.PurchasePrice
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}
	if req.PurchaseDate != "" {
		updates["purchase_date"] = req.PurchaseDate
	}

	if err := database.DB.Model(&mold).Updates(updates).Error; err != nil {
		log.Printf("[DEBUG] Update mold error: %v", err)
		utils.Fail(c, 500, "更新失败")
		return
	}

	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(mold.ID))
	database.RDB.Del(database.Ctx, database.GetMoldCyclesKey(mold.ID))

	utils.Success(c, mold)
}

func DeleteMold(c *gin.Context) {
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

	var borrowCount int64
	database.DB.Model(&models.BorrowRecord{}).Where("mold_id = ? AND status = ?", id, models.BorrowStatusBorrowing).Count(&borrowCount)
	if borrowCount > 0 {
		utils.Fail(c, 400, "模具借出中，不能删除")
		return
	}

	database.DB.Delete(&mold)
	database.RDB.Del(database.Ctx, database.GetMoldStatusKey(id))
	database.RDB.Del(database.Ctx, database.GetMoldCyclesKey(id))

	utils.Success(c, nil)
}

func GetMoldStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	cacheKey := database.GetMoldStatusKey(id)
	cached, err := database.RDB.Get(database.Ctx, cacheKey).Result()
	if err == nil && cached != "" {
		var mold models.Mold
		if json.Unmarshal([]byte(cached), &mold) == nil {
			utils.Success(c, gin.H{
				"id":           mold.ID,
				"status":       mold.Status,
				"total_cycles": mold.TotalCycles,
				"is_warning":   mold.IsWarning,
				"from_cache":   true,
			})
			return
		}
	}

	var mold models.Mold
	if err := database.DB.First(&mold, id).Error; err != nil {
		utils.Fail(c, 404, "模具不存在")
		return
	}

	moldJSON, _ := json.Marshal(mold)
	database.RDB.Set(database.Ctx, cacheKey, moldJSON, 30*time.Minute)

	utils.Success(c, gin.H{
		"id":           mold.ID,
		"status":       mold.Status,
		"total_cycles": mold.TotalCycles,
		"is_warning":   mold.IsWarning,
		"from_cache":   false,
	})
}

func GetMoldStats(c *gin.Context) {
	var totalMolds int64
	database.DB.Model(&models.Mold{}).Count(&totalMolds)

	var inStockCount int64
	database.DB.Model(&models.Mold{}).Where("status = ?", models.MoldStatusInStock).Count(&inStockCount)

	var borrowedCount int64
	database.DB.Model(&models.Mold{}).Where("status = ?", models.MoldStatusBorrowed).Count(&borrowedCount)

	var repairingCount int64
	database.DB.Model(&models.Mold{}).Where("status = ?", models.MoldStatusRepairing).Count(&repairingCount)

	var warningCount int64
	database.DB.Model(&models.Mold{}).Where("is_warning = ?", 1).Count(&warningCount)

	var todayBorrowCount int64
	today := time.Now().Format("2006-01-02")
	database.DB.Model(&models.BorrowRecord{}).Where("DATE(borrow_time) = ?", today).Count(&todayBorrowCount)

	utils.Success(c, gin.H{
		"total_molds":        totalMolds,
		"in_stock_count":     inStockCount,
		"borrowed_count":     borrowedCount,
		"repairing_count":    repairingCount,
		"warning_count":      warningCount,
		"today_borrow_count": todayBorrowCount,
	})
}
