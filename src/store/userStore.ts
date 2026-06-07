/**
 * @file 用户状态管理
 * @description 使用 Zustand 管理用户状态（openid、role、登录态）
 */

import { create } from 'zustand'
import type { UserRole } from '../types/user'

interface UserState {
  openid: string
  role: UserRole
  nickname: string
  avatar: string
  isLoggedIn: boolean
  setLoginInfo: (openid: string, role: UserRole, nickname: string, avatar: string) => void
  setProfile: (nickname: string, avatar: string) => void
  clearLogin: () => void
}

export const useUserStore = create<UserState>((set) => ({
  openid: '',
  role: 'user',
  nickname: '',
  avatar: '',
  isLoggedIn: false,

  setLoginInfo: (openid, role, nickname, avatar) =>
    set({ openid, role, nickname, avatar, isLoggedIn: true }),

  setProfile: (nickname, avatar) =>
    set({ nickname, avatar }),

  clearLogin: () =>
    set({ openid: '', role: 'user', nickname: '', avatar: '', isLoggedIn: false }),
}))
