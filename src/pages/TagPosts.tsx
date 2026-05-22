import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
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
}

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

export function TagPosts() {
  const { tagName } = useParams<{ tagName: string }>()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tagName) {
      fetchTagPosts(decodeURIComponent(tagName))
    }
  }, [tagName])

  const fetchTagPosts = async (tag: string) => {
    try {
      setLoading(true)

      // 태그로 게시글 검색
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, created_at, user_id, thumbnail_url, view_count, tags')
        .contains('tags', [tag])
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }

      // 좋아요 수 집계
      const postIds = data.map((post: any) => post.id)
      const userIds = [...new Set(data.map((post: any) => post.user_id))]

      let likeCounts: Record<string, number> = {}
      let profilesMap: Record<string, { username: string | null; avatar_url: string | null }> = {}

      // 좋아요 수 집계
      const { data: likesData } = await supabase
        .from('likes')
        .select('post_id')
        .in('post_id', postIds)

      likesData?.forEach((like: any) => {
        likeCounts[like.post_id] = (likeCounts[like.post_id] || 0) + 1
      })

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

      const processedData = data.map((post: any) => ({
        ...post,
        view_count: post.view_count || 0,
        like_count: likeCounts[post.id] || 0,
        profiles: profilesMap[post.user_id] || null,
      }))

      setPosts(processedData)
    } catch (error) {
      console.error('태그 게시글 불러오기 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const truncateContent = (content: string, maxLength: number = 100) => {
    const text = stripHtmlTags(content)
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getTagColor = (index: number) => {
    return tagColors[index % tagColors.length]
  }

  const decodedTagName = tagName ? decodeURIComponent(tagName) : ''

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          태그: <span className="text-primary">#{decodedTagName}</span>
        </h1>
        <p className="text-muted-foreground">총 {posts.length}개의 글</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 bg-white rounded-lg">
          이 태그로 작성된 글이 없습니다.
        </div>
      ) : (
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
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span>{post.like_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{post.view_count}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

