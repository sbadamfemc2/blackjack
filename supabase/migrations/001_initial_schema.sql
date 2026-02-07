-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Game sessions
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  buy_in_amount INTEGER NOT NULL,
  hands_configuration SMALLINT NOT NULL CHECK (hands_configuration BETWEEN 1 AND 6),
  current_chips INTEGER NOT NULL,
  hand_number INTEGER NOT NULL DEFAULT 1,
  shoe JSONB,
  cards_dealt INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Played hands (for Phase 4 stats)
CREATE TABLE played_hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  hand_number INTEGER NOT NULL,
  bet_amount INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('blackjack','win','loss','push','surrender')),
  payout INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE played_hands ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Session policies
CREATE POLICY "Users read own sessions" ON game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON game_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Hand policies
CREATE POLICY "Users read own hands" ON played_hands FOR SELECT
  USING (session_id IN (SELECT id FROM game_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users insert own hands" ON played_hands FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM game_sessions WHERE user_id = auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Indexes
CREATE INDEX idx_game_sessions_user_status ON game_sessions(user_id, status);
CREATE INDEX idx_played_hands_session ON played_hands(session_id);
