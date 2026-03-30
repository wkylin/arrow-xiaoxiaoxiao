import { getDifficultyConfig, getModeConfig, getNormalizedBoardSize } from "../gameCore";
import { buildChallengeShareUrl, copyText } from "./session";

export function buildStateChallengeShareUrl(currentState) {
  return buildChallengeShareUrl({
    modeKey: currentState.modeKey,
    difficultyKey: currentState.difficultyKey,
    customBoardSize: currentState.customBoardSize,
    activeSeedCode: currentState.activeSeedCode,
  });
}

export function buildChallengeSharePayload(currentState) {
  const shareUrl = buildStateChallengeShareUrl(currentState);
  if (!shareUrl) {
    return null;
  }

  const boardSize = getNormalizedBoardSize(currentState.customBoardSize);
  const difficultyLabel = getDifficultyConfig(currentState.difficultyKey).label;

  return {
    challengeCode: currentState.activeSeedCode,
    shareUrl,
    shareText: `来挑战这盘「${difficultyLabel} · ${boardSize}×${boardSize}」：${currentState.activeSeedCode}`,
  };
}

export function buildDefaultSharePayload(currentState) {
  const shareUrl = buildStateChallengeShareUrl(currentState);
  if (!shareUrl) {
    return null;
  }

  const difficulty = getDifficultyConfig(currentState.difficultyKey);
  const mode = getModeConfig(currentState.modeKey);
  const boardSize = currentState.modeKey === "endless" ? getNormalizedBoardSize(currentState.customBoardSize) : difficulty.boardSize;

  return {
    shareUrl,
    shareText: `我在玩「${mode.name} · ${difficulty.label} · ${boardSize}×${boardSize}」，当前打了 ${currentState.score.toLocaleString("zh-CN")} 分，来试试《箭阵消消消》：`,
  };
}

export function buildSharePayload(currentState) {
  return currentState.modeKey === "endless" ? buildChallengeSharePayload(currentState) : buildDefaultSharePayload(currentState);
}

export async function copyChallengeCodeAction({ currentState, updateChallengeStatus }) {
  const challengeCode = currentState.activeSeedCode;
  if (!challengeCode) {
    return;
  }

  try {
    const copied = await copyText(challengeCode);
    updateChallengeStatus(copied ? `挑战码已复制：${challengeCode}` : "当前环境不支持自动复制，请手动抄下挑战码。");
  } catch {
    updateChallengeStatus("复制挑战码失败了，请稍后再试或手动复制。");
  }
}

export async function copyChallengeLinkAction({ currentState, updateChallengeStatus }) {
  const sharePayload = buildSharePayload(currentState);
  if (!sharePayload) {
    updateChallengeStatus("当前链接生成失败了，请稍后再试。");
    return;
  }

  try {
    const copied = await copyText(sharePayload.shareUrl);
    updateChallengeStatus(
      copied
        ? currentState.modeKey === "endless"
          ? "分享链接已复制，发给朋友就能打开同一盘。"
          : "页面链接已复制，发给朋友就能直接开玩。"
        : "当前环境不支持自动复制，请手动复制地址栏。",
    );
  } catch {
    updateChallengeStatus("复制分享链接失败了，请稍后再试。");
  }
}

export async function shareChallengeViaSystemAction({ currentState, updateChallengeStatus }) {
  const sharePayload = buildSharePayload(currentState);
  if (!sharePayload) {
    updateChallengeStatus("当前链接生成失败了，请稍后再试。");
    return;
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({
        title: currentState.modeKey === "endless" ? "箭阵消消消挑战" : "箭阵消消消",
        text: sharePayload.shareText,
        url: sharePayload.shareUrl,
      });
      updateChallengeStatus(currentState.modeKey === "endless" ? "分享面板已打开，把这盘挑战发给朋友吧。" : "分享面板已打开，把游戏发给朋友吧。");
      return;
    }

    const copied = await copyText(sharePayload.shareUrl);
    updateChallengeStatus(copied ? "当前环境不支持系统分享，已自动复制链接。" : "当前环境不支持系统分享，也没能复制链接，请手动复制地址栏。");
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    try {
      const copied = await copyText(sharePayload.shareUrl);
      updateChallengeStatus(copied ? "系统分享不可用，已自动复制分享链接。" : "分享失败了，请手动复制地址栏链接。");
    } catch {
      updateChallengeStatus("分享失败了，请手动复制地址栏链接。");
    }
  }
}

export function openShareModalState(currentState) {
  return {
    ...currentState,
    shareModalOpen: true,
  };
}

export function closeShareModalState(currentState) {
  return currentState.shareModalOpen
    ? {
        ...currentState,
        shareModalOpen: false,
      }
    : currentState;
}
