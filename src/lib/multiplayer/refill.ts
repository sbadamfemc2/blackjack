import { createClient } from '@/lib/supabase/server';

const REFILL_AMOUNT = 1000;

/** Check active players with 0 chips and refill them. Returns refilled user IDs. */
export async function refillBustedPlayers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  excludeUserIds?: string[]
): Promise<string[]> {
  let query = supabase
    .from('room_players')
    .select('user_id')
    .eq('room_id', roomId)
    .neq('status', 'left')
    .eq('chips_at_table', 0);

  if (excludeUserIds && excludeUserIds.length > 0) {
    for (const uid of excludeUserIds) {
      query = query.neq('user_id', uid);
    }
  }

  const { data: bustedPlayers } = await query;

  if (!bustedPlayers || bustedPlayers.length === 0) {
    return [];
  }

  const refilledIds: string[] = [];

  for (const p of bustedPlayers) {
    await supabase.rpc('update_chips_at_table', {
      p_room_id: roomId,
      p_user_id: p.user_id,
      p_new_amount: REFILL_AMOUNT,
    });

    refilledIds.push(p.user_id);
  }

  return refilledIds;
}
