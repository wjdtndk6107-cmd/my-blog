import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatRelativeTime, stripHtmlTags } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PostCardSkeleton } from '@/components/PostCardSkeleton'
import { Heart, Eye } from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string
  created_at: string
  user_id: string
  thumbnail_url: string | null
  view_count: number
  tags: string[] | null
  profiles: {
    username: string | null
    avatar_url: string | null
  } | null
  like_count: number
  is_liked: boolean
}

type SortBy = 'latest' | 'popular'

const POSTS_PER_PAGE = 12

// 태그 색상 배열
const tagColors = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-teal-100 text-teal-800 border-teal-200',
]

export function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>('latest')
  const [page, setPage] = useState(0)
  const observerTarget = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(async (pageNum: number, sort: SortBy, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const from = pageNum * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1

      // 게시글 조회 (profiles는 별도로 조회)
      let query = supabase
        .from('posts')
        .select('id, title, content, created_at, user_id, thumbnail_url, view_count, tags', { count: 'exact' })

      // 정렬
      if (sort === 'latest') {
        query = query.order('created_at', { ascending: false })
      } else {
        // 인기순: 좋아요 수로 정렬
        // Supabase에서는 직접 계산이 어려우므로 클라이언트 측에서 정렬
        query = query.order('created_at', { ascending: false })
      }

      const { data, error, count } = await query.range(from, to)

      if (error) {
        console.error('게시글 조회 에러:', error)
        throw error
      }

      if (!data || data.length === 0) {
        if (reset) {
          setPosts([])
        }
        setHasMore(false)
        return
      }

      // 좋아요 수 집계
      const postIds = data.map((post: any) => post.id)
      const userIds = [...new Set(data.map((post: any) => post.user_id))]
      
      let likeCounts: Record<string, number> = {}
      let profilesMap: Record<string, { username: string | null; avatar_url: string | null }> = {}

      // 좋아요 수 집계 및 사용자 좋아요 상태 확인
      const { data: likesData } = await supabase
        .from('likes')
        .select('post_id, user_id')
        .in('post_id', postIds)

      likesData?.forEach((like: any) => {
        likeCounts[like.post_id] = (likeCounts[like.post_id] || 0) + 1
      })

      // 사용자가 좋아요를 누른 게시글 확인
      const userLikedPosts = new Set<string>()
      if (user && likesData) {
        likesData
          .filter((like: any) => like.user_id === user.id)
          .forEach((like: any) => {
            userLikedPosts.add(like.post_id)
          })
      }

      // 프로필 정보 조회
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds)

        profilesData?.forEach((profile: any) => {
          profilesMap[profile.id] = {
            username: profile.username,
            avatar_url: profile.avatar_url,
          }
        })
      }

      // 인기순 정렬을 위해 데이터 처리
      let processedData = data.map((post: any) => ({
        ...post,
        view_count: post.view_count || 0,
        like_count: likeCounts[post.id] || 0,
        is_liked: userLikedPosts.has(post.id),
        profiles: profilesMap[post.user_id] || null,
      }))

      if (sort === 'popular') {
        processedData = processedData.sort((a, b) => {
          return b.like_count - a.like_count
        })
      }

      if (reset) {
        setPosts(processedData)
      } else {
        setPosts((prev) => [...prev, ...processedData])
      }

      // 더 불러올 데이터가 있는지 확인
      setHasMore((count || 0) > to + 1)
    } catch (error) {
      console.error('게시글 불러오기 실패:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // 초기 로드 및 정렬 변경 시
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    fetchPosts(0, sortBy, true)
  }, [sortBy, fetchPosts])

  // 페이지 포커스 시 데이터 새로고침 (글 발행 후 돌아왔을 때)
  useEffect(() => {
    const handleFocus = () => {
      if (!loading && !loadingMore) {
        setPage(0)
        setHasMore(true)
        fetchPosts(0, sortBy, true)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [sortBy, loading, loadingMore, fetchPosts])

  // 무한 스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchPosts(nextPage, sortBy, false)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore, loading, page, sortBy, fetchPosts])

  const truncateContent = (content: string, maxLength: number = 100) => {
    const text = stripHtmlTags(content)
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getTagColor = (index: number) => {
    return tagColors[index % tagColors.length]
  }

  const handleLike = async (e: React.MouseEvent, postId: string, isLiked: boolean) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      alert('로그인이 필요합니다.')
      navigate('/login')
      return
    }

    try {
      if (isLiked) {
        // 좋아요 제거
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        if (error) throw error

        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, is_liked: false, like_count: Math.max(0, post.like_count - 1) }
              : post
          )
        )
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('likes')
          .insert([{ post_id: postId, user_id: user.id }])

        if (error) {
          if (error.code === '23505') {
            // 이미 좋아요를 누른 경우
            setPosts((prev) =>
              prev.map((post) =>
                post.id === postId ? { ...post, is_liked: true } : post
              )
            )
            return
          }
          throw error
        }

        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, is_liked: true, like_count: post.like_count + 1 }
              : post
          )
        )
      }
    } catch (error: any) {
      console.error('좋아요 처리 실패:', error)
      if (error.code !== '23505') {
        alert('좋아요 처리에 실패했습니다.')
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">최신 글</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('latest')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              sortBy === 'latest'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              sortBy === 'popular'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            인기순
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          아직 작성된 글이 없습니다.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/post/${post.id}`}
                className="group bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex flex-col"
              >
                {/* 대표 이미지 또는 그라데이션 배경 */}
                <div className="w-full h-48 relative overflow-hidden bg-gray-100">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt={post.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500" />
                  )}
                </div>

                {/* 카드 내용 */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* 제목 */}
                  <h2 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>

                  {/* 내용 미리보기 */}
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">
                    {truncateContent(post.content, 100)}
                  </p>

                  {/* 태그 */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={`text-xs ${getTagColor(index)}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 작성자 정보 및 날짜 */}
                  <div className="flex items-center justify-between mb-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      {post.profiles?.avatar_url ? (
                        <img
                          src={post.profiles.avatar_url}
                          alt={post.profiles.username || '익명'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                      )}
                      <span className="text-sm font-medium">
                        {post.profiles?.username || '익명'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(post.created_at)}
                    </span>
                  </div>

                  {/* 통계 정보 */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <button
                      onClick={(e) => handleLike(e, post.id, post.is_liked)}
                      className={`flex items-center gap-1 transition-colors ${
                        post.is_liked
                          ? 'text-red-500 hover:text-red-600'
                          : 'text-muted-foreground hover:text-red-500'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          post.is_liked ? 'fill-red-500 text-red-500' : ''
                        }`}
                      />
                      {post.is_liked ? (
                        <span className="text-red-500">{post.like_count}</span>
                      ) : (
                        <span>좋아요</span>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{post.view_count}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 무한 스크롤 감지 영역 */}
          {hasMore && (
            <div ref={observerTarget} className="mt-8">
              {loadingMore && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <PostCardSkeleton key={i} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
