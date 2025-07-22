import { useEffect, useState } from 'react'
import Login from './components/Login'
import List from './components/List'
import { useSurreal, useSurrealClient } from './api/SurrealProvider'
import { Spin } from 'antd'


function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const { isSuccess } = useSurreal()
  const client = useSurrealClient()
  const token = localStorage.getItem('surrealist_token')

  useEffect(() => {
    const tryAuth = async () => {
      if (isSuccess && token && !authChecked) {
        try {
          await client.ready;
          const res = await client.authenticate(token)
          console.log(res)
          setLoggedIn(true)
        } catch (err) {
          console.error("Authentication failed:", err)
        } finally {
          setAuthChecked(true)
        }
      } else if (isSuccess && !token && !authChecked) {
        setAuthChecked(true)
      }
    }
    void tryAuth()
  }, [isSuccess, token, client, authChecked])

  if (!authChecked) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin tip="连接 SurrealDB..." size="large" />
    </div>
  )

  return loggedIn ? <List onLogout={() => {
    localStorage.removeItem('surrealist_token')
    setLoggedIn(false)
  }} /> : <Login onLogin={() => setLoggedIn(true)} />
}

export default App
