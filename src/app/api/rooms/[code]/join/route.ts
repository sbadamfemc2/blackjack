import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toRoomPlayer, RoomPlayerRow } from '@/lib/types/multiplayer';

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

  // Fetch room
  const { data: room, error: roomError } = await supabase
    .from('multiplayer_rooms')
    .select('*')
    .eq('code', code)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'Room is not accepting players' }, { status: 400 });
  }

  // Check if already in room
  const { data: existing } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .neq('status', 'left')
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already in this room' }, { status: 400 });
  }

  // Get occupied seats
  const { data: seated } = await supabase
    .from('room_players')
    .select('seat_number')
    .eq('room_id', room.id)
    .neq('status', 'left');

  const occupiedSeats = new Set((seated ?? []).map((p) => p.seat_number));

  if (occupiedSeats.size >= room.max_players) {
    return NextResponse.json({ error: 'Room is full' }, { status: 400 });
  }

  // Find next available seat
  let seatNumber = 1;
  while (occupiedSeats.has(seatNumber) && seatNumber <= 5) {
    seatNumber++;
  }

  const body = await request.json();
  const buyIn = body.buyIn ?? room.min_bet * 20;

  // Debit buy-in
  const { data: debitResult, error: debitError } = await supabase
    .rpc('debit_balance', {
      p_user_id: user.id,
      p_amount: buyIn,
      p_type: 'room_buy_in',
      p_ref_id: room.id,
    });

  if (debitError) {
    return NextResponse.json(
      { error: debitError.message.includes('Insufficient') ? 'Insufficient balance' : 'Failed to debit balance' },
      { status: 400 }
    );
  }

  // Insert player
  const { data: player, error: insertError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: user.id,
      seat_number: seatNumber,
      chips_at_table: buyIn,
    })
    .select('*, profiles(display_name)')
    .single();

  if (insertError || !player) {
    // Refund on failure
    await supabase.rpc('credit_balance', {
      p_user_id: user.id,
      p_amount: buyIn,
      p_type: 'room_cashout',
      p_ref_id: room.id,
    });
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }

  return NextResponse.json({
    player: toRoomPlayer(player as RoomPlayerRow),
    balanceAfter: debitResult,
  });
}
