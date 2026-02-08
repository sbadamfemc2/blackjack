import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { placeBet } from '@/lib/multiplayer/gameEngine';
import { toMultiplayerGameState, GameRoundRow } from '@/lib/types/game';

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

  const { amount } = await request.json();

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

  const result = placeBet(
    gameState,
    player.seat_number,
    user.id,
    amount,
    player.chips_at_table,
    room.min_bet,
    room.max_bet
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Update game round
  await supabase
    .from('multiplayer_game_rounds')
    .update({
      player_hands: result.updates!.playerHands,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameState.id);

  return NextResponse.json({ success: true });
}
