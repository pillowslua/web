'use client'

import { useState } from 'react'
import { supabase, ADMIN_SECRET_KEY, BCS_SECRET_KEY } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function Login(): JSX.Element {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [secretKey, setSecretKey] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const handleStudentLogin = async (): Promise<void> => {
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
    } catch (error) {
      console.error('Login error:', error)
      setError(error instanceof Error ? error.message : 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleSecretKeyLogin = async (): Promise<void> => {
    if (!secretKey) {
      setError('Vui lòng nhập mã bí mật')
      return
    }

    setLoading(true)
    setError('')

    try {
      let role: 'admin' | 'bcs'
      let email: string

      if (secretKey === ADMIN_SECRET_KEY) {
        role = 'admin'
        email = 'admin@school.vn'
      } else if (secretKey === BCS_SECRET_KEY) {
        role = 'bcs' 
        email = 'bcs@school.vn'
      } else {
        throw new Error('Mã bí mật không đúng')
      }

      // Create anonymous user session for admin/BCS
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password: secretKey + '_temp'
      })

      if (signUpError && !signUpError.message.includes('already been registered')) {
        throw signUpError
      }

      // Sign in with the credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: secretKey + '_temp'
      })

      if (signInError) throw signInError

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Không thể lấy thông tin người dùng')

      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          email,
          role,
          full_name: role === 'admin' ? 'Quản trị viên' : 'Ban cán sự'
        })

      if (profileError) throw profileError

    } catch (error) {
      console.error('Secret key login error:', error)
      setError(error instanceof Error ? error.message : 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Hệ thống quản lý trường học
          </CardTitle>
          <CardDescription>
            Đăng nhập để truy cập hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Học sinh</TabsTrigger>
              <TabsTrigger value="staff">Admin/BCS</TabsTrigger>
            </TabsList>
            
            <TabsContent value="student" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleStudentLogin} 
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Đăng nhập học sinh
              </Button>
            </TabsContent>

            <TabsContent value="staff" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secretKey">Mã bí mật</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="Nhập mã bí mật Admin/BCS"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleSecretKeyLogin}
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Đăng nhập bằng mã bí mật
              </Button>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
