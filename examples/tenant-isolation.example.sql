-- Sanitized example only.
-- Demonstrates the tenant-boundary pattern used in Smart CRM without exposing
-- production table names, helper functions, or complete policies.

create table public.example_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.example_records enable row level security;

-- In production, workspace membership is resolved through a dedicated,
-- security-reviewed helper rather than trusting a workspace id from the client.
create or replace function public.example_user_can_access_workspace(
  requested_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.example_workspace_members membership
    where membership.workspace_id = requested_workspace_id
      and membership.user_id = auth.uid()
  );
$$;

create policy "workspace members can read example records"
on public.example_records
for select
to authenticated
using (
  public.example_user_can_access_workspace(workspace_id)
);

create policy "workspace members can insert example records"
on public.example_records
for insert
to authenticated
with check (
  public.example_user_can_access_workspace(workspace_id)
);

-- Important design rule:
-- A client-supplied workspace_id is treated as data to validate, not proof that
-- the user belongs to that workspace.
