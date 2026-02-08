import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('chip_balance')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }

  return NextResponse.json({ balance: data.chip_balance });
}
