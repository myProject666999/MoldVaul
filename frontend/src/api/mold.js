import request from '../utils/request'

export const getMoldStats = () => request.get('/mold/stats')

export const getMoldList = (params) => request.get('/mold/list', { params })

export const getMoldDetail = (id) => request.get(`/mold/detail/${id}`)

export const getMoldStatus = (id) => request.get(`/mold/status/${id}`)

export const getMoldCycles = (id) => request.get(`/mold/cycles/${id}`)

export const getMoldProductionStats = (id) => request.get(`/mold/production-stats/${id}`)

export const createMold = (data) => request.post('/mold', data)

export const updateMold = (id, data) => request.put(`/mold/${id}`, data)

export const deleteMold = (id) => request.delete(`/mold/${id}`)

export const getCycleLogs = (moldId, params) => request.get(`/mold/cycle-logs/${moldId}`, { params })

export const getLocationList = (params) => request.get('/location/list', { params })

export const createLocation = (data) => request.post('/location', data)

export const getMachineList = (params) => request.get('/machine/list', { params })

export const createMachine = (data) => request.post('/machine', data)
