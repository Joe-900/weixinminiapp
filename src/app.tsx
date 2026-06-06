/**
 * @file App entry point
 * @description Silent login on startup, initialize user state
 */

import { PropsWithChildren, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { login } from './services/userService'
import { useUserStore } from './store/userStore'
import { isSuccess, showErrorToast } from './services/request'
import './app.scss'

function App({ children }: PropsWithChildren) {
  const setLoginInfo = useUserStore((s) => s.setLoginInfo)

  useEffect(() => {
    silentLogin(setLoginInfo)
  }, [setLoginInfo])

  return <>{children}</>
}

async function silentLogin(
  setLoginInfo: (openid: string, role: 'user' | 'admin') => void,
): Promise<void> {
  try {
    const res = await login()
    if (isSuccess(res) && res.data) {
      setLoginInfo(res.data.openid, res.data.role)
    } else {
      showErrorToast(res.code)
    }
  } catch {
    Taro.showToast({ title: 'Login failed, please retry', icon: 'none' })
  }
}

export default App
