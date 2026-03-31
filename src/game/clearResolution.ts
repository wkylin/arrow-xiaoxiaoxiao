import {
  COMBO_WINDOW,
  applyGravityAndRefill,
  chargeFever,
  cloneBoard,
  computeGain,
  getDifficultyConfig,
  getMissionGoal,
  getMoveLimit,
  repairBoard,
  getRushStars,
  getStageTarget,
  hasMetStageGoal,
  keyOf,
  summarizeChain,
} from "../gameCore";
import { getClassicChallengeLevelMeta, resolveBoardSizeForRun, resolveStageProgressState } from "./challengeProgression";
import { sleep } from "./hints";
import { applyBoardChallengeState, buildBoardIntroStatus } from "./pathChallenge";
import { getActiveBoardSize } from "./session";

const CLEAR_SETTLE_BASE_DELAY = 900;
const CLEAR_SETTLE_STEP_DELAY = 160;

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
    if (modeKey === "rush") {
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

export function buildGameOverStateForReason({ currentState, reason, persistBestScores, title = null, statusText = null }) {
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
    previewValid: true,
    clearingKeys: [],
    pathInProgress: false,
    currentPathKey: null,
    expectedNextKey: null,
    bestScores,
    gameOverTitle:
      title
      ?? (reason === "timeout"
        ? "时间到了"
        : reason === "moves"
          ? "步数耗尽"
          : "继续努力"),
    statusText:
      statusText
      ?? (reason === "timeout"
        ? (currentState.modeKey === "classic"
          ? "这次时间到了。准备好就点“重新开局”，再把这盘拿下。"
          : `时间到！最终得分 ${currentState.score.toLocaleString("zh-CN")}，最高分已自动记录。`)
        : reason === "moves"
          ? `步数用完！总分 ${currentState.score.toLocaleString("zh-CN")}，点击“重新开局”再冲一把。`
          : `这次没命中本盘最优路径，最终得分 ${currentState.score.toLocaleString("zh-CN")}。继续努力，再来一局。`),
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
    return `这条路线共 ${result.chain.length} 格${loopText}${extras}。你需要自己一格一格点到尽头。`;
  }

  return `这条路线只有 ${result.chain.length} 格，达不到当前门槛 ${result.requiredLength} 格${extras}。`;
}

