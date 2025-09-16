'use client'

import { useAuth } from '/contexts/AuthContext'
import Login from '/components/Login'
import Dashboard from '/components/Dashboard'

export default function Page(): JSX.Element {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Đang tải...</h2>
          <p className="text-gray-600">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return <Login />
  }

  return <Dashboard />
}
