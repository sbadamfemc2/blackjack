import { createClient } from '@/lib/supabase/server';
import { MultiplayerGameState } from '@/lib/types/game';

/** Apply chip updates (deductions or payouts) to room_players */
export async function updatePlayerChips(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  updates: Array<{ userId: string; delta: number }>
) {
  for (const { userId, delta } of updates) {
    if (delta === 0) continue;
    const { data: p } = await supabase
      .from('room_players')
      .select('chips_at_table')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (p) {
      await supabase.rpc('update_chips_at_table', {
        p_room_id: roomId,
        p_user_id: userId,
        p_new_amount: p.chips_at_table + delta,
      });
    }
  }
}

/** Write game round updates to DB (camelCase → snake_case) */
export async function saveGameState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roundId: string,
  base: MultiplayerGameState,
  updates: Partial<MultiplayerGameState>
) {
  await supabase
    .from('multiplayer_game_rounds')
    .update({
      phase: updates.phase ?? base.phase,
      active_seat: updates.activeSeat !== undefined ? updates.activeSeat : base.activeSeat,
      active_hand_index: updates.activeHandIndex !== undefined ? updates.activeHandIndex : base.activeHandIndex,
      shoe: updates.shoe ?? base.shoe,
      cards_dealt: updates.cardsDealt ?? base.cardsDealt,
      cut_card_position: updates.cutCardPosition ?? base.cutCardPosition,
      needs_reshuffle: updates.needsReshuffle ?? base.needsReshuffle,
      player_hands: updates.playerHands ?? base.playerHands,
      dealer_cards: updates.dealerCards ?? base.dealerCards,
      hole_card_revealed: updates.holeCardRevealed ?? base.holeCardRevealed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roundId);
}
