import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Space } from 'antd'
import {
  DashboardOutlined,
  AppstoreOutlined,
  SwapOutlined,
  PlayCircleOutlined,
  ToolOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

const { Header, Sider, Content } = Layout

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    navigate('/login')
  }

  const userMenu = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
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
    </Layout>
  )
}

export default MainLayout
