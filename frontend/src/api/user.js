import request from '../utils/request'

export const login = (data) => request.post('/auth/login', data)

export const getUserInfo = () => request.get('/user/info')

export const getUserList = (params) => request.get('/user/list', { params })

export const createUser = (data) => request.post('/user', data)

export const updateUser = (id, data) => request.put(`/user/${id}`, data)

export const deleteUser = (id) => request.delete(`/user/${id}`)

export const changePassword = (data) => request.post('/user/change-password', data)
