import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Table, Space, Tag, Button } from 'antd'
import {
  AppstoreOutlined,
  InboxOutlined,
  SwapOutlined,
  ToolOutlined,
  WarningOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getMoldStats, getMoldList } from '../api/mold'
import { getMaintenanceStats, getBorrowList } from '../api/business'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [mtStats, setMtStats] = useState({})
  const [borrowList, setBorrowList] = useState([])
  const [warningList, setWarningList] = useState([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [s, mt, br, molds] = await Promise.all([
        getMoldStats(),
        getMaintenanceStats(),
        getBorrowList({ page: 1, page_size: 5, status: 1 }),
        getMoldList({ page: 1, page_size: 5, is_warning: 1 }),
      ])
      setStats(s)
      setMtStats(mt)
      setBorrowList(br.list || [])
      setWarningList(molds.list || [])
    } catch (err) {
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const statusMap = {
    1: { text: '在库', color: 'success' },
    2: { text: '借出', color: 'blue' },
    3: { text: '维修中', color: 'warning' },
    4: { text: '报废', color: 'error' },
  }

  const borrowColumns = [
    {
      title: '模具编号',
      dataIndex: 'mold_code',
      key: 'mold_code',
      render: (text) => <a onClick={() => navigate(`/mold?keyword=${text}`)}>{text}</a>,
    },
    { title: '借用人', dataIndex: 'borrower_name', key: 'borrower_name' },
    { title: '设备', dataIndex: 'machine_code', key: 'machine_code' },
    {
      title: '借出时间',
      dataIndex: 'borrow_time',
      key: 'borrow_time',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
  ]

  const warningColumns = [
    {
      title: '模具编号',
      dataIndex: 'mold_code',
      key: 'mold_code',
      render: (text) => <a onClick={() => navigate(`/mold?keyword=${text}`)}>{text}</a>,
    },
    { title: '模具名称', dataIndex: 'mold_name', key: 'mold_name' },
    { title: '累计模次', dataIndex: 'total_cycles', key: 'total_cycles' },
    {
      title: '预警类型',
      dataIndex: 'warning_type',
      key: 'warning_type',
      render: (t) => (
        <Tag color={t === 'scrap' ? 'red' : 'orange'}>
          {t === 'scrap' ? '报废预警' : '保养预警'}
        </Tag>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">数据概览</div>
        <Space>
          <Button onClick={loadData}>刷新</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card">
            <AppstoreOutlined style={{ fontSize: 28, color: '#1890ff' }} />
            <div className="stat-number">{stats.total_molds || 0}</div>
            <div className="stat-label">模具总数</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card success-stat">
            <InboxOutlined style={{ fontSize: 28, color: '#52c41a' }} />
            <div className="stat-number">{stats.in_stock_count || 0}</div>
            <div className="stat-label">在库</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card">
            <SwapOutlined style={{ fontSize: 28, color: '#1890ff' }} />
            <div className="stat-number">{stats.borrowed_count || 0}</div>
            <div className="stat-label">借出</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card warning-stat">
            <ToolOutlined style={{ fontSize: 28, color: '#faad14' }} />
            <div className="stat-number">{stats.repairing_count || 0}</div>
            <div className="stat-label">维修中</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card danger-stat">
            <WarningOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />
            <div className="stat-number">{stats.warning_count || 0}</div>
            <div className="stat-label">预警</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card">
            <HistoryOutlined style={{ fontSize: 28, color: '#722ed1' }} />
            <div className="stat-number">{stats.today_borrow_count || 0}</div>
            <div className="stat-label">今日借出</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="借出中的模具" extra={<a onClick={() => navigate('/borrow')}>查看全部</a>}>
            <Table
              columns={borrowColumns}
              dataSource={borrowList}
              rowKey="id"
              pagination={false}
              size="small"
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="预警模具" extra={<a onClick={() => navigate('/mold?is_warning=1')}>查看全部</a>}>
            <Table
              columns={warningColumns}
              dataSource={warningList}
              rowKey="id"
              pagination={false}
              size="small"
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
