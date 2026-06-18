import React, { useState, useEffect } from 'react'
import { Table, Space, Button, Input, Select, Tag, Modal, Form, message, Popconfirm, Switch } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getLocationList, createLocation } from '../../api/mold'
import request from '../../utils/request'

const LocationList = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status !== undefined && filters.status !== '') {
        params.status = filters.status
      }
      let list = await getLocationList(params)
      list = list || []
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase()
        list = list.filter(l =>
          l.location_code.toLowerCase().includes(kw) ||
          l.location_name.toLowerCase().includes(kw) ||
          l.area.toLowerCase().includes(kw)
        )
      }
      setData(list)
    } catch (err) {
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ status: 1 })
    setModalVisible(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    form.setFieldsValue(item)
    setModalVisible(true)
  }

  const handleDelete = async (item) => {
    try {
      await request.delete(`/location/${item.id}`)
      message.success('删除成功')
      loadData()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingItem) {
        await request.put(`/location/${editingItem.id}`, values)
        message.success('更新成功')
      } else {
        await createLocation(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadData()
    } catch (err) {
      console.error('Submit error:', err)
    }
  }

  const handleToggleStatus = async (item) => {
    try {
      await request.put(`/location/${item.id}`, { status: item.status === 1 ? 0 : 1 })
      message.success('状态更新成功')
      loadData()
    } catch (err) {
      console.error('Toggle status error:', err)
    }
  }

  const columns = [
    { title: '库位编码', dataIndex: 'location_code', key: 'location_code', width: 150 },
    { title: '库位名称', dataIndex: 'location_name', key: 'location_name', width: 180 },
    { title: '区域', dataIndex: 'area', key: 'area', width: 100 },
    { title: '货架', dataIndex: 'shelf', key: 'shelf', width: 120 },
    { title: '层数', dataIndex: 'layer', key: 'layer', width: 80 },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s, r) => (
        <Switch checked={s === 1} checkedChildren="启用" unCheckedChildren="禁用" onChange={() => handleToggleStatus(r)} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该库位？" onConfirm={() => handleDelete(r)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">库位管理</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增库位</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索库位编码/名称/区域"
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          allowClear
          value={filters.keyword}
          onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
        />
        <Select
          placeholder="状态"
          style={{ width: 120 }}
          allowClear
          value={filters.status}
          onChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
        >
          <Select.Option value={1}>启用</Select.Option>
          <Select.Option value={0}>停用</Select.Option>
        </Select>
        <Button onClick={() => setFilters({})}>重置</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={editingItem ? '编辑库位' : '新增库位'}
        open={modalVisible}
        width={500}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="location_code" label="库位编码" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如: LOC-A-01-01" />
          </Form.Item>
          <Form.Item name="location_name" label="库位名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="库位名称" />
          </Form.Item>
          <Space style={{ width: '100%' }} wrap>
            <Form.Item name="area" label="区域" style={{ flex: 1, minWidth: 120 }}>
              <Input placeholder="如: A区" />
            </Form.Item>
            <Form.Item name="shelf" label="货架" style={{ flex: 1, minWidth: 120 }}>
              <Input placeholder="如: 1号货架" />
            </Form.Item>
            <Form.Item name="layer" label="层数" style={{ flex: 1, minWidth: 120 }}>
              <Input type="number" min={0} placeholder="层数" />
            </Form.Item>
          </Space>
          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default LocationList
