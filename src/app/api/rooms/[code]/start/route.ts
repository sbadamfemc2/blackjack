import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNewRound } from '@/lib/multiplayer/gameEngine';

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
    return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 });
  }

  // Get active players
  const { data: players } = await supabase
    .from('room_players')
    .select('user_id, seat_number, chips_at_table')
    .eq('room_id', room.id)
    .neq('status', 'left')
    .order('seat_number');

  if (!players || players.length === 0) {
    return NextResponse.json({ error: 'No players in room' }, { status: 400 });
  }

  // Create initial round
  const roundState = createNewRound(
    room.id,
    players.map((p) => ({ seatNumber: p.seat_number, userId: p.user_id }))
  );

  // Insert game round
  const { error: insertError } = await supabase
    .from('multiplayer_game_rounds')
    .insert({
      room_id: room.id,
      round_number: roundState.roundNumber,
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
    return NextResponse.json({ error: 'Failed to create game round' }, { status: 500 });
  }

  // Update room status to playing
  await supabase
    .from('multiplayer_rooms')
    .update({ status: 'playing', updated_at: new Date().toISOString() })
    .eq('id', room.id);

  // Update player statuses
  await supabase
    .from('room_players')
    .update({ status: 'playing' })
    .eq('room_id', room.id)
    .neq('status', 'left');

  return NextResponse.json({ success: true });
}
