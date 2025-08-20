/**
 * 神経衰弱（2人対戦） - 52枚（ジョーカー除く）、同ランク一致でペア成立。
 * - 通常ペア: 1ポイント
 * - 最後の5ペア: 2ポイント（ペア残数が5以下の時に成立したペア）
 * - マッチ時は同じプレイヤーの手番継続、ミスマッチで交代
 * UI: スタート/再スタートボタン、緑テーマ、シンプル構成
 * すべての関数にJSDoc型注釈を付与
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
 * @typedef {Object} GameState
 * @property {Card[]} deck - 現在の山札（盤面のカード）
 * @property {Set<string>} matched - 取得済みカードID
 * @property {string[]} revealed - 表示中のカードID（最大2）
 * @property {[number, number]} scores - P1, P2のスコア
 * @property {number} currentPlayer - 現在のプレイヤー（1|2）
 * @property {boolean} inputLocked - アニメーション/判定中の入力ロック
 * @property {number} pairsRemaining - 残りペア数（初期26）
 * @property {boolean} started - ゲーム中フラグ
 */

/** @type {HTMLElement} */
const boardEl = document.getElementById("board");
/** @type {HTMLButtonElement} */
const startBtn = document.getElementById("startBtn");
/** @type {HTMLButtonElement} */
const hideBtn = document.getElementById("hideBtn");
/** @type {HTMLButtonElement} */
const shuffleBtn = document.getElementById("shuffleBtn");
/** @type {HTMLElement} */
const statusBar = document.getElementById("statusBar");
/** @type {HTMLElement} */
const turnLabel = document.getElementById("turnLabel");
/** @type {HTMLElement} */
const scoreP1 = document.getElementById("scoreP1");
/** @type {HTMLElement} */
const scoreP2 = document.getElementById("scoreP2");
/** @type {HTMLElement} */
const pairsLeft = document.getElementById("pairsLeft");
/** @type {HTMLElement} */
const overlay = document.getElementById("overlay");
/** @type {HTMLElement} */
const resultHeading = document.getElementById("resultHeading");
/** @type {HTMLElement} */
const resultDetail = document.getElementById("resultDetail");
/** @type {HTMLButtonElement} */
const restartBtn = document.getElementById("restartBtn");

/** @type {GameState} */
let state = createInitialState();

/**
 * 初期状態を生成
 * @returns {GameState}
 */
function createInitialState() {
  return {
    deck: [],
    matched: new Set(),
    revealed: [],
    scores: [0, 0],
    currentPlayer: 1,
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
 * ゲーム開始処理
 * - 盤面生成、状態初期化、UI表示
 */
function startGame() {
  state = createInitialState();
  state.deck = shuffle(buildStandardDeck());
  state.started = true;
  statusBar.classList.remove("hidden");
  overlay.classList.add("hidden");
  startBtn.classList.add("hidden");
  hideBtn.classList.add("hidden");
  shuffleBtn.classList.remove("hidden");
  renderBoard();
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
 * ステータス表示を更新
 */
function renderStatus() {
  turnLabel.textContent = state.currentPlayer === 1 ? "プレイヤー1" : "プレイヤー2";
  scoreP1.textContent = String(state.scores[0]);
  scoreP2.textContent = String(state.scores[1]);
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
  back.textContent = "TRUMP";

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
    if (state.currentPlayer === 1) state.scores[0] += points; else state.scores[1] += points;

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
  const [p1, p2] = state.scores;
  let heading = "ゲーム終了";
  let detail = `P1: ${p1}点 / P2: ${p2}点\n`;
  if (p1 > p2) detail += "勝者: プレイヤー1"; else if (p2 > p1) detail += "勝者: プレイヤー2"; else detail += "引き分け";

  resultHeading.textContent = heading;
  resultDetail.textContent = detail;
  overlay.classList.remove("hidden");
  startBtn.classList.add("hidden");
}

/** リスタート処理 */
function restartGame() {
  overlay.classList.add("hidden");
  startGame();
}

// イベント登録
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);

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
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
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

hideBtn.addEventListener("click", hideRevealedCards);
shuffleBtn.addEventListener("click", shuffleBoard);
