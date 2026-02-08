import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNewRound } from '@/lib/multiplayer/gameEngine';
import { toMultiplayerGameState, GameRoundRow } from '@/lib/types/game';
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

  // Fetch room
  const { data: room } = await supabase
    .from('multiplayer_rooms')
    .select('*')
    .eq('code', code)
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can start next round' }, { status: 403 });
  }

  // Fetch current round
  const { data: roundRow } = await supabase
    .from('multiplayer_game_rounds')
    .select('*')
    .eq('room_id', room.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!roundRow) {
    return NextResponse.json({ error: 'No game round found' }, { status: 400 });
  }

  const prevState = toMultiplayerGameState(roundRow as GameRoundRow);

  if (prevState.phase !== 'round_over') {
    return NextResponse.json({ error: 'Current round is not finished' }, { status: 400 });
  }

  // Safety net: refill any busted players before starting next round
  await refillBustedPlayers(supabase, room.id);

  // Get active players with chips remaining
  const { data: players } = await supabase
    .from('room_players')
    .select('user_id, seat_number, chips_at_table')
    .eq('room_id', room.id)
    .neq('status', 'left')
    .gt('chips_at_table', 0)
    .order('seat_number');

  if (!players || players.length === 0) {
    return NextResponse.json({ error: 'No players with chips remaining' }, { status: 400 });
  }

  // Create new round, carrying forward the shoe
  const roundState = createNewRound(
    room.id,
    players.map((p) => ({ seatNumber: p.seat_number, userId: p.user_id })),
    prevState.shoe,
    prevState.cardsDealt
  );

  // Insert new game round
  const { error: insertError } = await supabase
    .from('multiplayer_game_rounds')
    .insert({
      room_id: room.id,
      round_number: prevState.roundNumber + 1,
      phase: roundState.phase,
      active_seat: roundState.activeSeat,
      active_hand_index: roundState.activeHandIndex,
      shoe: roundState.shoe,
      cards_dealt: roundState.cardsDealt,
      cut_card_position: roundState.cutCardPosition,
      needs_reshuffle: roundState.needsReshuffle,
      player_hands: roundState.playerHands,
      dealer_cards: roundState.dealerCards,
      hole_card_revealed: roundState.holeCardRevealed,
    });

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create next round' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
