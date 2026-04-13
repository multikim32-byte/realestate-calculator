import { createAdminClient } from '@/lib/supabaseAdmin';
import UnsoldForm from '../../UnsoldForm';
import { notFound } from 'next/navigation';

export default async function EditUnsoldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('unsold_listings')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();

  return <UnsoldForm id={id} initial={data} />;
}
