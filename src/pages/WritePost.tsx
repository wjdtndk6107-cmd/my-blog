import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TiptapEditor } from '@/components/TiptapEditor'
import { ImageUploader } from '@/components/ImageUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { X, Globe, Lock, Link as LinkIcon } from 'lucide-react'

// 제목을 slug로 변환하는 함수
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣-]/g, '') // 특수문자 제거 (한글 유지)
    .replace(/[\s_-]+/g, '-') // 공백을 하이픈으로
    .replace(/^-+|-+$/g, '') // 앞뒤 하이픈 제거
    .slice(0, 100) // 최대 100자
}

export function WritePost() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null)

  // 제목이 변경되면 자동으로 slug 생성
  useEffect(() => {
    if (title) {
      setSlug(generateSlug(title))
    } else {
      setSlug('')
    }
  }, [title])

  // 태그 추가
  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault()
      const newTag = tagInput.trim().replace(/,/g, '')
      if (newTag && !tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag])
        setTagInput('')
      }
    }
  }

  // 태그 입력 변경 (쉼표가 있으면 자동 추가)
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.includes(',')) {
      const newTag = value.replace(/,/g, '').trim()
      if (newTag && !tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag])
        setTagInput('')
      }
    } else {
      setTagInput(value)
    }
  }

  // 태그 삭제
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // 게시글 발행
  const handlePublish = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    if (!content.trim() || content === '<p></p>') {
      alert('내용을 입력해주세요.')
      return
    }

    if (!user) return

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
            user_id: user.id,
            tags: tags,
            is_public: isPublic,
            slug: slug || generateSlug(title),
            thumbnail_url: thumbnailImage,
          },
        ])
        .select()
        .single()

      if (error) throw error

      navigate(`/post/${data.id}`)
    } catch (error) {
      console.error('게시글 작성 실패:', error)
      alert('게시글 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 취소
  const handleCancel = () => {
    if (title.trim() || content.trim()) {
      const confirmed = window.confirm(
        '작성 중인 내용이 있습니다. 정말 나가시겠습니까?'
      )
      if (!confirmed) return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">글쓰기</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              취소
            </Button>
            <Button onClick={handlePublish} disabled={loading}>
              {loading ? '발행 중...' : '발행하기'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* 제목 입력 */}
          <div className="space-y-2 my-2 mb-3">
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="text-3xl font-bold border-0 border-b-2 border-gray-200 rounded-none px-0 py-6 focus-visible:ring-0 focus-visible:border-gray-400 bg-transparent placeholder:text-gray-400"
            />
          </div>

          {/* 대표 이미지 업로드 */}
          {user && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <ImageUploader
                userId={user.id}
                onUploadComplete={(imageUrl) => setThumbnailImage(imageUrl)}
                onRemove={() => setThumbnailImage(null)}
                currentImageUrl={thumbnailImage}
              />
            </div>
          )}

          {/* 에디터 */}
          <div className="space-y-2">
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="내용을 입력하세요..."
            />
          </div>

          {/* 설정 옵션 카드 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            {/* 태그 입력 */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                태그 (쉼표로 구분, 최대 5개)
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="px-3 py-1 text-sm flex items-center gap-1"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                type="text"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleTagAdd}
                placeholder={
                  tags.length >= 5
                    ? '태그는 최대 5개까지 가능합니다'
                    : '태그를 입력하고 쉼표 또는 Enter를 누르세요'
                }
                disabled={tags.length >= 5}
                className="w-full"
              />
            </div>

            {/* 공개/비공개 설정 */}
            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="h-5 w-5 text-green-600" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    {isPublic ? '공개' : '비공개'}
                  </Label>
                  <p className="text-xs text-gray-500">
                    {isPublic
                      ? '모든 사람이 이 글을 볼 수 있습니다'
                      : '나만 이 글을 볼 수 있습니다'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
                aria-label="공개 설정"
              />
            </div>

            {/* URL 슬러그 */}
            <div className="space-y-3 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium text-gray-700">
                  URL 주소 (자동 생성)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">/post/</span>
                <Input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-slug"
                  className="flex-1"
                />
              </div>
              {slug && (
                <p className="text-xs text-gray-500">
                  미리보기: /post/{slug}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
