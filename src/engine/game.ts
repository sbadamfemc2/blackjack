import {
  Card,
  GameState,
  GameAction,
  GamePhase,
  PlayerHand,
  DealerHand,
  PlayerAction,
  GAME_CONFIG,
} from './types';
import { DeckManager } from './deck';
import {
  evaluateHand,
  canSplit,
  isDealerShowingAce,
  isDealerShowingTen,
  shouldDealerHit,
  determineOutcome,
} from './hand';
import {
  validateBet,
  validateAllBets,
  calculatePayout,
  calculateEvenMoney,
  canAffordDouble,
  canAffordSplit,
} from './betting';

// ============================================================
// Helper: create initial empty player hand
// ============================================================

function createEmptyPlayerHand(bet: number = 0): PlayerHand {
  return {
    cards: [],
    bet,
    actions: [],
    isDoubled: false,
    isSplit: false,
    isSurrendered: false,
    isStood: false,
    outcome: null,
    payout: 0,
  };
}

function createEmptyDealerHand(): DealerHand {
  return {
    cards: [],
    holeCardRevealed: false,
  };
}

// ============================================================
// Create initial game state
// ============================================================

export function createInitialGameState(
  chips: number,
  handsConfiguration: 1 | 2 | 3 | 4 | 5 | 6,
  sessionId: string,
  shoe?: Card[],
  cardsDealt?: number
): GameState {
  return {
    phase: 'BETTING',
    shoe: shoe ?? [],
    cutCardPosition: 0,
    needsReshuffle: false,
    playerHands: [],
    dealerHand: createEmptyDealerHand(),
    activeHandIndex: 0,
    chips,
    bets: new Array(handsConfiguration).fill(0),
    handsConfiguration,
    sessionId,
    handNumber: 0,
    evenMoneyOffered: false,
    evenMoneyHandIndex: null,
  };
}

// ============================================================
// Available actions for the current state
// ============================================================

export function getAvailableActions(state: GameState): PlayerAction[] {
  if (state.phase !== 'PLAYER_ACTION') return [];

  const hand = state.playerHands[state.activeHandIndex];
  if (!hand) return [];

  const total = evaluateHand(hand.cards, hand.isSplit);
  if (total.isBust || total.isBlackjack || hand.isStood || hand.isSurrendered) {
    return [];
  }

  // If doubled, no more actions (hand automatically stands after 1 card)
  if (hand.isDoubled) return [];

  const actions: PlayerAction[] = ['hit', 'stand'];

  // Double down: available on any first 2 cards (including after split)
  if (hand.cards.length === 2 && canAffordDouble(hand.bet, state.chips)) {
    actions.push('double');
  }

  // Split: available on first 2 cards of same value, if can afford and under max splits
  const totalPlayerHands = state.playerHands.length;
  if (
    hand.cards.length === 2 &&
    canSplit(hand.cards) &&
    totalPlayerHands < GAME_CONFIG.MAX_SPLITS &&
    canAffordSplit(hand.bet, state.chips)
  ) {
    actions.push('split');
  }

  // Surrender: only on first decision (2 cards, no prior actions, not split hand)
  if (
    hand.cards.length === 2 &&
    hand.actions.length === 0 &&
    !hand.isSplit
  ) {
    actions.push('surrender');
  }

  return actions;
}

// ============================================================
// Game Reducer - handles all state transitions
// ============================================================

export function gameReducer(state: GameState, action: GameAction, deck: DeckManager): GameState {
  switch (action.type) {
    case 'PLACE_BET':
      return handlePlaceBet(state, action.handIndex, action.amount);
    case 'CLEAR_BET':
      return handleClearBet(state, action.handIndex);
    case 'CLEAR_ALL_BETS':
      return handleClearAllBets(state);
    case 'SAME_BET':
      return handleSameBet(state, action.previousBets);
    case 'DOUBLE_PREVIOUS_BET':
      return handleDoublePreviousBet(state, action.previousBets);
    case 'DEAL':
      return handleDeal(state, deck);
    case 'HIT':
      return handleHit(state, deck);
    case 'STAND':
      return handleStand(state);
    case 'DOUBLE_DOWN':
      return handleDoubleDown(state, deck);
    case 'SPLIT':
      return handleSplit(state, deck);
    case 'SURRENDER':
      return handleSurrender(state);
    case 'ACCEPT_EVEN_MONEY':
      return handleAcceptEvenMoney(state);
    case 'DECLINE_EVEN_MONEY':
      return handleDeclineEvenMoney(state);
    case 'DEALER_PLAY':
      return handleDealerPlay(state, deck);
    case 'RESOLVE':
      return handleResolve(state);
    case 'NEW_ROUND':
      return handleNewRound(state, deck);
    default:
      return state;
  }
}

