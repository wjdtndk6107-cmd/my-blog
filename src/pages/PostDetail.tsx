import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Edit, Trash2 } from 'lucide-react'
import { CommentSection } from '@/components/CommentSection'

interface Post {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
  tags: string[] | null
  thumbnail_url: string | null
  profiles: {
    id: string
    username: string | null
    avatar_url: string | null
  } | null
}

export function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchPost(id)
      fetchLikeStatus(id)
    }
  }, [id, user])

  const fetchPost = async (postId: string) => {
    try {
      setLoading(true)
      
      // 조회수 증가 (비동기로 처리, 실패해도 게시글은 불러옴)
      const { data: currentPost } = await supabase
        .from('posts')
        .select('view_count')
        .eq('id', postId)
        .single()

      if (currentPost) {
        supabase
          .from('posts')
          .update({ view_count: (currentPost.view_count || 0) + 1 })
          .eq('id', postId)
          .then(() => {})
      }

      // 게시글 조회 (RLS 정책에 따라 공개 게시글 또는 본인 게시글만 조회됨)
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('id, title, content, created_at, updated_at, user_id, tags, thumbnail_url, is_public')
        .eq('id', postId)
        .single()

      if (postError) {
        console.error('게시글 조회 에러:', postError)
        throw postError
      }

      if (!postData) {
        console.error('게시글 데이터가 없습니다.')
        setLoading(false)
        return
      }

      // 프로필 정보 별도 조회
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', postData.user_id)
        .single()

      if (profileError) {
        console.error('프로필 조회 에러:', profileError)
        // 프로필 조회 실패해도 게시글은 표시
      }

      // 데이터 결합
      setPost({
        ...postData,
        profiles: profileData || null,
      })
    } catch (error: any) {
      console.error('게시글 불러오기 실패:', error)
      console.error('에러 상세:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchLikeStatus = async (postId: string) => {
    try {
      // 좋아요 수 조회
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('id, user_id')
        .eq('post_id', postId)

      if (likesError) throw likesError

      setLikeCount(likesData?.length || 0)

      // 현재 사용자가 좋아요를 눌렀는지 확인
      if (user) {
        const userLike = likesData?.find((like) => like.user_id === user.id)
        setIsLiked(!!userLike)
      }
    } catch (error) {
      console.error('좋아요 상태 불러오기 실패:', error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      navigate('/login')
      return
    }

    if (!id) return

    try {
      if (isLiked) {
        // 좋아요 제거
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id)

        if (error) throw error
        setIsLiked(false)
        setLikeCount((prev) => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가 (unique constraint로 중복 방지)
        const { error } = await supabase
          .from('likes')
          .insert([{ post_id: id, user_id: user.id }])

        if (error) {
          // 이미 좋아요를 누른 경우 무시
          if (error.code === '23505') {
            setIsLiked(true)
            return
          }
          throw error
        }
        setIsLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (error: any) {
      console.error('좋아요 처리 실패:', error)
      if (error.code !== '23505') {
        alert('좋아요 처리에 실패했습니다.')
      }
    }
  }

  const handleDelete = async () => {
    if (!id || !user || post?.user_id !== user.id) return

    if (!confirm('정말 삭제하시겠습니까?')) return

    setIsDeleting(true)

    try {
      const { error } = await supabase.from('posts').delete().eq('id', id)

      if (error) throw error
      navigate('/')
    } catch (error) {
      console.error('게시글 삭제 실패:', error)
      alert('게시글 삭제에 실패했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-gray-500 mb-4">게시글을 찾을 수 없습니다.</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const isAuthor = user && post.user_id === user.id

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <article className="bg-white rounded-lg shadow-md p-8">
        {/* 헤더 영역 */}
        <header className="mb-8 pb-6 border-b">
          {/* 제목 */}
          <h1 className="text-4xl font-bold mb-6 text-gray-900">{post.title}</h1>

          {/* 썸네일 이미지 */}
          {post.thumbnail_url && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <img
                src={post.thumbnail_url}
                alt={post.title}
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}

          {/* 작성자 정보 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link
                to={`/user/${post.user_id}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                {post.profiles?.avatar_url ? (
                  <img
                    src={post.profiles.avatar_url}
                    alt={post.profiles.username || '익명'}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                    {post.profiles?.username?.[0]?.toUpperCase() || '익'}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">
                    {post.profiles?.username || '익명'}
                  </div>
                  <div className="text-sm text-gray-500">{formatDate(post.created_at)}</div>
                </div>
              </Link>
            </div>
          </div>

          {/* 태그들 */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag, index) => (
                <Link key={tag} to={`/tag/${encodeURIComponent(tag)}`}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* 본문 */}
        <div
          className="prose prose-lg max-w-none mb-8 prose-headings:font-bold prose-strong:font-bold prose-em:italic prose-p:text-gray-800 prose-p:leading-relaxed prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-blue-600 prose-a:no-underline prose-a:hover:underline prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-img:rounded-lg prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* 하단 버튼들 */}
        <div className="flex items-center justify-between pt-6 border-t">
          {/* 좋아요 버튼 */}
          <Button
            variant={isLiked ? 'default' : 'outline'}
            onClick={handleLike}
            className="flex items-center gap-2"
          >
            <Heart className={isLiked ? 'fill-current' : ''} />
            <span>{likeCount}</span>
          </Button>

          {/* 작성자만 보이는 수정/삭제 버튼 */}
          {isAuthor && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(`/edit/${id}`)}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                수정
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          )}
        </div>
      </article>

      {/* 댓글 섹션 */}
      <CommentSection postId={id!} />
    </div>
  )
}
