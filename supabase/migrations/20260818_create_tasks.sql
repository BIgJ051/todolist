-- Run this in Supabase Dashboard > SQL Editor before configuring the app.
-- The app uses anonymous Supabase Auth so each browser installation sees only
-- its own rows. Enable "Anonymous sign-ins" in Auth > Providers as well.

create table if not exists public.tasks (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 500),
  category text not null default 'personal'
    check (category in ('work', 'personal', 'study', 'health', 'finance')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  due_date date,
  notes text not null default '',
  is_completed boolean not null default false,
  is_starred boolean not null default false,
  sort_order integer not null default 0,
  created_at bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists tasks_user_sort_order_idx
  on public.tasks (user_id, sort_order);

alter table public.tasks enable row level security;

-- The project may have "Automatically expose new tables" disabled. Grant
-- table-level API access explicitly; RLS policies below still restrict every
-- operation to the signed-in user's own rows.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

create policy "Users can read their own tasks"
  on public.tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own tasks"
  on public.tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_tasks_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_tasks_updated_at();
