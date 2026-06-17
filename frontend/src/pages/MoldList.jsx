import React, { useState, useEffect } from 'react'
import { Table, Space, Button, Input, Select, Tag, Modal, Form, InputNumber, message, Popconfirm, DatePicker, Descriptions, Row, Col } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, BarcodeOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { getMoldList, getMoldDetail, createMold, updateMold, deleteMold, getLocationList, getCycleLogs } from '../api/mold'

const MoldList = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [filters, setFilters] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [cycleLogVisible, setCycleLogVisible] = useState(false)
  const [cycleLogs, setCycleLogs] = useState([])
  const [locationList, setLocationList] = useState([])
  const [form] = Form.useForm()

  useEffect(() => {
    loadLocations()
    const keyword = searchParams.get('keyword')
    const isWarning = searchParams.get('is_warning')
    if (keyword || isWarning) {
      setFilters(prev => ({
        ...prev,
        keyword: keyword || '',
        is_warning: isWarning ? parseInt(isWarning) : undefined,
      }))
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [pagination.current, pagination.pageSize, filters])

  const loadLocations = async () => {
    try {
      const data = await getLocationList()
      setLocationList(data || [])
    } catch (err) {
      console.error('Load locations error:', err)
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
      const data = await getMoldList(params)
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
    setEditingItem(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    form.setFieldsValue({
      ...item,
      purchase_date: item.purchase_date ? dayjs(item.purchase_date) : null,
    })
    setModalVisible(true)
  }

  const handleDelete = async (item) => {
    try {
      await deleteMold(item.id)
      message.success('删除成功')
      loadData()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleDetail = async (item) => {
    try {
      const data = await getMoldDetail(item.id)
      setDetailData(data)
      setDetailVisible(true)
    } catch (err) {
      console.error('Detail error:', err)
    }
  }

  const handleViewCycles = async (item) => {
    try {
      const data = await getCycleLogs(item.id, { page: 1, page_size: 20 })
      setCycleLogs(data.list || [])
      setCycleLogVisible(true)
    } catch (err) {
      console.error('Cycle logs error:', err)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      values.purchase_date = values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : ''
      if (editingItem) {
        await updateMold(editingItem.id, values)
        message.success('更新成功')
      } else {
        await createMold(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadData()
    } catch (err) {
      console.error('Submit error:', err)
    }
  }

  const statusMap = {
    1: { text: '在库', color: 'success' },
    2: { text: '借出', color: 'blue' },
    3: { text: '维修中', color: 'warning' },
    4: { text: '报废', color: 'error' },
  }

  const columns = [
    { title: '模具编号', dataIndex: 'mold_code', key: 'mold_code', width: 130 },
    { title: '模具名称', dataIndex: 'mold_name', key: 'mold_name', width: 150 },
    { title: '产品名称', dataIndex: 'product_name', key: 'product_name' },
    { title: '模具类型', dataIndex: 'mold_type', key: 'mold_type', width: 100 },
    { title: '存放库位', dataIndex: 'location_name', key: 'location_name', width: 130 },
    {
      title: '累计模次',
      dataIndex: 'total_cycles',
      key: 'total_cycles',
      width: 110,
      render: (t, r) => (
        <Space>
          <span>{t?.toLocaleString()}</span>
          {r.is_warning === 1 && (
            <Tag color={r.warning_type === 'scrap' ? 'red' : 'orange'}>
              {r.warning_type === 'scrap' ? '报废预警' : '保养预警'}
            </Tag>
          )}
        </Space>
      ),
    },
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
          <Button type="link" size="small" icon={<BarcodeOutlined />} onClick={() => handleViewCycles(r)}>模次</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该模具？" onConfirm={() => handleDelete(r)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const cycleLogColumns = [
    {
      title: '变更类型',
      dataIndex: 'change_type',
      key: 'change_type',
      render: (t) => {
        const map = { 1: '生产报工', 2: '维修保养', 3: '手工调整' }
        return map[t] || t
      },
    },
    {
      title: '变更模次',
      dataIndex: 'change_cycles',
      key: 'change_cycles',
      render: (v) => (v > 0 ? `+${v}` : v),
    },
    { title: '变更前', dataIndex: 'before_cycles', key: 'before_cycles' },
    { title: '变更后', dataIndex: 'after_cycles', key: 'after_cycles' },
    { title: '操作人', dataIndex: 'operator_name', key: 'operator_name' },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">模具台账</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增模具</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索模具编号/名称/产品"
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          allowClear
          value={filters.keyword}
          onChange={(e) => handleSearch('keyword', e.target.value)}
        />
        <Select
          placeholder="状态"
          style={{ width: 120 }}
          allowClear
          value={filters.status}
          onChange={(v) => handleSearch('status', v)}
        >
          <Select.Option value={1}>在库</Select.Option>
          <Select.Option value={2}>借出</Select.Option>
          <Select.Option value={3}>维修中</Select.Option>
          <Select.Option value={4}>报废</Select.Option>
        </Select>
        <Select
          placeholder="预警"
          style={{ width: 120 }}
          allowClear
          value={filters.is_warning}
          onChange={(v) => handleSearch('is_warning', v)}
        >
          <Select.Option value={1}>有预警</Select.Option>
          <Select.Option value={0}>无预警</Select.Option>
        </Select>
        <Select
          placeholder="库位"
          style={{ width: 150 }}
          allowClear
          value={filters.location_id}
          onChange={(v) => handleSearch('location_id', v)}
        >
          {locationList.map(loc => (
            <Select.Option key={loc.id} value={loc.id}>{loc.location_name}</Select.Option>
          ))}
        </Select>
        <Button onClick={() => { setFilters({}); setPagination(p => ({ ...p, current: 1 })) }}>重置</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
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
        title={editingItem ? '编辑模具' : '新增模具'}
        open={modalVisible}
        width={600}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="mold_code" label="模具编号" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="模具唯一编号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="mold_name" label="模具名称" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="模具名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="product_name" label="产品名称">
                <Input placeholder="对应产品名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="product_code" label="产品编码">
                <Input placeholder="产品编码" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="mold_type" label="模具类型">
                <Select placeholder="请选择">
                  <Select.Option value="注塑模">注塑模</Select.Option>
                  <Select.Option value="冲压模">冲压模</Select.Option>
                  <Select.Option value="压铸模">压铸模</Select.Option>
                  <Select.Option value="工装夹具">工装夹具</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="cavity_count" label="型腔数" initialValue={1}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="location_id" label="存放库位">
                <Select placeholder="请选择库位">
                  {locationList.map(loc => (
                    <Select.Option key={loc.id} value={loc.id}>{loc.location_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="maintenance_cycles" label="保养模次" initialValue={100000}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="scrap_cycles" label="报废模次" initialValue={500000}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="purchase_date" label="购置日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="purchase_price" label="购置价格">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="manufacturer" label="制造商">
                <Input placeholder="制造商" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={3} placeholder="备注信息" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="模具详情"
        open={detailVisible}
        width={600}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        destroyOnClose
      >
        {detailData && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="模具编号">{detailData.mold_code}</Descriptions.Item>
            <Descriptions.Item label="模具名称">{detailData.mold_name}</Descriptions.Item>
            <Descriptions.Item label="产品名称">{detailData.product_name}</Descriptions.Item>
            <Descriptions.Item label="产品编码">{detailData.product_code}</Descriptions.Item>
            <Descriptions.Item label="模具类型">{detailData.mold_type}</Descriptions.Item>
            <Descriptions.Item label="型腔数">{detailData.cavity_count}</Descriptions.Item>
            <Descriptions.Item label="存放库位">{detailData.location_name}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[detailData.status]?.color}>{statusMap[detailData.status]?.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="累计模次">{detailData.total_cycles?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="保养模次">{detailData.maintenance_cycles?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="报废模次">{detailData.scrap_cycles?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="购置价格">¥{detailData.purchase_price?.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="购置日期">{detailData.purchase_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="制造商">{detailData.manufacturer}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{detailData.remark}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="模次流水"
        open={cycleLogVisible}
        width={900}
        onCancel={() => setCycleLogVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Table
          columns={cycleLogColumns}
          dataSource={cycleLogs}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Modal>
    </div>
  )
}

export default MoldList
