'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LogOut, Calendar, FileText, ClipboardList, Download } from 'lucide-react'
import TimetableManager from './TimetableManager'
import PostsManager from './PostsManager'
import SurveyManager from './SurveyManager'
import PDFExporter from './PDFExporter'

export default function Dashboard(): JSX.Element {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<string>('timetable')

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Đang tải...</h2>
          <p className="text-gray-600">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    )
  }

  const getRoleDisplay = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên'
      case 'bcs':
        return 'Ban cán sự'
      case 'student':
        return 'Học sinh'
      default:
        return 'Không xác định'
    }
  }

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'bcs':
        return 'default'
      case 'student':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const canEdit = profile.role === 'admin' || profile.role === 'bcs'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">
                Hệ thống quản lý trường học
              </h1>
              <Badge variant={getRoleBadgeVariant(profile.role)}>
                {getRoleDisplay(profile.role)}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Xin chào, {profile.full_name || profile.email}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="timetable" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Lịch học</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Bài đăng</span>
            </TabsTrigger>
            <TabsTrigger value="surveys" className="flex items-center space-x-2">
              <ClipboardList className="w-4 h-4" />
              <span>Khảo sát</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Xuất PDF</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timetable">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý lịch học</CardTitle>
              </CardHeader>
              <CardContent>
                <TimetableManager canEdit={canEdit} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý bài đăng</CardTitle>
              </CardHeader>
              <CardContent>
                <PostsManager canEdit={canEdit} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="surveys">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý khảo sát</CardTitle>
              </CardHeader>
              <CardContent>
                <SurveyManager canEdit={canEdit} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Xuất dữ liệu PDF</CardTitle>
              </CardHeader>
              <CardContent>
                <PDFExporter />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
