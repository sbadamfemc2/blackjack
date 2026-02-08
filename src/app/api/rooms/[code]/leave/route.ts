import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { playerStand, playDealer, resolveRound } from '@/lib/multiplayer/gameEngine';
import { toMultiplayerGameState, GameRoundRow, MultiplayerGameState } from '@/lib/types/game';
import { updatePlayerChips, saveGameState } from '@/lib/multiplayer/serverHelpers';
import { refillBustedPlayers } from '@/lib/multiplayer/refill';

export async function POST(
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

  // Find player's seat
  const { data: player, error: playerError } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .neq('status', 'left')
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: 'Not in this room' }, { status: 400 });
  }

  // ============================================================
  // Handle game state if room is playing
  // ============================================================
  if (room.status === 'playing') {
    const { data: roundRow } = await supabase
      .from('multiplayer_game_rounds')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (roundRow) {
      const gameState = toMultiplayerGameState(roundRow as GameRoundRow);

      if (gameState.phase === 'player_action') {
        let currentState = { ...gameState };
        let allUpdates: Partial<MultiplayerGameState> = {};

        // Auto-stand all of this player's active hands
        for (let i = 0; i < currentState.playerHands.length; i++) {
          const h = currentState.playerHands[i];
          if (h.userId !== user.id || h.isStood) continue;

          // Only call playerStand if we're still in player_action phase
          if (currentState.phase !== 'player_action') break;

          // Set this hand as active so playerStand validates
          const modifiedState = {
            ...currentState,
            activeHandIndex: i,
            activeSeat: h.seatNumber,
          };
          const result = playerStand(modifiedState, user.id);
          if (result.success && result.updates) {
            currentState = { ...currentState, ...result.updates } as MultiplayerGameState;
            allUpdates = { ...allUpdates, ...result.updates };
          }
        }

        // Safety: mark any remaining un-stood hands as stood
        const finalHands = currentState.playerHands.map((h) => {
          if (h.userId === user.id && !h.isStood) {
            return { ...h, isStood: true };
          }
          return h;
        });
        currentState = { ...currentState, playerHands: finalHands };
        allUpdates = { ...allUpdates, playerHands: finalHands };

        // Chain dealer_play + resolution if needed
        if (currentState.phase === 'dealer_play') {
          const dealerResult = playDealer(currentState);
          if (dealerResult.success && dealerResult.updates) {
            currentState = { ...currentState, ...dealerResult.updates } as MultiplayerGameState;
            allUpdates = { ...allUpdates, ...dealerResult.updates };
          }
        }

        if (currentState.phase === 'resolution') {
          const resolveResult = resolveRound(currentState);
          if (resolveResult.success && resolveResult.updates) {
            allUpdates = { ...allUpdates, ...resolveResult.updates };

            // Credit payouts for ALL players
            if (resolveResult.chipUpdates) {
              await updatePlayerChips(
                supabase,
                room.id,
                resolveResult.chipUpdates.map((u) => ({ userId: u.userId, delta: u.netReturn }))
              );
            }
          }
        }

        // Save updated game state
        await saveGameState(supabase, gameState.id, gameState, allUpdates);

        // Refill busted players (exclude leaving player)
        if (allUpdates.phase === 'round_over') {
          await refillBustedPlayers(supabase, room.id, [user.id]);
        }

        // Re-fetch player to get updated chips_at_table after payouts
        const { data: updatedPlayer } = await supabase
          .from('room_players')
          .select('chips_at_table')
          .eq('room_id', room.id)
          .eq('user_id', user.id)
          .single();

        if (updatedPlayer) {
          player.chips_at_table = updatedPlayer.chips_at_table;
        }
      }

      if (gameState.phase === 'betting') {
        // Remove this player's hand entry from the round
        const handsWithout = gameState.playerHands.filter((h) => h.userId !== user.id);
        await supabase
          .from('multiplayer_game_rounds')
          .update({
            player_hands: handsWithout,
            updated_at: new Date().toISOString(),
          })
          .eq('id', gameState.id);
      }
    }
  }

  // ============================================================
  // Credit remaining chips back to balance
  // ============================================================
  if (player.chips_at_table > 0) {
    const { error: creditError } = await supabase
      .rpc('credit_balance', {
        p_user_id: user.id,
        p_amount: player.chips_at_table,
        p_type: 'room_cashout',
        p_ref_id: room.id,
      });

    if (creditError) {
      return NextResponse.json({ error: 'Failed to credit balance' }, { status: 500 });
    }
  }

  // Mark player as left
  await supabase
    .from('room_players')
    .update({ status: 'left', chips_at_table: 0 })
    .eq('id', player.id);

  // ============================================================
  // Host migration / room closure
  // ============================================================
  if (room.host_id === user.id) {
    if (room.status === 'waiting') {
      // Close room, refund all remaining players
      const { data: otherPlayers } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', room.id)
        .neq('status', 'left')
        .neq('user_id', user.id);

      if (otherPlayers) {
        for (const p of otherPlayers) {
          if (p.chips_at_table > 0) {
            await supabase.rpc('credit_balance', {
              p_user_id: p.user_id,
              p_amount: p.chips_at_table,
              p_type: 'room_cashout',
              p_ref_id: room.id,
            });
          }
          await supabase.rpc('mark_player_left', {
            p_room_id: room.id,
            p_user_id: p.user_id,
          });
        }
      }

      await supabase.rpc('close_room', { p_room_id: room.id });
    } else if (room.status === 'playing') {
      // Migrate host or close room
      const { data: remainingPlayers } = await supabase
        .from('room_players')
        .select('user_id')
        .eq('room_id', room.id)
        .neq('status', 'left')
        .neq('user_id', user.id)
        .order('seat_number')
        .limit(1);

      if (!remainingPlayers || remainingPlayers.length === 0) {
        await supabase.rpc('close_room', { p_room_id: room.id });
      } else {
        await supabase.rpc('migrate_host', {
          p_room_id: room.id,
          p_new_host_id: remainingPlayers[0].user_id,
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
