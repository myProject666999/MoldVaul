-- ============================================
-- 模具工装管理柜系统 数据库脚本
-- ============================================

CREATE DATABASE IF NOT EXISTS mold_vaul DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mold_vaul;

-- ============================================
-- 1. 用户表
-- ============================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(加密)',
  `real_name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '真实姓名',
  `phone` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '手机号',
  `role` TINYINT NOT NULL DEFAULT 2 COMMENT '角色: 1-管理员 2-普通用户',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 2. 库位表
-- ============================================
DROP TABLE IF EXISTS `locations`;
CREATE TABLE `locations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `location_code` VARCHAR(50) NOT NULL COMMENT '库位编码',
  `location_name` VARCHAR(100) NOT NULL COMMENT '库位名称',
  `area` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '区域',
  `shelf` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '货架',
  `layer` INT NOT NULL DEFAULT 0 COMMENT '层数',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-停用 1-启用',
  `remark` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location_code` (`location_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库位表';

-- ============================================
-- 3. 设备表
-- ============================================
DROP TABLE IF EXISTS `machines`;
CREATE TABLE `machines` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `machine_code` VARCHAR(50) NOT NULL COMMENT '设备编号',
  `machine_name` VARCHAR(100) NOT NULL COMMENT '设备名称',
  `machine_type` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '设备类型: 注塑机/冲压机等',
  `specification` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '规格型号',
  `workshop` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '车间',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-停用 1-启用',
  `remark` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_machine_code` (`machine_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备表';

