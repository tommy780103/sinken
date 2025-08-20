/**
 * 神経衰弱（複数人対戦） - 52枚（ジョーカー除く）、同ランク一致でペア成立。
 * - 通常ペア: 1ポイント
 * - 最後の5ペア: 2ポイント（ペア残数が5以下の時に成立したペア）
 * - マッチ時は同じプレイヤーの手番継続、ミスマッチで交代
 */

/** @typedef {"♠"|"♥"|"♦"|"♣"} Suit */
/** @typedef {"A"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K"} Rank */
/**
 * @typedef {Object} Card
 * @property {string} id - 一意ID（rank+suit）
 * @property {Rank} rank
 * @property {Suit} suit
 */

/**
 * @typedef {Object} Player
 * @property {string} name
 * @property {number} score
 * @property {string} color
 */

/**
 * @typedef {Object} GameState
 * @property {Card[]} deck - 現在の山札（盤面のカード）
 * @property {Set<string>} matched - 取得済みカードID
 * @property {string[]} revealed - 表示中のカードID（最大2）
 * @property {Player[]} players - プレイヤー配列
 * @property {number} currentPlayerIndex - 現在のプレイヤーインデックス
 * @property {boolean} inputLocked - アニメーション/判定中の入力ロック
 * @property {number} pairsRemaining - 残りペア数（初期26）
 * @property {boolean} started - ゲーム中フラグ
 */

// DOM要素
const boardEl = document.getElementById("board");
const hideBtn = document.getElementById("hideBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const menuBtn = document.getElementById("menuBtn");
const setupScreen = document.getElementById("setupScreen");
const scoreboard = document.getElementById("scoreboard");
const currentPlayerName = document.getElementById("currentPlayerName");
const scoresGrid = document.getElementById("scoresGrid");
const pairsLeft = document.getElementById("pairsLeft");
const overlay = document.getElementById("overlay");
const resultHeading = document.getElementById("resultHeading");
const resultRanking = document.getElementById("resultRanking");
const restartBtn = document.getElementById("restartBtn");
const newGameBtn = document.getElementById("newGameBtn");
const startGameBtn = document.getElementById("startGameBtn");
const playerCountDisplay = document.getElementById("playerCountDisplay");
const increasePlayerBtn = document.getElementById("increasePlayerBtn");
const decreasePlayerBtn = document.getElementById("decreasePlayerBtn");
const playersList = document.getElementById("playersList");

// プレイヤー色のパレット
const playerColors = [
  "#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0",
  "#00BCD4", "#FFEB3B", "#795548", "#607D8B", "#F44336"
];

/** @type {GameState} */
let state = createInitialState();
let playerCount = 2;

/**
 * 初期状態を生成
 * @returns {GameState}
 */
function createInitialState() {
  return {
    deck: [],
    matched: new Set(),
    revealed: [],
    players: [],
    currentPlayerIndex: 0,
    inputLocked: false,
    pairsRemaining: 26,
    started: false,
  };
}

/**
 * 52枚の標準トランプデッキを生成（ジョーカー除く）
 * @returns {Card[]}
 */
function buildStandardDeck() {
  /** @type {Suit[]} */
  const suits = ["♠", "♥", "♦", "♣"];
  /** @type {Rank[]} */
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  /** @type {Card[]} */
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ id: `${rank}${suit}`, rank, suit });
    }
  }
  return deck;
}

/**
 * 配列をインプレースでシャッフル（Fisher–Yates）
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * プレイヤー設定画面を初期化
 */
function initializeSetup() {
  updatePlayersList();
}

/**
 * プレイヤーリストを更新
 */
