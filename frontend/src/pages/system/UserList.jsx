import React, { useState, useEffect } from 'react'
import { Table, Space, Button, Input, Select, Tag, Modal, Form, InputNumber, message, Popconfirm, Switch, Space as AntdSpace } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons'
import { getUserList, createUser, updateUser, deleteUser, resetPassword } from '../../api/user'

const UserList = () => {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [filters, setFilters] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [passwordModal, setPasswordModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [pwdUserId, setPwdUserId] = useState(null)
  const [form] = Form.useForm()
  const [pwdForm] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [pagination.current, pagination.pageSize, filters])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = { page: pagination.current, page_size: pagination.pageSize, ...filters }
      const data = await getUserList(params)
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
    form.setFieldsValue({ role: 2, status: 1 })
    setModalVisible(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    form.setFieldsValue(item)
    setModalVisible(true)
  }

  const handleDelete = async (item) => {
    try {
      await deleteUser(item.id)
      message.success('删除成功')
      loadData()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleChangePwd = (item) => {
    setPwdUserId(item.id)
    pwdForm.resetFields()
    setPasswordModal(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingItem) {
        await updateUser(editingItem.id, values)
        message.success('更新成功')
      } else {
        await createUser(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadData()
    } catch (err) {
      console.error('Submit error:', err)
    }
  }

  const handlePwdSubmit = async () => {
    try {
      const values = await pwdForm.validateFields()
      if (values.new_password !== values.confirm_password) {
        message.error('两次密码不一致')
        return
      }
      if (pwdUserId) {
        await resetPassword(pwdUserId, values.new_password)
        message.success('密码修改成功')
        setPasswordModal(false)
      }
    } catch (err) {
      console.error('Password change error:', err)
    }
  }

  const handleToggleStatus = async (item) => {
    try {
      await updateUser(item.id, { status: item.status === 1 ? 0 : 1 })
      message.success('状态更新成功')
      loadData()
    } catch (err) {
      console.error('Toggle status error:', err)
    }
  }

  const roleMap = { 1: { text: '管理员', color: 'red' }, 2: { text: '普通用户', color: 'blue' } }

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
    { title: '真实姓名', dataIndex: 'real_name', key: 'real_name', width: 120 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (r) => {
        const rm = roleMap[r] || { text: '未知', color: 'default' }
        return <Tag color={rm.color}>{rm.text}</Tag>
      },
    },
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (t) => t?.replace('T', ' ')?.slice(0, 19),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => handleChangePwd(r)}>改密</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          {r.username !== 'admin' && (
            <Popconfirm title="确认删除该用户？" onConfirm={() => handleDelete(r)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">用户管理</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增用户</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索用户名/姓名/手机号"
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          allowClear
          value={filters.keyword}
          onChange={(e) => handleSearch('keyword', e.target.value)}
        />
        <Select
          placeholder="角色"
          style={{ width: 120 }}
          allowClear
          value={filters.role}
          onChange={(v) => handleSearch('role', v)}
        >
          <Select.Option value={1}>管理员</Select.Option>
          <Select.Option value={2}>普通用户</Select.Option>
        </Select>
        <Select
          placeholder="状态"
          style={{ width: 120 }}
          allowClear
          value={filters.status}
          onChange={(v) => handleSearch('status', v)}
        >
          <Select.Option value={1}>启用</Select.Option>
          <Select.Option value={0}>禁用</Select.Option>
        </Select>
        <Button onClick={() => { setFilters({}); setPagination(p => ({ ...p, current: 1 })) }}>重置</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
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
        title={editingItem ? '编辑用户' : '新增用户'}
        open={modalVisible}
        width={500}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editingItem && (
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入' }]}>
              <Input placeholder="登录用户名" />
            </Form.Item>
          )}
          {!editingItem && (
            <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入' }]}>
              <Input.Password placeholder="初始密码" />
            </Form.Item>
          )}
          <Form.Item name="real_name" label="真实姓名">
            <Input placeholder="真实姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="手机号" />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select>
              <Select.Option value={1}>管理员</Select.Option>
              <Select.Option value={2}>普通用户</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="修改密码"
        open={passwordModal}
        width={400}
        onOk={handlePwdSubmit}
        onCancel={() => setPasswordModal(false)}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入' }]}>
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item name="confirm_password" label="确认密码" rules={[{ required: true, message: '请输入' }]}>
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserList
