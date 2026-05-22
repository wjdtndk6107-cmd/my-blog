import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Heart, Edit, Trash2, Reply } from 'lucide-react'

interface Comment {
  id: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
  parent_id: string | null
  profiles: {
    id: string
    username: string | null
    avatar_url: string | null
  } | null
  like_count: number
  is_liked: boolean
  replies?: Comment[]
}

interface CommentSectionProps {
  postId: string
}

export function CommentSection({ postId }: CommentSectionProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(20)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const replyTextareaRefs = useRef<Record<string, HTMLTextAreaElement>>({})

  useEffect(() => {
    fetchComments()

    // 실시간 구독 설정
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // 새 댓글 추가
            fetchCommentWithProfile(payload.new.id).then((newComment) => {
              if (newComment) {
                if (newComment.parent_id) {
                  // 답글인 경우 해당 댓글의 replies에 추가
                  setComments((prev) =>
                    prev.map((c) => {
                      if (c.id === newComment.parent_id) {
                        return {
                          ...c,
                          replies: [...(c.replies || []), newComment],
                        }
                      }
                      return c
                    })
                  )
                } else {
                  // 일반 댓글인 경우 목록에 추가
                  setComments((prev) => [newComment, ...prev])
                }
              }
            })
          } else if (payload.eventType === 'UPDATE') {
            // 댓글 수정
            fetchCommentWithProfile(payload.new.id).then((updatedComment) => {
              if (updatedComment) {
                updateCommentInTree(updatedComment)
              }
            })
          } else if (payload.eventType === 'DELETE') {
            // 댓글 삭제
            setComments((prev) => {
              const removeFromTree = (list: Comment[]): Comment[] => {
                return list
                  .filter((c) => c.id !== payload.old.id)
                  .map((c) => ({
                    ...c,
                    replies: c.replies ? removeFromTree(c.replies) : undefined,
                  }))
              }
              return removeFromTree(prev)
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId])

  const updateCommentInTree = (updatedComment: Comment) => {
    setComments((prev) => {
      const updateInTree = (list: Comment[]): Comment[] => {
        return list.map((c) => {
          if (c.id === updatedComment.id) {
            return updatedComment
          }
          if (c.replies) {
            return {
              ...c,
              replies: updateInTree(c.replies),
            }
          }
          return c
        })
      }
      return updateInTree(prev)
    })
  }

  const fetchCommentWithProfile = async (commentId: string): Promise<Comment | null> => {
    try {
      // 댓글과 프로필 정보 조회
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('id, content, created_at, updated_at, user_id, parent_id')
        .eq('id', commentId)
        .single()

      if (commentError || !commentData) return null

      // 프로필 정보 조회
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', commentData.user_id)
        .single()

      // 좋아요 수 조회
      const { data: likesData } = await supabase
        .from('comment_likes')
        .select('user_id')
        .eq('comment_id', commentId)

      const likeCount = likesData?.length || 0
      const isLiked = user ? likesData?.some((like) => like.user_id === user.id) || false : false

      return {
        ...commentData,
        profiles: profileData || null,
        like_count: likeCount,
        is_liked: isLiked,
      }
    } catch (error) {
      console.error('댓글 조회 실패:', error)
      return null
    }
  }

  const fetchComments = async () => {
    try {
      setLoading(true)
      // 모든 댓글 조회 (답글 포함)
      const { data: allCommentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, content, created_at, updated_at, user_id, parent_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })

      if (commentsError) throw commentsError

      if (!allCommentsData || allCommentsData.length === 0) {
        setComments([])
        setLoading(false)
        return
      }

      // 각 댓글에 대해 프로필과 좋아요 정보 조회
      const commentsWithProfiles = await Promise.all(
        allCommentsData.map(async (comment) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', comment.user_id)
            .single()

          const { data: likesData } = await supabase
            .from('comment_likes')
            .select('user_id')
            .eq('comment_id', comment.id)

          const likeCount = likesData?.length || 0
          const isLiked = user
            ? likesData?.some((like) => like.user_id === user.id) || false
            : false

          return {
            ...comment,
            profiles: profileData || null,
            like_count: likeCount,
            is_liked: isLiked,
            replies: [],
          }
        })
      )

      // 댓글 트리 구조 생성
      const commentMap = new Map<string, Comment>()
      const rootComments: Comment[] = []

      // 먼저 모든 댓글을 맵에 추가
      commentsWithProfiles.forEach((comment) => {
        commentMap.set(comment.id, comment)
      })

      // 트리 구조 생성
      commentsWithProfiles.forEach((comment) => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id)
          if (parent) {
            // 답글의 답글인 경우 (2단계까지만)
            if (parent.parent_id) {
              // 부모가 이미 답글인 경우, 같은 레벨에 추가
              const grandParent = commentMap.get(parent.parent_id)
              if (grandParent) {
                if (!grandParent.replies) grandParent.replies = []
                grandParent.replies.push(comment)
              }
            } else {
              // 부모가 일반 댓글인 경우
              if (!parent.replies) parent.replies = []
              parent.replies.push(comment)
            }
          }
        } else {
          rootComments.push(comment)
        }
      })

      // 답글도 시간순 정렬
      const sortReplies = (comment: Comment): Comment => {
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: comment.replies
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map(sortReplies),
          }
        }
        return comment
      }

      const sortedComments = rootComments
        .slice(0, visibleCount)
        .map(sortReplies)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setComments(sortedComments)
    } catch (error) {
      console.error('댓글 불러오기 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      navigate('/login')
      return
    }

    if (!commentText.trim()) {
      alert('댓글을 입력해주세요.')
      return
    }

    if (commentText.length > 1000) {
      alert('댓글은 최대 1000자까지 입력 가능합니다.')
      return
    }

    try {
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
            content: commentText.trim(),
          },
        ])
        .select()
        .single()

      if (error) throw error

      if (newComment) {
        // 새로 작성한 댓글을 즉시 목록에 추가
        const newCommentWithProfile = await fetchCommentWithProfile(newComment.id)
        if (newCommentWithProfile) {
          setComments((prev) => [newCommentWithProfile, ...prev])
        }
      }

      setCommentText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('댓글 작성 실패:', error)
      alert('댓글 작성에 실패했습니다.')
    }
  }

  const handleReply = async (parentId: string, parentUsername: string) => {
    if (!user) {
      alert('로그인이 필요합니다.')
      navigate('/login')
      return
    }

    const replyContent = replyText[parentId] || ''
    const content = replyContent.trim()

    if (!content) {
      alert('답글을 입력해주세요.')
      return
    }

    if (content.length > 1000) {
      alert('답글은 최대 1000자까지 입력 가능합니다.')
      return
    }

    try {
      // 부모 댓글의 parent_id 확인 (답글의 답글인지 확인)
      const parentComment = findCommentInTree(comments, parentId)
      const actualParentId = parentComment?.parent_id || parentId

      const { data: newReply, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
            content: content,
            parent_id: actualParentId,
          },
        ])
        .select()
        .single()

      if (error) throw error

      if (newReply) {
        // 새로 작성한 답글을 즉시 목록에 추가
        const newReplyWithProfile = await fetchCommentWithProfile(newReply.id)
        if (newReplyWithProfile) {
          setComments((prev) => {
            const addReplyToTree = (list: Comment[]): Comment[] => {
              return list.map((c) => {
                if (c.id === actualParentId) {
                  return {
                    ...c,
                    replies: [...(c.replies || []), newReplyWithProfile],
                  }
                }
                if (c.replies) {
                  return {
                    ...c,
                    replies: addReplyToTree(c.replies),
                  }
                }
                return c
              })
            }
            return addReplyToTree(prev)
          })
        }
      }

      setReplyText((prev) => ({ ...prev, [parentId]: '' }))
      setReplyingToId(null)
      if (replyTextareaRefs.current[parentId]) {
        replyTextareaRefs.current[parentId].style.height = 'auto'
      }
    } catch (error) {
      console.error('답글 작성 실패:', error)
      alert('답글 작성에 실패했습니다.')
    }
  }

  const findCommentInTree = (list: Comment[], id: string): Comment | null => {
    for (const comment of list) {
      if (comment.id === id) return comment
      if (comment.replies) {
        const found = findCommentInTree(comment.replies, id)
        if (found) return found
      }
    }
    return null
  }

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) {
      alert('댓글을 입력해주세요.')
      return
    }

    if (editText.length > 1000) {
      alert('댓글은 최대 1000자까지 입력 가능합니다.')
      return
    }

    try {
      const { data: updatedComment, error } = await supabase
        .from('comments')
        .update({ content: editText.trim() })
        .eq('id', commentId)
        .eq('user_id', user?.id)
        .select()
        .single()

      if (error) throw error

      if (updatedComment) {
        // 수정된 댓글 정보를 즉시 목록에 반영
        const updatedCommentWithProfile = await fetchCommentWithProfile(updatedComment.id)
        if (updatedCommentWithProfile) {
          updateCommentInTree(updatedCommentWithProfile)
        }
      }

      setEditingId(null)
      setEditText('')
    } catch (error) {
      console.error('댓글 수정 실패:', error)
      alert('댓글 수정에 실패했습니다.')
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id)

      if (error) throw error

      // 목록에서 제거
      setComments((prev) => {
        const removeFromTree = (list: Comment[]): Comment[] => {
          return list
            .filter((c) => c.id !== commentId)
            .map((c) => ({
              ...c,
              replies: c.replies ? removeFromTree(c.replies) : undefined,
            }))
        }
        return removeFromTree(prev)
      })
    } catch (error) {
      console.error('댓글 삭제 실패:', error)
      alert('댓글 삭제에 실패했습니다.')
    }
  }

  const handleLike = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      alert('로그인이 필요합니다.')
      navigate('/login')
      return
    }

    try {
      if (isLiked) {
        // 좋아요 제거
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)

        if (error) throw error

        updateLikeInTree(commentId, false)
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('comment_likes')
          .insert([{ comment_id: commentId, user_id: user.id }])

        if (error) {
          if (error.code === '23505') {
            // 이미 좋아요를 누른 경우
            updateLikeInTree(commentId, true)
            return
          }
          throw error
        }

        updateLikeInTree(commentId, true)
      }
    } catch (error: any) {
      console.error('좋아요 처리 실패:', error)
      if (error.code !== '23505') {
        alert('좋아요 처리에 실패했습니다.')
      }
    }
  }

  const updateLikeInTree = (commentId: string, isLiked: boolean) => {
    setComments((prev) => {
      const updateInTree = (list: Comment[]): Comment[] => {
        return list.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              is_liked: isLiked,
              like_count: isLiked ? c.like_count + 1 : Math.max(0, c.like_count - 1),
            }
          }
          if (c.replies) {
            return {
              ...c,
              replies: updateInTree(c.replies),
            }
          }
          return c
        })
      }
      return updateInTree(prev)
    })
  }

  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const loadMore = () => {
    setVisibleCount((prev) => prev + 20)
  }

  useEffect(() => {
    fetchComments()
  }, [postId, visibleCount])

  // 사용자 변경 시 좋아요 상태만 업데이트
  useEffect(() => {
    if (!postId) return

    const updateLikeStatus = async () => {
      if (user && comments.length > 0) {
        // 좋아요 상태만 다시 조회
        const updateInTree = async (list: Comment[]): Promise<Comment[]> => {
          return Promise.all(
            list.map(async (c) => {
              const { data: likesData } = await supabase
                .from('comment_likes')
                .select('user_id')
                .eq('comment_id', c.id)

              const isLiked = likesData?.some((like) => like.user_id === user.id) || false
              const updatedComment = { ...c, is_liked: isLiked }
              if (c.replies) {
                updatedComment.replies = await updateInTree(c.replies)
              }
              return updatedComment
            })
          )
        }
        const updatedComments = await updateInTree(comments)
        setComments(updatedComments)
      } else if (!user && comments.length > 0) {
        // 로그아웃 시 좋아요 상태 초기화
        const resetLikes = (list: Comment[]): Comment[] => {
          return list.map((c) => ({
            ...c,
            is_liked: false,
            replies: c.replies ? resetLikes(c.replies) : undefined,
          }))
        }
        setComments(resetLikes(comments))
      }
    }

    updateLikeStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, postId])

  const getReplySummary = (replies: Comment[]): string => {
    if (!replies || replies.length === 0) return ''
    const uniqueUsers = new Set(
      replies.map((r) => r.profiles?.username || '익명').filter(Boolean)
    )
    const userList = Array.from(uniqueUsers)
    const count = replies.length

    if (count === 1) {
      return `${count}개의 답글`
    } else if (userList.length <= 3) {
      return `${count}개의 답글 from ${userList.join(', ')}`
    } else {
      return `${count}개의 답글 from ${userList.slice(0, 2).join(', ')}, and others`
    }
  }

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isReply = depth > 0
    const isEditing = editingId === comment.id
    const isReplying = replyingToId === comment.id
    const hasReplies = comment.replies && comment.replies.length > 0
    const replySummary = hasReplies ? getReplySummary(comment.replies ?? []) : ''

    return (
      <div key={comment.id} className={isReply ? 'mt-3' : 'pb-4 mb-4 border-b last:border-b-0'}>
        <div className={`flex items-start gap-3 ${isReply ? 'pl-6 relative' : ''}`}>
          {/* 연결선 */}
          {isReply && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          )}

          {/* 프로필 사진 */}
          {comment.profiles?.avatar_url ? (
            <img
              src={comment.profiles.avatar_url}
              alt={comment.profiles.username || '익명'}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
              {comment.profiles?.username?.[0]?.toUpperCase() || '익'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* 작성자 이름과 시간 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-900">
                {comment.profiles?.username || '익명'}
              </span>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(comment.created_at)}
              </span>
              {comment.created_at !== comment.updated_at && (
                <span className="text-xs text-gray-400">(수정됨)</span>
              )}
            </div>

            {/* 댓글 내용 */}
            {isEditing ? (
              <div className="space-y-3 mb-3">
                <textarea
                  value={editText}
                  onChange={(e) => {
                    setEditText(e.target.value)
                    handleTextareaResize(e)
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px] text-sm"
                  rows={3}
                  maxLength={1000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{editText.length}/1000</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(null)
                        setEditText('')
                      }}
                    >
                      취소
                    </Button>
                    <Button size="sm" onClick={() => handleEdit(comment.id)}>
                      수정
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words mb-2 leading-relaxed">
                {comment.content}
              </p>
            )}

            {/* 답글 요약 */}
            {hasReplies && !isReply && (
              <div className="mb-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {comment.replies
                    ?.slice(0, 3)
                    .map((reply) =>
                      reply.profiles?.avatar_url ? (
                        <img
                          key={reply.id}
                          src={reply.profiles.avatar_url}
                          alt={reply.profiles.username || '익명'}
                          className="w-5 h-5 rounded-full border-2 border-white object-cover"
                        />
                      ) : (
                        <div
                          key={reply.id}
                          className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-[8px] font-semibold"
                        >
                          {reply.profiles?.username?.[0]?.toUpperCase() || '익'}
                        </div>
                      )
                    )}
                </div>
                <button
                  onClick={() => {
                    const firstReply = comment.replies?.[0]
                    if (firstReply) {
                      document
                        .getElementById(`reply-${firstReply.id}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {replySummary}
                </button>
              </div>
            )}

            {/* 액션 버튼들 */}
            {!isEditing && (
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => handleLike(comment.id, comment.is_liked)}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    comment.is_liked
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      comment.is_liked
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-500'
                    }`}
                  />
                  {comment.is_liked ? (
                    <span className="text-red-500">{comment.like_count}</span>
                  ) : (
                    <span>좋아요</span>
                  )}
                </button>

                {depth < 1 && (
                  <button
                    onClick={() => {
                      setReplyingToId(comment.id)
                      setReplyText((prev) => ({
                        ...prev,
                        [comment.id]: `@${comment.profiles?.username || '익명'} `,
                      }))
                    }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>답글</span>
                  </button>
                )}

                {user && comment.user_id === user.id && (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(comment.id)
                        setEditText(comment.content)
                      }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>수정</span>
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* 답글 입력창 */}
            {isReplying && user && (
              <div className="mt-3 space-y-2">
                <textarea
                  ref={(el) => {
                    if (el) replyTextareaRefs.current[comment.id] = el
                  }}
                  value={replyText[comment.id] || ''}
                  onChange={(e) => {
                    setReplyText((prev) => ({ ...prev, [comment.id]: e.target.value }))
                    handleTextareaResize(e)
                  }}
                  placeholder="답글을 입력하세요..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px] text-sm"
                  rows={2}
                  maxLength={1000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {(replyText[comment.id] || '').length}/1000
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyingToId(null)
                        setReplyText((prev) => ({ ...prev, [comment.id]: '' }))
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleReply(comment.id, comment.profiles?.username || '익명')
                      }
                      disabled={!replyText[comment.id]?.trim()}
                    >
                      답글 작성
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 답글 목록 */}
            {hasReplies && (
              <div className="mt-3 space-y-3">
                {comment.replies?.map((reply) => (
                  <div id={`reply-${reply.id}`} key={reply.id}>
                    {renderComment(reply, depth + 1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const totalCommentCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  )

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">
        댓글 {totalCommentCount}개
      </h2>

      {/* 댓글 입력창 */}
      <div className="mb-8">
        {!user ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-200">
            <p className="text-gray-600 mb-4">댓글을 쓰려면 로그인하세요</p>
            <Button onClick={() => navigate('/login')}>로그인</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value)
                handleTextareaResize(e)
              }}
              placeholder="댓글을 입력하세요..."
              className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px]"
              rows={3}
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{commentText.length}/1000</span>
              <Button onClick={handleSubmit} disabled={!commentText.trim()}>
                댓글 작성
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 댓글 목록 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">아직 댓글이 없습니다.</div>
      ) : (
        <>
          <div className="space-y-6">
            {comments.map((comment) => renderComment(comment))}
          </div>

          {/* 더보기 버튼 */}
          {comments.length > visibleCount && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={loadMore}>
                댓글 더보기 ({comments.length - visibleCount}개 남음)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
