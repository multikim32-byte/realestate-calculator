/**
 * apt_trades에서 매매+전세(T/J) 기준 최소 deal_ym 출력
 * 워크플로우에서 수집 기간 자동 결정에 사용
 */
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(SB_URL, SB_KEY);
const { data, error } = await sb
  .from('apt_trades')
  .select('deal_ym')
  .in('deal_type', ['T', 'J'])
  .order('deal_ym', { ascending: true })
  .limit(1);

if (error) {
  process.stderr.write('쿼리 오류: ' + error.message + '\n');
  console.log('999999');
  process.exit(0);
}

console.log(data?.[0]?.deal_ym ?? '999999');
