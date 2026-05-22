import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatRelativeTime } from '@/lib/utils'
import { PostCardSkeleton } from '@/components/PostCardSkeleton'

interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  created_at: string
}

interface Post {
  id: string
  title: string
  content: string
  created_at: string
  tags: string[] | null
}

export function UserProfile() {
  const { userId } = useParams<{ userId: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      fetchProfile(userId)
      fetchUserPosts(userId)
    }
  }, [userId])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('프로필 불러오기 실패:', error)
    }
  }

  const fetchUserPosts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, created_at, tags')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('게시글 불러오기 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-500">사용자를 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 프로필 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-center gap-6">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username || 'Profile'}
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-3xl">
              {profile.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold mb-2">{profile.username || '익명'}</h1>
            <p className="text-gray-600">
              가입일: {new Date(profile.created_at).toLocaleDateString('ko-KR')}
            </p>
            <p className="text-sm text-gray-500 mt-1">작성한 글: {posts.length}개</p>
          </div>
        </div>
      </div>

      {/* 작성한 글 목록 */}
      <div>
        <h2 className="text-2xl font-bold mb-6">작성한 글</h2>
        {posts.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-white rounded-lg">
            아직 작성한 글이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/post/${post.id}`}
                className="group bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex flex-col"
              >
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">
                    {post.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(post.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}








