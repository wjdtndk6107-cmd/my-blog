import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Upload } from 'lucide-react'
import { Edit2, Camera, Mail, Calendar, FileText, Heart, Eye } from 'lucide-react'
import { resizeImage, validateFileSize, validateFileType } from '@/lib/imageUtils'

interface Profile {
  username: string | null
  avatar_url: string | null
  banner_url: string | null
  bio: string | null
  detail_bio: string | null
  blog_url: string | null
  email_public: boolean
  created_at: string
}

interface Stats {
  postCount: number
  totalLikes: number
  totalViews: number
}

export function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({ postCount: 0, totalLikes: 0, totalViews: 0 })
  const [myPosts, setMyPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // 편집 폼 상태
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editDetailBio, setEditDetailBio] = useState('')
  const [editBlogUrl, setEditBlogUrl] = useState('')
  const [editEmailPublic, setEditEmailPublic] = useState(false)
  const [editBannerUrl, setEditBannerUrl] = useState<string | null>(null)
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDraggingBanner, setIsDraggingBanner] = useState(false)
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false)

  const bannerFileInputRef = useRef<HTMLInputElement>(null)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  // 숫자 포맷팅 함수 (예: 72900 -> 72.9K)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  useEffect(() => {
    if (!user) return
    fetchProfile()
    fetchStats()
    fetchMyPosts()
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, banner_url, bio, detail_bio, blog_url, email_public, created_at')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
      
      // 편집 폼 초기화
      setEditUsername(data.username || '')
      setEditBio(data.bio || '')
      setEditDetailBio(data.detail_bio || '')
      setEditBlogUrl(data.blog_url || '')
      setEditEmailPublic(data.email_public || false)
      setEditBannerUrl(data.banner_url)
      setEditAvatarUrl(data.avatar_url)
    } catch (error) {
      console.error('프로필 불러오기 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!user) return

    try {
      // 작성한 글 수와 조회수 총합
      const { data: myPosts } = await supabase
        .from('posts')
        .select('id, view_count')
        .eq('user_id', user.id)

      const postCount = myPosts?.length || 0
      let totalViews = 0
      if (myPosts && myPosts.length > 0) {
        totalViews = myPosts.reduce((sum, post) => sum + (post.view_count || 0), 0)
      }

      // 받은 좋아요 총합 (내가 작성한 글들에 받은 좋아요)
      let totalLikes = 0
      if (myPosts && myPosts.length > 0) {
        const postIds = myPosts.map((p) => p.id)
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds)
        totalLikes = count || 0
      }

      setStats({
        postCount: postCount,
        totalLikes: totalLikes,
        totalViews: totalViews,
      })
    } catch (error) {
      console.error('통계 정보 불러오기 실패:', error)
    }
  }

  const fetchMyPosts = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, created_at, thumbnail_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error
      setMyPosts(data || [])
    } catch (error) {
      console.error('내 게시글 불러오기 실패:', error)
    }
  }

  const handleBannerUpload = async (file: File) => {
    if (!user) return

    setUploading(true)
    try {
      if (!validateFileType(file)) {
        alert('jpg, png, gif, webp 파일만 업로드 가능합니다.')
        return
      }

      if (!validateFileSize(file)) {
        alert('파일이 너무 큽니다. (최대 5MB)')
        return
      }

      const resizedFile = await resizeImage(file, 1920)
      const date = new Date().toISOString().split('T')[0]
      const timestamp = Date.now()
      const fileExtension = resizedFile.name.split('.').pop()
      const fileName = `banner-${date}-${timestamp}.${fileExtension}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, resizedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('blog-images').getPublicUrl(filePath)

      setEditBannerUrl(publicUrl)
    } catch (error: any) {
      console.error('배너 업로드 실패:', error)
      alert(error.message || '배너 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user) return

    setUploading(true)
    try {
      if (!validateFileType(file)) {
        alert('jpg, png, gif, webp 파일만 업로드 가능합니다.')
        return
      }

      if (!validateFileSize(file)) {
        alert('파일이 너무 큽니다. (최대 5MB)')
        return
      }

      const resizedFile = await resizeImage(file, 400)
      const date = new Date().toISOString().split('T')[0]
      const timestamp = Date.now()
      const fileExtension = resizedFile.name.split('.').pop()
      const fileName = `avatar-${date}-${timestamp}.${fileExtension}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, resizedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('blog-images').getPublicUrl(filePath)

      setEditAvatarUrl(publicUrl)
    } catch (error: any) {
      console.error('프로필 사진 업로드 실패:', error)
      alert(error.message || '프로필 사진 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    // 유효성 검사
    const trimmedUsername = editUsername.trim()
    if (trimmedUsername && (trimmedUsername.length < 2 || trimmedUsername.length > 20)) {
      alert('닉네임은 2~20자 사이여야 합니다.')
      return
    }

    if (editBio.length > 50) {
      alert('한 줄 소개는 50자 이하여야 합니다.')
      return
    }

    if (editDetailBio.length > 500) {
      alert('상세 소개는 500자 이하여야 합니다.')
      return
    }

    setUploading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: trimmedUsername || null,
          bio: editBio.trim() || null,
          detail_bio: editDetailBio.trim() || null,
          blog_url: editBlogUrl.trim() || null,
          email_public: editEmailPublic,
          banner_url: editBannerUrl,
          avatar_url: editAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      await fetchProfile()
      setIsEditDialogOpen(false)
      alert('프로필이 수정되었습니다.')
      window.location.reload() // 새로고침
    } catch (error: any) {
      console.error('프로필 저장 실패:', error)
      alert(error.message || '프로필 저장에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent, type: 'banner' | 'avatar') => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'banner') {
      setIsDraggingBanner(true)
    } else {
      setIsDraggingAvatar(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent, type: 'banner' | 'avatar') => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'banner') {
      setIsDraggingBanner(false)
    } else {
      setIsDraggingAvatar(false)
    }
  }

  const handleDrop = (e: React.DragEvent, type: 'banner' | 'avatar') => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'banner') {
      setIsDraggingBanner(false)
    } else {
      setIsDraggingAvatar(false)
    }

    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (type === 'banner') {
        handleBannerUpload(file)
      } else {
        handleAvatarUpload(file)
      }
    }
  }

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleBannerUpload(file)
    }
  }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleAvatarUpload(file)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-500">프로필을 불러올 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-lg relative">
          {/* 배너 영역 */}
          <div className="relative h-48 md:h-56 overflow-hidden bg-gradient-to-r from-blue-100 via-blue-50 to-purple-50 rounded-t-2xl">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt="배너"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full relative" 
                   style={{
                     background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #f3e8ff 100%)'
                   }}
              >
                {/* 구름 패턴 효과 */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl"></div>
                  <div className="absolute top-20 right-20 w-24 h-24 bg-white rounded-full blur-xl"></div>
                  <div className="absolute bottom-10 left-1/4 w-40 h-40 bg-white rounded-full blur-2xl"></div>
                  <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-white rounded-full blur-xl"></div>
                </div>
              </div>
            )}
            
            {/* 편집 버튼 */}
            <div className="absolute top-4 right-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="bg-white hover:bg-gray-50 border-gray-300 shadow-sm rounded-lg"
              >
                <Edit2 className="h-4 w-4 mr-1.5" />
                편집
              </Button>
            </div>

          </div>

          {/* 프로필 정보 영역 */}
          <div className="pb-6 px-6 md:px-8">
            <div className="text-center mb-6">
              {/* 프로필 사진 영역 - 닉네임 위에 배치 */}
              <div className={`relative inline-block -mt-20 mb-4 ${isEditDialogOpen ? 'z-0' : 'z-10'}`}>
                <div className="relative group">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden relative">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-3xl md:text-4xl">
                        {profile.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  
                  {/* 프로필 사진 변경 버튼 (호버 시) */}
                  {!isEditDialogOpen && (
                    <button
                      onClick={() => setIsEditDialogOpen(true)}
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Camera className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </button>
                  )}
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {profile.username || '사용자'}
              </h1>
              
              {profile.bio && (
                <p className="text-gray-700 text-base md:text-lg mb-4 max-w-2xl mx-auto leading-relaxed">
                  {profile.bio}
                </p>
              )}
              
              {profile.email_public && user?.email && (
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <Calendar className="h-4 w-4" />
                <span>
                  가입일: {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>

            {/* 통계 정보 */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 mb-6">
              <div className="text-center">
                <div className="text-gray-900 mb-1">
                  <span className="text-3xl md:text-4xl font-bold">{formatNumber(stats.totalLikes)}</span>
                </div>
                <p className="text-sm text-gray-500 font-normal">좋아요</p>
              </div>
              <div className="text-center">
                <div className="text-gray-900 mb-1">
                  <span className="text-3xl md:text-4xl font-bold">{formatNumber(stats.postCount)}</span>
                </div>
                <p className="text-sm text-gray-500 font-normal">글</p>
              </div>
              <div className="text-center">
                <div className="text-gray-900 mb-1">
                  <span className="text-3xl md:text-4xl font-bold">{formatNumber(stats.totalViews)}</span>
                </div>
                <p className="text-sm text-gray-500 font-normal">조회수</p>
              </div>
            </div>

            {/* 프로필 편집 버튼 */}
            <div className="text-center border-t border-gray-200 pt-6">
              <Button onClick={() => setIsEditDialogOpen(true)} size="lg" className="px-8">
                <Edit2 className="h-4 w-4 mr-2" />
                프로필 편집
              </Button>
            </div>
          </div>
        </div>

        {/* 내가 작성한 글 목록 */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">내가 작성한 글</h2>
          {myPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-16 bg-white rounded-2xl shadow-md">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">아직 작성한 글이 없습니다.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/write')}
              >
                첫 글 작성하기
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/post/${post.id}`)}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1"
                >
                  {post.thumbnail_url && (
                    <img
                      src={post.thumbnail_url}
                      alt={post.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 프로필 편집 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>프로필 편집</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 배너 이미지 편집 */}
            <div>
              <Label>배경 이미지</Label>
              <div className="mt-2">
                <div
                  className={`relative h-48 rounded-lg overflow-hidden border-2 ${
                    isDraggingBanner ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  } cursor-pointer transition-colors`}
                  onDragOver={(e) => handleDragOver(e, 'banner')}
                  onDragLeave={(e) => handleDragLeave(e, 'banner')}
                  onDrop={(e) => handleDrop(e, 'banner')}
                  onClick={() => bannerFileInputRef.current?.click()}
                >
                  {editBannerUrl ? (
                    <img
                      src={editBannerUrl}
                      alt="배너"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full relative"
                         style={{
                           background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #f3e8ff 100%)'
                         }}
                    >
                      {/* 구름 패턴 효과 */}
                      <div className="absolute inset-0 opacity-30">
                        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl"></div>
                        <div className="absolute top-20 right-20 w-24 h-24 bg-white rounded-full blur-xl"></div>
                        <div className="absolute bottom-10 left-1/4 w-40 h-40 bg-white rounded-full blur-2xl"></div>
                        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-white rounded-full blur-xl"></div>
                      </div>
                    </div>
                  )}
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleBannerFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      bannerFileInputRef.current?.click()
                    }}
                  >
                    배경 변경
                  </Button>
                  {isDraggingBanner && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <div className="text-blue-600 font-semibold flex items-center gap-2">
                        <Upload className="h-6 w-6" />
                        <span>이미지를 여기에 놓으세요</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 프로필 사진 편집 */}
            <div>
              <Label>프로필 사진</Label>
              <div className="mt-2 flex flex-col items-center">
                <div
                  className={`relative w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden cursor-pointer transition-all ${
                    isDraggingAvatar ? 'ring-4 ring-blue-500' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, 'avatar')}
                  onDragLeave={(e) => handleDragLeave(e, 'avatar')}
                  onDrop={(e) => handleDrop(e, 'avatar')}
                  onClick={() => avatarFileInputRef.current?.click()}
                >
                  {editAvatarUrl ? (
                    <img
                      src={editAvatarUrl}
                      alt="프로필"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-4xl">
                      {editUsername?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  {isDraggingAvatar && (
                    <div className="absolute inset-0 bg-blue-500/50 flex items-center justify-center rounded-full">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  사진 변경
                </Button>
              </div>
            </div>

            {/* 닉네임 */}
            <div>
              <Label htmlFor="username">닉네임 (2~20자)</Label>
              <Input
                id="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="닉네임을 입력하세요"
                minLength={2}
                maxLength={20}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {editUsername.length}/20
              </p>
            </div>

            {/* 한 줄 소개 */}
            <div>
              <Label htmlFor="bio">한 줄 소개 (50자)</Label>
              <Input
                id="bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="자신을 소개해주세요"
                maxLength={50}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {editBio.length}/50
              </p>
            </div>

            {/* 상세 소개 */}
            <div>
              <Label htmlFor="detail-bio">상세 소개 (500자)</Label>
              <Textarea
                id="detail-bio"
                value={editDetailBio}
                onChange={(e) => setEditDetailBio(e.target.value)}
                placeholder="자신에 대해 더 자세히 소개해주세요"
                maxLength={500}
                rows={5}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {editDetailBio.length}/500
              </p>
            </div>

            {/* 내 블로그 주소 */}
            <div>
              <Label htmlFor="blog-url">내 블로그 주소</Label>
              <Input
                id="blog-url"
                value={editBlogUrl}
                onChange={(e) => setEditBlogUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
                className="mt-2"
              />
            </div>

            {/* 이메일 공개 설정 */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-public">이메일 공개</Label>
                <p className="text-sm text-gray-500">
                  프로필에 이메일을 표시할지 선택하세요
                </p>
              </div>
              <Switch
                id="email-public"
                checked={editEmailPublic}
                onCheckedChange={setEditEmailPublic}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                // 폼 초기화
                setEditUsername(profile?.username || '')
                setEditBio(profile?.bio || '')
                setEditDetailBio(profile?.detail_bio || '')
                setEditBlogUrl(profile?.blog_url || '')
                setEditEmailPublic(profile?.email_public || false)
                setEditBannerUrl(profile?.banner_url)
                setEditAvatarUrl(profile?.avatar_url)
              }}
            >
              취소
            </Button>
            <Button onClick={handleSaveProfile} disabled={uploading}>
              {uploading ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