-- ============================================
-- 4. 模具表
-- ============================================
DROP TABLE IF EXISTS `molds`;
CREATE TABLE `molds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `mold_code` VARCHAR(50) NOT NULL COMMENT '模具编号',
  `mold_name` VARCHAR(100) NOT NULL COMMENT '模具名称',
  `product_name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '对应产品名称',
  `product_code` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '产品编码',
  `mold_type` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '模具类型: 注塑模/冲压模等',
  `cavity_count` INT NOT NULL DEFAULT 1 COMMENT '型腔数',
  `location_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '存放库位ID',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-在库 2-借出 3-维修中 4-报废',
  `total_cycles` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '累计模次',
  `maintenance_cycles` INT UNSIGNED NOT NULL DEFAULT 100000 COMMENT '保养模次阈值',
  `scrap_cycles` INT UNSIGNED NOT NULL DEFAULT 500000 COMMENT '报废模次阈值',
  `last_maintenance_cycle` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '上次保养时模次',
  `last_maintenance_date` DATE DEFAULT NULL COMMENT '上次保养日期',
  `manufacturer` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '制造商',
  `purchase_date` DATE DEFAULT NULL COMMENT '购置日期',
  `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '购置价格',
  `is_warning` TINYINT NOT NULL DEFAULT 0 COMMENT '是否预警: 0-否 1-是',
  `warning_type` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '预警类型: maintenance/scrap',
  `remark` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mold_code` (`mold_code`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_status` (`status`),
  KEY `idx_is_warning` (`is_warning`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模具表';

-- ============================================
-- 5. 借还记录表
-- ============================================
DROP TABLE IF EXISTS `borrow_records`;
CREATE TABLE `borrow_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `record_no` VARCHAR(50) NOT NULL COMMENT '流水单号',
  `mold_id` BIGINT UNSIGNED NOT NULL COMMENT '模具ID',
  `mold_code` VARCHAR(50) NOT NULL COMMENT '模具编号',
  `borrower_id` BIGINT UNSIGNED NOT NULL COMMENT '借用人ID',
  `borrower_name` VARCHAR(50) NOT NULL COMMENT '借用人姓名',
  `machine_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '使用设备ID',
  `machine_code` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '设备编号',
  `borrow_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '借出时间',
  `return_time` DATETIME DEFAULT NULL COMMENT '归还时间',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-借出中 2-已归还',
  `borrow_remark` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '借出备注',
  `return_remark` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '归还备注',
  `operator_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '操作人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_mold_id` (`mold_id`),
  KEY `idx_borrower_id` (`borrower_id`),
  KEY `idx_status` (`status`),
  KEY `idx_borrow_time` (`borrow_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='借还记录表';

-- ============================================
-- 6. 生产报工表
-- ============================================
DROP TABLE IF EXISTS `production_reports`;
CREATE TABLE `production_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `report_no` VARCHAR(50) NOT NULL COMMENT '报工单号',
  `mold_id` BIGINT UNSIGNED NOT NULL COMMENT '模具ID',
  `mold_code` VARCHAR(50) NOT NULL COMMENT '模具编号',
  `machine_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '设备ID',
  `machine_code` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '设备编号',
  `operator_id` BIGINT UNSIGNED NOT NULL COMMENT '操作工ID',
  `operator_name` VARCHAR(50) NOT NULL COMMENT '操作工姓名',
  `production_date` DATE NOT NULL COMMENT '生产日期',
  `shift` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '班次: 白班/夜班',
  `cycle_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '本次生产模次',
  `product_quantity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '产品数量',
  `defect_quantity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '不良数量',
  `start_time` DATETIME DEFAULT NULL COMMENT '开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-有效 2-作废',
  `remark` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_no` (`report_no`),
  KEY `idx_mold_id` (`mold_id`),
  KEY `idx_production_date` (`production_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产报工表';

-- ============================================
-- 7. 维修保养记录表
-- ============================================
DROP TABLE IF EXISTS `maintenance_records`;
CREATE TABLE `maintenance_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `record_no` VARCHAR(50) NOT NULL COMMENT '维修单号',
  `mold_id` BIGINT UNSIGNED NOT NULL COMMENT '模具ID',
  `mold_code` VARCHAR(50) NOT NULL COMMENT '模具编号',
  `maintenance_type` TINYINT NOT NULL DEFAULT 1 COMMENT '类型: 1-保养 2-维修 3-大修',
  `maintenance_date` DATE NOT NULL COMMENT '维修日期',
  `maintenance_cycle` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '维修时模次',
  `fault_description` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '故障描述',
  `maintenance_content` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '维修内容',
  `parts_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '零件费用',
  `labor_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '人工费用',
  `total_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '总费用',
  `maintainer` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '维修人员',
  `maintainer_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '维修人ID',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-维修中 2-已完成',
  `remark` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_mold_id` (`mold_id`),
  KEY `idx_maintenance_date` (`maintenance_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='维修保养记录表';

-- ============================================
-- 8. 模次流水表 (用于审计和对账)
-- ============================================
DROP TABLE IF EXISTS `cycle_logs`;
CREATE TABLE `cycle_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `mold_id` BIGINT UNSIGNED NOT NULL COMMENT '模具ID',
  `mold_code` VARCHAR(50) NOT NULL COMMENT '模具编号',
  `change_type` TINYINT NOT NULL COMMENT '变更类型: 1-生产报工增加 2-维修归零 3-手工调整',
  `change_cycles` BIGINT NOT NULL COMMENT '变更模次(正增加负减少)',
  `before_cycles` BIGINT UNSIGNED NOT NULL COMMENT '变更前模次',
  `after_cycles` BIGINT UNSIGNED NOT NULL COMMENT '变更后模次',
  `related_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '关联业务ID',
  `related_type` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '关联业务类型',
  `operator_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '操作人ID',
  `operator_name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '操作人姓名',
  `remark` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_mold_id` (`mold_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模次流水表';

-- ============================================
-- 初始化数据
-- ============================================

-- 默认管理员 (密码: 123456)
INSERT INTO `users` (`username`, `password`, `real_name`, `phone`, `role`, `status`) VALUES
('admin', '$2a$10$yshMT/ztjiF.Z.fM0wj0hu/acmfBJD5THIRBbLuf1TM4QQIxz8YxW', '系统管理员', '13800000000', 1, 1),
('operator01', '$2a$10$yshMT/ztjiF.Z.fM0wj0hu/acmfBJD5THIRBbLuf1TM4QQIxz8YxW', '张三', '13800000001', 2, 1);

-- 示例库位
INSERT INTO `locations` (`location_code`, `location_name`, `area`, `shelf`, `layer`, `status`) VALUES
('LOC-A-01-01', 'A区1号货架1层', 'A区', '1号货架', 1, 1),
('LOC-A-01-02', 'A区1号货架2层', 'A区', '1号货架', 2, 1),
('LOC-A-02-01', 'A区2号货架1层', 'A区', '2号货架', 1, 1),
('LOC-B-01-01', 'B区1号货架1层', 'B区', '1号货架', 1, 1);

-- 示例设备
INSERT INTO `machines` (`machine_code`, `machine_name`, `machine_type`, `specification`, `workshop`, `status`) VALUES
('M-001', '注塑机001', '注塑机', '200T', '注塑车间', 1),
('M-002', '注塑机002', '注塑机', '300T', '注塑车间', 1),
('M-003', '冲压机001', '冲压机', '160T', '冲压车间', 1);

-- 示例模具
INSERT INTO `molds` (`mold_code`, `mold_name`, `product_name`, `product_code`, `mold_type`, `cavity_count`, `location_id`, `status`, `total_cycles`, `maintenance_cycles`, `scrap_cycles`, `manufacturer`, `remark`) VALUES
('MOLD-0001', '手机壳上盖模', '手机壳上盖', 'PROD-001', '注塑模', 4, 1, 1, 0, 100000, 500000, '精密模具有限公司', '新品模具'),
('MOLD-0002', '手机壳下盖模', '手机壳下盖', 'PROD-002', '注塑模', 4, 2, 1, 50000, 100000, 500000, '精密模具有限公司', '已投产'),
('MOLD-0003', '连接器端子模', '连接器端子', 'PROD-003', '冲压模', 8, 3, 1, 120000, 80000, 400000, '精工模具厂', '已到保养周期'),
('MOLD-0004', '外壳模具', '外壳', 'PROD-004', '注塑模', 2, 4, 3, 450000, 100000, 500000, '恒信模具', '接近报废');
