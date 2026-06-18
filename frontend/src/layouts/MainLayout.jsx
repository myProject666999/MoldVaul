import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Space, Modal, Descriptions, Form, Input, Button, message, Tabs } from 'antd'
import {
  DashboardOutlined,
  AppstoreOutlined,
  SwapOutlined,
  PlayCircleOutlined,
  ToolOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  KeyOutlined,
  IdcardOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { changePassword } from '../api/user'

const { Header, Sider, Content } = Layout

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [pwdForm] = Form.useForm()

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    navigate('/login')
  }

  const handlePwdSubmit = async () => {
    try {
      const values = await pwdForm.validateFields()
      if (values.new_password !== values.confirm_password) {
        message.error('两次输入的新密码不一致')
        return
      }
      await changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      })
      message.success('密码修改成功')
      pwdForm.resetFields()
      setProfileOpen(false)
    } catch (err) {
      console.error('Change password error:', err)
    }
  }

  const userMenu = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => setProfileOpen(true),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '数据概览',
    },
    {
      key: '/mold',
      icon: <AppstoreOutlined />,
      label: '模具台账',
    },
    {
      key: '/borrow',
      icon: <SwapOutlined />,
      label: '出入库借还',
    },
    {
      key: '/production',
      icon: <PlayCircleOutlined />,
      label: '生产报工',
    },
    {
      key: '/maintenance',
      icon: <ToolOutlined />,
      label: '维修保养',
    },
    {
      key: '/system',
      icon: <SettingOutlined />,
      label: '系统管理',
      children: [
        { key: '/system/users', label: '用户管理' },
        { key: '/system/locations', label: '库位管理' },
        { key: '/system/machines', label: '设备管理' },
      ],
    },
  ]

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  const selectedKeys = [location.pathname]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 600,
          background: 'rgba(255,255,255,0.1)',
        }}>
          {collapsed ? 'MVS' : '模具管理柜'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={['/system']}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#262626' }}>
            模具工装管理柜系统
          </div>
          <Dropdown menu={{ items: userMenu }}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{userInfo.real_name || userInfo.username}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '0', background: '#f0f2f5' }}>
          <Outlet />
        </Content>
      </Layout>

      <Modal
        title="个人中心"
        open={profileOpen}
        onCancel={() => setProfileOpen(false)}
        width={600}
        destroyOnClose
        footer={null}
      >
        <Tabs
          defaultActiveKey="info"
          items={[
            {
              key: 'info',
              label: (
                <span>
                  <IdcardOutlined />
                  基本信息
                </span>
              ),
              children: (
                <Descriptions column={1} bordered size="middle">
                  <Descriptions.Item label="用户名">{userInfo.username || '-'}</Descriptions.Item>
                  <Descriptions.Item label="真实姓名">{userInfo.real_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="手机号">{userInfo.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="角色">
                    {userInfo.role === 1 ? '超级管理员' : userInfo.role === 2 ? '管理员' : '普通用户'}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {userInfo.status === 1 ? '正常' : '禁用'}
                  </Descriptions.Item>
                  <Descriptions.Item label="用户ID">{userInfo.id || '-'}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'password',
              label: (
                <span>
                  <KeyOutlined />
                  修改密码
                </span>
              ),
              children: (
                <Form form={pwdForm} layout="vertical" style={{ maxWidth: 400, marginTop: 8 }}>
                  <Form.Item name="old_password" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
                    <Input.Password placeholder="请输入当前密码" />
                  </Form.Item>
                  <Form.Item name="new_password" label="新密码" rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码至少6位' },
                  ]}>
                    <Input.Password placeholder="请输入新密码（至少6位）" />
                  </Form.Item>
                  <Form.Item name="confirm_password" label="确认新密码" rules={[{ required: true, message: '请再次输入新密码' }]}>
                    <Input.Password placeholder="请再次输入新密码" />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button type="primary" onClick={handlePwdSubmit}>确认修改</Button>
                      <Button onClick={() => pwdForm.resetFields()}>重置</Button>
                    </Space>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Modal>
    </Layout>
  )
}

export default MainLayout