// ============================================================
// Action Handlers
// ============================================================

function handlePlaceBet(state: GameState, handIndex: number, amount: number): GameState {
  if (state.phase !== 'BETTING') return state;
  if (handIndex < 0 || handIndex >= state.handsConfiguration) return state;

  const currentOtherBets = state.bets.reduce((sum, b, i) => (i === handIndex ? sum : sum + b), 0);
  const validation = validateBet(amount, state.chips, currentOtherBets);
  if (!validation.valid) return state;

  const newBets = [...state.bets];
  newBets[handIndex] = amount;
  return { ...state, bets: newBets };
}

function handleClearBet(state: GameState, handIndex: number): GameState {
  if (state.phase !== 'BETTING') return state;
  const newBets = [...state.bets];
  newBets[handIndex] = 0;
  return { ...state, bets: newBets };
}

function handleClearAllBets(state: GameState): GameState {
  if (state.phase !== 'BETTING') return state;
  return { ...state, bets: new Array(state.handsConfiguration).fill(0) };
}

function handleSameBet(state: GameState, previousBets: number[]): GameState {
  if (state.phase !== 'BETTING') return state;
  const total = previousBets.reduce((sum, b) => sum + b, 0);
  if (total > state.chips) return state;

  const newBets = previousBets.slice(0, state.handsConfiguration);
  while (newBets.length < state.handsConfiguration) {
    newBets.push(0);
  }
  return { ...state, bets: newBets };
}

function handleDoublePreviousBet(state: GameState, previousBets: number[]): GameState {
  if (state.phase !== 'BETTING') return state;
  const doubled = previousBets.map(b => b * 2);
  const total = doubled.reduce((sum, b) => sum + b, 0);
  if (total > state.chips) return state;

  const newBets = doubled.slice(0, state.handsConfiguration);
  while (newBets.length < state.handsConfiguration) {
    newBets.push(0);
  }
  return { ...state, bets: newBets };
}

function handleDeal(state: GameState, deck: DeckManager): GameState {
  if (state.phase !== 'BETTING') return state;

  const validation = validateAllBets(state.bets, state.handsConfiguration, state.chips);
  if (!validation.valid) return state;

  // Reshuffle if needed before dealing
  if (deck.needsReshuffle()) {
    deck.reshuffle();
  }

  // Deduct bets from chips
  const totalBets = state.bets.reduce((sum, b) => sum + b, 0);
  let chips = state.chips - totalBets;

  // Create player hands with bets
  const playerHands: PlayerHand[] = state.bets.map(bet => createEmptyPlayerHand(bet));

  // Create dealer hand
  const dealerHand = createEmptyDealerHand();

  // Deal cards: 2 rounds - first card to each player hand, then dealer, repeat
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < playerHands.length; i++) {
      playerHands[i].cards.push(deck.deal());
    }
    dealerHand.cards.push(deck.deal());
  }

  let newState: GameState = {
    ...state,
    phase: 'DEALING',
    chips,
    playerHands,
    dealerHand,
    activeHandIndex: 0,
    handNumber: state.handNumber + 1,
    needsReshuffle: deck.needsReshuffle(),
    evenMoneyOffered: false,
    evenMoneyHandIndex: null,
  };

  // Check for dealer blackjack scenarios
  const dealerTotal = evaluateHand(dealerHand.cards);
  const dealerShowsAce = isDealerShowingAce(dealerHand.cards);
  const dealerShowsTen = isDealerShowingTen(dealerHand.cards);

  // Check if any player hand has blackjack and dealer shows Ace -> offer even money
  if (dealerShowsAce) {
    for (let i = 0; i < playerHands.length; i++) {
      const playerTotal = evaluateHand(playerHands[i].cards);
      if (playerTotal.isBlackjack) {
        newState = {
          ...newState,
          phase: 'PLAYER_ACTION',
          evenMoneyOffered: true,
          evenMoneyHandIndex: i,
        };
        return newState;
      }
    }
  }

  // Dealer checks for blackjack if showing Ace or 10-value
  if ((dealerShowsAce || dealerShowsTen) && dealerTotal.isBlackjack) {
    // Dealer has blackjack - reveal hole card and resolve immediately
    newState = {
      ...newState,
      phase: 'RESOLUTION',
      dealerHand: { ...dealerHand, holeCardRevealed: true },
    };
    return handleResolve(newState);
  }

  // Move to player action phase
  newState = { ...newState, phase: 'PLAYER_ACTION' };

  // Skip hands that have blackjack (they auto-stand)
  return advanceToNextPlayableHand(newState);
}

