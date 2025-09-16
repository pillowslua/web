import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sfqlaxcxenndevprhmci.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcWxheGN4ZW5uZGV2cHJobWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjk5MjMsImV4cCI6MjA3MzYwNTkyM30.lx4FTXvQj7tj7zz8u9gK3bVdaaFPtIC_sWnuxUxcSG8'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          role: 'admin' | 'bcs' | 'student'
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          role: 'admin' | 'bcs' | 'student'
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          role?: 'admin' | 'bcs' | 'student'
          full_name?: string | null
          created_at?: string
        }
      }
      timetable: {
        Row: {
          id: number
          ngay: string
          gio: string
          mon: string
          phong: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: number
          ngay: string
          gio: string
          mon: string
          phong: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: number
          ngay?: string
          gio?: string
          mon?: string
          phong?: string
          created_by?: string
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: number
          tieu_de: string
          noi_dung: string
          ngay: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: number
          tieu_de: string
          noi_dung: string
          ngay: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: number
          tieu_de?: string
          noi_dung?: string
          ngay?: string
          created_by?: string
          created_at?: string
        }
      }
      survey: {
        Row: {
          id: number
          cau_hoi: string
          loai: 'multiple_choice' | 'text'
          options: string[] | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: number
          cau_hoi: string
          loai: 'multiple_choice' | 'text'
          options?: string[] | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: number
          cau_hoi?: string
          loai?: 'multiple_choice' | 'text'
          options?: string[] | null
          created_by?: string
          created_at?: string
        }
      }
      survey_responses: {
        Row: {
          id: number
          survey_id: number
          user_id: string
          answer: string
          timestamp: string
        }
        Insert: {
          id?: number
          survey_id: number
          user_id: string
          answer: string
          timestamp?: string
        }
        Update: {
          id?: number
          survey_id?: number
          user_id?: string
          answer?: string
          timestamp?: string
        }
      }
      read_posts: {
        Row: {
          id: number
          post_id: number
          user_id: string
          read_at: string
        }
        Insert: {
          id?: number
          post_id: number
          user_id: string
          read_at?: string
        }
        Update: {
          id?: number
          post_id?: number
          user_id?: string
          read_at?: string
        }
      }
    }
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Secret keys for admin and BCS login
export const ADMIN_SECRET_KEY = 'admin_2024_secret'
export const BCS_SECRET_KEY = 'bcs_2024_secret'
