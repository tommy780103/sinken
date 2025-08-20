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
const matchPopup = document.getElementById("matchPopup");
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
let cardType = "trump"; // "trump" or "animals"

// 動物カードのデータ（26種類のペア）
const animalPairs = [
  { id: "dog", emoji: "🐕", name: "いぬ" },
  { id: "cat", emoji: "🐈", name: "ねこ" },
  { id: "rabbit", emoji: "🐰", name: "うさぎ" },
  { id: "bear", emoji: "🐻", name: "くま" },
  { id: "panda", emoji: "🐼", name: "ぱんだ" },
  { id: "tiger", emoji: "🐯", name: "とら" },
  { id: "lion", emoji: "🦁", name: "らいおん" },
  { id: "cow", emoji: "🐄", name: "うし" },
  { id: "pig", emoji: "🐷", name: "ぶた" },
  { id: "mouse", emoji: "🐭", name: "ねずみ" },
  { id: "hamster", emoji: "🐹", name: "はむすたー" },
  { id: "fox", emoji: "🦊", name: "きつね" },
  { id: "wolf", emoji: "🐺", name: "おおかみ" },
  { id: "horse", emoji: "🐴", name: "うま" },
  { id: "monkey", emoji: "🐵", name: "さる" },
  { id: "elephant", emoji: "🐘", name: "ぞう" },
  { id: "koala", emoji: "🐨", name: "こあら" },
  { id: "penguin", emoji: "🐧", name: "ぺんぎん" },
  { id: "bird", emoji: "🐦", name: "とり" },
  { id: "chick", emoji: "🐥", name: "ひよこ" },
  { id: "duck", emoji: "🦆", name: "あひる" },
  { id: "owl", emoji: "🦉", name: "ふくろう" },
  { id: "frog", emoji: "🐸", name: "かえる" },
  { id: "turtle", emoji: "🐢", name: "かめ" },
  { id: "fish", emoji: "🐠", name: "さかな" },
  { id: "dolphin", emoji: "🐬", name: "いるか" }
];

// アルファベットカードのデータ（26文字のペア）
const alphabetPairs = [
  { id: "A", emoji: "A", name: "えー", color: "#FF6B6B" },
  { id: "B", emoji: "B", name: "びー", color: "#4ECDC4" },
  { id: "C", emoji: "C", name: "しー", color: "#45B7D1" },
  { id: "D", emoji: "D", name: "でぃー", color: "#96CEB4" },
  { id: "E", emoji: "E", name: "いー", color: "#FFEAA7" },
  { id: "F", emoji: "F", name: "えふ", color: "#DDA0DD" },
  { id: "G", emoji: "G", name: "じー", color: "#98D8C8" },
  { id: "H", emoji: "H", name: "えいち", color: "#FFB6C1" },
  { id: "I", emoji: "I", name: "あい", color: "#87CEEB" },
  { id: "J", emoji: "J", name: "じぇい", color: "#F0E68C" },
  { id: "K", emoji: "K", name: "けい", color: "#FFB347" },
  { id: "L", emoji: "L", name: "える", color: "#FF69B4" },
  { id: "M", emoji: "M", name: "えむ", color: "#20B2AA" },
  { id: "N", emoji: "N", name: "えぬ", color: "#9370DB" },
  { id: "O", emoji: "O", name: "おー", color: "#3CB371" },
  { id: "P", emoji: "P", name: "ぴー", color: "#FF1493" },
  { id: "Q", emoji: "Q", name: "きゅー", color: "#00CED1" },
  { id: "R", emoji: "R", name: "あーる", color: "#FF8C00" },
  { id: "S", emoji: "S", name: "えす", color: "#32CD32" },
  { id: "T", emoji: "T", name: "てぃー", color: "#FF6347" },
  { id: "U", emoji: "U", name: "ゆー", color: "#4169E1" },
  { id: "V", emoji: "V", name: "ぶい", color: "#DB7093" },
  { id: "W", emoji: "W", name: "だぶりゅー", color: "#48D1CC" },
  { id: "X", emoji: "X", name: "えっくす", color: "#B22222" },
  { id: "Y", emoji: "Y", name: "わい", color: "#228B22" },
  { id: "Z", emoji: "Z", name: "ぜっと", color: "#FF00FF" }
];

