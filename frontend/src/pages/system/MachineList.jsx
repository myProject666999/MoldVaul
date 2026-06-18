import React, { useState, useEffect } from 'react'
import { Table, Space, Button, Input, Select, Tag, Modal, Form, message, Popconfirm, Switch } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getMachineList, createMachine } from '../../api/mold'
import request from '../../utils/request'

const MachineList = () => {
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
      let list = await getMachineList(params)
      list = list || []
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase()
        list = list.filter(m =>
          m.machine_code.toLowerCase().includes(kw) ||
          m.machine_name.toLowerCase().includes(kw) ||
          m.workshop.toLowerCase().includes(kw)
        )
      }
      if (filters.machine_type) {
        list = list.filter(m => m.machine_type === filters.machine_type)
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
      await request.delete(`/machine/${item.id}`)
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
        await request.put(`/machine/${editingItem.id}`, values)
        message.success('更新成功')
      } else {
        await createMachine(values)
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
      await request.put(`/machine/${item.id}`, { status: item.status === 1 ? 0 : 1 })
      message.success('状态更新成功')
      loadData()
    } catch (err) {
      console.error('Toggle status error:', err)
    }
  }

  const columns = [
    { title: '设备编号', dataIndex: 'machine_code', key: 'machine_code', width: 130 },
    { title: '设备名称', dataIndex: 'machine_name', key: 'machine_name', width: 150 },
    { title: '设备类型', dataIndex: 'machine_type', key: 'machine_type', width: 100 },
    { title: '规格型号', dataIndex: 'specification', key: 'specification', width: 150 },
    { title: '所属车间', dataIndex: 'workshop', key: 'workshop', width: 120 },
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
          <Popconfirm title="确认删除该设备？" onConfirm={() => handleDelete(r)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">设备管理</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增设备</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索设备编号/名称/车间"
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
        <Select
          placeholder="设备类型"
          style={{ width: 130 }}
          allowClear
          value={filters.machine_type}
          onChange={(v) => setFilters(prev => ({ ...prev, machine_type: v }))}
        >
          <Select.Option value="注塑机">注塑机</Select.Option>
          <Select.Option value="冲压机">冲压机</Select.Option>
          <Select.Option value="压铸机">压铸机</Select.Option>
        </Select>
        <Button onClick={() => setFilters({})}>重置</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={editingItem ? '编辑设备' : '新增设备'}
        open={modalVisible}
        width={500}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="machine_code" label="设备编号" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如: M-001" />
          </Form.Item>
          <Form.Item name="machine_name" label="设备名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="设备名称" />
          </Form.Item>
          <Space style={{ width: '100%' }} wrap>
            <Form.Item name="machine_type" label="设备类型" style={{ flex: 1, minWidth: 140 }}>
              <Select placeholder="请选择">
                <Select.Option value="注塑机">注塑机</Select.Option>
                <Select.Option value="冲压机">冲压机</Select.Option>
                <Select.Option value="压铸机">压铸机</Select.Option>
                <Select.Option value="其他">其他</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="workshop" label="所属车间" style={{ flex: 1, minWidth: 140 }}>
              <Input placeholder="如: 注塑车间" />
            </Form.Item>
          </Space>
          <Form.Item name="specification" label="规格型号">
            <Input placeholder="规格型号, 如: 200T" />
          </Form.Item>
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

export default MachineList
