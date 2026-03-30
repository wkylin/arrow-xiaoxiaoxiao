import {
  DEFAULT_CUSTOM_BOARD_SIZE,
  DIFFICULTIES,
  MODES,
  getBestScoreKey,
  getDailyChallengeCode,
  getDifficultyConfig,
  getMissionGoal,
  getMoveLimit,
  getNormalizedBoardSize,
  getStageTarget,
  normalizeSeedCode,
} from "../gameCore";

export const IDLE_STATUS = "点击格子直接消除，鼠标悬停或手指按下可预览路径。";
export const RESET_STATUS = "新的一局开始了，优先寻找长链和闭环。闯关模式记得顺手收集星钻。";
export const ENDLESS_RESET_STATUS = "无尽模式开始了，先跟着发光起点找长链。";
const QUICKSTART_STORAGE_KEY = "arrow-quickstart-dismissed";

export function getStorageItem(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function setStorageItem(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function getActiveBoardSize(modeKey, customBoardSize) {
  return modeKey === "endless" ? getNormalizedBoardSize(customBoardSize) : null;
}

export function normalizeSeedMode(seedMode) {
  return seedMode === "manual" || seedMode === "daily" ? seedMode : "random";
}

export function buildRandomSeedCode() {
  return `R-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveSeedSession(modeKey, seedMode, seedInput) {
  const dailyChallengeCode = getDailyChallengeCode();
  const normalizedMode = normalizeSeedMode(seedMode);
  const normalizedSeedInput = normalizeSeedCode(seedInput);

  if (modeKey !== "endless") {
    return {
      seedMode: "random",
      seedInput: normalizedSeedInput,
      activeSeedCode: buildRandomSeedCode(),
      dailyChallengeCode,
    };
  }

  if (normalizedMode === "daily") {
    return {
      seedMode: "daily",
      seedInput: dailyChallengeCode,
      activeSeedCode: dailyChallengeCode,
      dailyChallengeCode,
    };
  }

  if (normalizedMode === "manual" && normalizedSeedInput) {
    return {
      seedMode: "manual",
      seedInput: normalizedSeedInput,
      activeSeedCode: normalizedSeedInput,
      dailyChallengeCode,
    };
  }

  return {
    seedMode: "random",
    seedInput: normalizedSeedInput,
    activeSeedCode: buildRandomSeedCode(),
    dailyChallengeCode,
  };
}

export function getBestScoreStorageKey(modeKey, difficultyKey, customBoardSize) {
  return `arrow-best-${getBestScoreKey(modeKey, difficultyKey, getActiveBoardSize(modeKey, customBoardSize)).split(":").join("-")}`;
}

export function getStoredBestScore(modeKey, difficultyKey, customBoardSize) {
  return Number(getStorageItem(getBestScoreStorageKey(modeKey, difficultyKey, customBoardSize), "0"));
}

export function ensureBestScoreEntry(bestScores, modeKey, difficultyKey, customBoardSize) {
  const bestKey = getBestScoreKey(modeKey, difficultyKey, getActiveBoardSize(modeKey, customBoardSize));
  if (bestScores[bestKey] !== undefined) {
    return bestScores;
  }

  return {
    ...bestScores,
    [bestKey]: getStoredBestScore(modeKey, difficultyKey, customBoardSize),
  };
}

export function getSharedChallengeState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const url = new URL(window.location.href);
    const challengeCode = normalizeSeedCode(url.searchParams.get("challenge") ?? url.searchParams.get("seed") ?? "");
    if (!challengeCode) {
      return null;
    }

    const difficultyParam = url.searchParams.get("difficulty");
    const difficultyKey = DIFFICULTIES[difficultyParam] ? difficultyParam : null;
    const sizeParam = url.searchParams.get("size");

    return {
      modeKey: "endless",
      difficultyKey,
      customBoardSize: sizeParam ? getNormalizedBoardSize(sizeParam) : null,
      seedInput: challengeCode,
      seedMode: "manual",
    };
  } catch {
    return null;
  }
}

export function buildChallengeShareUrl({ modeKey, difficultyKey, customBoardSize, activeSeedCode }) {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const url = new URL(window.location.href);

    url.searchParams.delete("seed");
    url.searchParams.delete("seedMode");

    if (modeKey === "endless" && activeSeedCode) {
      url.searchParams.set("mode", "endless");
      url.searchParams.set("difficulty", difficultyKey);
      url.searchParams.set("size", String(getNormalizedBoardSize(customBoardSize)));
      url.searchParams.set("challenge", activeSeedCode);
    } else {
      url.searchParams.delete("mode");
      url.searchParams.delete("difficulty");
      url.searchParams.delete("size");
      url.searchParams.delete("challenge");
    }

    return url.toString();
  } catch {
    return "";
  }
}

export async function copyText(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return Boolean(document.execCommand?.("copy"));
  } finally {
    document.body.removeChild(textarea);
  }
}

export function createBootstrapState() {
  const storedModeKey = getStorageItem("arrow-last-mode", "classic");
  let modeKey = MODES[storedModeKey] ? storedModeKey : "classic";
  const storedDifficultyKey = getStorageItem("arrow-last-difficulty", "beginner");
  let difficultyKey = DIFFICULTIES[storedDifficultyKey] ? storedDifficultyKey : "beginner";
  let customBoardSize = getNormalizedBoardSize(getStorageItem("arrow-custom-board-size", String(DEFAULT_CUSTOM_BOARD_SIZE)));
  let seedInput = getStorageItem("arrow-endless-seed-input", "");
  let seedMode = normalizeSeedMode(getStorageItem("arrow-endless-seed-mode", "random"));
  const sharedChallengeState = getSharedChallengeState();
  const quickStartDismissed = getStorageItem(QUICKSTART_STORAGE_KEY, "0") === "1";

  if (sharedChallengeState) {
    modeKey = sharedChallengeState.modeKey;
    difficultyKey = sharedChallengeState.difficultyKey ?? difficultyKey;
    customBoardSize = sharedChallengeState.customBoardSize ?? customBoardSize;
    seedInput = sharedChallengeState.seedInput;
    seedMode = sharedChallengeState.seedMode;
    setStorageItem("arrow-last-mode", modeKey);
    setStorageItem("arrow-last-difficulty", difficultyKey);
    setStorageItem("arrow-custom-board-size", String(customBoardSize));
    setStorageItem("arrow-endless-seed-input", seedInput);
    setStorageItem("arrow-endless-seed-mode", seedMode);
  } else if (!quickStartDismissed) {
    modeKey = "classic";
    difficultyKey = "beginner";
    customBoardSize = DEFAULT_CUSTOM_BOARD_SIZE;
    seedInput = "";
    seedMode = "random";
  }

  const { activeSeedCode, dailyChallengeCode } = resolveSeedSession(modeKey, seedMode, seedInput);
  const difficulty = getDifficultyConfig(difficultyKey);
  const activeBoardSize = getActiveBoardSize(modeKey, customBoardSize);
  const bestKey = getBestScoreKey(modeKey, difficultyKey, activeBoardSize);

  return {
    board: [],
    previewChain: [],
    previewStartKey: null,
    previewValid: false,
    clearingKeys: [],
    score: 0,
    stageScore: 0,
    level: 1,
    targetScore: getStageTarget(modeKey, 1, difficultyKey, activeBoardSize),
    missionGoal: getMissionGoal(modeKey, 1, difficultyKey),
    missionCollected: 0,
    combo: 1,
    bestScores: {
      [bestKey]: getStoredBestScore(modeKey, difficultyKey, customBoardSize),
    },
    timeLeft: modeKey === "classic" ? difficulty.classicTimeLimit : 0,
    movesLeft: modeKey === "rush" ? getMoveLimit(1, difficultyKey) : 0,
    lastClearAt: 0,
    feverCharge: 0,
    feverActiveUntil: 0,
    modeKey,
    difficultyKey,
    customBoardSize,
    seedInput,
    seedMode,
    activeSeedCode,
    dailyChallengeCode,
    soundEnabled: getStorageItem("arrow-sound-enabled", "1") !== "0",
    shareModalOpen: false,
    isLocked: false,
    isGameOver: false,
    suppressGameOverUntilReset: false,
    statusText: IDLE_STATUS,
  };
}
