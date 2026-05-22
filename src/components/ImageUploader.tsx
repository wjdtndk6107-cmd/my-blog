import { useState, useRef, DragEvent } from 'react'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resizeImage, validateFileSize, validateFileType } from '@/lib/imageUtils'
import { supabase } from '@/lib/supabase'

interface ImageUploaderProps {
  userId: string
  onUploadComplete: (imageUrl: string) => void
  onRemove: () => void
  currentImageUrl?: string | null
}

export function ImageUploader({
  userId,
  onUploadComplete,
  onRemove,
  currentImageUrl,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 파일 선택 핸들러
  const handleFileSelect = async (file: File) => {
    setError(null)

    // 파일 타입 검증
    if (!validateFileType(file)) {
      setError('jpg, png, gif, webp 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 검증
    if (!validateFileSize(file)) {
      setError('파일이 너무 큽니다. (최대 5MB)')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // 이미지 리사이징
      const resizedFile = await resizeImage(file, 1920)

      // 파일명 생성: 사용자ID/날짜-파일명
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const timestamp = Date.now()
      const fileExtension = resizedFile.name.split('.').pop()
      const fileName = `${date}-${timestamp}.${fileExtension}`
      const filePath = `${userId}/${fileName}`

      // 미리보기 설정
      const previewUrl = URL.createObjectURL(resizedFile)
      setPreview(previewUrl)

      // Supabase Storage에 업로드
      const { data, error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, resizedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // 공개 URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from('blog-images').getPublicUrl(filePath)

      setUploadProgress(100)
      onUploadComplete(publicUrl)

      // 미리보기 URL 정리
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    } catch (err: any) {
      console.error('이미지 업로드 실패:', err)
      setError(err.message || '이미지 업로드에 실패했습니다.')
      setPreview(null)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // 파일 입력 변경 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // 이미지 삭제
  const handleRemove = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onRemove()
  }

  // 클릭하여 파일 선택
  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">대표 이미지</label>

      {preview ? (
        // 미리보기 모드
        <div className="relative group">
          <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
            <img
              src={preview}
              alt="대표 이미지 미리보기"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {uploading && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                업로드 중... {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      ) : (
        // 업로드 영역
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />

          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                <div className="w-full max-w-xs">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    업로드 중... {uploadProgress}%
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-gray-100 rounded-full">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    이미지를 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, GIF, WEBP (최대 5MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  )
}








