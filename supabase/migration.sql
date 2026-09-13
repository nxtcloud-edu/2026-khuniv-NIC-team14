-- ============================================================================
-- 뉴스레슨 — Supabase 스키마 마이그레이션
--
-- Supabase 대시보드 > SQL Editor에서 이 파일 전체를 한 번 실행하세요.
-- (Data API 자동 노출을 꺼둔 프로젝트이므로, 아래 GRANT 문이 없으면 RLS 정책이
--  있어도 PostgREST가 테이블 자체를 노출하지 않아 클라이언트에서 접근이 막힙니다.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles — 닉네임 등 유저 프로필 (localStorage의 newsLessonNickname 대체)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: 본인만 조회"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: 본인만 생성"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: 본인만 수정"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles: 본인만 삭제"
  on public.profiles for delete
  using (auth.uid() = id);

-- 회원가입(auth.users insert) 시 profiles 행을 자동 생성한다.
-- signUp() 호출 시 넘긴 options.data.nickname(raw_user_meta_data)을 그대로 사용.
-- SECURITY DEFINER로 실행되어, 이메일 확인 대기 등으로 아직 로그인 세션(JWT)이
-- 없는 상태에서도 RLS에 막히지 않고 프로필 행을 만들 수 있다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. history_entries — 학습 기록 (localStorage의 newsLessonHistory 대체)
--    통계(newsLessonStats)는 별도 테이블 없이 클라이언트가 history_entries를
--    읽어 그때그때 계산한다 (기존 storage.js의 computeStats()와 동일한 방식).
-- ----------------------------------------------------------------------------
create table if not exists public.history_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null default '',
  date date not null default (now() at time zone 'utc')::date,
  points_count integer not null default 0,
  quiz_score jsonb,             -- { correct: number, total: number } | null
  summary text not null default '',
  tags text[] not null default '{}',

  article_text text not null default '',
  article_title text not null default '',
  url text not null default '',

  points jsonb not null default '[]'::jsonb,   -- [{ title, definition, easy, context, impact }]
  overview text not null default '',
  quiz jsonb not null default '[]'::jsonb,      -- [{ relatedPoint, question, answer, explanation }]

  created_at timestamptz not null default now()
);

create index if not exists history_entries_user_id_created_at_idx
  on public.history_entries (user_id, created_at desc);

alter table public.history_entries enable row level security;

create policy "history_entries: 본인 기록만 조회"
  on public.history_entries for select
  using (auth.uid() = user_id);

create policy "history_entries: 본인 이름으로만 생성"
  on public.history_entries for insert
  with check (auth.uid() = user_id);

create policy "history_entries: 본인 기록만 수정"
  on public.history_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "history_entries: 본인 기록만 삭제"
  on public.history_entries for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Data API 수동 노출
--    프로젝트에서 "새 테이블 자동 노출"을 꺼두었으므로, PostgREST(Data API)가
--    이 두 테이블을 쓸 수 있도록 authenticated 롤에 명시적으로 권한을 부여한다.
--    (anon 롤에는 어떤 권한도 주지 않는다 — 로그인 전에는 아예 접근 불가)
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.history_entries to authenticated;