function handleHit(state: GameState, deck: DeckManager): GameState {
  if (state.phase !== 'PLAYER_ACTION') return state;

  const handIndex = state.activeHandIndex;
  const hand = state.playerHands[handIndex];
  if (!hand) return state;

  const available = getAvailableActions(state);
  if (!available.includes('hit')) return state;

  const newCard = deck.deal();
  const newHand: PlayerHand = {
    ...hand,
    cards: [...hand.cards, newCard],
    actions: [...hand.actions, 'hit'],
  };

  const newHands = [...state.playerHands];
  newHands[handIndex] = newHand;

  let newState: GameState = {
    ...state,
    playerHands: newHands,
    needsReshuffle: deck.needsReshuffle(),
  };

  // Check if busted or hit 21
  const total = evaluateHand(newHand.cards, newHand.isSplit);
  if (total.isBust || total.best === 21) {
    // Auto-stand on bust or 21
    newHands[handIndex] = { ...newHand, isStood: true };
    newState = { ...newState, playerHands: newHands };
    return advanceToNextPlayableHand(newState);
  }

  return newState;
}

function handleStand(state: GameState): GameState {
  if (state.phase !== 'PLAYER_ACTION') return state;

  const handIndex = state.activeHandIndex;
  const hand = state.playerHands[handIndex];
  if (!hand) return state;

  const newHand: PlayerHand = {
    ...hand,
    isStood: true,
    actions: [...hand.actions, 'stand'],
  };

  const newHands = [...state.playerHands];
  newHands[handIndex] = newHand;

  const newState: GameState = {
    ...state,
    playerHands: newHands,
  };

  return advanceToNextPlayableHand(newState);
}

function handleDoubleDown(state: GameState, deck: DeckManager): GameState {
  if (state.phase !== 'PLAYER_ACTION') return state;

  const handIndex = state.activeHandIndex;
  const hand = state.playerHands[handIndex];
  if (!hand) return state;

  const available = getAvailableActions(state);
  if (!available.includes('double')) return state;

  const newCard = deck.deal();
  const newHand: PlayerHand = {
    ...hand,
    cards: [...hand.cards, newCard],
    bet: hand.bet * 2,
    isDoubled: true,
    isStood: true, // auto-stand after double
    actions: [...hand.actions, 'double'],
  };

  // Deduct additional bet from chips
  const chips = state.chips - hand.bet;

  const newHands = [...state.playerHands];
  newHands[handIndex] = newHand;

  const newState: GameState = {
    ...state,
    playerHands: newHands,
    chips,
    needsReshuffle: deck.needsReshuffle(),
  };

  return advanceToNextPlayableHand(newState);
}

