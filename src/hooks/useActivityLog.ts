import { supabase } from '@/integrations/supabase/client';

export async function logActivity(
  action: string,
  tableName: string = '',
  recordId: string = '',
  details: Record<string, any> = {}
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const profileRes = await supabase.from('profiles').select('username').eq('id', user.id).single();
  const username = (profileRes.data as any)?.username || user.email || '';

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    username,
    action,
    table_name: tableName,
    record_id: recordId,
    details,
  });
}
