-- Login-less demo/production schema. Run in Supabase SQL Editor.
create extension if not exists "pgcrypto";

drop table if exists public.notifications cascade;
drop table if exists public.assignments cascade;
drop table if exists public.assignment_runs cascade;
drop table if exists public.availabilities cascade;
drop table if exists public.availability_periods cascade;
drop table if exists public.project_templates cascade;
drop table if exists public.project_days cascade;
drop table if exists public.projects cascade;
drop table if exists public.profiles cascade;
drop table if exists public.workplaces cascade;
drop table if exists public.admin_accounts cascade;
drop table if exists public.companies cascade;
drop type if exists public.project_type cascade;
drop type if exists public.notification_type cascade;
drop type if exists public.assignment_status cascade;
drop type if exists public.availability_period_status cascade;
drop type if exists public.availability_period_type cascade;
drop type if exists public.availability_status cascade;
drop type if exists public.staff_role cascade;
drop type if exists public.user_role cascade;

create type public.user_role as enum ('admin', 'staff');
create type public.staff_role as enum ('staff', 'leader');
create type public.availability_status as enum ('available', 'conditional', 'unavailable');
create type public.availability_period_type as enum ('monthly', 'weekly');
create type public.availability_period_status as enum ('open', 'closed');
create type public.assignment_status as enum ('draft', 'confirmed');
create type public.notification_type as enum ('shift_confirmed', 'system');
create type public.project_type as enum ('single', 'recurring');

create table public.companies (id text primary key default gen_random_uuid()::text, name text not null unique, created_at timestamptz not null default now());
create table public.workplaces (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, name text not null, address text not null default '', created_at timestamptz not null default now(), unique(company_id,name));
create table public.admin_accounts (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, login_id text unique not null, password_hash text not null, name text not null, created_at timestamptz not null default now());
create table public.profiles (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, workplace_id text not null references public.workplaces(id) on delete restrict, name text not null, role public.user_role not null default 'staff', staff_role public.staff_role not null default 'staff', phone text not null default '', note text, created_at timestamptz not null default now());
create table public.project_templates (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, workplace_id text not null references public.workplaces(id) on delete restrict, template_name text not null, title text not null, start_time time not null, end_time time not null, location text not null default '', required_people int not null check(required_people>0), required_leaders int not null default 1 check(required_leaders>=0), note text not null default '', weekdays int[] not null default array[1,3,5], created_at timestamptz not null default now(), check(start_time<end_time));
create table public.projects (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, workplace_id text not null references public.workplaces(id) on delete restrict, title text not null, project_type public.project_type not null default 'single', work_date date not null, start_time time not null, end_time time not null, location text not null default '', required_people int not null check(required_people>0), required_leaders int not null default 1 check(required_leaders>=0), note text not null default '', created_at timestamptz not null default now(), check(start_time<end_time));
create table public.project_days (id text primary key default gen_random_uuid()::text, project_id text not null references public.projects(id) on delete cascade, work_date date not null, start_time time not null, end_time time not null, required_people int not null check(required_people>0), required_leaders int not null default 1 check(required_leaders>=0), note text not null default '', created_at timestamptz not null default now(), check(start_time<end_time));
create table public.availability_periods (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, period_type public.availability_period_type not null, target_month text, week_start_date date, week_end_date date, deadline timestamptz not null, status public.availability_period_status not null default 'open', created_at timestamptz not null default now());
create table public.availabilities (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, staff_id text not null references public.profiles(id) on delete cascade, work_date date not null, status public.availability_status not null default 'unavailable', note text not null default '', created_at timestamptz not null default now(), unique(staff_id,work_date));
create table public.assignment_runs (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, executed_by text not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now());
create table public.assignments (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, project_id text not null references public.project_days(id) on delete cascade, staff_id text not null references public.profiles(id) on delete cascade, run_id text not null references public.assignment_runs(id) on delete cascade, status public.assignment_status not null default 'draft', is_leader boolean not null default false, created_at timestamptz not null default now(), unique(run_id,project_id,staff_id));
create table public.notifications (id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade, staff_id text not null references public.profiles(id) on delete cascade, title text not null, message text not null, type public.notification_type not null default 'system', project_id text references public.projects(id) on delete set null, assignment_id text references public.assignments(id) on delete set null, is_read boolean not null default false, created_at timestamptz not null default now());

create index projects_company_date_idx on public.projects(company_id, work_date, start_time);
create index project_days_project_date_idx on public.project_days(project_id, work_date, start_time);
create index availabilities_work_date_status_idx on public.availabilities(company_id, work_date, status);
create index assignments_staff_idx on public.assignments(staff_id);
create index notifications_staff_read_idx on public.notifications(staff_id, is_read, created_at desc);

alter table public.companies enable row level security; alter table public.workplaces enable row level security; alter table public.admin_accounts enable row level security; alter table public.profiles enable row level security; alter table public.project_templates enable row level security; alter table public.projects enable row level security; alter table public.project_days enable row level security; alter table public.availability_periods enable row level security; alter table public.availabilities enable row level security; alter table public.assignment_runs enable row level security; alter table public.assignments enable row level security; alter table public.notifications enable row level security;
create policy "demo_all_companies" on public.companies for all using (true) with check (true);
create policy "demo_all_workplaces" on public.workplaces for all using (true) with check (true);
create policy "demo_all_admin_accounts" on public.admin_accounts for all using (true) with check (true);
create policy "demo_all_profiles" on public.profiles for all using (true) with check (true);
create policy "demo_all_project_templates" on public.project_templates for all using (true) with check (true);
create policy "demo_all_projects" on public.projects for all using (true) with check (true);
create policy "demo_all_project_days" on public.project_days for all using (true) with check (true);
create policy "demo_all_availability_periods" on public.availability_periods for all using (true) with check (true);
create policy "demo_all_availabilities" on public.availabilities for all using (true) with check (true);
create policy "demo_all_assignment_runs" on public.assignment_runs for all using (true) with check (true);
create policy "demo_all_assignments" on public.assignments for all using (true) with check (true);
create policy "demo_all_notifications" on public.notifications for all using (true) with check (true);

-- Production admin login verifier. Uses pgcrypto bcrypt (crypt) comparison on the database server
-- and returns only non-secret account fields to the application server.
create or replace function public.verify_admin_login(input_login_id text, input_password text)
returns table (id text, company_id text, login_id text, name text)
language sql
security definer
set search_path = public
as $$
  select a.id, a.company_id, a.login_id, a.name
  from public.admin_accounts a
  where a.login_id = input_login_id
    and a.password_hash = crypt(input_password, a.password_hash)
  limit 1;
$$;

revoke all on function public.verify_admin_login(text, text) from public;
grant execute on function public.verify_admin_login(text, text) to anon, authenticated;
