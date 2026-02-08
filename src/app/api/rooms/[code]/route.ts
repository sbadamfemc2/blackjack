import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toRoom, toRoomPlayer, RoomRow, RoomPlayerRow } from '@/lib/types/multiplayer';

export async function GET(
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
  const { data: room, error: roomError } = await supabase
    .from('multiplayer_rooms')
    .select('*')
    .eq('code', code)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Fetch active players with display names
  const { data: players, error: playersError } = await supabase
    .from('room_players')
    .select('*, profiles(display_name)')
    .eq('room_id', room.id)
    .neq('status', 'left')
    .order('seat_number');

  if (playersError) {
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }

  return NextResponse.json({
    room: toRoom(room as RoomRow),
    players: (players as RoomPlayerRow[]).map(toRoomPlayer),
  });
}
