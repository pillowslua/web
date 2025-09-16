'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit, Trash2, FileText, CheckCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Database } from '@/lib/supabase'

type Post = Database['public']['Tables']['posts']['Row']
type PostInsert = Database['public']['Tables']['posts']['Insert']

interface PostsManagerProps {
  canEdit: boolean
}

interface PostWithReadStatus extends Post {
  isRead?: boolean
}

export default function PostsManager({ canEdit }: PostsManagerProps): JSX.Element {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<PostWithReadStatus[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string>('')
  
  const [formData, setFormData] = useState<{
    tieu_de: string
    noi_dung: string
    ngay: string
  }>({
    tieu_de: '',
    noi_dung: '',
    ngay: format(new Date(), 'yyyy-MM-dd')
  })

  const fetchPosts = async (): Promise<void> => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('ngay', { ascending: false })

      if (postsError) throw postsError

      let postsWithReadStatus: PostWithReadStatus[] = postsData || []

      // If user is a student, fetch read status
      if (profile?.role === 'student' && user) {
        const { data: readData, error: readError } = await supabase
          .from('read_posts')
          .select('post_id')
          .eq('user_id', user.id)

        if (!readError && readData) {
          const readPostIds = new Set(readData.map(r => r.post_id))
          postsWithReadStatus = postsData.map(post => ({
            ...post,
            isRead: readPostIds.has(post.id)
          }))
        }
      }

      setPosts(postsWithReadStatus)
    } catch (error) {
      console.error('Error fetching posts:', error)
      setError('Không thể tải bài đăng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [profile, user])

  const resetForm = (): void => {
    setFormData({
      tieu_de: '',
      noi_dung: '',
      ngay: format(new Date(), 'yyyy-MM-dd')
    })
    setEditingId(null)
    setError('')
  }

  const handleOpenDialog = (post?: Post): void => {
    if (post) {
      setFormData({
        tieu_de: post.tieu_de,
        noi_dung: post.noi_dung,
        ngay: post.ngay
      })
      setEditingId(post.id)
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

    if (!formData.tieu_de || !formData.noi_dung || !formData.ngay) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (editingId) {
        const { error } = await supabase
          .from('posts')
          .update({
            tieu_de: formData.tieu_de,
            noi_dung: formData.noi_dung,
            ngay: formData.ngay
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const insertData: PostInsert = {
          tieu_de: formData.tieu_de,
          noi_dung: formData.noi_dung,
          ngay: formData.ngay,
          created_by: user.id
        }

        const { error } = await supabase
          .from('posts')
          .insert([insertData])

        if (error) throw error
      }

      await fetchPosts()
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving post:', error)
      setError('Không thể lưu bài đăng')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài đăng này?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
      setError('Không thể xóa bài đăng')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (postId: number): Promise<void> => {
    if (!user || profile?.role !== 'student') return

    try {
      const { error } = await supabase
        .from('read_posts')
        .upsert({
          post_id: postId,
          user_id: user.id
        })

      if (error) throw error
      await fetchPosts()
    } catch (error) {
      console.error('Error marking post as read:', error)
    }
  }

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi })
    } catch {
      return dateString
    }
  }

  if (loading && posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Đang tải bài đăng...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Danh sách bài đăng</h3>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm bài đăng
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Sửa bài đăng' : 'Thêm bài đăng mới'}
                </DialogTitle>
                <DialogDescription>
                  Điền thông tin bài đăng dưới đây
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tieu_de">Tiêu đề</Label>
                  <Input
                    id="tieu_de"
                    placeholder="Tiêu đề bài đăng"
                    value={formData.tieu_de}
                    onChange={(e) => setFormData(prev => ({ ...prev, tieu_de: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="noi_dung">Nội dung</Label>
                  <Textarea
                    id="noi_dung"
                    placeholder="Nội dung bài đăng"
                    value={formData.noi_dung}
                    onChange={(e) => setFormData(prev => ({ ...prev, noi_dung: e.target.value }))}
                    rows={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ngay">Ngày đăng</Label>
                  <Input
                    id="ngay"
                    type="date"
                    value={formData.ngay}
                    onChange={(e) => setFormData(prev => ({ ...prev, ngay: e.target.value }))}
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

      {/* Posts List */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Chưa có bài đăng nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card 
              key={post.id} 
              className={`${post.isRead ? 'bg-gray-50' : 'bg-white'} transition-colors`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>{post.tieu_de}</span>
                      {post.isRead && (
                        <Badge variant="secondary" className="ml-2">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Đã đọc
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Ngày đăng: {formatDate(post.ngay)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {profile?.role === 'student' && !post.isRead && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(post.id)}
                      >
                        Đánh dấu đã đọc
                      </Button>
                    )}
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(post)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{post.noi_dung}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
