/**
 * @file 用户类型定义
 * @description 用户集合的数据模型与相关请求/响应类型
 */

export type UserRole = 'user' | 'admin'

export interface User {
  _id: string
  openid: string
  nickname: string
  avatar: string
  role: UserRole
  createdAt: number
}

export interface LoginResult {
  openid: string
  role: UserRole
}

export interface ProfileParams {
  nickname: string
  avatar: string
}
