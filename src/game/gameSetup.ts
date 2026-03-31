import {
  DIFFICULTIES,
  MODES,
  createSeededRandom,
  getDailyChallengeCode,
  getDifficultyConfig,
  getMissionGoal,
  getMoveLimit,
  getNormalizedBoardSize,
  getStageTarget,
  normalizeSeedCode,
} from "../gameCore";
import { resolveBoardSizeForRun, resolveStageProgressState } from "./challengeProgression";
import { applyBoardChallengeState, buildBoardReadyStatus } from "./pathChallenge";
import {
  ensureBestScoreEntry,
  getActiveBoardSize,
  normalizeSeedMode,
  resolveSeedSession,
} from "./session";

const STORAGE_KEYS = {
  lastMode: "arrow-last-mode",
  lastDifficulty: "arrow-last-difficulty",
  customBoardSize: "arrow-custom-board-size",
  endlessSeedInput: "arrow-endless-seed-input",
  endlessSeedMode: "arrow-endless-seed-mode",
};

export function buildRunStateFromConfig({
  modeKey,
  difficultyKey,
  customBoardSize,
  seedInput,
  seedMode,
  bestScores,
  soundEnabled,
  makeFreshBoard,
  setRandomSource,
  awaitingStart = false,
}) {
  const level = 1;
  const difficulty = getDifficultyConfig(difficultyKey);
  const activeBoardSize = resolveBoardSizeForRun({
    modeKey,
    level,
    difficultyKey,
    customBoardSize: getActiveBoardSize(modeKey, customBoardSize),
  });
  const nextBestScores = ensureBestScoreEntry(bestScores, modeKey, difficultyKey, customBoardSize);
  const {
    seedMode: nextSeedMode,
    seedInput: nextSeedInput,
    activeSeedCode,
    dailyChallengeCode,
  } = resolveSeedSession(modeKey, seedMode, seedInput);

  setRandomSource(createSeededRandom(activeSeedCode));

  const targetScore = getStageTarget(modeKey, level, difficultyKey, activeBoardSize);
  const stageProgressState = resolveStageProgressState({
    modeKey,
    level,
    difficultyKey,
    customBoardSize: activeBoardSize,
    fallbackStageScore: 0,
    fallbackTargetScore: targetScore,
  });
  const missionGoal = getMissionGoal(modeKey, level, difficultyKey);
  const board = makeFreshBoard(modeKey, level, missionGoal, 0, difficultyKey, activeBoardSize);

  const nextState = applyBoardChallengeState({
    board,
    awaitingStart,
    previewChain: [],
    previewStartKey: null,
    previewValid: true,
    clearingKeys: [],
    pathInProgress: false,
    currentPathKey: null,
    expectedNextKey: null,
    pathTargetLength: 0,
    pathTargetStarts: 0,
    score: 0,
    stageScore: stageProgressState.stageScore,
    level,
    targetScore: stageProgressState.targetScore,
    missionGoal,
    missionCollected: 0,
    combo: 1,
    bestScores: nextBestScores,
    timeLeft: 0,
    movesLeft: modeKey === "rush" ? getMoveLimit(level, difficultyKey) : 0,
    lastClearAt: 0,
    feverCharge: 0,
    feverActiveUntil: 0,
    modeKey,
    difficultyKey,
    customBoardSize,
    seedInput: nextSeedInput,
    seedMode: nextSeedMode,
    activeSeedCode,
    dailyChallengeCode,
    soundEnabled,
    shareModalOpen: false,
    isLocked: false,
    isGameOver: false,
    suppressGameOverUntilReset: false,
    gameOverTitle: null,
  });

  if (!awaitingStart) {
    return nextState;
  }

  return {
    ...nextState,
    statusText: buildBoardReadyStatus({
      modeKey: nextState.modeKey,
      pathTargetLength: nextState.pathTargetLength,
      pathTargetStarts: nextState.pathTargetStarts,
    }),
  };
}

