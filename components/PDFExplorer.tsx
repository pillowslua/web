'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Loader2, FileText, Calendar, ClipboardList } from 'lucide-react'
import jsPDF from 'jspdf'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Database } from '@/lib/supabase'

type Timetable = Database['public']['Tables']['timetable']['Row']
type Post = Database['public']['Tables']['posts']['Row']
type Survey = Database['public']['Tables']['survey']['Row']
type SurveyResponse = Database['public']['Tables']['survey_responses']['Row']

interface SurveyWithResponse extends Survey {
  userResponse?: string
}

export default function PDFExporter(): JSX.Element {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const fetchUserData = async (): Promise<{
    timetables: Timetable[]
    posts: Post[]
    surveys: SurveyWithResponse[]
  }> => {
    try {
      // Fetch timetables
      const { data: timetables, error: timetableError } = await supabase
        .from('timetable')
        .select('*')
        .order('ngay', { ascending: true })
        .order('gio', { ascending: true })

      if (timetableError) throw timetableError

      // Fetch posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('ngay', { ascending: false })

      if (postsError) throw postsError

      // Fetch surveys and responses
      const { data: surveys, error: surveysError } = await supabase
        .from('survey')
        .select('*')
        .order('created_at', { ascending: false })

      if (surveysError) throw surveysError

      let surveysWithResponse: SurveyWithResponse[] = surveys || []

      if (user) {
        const { data: responses, error: responsesError } = await supabase
          .from('survey_responses')
          .select('survey_id, answer')
          .eq('user_id', user.id)

        if (!responsesError && responses) {
          const responseMap = new Map(responses.map(r => [r.survey_id, r.answer]))
          surveysWithResponse = surveys.map(survey => ({
            ...survey,
            userResponse: responseMap.get(survey.id)
          })).filter(survey => survey.userResponse) // Only include surveys user responded to
        }
      }

      return {
        timetables: timetables || [],
        posts: posts || [],
        surveys: surveysWithResponse
      }
    } catch (error) {
      throw new Error('Không thể tải dữ liệu người dùng')
    }
  }

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi })
    } catch {
      return dateString
    }
  }

  const generatePDF = async (): Promise<void> => {
    if (!user || !profile) return

    setLoading(true)
    setError('')

    try {
      const { timetables, posts, surveys } = await fetchUserData()

      // Create new PDF document
      const doc = new jsPDF()
      
      // Set font (Note: jsPDF has limited Vietnamese font support)
      doc.setFont('helvetica')
      
      let yPosition = 20

      // Header
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('BAO CAO HE THONG QUAN LY TRUONG HOC', 20, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Hoc sinh: ${profile.full_name || profile.email}`, 20, yPosition)
      yPosition += 5
      doc.text(`Ngay xuat: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}`, 20, yPosition)
      yPosition += 15

      // Timetables Section
      if (timetables.length > 0) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('LICH HOC', 20, yPosition)
        yPosition += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        
        // Table headers
        doc.text('Ngay', 20, yPosition)
        doc.text('Gio', 60, yPosition)
        doc.text('Mon hoc', 90, yPosition)
        doc.text('Phong', 140, yPosition)
        yPosition += 5

        // Draw line under headers
        doc.line(20, yPosition, 180, yPosition)
        yPosition += 5

        timetables.forEach((timetable) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }

          doc.text(formatDate(timetable.ngay), 20, yPosition)
          doc.text(timetable.gio, 60, yPosition)
          doc.text(timetable.mon, 90, yPosition)
          doc.text(timetable.phong, 140, yPosition)
          yPosition += 7
        })

        yPosition += 10
      }

      // Posts Section
      if (posts.length > 0) {
        if (yPosition > 200) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('BAI DANG', 20, yPosition)
        yPosition += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        posts.forEach((post) => {
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
          }

          // Post title
          doc.setFont('helvetica', 'bold')
          doc.text(`${formatDate(post.ngay)}: ${post.tieu_de}`, 20, yPosition)
          yPosition += 7

          // Post content (truncated if too long)
          doc.setFont('helvetica', 'normal')
          const content = post.noi_dung.length > 100 
            ? post.noi_dung.substring(0, 100) + '...'
            : post.noi_dung
          
          const lines = doc.splitTextToSize(content, 160)
          lines.forEach((line: string) => {
            if (yPosition > 270) {
              doc.addPage()
              yPosition = 20
            }
            doc.text(line, 20, yPosition)
            yPosition += 5
          })
          
          yPosition += 10
        })
      }

      // Surveys Section
      if (surveys.length > 0) {
        if (yPosition > 200) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('KHAO SAT DA THAM GIA', 20, yPosition)
        yPosition += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        surveys.forEach((survey) => {
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
          }

          // Survey question
          doc.setFont('helvetica', 'bold')
          const questionLines = doc.splitTextToSize(`Cau hoi: ${survey.cau_hoi}`, 160)
          questionLines.forEach((line: string) => {
            if (yPosition > 270) {
              doc.addPage()
              yPosition = 20
            }
            doc.text(line, 20, yPosition)
            yPosition += 5
          })

          // User response
          doc.setFont('helvetica', 'normal')
          const responseLines = doc.splitTextToSize(`Tra loi: ${survey.userResponse || 'Khong co'}`, 160)
          responseLines.forEach((line: string) => {
            if (yPosition > 270) {
              doc.addPage()
              yPosition = 20
            }
            doc.text(line, 20, yPosition)
            yPosition += 5
          })
          
          yPosition += 10
        })
      }

      // Save PDF
      const fileName = `hoc_tap_${profile.full_name || 'hoc_sinh'}_${format(new Date(), 'ddMMyyyy')}.pdf`
      doc.save(fileName)

    } catch (error) {
      console.error('Error generating PDF:', error)
      setError(error instanceof Error ? error.message : 'Không thể tạo file PDF')
    } finally {
      setLoading(false)
    }
  }

  if (profile?.role !== 'student') {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Tính năng xuất PDF chỉ dành cho học sinh</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-6">
          <FileText className="w-16 h-16 mx-auto text-blue-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Xuất dữ liệu cá nhân
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Tải xuống tất cả dữ liệu học tập của bạn bao gồm lịch học, bài đăng và khảo sát đã tham gia dưới định dạng PDF.
          </p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Lịch học</span>
                </div>
                <span>✓</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Bài đăng</span>
                </div>
                <span>✓</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4" />
                  <span>Khảo sát đã tham gia</span>
                </div>
                <span>✓</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button 
            onClick={generatePDF} 
            disabled={loading}
            size="lg"
            className="px-8"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Tải xuống PDF
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50 max-w-md mx-auto">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-6 text-xs text-gray-500">
          <p>
            File PDF sẽ được tải xuống với tên: 
            <code className="bg-gray-100 px-2 py-1 rounded ml-1">
              hoc_tap_[ten]_[ngay].pdf
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}
