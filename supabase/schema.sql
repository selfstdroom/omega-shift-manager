-- Supabase SQL Editorで再実行しやすいように、依存順に削除してから作成します。
drop table if exists public.assignments cascade;
drop table if exists public.assignment_runs cascade;
drop table if exists public.availabilities cascade;
drop table if exists public.projects cascade;
drop table if exists public.profiles cascade;
drop table if exists public.workplaces cascade;
drop table if exists public.companies cascade;

drop function if exists public.current_company_id() cascade;

drop type if exists public.assignment_status cascade;
drop type if exists public.availability_status cascade;
drop type if exists public.staff_role cascade;
drop type if exists public.user_role cascade;

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'staff');
create type public.staff_role as enum ('staff', 'leader');
create type public.availability_status as enum ('available', 'conditional', 'unavailable');
create type public.assignment_status as enum ('draft', 'confirmed');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.workplaces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text not null default '',
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  workplace_id uuid not null references public.workplaces(id) on delete restrict,
  name text not null,
  role public.user_role not null default 'staff',
  staff_role public.staff_role not null default 'staff',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workplace_id uuid not null references public.workplaces(id) on delete restrict,
  title text not null,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  location text not null default '',
  required_people integer not null check (required_people > 0),
  required_leaders integer not null default 1 check (required_leaders >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  check (start_time < end_time)
);

create table public.availabilities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  status public.availability_status not null default 'unavailable',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, staff_id)
);

create table public.assignment_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  executed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid not null references public.assignment_runs(id) on delete cascade,
  status public.assignment_status not null default 'draft',
  is_leader boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, project_id, staff_id)
);

create index availabilities_project_status_idx on public.availabilities(project_id, status);
create index assignments_staff_idx on public.assignments(staff_id);
create index projects_company_date_idx on public.projects(company_id, work_date, start_time);

alter table public.companies enable row level security;
alter table public.workplaces enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.availabilities enable row level security;
alter table public.assignment_runs enable row level security;
alter table public.assignments enable row level security;

create or replace function public.current_company_id() returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create policy "profiles_select_company" on public.profiles for select using (company_id = public.current_company_id() or id = auth.uid());
create policy "profiles_insert_self" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update_company" on public.profiles for update using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());

create policy "workplaces_company_all" on public.workplaces for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "projects_company_all" on public.projects for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "availabilities_company_all" on public.availabilities for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "assignment_runs_company_all" on public.assignment_runs for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "assignments_company_all" on public.assignments for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "companies_select_own" on public.companies for select using (id = public.current_company_id());
