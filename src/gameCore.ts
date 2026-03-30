export const BOARD_SIZE = 7;
export const MIN_CUSTOM_BOARD_SIZE = 4;
export const MAX_CUSTOM_BOARD_SIZE = 12;
export const DEFAULT_CUSTOM_BOARD_SIZE = 4;
export const BASE_MIN_CLEAR = 3;
export const FEVER_MIN_CLEAR = 2;
export const FEVER_DURATION = 9000;
export const FEVER_CHARGE_MAX = 100;
export const COMBO_WINDOW = 2400;
export const CLASSIC_TIME_LIMIT = 90;
export const CLASSIC_TIME_REWARD = 12;
export const CLASSIC_TIME_MAX = 120;
export const CLASSIC_SHUFFLE_COST = 3;
export const RUSH_MOVE_SHUFFLE_COST = 1;
export const SCORE_SHUFFLE_PENALTY = 160;
export const MIN_VALID_STARTS = 12;

export const MODES = {
  classic: {
    key: "classic",
    name: "经典连锁",
    subtitle: "计时爽刷高分，冲线后自动升关。",
    desc: "自动追踪箭头成链，冲高分、攒狂热、刷关卡。",
    tips: "经典模式是计时冲分：达成本关目标会自动升关并补时，长链、闭环和特殊格都会让收益更高。",
    bonus: "闭环和长链收益最高，达标后会补时。",
    stageBase: 780,
    stageStep: 520,
  },
  rush: {
    key: "rush",
    name: "爆爽闯关",
    subtitle: "更像爆款的闯关玩法：收集星钻，再冲目标分。",
    desc: "关卡里既要打够分数，也要收集星钻，步数用光就结束。",
    tips: "闯关模式里，每次成功消除会消耗 1 步；达到目标分数且收集够星钻才能过关，剩余步数越多评级越高。",
    bonus: "收集星钻 + 目标分数双达成才算过关。",
    stageBase: 540,
    stageStep: 430,
    moveBase: 16,
    missionBase: 3,
  },
  endless: {
    key: "endless",
    name: "无尽模式",
    subtitle: "自己选棋盘尺寸，一直刷分不封顶。",
    desc: "没有倒计时，也没有步数上限，适合练手和挑战大棋盘。",
    tips: "无尽模式只有里程碑，没有失败条件；打满当前目标分会进入下一段，棋盘尺寸可在 4×4 到 12×12 自由切换。",
    bonus: "无时间无步数限制，更适合研究长链、闭环和大盘路线。",
    stageBase: 660,
    stageStep: 360,
  },
};

