-- Upgrade an existing tasks table from snapshot synchronization to safe
-- per-user row synchronization. Run once in Supabase SQL Editor.

do $$
declare
  primary_key_definition text;
begin
  select pg_get_constraintdef(oid)
    into primary_key_definition
  from pg_constraint
  where conrelid = 'public.tasks'::regclass
    and conname = 'tasks_pkey'
    and contype = 'p';

  if primary_key_definition = 'PRIMARY KEY (id)' then
    alter table public.tasks drop constraint tasks_pkey;
    alter table public.tasks add constraint tasks_pkey primary key (user_id, id);
  end if;
end;
$$;

create index if not exists tasks_user_sort_order_idx
  on public.tasks (user_id, sort_order);

drop policy if exists "Users can read their own tasks" on public.tasks;
create policy "Users can read their own tasks"
  on public.tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
  on public.tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);
