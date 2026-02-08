-- Add active_hand_index column for split hand tracking
ALTER TABLE multiplayer_game_rounds
ADD COLUMN active_hand_index INTEGER DEFAULT NULL;