function updatePlayersList() {
  playersList.innerHTML = "";
  for (let i = 0; i < playerCount; i++) {
    const playerItem = document.createElement("div");
    playerItem.className = "player-item";
    
    const avatar = document.createElement("div");
    avatar.className = "player-avatar";
    avatar.style.background = playerColors[i % playerColors.length];
    const letter = String.fromCharCode(65 + i); // A, B, C...
    avatar.textContent = letter;
    
    const input = document.createElement("input");
    input.type = "text";
    input.className = "player-name-input";
    input.placeholder = letter;
    input.value = letter;
    input.dataset.playerIndex = i;
    
    playerItem.appendChild(avatar);
    playerItem.appendChild(input);
    playersList.appendChild(playerItem);
  }
  playerCountDisplay.textContent = playerCount;
}

/**
 * プレイヤー数を増やす
 */
function increasePlayerCount() {
  if (playerCount < 10) {
    playerCount++;
    updatePlayersList();
  }
}

/**
 * プレイヤー数を減らす
 */
function decreasePlayerCount() {
  if (playerCount > 2) {
    playerCount--;
    updatePlayersList();
  }
}

/**
 * ゲーム開始処理
 */
function startGame() {
  // プレイヤー情報を収集
  const players = [];
  const inputs = playersList.querySelectorAll(".player-name-input");
  inputs.forEach((input, index) => {
    const letter = String.fromCharCode(65 + index); // A, B, C...
    players.push({
      name: input.value || letter,
      score: 0,
      color: playerColors[index % playerColors.length]
    });
  });
  
  state = createInitialState();
  state.deck = shuffle(buildStandardDeck());
  state.players = players;
  state.started = true;
  
  setupScreen.classList.add("hidden");
  scoreboard.classList.remove("hidden");
  overlay.classList.add("hidden");
  hideBtn.classList.add("hidden");
  menuBtn.classList.remove("hidden");
  
  renderBoard();
  renderScoreboard();
  updateUI();
}

/**
 * 盤面を描画
 */
function renderBoard() {
  boardEl.innerHTML = "";
  for (const card of state.deck) {
    const cardEl = createCardElement(card);
    boardEl.appendChild(cardEl);
  }
}

/**
 * スコアボードを描画
 */
function renderScoreboard() {
  scoresGrid.innerHTML = "";
  state.players.forEach((player, index) => {
    const scoreItem = document.createElement("div");
    scoreItem.className = `score-item ${index === state.currentPlayerIndex ? "active" : ""}`;
    scoreItem.innerHTML = `
      <div class="score-name">${player.name}</div>
      <div class="score-value">${player.score}</div>
    `;
    scoreItem.style.borderColor = player.color;
    if (index === state.currentPlayerIndex) {
      scoreItem.style.borderWidth = "3px";
    }
    scoresGrid.appendChild(scoreItem);
  });
}

/**
 * ステータス表示を更新
 */
function renderStatus() {
  const currentPlayer = state.players[state.currentPlayerIndex];
  currentPlayerName.textContent = currentPlayer.name;
  pairsLeft.textContent = String(state.pairsRemaining);
}

/**
 * ボタンの有効/表示状態を更新
 */
function updateButtons() {
  // 伏せるボタン: 2枚表で不一致のときのみ表示
  const showHide = state.started && state.revealed.length === 2 && !isCurrentRevealedMatch();
  hideBtn.classList.toggle("hidden", !showHide);
  hideBtn.disabled = !showHide;

  // シャッフル: ゲーム中かつ裏返し待ちがないとき
  const canShuffle = state.started && state.revealed.length === 0 && !state.inputLocked;
  shuffleBtn.disabled = !canShuffle;
}

/** 全体UI更新 */
function updateUI() {
  renderStatus();
  renderScoreboard();
  updateButtons();
}

/**
 * カード要素を生成
 * @param {Card} card
 * @returns {HTMLElement}
 */
