import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import { Moon, Sun } from 'lucide-react'

interface ColorToken {
  name: string
  cssVar: string
  value: string
  description: string
}

interface TypographyScale {
  name: string
  fontSize: string
  fontWeight: string
  lineHeight: string
  example: string
}

interface DesignToken {
  category: string
  tokens: Array<{
    name: string
    value: string
    description?: string
  }>
}

export function DesignSystem() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [isDark])

  // CSS 변수에서 컬러 추출
  const getColorValue = (cssVar: string): string => {
    if (typeof window === 'undefined') return ''
    const root = getComputedStyle(document.documentElement)
    return root.getPropertyValue(cssVar).trim()
  }

  const colorTokens: ColorToken[] = [
    { name: 'Background', cssVar: '--background', value: getColorValue('--background'), description: '페이지 배경색' },
    { name: 'Foreground', cssVar: '--foreground', value: getColorValue('--foreground'), description: '기본 텍스트 색상' },
    { name: 'Card', cssVar: '--card', value: getColorValue('--card'), description: '카드 배경색' },
    { name: 'Card Foreground', cssVar: '--card-foreground', value: getColorValue('--card-foreground'), description: '카드 텍스트 색상' },
    { name: 'Popover', cssVar: '--popover', value: getColorValue('--popover'), description: '팝오버 배경색' },
    { name: 'Popover Foreground', cssVar: '--popover-foreground', value: getColorValue('--popover-foreground'), description: '팝오버 텍스트 색상' },
    { name: 'Primary', cssVar: '--primary', value: getColorValue('--primary'), description: '주요 액션 색상' },
    { name: 'Primary Foreground', cssVar: '--primary-foreground', value: getColorValue('--primary-foreground'), description: '주요 액션 텍스트 색상' },
    { name: 'Secondary', cssVar: '--secondary', value: getColorValue('--secondary'), description: '보조 액션 색상' },
    { name: 'Secondary Foreground', cssVar: '--secondary-foreground', value: getColorValue('--secondary-foreground'), description: '보조 액션 텍스트 색상' },
    { name: 'Muted', cssVar: '--muted', value: getColorValue('--muted'), description: '비활성/뮤트 색상' },
    { name: 'Muted Foreground', cssVar: '--muted-foreground', value: getColorValue('--muted-foreground'), description: '비활성 텍스트 색상' },
    { name: 'Accent', cssVar: '--accent', value: getColorValue('--accent'), description: '강조 색상' },
    { name: 'Accent Foreground', cssVar: '--accent-foreground', value: getColorValue('--accent-foreground'), description: '강조 텍스트 색상' },
    { name: 'Destructive', cssVar: '--destructive', value: getColorValue('--destructive'), description: '삭제/경고 색상' },
    { name: 'Border', cssVar: '--border', value: getColorValue('--border'), description: '테두리 색상' },
    { name: 'Input', cssVar: '--input', value: getColorValue('--input'), description: '입력 필드 배경색' },
    { name: 'Ring', cssVar: '--ring', value: getColorValue('--ring'), description: '포커스 링 색상' },
    { name: 'Chart 1', cssVar: '--chart-1', value: getColorValue('--chart-1'), description: '차트 색상 1' },
    { name: 'Chart 2', cssVar: '--chart-2', value: getColorValue('--chart-2'), description: '차트 색상 2' },
    { name: 'Chart 3', cssVar: '--chart-3', value: getColorValue('--chart-3'), description: '차트 색상 3' },
    { name: 'Chart 4', cssVar: '--chart-4', value: getColorValue('--chart-4'), description: '차트 색상 4' },
    { name: 'Chart 5', cssVar: '--chart-5', value: getColorValue('--chart-5'), description: '차트 색상 5' },
  ]

  const typographyScales: TypographyScale[] = [
    { name: '제목 1 (H1)', fontSize: 'text-4xl', fontWeight: 'font-bold', lineHeight: 'leading-tight', example: '대제목 텍스트' },
    { name: '제목 2 (H2)', fontSize: 'text-3xl', fontWeight: 'font-bold', lineHeight: 'leading-tight', example: '중제목 텍스트' },
    { name: '제목 3 (H3)', fontSize: 'text-2xl', fontWeight: 'font-semibold', lineHeight: 'leading-snug', example: '소제목 텍스트' },
    { name: '제목 4 (H4)', fontSize: 'text-xl', fontWeight: 'font-semibold', lineHeight: 'leading-snug', example: '작은 제목 텍스트' },
    { name: '본문 (Body)', fontSize: 'text-base', fontWeight: 'font-normal', lineHeight: 'leading-relaxed', example: '본문 텍스트입니다. 일반적인 내용을 표시할 때 사용합니다.' },
    { name: '본문 작게 (Body Small)', fontSize: 'text-sm', fontWeight: 'font-normal', lineHeight: 'leading-relaxed', example: '작은 본문 텍스트입니다.' },
    { name: '캡션 (Caption)', fontSize: 'text-xs', fontWeight: 'font-normal', lineHeight: 'leading-relaxed', example: '캡션 텍스트' },
  ]

  const designTokens: DesignToken[] = [
    {
      category: 'Border Radius',
      tokens: [
        { name: 'radius-sm', value: 'calc(var(--radius) - 4px)', description: '작은 모서리 둥글기' },
        { name: 'radius-md', value: 'calc(var(--radius) - 2px)', description: '중간 모서리 둥글기' },
        { name: 'radius-lg', value: 'var(--radius)', description: '기본 모서리 둥글기 (0.625rem)' },
        { name: 'radius-xl', value: 'calc(var(--radius) + 4px)', description: '큰 모서리 둥글기' },
        { name: 'radius-2xl', value: 'calc(var(--radius) + 8px)', description: '매우 큰 모서리 둥글기' },
        { name: 'radius-3xl', value: 'calc(var(--radius) + 12px)', description: '특히 큰 모서리 둥글기' },
        { name: 'radius-4xl', value: 'calc(var(--radius) + 16px)', description: '가장 큰 모서리 둥글기' },
      ],
    },
    {
      category: 'Shadow',
      tokens: [
        { name: 'shadow-sm', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)', description: '작은 그림자' },
        { name: 'shadow', value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', description: '기본 그림자' },
        { name: 'shadow-md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', description: '중간 그림자' },
        { name: 'shadow-lg', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', description: '큰 그림자' },
        { name: 'shadow-xl', value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', description: '매우 큰 그림자' },
      ],
    },
    {
      category: 'Transition',
      tokens: [
        { name: 'transition-colors', value: 'color 150ms ease-in-out', description: '색상 전환' },
        { name: 'transition-opacity', value: 'opacity 150ms ease-in-out', description: '투명도 전환' },
        { name: 'transition-transform', value: 'transform 150ms ease-in-out', description: '변형 전환' },
        { name: 'transition-all', value: 'all 150ms ease-in-out', description: '모든 속성 전환' },
      ],
    },
  ]

  // 컴포넌트 목록 (동적으로 가져올 수 있도록 확장 가능)
  const components = [
    { name: 'Card', path: '@/components/ui/card', description: '카드 컨테이너 컴포넌트' },
    { name: 'Tabs', path: '@/components/ui/tabs', description: '탭 네비게이션 컴포넌트' },
    { name: 'Toggle', path: '@/components/ui/toggle', description: '토글 버튼 컴포넌트' },
  ]

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">디자인 시스템</h1>
            <p className="text-muted-foreground">프로젝트의 모든 디자인 요소를 한눈에 확인하세요</p>
          </div>
          <Toggle
            pressed={isDark}
            onPressedChange={setIsDark}
            aria-label="다크 모드 토글"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="ml-2">{isDark ? '라이트 모드' : '다크 모드'}</span>
          </Toggle>
        </div>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="colors">컬러 시스템</TabsTrigger>
            <TabsTrigger value="typography">타이포그래피</TabsTrigger>
            <TabsTrigger value="components">컴포넌트 라이브러리</TabsTrigger>
            <TabsTrigger value="tokens">디자인 토큰</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>컬러 시스템</CardTitle>
                <CardDescription>
                  프로젝트에서 사용하는 모든 컬러 변수와 값입니다. 라이트/다크 모드를 전환하여 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {colorTokens.map((color) => (
                    <Card key={color.name} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div
                          className="h-24 w-full"
                          style={{ backgroundColor: `var(${color.cssVar})` }}
                        />
                        <div className="p-4">
                          <h3 className="font-semibold mb-1">{color.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{color.description}</p>
                          <div className="space-y-1">
                            <div className="text-xs font-mono bg-muted p-2 rounded">
                              {color.cssVar}
                            </div>
                            <div className="text-xs font-mono bg-muted p-2 rounded">
                              {getColorValue(color.cssVar) || '로딩 중...'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="typography" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>타이포그래피</CardTitle>
                <CardDescription>
                  사용 가능한 폰트 크기, 두께, 행간을 확인하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {typographyScales.map((scale) => (
                    <Card key={scale.name}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2">{scale.name}</h3>
                            <div className={`${scale.fontSize} ${scale.fontWeight} ${scale.lineHeight} mb-2`}>
                              {scale.example}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="font-mono">{scale.fontSize}</span>
                              <span className="font-mono">{scale.fontWeight}</span>
                              <span className="font-mono">{scale.lineHeight}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>컴포넌트 라이브러리</CardTitle>
                <CardDescription>
                  프로젝트에서 사용 가능한 모든 컴포넌트 목록입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {components.map((component) => (
                    <Card key={component.name}>
                      <CardHeader>
                        <CardTitle className="text-lg">{component.name}</CardTitle>
                        <CardDescription>{component.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm font-mono bg-muted p-2 rounded">
                          {component.path}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-6">
            <div className="space-y-6">
              {designTokens.map((tokenGroup) => (
                <Card key={tokenGroup.category}>
                  <CardHeader>
                    <CardTitle>{tokenGroup.category}</CardTitle>
                    <CardDescription>
                      {tokenGroup.category} 관련 디자인 토큰 값들입니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tokenGroup.tokens.map((token) => (
                        <div key={token.name} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{token.name}</h4>
                            {token.description && (
                              <p className="text-sm text-muted-foreground">{token.description}</p>
                            )}
                          </div>
                          <div className="text-sm font-mono bg-muted p-2 rounded min-w-[200px]">
                            {token.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}








