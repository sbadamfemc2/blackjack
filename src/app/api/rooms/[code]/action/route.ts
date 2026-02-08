import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { playerHit, playerStand, playerDouble, playerSplit, playDealer, resolveRound } from '@/lib/multiplayer/gameEngine';
import { toMultiplayerGameState, GameRoundRow, MultiplayerGameState } from '@/lib/types/game';
import { updatePlayerChips, saveGameState } from '@/lib/multiplayer/serverHelpers';
import { refillBustedPlayers } from '@/lib/multiplayer/refill';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action } = await request.json() as { action: 'hit' | 'stand' | 'double' | 'split' };

  if (!['hit', 'stand', 'double', 'split'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Fetch room
  const { data: room } = await supabase
    .from('multiplayer_rooms')
    .select('*')
    .eq('code', code)
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Fetch player
  const { data: player } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .neq('status', 'left')
    .single();

  if (!player) {
    return NextResponse.json({ error: 'Not in this room' }, { status: 403 });
  }

  // Fetch active game round
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

  // Execute action
  let result;
  switch (action) {
    case 'hit':
      result = playerHit(gameState, user.id);
      break;
    case 'stand':
      result = playerStand(gameState, user.id);
      break;
    case 'double':
      result = playerDouble(gameState, user.id, player.chips_at_table);
      break;
    case 'split':
      result = playerSplit(gameState, user.id, player.chips_at_table);
      break;
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // For double/split: deduct extra bet from chips_at_table
  if (action === 'double' || action === 'split') {
    const hand = gameState.playerHands.find(
      (h) => h.userId === user.id &&
        (gameState.activeHandIndex !== null
          ? gameState.playerHands.indexOf(h) === gameState.activeHandIndex
          : h.seatNumber === gameState.activeSeat)
    );
    if (hand) {
      await updatePlayerChips(supabase, room.id, [
        { userId: user.id, delta: -hand.bet },
      ]);
    }
  }

  // Build cumulative state
  let currentState = { ...gameState, ...result.updates } as MultiplayerGameState;
  let allUpdates = { ...result.updates };

  // Auto-chain: if action led to dealer_play, run dealer then resolution
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
