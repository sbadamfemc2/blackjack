// ============================================================
// Multiplayer Types
// ============================================================

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'closed';
  minBet: number;
  maxBet: number;
  maxPlayers: number;
  createdAt: string;
}

export interface RoomPlayer {
  id: string;
  roomId: string;
  userId: string;
  seatNumber: number;
  chipsAtTable: number;
  status: 'seated' | 'playing' | 'left';
  displayName?: string;
}

export interface BalanceTransaction {
  id: string;
  amount: number;
  type: 'daily_bonus' | 'session_buy_in' | 'session_cashout' | 'room_buy_in' | 'room_cashout';
  referenceId?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface PlayerPresence {
  userId: string;
  displayName: string;
  seatNumber: number;
  isHost: boolean;
}

// ============================================================
// DB row → TypeScript mappers
// ============================================================

export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  status: string;
  min_bet: number;
  max_bet: number;
  max_players: number;
  created_at: string;
  updated_at: string;
}

export interface RoomPlayerRow {
  id: string;
  room_id: string;
  user_id: string;
  seat_number: number;
  chips_at_table: number;
  status: string;
  joined_at: string;
  profiles?: { display_name: string | null };
}

export function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    hostId: row.host_id,
    status: row.status as Room['status'],
    minBet: row.min_bet,
    maxBet: row.max_bet,
    maxPlayers: row.max_players,
    createdAt: row.created_at,
  };
}

export function toRoomPlayer(row: RoomPlayerRow): RoomPlayer {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    seatNumber: row.seat_number,
    chipsAtTable: row.chips_at_table,
    status: row.status as RoomPlayer['status'],
    displayName: row.profiles?.display_name ?? undefined,
  };
}
