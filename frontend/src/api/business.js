import request from '../utils/request'

export const getBorrowList = (params) => request.get('/borrow/list', { params })

export const getBorrowDetail = (id) => request.get(`/borrow/detail/${id}`)

export const borrowMold = (data) => request.post('/borrow/borrow', data)

export const returnMold = (id, data) => request.post(`/borrow/return/${id}`, data)

export const quickBorrow = (data) => request.post('/borrow/quick-borrow', data)

export const quickReturn = (data) => request.post('/borrow/quick-return', data)

export const getProductionList = (params) => request.get('/production/list', { params })

export const getProductionDetail = (id) => request.get(`/production/detail/${id}`)

export const createProduction = (data) => request.post('/production', data)

export const voidProduction = (id) => request.post(`/production/void/${id}`)

export const getMaintenanceList = (params) => request.get('/maintenance/list', { params })

export const getMaintenanceDetail = (id) => request.get(`/maintenance/detail/${id}`)

export const getMoldMaintenanceList = (moldId, params) => request.get(`/maintenance/mold/${moldId}`, { params })

export const getMaintenanceStats = () => request.get('/maintenance/stats')

export const createMaintenance = (data) => request.post('/maintenance', data)

export const completeMaintenance = (id, data) => request.post(`/maintenance/complete/${id}`, data)

export const deleteMaintenance = (id) => request.delete(`/maintenance/${id}`)
