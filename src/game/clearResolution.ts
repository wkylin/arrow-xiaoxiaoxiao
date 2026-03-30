import {
  COMBO_WINDOW,
  applyGravityAndRefill,
  chargeFever,
  cloneBoard,
  computeGain,
  getDifficultyConfig,
  getMissionGoal,
  getMoveLimit,
  getRushStars,
  getStageTarget,
  hasMetStageGoal,
  keyOf,
  summarizeChain,
} from "../gameCore";
import { createHintState, sleep } from "./hints";
import { getActiveBoardSize } from "./session";

export function describeSummary(summary) {
  const parts = [];

  if (summary.gem) {
    parts.push(`${summary.gem} 星钻`);
  }
  if (summary.time) {
    parts.push(`${summary.time} 续航`);
  }
  if (summary.fever) {
    parts.push(`${summary.fever} 电核`);
  }

  return parts.length ? `，可拿到 ${parts.join("、")}` : "";
}

export function getSummaryRewardText(modeKey, summary) {
  const rewards = [];

  if (summary.gem) {
    if (modeKey === "rush") {
      rewards.push(`星钻 +${summary.gem}`);
    } else {
      rewards.push(`彩蛋加分 +${summary.gem * 70}`);
    }
  }

  if (summary.time) {
    if (modeKey === "classic") {
      rewards.push(`补时 +${(summary.time * 2.2).toFixed(1)}s`);
    } else if (modeKey === "rush") {
      rewards.push(`步数 +${summary.time}`);
    } else {
      rewards.push(`续航加分 +${summary.time * 55}`);
    }
  }

  if (summary.fever) {
    rewards.push(`狂热充能 +${summary.fever * 18}%`);
  }

  return rewards.length ? ` ${rewards.join(" · ")}` : "";
}

export function buildGameOverStateForReason({ currentState, reason, persistBestScores }) {
  const bestScores = persistBestScores(
    currentState.modeKey,
    currentState.difficultyKey,
    currentState.customBoardSize,
    currentState.score,
    currentState.bestScores,
  );

  return {
    ...currentState,
    isGameOver: true,
    isLocked: false,
    previewChain: [],
    previewStartKey: null,
    previewValid: false,
    clearingKeys: [],
    bestScores,
    statusText:
      reason === "timeout"
        ? `时间到！最终得分 ${currentState.score.toLocaleString("zh-CN")}，最高分已自动记录。`
        : `步数用完！总分 ${currentState.score.toLocaleString("zh-CN")}，点击“重新开局”再冲一把。`,
  };
}

export function getPreviewDescription({ board, result }) {
  const summary = summarizeChain(board, result);
  if (!result.chain.length) {
    return "这个起点没有形成可追踪路径。";
  }

  const extras = describeSummary(summary);
  const loopText = result.loop ? `，其中 ${result.loopLength} 格形成闭环` : "";
  if (result.valid) {
    return `预览：共 ${result.chain.length} 格${loopText}${extras}，点击即可消除。`;
  }

  return `预览：只有 ${result.chain.length} 格，至少需要 ${result.requiredLength} 格才能消除${extras}。`;
}

export function buildLevelUpStateFromState({ currentState, makeFreshBoard }) {
  const difficulty = getDifficultyConfig(currentState.difficultyKey);
  const activeBoardSize = getActiveBoardSize(currentState.modeKey, currentState.customBoardSize);
  const nextLevel = currentState.level + 1;
  const nextTargetScore = getStageTarget(currentState.modeKey, nextLevel, currentState.difficultyKey, activeBoardSize);
  const nextMissionGoal = getMissionGoal(currentState.modeKey, nextLevel, currentState.difficultyKey);
  const nextBoard = makeFreshBoard(currentState.modeKey, nextLevel, nextMissionGoal, 0, currentState.difficultyKey, activeBoardSize);
  const successText =
    currentState.modeKey === "endless"
      ? `里程碑达成！进入第 ${nextLevel} 段，继续无尽刷分。`
      : `过关成功！${currentState.modeKey === "rush" ? "★".repeat(getRushStars(currentState.movesLeft)) : "★★★"} 评级已到手，进入第 ${nextLevel} 关。`;

  const hintedState = createHintState({
    ...currentState,
    board: nextBoard,
    previewChain: [],
    previewStartKey: null,
    previewValid: false,
    clearingKeys: [],
    stageScore: 0,
    level: nextLevel,
    targetScore: nextTargetScore,
    missionGoal: nextMissionGoal,
    missionCollected: 0,
    combo: 1,
    feverCharge: Math.max(18, Math.min(40, currentState.feverCharge)),
    feverActiveUntil: 0,
    timeLeft:
      currentState.modeKey === "classic"
        ? Math.min(difficulty.classicTimeMax, currentState.timeLeft + difficulty.classicTimeReward)
        : 0,
    movesLeft: currentState.modeKey === "rush" ? getMoveLimit(nextLevel, currentState.difficultyKey) : 0,
    statusText: successText,
  });

  return {
    ...hintedState,
    statusText: `${successText} 先看发光起点和数字顺序。`,
  };
}

