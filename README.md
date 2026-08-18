# 오늘하루 (Oneul Haru)

글래스모피즘 UI와 Supabase 클라우드 동기화를 지원하는 정적 웹 기반 할 일·루틴 관리 애플리케이션입니다.

- 서비스: https://bigj051.github.io/todolist/
- 저장소: https://github.com/BIgJ051/todolist

## 주요 기능

- 할 일 생성, 수정, 삭제 및 완료 처리
- 업무·개인·공부·건강·재정 카테고리
- 높음·중간·낮음 우선순위와 마감일 관리
- 제목과 메모 실시간 검색
- 상태·카테고리 필터 및 정렬
- 드래그 앤 드롭 순서 변경
- 다크·라이트 테마와 효과음 설정
- JSON 내보내기·가져오기
- Supabase 익명 인증 기반 사용자별 데이터 동기화
- `localStorage` 로컬 캐시 및 연결 실패 시 오프라인 사용

## 기술 구성

| 영역 | 기술 |
|---|---|
| 프런트엔드 | HTML5, CSS3, Vanilla JavaScript |
| 데이터베이스 | Supabase Postgres |
| 인증 | Supabase Anonymous Auth |
| API 보안 | Postgres Grants + Row Level Security |
| 배포 | GitHub Pages, GitHub Actions |
| 외부 라이브러리 | Supabase JS v2, Lucide, Canvas Confetti |

별도의 빌드 도구나 패키지 설치 없이 브라우저에서 실행됩니다.

## 데이터 흐름

```text
브라우저
  ├─ localStorage: 로컬 캐시와 오프라인 대체 저장소
  └─ Supabase JS
       ├─ Anonymous Auth: 브라우저별 사용자 세션 발급
       └─ Data API → public.tasks
                    └─ RLS: auth.uid() = user_id
```

앱 시작 시 Supabase에 저장된 데이터가 있으면 이를 불러옵니다. 원격 데이터가 없으면 기존 로컬 데이터를 최초 1회 업로드합니다. 이후 변경 사항은 로컬 캐시에 먼저 저장하고 Supabase에 순차적으로 동기화합니다.

## 로컬 실행

```bash
git clone https://github.com/BIgJ051/todolist.git
cd todolist
```

`index.html`을 브라우저에서 열거나 정적 HTTP 서버로 프로젝트 루트를 제공하면 됩니다. Supabase 연결 전에는 [Supabase 설정 문서](supabase/README.md)를 먼저 확인하세요.

## 프로젝트 구조

```text
todolist/
├── .github/workflows/pages.yml       # GitHub Pages 배포 워크플로
├── index.html                        # 애플리케이션 마크업과 외부 스크립트
├── style.css                         # 디자인 시스템과 반응형 UI
├── app.js                            # 상태 관리, CRUD, 필터 및 DB 동기화
├── supabase-config.js                # 배포용 Project URL/Publishable key
├── supabase-config.example.js        # 설정 템플릿
├── supabase/
│   ├── README.md                     # Supabase 설정 및 운영 안내
│   └── migrations/
│       └── 20260818_create_tasks.sql # 테이블, 권한, RLS, 트리거
└── README.md
```

## 보안 모델

- `supabase-config.js`에는 브라우저 공개용 Publishable key만 저장합니다.
- Secret key와 `service_role` 키는 프런트엔드와 Git 저장소에 절대 넣지 않습니다.
- 익명 로그인 사용자는 Postgres의 `authenticated` 역할을 사용합니다.
- `tasks` 테이블은 RLS를 활성화하고 `auth.uid() = user_id`인 행만 CRUD할 수 있습니다.
- HTTPS 통신과 Supabase 저장 장치 암호화가 적용되지만 `title`과 `notes`는 데이터베이스에 평문으로 저장됩니다. 프로젝트 DB 관리자는 내용을 볼 수 있습니다.
- 익명 세션은 브라우저 저장소에 의존하므로 브라우저 데이터를 삭제하면 이전 사용자 데이터에 다시 접근할 수 없습니다.

## 배포

`main` 브랜치에 푸시하면 `.github/workflows/pages.yml`이 저장소 전체를 GitHub Pages 아티팩트로 배포합니다.

배포 후 다음 항목을 확인합니다.

1. 사이트에서 `Supabase 데이터베이스에 연결되었습니다.` 알림이 표시되는지 확인합니다.
2. 할 일을 생성합니다.
3. Supabase의 **Authentication → Users**에 익명 사용자가 생성됐는지 확인합니다.
4. **Table Editor → public.tasks**에 해당 사용자의 행이 저장됐는지 확인합니다.

## 단축키

- <kbd>/</kbd>: 검색창으로 이동
- <kbd>Enter</kbd>: 할 일 등록
- <kbd>Esc</kbd>: 모달 또는 더보기 메뉴 닫기

## 라이선스

MIT License