function handleSplit(state: GameState, deck: DeckManager): GameState {
  if (state.phase !== 'PLAYER_ACTION') return state;

  const handIndex = state.activeHandIndex;
  const hand = state.playerHands[handIndex];
  if (!hand) return state;

  const available = getAvailableActions(state);
  if (!available.includes('split')) return state;

  // Create two new hands from the split
  const hand1: PlayerHand = {
    ...createEmptyPlayerHand(hand.bet),
    cards: [hand.cards[0], deck.deal()],
    isSplit: true,
    actions: ['split'],
  };

  const hand2: PlayerHand = {
    ...createEmptyPlayerHand(hand.bet),
    cards: [hand.cards[1], deck.deal()],
    isSplit: true,
    actions: ['split'],
  };

  // Deduct additional bet for the second hand
  const chips = state.chips - hand.bet;

  // Replace the current hand with hand1, insert hand2 right after
  const newHands = [...state.playerHands];
  newHands.splice(handIndex, 1, hand1, hand2);

  let newState: GameState = {
    ...state,
    playerHands: newHands,
    chips,
    needsReshuffle: deck.needsReshuffle(),
  };

  // Check if first split hand needs to auto-advance (e.g., got 21)
  const total1 = evaluateHand(hand1.cards, true);
  if (total1.best === 21) {
    newHands[handIndex] = { ...hand1, isStood: true };
    newState = { ...newState, playerHands: [...newHands] };
    return advanceToNextPlayableHand(newState);
  }

  return newState;
}

function handleSurrender(state: GameState): GameState {
  if (state.phase !== 'PLAYER_ACTION') return state;

  const handIndex = state.activeHandIndex;
  const hand = state.playerHands[handIndex];
  if (!hand) return state;

  const available = getAvailableActions(state);
  if (!available.includes('surrender')) return state;

  const newHand: PlayerHand = {
    ...hand,
    isSurrendered: true,
    isStood: true,
    actions: [...hand.actions, 'surrender'],
  };

  const newHands = [...state.playerHands];
  newHands[handIndex] = newHand;

  const newState: GameState = {
    ...state,
    playerHands: newHands,
  };

  return advanceToNextPlayableHand(newState);
}

function handleAcceptEvenMoney(state: GameState): GameState {
  if (!state.evenMoneyOffered || state.evenMoneyHandIndex === null) return state;

  const handIndex = state.evenMoneyHandIndex;
  const hand = state.playerHands[handIndex];
  if (!hand) return state;

  const payout = calculateEvenMoney(hand.bet);

  const newHand: PlayerHand = {
    ...hand,
    isStood: true,
    outcome: 'win',
    payout,
    actions: [...hand.actions],
  };

  const newHands = [...state.playerHands];
  newHands[handIndex] = newHand;

  // Add payout back to chips (bet was already deducted, so return bet + profit)
  const chips = state.chips + hand.bet + payout;

  let newState: GameState = {
    ...state,
    playerHands: newHands,
    chips,
    evenMoneyOffered: false,
    evenMoneyHandIndex: null,
  };

  // Now check if dealer has blackjack (resolve remaining hands)
  const dealerTotal = evaluateHand(state.dealerHand.cards);
  if (dealerTotal.isBlackjack) {
    newState = {
      ...newState,
      phase: 'RESOLUTION',
      dealerHand: { ...state.dealerHand, holeCardRevealed: true },
    };
    return handleResolve(newState);
  }

  // Dealer doesn't have blackjack - continue with remaining hands
  return advanceToNextPlayableHand(newState);
}

function handleDeclineEvenMoney(state: GameState): GameState {
  if (!state.evenMoneyOffered || state.evenMoneyHandIndex === null) return state;

  let newState: GameState = {
    ...state,
    evenMoneyOffered: false,
    evenMoneyHandIndex: null,
  };

  // Check if dealer has blackjack
  const dealerTotal = evaluateHand(state.dealerHand.cards);
  if (dealerTotal.isBlackjack) {
    // Dealer BJ - resolve all hands (player BJ pushes, others lose)
    newState = {
      ...newState,
      phase: 'RESOLUTION',
      dealerHand: { ...state.dealerHand, holeCardRevealed: true },
    };
    return handleResolve(newState);
  }

  // Dealer doesn't have BJ - player's blackjack hand auto-stands with 3:2 pending
  const handIndex = state.evenMoneyHandIndex;
  const newHands = [...state.playerHands];
  newHands[handIndex] = { ...newHands[handIndex], isStood: true };

  newState = { ...newState, playerHands: newHands };
  return advanceToNextPlayableHand(newState);
}