export function buildLevelUpStateFromState({ currentState, makeFreshBoard }) {
  const nextLevel = currentState.level + 1;
  const activeBoardSize = resolveBoardSizeForRun({
    modeKey: currentState.modeKey,
    level: nextLevel,
    difficultyKey: currentState.difficultyKey,
    customBoardSize: getActiveBoardSize(currentState.modeKey, currentState.customBoardSize),
  });
  const nextTargetScore = getStageTarget(currentState.modeKey, nextLevel, currentState.difficultyKey, activeBoardSize);
  const nextStageProgress = resolveStageProgressState({
    modeKey: currentState.modeKey,
    level: nextLevel,
    difficultyKey: currentState.difficultyKey,
    customBoardSize: activeBoardSize,
    fallbackStageScore: 0,
    fallbackTargetScore: nextTargetScore,
  });
  const nextMissionGoal = getMissionGoal(currentState.modeKey, nextLevel, currentState.difficultyKey);
  const nextBoard = makeFreshBoard(currentState.modeKey, nextLevel, nextMissionGoal, 0, currentState.difficultyKey, activeBoardSize);
  const classicMeta = currentState.modeKey === "classic" ? getClassicChallengeLevelMeta(nextLevel) : null;
  const successText =
    currentState.modeKey === "endless"
      ? `里程碑达成！进入第 ${nextLevel} 段，继续无尽刷分。`
      : currentState.modeKey === "classic"
        ? `你好棒！进入 Lv.${nextLevel}，${classicMeta?.boardSize}×${classicMeta?.boardSize} 新盘已上桌。`
        : `过关成功！${"★".repeat(getRushStars(currentState.movesLeft))} 评级已到手，进入第 ${nextLevel} 关。`;

  const nextState = applyBoardChallengeState({
    ...currentState,
    board: nextBoard,
    previewChain: [],
    previewStartKey: null,
    previewValid: true,
    clearingKeys: [],
    pathInProgress: false,
    currentPathKey: null,
    expectedNextKey: null,
    pathTargetLength: 0,
    pathTargetStarts: 0,
    stageScore: nextStageProgress.stageScore,
    level: nextLevel,
    targetScore: nextStageProgress.targetScore,
    missionGoal: nextMissionGoal,
    missionCollected: 0,
    combo: 1,
    feverCharge: Math.max(18, Math.min(40, currentState.feverCharge)),
    feverActiveUntil: 0,
    timeLeft: 0,
    movesLeft: currentState.modeKey === "rush" ? getMoveLimit(nextLevel, currentState.difficultyKey) : 0,
    gameOverTitle: null,
    statusText: successText,
  });

  return {
    ...nextState,
    statusText: `${successText} ${buildBoardIntroStatus({
      modeKey: nextState.modeKey,
      pathTargetLength: nextState.pathTargetLength,
      pathTargetStarts: nextState.pathTargetStarts,
    })}`,
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
    previewChain: result.chain,
    previewStartKey: keyOf(result.chain[0].row, result.chain[0].col),
    previewValid: true,
    combo,
    lastClearAt: now,
    feverCharge: feverState.feverCharge,
    feverActiveUntil: feverState.feverActiveUntil,
    isLocked: true,
    pathInProgress: true,
    currentPathKey: keyOf(result.chain[result.chain.length - 1].row, result.chain[result.chain.length - 1].col),
    expectedNextKey: null,
    clearingKeys,
  });

  spawnChainParticles(boardSnapshot, result, gain, summary, feverState.triggered);
  playSound("clear");
  if (feverState.triggered) {
    playSound("fever");
  }

  await sleep(CLEAR_SETTLE_BASE_DELAY + Math.max(0, result.chain.length - 1) * CLEAR_SETTLE_STEP_DELAY);

  if (actionVersionRef.current !== actionVersion) {
    return;
  }

  const liveState = gameRef.current;
  const activeBoardSize = resolveBoardSizeForRun({
    modeKey: liveState.modeKey,
    level: liveState.level,
    difficultyKey: liveState.difficultyKey,
    customBoardSize: getActiveBoardSize(liveState.modeKey, liveState.customBoardSize),
  });
  let nextMissionCollected = liveState.missionCollected;
  let nextMovesLeft = liveState.movesLeft;

  if (liveState.modeKey === "rush") {
    nextMissionCollected += summary.gem;
    nextMovesLeft = Math.max(0, liveState.movesLeft - 1 + summary.time);
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

  const repairedBoard = repairBoard({
    board: refilledBoard.board,
    modeKey: liveState.modeKey,
    level: liveState.level,
    difficultyKey: liveState.difficultyKey,
    boardSizeOverride: activeBoardSize,
    nextId: refilledBoard.nextId,
    random: nextRandom,
  });

  nextIdRef.current = repairedBoard.nextId;

  const nextScore = liveState.score + gain;
  const nextStageScore = liveState.stageScore + gain;
  const nextBestScores = persistBestScores(liveState.modeKey, liveState.difficultyKey, liveState.customBoardSize, nextScore, liveState.bestScores);
  const loopText = result.loop ? "闭环奖励已触发，" : "";
  const feverText = feverState.triggered
    ? ` 狂热启动，${getDifficultyConfig(liveState.difficultyKey).feverClearLength} 格也能消除！`
    : "";

  let nextState = applyBoardChallengeState({
    ...liveState,
    board: repairedBoard.board,
    score: nextScore,
    stageScore: nextStageScore,
    missionCollected: nextMissionCollected,
    movesLeft: nextMovesLeft,
    timeLeft: 0,
    bestScores: nextBestScores,
    isLocked: false,
    statusText: "",
  });

  nextState = {
    ...nextState,
    statusText: `你好棒！命中本盘最优 ${result.chain.length} 格，${loopText}获得 ${gain} 分。${getSummaryRewardText(liveState.modeKey, summary)}${feverText} 下一盘最优 ${nextState.pathTargetLength} 格。`.trim(),
  };

  if (nextState.modeKey === "classic") {
    nextState = buildLevelUpState(nextState);
    playSound("level");
  } else if (hasMetStageGoal(nextState)) {
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
