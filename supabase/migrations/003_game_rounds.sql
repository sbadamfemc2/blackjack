-- ============================================================
-- V2 Phase 2: Multiplayer Game Rounds
-- ============================================================

CREATE TABLE multiplayer_game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES multiplayer_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  phase TEXT NOT NULL CHECK (phase IN (
    'betting', 'dealing', 'player_action', 'dealer_play', 'resolution', 'round_over'
  )),
  active_seat SMALLINT,
  shoe JSONB NOT NULL,
  cards_dealt INTEGER NOT NULL DEFAULT 0,
  cut_card_position INTEGER NOT NULL,
  needs_reshuffle BOOLEAN NOT NULL DEFAULT false,
  player_hands JSONB NOT NULL DEFAULT '[]',
  dealer_cards JSONB NOT NULL DEFAULT '[]',
  hole_card_revealed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE multiplayer_game_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read game rounds"
  ON multiplayer_game_rounds FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users insert game rounds"
  ON multiplayer_game_rounds FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users update game rounds"
  ON multiplayer_game_rounds FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX idx_game_rounds_room ON multiplayer_game_rounds(room_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE multiplayer_game_rounds;
