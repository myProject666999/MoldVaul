import React, { useState, useEffect } from 'react'
import { Table, Space, Button, Input, Select, Tag, Modal, Form, message, DatePicker } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, SearchOutlined, QrcodeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getLocationList, getMachineList, getMoldList } from '../api/mold'
import { getUserList } from '../api/user'
import {
  getBorrowList,
  borrowMold,
  returnMold,
  quickBorrow,
  quickReturn,
} from '../api/business'

const BorrowList = () => {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [filters, setFilters] = useState({ status: 1 })
  const [borrowModal, setBorrowModal] = useState(false)
  const [returnModal, setReturnModal] = useState(false)
  const [quickModal, setQuickModal] = useState(false)
  const [quickType, setQuickType] = useState('borrow')
  const [selectedItem, setSelectedItem] = useState(null)
  const [userList, setUserList] = useState([])
  const [machineList, setMachineList] = useState([])
  const [moldList, setMoldList] = useState([])
  const [form] = Form.useForm()
  const [quickForm] = Form.useForm()
  const [returnForm] = Form.useForm()

  useEffect(() => {
    loadOptions()
  }, [])

  useEffect(() => {
    loadData()
  }, [pagination.current, pagination.pageSize, filters])

  const loadOptions = async () => {
    try {
      const [users, machines, molds] = await Promise.all([
        getUserList({ page: 1, page_size: 100 }),
        getMachineList(),
        getMoldList({ page: 1, page_size: 100, status: 1 }),
      ])
      setUserList(users.list || [])
      setMachineList(machines || [])
      setMoldList(molds.list || [])
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
      const data = await getBorrowList(params)
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

  const handleOpenBorrow = () => {
    form.resetFields()
    setBorrowModal(true)
  }

  const handleOpenReturn = (item) => {
    setSelectedItem(item)
    returnForm.resetFields()
    setReturnModal(true)
  }

  const handleOpenQuick = (type) => {
    setQuickType(type)
    quickForm.resetFields()
    setQuickModal(true)
  }

  const handleBorrow = async () => {
    try {
      const values = await form.validateFields()
      const borrower = userList.find(u => u.id === values.borrower_id)
      const machine = machineList.find(m => m.id === values.machine_id)
      await borrowMold({
        ...values,
        borrower_name: borrower?.real_name || '',
        machine_code: machine?.machine_code || '',
      })
      message.success('借出成功')
      setBorrowModal(false)
      loadData()
      loadOptions()
    } catch (err) {
      console.error('Borrow error:', err)
    }
  }

  const handleReturn = async () => {
    try {
      const values = await returnForm.validateFields()
      await returnMold(selectedItem.id, values)
      message.success('归还成功')
      setReturnModal(false)
      loadData()
      loadOptions()
    } catch (err) {
      console.error('Return error:', err)
    }
  }

  const handleQuick = async () => {
    try {
      const values = await quickForm.validateFields()
      if (quickType === 'borrow') {
        const borrower = userList.find(u => u.id === values.borrower_id)
        await quickBorrow({
          ...values,
          borrower_name: borrower?.real_name || '',
        })
        message.success('借出成功')
      } else {
        await quickReturn(values)
        message.success('归还成功')
      }
      setQuickModal(false)
      loadData()
      loadOptions()
    } catch (err) {
      console.error('Quick error:', err)
    }
  }

  const statusMap = {
    1: { text: '借出中', color: 'blue' },
    2: { text: '已归还', color: 'success' },
  }

  const columns = [
    { title: '流水单号', dataIndex: 'record_no', key: 'record_no', width: 180 },
    { title: '模具编号', dataIndex: 'mold_code', key: 'mold_code', width: 130 },
    { title: '模具名称', dataIndex: 'mold_name', key: 'mold_name' },
    { title: '借用人', dataIndex: 'borrower_name', key: 'borrower_name', width: 100 },
    { title: '使用设备', dataIndex: 'machine_name', key: 'machine_name', width: 120 },
    {
      title: '借出时间',
      dataIndex: 'borrow_time',
      key: 'borrow_time',
      width: 160,
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '归还时间',
      dataIndex: 'return_time',
      key: 'return_time',
      width: 160,
      render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-',
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
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          {r.status === 1 && (
            <Button type="link" size="small" onClick={() => handleOpenReturn(r)}>归还</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">出入库借还</div>
        <Space>
          <Button icon={<QrcodeOutlined />} onClick={() => handleOpenQuick('borrow')}>扫码借出</Button>
          <Button icon={<QrcodeOutlined />} onClick={() => handleOpenQuick('return')}>扫码归还</Button>
          <Button type="primary" icon={<ArrowDownOutlined />} onClick={handleOpenBorrow}>登记借出</Button>
        </Space>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索模具编号/借用人/单号"
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          allowClear
          value={filters.keyword}
          onChange={(e) => handleSearch('keyword', e.target.value)}
        />
        <Select
          placeholder="状态"
          style={{ width: 120 }}
          value={filters.status}
          onChange={(v) => handleSearch('status', v)}
        >
          <Select.Option value={1}>借出中</Select.Option>
          <Select.Option value={2}>已归还</Select.Option>
        </Select>
        <DatePicker
          placeholder="开始日期"
          value={filters.start_time ? dayjs(filters.start_time) : null}
          onChange={(d) => handleSearch('start_time', d ? d.format('YYYY-MM-DD') : '')}
        />
        <DatePicker
          placeholder="结束日期"
          value={filters.end_time ? dayjs(filters.end_time) : null}
          onChange={(d) => handleSearch('end_time', d ? d.format('YYYY-MM-DD') : '')}
        />
        <Button onClick={() => { setFilters({ status: 1 }); setPagination(p => ({ ...p, current: 1 })) }}>重置</Button>
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
        title="登记借出"
        open={borrowModal}
        width={500}
        onOk={handleBorrow}
        onCancel={() => setBorrowModal(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="mold_id" label="选择模具" rules={[{ required: true, message: '请选择' }]}>
            <Select placeholder="请选择在库模具" showSearch optionFilterProp="children">
              {moldList.filter(m => m.status === 1).map(m => (
                <Select.Option key={m.id} value={m.id}>{m.mold_code} - {m.mold_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="borrower_id" label="借用人" rules={[{ required: true, message: '请选择' }]}>
            <Select placeholder="请选择借用人" showSearch optionFilterProp="children">
              {userList.map(u => (
                <Select.Option key={u.id} value={u.id}>{u.real_name} ({u.username})</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="machine_id" label="使用设备">
            <Select placeholder="请选择设备" showSearch optionFilterProp="children">
              {machineList.map(m => (
                <Select.Option key={m.id} value={m.id}>{m.machine_code} - {m.machine_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="borrow_remark" label="借出备注">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="登记归还"
        open={returnModal}
        width={500}
        onOk={handleReturn}
        onCancel={() => setReturnModal(false)}
        destroyOnClose
      >
        {selectedItem && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>模具编号：</strong>{selectedItem.mold_code}</p>
            <p><strong>借用人：</strong>{selectedItem.borrower_name}</p>
            <p><strong>借出时间：</strong>{dayjs(selectedItem.borrow_time).format('YYYY-MM-DD HH:mm')}</p>
          </div>
        )}
        <Form form={returnForm} layout="vertical">
          <Form.Item name="return_remark" label="归还备注">
            <Input.TextArea rows={3} placeholder="归还时的备注，如模具有无损坏等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={quickType === 'borrow' ? '扫码借出' : '扫码归还'}
        open={quickModal}
        width={500}
        onOk={handleQuick}
        onCancel={() => setQuickModal(false)}
        destroyOnClose
      >
        <Form form={quickForm} layout="vertical">
          <Form.Item name="mold_code" label="模具编号" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="扫描或输入模具编号" autoFocus />
          </Form.Item>
          {quickType === 'borrow' && (
            <>
              <Form.Item name="borrower_id" label="借用人" rules={[{ required: true, message: '请选择' }]}>
                <Select placeholder="请选择借用人" showSearch optionFilterProp="children">
                  {userList.map(u => (
                    <Select.Option key={u.id} value={u.id}>{u.real_name} ({u.username})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="machine_code" label="设备编号">
                <Input placeholder="扫描或输入设备编号" />
              </Form.Item>
              <Form.Item name="borrow_remark" label="借出备注">
                <Input.TextArea rows={2} placeholder="备注" />
              </Form.Item>
            </>
          )}
          {quickType === 'return' && (
            <Form.Item name="return_remark" label="归还备注">
              <Input.TextArea rows={2} placeholder="备注" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default BorrowList