export const DIFFICULTIES = {
  beginner: {
    key: "beginner",
    label: "入门级",
    boardSize: 4,
    desc: "4×4 小盘，2 格就能消，特殊格更多，适合先摸清规则。",
    ruleText: "默认 4×4 · 2 格起消 · 资源更宽松",
    baseClearLength: 2,
    feverClearLength: 2,
    scoreTargetMultiplier: 0.78,
    scoreGainMultiplier: 0.88,
    specialMultiplier: 1.45,
    classicTimeLimit: 128,
    classicTimeReward: 15,
    classicTimeMax: 158,
    classicShuffleCost: 1,
    rushMoveBase: 21,
    rushShuffleCost: 0,
    missionOffset: -1,
    minValidStarts: 8,
    minValidStartRatio: 0.5,
    shuffleScorePenalty: 70,
  },
  easy: {
    key: "easy",
    label: "简单",
    boardSize: 5,
    desc: "5×5 小盘，规则更宽松，适合稳定上手。",
    ruleText: "默认 5×5 · 3 格起消 · 提示更友好",
    baseClearLength: 3,
    feverClearLength: 2,
    scoreTargetMultiplier: 0.92,
    scoreGainMultiplier: 0.95,
    specialMultiplier: 1.2,
    classicTimeLimit: 108,
    classicTimeReward: 13,
    classicTimeMax: 138,
    classicShuffleCost: 1,
    rushMoveBase: 19,
    rushShuffleCost: 0,
    missionOffset: 0,
    minValidStarts: 10,
    minValidStartRatio: 0.4,
    shuffleScorePenalty: 110,
  },
  normal: {
    key: "normal",
    label: "中等难度",
    boardSize: 7,
    desc: "7×7 标准方盘，节奏和收益最均衡。",
    ruleText: "默认 7×7 · 标准 3 格起消",
    baseClearLength: BASE_MIN_CLEAR,
    feverClearLength: FEVER_MIN_CLEAR,
    scoreTargetMultiplier: 1,
    scoreGainMultiplier: 1,
    specialMultiplier: 1,
    classicTimeLimit: CLASSIC_TIME_LIMIT,
    classicTimeReward: CLASSIC_TIME_REWARD,
    classicTimeMax: CLASSIC_TIME_MAX,
    classicShuffleCost: CLASSIC_SHUFFLE_COST,
    rushMoveBase: MODES.rush.moveBase,
    rushShuffleCost: RUSH_MOVE_SHUFFLE_COST,
    missionOffset: 0,
    minValidStarts: MIN_VALID_STARTS,
    minValidStartRatio: 0.26,
    shuffleScorePenalty: SCORE_SHUFFLE_PENALTY,
  },
  hard: {
    key: "hard",
    label: "较难",
    boardSize: 8,
    desc: "8×8 大盘，普通状态要更长路径，资源更少，适合老手。",
    ruleText: "默认 8×8 · 4 格起消 · 狂热也要 3 格",
    baseClearLength: 4,
    feverClearLength: 3,
    scoreTargetMultiplier: 1.14,
    scoreGainMultiplier: 1.08,
    specialMultiplier: 0.88,
    classicTimeLimit: 78,
    classicTimeReward: 10,
    classicTimeMax: 104,
    classicShuffleCost: 3,
    rushMoveBase: 14,
    rushShuffleCost: 1,
    missionOffset: 1,
    minValidStarts: 10,
    minValidStartRatio: 0.18,
    shuffleScorePenalty: 200,
  },
  expert: {
    key: "expert",
    label: "特难",
    boardSize: 10,
    desc: "10×10 超大盘，目标更高、特殊格更少，适合极限挑战。",
    ruleText: "默认 10×10 · 4 格起消 · 资源最紧",
    baseClearLength: 4,
    feverClearLength: 3,
    scoreTargetMultiplier: 1.24,
    scoreGainMultiplier: 1.16,
    specialMultiplier: 0.74,
    classicTimeLimit: 68,
    classicTimeReward: 8,
    classicTimeMax: 92,
    classicShuffleCost: 4,
    rushMoveBase: 12,
    rushShuffleCost: 2,
    missionOffset: 2,
    minValidStarts: 8,
    minValidStartRatio: 0.09,
    shuffleScorePenalty: 240,
  },
};

export const DIRECTIONS = [
  { key: "up", symbol: "↑", deltaRow: -1, deltaCol: 0, name: "上冲", color: "#4fe7df" },
  { key: "right", symbol: "→", deltaRow: 0, deltaCol: 1, name: "右切", color: "#ffd766" },
  { key: "down", symbol: "↓", deltaRow: 1, deltaCol: 0, name: "下坠", color: "#ba8cff" },
  { key: "left", symbol: "←", deltaRow: 0, deltaCol: -1, name: "左旋", color: "#ff8e7c" },
];

export const SPECIAL_META = {
  gem: { badge: "◆", name: "星钻", color: "#66f5ec" },
  time: { badge: "+", name: "续航", color: "#ffd86a" },
  fever: { badge: "⚡", name: "电核", color: "#ff8d69" },
};

export function getModeConfig(modeKey) {
  return MODES[modeKey] ?? MODES.classic;
}

export function getDifficultyConfig(difficultyKey) {
  return DIFFICULTIES[difficultyKey] ?? DIFFICULTIES.normal;
}
export function normalizeSeedCode(seedCode) {
  return String(seedCode ?? "").trim();
}

export function getDailyChallengeCode(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `DAY-${year}${month}${day}`;
}

