'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, ClipboardList, Send, BarChart } from 'lucide-react'
import type { Database } from '@/lib/supabase'

type Survey = Database['public']['Tables']['survey']['Row']
type SurveyInsert = Database['public']['Tables']['survey']['Insert']
type SurveyResponse = Database['public']['Tables']['survey_responses']['Row']

interface SurveyManagerProps {
  canEdit: boolean
}

interface SurveyWithResponse extends Survey {
  hasResponded?: boolean
  userResponse?: string
}

interface SurveyResults {
  [key: string]: {
    count: number
    responses: string[]
  }
}

export default function SurveyManager({ canEdit }: SurveyManagerProps): JSX.Element {
  const { user, profile } = useAuth()
  const [surveys, setSurveys] = useState<SurveyWithResponse[]>([])
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [surveyResults, setSurveyResults] = useState<SurveyResults>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState<boolean>(false)
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string>('')
  const [responseText, setResponseText] = useState<string>('')
  const [selectedOption, setSelectedOption] = useState<string>('')
  
  const [formData, setFormData] = useState<{
    cau_hoi: string
    loai: 'multiple_choice' | 'text'
    options: string[]
  }>({
    cau_hoi: '',
    loai: 'text',
    options: ['', '', '', '']
  })

  const fetchSurveys = async (): Promise<void> => {
    try {
      const { data: surveysData, error: surveysError } = await supabase
        .from('survey')
        .select('*')
        .order('created_at', { ascending: false })

      if (surveysError) throw surveysError

      let surveysWithResponse: SurveyWithResponse[] = surveysData || []

      // If user is a student, fetch response status
      if (profile?.role === 'student' && user) {
        const { data: responsesData, error: responsesError } = await supabase
          .from('survey_responses')
          .select('survey_id, answer')
          .eq('user_id', user.id)

        if (!responsesError && responsesData) {
          const responseMap = new Map(responsesData.map(r => [r.survey_id, r.answer]))
          surveysWithResponse = surveysData.map(survey => ({
            ...survey,
            hasResponded: responseMap.has(survey.id),
            userResponse: responseMap.get(survey.id)
          }))
        }
      }

      setSurveys(surveysWithResponse)
    } catch (error) {
      console.error('Error fetching surveys:', error)
      setError('Không thể tải khảo sát')
    } finally {
      setLoading(false)
    }
  }

  const fetchSurveyResults = async (surveyId: number): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('answer')
        .eq('survey_id', surveyId)

      if (error) throw error

      const results: SurveyResults = {}
      
      if (data) {
        data.forEach((response) => {
          const answer = response.answer
          if (!results[answer]) {
            results[answer] = { count: 0, responses: [] }
          }
          results[answer].count++
          results[answer].responses.push(answer)
        })
      }

      setSurveyResults(results)
    } catch (error) {
      console.error('Error fetching survey results:', error)
      setError('Không thể tải kết quả khảo sát')
    }
  }

  useEffect(() => {
    fetchSurveys()
  }, [profile, user])

  const resetForm = (): void => {
    setFormData({
      cau_hoi: '',
      loai: 'text',
      options: ['', '', '', '']
    })
    setEditingId(null)
    setError('')
  }

  const handleOpenDialog = (survey?: Survey): void => {
    if (survey) {
      setFormData({
        cau_hoi: survey.cau_hoi,
        loai: survey.loai,
        options: survey.options || ['', '', '', '']
      })
      setEditingId(survey.id)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = (): void => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleOpenResponseDialog = (survey: Survey): void => {
    setSelectedSurvey(survey)
    setResponseText('')
    setSelectedOption('')
    setIsResponseDialogOpen(true)
  }

  const handleOpenResultsDialog = (survey: Survey): void => {
    setSelectedSurvey(survey)
    fetchSurveyResults(survey.id)
    setIsResultsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!user) return

    if (!formData.cau_hoi) {
      setError('Vui lòng nhập câu hỏi')
      return
    }

    if (formData.loai === 'multiple_choice' && formData.options.filter(opt => opt.trim()).length < 2) {
      setError('Câu hỏi trắc nghiệm phải có ít nhất 2 lựa chọn')
      return
    }

    setLoading(true)
    setError('')

    try {
      const options = formData.loai === 'multiple_choice' 
        ? formData.options.filter(opt => opt.trim())
        : null

      if (editingId) {
        const { error } = await supabase
          .from('survey')
          .update({
            cau_hoi: formData.cau_hoi,
            loai: formData.loai,
            options
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const insertData: SurveyInsert = {
          cau_hoi: formData.cau_hoi,
          loai: formData.loai,
          options,
          created_by: user.id
        }

        const { error } = await supabase
          .from('survey')
          .insert([insertData])

        if (error) throw error
      }

      await fetchSurveys()
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving survey:', error)
      setError('Không thể lưu khảo sát')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('Bạn có chắc chắn muốn xóa khảo sát này?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('survey')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchSurveys()
    } catch (error) {
      console.error('Error deleting survey:', error)
      setError('Không thể xóa khảo sát')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitResponse = async (): Promise<void> => {
    if (!user || !selectedSurvey) return

    const answer = selectedSurvey.loai === 'multiple_choice' ? selectedOption : responseText

    if (!answer) {
      setError('Vui lòng nhập câu trả lời')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase
        .from('survey_responses')
        .insert([{
          survey_id: selectedSurvey.id,
          user_id: user.id,
          answer
        }])

      if (error) throw error

      await fetchSurveys()
      setIsResponseDialogOpen(false)
    } catch (error) {
      console.error('Error submitting response:', error)
      setError('Không thể gửi câu trả lời')
    } finally {
      setLoading(false)
    }
  }

  const updateOption = (index: number, value: string): void => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData(prev => ({ ...prev, options: newOptions }))
  }

  if (loading && surveys.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Đang tải khảo sát...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Danh sách khảo sát</h3>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Tạo khảo sát
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Sửa khảo sát' : 'Tạo khảo sát mới'}
                </DialogTitle>
                <DialogDescription>
                  Điền thông tin khảo sát dưới đây
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cau_hoi">Câu hỏi</Label>
                  <Textarea
                    id="cau_hoi"
                    placeholder="Nhập câu hỏi khảo sát"
                    value={formData.cau_hoi}
                    onChange={(e) => setFormData(prev => ({ ...prev, cau_hoi: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loai">Loại câu hỏi</Label>
                  <Select 
                    value={formData.loai} 
                    onValueChange={(value: 'multiple_choice' | 'text') => 
                      setFormData(prev => ({ ...prev, loai: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Tự luận</SelectItem>
                      <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.loai === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Lựa chọn</Label>
                    {formData.options.map((option, index) => (
                      <Input
                        key={index}
                        placeholder={`Lựa chọn ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                    ))}
                  </div>
                )}
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex space-x-2 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {editingId ? 'Cập nhật' : 'Tạo mới'}
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

      {/* Surveys List */}
      {surveys.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Chưa có khảo sát nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {surveys.map((survey) => (
            <Card key={survey.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2">
                      <ClipboardList className="w-5 h-5" />
                      <span>{survey.cau_hoi}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant={survey.loai === 'multiple_choice' ? 'default' : 'secondary'}>
                        {survey.loai === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                      </Badge>
                      {survey.hasResponded && (
                        <Badge variant="outline" className="text-green-600">
                          Đã trả lời
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {profile?.role === 'student' && !survey.hasResponded && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleOpenResponseDialog(survey)}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Trả lời
                      </Button>
                    )}
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResultsDialog(survey)}
                        >
                          <BarChart className="w-4 h-4 mr-1" />
                          Kết quả
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(survey)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(survey.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              {survey.userResponse && (
                <CardContent>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-800 mb-1">Câu trả lời của bạn:</p>
                    <p className="text-green-700">{survey.userResponse}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trả lời khảo sát</DialogTitle>
            <DialogDescription>
              {selectedSurvey?.cau_hoi}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSurvey?.loai === 'multiple_choice' ? (
              <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                {selectedSurvey.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Textarea
                placeholder="Nhập câu trả lời của bạn"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
              />
            )}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex space-x-2">
              <Button onClick={handleSubmitResponse} disabled={loading} className="flex-1">
                Gửi trả lời
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsResponseDialogOpen(false)}
              >
                Hủy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={isResultsDialogOpen} onOpenChange={setIsResultsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kết quả khảo sát</DialogTitle>
            <DialogDescription>
              {selectedSurvey?.cau_hoi}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {Object.keys(surveyResults).length === 0 ? (
              <p className="text-center text-gray-500 py-4">Chưa có ai trả lời khảo sát này</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(surveyResults).map(([answer, data], index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-medium text-gray-900">{answer}</p>
                      <Badge variant="outline">{data.count} trả lời</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(data.count / Object.values(surveyResults).reduce((sum, d) => sum + d.count, 0)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
