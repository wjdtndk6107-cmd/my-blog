/**
 * 이미지를 리사이징하는 함수
 * 최대 너비 1920px로 제한
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1920
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // 이미지 크기가 maxWidth보다 작으면 원본 반환
        if (img.width <= maxWidth) {
          resolve(file)
          return
        }
        
        // 비율 유지하며 리사이징
        const canvas = document.createElement('canvas')
        const scale = maxWidth / img.width
        canvas.width = maxWidth
        canvas.height = img.height * scale
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context를 가져올 수 없습니다.'))
          return
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // 원본 파일의 확장자 유지
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const mimeType = file.type || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 변환에 실패했습니다.'))
              return
            }
            
            const resizedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now(),
            })
            resolve(resizedFile)
          },
          mimeType,
          0.9 // 품질 90%
        )
      }
      
      img.onerror = () => {
        reject(new Error('이미지를 로드할 수 없습니다.'))
      }
      
      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }
    
    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * 파일 크기 검증 (5MB 제한)
 */
export function validateFileSize(file: File): boolean {
  const maxSize = 5 * 1024 * 1024 // 5MB
  return file.size <= maxSize
}

/**
 * 파일 타입 검증 (jpg, png, gif, webp만 허용)
 */
export function validateFileType(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  return allowedTypes.includes(file.type.toLowerCase())
}








