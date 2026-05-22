import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xglgkeqquamwyedwzqon.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGdrZXFxdWFtd3llZHd6cW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MTE3ODIsImV4cCI6MjA4MzA4Nzc4Mn0.KpS6ziLWaN9kmRVHxUAnrNO8U5ZiURm4z0foJ5qmCOQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)










