import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';

export const PROFILE_NOT_FOUND_MESSAGE = 'プロフィールが見つかりません。管理者に確認してください。';
export const LOGIN_REQUIRED_MESSAGE = 'ログイン情報を確認できません。再ログインしてください。';

export async function getCurrentStaffProfile(): Promise<{ profile: Profile | null; message?: string }> {
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
  if (!data) return { profile: null, message: PROFILE_NOT_FOUND_MESSAGE };
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
