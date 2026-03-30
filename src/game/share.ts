import { getDifficultyConfig, getModeConfig, getNormalizedBoardSize } from "../gameCore";
import { buildChallengeShareUrl, copyText } from "./session";

export interface ShareActionResult {
  action: "challengeCode" | "challengeLink" | "systemShare";
  ok: boolean;
  tone: "success" | "error";
  message: string;
}

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
    const message = "这局的挑战码还没准备好，稍后再试。";
    updateChallengeStatus(message);
    return {
      action: "challengeCode",
      ok: false,
      tone: "error",
      message,
    } satisfies ShareActionResult;
  }

  try {
    const copied = await copyText(challengeCode);
    const message = copied ? "挑战码已复制，发给好友就能一起挑战这盘。" : "这次没复制成功，先手动记下挑战码也能发给好友。";
    updateChallengeStatus(message);
    return {
      action: "challengeCode",
      ok: copied,
      tone: copied ? "success" : "error",
      message,
    } satisfies ShareActionResult;
  } catch {
    const message = "这次没复制成功，稍后再试，或先手动复制挑战码。";
    updateChallengeStatus(message);
    return {
      action: "challengeCode",
      ok: false,
      tone: "error",
      message,
    } satisfies ShareActionResult;
  }
}

export async function copyChallengeLinkAction({ currentState, updateChallengeStatus }) {
  const sharePayload = buildSharePayload(currentState);
  if (!sharePayload) {
    const message = "这次没生成出分享链接，稍后再试。";
    updateChallengeStatus(message);
    return {
      action: "challengeLink",
      ok: false,
      tone: "error",
      message,
    } satisfies ShareActionResult;
  }

  try {
    const copied = await copyText(sharePayload.shareUrl);
    const message = copied
      ? currentState.modeKey === "endless"
        ? "链接已复制，发给好友点开就是同一盘。"
        : "链接已复制，发给好友点开就能直接开玩。"
      : "这次没复制成功，稍后再试，或先手动复制链接。";
    updateChallengeStatus(message);
    return {
      action: "challengeLink",
      ok: copied,
      tone: copied ? "success" : "error",
      message,
    } satisfies ShareActionResult;
  } catch {
    const message = "这次没复制成功，稍后再试，或先手动复制链接。";
    updateChallengeStatus(message);
    return {
      action: "challengeLink",
      ok: false,
      tone: "error",
      message,
    } satisfies ShareActionResult;
  }
}

export async function shareChallengeViaSystemAction({ currentState, updateChallengeStatus }) {
  const sharePayload = buildSharePayload(currentState);
  if (!sharePayload) {
    const message = "这次没生成出分享链接，稍后再试。";
    updateChallengeStatus(message);
    return {
      action: "systemShare",
      ok: false,
      tone: "error",
      message,
    } satisfies ShareActionResult;
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({
        title: currentState.modeKey === "endless" ? "箭阵消消消挑战" : "箭阵消消消",
        text: sharePayload.shareText,
        url: sharePayload.shareUrl,
      });
      const message = currentState.modeKey === "endless" ? "分享面板已打开，挑个方式把这盘发给好友吧。" : "分享面板已打开，挑个方式把游戏发给好友吧。";
      updateChallengeStatus(message);
      return {
        action: "systemShare",
        ok: true,
        tone: "success",
        message,
      } satisfies ShareActionResult;
    }

    const copied = await copyText(sharePayload.shareUrl);
    const message = copied ? "系统分享暂时不可用，已帮你复制链接，直接发给好友即可。" : "系统分享暂时不可用，请手动复制链接发给好友。";
    updateChallengeStatus(message);
    return {
      action: "systemShare",
      ok: copied,
      tone: copied ? "success" : "error",
      message,
    } satisfies ShareActionResult;
  } catch (error) {
    if (error?.name === "AbortError") {
      return null;
    }

    try {
      const copied = await copyText(sharePayload.shareUrl);
      const message = copied ? "系统分享暂时不可用，已帮你复制链接，直接发给好友即可。" : "这次没分享出去，请手动复制链接发给好友。";
      updateChallengeStatus(message);
      return {
        action: "systemShare",
        ok: copied,
        tone: copied ? "success" : "error",
        message,
      } satisfies ShareActionResult;
    } catch {
      const message = "这次没分享出去，请手动复制链接发给好友。";
      updateChallengeStatus(message);
      return {
        action: "systemShare",
        ok: false,
        tone: "error",
        message,
      } satisfies ShareActionResult;
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
