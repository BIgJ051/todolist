# Supabase 설정 및 운영 안내

## 1. 프로젝트 생성

Supabase에서 프로젝트를 생성할 때 다음과 같이 설정합니다.

- **Enable Data API**: 활성화
- **Automatically expose new tables**: 비활성화 가능
- **Enable automatic RLS**: 비활성화 가능

이 프로젝트의 마이그레이션이 테이블 권한과 RLS를 명시적으로 설정합니다.

## 2. 데이터베이스 구성

Supabase Dashboard의 **SQL Editor → Create a new snippet**에서 다음 파일 전체를 실행합니다.

```text
migrations/20260818_create_tasks.sql
```

마이그레이션은 다음 객체를 생성합니다.

- `public.tasks` 테이블
- `authenticated` 역할의 CRUD 권한
- 사용자별 조회·생성·수정·삭제 RLS 정책
- `updated_at` 자동 갱신 트리거

정상 실행 결과는 `Success. No rows returned`입니다.

## 3. 익명 인증 활성화

Dashboard의 **Authentication → Sign In / Providers**에서 **Anonymous Sign-Ins**를 활성화하고 저장합니다.

익명 사용자는 이메일 없이 생성되지만 데이터베이스 요청에서는 `authenticated` 역할을 사용합니다. RLS는 세션의 `auth.uid()`와 각 행의 `user_id`를 비교합니다.

## 4. 브라우저 설정

**Settings → API Keys**에서 `Publishable key`를 복사합니다. **Data API → Overview**에서 API URL을 확인하고 끝의 `/rest/v1/`를 제외한 프로젝트 URL을 사용합니다.

```js
window.SUPABASE_CONFIG = {
  url: 'https://PROJECT_REF.supabase.co',
  anonKey: 'sb_publishable_...'
};
```

위 값을 프로젝트 루트의 `supabase-config.js`에 저장합니다.

> Publishable key는 RLS와 함께 브라우저에서 사용하도록 만들어진 공개 키입니다. Secret key 또는 `service_role` 키는 절대 사용하지 마세요.

## 5. GitHub Pages 배포

이 프로젝트는 정적 웹사이트이므로 `supabase-config.js`도 Pages 아티팩트에 포함돼야 합니다. Publishable key는 최종 브라우저 응답에서 확인할 수 있으므로 키 자체를 비밀로 간주하면 안 됩니다. 실제 보안 경계는 Grants와 RLS입니다.

`main` 브랜치에 푸시하면 GitHub Actions의 **Deploy to GitHub Pages** 워크플로가 실행됩니다.

배포 후 다음 URL이 모두 `200`을 반환해야 합니다.

```text
https://bigj051.github.io/todolist/
https://bigj051.github.io/todolist/supabase-config.js
https://bigj051.github.io/todolist/app.js
```

## tasks 스키마

| 열 | 형식 | 설명 |
|---|---|---|
| `id` | `text` | 프런트엔드에서 생성하는 할 일 ID |
| `user_id` | `uuid` | Supabase Auth 사용자 ID |
| `title` | `text` | 할 일 제목 |
| `category` | `text` | `work`, `personal`, `study`, `health`, `finance` |
| `priority` | `text` | `high`, `medium`, `low` |
| `due_date` | `date` | 선택적 마감일 |
| `notes` | `text` | 상세 메모 |
| `is_completed` | `boolean` | 완료 여부 |
| `is_starred` | `boolean` | 중요 표시 여부 |
| `sort_order` | `integer` | 화면 표시 순서 |
| `created_at` | `bigint` | 브라우저 생성 시각(epoch milliseconds) |
| `updated_at` | `timestamptz` | DB 갱신 시각 |

## RLS 정책

모든 정책은 다음 조건을 사용합니다.

```sql
auth.uid() = user_id
```

따라서 한 익명 사용자는 다른 사용자의 행을 Data API로 조회하거나 변경할 수 없습니다. Dashboard의 `postgres` 관리자 역할이나 Secret/Service 역할은 별도의 관리 권한을 가지므로 데이터 평문을 확인할 수 있습니다.

## 동기화 동작

1. 앱 시작 시 기존 Supabase 세션을 불러옵니다.
2. 세션이 없으면 `signInAnonymously()`를 실행합니다.
3. 원격 행이 있으면 `sort_order` 기준으로 불러와 로컬 캐시를 갱신합니다.
4. 원격 행이 없으면 기존 `localStorage` 데이터를 업로드합니다.
5. 이후 CRUD 및 순서 변경 시 로컬 캐시 저장 후 원격 스냅샷을 동기화합니다.
6. 네트워크 또는 Supabase 오류가 발생하면 로컬 데이터는 유지되고 화면에 실패 알림이 표시됩니다.

## 문제 해결

### 연결 성공 알림이 나타나지 않음

- `Ctrl + F5`로 캐시를 강제로 새로고침합니다.
- 배포된 `supabase-config.js`가 `404`가 아닌지 확인합니다.
- Project URL 끝에 `/rest/v1/`가 포함되지 않았는지 확인합니다.
- Publishable key 대신 Secret key를 넣지 않았는지 확인합니다.

### API 요청이 401을 반환함

다음 권한이 적용됐는지 확인합니다.

```sql
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
```

### Auth 사용자만 생기고 tasks 행이 없음

- 브라우저 개발자 도구의 Console에서 Supabase 오류를 확인합니다.
- `public.tasks`의 RLS 정책과 `authenticated` 권한을 확인합니다.
- 앱에서 할 일을 생성한 후 Table Editor를 새로고침합니다.

### 브라우저 데이터를 삭제한 뒤 기존 데이터가 보이지 않음

현재 인증 방식은 복구 수단이 없는 익명 인증입니다. 브라우저 데이터 삭제, 시크릿 모드, 다른 브라우저 또는 다른 기기에서는 새로운 사용자로 인식됩니다. 계정 복구와 기기 간 공유가 필요하면 이메일·소셜 로그인을 추가해야 합니다.