// 乗り物カードのデータ（26種類のペア）
const vehiclePairs = [
  { id: "car", emoji: "🚗", name: "くるま" },
  { id: "bus", emoji: "🚌", name: "ばす" },
  { id: "truck", emoji: "🚚", name: "とらっく" },
  { id: "taxi", emoji: "🚕", name: "たくしー" },
  { id: "police", emoji: "🚓", name: "ぱとかー" },
  { id: "ambulance", emoji: "🚑", name: "きゅうきゅうしゃ" },
  { id: "fire", emoji: "🚒", name: "しょうぼうしゃ" },
  { id: "bike", emoji: "🚲", name: "じてんしゃ" },
  { id: "motorcycle", emoji: "🏍️", name: "ばいく" },
  { id: "train", emoji: "🚃", name: "でんしゃ" },
  { id: "bullet", emoji: "🚄", name: "しんかんせん" },
  { id: "subway", emoji: "🚇", name: "ちかてつ" },
  { id: "tram", emoji: "🚊", name: "ろめんでんしゃ" },
  { id: "airplane", emoji: "✈️", name: "ひこうき" },
  { id: "helicopter", emoji: "🚁", name: "へりこぷたー" },
  { id: "rocket", emoji: "🚀", name: "ろけっと" },
  { id: "ship", emoji: "🚢", name: "ふね" },
  { id: "sailboat", emoji: "⛵", name: "よっと" },
  { id: "speedboat", emoji: "🚤", name: "もーたーぼーと" },
  { id: "tractor", emoji: "🚜", name: "とらくたー" },
  { id: "scooter", emoji: "🛴", name: "きっくぼーど" },
  { id: "sled", emoji: "🛷", name: "そり" },
  { id: "cablecar", emoji: "🚡", name: "ろーぷうぇい" },
  { id: "monorail", emoji: "🚝", name: "ものれーる" },
  { id: "balloon", emoji: "🎈", name: "ききゅう" },
  { id: "ufo", emoji: "🛸", name: "ゆーふぉー" }
];

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
 * 動物カードデッキを生成（52枚）
 * @returns {Card[]}
 */
function buildAnimalDeck() {
  const deck = [];
  // 各動物を2枚ずつ作成（26種類 × 2 = 52枚）
  animalPairs.forEach(animal => {
    deck.push({ 
      id: `${animal.id}_1`, 
      rank: animal.id,
      suit: "animal",
      emoji: animal.emoji,
      name: animal.name
    });
    deck.push({ 
      id: `${animal.id}_2`, 
      rank: animal.id,
      suit: "animal",
      emoji: animal.emoji,
      name: animal.name
    });
  });
  return deck;
}

/**
 * アルファベットカードデッキを生成（52枚）
 * @returns {Card[]}
 */
function buildAlphabetDeck() {
  const deck = [];
  // 各文字を2枚ずつ作成（26文字 × 2 = 52枚）
  alphabetPairs.forEach(letter => {
    deck.push({ 
      id: `${letter.id}_1`, 
      rank: letter.id,
      suit: "alphabet",
      emoji: letter.emoji,
      name: letter.name,
      color: letter.color
    });
    deck.push({ 
      id: `${letter.id}_2`, 
      rank: letter.id,
      suit: "alphabet",
      emoji: letter.emoji,
      name: letter.name,
      color: letter.color
    });
  });
  return deck;
}

/**
 * 乗り物カードデッキを生成（52枚）
 * @returns {Card[]}
 */
