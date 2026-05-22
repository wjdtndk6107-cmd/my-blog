import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getKoreaTimeAsUTC } from '@/lib/utils'
import { TiptapEditor } from '@/components/TiptapEditor'
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

export function EditPost() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (id && user) {
      fetchPost(id)
    } else if (id && !user) {
      // 로그인하지 않은 경우
      setLoading(false)
    }
  }, [id, user])

  // 제목이 변경되면 자동으로 slug 생성
  useEffect(() => {
    if (title) {
      setSlug(generateSlug(title))
    }
  }, [title])

  const fetchPost = async (postId: string) => {
    try {
      if (!user) {
        setUnauthorized(true)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, user_id, tags, is_public, slug')
        .eq('id', postId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // 게시글을 찾을 수 없음
          setNotFound(true)
        } else {
          throw error
        }
        setLoading(false)
        return
      }

      if (!data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // 작성자 권한 확인
      if (data.user_id !== user.id) {
        setUnauthorized(true)
        setLoading(false)
        return
      }

      // 기존 내용 자동 채우기
      setTitle(data.title)
      setContent(data.content)
      setTags(data.tags || [])
      setIsPublic(data.is_public ?? true)
      setSlug(data.slug || generateSlug(data.title))
    } catch (error) {
      console.error('게시글 불러오기 실패:', error)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

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

  // 게시글 수정
  const handleUpdate = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    if (!content.trim() || content === '<p></p>') {
      alert('내용을 입력해주세요.')
      return
    }

    if (!id || !user) return

    setSaving(true)

    try {
      // Supabase에 수정 내용 업데이트
      // updated_at을 한국 시간 기준으로 명시적으로 설정
      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content: content.trim(),
          tags: tags,
          is_public: isPublic,
          slug: slug || generateSlug(title),
          updated_at: getKoreaTimeAsUTC(), // 한국 시간을 UTC로 변환하여 저장
        })
        .eq('id', id)
        .eq('user_id', user.id) // 보안: 작성자만 수정 가능하도록 추가 체크

      if (error) {
        if (error.code === 'PGRST116') {
          alert('게시글을 찾을 수 없습니다.')
        } else {
          throw error
        }
        return
      }

      // 완료되면 글 보는 페이지로 이동
      navigate(`/post/${id}`)
    } catch (error: any) {
      console.error('게시글 수정 실패:', error)
      alert('게시글 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 취소
  const handleCancel = () => {
    if (title.trim() || content.trim()) {
      const confirmed = window.confirm(
        '수정 중인 내용이 있습니다. 정말 나가시겠습니까?'
      )
      if (!confirmed) return
    }
    if (id) {
      navigate(`/post/${id}`)
    } else {
      navigate('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">글을 수정하려면 로그인이 필요합니다.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/login')}>로그인하기</Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                홈으로
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">권한이 없습니다</h2>
            <p className="text-gray-600 mb-6">
              이 글을 수정할 권한이 없습니다. 작성자만 수정할 수 있습니다.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/')}>홈으로</Button>
              {id && (
                <Button variant="outline" onClick={() => navigate(`/post/${id}`)}>
                  글 보기
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">게시글을 찾을 수 없습니다</h2>
            <p className="text-gray-600 mb-6">요청하신 게시글이 존재하지 않거나 삭제되었습니다.</p>
            <Button onClick={() => navigate('/')}>홈으로</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">글 수정</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? '저장 중...' : '저장하기'}
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
