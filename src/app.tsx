/**
 * @file App entry point
 * @description Silent login on startup, initialize user state
 */

import { PropsWithChildren, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { login } from './services/userService'
import { initializeCloud } from './services/cloud'
import { useUserStore } from './store/userStore'
import { isSuccess, showErrorToast } from './services/request'
import './app.scss'

function App({ children }: PropsWithChildren) {
  const setLoginInfo = useUserStore((s) => s.setLoginInfo)

  useEffect(() => {
    try {
      initializeCloud()
      silentLogin(setLoginInfo)
    } catch (error) {
      const message = error instanceof Error ? error.message : '云端初始化失败'
      Taro.showToast({ title: message, icon: 'none', duration: 3000 })
    }
  }, [setLoginInfo])

  return <>{children}</>
}

async function silentLogin(
  setLoginInfo: (openid: string, role: 'student' | 'teacher' | 'admin' | 'user', nickname: string, avatar: string) => void,
): Promise<void> {
  try {
    const res = await login()
    if (isSuccess(res) && res.data) {
      setLoginInfo(res.data.openid, res.data.role, res.data.nickname, res.data.avatar)
    } else {
      showErrorToast(res.code)
    }
  } catch {
    Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
  }
}

export default App