function handleDealerPlay(state: GameState, deck: DeckManager): GameState {
  if (state.phase !== 'DEALER_PLAY') return state;

  const dealerCards = [...state.dealerHand.cards];

  // Dealer hits until standing (hits soft 17)
  while (shouldDealerHit(dealerCards)) {
    dealerCards.push(deck.deal());
  }

  const newState: GameState = {
    ...state,
    phase: 'RESOLUTION',
    dealerHand: {
      cards: dealerCards,
      holeCardRevealed: true,
    },
    needsReshuffle: deck.needsReshuffle(),
  };

  return handleResolve(newState);
}

function handleResolve(state: GameState): GameState {
  const dealerTotal = evaluateHand(state.dealerHand.cards);
  let chips = state.chips;

  const resolvedHands = state.playerHands.map(hand => {
    // Skip already resolved hands (e.g., even money accepted)
    if (hand.outcome !== null) return hand;

    const playerTotal = evaluateHand(hand.cards, hand.isSplit);
    const outcome = determineOutcome(playerTotal, dealerTotal, hand.isSurrendered);
    const payout = calculatePayout(hand.bet, outcome);

    // Add back bet + payout for non-loss outcomes
    // bet was already deducted during DEAL, so:
    // loss: chips stay (bet already gone), payout is -bet but bet already deducted so net 0 change
    // Actually, let's think about this more carefully:
    // During DEAL, total bets were deducted from chips.
    // During DOUBLE, additional bet was deducted.
    // Now we need to return: original bet + payout for wins/pushes, nothing for losses.
    // payout is NET: +bet for win, +1.5*bet for BJ, 0 for push, -bet for loss, -bet/2 for surrender
    // So the return to the player is: bet + payout
    // For a loss: bet + (-bet) = 0 (correct, already lost the bet)
    // For a win: bet + bet = 2*bet (correct, original bet + winnings)
    // For BJ: bet + 1.5*bet = 2.5*bet (correct)
    // For push: bet + 0 = bet (correct, bet returned)
    // For surrender: bet + (-bet/2) = bet/2 (correct, half returned)
    const returnToPlayer = hand.bet + payout;
    chips += returnToPlayer;

    return {
      ...hand,
      outcome,
      payout,
    };
  });

  return {
    ...state,
    phase: 'ROUND_OVER',
    playerHands: resolvedHands,
    chips,
    dealerHand: {
      ...state.dealerHand,
      holeCardRevealed: true,
    },
  };
}

function handleNewRound(state: GameState, deck: DeckManager): GameState {
  // Check if player is busted (no chips)
  if (state.chips <= 0) {
    return state; // Session over - UI should handle this
  }

  // Reshuffle if needed
  if (state.needsReshuffle || deck.needsReshuffle()) {
    deck.reshuffle();
  }

  return {
    ...state,
    phase: 'BETTING',
    playerHands: [],
    dealerHand: createEmptyDealerHand(),
    activeHandIndex: 0,
    bets: new Array(state.handsConfiguration).fill(0),
    needsReshuffle: false,
    evenMoneyOffered: false,
    evenMoneyHandIndex: null,
  };
}

// ============================================================
// Helper: advance to next playable hand or dealer play
// ============================================================

function advanceToNextPlayableHand(state: GameState): GameState {
  let index = state.activeHandIndex;

  // Find next hand that needs action
  while (index < state.playerHands.length) {
    const hand = state.playerHands[index];
    const total = evaluateHand(hand.cards, hand.isSplit);

    // Skip hands that are done (stood, busted, blackjack, surrendered, doubled)
    if (hand.isStood || total.isBust || total.isBlackjack || hand.isSurrendered || hand.isDoubled) {
      index++;
      continue;
    }

    // This hand needs action
    return { ...state, activeHandIndex: index };
  }

  // All player hands are done - check if dealer needs to play
  const anyPlayerHandAlive = state.playerHands.some(hand => {
    if (hand.outcome !== null) return false; // already resolved (e.g., even money)
    if (hand.isSurrendered) return false;
    const total = evaluateHand(hand.cards, hand.isSplit);
    return !total.isBust;
  });

  if (anyPlayerHandAlive) {
    // Move to dealer play
    return {
      ...state,
      phase: 'DEALER_PLAY',
      activeHandIndex: index,
    };
  }

  // All hands busted or surrendered - resolve without dealer playing
  return handleResolve({
    ...state,
    dealerHand: { ...state.dealerHand, holeCardRevealed: true },
  });
}