export function createSeededRandom(seedCode = "default") {
  const normalizedSeed = normalizeSeedCode(seedCode) || "default";
  let hash = 2166136261;

  for (const char of normalizedSeed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  if (!state) {
    state = 0x6d2b79f5;
  }

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function getNormalizedBoardSize(boardSize) {
  const numeric = Number(boardSize);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_CUSTOM_BOARD_SIZE;
  }

  return Math.max(MIN_CUSTOM_BOARD_SIZE, Math.min(MAX_CUSTOM_BOARD_SIZE, Math.round(numeric)));
}

export function getBoardSize(difficultyKey = "normal", boardSizeOverride = null) {
  if (boardSizeOverride !== null && boardSizeOverride !== undefined) {
    return getNormalizedBoardSize(boardSizeOverride);
  }

  return getDifficultyConfig(difficultyKey).boardSize ?? BOARD_SIZE;
}

function getBoardSizeFromBoard(board) {
  return Array.isArray(board) ? board.length : BOARD_SIZE;
}

function getBoardPressureMultiplier(difficultyKey = "normal", boardSizeOverride = null) {
  const boardSize = getBoardSize(difficultyKey, boardSizeOverride);
  const areaRatio = (boardSize * boardSize) / (BOARD_SIZE * BOARD_SIZE);
  return 0.82 + areaRatio * 0.18;
}

function getMinimumValidStarts(difficultyKey = "normal", boardSizeOverride = null) {
  const difficulty = getDifficultyConfig(difficultyKey);
  const boardSize = getBoardSize(difficultyKey, boardSizeOverride);
  const boardCells = boardSize * boardSize;
  const ratioMinimum = Math.round(boardCells * (difficulty.minValidStartRatio ?? 0));
  return Math.min(boardCells, Math.max(difficulty.minValidStarts, ratioMinimum));
}

export function getBestScoreKey(modeKey, difficultyKey, boardSizeOverride = null) {
  if (modeKey === "endless") {
    return `${modeKey}:${difficultyKey}:${getBoardSize(difficultyKey, boardSizeOverride)}`;
  }

  return `${modeKey}:${difficultyKey}`;
}

export function inBounds(row, col, boardOrSize = BOARD_SIZE) {
  const boardSize = Array.isArray(boardOrSize) ? boardOrSize.length : boardOrSize;
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

export function keyOf(row, col) {
  return `${row}:${col}`;
}

export function isFeverActive(state, now = Date.now()) {
  return state.feverActiveUntil > now;
}

export function getRequiredClearLength(state, now = Date.now()) {
  const difficulty = getDifficultyConfig(state.difficultyKey);
  return isFeverActive(state, now) ? difficulty.feverClearLength : difficulty.baseClearLength;
}

export function getStageTarget(modeKey, level, difficultyKey = "normal", boardSizeOverride = null) {
  const mode = getModeConfig(modeKey);
  const difficulty = getDifficultyConfig(difficultyKey);
  return Math.round(
    (mode.stageBase + (level - 1) * mode.stageStep) * difficulty.scoreTargetMultiplier * getBoardPressureMultiplier(difficultyKey, boardSizeOverride),
  );
}

export function getMissionGoal(modeKey, level, difficultyKey = "normal") {
  if (modeKey !== "rush") {
    return 0;
  }

  const difficulty = getDifficultyConfig(difficultyKey);
  return Math.max(1, MODES.rush.missionBase + difficulty.missionOffset + Math.floor((level - 1) / 2));
}

export function getMoveLimit(level, difficultyKey = "normal") {
  const difficulty = getDifficultyConfig(difficultyKey);
  return difficulty.rushMoveBase + Math.min(5, Math.floor((level - 1) / 2));
}

export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function createRandomCell({ modeKey, level, difficultyKey = "normal", nextId, random = Math.random }) {
  const difficulty = getDifficultyConfig(difficultyKey);
  const roll = random();
  const gemChance = Math.min(0.28, (modeKey === "rush" ? 0.1 + Math.min(0.05, (level - 1) * 0.008) : 0.06) * difficulty.specialMultiplier);
  const timeChance = Math.min(0.18, (modeKey === "rush" ? 0.055 : 0.05) * difficulty.specialMultiplier);
  const feverChance = Math.min(0.18, 0.055 * difficulty.specialMultiplier);
  let special = null;

  if (roll < gemChance) {
    special = "gem";
  } else if (roll < gemChance + timeChance) {
    special = "time";
  } else if (roll < gemChance + timeChance + feverChance) {
    special = "fever";
  }

  return {
    cell: {
      id: nextId,
      dir: Math.floor(random() * DIRECTIONS.length),
      special,
    },
    nextId: nextId + 1,
  };
}

export function buildRandomBoard({ modeKey, level, difficultyKey = "normal", boardSizeOverride = null, nextId, random = Math.random }) {
  const boardSize = getBoardSize(difficultyKey, boardSizeOverride);
  let currentNextId = nextId;
  const board = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => {
      const result = createRandomCell({ modeKey, level, difficultyKey, nextId: currentNextId, random });
      currentNextId = result.nextId;
      return result.cell;
    }),
  );

  return {
    board,
    nextId: currentNextId,
  };
}

