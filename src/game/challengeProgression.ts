import { getBoardChallengeTimeLimit, getDifficultyConfig, getNormalizedBoardSize } from "../gameCore";

const CLASSIC_MIN_TARGET = 4;
const CLASSIC_SIZE_CAPS: Record<number, number> = {
  4: 10,
  5: 12,
  6: 14,
  7: 16,
  8: 18,
  9: 20,
  10: 21,
  11: 23,
  12: 24,
};
const CLASSIC_SIZE_FLOOR = 4;
const CLASSIC_SIZE_CEILING = 12;
const CLASSIC_ENDLESS_WINDOWS = [
  { min: 14, max: 18 },
  { min: 15, max: 19 },
  { min: 16, max: 20 },
  { min: 18, max: 22 },
  { min: 19, max: 23 },
  { min: 21, max: 24 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getClassicSizeCap(boardSize: number) {
  return CLASSIC_SIZE_CAPS[boardSize] ?? 24;
}

function getClassicStageCount(boardSize: number) {
  return Math.max(3, Math.ceil((getClassicSizeCap(boardSize) - CLASSIC_MIN_TARGET) / 2));
}

function getClassicJourneyLevelCount() {
  let total = 0;

  for (let boardSize = CLASSIC_SIZE_FLOOR; boardSize <= CLASSIC_SIZE_CEILING; boardSize += 1) {
    total += getClassicStageCount(boardSize);
  }

  return total;
}

function getClassicRange(boardSize: number, stageIndex: number, stageTotal: number) {
  const cap = getClassicSizeCap(boardSize);
  const span = cap - CLASSIC_MIN_TARGET;
  const rawMin = stageIndex === 1
    ? CLASSIC_MIN_TARGET
    : CLASSIC_MIN_TARGET + Math.floor((span * (stageIndex - 1)) / stageTotal) + 1;
  const rawMax = stageIndex === stageTotal
    ? cap
    : CLASSIC_MIN_TARGET + Math.floor((span * stageIndex) / stageTotal);

  return {
    min: Math.max(CLASSIC_MIN_TARGET, rawMin),
    max: Math.max(Math.max(CLASSIC_MIN_TARGET, rawMin), rawMax),
  };
}

export function getClassicChallengeLevelMeta(level = 1) {
  const normalizedLevel = Math.max(1, Math.round(level));
  let remainingLevel = normalizedLevel;
  let resolvedBoardSize = CLASSIC_SIZE_CEILING;
  let resolvedStageIndex = getClassicStageCount(resolvedBoardSize);
  let resolvedStageTotal = resolvedStageIndex;
  let endlessCycle = 0;

  for (let boardSize = CLASSIC_SIZE_FLOOR; boardSize <= CLASSIC_SIZE_CEILING; boardSize += 1) {
    const stageTotal = getClassicStageCount(boardSize);
    if (remainingLevel <= stageTotal) {
      resolvedBoardSize = boardSize;
      resolvedStageIndex = remainingLevel;
      resolvedStageTotal = stageTotal;
      break;
    }

    remainingLevel -= stageTotal;
  }

  let targetRange = getClassicRange(resolvedBoardSize, resolvedStageIndex, resolvedStageTotal);
  let boardTimeLimit = clamp(15 + resolvedBoardSize + resolvedStageIndex, 20, 38);

  if (normalizedLevel > getClassicJourneyLevelCount()) {
    const endlessIndex = normalizedLevel - getClassicJourneyLevelCount() - 1;
    endlessCycle = Math.floor(endlessIndex / CLASSIC_ENDLESS_WINDOWS.length);
    resolvedBoardSize = CLASSIC_SIZE_CEILING;
    resolvedStageTotal = CLASSIC_ENDLESS_WINDOWS.length;
    resolvedStageIndex = (endlessIndex % resolvedStageTotal) + 1;

    const window = CLASSIC_ENDLESS_WINDOWS[resolvedStageIndex - 1];
    const cycleShift = Math.min(endlessCycle, 4);
    const shiftedMin = clamp(window.min + cycleShift, 14, getClassicSizeCap(resolvedBoardSize));
    const shiftedMaxFloor = shiftedMin;
    const shiftedMaxTarget = window.max + Math.max(0, cycleShift - 1);
    targetRange = {
      min: shiftedMin,
      max: clamp(shiftedMaxTarget, shiftedMaxFloor, getClassicSizeCap(resolvedBoardSize)),
    };
    boardTimeLimit = clamp(28 - resolvedStageIndex - endlessCycle, 16, 28);
  }

  return {
    level: normalizedLevel,
    boardSize: resolvedBoardSize,
    stageIndex: resolvedStageIndex,
    stageTotal: resolvedStageTotal,
    endlessCycle,
    boardTimeLimit,
    targetMin: targetRange.min,
    targetMax: targetRange.max,
    sizeCap: getClassicSizeCap(resolvedBoardSize),
  };
}

export function resolveBoardSizeForRun({
  modeKey,
  level = 1,
  difficultyKey = "normal",
  customBoardSize = null,
}: {
  modeKey: string;
  level?: number;
  difficultyKey?: string;
  customBoardSize?: number | null;
}) {
  if (modeKey === "classic") {
    return getClassicChallengeLevelMeta(level).boardSize;
  }

  if (modeKey === "endless") {
    return getNormalizedBoardSize(customBoardSize);
  }

  return getDifficultyConfig(difficultyKey).boardSize;
}

export function resolveStageProgressState({
  modeKey,
  level = 1,
  difficultyKey = "normal",
  customBoardSize = null,
  fallbackStageScore = 0,
  fallbackTargetScore = 0,
}: {
  modeKey: string;
  level?: number;
  difficultyKey?: string;
  customBoardSize?: number | null;
  fallbackStageScore?: number;
  fallbackTargetScore?: number;
}) {
  if (modeKey === "classic") {
    const meta = getClassicChallengeLevelMeta(level);
    return {
      stageScore: meta.stageIndex,
      targetScore: meta.stageTotal,
    };
  }

  return {
    stageScore: fallbackStageScore,
    targetScore: fallbackTargetScore,
  };
}

export function resolveBoardTimeLimitForState(state: {
  modeKey: string;
  level: number;
  difficultyKey: string;
}) {
  if (state.modeKey === "classic") {
    return getClassicChallengeLevelMeta(state.level).boardTimeLimit;
  }

  return getBoardChallengeTimeLimit(state.difficultyKey);
}

export function getLengthRangeDistance(length: number, min: number, max: number) {
  if (length < min) {
    return min - length;
  }

  if (length > max) {
    return length - max;
  }

  return 0;
}
