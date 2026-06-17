# 模具工装管理柜系统 (Mold Vault Management System)

一套面向注塑、冲压车间的模具全生命周期管理系统。解决模具散落在各货架、借还混乱、模次统计不清等问题。

## 技术栈

- **后端**: Golang + Gin + GORM
- **前端**: React 18 + Vite + Ant Design 5
- **数据库**: MySQL 8.0
- **缓存**: Redis
- **认证**: JWT

## 项目结构

```
MoldVaul/
├── database/
│   └── schema.sql          # 数据库脚本
├── backend/                # Go 后端
│   ├── main.go
│   ├── go.mod
│   ├── config/             # 配置
│   ├── database/           # MySQL + Redis 连接
│   ├── models/             # 数据模型
│   ├── handlers/           # API 处理
│   ├── middleware/         # 中间件
│   ├── utils/              # 工具函数
│   └── tools/              # 辅助工具
├── frontend/               # React 前端
│   ├── src/
│   │   ├── api/            # API 封装
│   │   ├── pages/          # 页面
│   │   ├── layouts/        # 布局
│   │   ├── utils/          # 工具
│   │   └── main.jsx
│   └── package.json
├── API_DOC.md              # API 文档
└── README.md
```

## 核心功能

### 1. 模具出入库借还
- 模具扫码借出/归还
- 记录借用人、使用设备、借出时间
- 支持登记借还和扫码快速借还
- 完整流水记录可追溯

### 2. 生产报工与模次累计
- 生产报工时自动累计模具模次
- 模次流水表记录每一次变更，可审计可对账
- 到达保养模次/报废模次自动预警
- 作废报工单自动回退模次
- 热门模具实时状态用 Redis 缓存

### 3. 维修保养管理
- 记录每次维修保养内容、费用
- 维修完成后自动重置保养计数
- 维修统计（总费用、本月费用等）

## 数据库表

| 表名 | 说明 |
|------|------|
| `users` | 用户表 |
| `locations` | 库位表 |
| `machines` | 设备表 |
| `molds` | 模具表 |
| `borrow_records` | 借还记录表 |
| `production_reports` | 生产报工表 |
| `maintenance_records` | 维修保养记录表 |
| `cycle_logs` | 模次流水表 |

## 快速开始

### 前置要求
- MySQL 8.0+ (localhost:3306, root/123456)
- Redis 6.0+ (localhost:6379)
- Go 1.21+
- Node.js 18+

### 1. 导入数据库

```bash
mysql -u root -p123456 -h localhost -P 3306 --default-character-set=utf8mb4
```

在 MySQL 中执行:
```sql
source d:/Workspace/work02/MoldVaul/database/schema.sql
```

### 2. 启动后端

```bash
cd backend
go mod tidy
go run .
# 或编译运行
go build -o mold-vaul-server.exe .
.\mold-vaul-server.exe
```

后端默认端口: `8081`

环境变量配置（可选）:
- `SERVER_PORT`: 服务端口，默认 8080
- `DB_HOST`: MySQL 地址，默认 localhost
- `DB_PORT`: MySQL 端口，默认 3306
- `DB_USER`: MySQL 用户，默认 root
- `DB_PASSWORD`: MySQL 密码，默认 123456
- `DB_NAME`: 数据库名，默认 mold_vaul
- `REDIS_HOST`: Redis 地址，默认 localhost
- `REDIS_PORT`: Redis 端口，默认 6379
- `GIN_MODE`: debug/release

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认端口: `3002` (3000/3001被占用时)

### 4. 访问系统

- 前端: http://localhost:3002/
- 后端 API: http://localhost:8081/api/health
- 默认账号: `admin` / `123456`

## 核心难点实现

### 模次准确累计
1. **事务保证**: 生产报工和模次累计在同一事务中
2. **流水审计**: 每次模次变更都写入 `cycle_logs`，记录变更前后数值
3. **防重复计数**: 报工单唯一编号，且作废时回退模次
4. **自动预警**: 模次超过阈值时自动标记预警状态

### Redis 实时缓存
1. **模具状态缓存**: `mold:status:{id}` 缓存完整状态，30分钟过期
2. **模次缓存**: `mold:cycles:{id}` 缓存当前模次，24小时过期
3. **数据更新**: 模次变化时主动删除缓存，保证一致性

## API 接口

完整 API 文档见 [API_DOC.md](./API_DOC.md)

### 主要接口

- `POST /api/auth/login` - 登录
- `GET /api/mold/list` - 模具列表
- `GET /api/mold/detail/:id` - 模具详情
- `POST /api/borrow/borrow` - 借出
- `POST /api/borrow/return/:id` - 归还
- `POST /api/production` - 生产报工
- `POST /api/maintenance` - 创建维修记录
- `POST /api/maintenance/complete/:id` - 完成维修

## Debug 日志

后端已开启 Debug 日志:
- Gin framework debug 输出所有请求路由
- MySQL SQL 语句日志
- Redis 连接日志
- 业务操作日志（登录、借还、报工等）

## 测试验证

### 测试数据
系统已预置测试数据:
- 4套示例模具
- 4个库位
- 3台设备
- 2个用户 (admin/operator01)

### 已验证功能
- ✅ 用户登录认证
- ✅ 模具台账 CRUD
- ✅ 模具借还流程
- ✅ 生产报工与模次累计
- ✅ 模次回退与流水记录
- ✅ 维修保养记录
- ✅ Redis 状态缓存
- ✅ 预警机制
