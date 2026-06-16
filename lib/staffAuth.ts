import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';

type DefaultStaffScope = {
  company_id: string;
  workplace_id: string;
};

export const PROFILE_NOT_FOUND_MESSAGE = 'プロフィールが見つかりません。管理者に確認してください。';
export const LOGIN_REQUIRED_MESSAGE = 'ログイン情報を確認できません。再ログインしてください。';
export const DEFAULT_SCOPE_NOT_FOUND_MESSAGE = '会社または事業所が登録されていないため、スタッフプロフィールを作成できません。管理者に会社・事業所の初期データ作成を依頼してください。';

export async function getDefaultStaffScope(): Promise<DefaultStaffScope> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (companyError) throw companyError;
  if (!company?.id) throw new Error(DEFAULT_SCOPE_NOT_FOUND_MESSAGE);

  const { data: workplace, error: workplaceError } = await supabase
    .from('workplaces')
    .select('id, company_id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (workplaceError) throw workplaceError;
  if (!workplace?.id) throw new Error(DEFAULT_SCOPE_NOT_FOUND_MESSAGE);

  return { company_id: company.id, workplace_id: workplace.id };
}

export async function createMissingStaffProfileFromAuthUser(): Promise<{ profile: Profile | null; message?: string }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { profile: null, message: LOGIN_REQUIRED_MESSAGE };

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { profile: null, message: LOGIN_REQUIRED_MESSAGE };

  try {
    const defaults = await getDefaultStaffScope();
    const email = user.email ?? '';
    const fallbackName = email.split('@')[0] || 'スタッフ';
    const name = typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()
      ? user.user_metadata.name.trim()
      : fallbackName;
    const phone = typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : '';

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        company_id: defaults.company_id,
        workplace_id: defaults.workplace_id,
        name,
        role: 'staff',
        staff_role: 'staff',
        phone,
      }, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) return { profile: null, message: error.message };
    return { profile: data as Profile, message: 'プロフィールを自動作成しました。' };
  } catch (error) {
    return { profile: null, message: (error as Error).message };
  }
}

export async function getCurrentStaffProfile(options: { createIfMissing?: boolean } = {}): Promise<{ profile: Profile | null; message?: string }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { profile: null, message: LOGIN_REQUIRED_MESSAGE };

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { profile: null, message: LOGIN_REQUIRED_MESSAGE };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .eq('role', 'staff')
    .maybeSingle();

  if (error) return { profile: null, message: error.message };
  if (!data) {
    if (options.createIfMissing) return createMissingStaffProfileFromAuthUser();
    return { profile: null, message: PROFILE_NOT_FOUND_MESSAGE };
  }
  return { profile: data as Profile };
}

export async function listCurrentStaffShiftRows(staffId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { data: [], error: null };
  return supabase
    .from('assignments')
    .select('id,company_id,project_id,staff_id,run_id,status,is_leader,created_at,projects(id,company_id,workplace_id,title,work_date,start_time,end_time,location,required_people,required_leaders,note,created_at)')
    .eq('staff_id', staffId);
}
