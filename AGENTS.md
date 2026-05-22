# AI 에이전트 작업 규칙

이 문서는 이 프로젝트에서 AI 에이전트가 작업할 때 따라야 할 규칙을 정의합니다.

## 디자인 및 컴포넌트 사용 규칙

### 1. shadcn/ui 컴포넌트 적극 활용

- **모든 UI 컴포넌트는 shadcn/ui를 우선적으로 사용합니다.**
- 새로운 UI 요소가 필요할 때는 먼저 [shadcn/ui 공식 문서](https://ui.shadcn.com/docs/components)에서 적합한 컴포넌트를 확인합니다.
- shadcn/ui에 없는 특수한 컴포넌트가 필요한 경우에만 커스텀 컴포넌트를 작성합니다.

### 2. 컴포넌트 추가 방법

- **shadcn/ui 컴포넌트는 반드시 터미널 명령어를 통해 추가해야 합니다.**
- 직접 파일을 생성하거나 복사하지 않습니다.
- 컴포넌트 추가 명령어 형식:
  ```bash
  npx shadcn@latest add [component-name]
  ```
- 예시:
  ```bash
  npx shadcn@latest add button
  npx shadcn@latest add card
  npx shadcn@latest add dialog
  ```

### 3. 프로젝트 설정 정보

- **스타일**: `new-york`
- **아이콘 라이브러리**: `lucide-react`
- **컴포넌트 경로**: `@/components/ui`
- **유틸리티 경로**: `@/lib/utils`

### 4. 작업 시 주의사항

- 컴포넌트를 추가하기 전에 이미 존재하는지 확인합니다.
- 여러 컴포넌트를 한 번에 추가할 수 있습니다:
  ```bash
  npx shadcn@latest add button card dialog
  ```
- 컴포넌트 추가 후에는 해당 컴포넌트를 import하여 사용합니다:
  ```typescript
  import { Button } from "@/components/ui/button"
  import { Card } from "@/components/ui/card"
  ```

### 5. 예외 상황

- shadcn/ui에 없는 특수한 기능이 필요한 경우에만 커스텀 컴포넌트를 작성합니다.
- 커스텀 컴포넌트를 작성할 때도 shadcn/ui의 디자인 시스템과 일관성을 유지합니다.

## 디자인 시스템 페이지 자동 업데이트 규칙

### 1. 디자인 시스템 페이지 위치

- **페이지 경로**: `src/pages/DesignSystem.tsx`
- **라우트 경로**: `/design-system`
- 디자인 시스템 페이지는 프로젝트의 모든 디자인 요소를 문서화하고 시각화하는 중앙 집중식 페이지입니다.

### 2. 자동 업데이트가 필요한 경우

다음과 같은 변경사항이 발생할 때는 **반드시** 디자인 시스템 페이지를 업데이트해야 합니다:

#### 2.1 새로운 컴포넌트 추가 시
- shadcn/ui 컴포넌트를 추가하거나 커스텀 컴포넌트를 생성한 경우
- `DesignSystem.tsx`의 `components` 배열에 새 컴포넌트 정보를 추가합니다
- 형식:
  ```typescript
  { name: 'ComponentName', path: '@/components/ui/component-name', description: '컴포넌트 설명' }
  ```

#### 2.2 CSS 변수 변경 시
- `src/index.css`에서 컬러 변수를 추가하거나 수정한 경우
- `DesignSystem.tsx`의 `colorTokens` 배열을 업데이트합니다
- 새로운 컬러 변수는 자동으로 표시되지만, 설명(description)을 추가하는 것을 권장합니다

#### 2.3 디자인 토큰 변경 시
- Border radius, Shadow, Transition 등의 값을 변경하거나 추가한 경우
- `DesignSystem.tsx`의 `designTokens` 배열의 해당 카테고리 토큰을 업데이트합니다

#### 2.4 타이포그래피 스케일 변경 시
- 폰트 크기, 두께, 행간 등의 스타일을 변경하거나 추가한 경우
- `DesignSystem.tsx`의 `typographyScales` 배열을 업데이트합니다

### 3. 업데이트 절차

1. **변경사항 확인**: 디자인 요소를 추가/수정한 후, 디자인 시스템 페이지에 반영이 필요한지 확인합니다.
2. **페이지 업데이트**: `src/pages/DesignSystem.tsx` 파일을 열어 해당 섹션을 수정합니다.
3. **테스트**: 변경사항이 올바르게 표시되는지 확인합니다 (특히 라이트/다크 모드 전환).

### 4. 디자인 시스템 페이지 구조

디자인 시스템 페이지는 다음 4개의 탭으로 구성됩니다:

1. **컬러 시스템**: 모든 CSS 컬러 변수와 값, 사용 용도
2. **타이포그래피**: 폰트 크기, 두께, 행간, 예시
3. **컴포넌트 라이브러리**: 사용 가능한 모든 컴포넌트 목록
4. **디자인 토큰**: Border radius, Shadow, Transition 값들

### 5. 중요 원칙

- **일관성 유지**: 디자인 시스템 페이지는 항상 프로젝트의 실제 디자인 요소와 일치해야 합니다.
- **자동화 우선**: 가능한 한 자동으로 추출 가능한 정보는 코드에서 직접 읽어오도록 구현되어 있습니다 (예: CSS 변수 값).
- **문서화**: 각 디자인 요소에는 명확한 설명을 추가하여 다른 개발자가 이해하기 쉽게 합니다.