export function repairBoard({
  board,
  modeKey,
  level,
  difficultyKey = "normal",
  boardSizeOverride = null,
  nextId,
  random = Math.random,
}) {
  const boardSize = getBoardSize(difficultyKey, boardSizeOverride);
  let workingNextId = nextId;
  const repairedBoard = Array.from({ length: boardSize }, (_, row) =>
    Array.from({ length: boardSize }, (_, col) => {
      const currentCell = board[row]?.[col];
      if (currentCell) {
        return { ...currentCell };
      }

      const result = createRandomCell({ modeKey, level, difficultyKey, nextId: workingNextId, random });
      workingNextId = result.nextId;
      return result.cell;
    }),
  );

  return {
    board: repairedBoard,
    nextId: workingNextId,
  };
}

function countSpecial(board, special) {
  return board.flat().filter((cell) => cell && cell.special === special).length;
}

function seedSpecial(board, special, minCount, random = Math.random) {
  const boardSize = getBoardSizeFromBoard(board);
  const boardCells = boardSize * boardSize;
  const targetCount = Math.min(boardCells, minCount);
  let count = countSpecial(board, special);
  let attempts = 0;

  while (count < targetCount && attempts < boardCells * 8) {
    const row = Math.floor(random() * boardSize);
    const col = Math.floor(random() * boardSize);

    if (!board[row]?.[col]) {
      attempts += 1;
      continue;
    }

    if (board[row][col].special !== special) {
      board[row][col].special = special;
      count += 1;
    }

    attempts += 1;
  }
}

function ensureMissionCells(board, modeKey, missionGoal, missionCollected, random = Math.random) {
  if (modeKey !== "rush") {
    return;
  }

  const remainingNeeded = Math.max(2, missionGoal - missionCollected + 1);
  seedSpecial(board, "gem", remainingNeeded, random);
}

export function getChain(board, startRow, startCol, requiredLength = BASE_MIN_CLEAR) {
  const visited = new Map();
  const chain = [];
  let row = startRow;
  let col = startCol;
  let loop = false;
  let loopStartIndex = -1;

  while (inBounds(row, col, board)) {
    const chainKey = keyOf(row, col);
    if (visited.has(chainKey)) {
      loop = true;
      loopStartIndex = visited.get(chainKey);
      break;
    }

    visited.set(chainKey, chain.length);
    chain.push({ row, col });

    const cell = board[row][col];
    if (!cell) {
      break;
    }

    const direction = DIRECTIONS[cell.dir];
    row += direction.deltaRow;
    col += direction.deltaCol;
  }

  return {
    chain,
    loop,
    loopStartIndex,
    loopLength: loop ? chain.length - loopStartIndex : 0,
    requiredLength,
    valid: chain.length >= requiredLength,
  };
}

export function countValidStarts(board, requiredLength = BASE_MIN_CLEAR) {
  const boardSize = getBoardSizeFromBoard(board);
  let total = 0;

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      if (getChain(board, row, col, requiredLength).valid) {
        total += 1;
      }
    }
  }

  return total;
}

export function findBestStart(board, requiredLength = BASE_MIN_CLEAR) {
  const boardSize = getBoardSizeFromBoard(board);
  let best = null;

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const result = getChain(board, row, col, requiredLength);
      if (!result.valid) {
        continue;
      }

      const summary = summarizeChain(board, result);
      const score =
        result.chain.length * 100 +
        (result.loop ? 45 : 0) +
        summary.gem * 30 +
        summary.time * 18 +
        summary.fever * 22;

      if (!best || score > best.score) {
        best = {
          row,
          col,
          result,
          summary,
          score,
        };
      }
    }
  }

  return best;
}