function buildVehicleDeck() {
  const deck = [];
  // 各乗り物を2枚ずつ作成（26種類 × 2 = 52枚）
  vehiclePairs.forEach(vehicle => {
    deck.push({ 
      id: `${vehicle.id}_1`, 
      rank: vehicle.id,
      suit: "vehicle",
      emoji: vehicle.emoji,
      name: vehicle.name
    });
    deck.push({ 
      id: `${vehicle.id}_2`, 
      rank: vehicle.id,
      suit: "vehicle",
      emoji: vehicle.emoji,
      name: vehicle.name
    });
  });
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
  // カードタイプに応じてデッキを選択
  let deck;
  switch(cardType) {
    case "animals":
      deck = buildAnimalDeck();
      break;
    case "alphabet":
      deck = buildAlphabetDeck();
      break;
    case "vehicles":
      deck = buildVehicleDeck();
      break;
    default:
      deck = buildStandardDeck();
  }
  state.deck = shuffle(deck);
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
  // カードタイプに応じて裏面のテキストを変更
  const backTexts = {
    animals: "どうぶつ",
    alphabet: "ABC",
    vehicles: "のりもの",
    trump: "かーど"
  };
  back.textContent = backTexts[cardType] || "かーど";

  const face = document.createElement("div");
  face.className = "card-face";

  if (card.suit === "animal") {
    // 動物カードの表面
    face.innerHTML = `
      <div class="animal-card-content">
        <div class="animal-emoji">${card.emoji}</div>
        <div class="animal-name">${card.name}</div>
      </div>
    `;
  } else if (card.suit === "alphabet") {
    // アルファベットカードの表面
    face.innerHTML = `
      <div class="alphabet-card-content" style="background: ${card.color}">
        <div class="alphabet-letter">${card.emoji}</div>
        <div class="alphabet-name">${card.name}</div>
      </div>
    `;
  } else if (card.suit === "vehicle") {
    // 乗り物カードの表面
    face.innerHTML = `
      <div class="vehicle-card-content">
        <div class="vehicle-emoji">${card.emoji}</div>
        <div class="vehicle-name">${card.name}</div>
      </div>
    `;
  } else {
    // トランプカードの表面
    const colorClass = card.suit === "♥" || card.suit === "♦" ? "suit-red" : "suit-black";
    face.innerHTML = `
      <div class="corner ${colorClass}">${card.rank}<br>${card.suit}</div>
      <div class="rank-suit ${colorClass}" aria-hidden="true">
        ${card.rank} ${card.suit}
      </div>
      <div class="corner bottom ${colorClass}">${card.rank}<br>${card.suit}</div>
    `;
  }

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

    // 正解ポップアップを表示
    showMatchPopup();

    // 少し遅らせてカードを除去
    setTimeout(() => {
      markRemoved(a.id);
      markRemoved(b.id);
      state.revealed = [];
      state.inputLocked = false;
      updateUI();
    }, 800);
    
    // 正解ポップアップを表示
    showMatchPopup();
    
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
  // カードタイプに応じてデッキを選択
  let deck;
  switch(cardType) {
    case "animals":
      deck = buildAnimalDeck();
      break;
    case "alphabet":
      deck = buildAlphabetDeck();
      break;
    case "vehicles":
      deck = buildVehicleDeck();
      break;
    default:
      deck = buildStandardDeck();
  }
  state.deck = shuffle(deck);
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
  
  // 入力をロック
  state.inputLocked = true;
  
  // シャッフルアニメーションクラスを追加
  boardEl.classList.add("shuffling");
  
  // アニメーション中盤でカードを再配置
  setTimeout(() => {
    state.deck = shuffle(state.deck.slice());
    renderBoard();
    // 新しくレンダリングしたカードにもアニメーションクラスを適用
    boardEl.classList.add("shuffling");
  }, 750);
  
  // アニメーション終了後にクラスを削除
  setTimeout(() => {
    boardEl.classList.remove("shuffling");
    state.inputLocked = false;
    updateUI();
  }, 1600);
}

// カードタイプ選択の処理
function setupCardTypeSelector() {
  const cardTypeBtns = document.querySelectorAll(".card-type-btn");
  cardTypeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // 全てのボタンからactiveクラスを削除
      cardTypeBtns.forEach(b => b.classList.remove("active"));
      // クリックしたボタンにactiveクラスを追加
      btn.classList.add("active");
      // カードタイプを更新
      cardType = btn.dataset.type;
    });
  });
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

/**
 * 正解ポップアップを表示
 */
function showMatchPopup() {
  const popup = document.getElementById("matchPopup");
  if (!popup) return;
  
  // ポップアップを表示
  popup.classList.remove("hidden");
  popup.classList.add("show");
  
  // 1.5秒後に自動で非表示
  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => {
      popup.classList.add("hidden");
    }, 300); // フェードアウトアニメーションを待つ
  }, 1500);
}

// 初期化
initializeSetup();
setupCardTypeSelector();