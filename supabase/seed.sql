-- Demo seed data for Supabase SQL Editor.
-- schema.sqlを実行した後に実行してください。
-- デモログイン用パスワードは全ユーザー共通で「password123」です。

create extension if not exists "pgcrypto";

do $$
declare
  company_id uuid := '11111111-1111-1111-1111-111111111111';
  hq_id uuid := '22222222-2222-2222-2222-222222222221';
  ibaraki_id uuid := '22222222-2222-2222-2222-222222222222';
  admin_id uuid := '33333333-3333-3333-3333-333333333301';
  run_id uuid := '66666666-6666-6666-6666-666666666601';
  demo_password text := crypt('password123', gen_salt('bf'));
  admin_account_id uuid := '77777777-7777-7777-7777-777777777701';
  project_ids uuid[] := array[
    '55555555-5555-5555-5555-555555555501'::uuid,
    '55555555-5555-5555-5555-555555555502'::uuid,
    '55555555-5555-5555-5555-555555555503'::uuid,
    '55555555-5555-5555-5555-555555555504'::uuid,
    '55555555-5555-5555-5555-555555555505'::uuid
  ];
  staff_ids uuid[] := array[
    '44444444-4444-4444-4444-444444444401'::uuid,
    '44444444-4444-4444-4444-444444444402'::uuid,
    '44444444-4444-4444-4444-444444444403'::uuid,
    '44444444-4444-4444-4444-444444444404'::uuid,
    '44444444-4444-4444-4444-444444444405'::uuid,
    '44444444-4444-4444-4444-444444444406'::uuid,
    '44444444-4444-4444-4444-444444444407'::uuid,
    '44444444-4444-4444-4444-444444444408'::uuid,
    '44444444-4444-4444-4444-444444444409'::uuid,
    '44444444-4444-4444-4444-444444444410'::uuid
  ];
  i int;
begin
  delete from public.companies where id = company_id or name = 'オメガテクノ';
  delete from auth.users where email like '%@omega-techno.example';

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@omega-techno.example', demo_password, now(), now(), now(), '', '', '', '');

  for i in 1..array_length(staff_ids, 1) loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values (staff_ids[i], '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', format('staff%s@omega-techno.example', lpad(i::text, 2, '0')), demo_password, now(), now(), now(), '', '', '', '');
  end loop;

  insert into public.companies (id, name) values (company_id, 'オメガテクノ');
  insert into public.workplaces (id, company_id, name, address) values
    (hq_id, company_id, '本社', '東京都千代田区丸の内1-1-1'),
    (ibaraki_id, company_id, '茨城営業所', '茨城県水戸市中央1-1-1');

  insert into public.profiles (id, company_id, workplace_id, name, role, staff_role, phone)
  values (admin_id, company_id, hq_id, '管理者 太郎', 'admin', 'leader', '03-0000-0001');

  insert into public.admin_accounts (id, company_id, login_id, password_hash, name)
  values (admin_account_id, company_id, 'admin', crypt('omega1234', gen_salt('bf')), '初期管理者');

  for i in 1..array_length(staff_ids, 1) loop
    insert into public.profiles (id, company_id, workplace_id, name, role, staff_role, phone)
    values (
      staff_ids[i],
      company_id,
      case when i <= 5 then hq_id else ibaraki_id end,
      format('スタッフ%s', lpad(i::text, 2, '0')),
      'staff',
      case when i <= 3 then 'leader'::public.staff_role else 'staff'::public.staff_role end,
      format('090-0000-%s', lpad(i::text, 4, '0'))
    );
  end loop;

  insert into public.projects (id, company_id, workplace_id, title, work_date, start_time, end_time, location, required_people, required_leaders, note) values
    (project_ids[1], company_id, hq_id, '本社 倉庫整理', current_date + 1, '09:00', '17:00', '本社倉庫', 4, 1, '安全靴必須'),
    (project_ids[2], company_id, hq_id, 'イベント設営', current_date + 2, '08:00', '16:00', '東京国際展示場', 5, 2, '早朝集合'),
    (project_ids[3], company_id, ibaraki_id, '茨城 什器搬入', current_date + 3, '10:00', '18:00', '水戸市内商業施設', 3, 1, ''),
    (project_ids[4], company_id, ibaraki_id, '棚卸サポート', current_date + 4, '13:00', '21:00', '茨城営業所', 4, 1, '夜間作業'),
    (project_ids[5], company_id, hq_id, 'オフィス移転補助', current_date + 5, '09:30', '18:30', '丸の内オフィス', 6, 2, '台車使用');

  for i in 1..array_length(staff_ids, 1) loop
    insert into public.availabilities (company_id, staff_id, work_date, status, note)
    select company_id, staff_ids[i], p.work_date,
      case
        when (i + ordinality)::int % 5 = 0 then 'unavailable'::public.availability_status
        when (i + ordinality)::int % 3 = 0 then 'conditional'::public.availability_status
        else 'available'::public.availability_status
      end,
      case when (i + ordinality)::int % 3 = 0 then '時間帯は相談可能' else '' end
    from public.projects p
    join unnest(project_ids) with ordinality as project_list(project_id, ordinality) on project_list.project_id = p.id;
  end loop;

  insert into public.assignment_runs (id, company_id, executed_by) values (run_id, company_id, admin_id);
  insert into public.assignments (company_id, project_id, staff_id, run_id, status, is_leader) values
    (company_id, project_ids[1], staff_ids[1], run_id, 'draft', true),
    (company_id, project_ids[1], staff_ids[4], run_id, 'draft', false),
    (company_id, project_ids[2], staff_ids[2], run_id, 'draft', true),
    (company_id, project_ids[2], staff_ids[3], run_id, 'draft', true),
    (company_id, project_ids[3], staff_ids[6], run_id, 'draft', false);
end $$;
