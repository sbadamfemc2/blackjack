-- ============================================================
-- V2 Multiplayer: Balance, Rooms, Players
-- ============================================================

-- Persistent chip balance on profiles
ALTER TABLE profiles ADD COLUMN chip_balance INTEGER NOT NULL DEFAULT 10000;

-- Balance transaction audit trail
CREATE TABLE balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'daily_bonus', 'session_buy_in', 'session_cashout',
    'room_buy_in', 'room_cashout'
  )),
  reference_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Multiplayer rooms
CREATE TABLE multiplayer_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'closed')),
  min_bet INTEGER NOT NULL DEFAULT 25,
  max_bet INTEGER NOT NULL DEFAULT 500,
  max_players SMALLINT NOT NULL DEFAULT 5 CHECK (max_players BETWEEN 2 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Room players (seats)
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES multiplayer_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_number SMALLINT NOT NULL CHECK (seat_number BETWEEN 1 AND 5),
  chips_at_table INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'seated' CHECK (status IN ('seated', 'playing', 'left')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, seat_number),
  UNIQUE(room_id, user_id)
);

-- ============================================================
-- Atomic Balance Functions (row-level locking)
-- ============================================================

CREATE OR REPLACE FUNCTION debit_balance(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_ref_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT chip_balance INTO v_balance
    FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_balance, p_amount;
  END IF;

  UPDATE profiles SET chip_balance = chip_balance - p_amount, updated_at = now()
    WHERE id = p_user_id;

  INSERT INTO balance_transactions (user_id, amount, type, reference_id, balance_after)
    VALUES (p_user_id, -p_amount, p_type, p_ref_id, v_balance - p_amount);

  RETURN v_balance - p_amount;
END;
$$;

CREATE OR REPLACE FUNCTION credit_balance(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_ref_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT chip_balance INTO v_balance
    FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE profiles SET chip_balance = chip_balance + p_amount, updated_at = now()
    WHERE id = p_user_id;

  INSERT INTO balance_transactions (user_id, amount, type, reference_id, balance_after)
    VALUES (p_user_id, p_amount, p_type, p_ref_id, v_balance + p_amount);

  RETURN v_balance + p_amount;
END;
$$;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiplayer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- Balance transactions: users see only their own
CREATE POLICY "Users read own transactions"
  ON balance_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Rooms: anyone authenticated can read (to join by code)
CREATE POLICY "Authenticated users read rooms"
  ON multiplayer_rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users create rooms"
  ON multiplayer_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host updates room"
  ON multiplayer_rooms FOR UPDATE
  USING (auth.uid() = host_id);

-- Room players: anyone in the room can see all players
CREATE POLICY "Room members read players"
  ON room_players FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users join rooms"
  ON room_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own seat"
  ON room_players FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_balance_transactions_user ON balance_transactions(user_id);
CREATE INDEX idx_multiplayer_rooms_code ON multiplayer_rooms(code);
CREATE INDEX idx_multiplayer_rooms_status ON multiplayer_rooms(status);
CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_room_players_user ON room_players(user_id);

-- ============================================================
-- Enable Realtime for room tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE multiplayer_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
