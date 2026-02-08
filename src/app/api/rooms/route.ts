import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRoomCode } from '@/lib/roomCode';
import { toRoom, RoomRow } from '@/lib/types/multiplayer';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const minBet = body.minBet ?? 25;
  const maxBet = body.maxBet ?? 500;
  const maxPlayers = body.maxPlayers ?? 5;
  const buyIn = body.buyIn ?? minBet * 20; // Default buy-in: 20x min bet

  if (minBet < 1 || maxBet < minBet || maxPlayers < 2 || maxPlayers > 5) {
    return NextResponse.json({ error: 'Invalid room settings' }, { status: 400 });
  }

  // Generate unique room code (retry on collision)
  let code = generateRoomCode();
  let retries = 5;
  while (retries > 0) {
    const { data: existing } = await supabase
      .from('multiplayer_rooms')
      .select('id')
      .eq('code', code)
      .single();

    if (!existing) break;
    code = generateRoomCode();
    retries--;
  }

  if (retries === 0) {
    return NextResponse.json({ error: 'Failed to generate room code' }, { status: 500 });
  }

  // Debit buy-in from host balance
  const { data: debitResult, error: debitError } = await supabase
    .rpc('debit_balance', {
      p_user_id: user.id,
      p_amount: buyIn,
      p_type: 'room_buy_in',
    });

  if (debitError) {
    return NextResponse.json(
      { error: debitError.message.includes('Insufficient') ? 'Insufficient balance' : 'Failed to debit balance' },
      { status: 400 }
    );
  }

  // Create room
  const { data: room, error: roomError } = await supabase
    .from('multiplayer_rooms')
    .insert({
      code,
      host_id: user.id,
      min_bet: minBet,
      max_bet: maxBet,
      max_players: maxPlayers,
    })
    .select()
    .single();

  if (roomError || !room) {
    // Refund on failure
    await supabase.rpc('credit_balance', {
      p_user_id: user.id,
      p_amount: buyIn,
      p_type: 'room_cashout',
    });
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }

  // Seat host at seat 1
  const { error: seatError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: user.id,
      seat_number: 1,
      chips_at_table: buyIn,
    });

  if (seatError) {
    // Refund on failure
    await supabase.rpc('credit_balance', {
      p_user_id: user.id,
      p_amount: buyIn,
      p_type: 'room_cashout',
    });
    return NextResponse.json({ error: 'Failed to seat host' }, { status: 500 });
  }

  return NextResponse.json({
    room: toRoom(room as RoomRow),
    balanceAfter: debitResult,
  });
}
