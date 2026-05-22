export function PostCardSkeleton() {
  return (
    <div className="bg-card border rounded-xl overflow-hidden animate-pulse">
      {/* 이미지 영역 */}
      <div className="w-full h-48 bg-muted" />
      
      {/* 내용 영역 */}
      <div className="p-6 space-y-4">
        {/* 제목 */}
        <div className="h-6 bg-muted rounded w-3/4" />
        
        {/* 내용 미리보기 */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-4/6" />
        </div>
        
        {/* 태그 */}
        <div className="flex gap-2">
          <div className="h-6 bg-muted rounded-full w-16" />
          <div className="h-6 bg-muted rounded-full w-20" />
        </div>
        
        {/* 하단 정보 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="h-4 bg-muted rounded w-20" />
          </div>
          <div className="h-4 bg-muted rounded w-16" />
        </div>
        
        {/* 통계 */}
        <div className="flex gap-4">
          <div className="h-4 bg-muted rounded w-12" />
          <div className="h-4 bg-muted rounded w-12" />
          <div className="h-4 bg-muted rounded w-12" />
        </div>
      </div>
    </div>
  )
}








