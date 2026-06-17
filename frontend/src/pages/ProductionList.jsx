import React, { useState, useEffect } from 'react'
import { Table, Space, Button, Input, Select, Tag, Modal, Form, InputNumber, message, DatePicker, Popconfirm, Row, Col } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getMoldList, getMachineList } from '../api/mold'
import { getUserList } from '../api/user'
import { getProductionList, createProduction, voidProduction } from '../api/business'

const ProductionList = () => {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [filters, setFilters] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [moldList, setMoldList] = useState([])
  const [machineList, setMachineList] = useState([])
  const [operatorList, setOperatorList] = useState([])
  const [form] = Form.useForm()

  useEffect(() => {
    loadOptions()
  }, [])

  useEffect(() => {
    loadData()
  }, [pagination.current, pagination.pageSize, filters])

  const loadOptions = async () => {
    try {
      const [molds, machines, users] = await Promise.all([
        getMoldList({ page: 1, page_size: 100 }),
        getMachineList(),
        getUserList({ page: 1, page_size: 100 }),
      ])
      setMoldList(molds.list || [])
      setMachineList(machines || [])
      setOperatorList(users.list || [])
    } catch (err) {
      console.error('Load options error:', err)
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
      const data = await getProductionList(params)
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
      production_date: dayjs(),
      shift: '白班',
    })
    setModalVisible(true)
  }

  const handleVoid = async (item) => {
    try {
      await voidProduction(item.id)
      message.success('作废成功')
      loadData()
      loadOptions()
    } catch (err) {
      console.error('Void error:', err)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const operator = operatorList.find(u => u.id === values.operator_id)
      const machine = machineList.find(m => m.id === values.machine_id)
      await createProduction({
        ...values,
        production_date: values.production_date.format('YYYY-MM-DD'),
        operator_name: operator?.real_name || '',
        machine_code: machine?.machine_code || '',
      })
      message.success('报工成功')
      setModalVisible(false)
      loadData()
      loadOptions()
    } catch (err) {
      console.error('Submit error:', err)
    }
  }

  const statusMap = {
    1: { text: '有效', color: 'success' },
    2: { text: '已作废', color: 'default' },
  }

  const columns = [
    { title: '报工单号', dataIndex: 'report_no', key: 'report_no', width: 180 },
    { title: '模具编号', dataIndex: 'mold_code', key: 'mold_code', width: 130 },
    { title: '设备编号', dataIndex: 'machine_code', key: 'machine_code', width: 120 },
    { title: '操作工', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
    { title: '生产日期', dataIndex: 'production_date', key: 'production_date', width: 110 },
    { title: '班次', dataIndex: 'shift', key: 'shift', width: 80 },
    { title: '生产模次', dataIndex: 'cycle_count', key: 'cycle_count', width: 100, render: (v) => v?.toLocaleString() },
    { title: '产品数量', dataIndex: 'product_quantity', key: 'product_quantity', width: 100, render: (v) => v?.toLocaleString() },
    { title: '不良数量', dataIndex: 'defect_quantity', key: 'defect_quantity', width: 100, render: (v) => v?.toLocaleString() },
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
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          {r.status === 1 && (
            <Popconfirm title="确认作废该报工单？作废后模次将回退。" onConfirm={() => handleVoid(r)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>作废</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">生产报工</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增报工</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索单号/模具编号/操作工"
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
          <Select.Option value={1}>有效</Select.Option>
          <Select.Option value={2}>已作废</Select.Option>
        </Select>
        <DatePicker
          placeholder="生产日期"
          value={filters.production_date ? dayjs(filters.production_date) : null}
          onChange={(d) => handleSearch('production_date', d ? d.format('YYYY-MM-DD') : '')}
        />
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
        title="新增生产报工"
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
              <Form.Item name="operator_id" label="操作工" rules={[{ required: true, message: '请选择' }]}>
                <Select placeholder="请选择操作工" showSearch optionFilterProp="children">
                  {operatorList.map(u => (
                    <Select.Option key={u.id} value={u.id}>{u.real_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="machine_id" label="设备">
                <Select placeholder="请选择设备" showSearch optionFilterProp="children">
                  {machineList.map(m => (
                    <Select.Option key={m.id} value={m.id}>{m.machine_code} - {m.machine_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="production_date" label="生产日期" rules={[{ required: true, message: '请选择' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="shift" label="班次">
                <Select placeholder="请选择班次">
                  <Select.Option value="白班">白班</Select.Option>
                  <Select.Option value="夜班">夜班</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="cycle_count" label="生产模次" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="本次生产模次" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="product_quantity" label="产品数量">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="产品总数" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="defect_quantity" label="不良数量">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="不良品数" />
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
    </div>
  )
}

export default ProductionList
