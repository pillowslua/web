'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit, Trash2, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Database } from '@/lib/supabase'

type Timetable = Database['public']['Tables']['timetable']['Row']
type TimetableInsert = Database['public']['Tables']['timetable']['Insert']

interface TimetableManagerProps {
  canEdit: boolean
}

export default function TimetableManager({ canEdit }: TimetableManagerProps): JSX.Element {
  const { user } = useAuth()
  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string>('')
  
  const [formData, setFormData] = useState<{
    ngay: string
    gio: string
    mon: string
    phong: string
  }>({
    ngay: '',
    gio: '',
    mon: '',
    phong: ''
  })

  const fetchTimetables = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('timetable')
        .select('*')
        .order('ngay', { ascending: true })
        .order('gio', { ascending: true })

      if (error) throw error
      setTimetables(data || [])
    } catch (error) {
      console.error('Error fetching timetables:', error)
      setError('Không thể tải lịch học')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimetables()
  }, [])

  const resetForm = (): void => {
    setFormData({
      ngay: '',
      gio: '',
      mon: '',
      phong: ''
    })
    setEditingId(null)
    setError('')
  }

  const handleOpenDialog = (timetable?: Timetable): void => {
    if (timetable) {
      setFormData({
        ngay: timetable.ngay,
        gio: timetable.gio,
        mon: timetable.mon,
        phong: timetable.phong
      })
      setEditingId(timetable.id)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = (): void => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!user) return

    if (!formData.ngay || !formData.gio || !formData.mon || !formData.phong) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (editingId) {
        const { error } = await supabase
          .from('timetable')
          .update({
            ngay: formData.ngay,
            gio: formData.gio,
            mon: formData.mon,
            phong: formData.phong
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const insertData: TimetableInsert = {
          ngay: formData.ngay,
          gio: formData.gio,
          mon: formData.mon,
          phong: formData.phong,
          created_by: user.id
        }

        const { error } = await supabase
          .from('timetable')
          .insert([insertData])

        if (error) throw error
      }

      await fetchTimetables()
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving timetable:', error)
      setError('Không thể lưu lịch học')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch học này?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('timetable')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchTimetables()
    } catch (error) {
      console.error('Error deleting timetable:', error)
      setError('Không thể xóa lịch học')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi })
    } catch {
      return dateString
    }
  }

  const getTodaySchedule = (): Timetable[] => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return timetables.filter(t => t.ngay === today)
  }

  const todaySchedule = getTodaySchedule()

  if (loading && timetables.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Đang tải lịch học...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Lịch học hôm nay</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Không có lịch học hôm nay</p>
          ) : (
            <div className="grid gap-3">
              {todaySchedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">{item.gio}</Badge>
                    <div>
                      <p className="font-medium text-gray-900">{item.mon}</p>
                      <p className="text-sm text-gray-600">Phòng: {item.phong}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Tất cả lịch học</h3>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm lịch học
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Sửa lịch học' : 'Thêm lịch học mới'}
                </DialogTitle>
                <DialogDescription>
                  Điền thông tin lịch học dưới đây
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ngay">Ngày</Label>
                  <Input
                    id="ngay"
                    type="date"
                    value={formData.ngay}
                    onChange={(e) => setFormData(prev => ({ ...prev, ngay: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gio">Giờ</Label>
                  <Input
                    id="gio"
                    type="time"
                    value={formData.gio}
                    onChange={(e) => setFormData(prev => ({ ...prev, gio: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mon">Môn học</Label>
                  <Input
                    id="mon"
                    placeholder="Tên môn học"
                    value={formData.mon}
                    onChange={(e) => setFormData(prev => ({ ...prev, mon: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phong">Phòng học</Label>
                  <Input
                    id="phong"
                    placeholder="Số phòng"
                    value={formData.phong}
                    onChange={(e) => setFormData(prev => ({ ...prev, phong: e.target.value }))}
                    required
                  />
                </div>
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex space-x-2 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {editingId ? 'Cập nhật' : 'Thêm mới'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Hủy
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Timetable List */}
      {timetables.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Chưa có lịch học nào</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Giờ</TableHead>
                  <TableHead>Môn học</TableHead>
                  <TableHead>Phòng</TableHead>
                  {canEdit && <TableHead className="w-[100px]">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timetables.map((timetable) => (
                  <TableRow key={timetable.id}>
                    <TableCell>{formatDate(timetable.ngay)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{timetable.gio}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{timetable.mon}</TableCell>
                    <TableCell>{timetable.phong}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(timetable)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(timetable.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
