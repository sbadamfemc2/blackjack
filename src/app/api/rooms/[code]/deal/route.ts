import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dealCards, playDealer, resolveRound } from '@/lib/multiplayer/gameEngine';
import { toMultiplayerGameState, GameRoundRow, MultiplayerGameState } from '@/lib/types/game';
import { updatePlayerChips, saveGameState } from '@/lib/multiplayer/serverHelpers';
import { refillBustedPlayers } from '@/lib/multiplayer/refill';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: room } = await supabase
    .from('multiplayer_rooms')
    .select('*')
    .eq('code', code)
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can deal' }, { status: 403 });
  }

  const { data: roundRow } = await supabase
    .from('multiplayer_game_rounds')
    .select('*')
    .eq('room_id', room.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!roundRow) {
    return NextResponse.json({ error: 'No active game round' }, { status: 400 });
  }

  const gameState = toMultiplayerGameState(roundRow as GameRoundRow);
  const dealResult = dealCards(gameState);

  if (!dealResult.success) {
    return NextResponse.json({ error: dealResult.error }, { status: 400 });
  }

  // Deduct bets from chips_at_table
  await updatePlayerChips(
    supabase,
    room.id,
    gameState.playerHands.map((h) => ({ userId: h.userId, delta: -h.bet }))
  );

  // Build cumulative state
  let currentState = { ...gameState, ...dealResult.updates } as MultiplayerGameState;
  let allUpdates = { ...dealResult.updates };

  // Auto-chain: if dealing led to dealer_play or resolution, keep going
  if (currentState.phase === 'dealer_play') {
    const dealerResult = playDealer(currentState);
    if (dealerResult.success) {
      currentState = { ...currentState, ...dealerResult.updates } as MultiplayerGameState;
      allUpdates = { ...allUpdates, ...dealerResult.updates };
    }
  }

  if (currentState.phase === 'resolution') {
    const resolveResult = resolveRound(currentState);
    if (resolveResult.success) {
      allUpdates = { ...allUpdates, ...resolveResult.updates };

      // Credit payouts
      if (resolveResult.chipUpdates) {
        await updatePlayerChips(
          supabase,
          room.id,
          resolveResult.chipUpdates.map((u) => ({ userId: u.userId, delta: u.netReturn }))
        );
      }
    }
  }

  await saveGameState(supabase, gameState.id, gameState, allUpdates);

  // Auto-refill any busted players after round ends
  if (allUpdates.phase === 'round_over') {
    await refillBustedPlayers(supabase, room.id);
  }

  return NextResponse.json({ success: true });
}
