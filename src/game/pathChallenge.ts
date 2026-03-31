import { analyzeBoardPaths } from "../gameCore";
import { resolveBoardTimeLimitForState } from "./challengeProgression";

export function getBoardChallenge(board) {
  const analysis = analyzeBoardPaths(board);

  return {
    best: analysis.best,
    pathTargetLength: analysis.bestLength,
    pathTargetStarts: analysis.bestStartCount,
  };
}

export function buildBoardIntroStatus({ modeKey, pathTargetLength, pathTargetStarts }) {
  const startsText = pathTargetStarts > 1 ? `，共有 ${pathTargetStarts} 个起点能打到上限` : "";
  const toneText =
    modeKey === "rush"
      ? "想清楚再下手，准备好就开冲。"
      : modeKey === "classic"
        ? "先扫一眼全盘，准备好就开始走。"
        : "慢一点看，准备好就开始挑战。";

  return `本盘最优是 ${pathTargetLength} 格${startsText}。${toneText}`;
}

export function buildBoardReadyStatus({ modeKey, pathTargetLength, pathTargetStarts }) {
  return `先熟悉盘面，准备好后点“开始挑战”。${buildBoardIntroStatus({
    modeKey,
    pathTargetLength,
    pathTargetStarts,
  })}`;
}

export function applyBoardChallengeState(currentState, statusText = null) {
  const challenge = getBoardChallenge(currentState.board);
  const boardTimeLimit = resolveBoardTimeLimitForState(currentState);

  return {
    ...currentState,
    previewChain: [],
    previewStartKey: null,
    previewValid: true,
    clearingKeys: [],
    pathInProgress: false,
    currentPathKey: null,
    expectedNextKey: null,
    pathTargetLength: challenge.pathTargetLength,
    pathTargetStarts: challenge.pathTargetStarts,
    boardTimeLimit,
    boardTimeLeft: boardTimeLimit,
    gameOverTitle: null,
    statusText: statusText ?? buildBoardIntroStatus({
      modeKey: currentState.modeKey,
      pathTargetLength: challenge.pathTargetLength,
      pathTargetStarts: challenge.pathTargetStarts,
    }),
  };
}