export async function resolveSuccessfulClear({
  result,
  gameRef,
  actionVersionRef,
  applyState,
  persistBestScores,
  nextIdRef,
  nextRandom,
  spawnChainParticles,
  playSound,
  buildGameOverState,
  buildLevelUpState,
}) {
  const currentState = gameRef.current;
  if (currentState.isLocked || currentState.isGameOver) {
    return;
  }

  const actionVersion = actionVersionRef.current + 1;
  actionVersionRef.current = actionVersion;

  const now = Date.now();
  const combo = now - currentState.lastClearAt <= COMBO_WINDOW ? currentState.combo + 1 : 1;
  const summary = summarizeChain(currentState.board, result);
  const feverState = chargeFever(currentState, result.chain.length * 10 + summary.fever * 18 + (result.loop ? 16 : 0), now);
  const gain = computeGain({
    result,
    summary,
    combo,
    feverActive: feverState.feverActiveUntil > now,
    modeKey: currentState.modeKey,
    difficultyKey: currentState.difficultyKey,
  });
  const boardSnapshot = cloneBoard(currentState.board);
  const clearingKeys = result.chain.map(({ row, col }) => keyOf(row, col));

  applyState({
    ...currentState,
    combo,
    lastClearAt: now,
    feverCharge: feverState.feverCharge,
    feverActiveUntil: feverState.feverActiveUntil,
    isLocked: true,
    clearingKeys,
  });

  spawnChainParticles(boardSnapshot, result, gain, summary, feverState.triggered);
  playSound("clear");
  if (feverState.triggered) {
    playSound("fever");
  }

  await sleep(190);

  if (actionVersionRef.current !== actionVersion) {
    return;
  }

  const liveState = gameRef.current;
  const activeBoardSize = getActiveBoardSize(liveState.modeKey, liveState.customBoardSize);
  let nextMissionCollected = liveState.missionCollected;
  let nextMovesLeft = liveState.movesLeft;
  let nextTimeLeft = liveState.timeLeft;

  if (liveState.modeKey === "rush") {
    nextMissionCollected += summary.gem;
    nextMovesLeft = Math.max(0, liveState.movesLeft - 1 + summary.time);
  } else if (liveState.modeKey === "classic") {
    nextTimeLeft = Math.min(getDifficultyConfig(liveState.difficultyKey).classicTimeMax, liveState.timeLeft + summary.time * 2.2);
  }

  const boardAfterClear = cloneBoard(liveState.board);
  result.chain.forEach(({ row, col }) => {
    boardAfterClear[row][col] = null;
  });

  const refilledBoard = applyGravityAndRefill({
    board: boardAfterClear,
    modeKey: liveState.modeKey,
    level: liveState.level,
    missionGoal: liveState.missionGoal,
    missionCollected: nextMissionCollected,
    difficultyKey: liveState.difficultyKey,
    boardSizeOverride: activeBoardSize,
    nextId: nextIdRef.current,
    random: nextRandom,
  });

  nextIdRef.current = refilledBoard.nextId;

  const nextScore = liveState.score + gain;
  const nextStageScore = liveState.stageScore + gain;
  const nextBestScores = persistBestScores(liveState.modeKey, liveState.difficultyKey, liveState.customBoardSize, nextScore, liveState.bestScores);
  const loopText = result.loop ? "闭环奖励已触发，" : "";
  const feverText = feverState.triggered
    ? ` 狂热启动，${getDifficultyConfig(liveState.difficultyKey).feverClearLength} 格也能消除！`
    : "";

  let nextState = {
    ...liveState,
    board: refilledBoard.board,
    previewChain: [],
    previewStartKey: null,
    previewValid: false,
    clearingKeys: [],
    isLocked: false,
    score: nextScore,
    stageScore: nextStageScore,
    missionCollected: nextMissionCollected,
    movesLeft: nextMovesLeft,
    timeLeft: nextTimeLeft,
    bestScores: nextBestScores,
    statusText: `命中 ${result.chain.length} 连锁，${loopText}获得 ${gain} 分。${getSummaryRewardText(liveState.modeKey, summary)}${feverText}`.trim(),
  };

  if (hasMetStageGoal(nextState)) {
    nextState = buildLevelUpState(nextState);
    playSound("level");
  } else if (nextState.modeKey === "rush" && nextState.movesLeft <= 0) {
    actionVersionRef.current += 1;
    // Respect any UI-driven suppression (e.g. user dismissed gameover modal)
    if (!gameRef.current.suppressGameOverUntilReset) {
      nextState = buildGameOverState(nextState, "moves");
      playSound("gameover");
    } else {
      // ensure we don't lock the UI or re-open the modal
      nextState = {
        ...nextState,
        isGameOver: false,
        isLocked: false,
      };
    }
  }

  applyState(nextState);
}
