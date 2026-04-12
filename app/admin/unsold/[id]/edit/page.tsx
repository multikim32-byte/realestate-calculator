import { createAdminClient } from '@/lib/supabaseAdmin';
import UnsoldForm from '../../UnsoldForm';
import { notFound } from 'next/navigation';

export default async function EditUnsoldPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('unsold_listings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!data) notFound();

  return <UnsoldForm id={params.id} initial={data} />;
}
