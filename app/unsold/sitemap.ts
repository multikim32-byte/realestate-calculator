import { supabase } from '@/lib/supabase';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from('unsold_listings')
    .select('id, updated_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (data ?? []).map(item => ({
    url: `https://www.mk-land.kr/unsold/${item.id}`,
    lastModified: new Date(item.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
}
