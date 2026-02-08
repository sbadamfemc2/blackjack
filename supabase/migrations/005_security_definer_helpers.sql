-- ============================================================
-- SECURITY DEFINER functions for cross-player operations
-- These bypass RLS to allow host/server routes to update
-- other players' data (chip counts, host migration, etc.)
-- ============================================================

-- Migrate host to a new player (called when current host leaves)
CREATE OR REPLACE FUNCTION migrate_host(
  p_room_id UUID,
  p_new_host_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE multiplayer_rooms
  SET host_id = p_new_host_id, updated_at = now()
  WHERE id = p_room_id;
END;
$$;

-- Update a player's chips_at_table (for cross-player chip operations)
CREATE OR REPLACE FUNCTION update_chips_at_table(
  p_room_id UUID,
  p_user_id UUID,
  p_new_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE room_players
  SET chips_at_table = p_new_amount
  WHERE room_id = p_room_id AND user_id = p_user_id;
END;
$$;

-- Mark a player as left and zero their chips (for room closure)
CREATE OR REPLACE FUNCTION mark_player_left(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE room_players
  SET status = 'left', chips_at_table = 0
  WHERE room_id = p_room_id AND user_id = p_user_id;
END;
$$;

-- Close a room (for when all players leave)
CREATE OR REPLACE FUNCTION close_room(
  p_room_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE multiplayer_rooms
  SET status = 'closed', updated_at = now()
  WHERE id = p_room_id;
END;
$$;