export function ensurePlayableBoard({
  board,
  modeKey,
  level,
  missionGoal,
  missionCollected,
  difficultyKey = "normal",
  boardSizeOverride = null,
  nextId,
  random = Math.random,
}) {
  const repaired = repairBoard({
    board,
    modeKey,
    level,
    difficultyKey,
    boardSizeOverride,
    nextId,
    random,
  });
  let workingBoard = repaired.board;
  let workingNextId = repaired.nextId;
  let attempts = 0;
  const minimumValidStarts = getMinimumValidStarts(difficultyKey, boardSizeOverride);
  const requiredLength = getDifficultyConfig(difficultyKey).baseClearLength;

  ensureMissionCells(workingBoard, modeKey, missionGoal, missionCollected, random);

  while (countValidStarts(workingBoard, requiredLength) < minimumValidStarts && attempts < 40) {
    const fresh = buildRandomBoard({ modeKey, level, difficultyKey, boardSizeOverride, nextId: workingNextId, random });
    workingBoard = fresh.board;
    workingNextId = fresh.nextId;
    ensureMissionCells(workingBoard, modeKey, missionGoal, missionCollected, random);
    attempts += 1;
  }

  return {
    board: workingBoard,
    nextId: workingNextId,
  };
}

export function applyGravityAndRefill({
  board,
  modeKey,
  level,
  missionGoal,
  missionCollected,
  difficultyKey = "normal",
  boardSizeOverride = null,
  nextId,
  random = Math.random,
}) {
  const workingBoard = cloneBoard(board);
  const boardSize = getBoardSizeFromBoard(workingBoard);
  let workingNextId = nextId;

  for (let col = 0; col < boardSize; col += 1) {
    const remaining = [];
    for (let row = boardSize - 1; row >= 0; row -= 1) {
      const cell = workingBoard[row][col];
      if (cell) {
        remaining.push(cell);
      }
    }

    for (let row = boardSize - 1; row >= 0; row -= 1) {
      if (remaining[boardSize - 1 - row]) {
        workingBoard[row][col] = remaining[boardSize - 1 - row];
      } else {
        const result = createRandomCell({ modeKey, level, difficultyKey, nextId: workingNextId, random });
        workingBoard[row][col] = result.cell;
        workingNextId = result.nextId;
      }
    }
  }

  return ensurePlayableBoard({
    board: workingBoard,
    modeKey,
    level,
    missionGoal,
    missionCollected,
    difficultyKey,
    boardSizeOverride,
    nextId: workingNextId,
    random,
  });
}

export function summarizeChain(board, result) {
  const summary = { gem: 0, time: 0, fever: 0 };

  for (const { row, col } of result.chain) {
    const cell = board[row][col];
    if (cell?.special) {
      summary[cell.special] += 1;
    }
  }

  return summary;
}

export function chargeFever(state, amount, now = Date.now()) {
  if (isFeverActive(state, now)) {
    return {
      feverCharge: state.feverCharge,
      feverActiveUntil: state.feverActiveUntil,
      triggered: false,
    };
  }

  const charged = Math.min(FEVER_CHARGE_MAX, state.feverCharge + amount);
  if (charged >= FEVER_CHARGE_MAX) {
    return {
      feverCharge: FEVER_CHARGE_MAX,
      feverActiveUntil: now + FEVER_DURATION,
      triggered: true,
    };
  }

  return {
    feverCharge: charged,
    feverActiveUntil: 0,
    triggered: false,
  };
}

export function computeGain({ result, summary, combo, feverActive, modeKey, difficultyKey = "normal" }) {
  const difficulty = getDifficultyConfig(difficultyKey);
  const base = result.chain.length * result.chain.length * 18;
  const loopBonus = result.loop ? 120 + result.loopLength * 28 : 0;
  const specialBonus = summary.gem * 70 + summary.time * 55 + summary.fever * 65;
  const comboMultiplier = 1 + Math.min(combo - 1, 7) * 0.18;
  const feverMultiplier = feverActive ? 2 : 1;
  const modeMultiplier = modeKey === "rush" ? 1.08 : 1;
  return Math.round((base + loopBonus + specialBonus) * comboMultiplier * feverMultiplier * modeMultiplier * difficulty.scoreGainMultiplier);
}

export function hasMetStageGoal(state) {
  if (state.stageScore < state.targetScore) {
    return false;
  }

  if (state.modeKey === "rush" && state.missionCollected < state.missionGoal) {
    return false;
  }

  return true;
}

export function getRushStars(movesLeft) {
  if (movesLeft >= 5) {
    return 3;
  }
  if (movesLeft >= 2) {
    return 2;
  }
  return 1;
}
