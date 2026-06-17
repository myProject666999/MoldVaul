# 模具工装管理柜系统 API 接口文档

## 基础信息
- 基础地址: `http://localhost:8081/api`
- 认证方式: Bearer Token (JWT)
- Token 有效期: 24小时

## 认证接口

### 登录
- **POST** `/auth/login`
- **无需认证**
- 请求体:
  ```json
  {
    "username": "admin",
    "password": "123456"
  }
  ```
- 响应:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIs...",
      "user_id": 1,
      "username": "admin",
      "real_name": "系统管理员",
      "role": 1
    }
  }
  ```

## 用户管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/user/info` | 获取当前用户信息 |
| GET | `/user/list` | 获取用户列表 (支持分页、搜索) |
| GET | `/user/:id` | 获取用户详情 |
| POST | `/user` | 创建用户 |
| PUT | `/user/:id` | 更新用户 |
| DELETE | `/user/:id` | 删除用户 |
| POST | `/user/change-password` | 修改密码 |

## 模具管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/mold/stats` | 获取模具统计数据 |
| GET | `/mold/list` | 获取模具列表 (支持分页、搜索、筛选) |
| GET | `/mold/detail/:id` | 获取模具详情 (从Redis缓存优先) |
| GET | `/mold/status/:id` | 获取模具实时状态 (Redis缓存) |
| GET | `/mold/cycles/:id` | 获取模具模次 (Redis缓存) |
| GET | `/mold/production-stats/:id` | 获取模具生产统计 |
| POST | `/mold` | 创建模具 |
| PUT | `/mold/:id` | 更新模具 |
| DELETE | `/mold/:id` | 删除模具 |
| GET | `/mold/cycle-logs/:mold_id` | 获取模次变更流水 |

## 借还管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/borrow/list` | 获取借还记录列表 |
| GET | `/borrow/detail/:id` | 获取借还详情 |
| POST | `/borrow/borrow` | 登记借出 |
| POST | `/borrow/return/:id` | 登记归还 |
| POST | `/borrow/quick-borrow` | 扫码快速借出 |
| POST | `/borrow/quick-return` | 扫码快速归还 |

## 生产报工接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/production/list` | 获取报工列表 |
| GET | `/production/detail/:id` | 获取报工详情 |
| POST | `/production` | 创建生产报工 (自动累计模次) |
| POST | `/production/void/:id` | 作废报工 (自动回退模次) |

## 维修保养接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/maintenance/list` | 获取维修记录列表 |
| GET | `/maintenance/detail/:id` | 获取维修详情 |
| GET | `/maintenance/mold/:mold_id` | 获取模具维修历史 |
| GET | `/maintenance/stats` | 获取维修统计 |
| POST | `/maintenance` | 创建维修记录 |
| POST | `/maintenance/complete/:id` | 完成维修 |
| DELETE | `/maintenance/:id` | 删除维修记录 |

## 基础数据接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/location/list` | 获取库位列表 |
| POST | `/location` | 创建库位 |
| GET | `/machine/list` | 获取设备列表 |
| POST | `/machine` | 创建设备 |

## 分页参数

所有列表接口支持以下参数:
- `page`: 页码，默认 1
- `page_size`: 每页数量，默认 20
- `keyword`: 搜索关键词

## 状态码说明

| Code | 说明 |
|------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 模具状态

| 值 | 说明 |
|----|------|
| 1 | 在库 |
| 2 | 借出 |
| 3 | 维修中 |
| 4 | 报废 |

## 借还状态

| 值 | 说明 |
|----|------|
| 1 | 借出中 |
| 2 | 已归还 |

## 维修类型

| 值 | 说明 |
|----|------|
| 1 | 保养 |
| 2 | 维修 |
| 3 | 大修 |

## 维修状态

| 值 | 说明 |
|----|------|
| 1 | 维修中 |
| 2 | 已完成 |

## 模次变更类型

| 值 | 说明 |
|----|------|
| 1 | 生产报工增加 |
| 2 | 维修保养 |
| 3 | 手工调整 |

## Redis 缓存键

| 键 | 说明 | 过期时间 |
|----|------|----------|
| `mold:status:{mold_id}` | 模具状态完整数据 | 30分钟 |
| `mold:cycles:{mold_id}` | 模具当前模次 | 24小时 |
