import React, { useState, useEffect } from 'react'
import { Table, Space, Button, Input, Select, Tag, Modal, Form, InputNumber, message, DatePicker, Popconfirm, Row, Col, Descriptions, Card } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getMoldList } from '../api/mold'
import { getUserList } from '../api/user'
import {
  getMaintenanceList,
  getMaintenanceStats,
  createMaintenance,
  completeMaintenance,
  deleteMaintenance,
  getMoldMaintenanceList,
} from '../api/business'

const MaintenanceList = () => {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [filters, setFilters] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [completeModal, setCompleteModal] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [moldList, setMoldList] = useState([])
  const [userList, setUserList] = useState([])
  const [form] = Form.useForm()
  const [completeForm] = Form.useForm()

  useEffect(() => {
    loadOptions()
    loadStats()
  }, [])

  useEffect(() => {
    loadData()
  }, [pagination.current, pagination.pageSize, filters])

  const loadOptions = async () => {
    try {
      const [molds, users] = await Promise.all([
        getMoldList({ page: 1, page_size: 100 }),
        getUserList({ page: 1, page_size: 100 }),
      ])
      setMoldList(molds.list || [])
      setUserList(users.list || [])
    } catch (err) {
      console.error('Load options error:', err)
    }
  }

  const loadStats = async () => {
    try {
      const data = await getMaintenanceStats()
      setStats(data || {})
    } catch (err) {
      console.error('Load stats error:', err)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        ...filters,
      }
      const data = await getMaintenanceList(params)
      setData(data.list || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const handleCreate = () => {
    form.resetFields()
    form.setFieldsValue({
      maintenance_type: 1,
      maintenance_date: dayjs(),
    })
    setModalVisible(true)
  }

  const handleComplete = (item) => {
    setSelectedItem(item)
    completeForm.resetFields()
    completeForm.setFieldsValue({
      maintenance_content: item.maintenance_content,
      parts_cost: item.parts_cost,
      labor_cost: item.labor_cost,
      maintainer: item.maintainer,
    })
    setCompleteModal(true)
  }

  const handleDetail = async (item) => {
    try {
      const [detail, history] = await Promise.all([
        getMaintenanceList({ mold_id: item.mold_id, page: 1, page_size: 1 }),
        getMoldMaintenanceList(item.mold_id, { page: 1, page_size: 50 }),
      ])
      setDetailData({
        ...detail.list?.[0] || item,
        history: history.list || [],
      })
      setDetailVisible(true)
    } catch (err) {
      console.error('Detail error:', err)
    }
  }

  const handleDelete = async (item) => {
    try {
      await deleteMaintenance(item.id)
      message.success('删除成功')
      loadData()
      loadStats()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const maintainer = userList.find(u => u.id === values.maintainer_id)
      await createMaintenance({
        ...values,
        maintenance_date: values.maintenance_date.format('YYYY-MM-DD'),
        maintainer: maintainer?.real_name || '',
      })
      message.success('创建成功')
      setModalVisible(false)
      loadData()
      loadStats()
      loadOptions()
    } catch (err) {
      console.error('Submit error:', err)
    }
  }

  const handleCompleteSubmit = async () => {
    try {
      const values = await completeForm.validateFields()
      await completeMaintenance(selectedItem.id, {
        ...values,
        total_cost: (values.parts_cost || 0) + (values.labor_cost || 0),
      })
      message.success('完成成功，模具已入库')
      setCompleteModal(false)
      loadData()
      loadStats()
      loadOptions()
    } catch (err) {
      console.error('Complete error:', err)
    }
  }

  const typeMap = {
    1: { text: '保养', color: 'blue' },
    2: { text: '维修', color: 'orange' },
    3: { text: '大修', color: 'red' },
  }

  const statusMap = {
    1: { text: '维修中', color: 'processing' },
    2: { text: '已完成', color: 'success' },
  }

  const columns = [
    { title: '维修单号', dataIndex: 'record_no', key: 'record_no', width: 180 },
    { title: '模具编号', dataIndex: 'mold_code', key: 'mold_code', width: 130 },
    { title: '模具名称', dataIndex: 'mold_name', key: 'mold_name' },
    {
      title: '类型',
      dataIndex: 'maintenance_type',
      key: 'maintenance_type',
      width: 100,
      render: (t) => {
        const tp = typeMap[t] || { text: '未知', color: 'default' }
        return <Tag color={tp.color}>{tp.text}</Tag>
      },
    },
    { title: '维修日期', dataIndex: 'maintenance_date', key: 'maintenance_date', width: 110 },
    { title: '维修时模次', dataIndex: 'maintenance_cycle', key: 'maintenance_cycle', width: 110, render: (v) => v?.toLocaleString() },
    { title: '总费用', dataIndex: 'total_cost', key: 'total_cost', width: 100, render: (v) => `¥${v?.toFixed(2)}` },
    { title: '维修人员', dataIndex: 'maintainer', key: 'maintainer', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => {
        const st = statusMap[s] || { text: '未知', color: 'default' }
        return <Tag color={st.color}>{st.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleDetail(r)}>详情</Button>
          {r.status === 1 && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleComplete(r)}>完成</Button>
          )}
          <Popconfirm title="确认删除该记录？" onConfirm={() => handleDelete(r)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">维修保养管理</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增记录</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" className="stat-card">
            <div className="stat-number">{stats.total_records || 0}</div>
            <div className="stat-label">总记录数</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="stat-card warning-stat">
            <div className="stat-number">{stats.repairing_count || 0}</div>
            <div className="stat-label">维修中</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="stat-card">
            <div className="stat-number">¥{Number(stats.total_cost || 0).toFixed(0)}</div>
            <div className="stat-label">累计费用</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="stat-card">
            <div className="stat-number">¥{Number(stats.month_cost || 0).toFixed(0)}</div>
            <div className="stat-label">本月费用</div>
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索单号/模具编号/维修人员"
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          allowClear
          value={filters.keyword}
          onChange={(e) => handleSearch('keyword', e.target.value)}
        />
        <Select
          placeholder="类型"
          style={{ width: 120 }}
          allowClear
          value={filters.maintenance_type}
          onChange={(v) => handleSearch('maintenance_type', v)}
        >
          <Select.Option value={1}>保养</Select.Option>
          <Select.Option value={2}>维修</Select.Option>
          <Select.Option value={3}>大修</Select.Option>
        </Select>
        <Select
          placeholder="状态"
          style={{ width: 120 }}
          allowClear
          value={filters.status}
          onChange={(v) => handleSearch('status', v)}
        >
          <Select.Option value={1}>维修中</Select.Option>
          <Select.Option value={2}>已完成</Select.Option>
        </Select>
        <DatePicker
          placeholder="开始日期"
          value={filters.start_date ? dayjs(filters.start_date) : null}
          onChange={(d) => handleSearch('start_date', d ? d.format('YYYY-MM-DD') : '')}
        />
        <DatePicker
          placeholder="结束日期"
          value={filters.end_date ? dayjs(filters.end_date) : null}
          onChange={(d) => handleSearch('end_date', d ? d.format('YYYY-MM-DD') : '')}
        />
        <Button onClick={() => { setFilters({}); setPagination(p => ({ ...p, current: 1 })) }}>重置</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          ...pagination,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (current, pageSize) => setPagination({ current, pageSize }),
        }}
      />

      <Modal
        title="新增维修保养"
        open={modalVisible}
        width={600}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="mold_id" label="模具" rules={[{ required: true, message: '请选择' }]}>
                <Select placeholder="请选择模具" showSearch optionFilterProp="children">
                  {moldList.map(m => (
                    <Select.Option key={m.id} value={m.id}>{m.mold_code} - {m.mold_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="maintenance_type" label="类型" rules={[{ required: true, message: '请选择' }]}>
                <Select placeholder="请选择类型">
                  <Select.Option value={1}>保养</Select.Option>
                  <Select.Option value={2}>维修</Select.Option>
                  <Select.Option value={3}>大修</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="maintenance_date" label="维修日期" rules={[{ required: true, message: '请选择' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="maintainer_id" label="维修人员">
                <Select placeholder="请选择维修人员" showSearch optionFilterProp="children">
                  {userList.map(u => (
                    <Select.Option key={u.id} value={u.id}>{u.real_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="parts_cost" label="零件费用">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="labor_cost" label="人工费用">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="fault_description" label="故障描述">
                <Input.TextArea rows={2} placeholder="故障描述" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="maintenance_content" label="维修内容">
                <Input.TextArea rows={3} placeholder="维修内容" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} placeholder="备注信息" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="完成维修"
        open={completeModal}
        width={600}
        onOk={handleCompleteSubmit}
        onCancel={() => setCompleteModal(false)}
        destroyOnClose
      >
        {selectedItem && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>模具编号：</strong>{selectedItem.mold_code}</p>
            <p><strong>维修类型：</strong>{typeMap[selectedItem.maintenance_type]?.text}</p>
            <p><strong>当前模次：</strong>{selectedItem.maintenance_cycle?.toLocaleString()}</p>
          </div>
        )}
        <Form form={completeForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="parts_cost" label="零件费用">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="labor_cost" label="人工费用">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="maintainer" label="维修人员">
                <Input placeholder="实际维修人员" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="maintenance_content" label="维修内容">
                <Input.TextArea rows={3} placeholder="详细维修内容" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} placeholder="备注" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="维修详情"
        open={detailVisible}
        width={800}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        destroyOnClose
      >
        {detailData && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="维修单号">{detailData.record_no}</Descriptions.Item>
              <Descriptions.Item label="模具编号">{detailData.mold_code}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color={typeMap[detailData.maintenance_type]?.color}>
                  {typeMap[detailData.maintenance_type]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[detailData.status]?.color}>
                  {statusMap[detailData.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="维修日期">{detailData.maintenance_date}</Descriptions.Item>
              <Descriptions.Item label="维修时模次">{detailData.maintenance_cycle?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="总费用">¥{detailData.total_cost?.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="维修人员">{detailData.maintainer}</Descriptions.Item>
              <Descriptions.Item label="故障描述" span={2}>{detailData.fault_description}</Descriptions.Item>
              <Descriptions.Item label="维修内容" span={2}>{detailData.maintenance_content}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detailData.remark}</Descriptions.Item>
            </Descriptions>
            <h4 style={{ marginBottom: 12 }}>历史维修记录</h4>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              columns={[
                { title: '单号', dataIndex: 'record_no', width: 150 },
                {
                  title: '类型',
                  dataIndex: 'maintenance_type',
                  width: 80,
                  render: (t) => typeMap[t]?.text,
                },
                { title: '日期', dataIndex: 'maintenance_date', width: 100 },
                { title: '模次', dataIndex: 'maintenance_cycle', render: (v) => v?.toLocaleString() },
                { title: '费用', dataIndex: 'total_cost', render: (v) => `¥${v?.toFixed(2)}` },
                { title: '维修人员', dataIndex: 'maintainer', width: 100 },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 80,
                  render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
                },
              ]}
              dataSource={detailData.history}
            />
          </>
        )}
      </Modal>
    </div>
  )
}

export default MaintenanceList