function createCardElement(card) {
  const isFaceUp = state.revealed.includes(card.id) || state.matched.has(card.id);

  const wrapper = document.createElement("div");
  wrapper.className = `card${isFaceUp ? " is-flipped" : ""}${state.matched.has(card.id) ? " matched" : ""}`;
  wrapper.dataset.cardId = card.id;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", `${card.rank}の${card.suit}のカード`);
  btn.addEventListener("click", () => onCardClick(card.id));

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const back = document.createElement("div");
  back.className = "card-back";
  back.textContent = "かーど";

  const face = document.createElement("div");
  face.className = "card-face";

  const colorClass = card.suit === "♥" || card.suit === "♦" ? "suit-red" : "suit-black";
  face.innerHTML = `
    <div class="corner ${colorClass}">${card.rank}<br>${card.suit}</div>
    <div class="rank-suit ${colorClass}" aria-hidden="true" style="font-size:24px;">
      ${card.rank} ${card.suit}
    </div>
    <div class="corner bottom ${colorClass}">${card.rank}<br>${card.suit}</div>
  `;

  inner.appendChild(back);
  inner.appendChild(face);
  btn.appendChild(inner);
  wrapper.appendChild(btn);

  if (state.matched.has(card.id)) {
    wrapper.classList.add("removed");
  }

  return wrapper;
}

/**
 * カードクリック時の処理
 * @param {string} cardId
 */
function onCardClick(cardId) {
  if (!state.started || state.inputLocked) return;
  if (state.matched.has(cardId)) return; // 取得済み
  if (state.revealed.includes(cardId)) return; // すでに表

  if (state.revealed.length >= 2) return; // 念のためガード

  state.revealed.push(cardId);
  flipDOM(cardId, true);

  if (state.revealed.length === 2) {
    // 即時に一致判定へ（自動で伏せない）
    state.inputLocked = true;
    resolveTurn();
  }
  updateButtons();
}

/**
 * 2枚表後の判定処理
 */
function resolveTurn() {
  const [aId, bId] = state.revealed;
  const a = state.deck.find((c) => c.id === aId);
  const b = state.deck.find((c) => c.id === bId);

  if (!a || !b) {
    // 想定外: 安全にリセット
    state.revealed = [];
    state.inputLocked = false;
    return;
  }

  const isMatch = a.rank === b.rank;
  if (isMatch) {
    // スコア加算（最後の5ペアは2点）
    const points = getPointsForCurrentPair();
    state.players[state.currentPlayerIndex].score += points;

    state.matched.add(a.id);
    state.matched.add(b.id);
    state.pairsRemaining -= 1;

    // DOM更新（取り除く）
    markRemoved(a.id);
    markRemoved(b.id);

    state.revealed = [];
    state.inputLocked = false;
    updateUI();

    if (state.pairsRemaining === 0) {
      endGame();
      return;
    }
    // マッチしたので同じプレイヤー継続（何もしない）
  } else {
    // ミスマッチ: ユーザーが「カードを伏せる」ボタンで操作する
    // ボタンが押されるまで両カードは表のまま、入力はロック
    updateButtons();
  }
}

/**
 * 現在のペアの得点を算出
 * @returns {number}
 */
function getPointsForCurrentPair() {
  // 「最後の5ペア」は、成立前の残数が5以下の時を指す
  return state.pairsRemaining <= 5 ? 2 : 1;
}

/**
 * 指定カードをDOM上で反転表示
 * @param {string} cardId
 * @param {boolean} faceUp
 */
function flipDOM(cardId, faceUp) {
  const el = /** @type {HTMLElement|null} */ (boardEl.querySelector(`[data-card-id="${cardId}"]`));
  if (!el) return;
  if (faceUp) el.classList.add("is-flipped"); else el.classList.remove("is-flipped");
}

/**
 * 指定カードをDOM上で「取得済み」として視覚的に除去
 * @param {string} cardId
 */
function markRemoved(cardId) {
  const el = /** @type {HTMLElement|null} */ (boardEl.querySelector(`[data-card-id="${cardId}"]`));
  if (el) el.classList.add("removed");
}

/**
 * ゲーム終了処理（勝敗表示と再スタート）
 */