export function buildResetOptions({
  currentState,
  modeKeyOverride = null,
  difficultyKeyOverride = null,
  customBoardSizeOverride = null,
  seedOverrides = null,
}) {
  return {
    modeKeyOverride: modeKeyOverride ?? currentState.modeKey,
    difficultyKeyOverride: difficultyKeyOverride ?? currentState.difficultyKey,
    customBoardSizeOverride: customBoardSizeOverride ?? currentState.customBoardSize,
    seedOverrides,
  };
}

export function resolveModeSwitch({ currentState, nextModeKey, storedSeedInput, storedSeedMode }) {
  if (!MODES[nextModeKey] || currentState.modeKey === nextModeKey) {
    return null;
  }

  const storageEntries = [{ key: STORAGE_KEYS.lastMode, value: nextModeKey }];

  if (nextModeKey === "endless") {
    return {
      storageEntries,
      resetOptions: buildResetOptions({
        currentState,
        modeKeyOverride: nextModeKey,
        seedOverrides: {
          seedInput: storedSeedInput ?? currentState.seedInput,
          seedMode: normalizeSeedMode(storedSeedMode ?? currentState.seedMode),
        },
      }),
    };
  }

  return {
    storageEntries,
    resetOptions: buildResetOptions({ currentState, modeKeyOverride: nextModeKey }),
  };
}

export function resolveDifficultySwitch({ currentState, nextDifficultyKey }) {
  if (!DIFFICULTIES[nextDifficultyKey] || currentState.difficultyKey === nextDifficultyKey) {
    return null;
  }

  return {
    storageEntries: [{ key: STORAGE_KEYS.lastDifficulty, value: nextDifficultyKey }],
    resetOptions: buildResetOptions({
      currentState,
      difficultyKeyOverride: nextDifficultyKey,
    }),
  };
}

export function resolveBoardSizeSwitch({ currentState, nextBoardSize }) {
  const normalizedBoardSize = getNormalizedBoardSize(nextBoardSize);
  if (currentState.customBoardSize === normalizedBoardSize) {
    return null;
  }

  const storageEntries = [{ key: STORAGE_KEYS.customBoardSize, value: String(normalizedBoardSize) }];

  if (currentState.modeKey === "endless") {
    return {
      storageEntries,
      resetOptions: buildResetOptions({
        currentState,
        customBoardSizeOverride: normalizedBoardSize,
      }),
    };
  }

  return {
    storageEntries,
    nextState: {
      ...currentState,
      customBoardSize: normalizedBoardSize,
    },
  };
}

export function resolveSeedInputUpdate({ currentState, value }) {
  return {
    storageEntries: [{ key: STORAGE_KEYS.endlessSeedInput, value }],
    nextState: {
      ...currentState,
      seedInput: value,
    },
  };
}

export function resolveSeedApplication({ currentState }) {
  const nextSeedInput = normalizeSeedCode(currentState.seedInput);
  const nextSeedMode = nextSeedInput ? "manual" : "random";

  return {
    storageEntries: [
      { key: STORAGE_KEYS.endlessSeedInput, value: nextSeedInput },
      { key: STORAGE_KEYS.endlessSeedMode, value: nextSeedMode },
    ],
    resetOptions: buildResetOptions({
      currentState,
      modeKeyOverride: "endless",
      seedOverrides: {
        seedInput: nextSeedInput,
        seedMode: nextSeedMode,
      },
    }),
  };
}

export function resolveDailySeedSelection({ currentState }) {
  const dailyChallengeCode = getDailyChallengeCode();

  return {
    storageEntries: [
      { key: STORAGE_KEYS.endlessSeedInput, value: dailyChallengeCode },
      { key: STORAGE_KEYS.endlessSeedMode, value: "daily" },
    ],
    resetOptions: buildResetOptions({
      currentState,
      modeKeyOverride: "endless",
      seedOverrides: {
        seedInput: dailyChallengeCode,
        seedMode: "daily",
      },
    }),
  };
}

export function resolveRandomSeedSelection({ currentState }) {
  return {
    storageEntries: [{ key: STORAGE_KEYS.endlessSeedMode, value: "random" }],
    resetOptions: buildResetOptions({
      currentState,
      modeKeyOverride: "endless",
      seedOverrides: {
        seedInput: currentState.seedInput,
        seedMode: "random",
      },
    }),
  };
}
