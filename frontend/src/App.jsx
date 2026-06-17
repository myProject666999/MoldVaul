import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MoldList from './pages/MoldList'
import BorrowList from './pages/BorrowList'
import ProductionList from './pages/ProductionList'
import MaintenanceList from './pages/MaintenanceList'

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="mold" element={<MoldList />} />
        <Route path="borrow" element={<BorrowList />} />
        <Route path="production" element={<ProductionList />} />
        <Route path="maintenance" element={<MaintenanceList />} />
        <Route path="system/users" element={<div style={{ padding: 24 }}><h2>用户管理</h2></div>} />
        <Route path="system/locations" element={<div style={{ padding: 24 }}><h2>库位管理</h2></div>} />
        <Route path="system/machines" element={<div style={{ padding: 24 }}><h2>设备管理</h2></div>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
