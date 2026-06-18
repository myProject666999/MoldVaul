package handlers

import (
	"log"
	"mold-vaul/database"
	"mold-vaul/models"
	"mold-vaul/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token    string `json:"token"`
	UserID   uint64 `json:"user_id"`
	Username string `json:"username"`
	RealName string `json:"real_name"`
	Role     int8   `json:"role"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	var user models.User
	result := database.DB.Where("username = ?", req.Username).First(&user)
	if result.Error != nil {
		utils.Fail(c, 401, "用户名或密码错误")
		return
	}

	if user.Status != 1 {
		utils.Fail(c, 401, "账号已被禁用")
		return
	}

	if !utils.CheckPassword(req.Password, user.Password) {
		utils.Fail(c, 401, "用户名或密码错误")
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Username, user.Role, 24)
	if err != nil {
		log.Printf("[DEBUG] Generate token error: %v", err)
		utils.Fail(c, 500, "生成Token失败")
		return
	}

	log.Printf("[DEBUG] User %s login successfully", user.Username)
	utils.Success(c, LoginResponse{
		Token:    token,
		UserID:   user.ID,
		Username: user.Username,
		RealName: user.RealName,
		Role:     user.Role,
	})
}

func GetUserInfo(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.Fail(c, 404, "用户不存在")
		return
	}

	utils.Success(c, gin.H{
		"id":        user.ID,
		"username":  user.Username,
		"real_name": user.RealName,
		"phone":     user.Phone,
		"role":      user.Role,
	})
}

type UserListQuery struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Keyword  string `form:"keyword"`
	Role     int8   `form:"role"`
	Status   *int8  `form:"status"`
}

func GetUserList(c *gin.Context) {
	var query UserListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	db := database.DB.Model(&models.User{})

	if query.Keyword != "" {
		db = db.Where("username LIKE ? OR real_name LIKE ? OR phone LIKE ?",
			"%"+query.Keyword+"%", "%"+query.Keyword+"%", "%"+query.Keyword+"%")
	}
	if query.Role > 0 {
		db = db.Where("role = ?", query.Role)
	}
	if query.Status != nil {
		db = db.Where("status = ?", *query.Status)
	}

	var total int64
	db.Count(&total)

	var users []models.User
	offset := (query.Page - 1) * query.PageSize
	db.Order("id DESC").Offset(offset).Limit(query.PageSize).Find(&users)

	utils.Success(c, gin.H{
		"list":      users,
		"total":     total,
		"page":      query.Page,
		"page_size": query.PageSize,
	})
}

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	RealName string `json:"real_name"`
	Phone    string `json:"phone"`
	Role     int8   `json:"role"`
	Status   int8   `json:"status"`
}

func CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	var count int64
	database.DB.Model(&models.User{}).Where("username = ?", req.Username).Count(&count)
	if count > 0 {
		utils.Fail(c, 400, "用户名已存在")
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.Fail(c, 500, "密码加密失败")
		return
	}

	if req.Role == 0 {
		req.Role = 2
	}
	if req.Status == 0 {
		req.Status = 1
	}

	user := models.User{
		Username: req.Username,
		Password: hashedPassword,
		RealName: req.RealName,
		Phone:    req.Phone,
		Role:     req.Role,
		Status:   req.Status,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		log.Printf("[DEBUG] Create user error: %v", err)
		utils.Fail(c, 500, "创建失败")
		return
	}

	log.Printf("[DEBUG] User %s created successfully", user.Username)
	utils.Success(c, user)
}

type UpdateUserRequest struct {
	RealName string `json:"real_name"`
	Phone    string `json:"phone"`
	Role     int8   `json:"role"`
	Status   *int8  `json:"status"`
	Password string `json:"password"`
}

func UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		utils.Fail(c, 404, "用户不存在")
		return
	}

	updates := make(map[string]interface{})
	if req.RealName != "" {
		updates["real_name"] = req.RealName
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Role > 0 {
		updates["role"] = req.Role
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Password != "" {
		if len(req.Password) < 6 {
			utils.Fail(c, 400, "密码至少6位")
			return
		}
		hashed, err := utils.HashPassword(req.Password)
		if err != nil {
			utils.Fail(c, 500, "密码加密失败")
			return
		}
		updates["password"] = hashed
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		utils.Fail(c, 500, "更新失败")
		return
	}

	utils.Success(c, user)
}

func DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		utils.Fail(c, 404, "用户不存在")
		return
	}

	if user.Username == "admin" {
		utils.Fail(c, 400, "超级管理员不能删除")
		return
	}

	database.DB.Delete(&user)
	utils.Success(c, nil)
}

func ChangePassword(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "参数错误")
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.Fail(c, 404, "用户不存在")
		return
	}

	if !utils.CheckPassword(req.OldPassword, user.Password) {
		utils.Fail(c, 400, "原密码错误")
		return
	}

	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.Fail(c, 500, "密码加密失败")
		return
	}

	database.DB.Model(&user).Update("password", hashedPassword)
	utils.Success(c, nil)
}

func GetUserByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Fail(c, 400, "ID格式错误")
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.Fail(c, 404, "用户不存在")
			return
		}
		utils.Fail(c, 500, "查询失败")
		return
	}

	c.JSON(http.StatusOK, utils.Response{
		Code:    0,
		Message: "success",
		Data:    user,
	})
}