function endGame() {
  state.started = false;
  
  // プレイヤーをスコア順にソート
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  
  // ランキング表示を生成
  resultRanking.innerHTML = "";
  sortedPlayers.forEach((player, index) => {
    const rankItem = document.createElement("div");
    rankItem.className = `ranking-item ${index === 0 ? "winner" : ""}`;
    
    const position = document.createElement("div");
    position.className = "ranking-position";
    
    if (index < 3) {
      const medal = document.createElement("div");
      medal.className = `ranking-medal ${index === 0 ? "medal-gold" : index === 1 ? "medal-silver" : "medal-bronze"}`;
      medal.textContent = `${index + 1}`;
      position.appendChild(medal);
    } else {
      const rankNumber = document.createElement("span");
      rankNumber.textContent = `${index + 1}ばん`;
      rankNumber.style.marginLeft = "8px";
      position.appendChild(rankNumber);
    }
    
    const nameSpan = document.createElement("span");
    nameSpan.textContent = player.name;
    position.appendChild(nameSpan);
    
    const score = document.createElement("div");
    score.className = "ranking-score";
    score.textContent = `${player.score}てん`;
    
    rankItem.appendChild(position);
    rankItem.appendChild(score);
    resultRanking.appendChild(rankItem);
  });
  
  // 優勝者判定
  const winners = sortedPlayers.filter(p => p.score === sortedPlayers[0].score);
  if (winners.length > 1) {
    resultHeading.textContent = "ひきわけ！";
  } else {
    resultHeading.textContent = `${winners[0].name}のかち！`;
  }
  
  overlay.classList.remove("hidden");
}

/** 同じプレイヤーで再スタート */
function restartGame() {
  // プレイヤー情報を保持して再開
  const players = state.players.map(p => ({
    ...p,
    score: 0
  }));
  
  state = createInitialState();
  state.deck = shuffle(buildStandardDeck());
  state.players = players;
  state.started = true;
  
  overlay.classList.add("hidden");
  renderBoard();
  updateUI();
}

/** プレイヤー設定画面に戻る */
function newGame() {
  state = createInitialState();
  overlay.classList.add("hidden");
  scoreboard.classList.add("hidden");
  setupScreen.classList.remove("hidden");
  menuBtn.classList.add("hidden");
  boardEl.innerHTML = "";
  initializeSetup();
}

/**
 * 現在の2枚が一致しているかどうか
 * @returns {boolean}
 */
function isCurrentRevealedMatch() {
  if (state.revealed.length !== 2) return false;
  const [aId, bId] = state.revealed;
  const a = state.deck.find((c) => c.id === aId);
  const b = state.deck.find((c) => c.id === bId);
  return !!(a && b && a.rank === b.rank);
}

/**
 * 「カードを伏せる」ボタン押下時の処理（ミスマッチ時のみ）
 */
function hideRevealedCards() {
  if (state.revealed.length !== 2) return;
  if (isCurrentRevealedMatch()) return; // マッチならここは通らない
  const [x, y] = state.revealed;
  flipDOM(x, false);
  flipDOM(y, false);
  state.revealed = [];
  
  // 次のプレイヤーへ
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.inputLocked = false;
  hideBtn.classList.add("hidden");
  updateUI();
}

/**
 * 盤面をシャッフル（表カードがない時のみ）
 */
function shuffleBoard() {
  if (!state.started) return;
  if (state.revealed.length > 0 || state.inputLocked) return;
  state.deck = shuffle(state.deck.slice());
  renderBoard();
  updateUI();
}

// イベント登録
startGameBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);
newGameBtn.addEventListener("click", newGame);
increasePlayerBtn.addEventListener("click", increasePlayerCount);
decreasePlayerBtn.addEventListener("click", decreasePlayerCount);
hideBtn.addEventListener("click", hideRevealedCards);
shuffleBtn.addEventListener("click", shuffleBoard);
menuBtn.addEventListener("click", newGame);

// 初期化
initializeSetup();