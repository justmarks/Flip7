# Flip 7 Score Tracker

A mobile-friendly web app for tracking scores while playing **Flip 7** — the fast-paced, press-your-luck card game by [The Op Games](https://theop.games/pages/flip-7).

## About Flip 7

Flip 7 is a card game for 3+ players where you race to be the first to reach **200 points**. Each turn you decide: play it safe and bank your points, or push your luck and risk losing everything.

The deck contains number cards 0–12 (the higher the number, the more copies in the deck), plus special Action and Score Modifier cards. The twist — if you draw a number you already have in front of you, you **bust** and score nothing for the round.

**[See the official rules and learn how to play →](https://theop.games/pages/flip-7)**

## Rules Summary

### Objective
Be the first player to reach **200 points** across multiple rounds.

### The Deck (94 cards)
- **Number cards (0–12):** The number of copies equals the card's value (twelve 12s, eleven 11s… one 1, one 0). Higher cards are worth more points but appear more often, making them riskier to chase.
- **Score Modifier cards:** +2, +4, +6, +8, +10 (add to your number card total), or ×2 (doubles your number card total before adding other bonuses).
- **Action cards:**
  - **Freeze** — you immediately bank your current points and exit the round.
  - **Flip Three** — you must accept the next 3 cards.
  - **Second Chance** — saves you from one bust. If you draw a duplicate, discard the Second Chance and the duplicate instead of busting.

### Playing a Round
1. The dealer deals one card face-up to each player in turn order. Resolve any Action cards immediately.
2. Starting with the dealer, each active player chooses to **Hit** (draw another card) or **Stay** (bank their points and sit out the rest of the round).
3. The round ends when all players have either busted or stayed, **or** when one player collects 7 unique Number cards (the **Flip 7** bonus).

### Scoring
1. Add the face values of your Number cards.
2. If you have a **×2** modifier, double that total.
3. Add any **+bonus** modifier cards.
4. If you collected **7 unique Number cards**, add **15 bonus points**.
5. If you **busted**, you score **0** for the round.

### Winning
At the end of any round where at least one player has reached 200 points, the player with the **most points wins**.

---

## About This App

This score tracker is designed to be used alongside a physical Flip 7 deck. It handles all the maths so you can focus on the game.

### Features
- Add 2–18 players by name
- Round-by-round score entry with a built-in calculator:
  - Enter your number card total with **−** / **+** buttons or by typing directly
  - Tap your Score Modifier cards (+2 through +10, ×2)
  - Check the **Flip 7 bonus** if you landed all 7 unique cards
  - Mark a player as **Busted** to record 0 for the round
- Live standings and round history visible while entering scores
- **Player autocomplete** — name inputs suggest known players from past games; already-selected names are dimmed
- **Leaderboard** — all-time stats per player (games played, wins, highest score, win%) plus a recent-games list showing the last 20 games with winner and per-player scores
- **Persistent history** — stats and game history are saved in your browser's local storage and survive page reloads
- Remembers player names between games
- "Are you sure?" prompt before abandoning a game in progress
- Detects the winner and shows final standings

### Clearing History

To wipe the recent games list, navigate to the app with `?ClearHistory` appended to the URL (e.g. `https://yourapp.com/?ClearHistory`). You'll be prompted to confirm before anything is deleted. Player win/loss stats are not affected.

### Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

*Flip 7 is published by [The Op Games](https://theop.games). This score tracker is an unofficial fan project and is not affiliated with or endorsed by The Op Games or USAOpoly.*
