import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * HTML 태그를 제거하고 텍스트만 반환
 */
export function stripHtmlTags(html: string): string {
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

/**
 * UTC 시간을 한국 시간(KST)으로 변환
 */
function toKoreaTime(date: Date): Date {
  // 한국 시간은 UTC+9
  const koreaOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로 변환
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000
  return new Date(utcTime + koreaOffset)
}

/**
 * 날짜를 상대 시간으로 포맷팅 (예: "3일 전", "2시간 전")
 * 한국 시간 기준으로 계산
 */
export function formatRelativeTime(dateString: string): string {
  const date = toKoreaTime(new Date(dateString))
  const now = toKoreaTime(new Date())
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return '방금 전'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}시간 전`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays}일 전`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths}개월 전`
  }

  const diffInYears = Math.floor(diffInMonths / 12)
  return `${diffInYears}년 전`
}

/**
 * 날짜를 "2024년 1월 15일" 형식으로 포맷팅
 * 한국 시간 기준으로 표시
 */
export function formatDate(dateString: string): string {
  const date = toKoreaTime(new Date(dateString))
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}년 ${month}월 ${day}일`
}

/**
 * 한국 시간으로 현재 시간 반환 (ISO 문자열)
 * UTC+9 오프셋을 포함한 ISO 문자열 반환
 */
export function getKoreaTimeISOString(): string {
  const koreaTime = toKoreaTime(new Date())
  // 한국 시간(UTC+9)을 ISO 문자열로 변환
  const year = koreaTime.getFullYear()
  const month = String(koreaTime.getMonth() + 1).padStart(2, '0')
  const day = String(koreaTime.getDate()).padStart(2, '0')
  const hours = String(koreaTime.getHours()).padStart(2, '0')
  const minutes = String(koreaTime.getMinutes()).padStart(2, '0')
  const seconds = String(koreaTime.getSeconds()).padStart(2, '0')
  const milliseconds = String(koreaTime.getMilliseconds()).padStart(3, '0')
  
  // UTC+9 오프셋을 포함한 ISO 문자열 반환
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+09:00`
}

/**
 * 한국 시간을 UTC로 변환하여 Supabase에 저장할 수 있는 형식으로 반환
 * 현재 시간을 한국 시간 기준으로 가져와서 UTC로 변환
 */
export function getKoreaTimeAsUTC(): string {
  const now = new Date()
  // 한국 시간(UTC+9)을 UTC로 변환
  // 한국 시간에서 9시간을 빼면 UTC가 됨
  const koreaOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로 변환
  const utcTime = new Date(now.getTime() - koreaOffset)
  
  // ISO 문자열로 반환 (UTC)
  return utcTime.toISOString()
}
