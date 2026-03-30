import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FEVER_DURATION,
  MAX_CUSTOM_BOARD_SIZE,
  MIN_CUSTOM_BOARD_SIZE,
  getBestScoreKey,
  keyOf,
} from "./gameCore";
import type { ShareActionResult } from "./game/share";
import { createQrCodeDataUrl } from "./qrCode";
import { useArrowGame } from "./useArrowGame";
import { ChallengeShareModal } from "./ui/components/ChallengeShareModal";
import { formatNumber, formatSeedModeLabel, formatSeconds, getBoardMetrics } from "./ui/helpers";
import {
  BattleBoardSection,
  BottomDrawerShellSection,
  ChallengeDrawerSection,
  GuideDrawerSection,
  MissionControlSection,
  MinimalHeaderSection,
  QuickStartOverlaySection,
  SettingsDrawerSection,
  StickyActionBarSection,
} from "./ui/sections";
import { ConfirmRestartModal, GameOverModal } from "./ui/sections";

const QUICKSTART_STORAGE_KEY = "arrow-quickstart-dismissed";
const SHARE_FEEDBACK_DURATION = 1800;

function shouldShowQuickStart() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(QUICKSTART_STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export default function App(): JSX.Element {
  const { state, renderBoard, refs, actions, helpers } = useArrowGame();
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [quickStartOpen, setQuickStartOpen] = useState<boolean>(shouldShowQuickStart);
  const [confirmRestartOpen, setConfirmRestartOpen] = useState<boolean>(false);
  const [drawerShareFeedback, setDrawerShareFeedback] = useState<ShareActionResult | null>(null);
  const [modalShareFeedback, setModalShareFeedback] = useState<ShareActionResult | null>(null);
  const drawerShareFeedbackTimeoutRef = useRef<number | null>(null);
  const modalShareFeedbackTimeoutRef = useRef<number | null>(null);

  const mode = helpers.getModeConfig(state.modeKey);
  const difficulty = helpers.getDifficultyConfig(state.difficultyKey);
  const endlessMode = state.modeKey === "endless";
  const boardSize = renderBoard.length || (endlessMode ? state.customBoardSize : difficulty.boardSize);
  const boardLabel = `${boardSize}×${boardSize}`;
  const boardStyle = useMemo(() => getBoardMetrics(boardSize), [boardSize]);
  const sizeOptions = useMemo(
    () => Array.from({ length: MAX_CUSTOM_BOARD_SIZE - MIN_CUSTOM_BOARD_SIZE + 1 }, (_, index) => MIN_CUSTOM_BOARD_SIZE + index),
    [],
  );
  const feverActive = helpers.isFeverActive(state);
  const previewKeys = useMemo(() => new Set(state.previewChain.map(({ row, col }: any) => keyOf(row, col))), [state.previewChain]);
  const previewOrderMap = useMemo(
    () => new Map(state.previewChain.map(({ row, col }: any, index: number) => [keyOf(row, col), index + 1])),
    [state.previewChain],
  );
  const clearingKeys = useMemo(() => new Set(state.clearingKeys), [state.clearingKeys]);
  const feverRemain = feverActive ? Math.max(0, state.feverActiveUntil - Date.now()) : 0;
  const feverText = feverActive ? `${(feverRemain / 1000).toFixed(1)}s` : `${Math.round(state.feverCharge)}%`;
  const feverWidth = feverActive ? (feverRemain / FEVER_DURATION) * 100 : state.feverCharge;
  const resourceLabel = state.modeKey === "classic" ? "时间" : state.modeKey === "rush" ? "步数" : "状态";
  const resourceValue = state.modeKey === "classic" ? formatSeconds(state.timeLeft) : state.modeKey === "rush" ? `${state.movesLeft}` : "无尽";
  const missionText =
    state.modeKey === "classic"
      ? `目标分 ${formatNumber(state.targetScore)}`
      : state.modeKey === "rush"
      ? `星钻 ${state.missionCollected}/${state.missionGoal} · 目标分 ${formatNumber(state.targetScore)}`
      : `里程碑 ${formatNumber(state.targetScore)} 分`;
  const bestScoreKey = getBestScoreKey(state.modeKey, state.difficultyKey, endlessMode ? state.customBoardSize : null);
  const bestScore = state.bestScores[bestScoreKey] ?? 0;
  const disabled = state.isLocked || state.isGameOver;
  const requiredLength = feverActive ? difficulty.feverClearLength : difficulty.baseClearLength;
  const seedModeLabel = formatSeedModeLabel(state.seedMode);
  const canApplySeedInput = Boolean(state.seedInput.trim());
  const challengeShareUrl = helpers.buildChallengeShareUrl({
    modeKey: state.modeKey,
    difficultyKey: state.difficultyKey,
    customBoardSize: state.customBoardSize,
    activeSeedCode: state.activeSeedCode,
  });
  const qrDataUrl = useMemo(() => {
    if (!state.shareModalOpen || !challengeShareUrl) {
      return "";
    }

    try {
      return createQrCodeDataUrl(challengeShareUrl);
    } catch {
      return "";
    }
  }, [challengeShareUrl, state.shareModalOpen]);

  const clearShareFeedback = useCallback((scope: "drawer" | "modal") => {
    const timeoutRef = scope === "drawer" ? drawerShareFeedbackTimeoutRef : modalShareFeedbackTimeoutRef;
    const setFeedback = scope === "drawer" ? setDrawerShareFeedback : setModalShareFeedback;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setFeedback(null);
  }, []);

  const flashShareFeedback = useCallback((scope: "drawer" | "modal", feedback: ShareActionResult | null) => {
    if (!feedback?.message) {
      return;
    }

    const timeoutRef = scope === "drawer" ? drawerShareFeedbackTimeoutRef : modalShareFeedbackTimeoutRef;
    const setFeedback = scope === "drawer" ? setDrawerShareFeedback : setModalShareFeedback;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    setFeedback(feedback);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setFeedback(null);
    }, SHARE_FEEDBACK_DURATION);
  }, []);

  const openDrawer = useCallback((panelKey: string | null) => {
    if (panelKey !== "challenge") {
      clearShareFeedback("drawer");
    }
    setActiveDrawer(panelKey);
  }, [clearShareFeedback]);

  const closeDrawer = useCallback(() => {
    clearShareFeedback("drawer");
    setActiveDrawer(null);
  }, [clearShareFeedback]);

  const openShareModal = useCallback(() => {
    clearShareFeedback("modal");
    actions.shareChallengeLink();
  }, [actions.shareChallengeLink, clearShareFeedback]);

  const closeShareModal = useCallback(() => {
    clearShareFeedback("modal");
    actions.closeShareModal();
  }, [actions.closeShareModal, clearShareFeedback]);

  const copyChallengeCodeFromDrawer = useCallback(async () => {
    const result = await actions.copyChallengeCode();
    flashShareFeedback("drawer", result);
  }, [actions.copyChallengeCode, flashShareFeedback]);

  const copyChallengeLinkFromDrawer = useCallback(async () => {
    const result = await actions.copyChallengeLink();
    flashShareFeedback("drawer", result);
  }, [actions.copyChallengeLink, flashShareFeedback]);

  const copyChallengeLinkFromModal = useCallback(async () => {
    const result = await actions.copyChallengeLink();
    flashShareFeedback("modal", result);
  }, [actions.copyChallengeLink, flashShareFeedback]);

  const shareChallengeFromModal = useCallback(async () => {
    const result = await actions.shareChallengeViaSystem();
    flashShareFeedback("modal", result);
  }, [actions.shareChallengeViaSystem, flashShareFeedback]);

  const dismissQuickStart = useCallback((panelKey: string | null = null) => {
    setQuickStartOpen(false);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(QUICKSTART_STORAGE_KEY, "1");
      } catch {
        // ignore storage failures
      }
    }

    if (panelKey) {
      setActiveDrawer(panelKey);
    }
  }, []);

  useEffect(() => {
    if (!activeDrawer || typeof window === "undefined") {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event as KeyboardEvent).key === "Escape") {
        closeDrawer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDrawer, closeDrawer]);

  useEffect(() => {
    return () => {
      if (drawerShareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(drawerShareFeedbackTimeoutRef.current);
      }

      if (modalShareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(modalShareFeedbackTimeoutRef.current);
      }
    };
  }, []);

  let drawerContent: React.ReactNode = null;
  if (activeDrawer === "settings") {
    drawerContent = (
      <SettingsDrawerSection
        key="settings-panel"
        actions={actions}
        bestScore={bestScore}
        boardLabel={boardLabel}
        difficulty={difficulty}
        endlessMode={endlessMode}
        sizeOptions={sizeOptions}
        state={state}
      />
    );
  } else if (activeDrawer === "challenge") {
    drawerContent = (
      <ChallengeDrawerSection
        key="challenge-panel"
        actions={{
          ...actions,
          copyChallengeCode: copyChallengeCodeFromDrawer,
          copyChallengeLink: copyChallengeLinkFromDrawer,
          shareChallengeLink: openShareModal,
        }}
        canApplySeedInput={canApplySeedInput}
        endlessMode={endlessMode}
        seedModeLabel={seedModeLabel}
        shareFeedback={drawerShareFeedback}
        state={state}
      />
    );
  } else if (activeDrawer === "guide") {
    drawerContent = (
      <GuideDrawerSection
        key="guide-panel"
        boardLabel={boardLabel}
        difficulty={difficulty}
        endlessMode={endlessMode}
        mode={mode}
        requiredLength={requiredLength}
      />
    );
  }

  const actionsForUI = {
    ...actions,
    closeShareModal,
    requestRestart: () => setConfirmRestartOpen(true),
    shareChallengeLink: openShareModal,
  };

  return (
    <div className="app-shell focus-minimal-app">
      <MinimalHeaderSection
        key="header"
        actions={actionsForUI}
        boardLabel={boardLabel}
        difficulty={difficulty}
        mode={mode}
        onOpenGuide={() => openDrawer("guide")}
        onOpenMenu={() => openDrawer("settings")}
        state={state}
      />

      <MissionControlSection
        key="mission"
        feverText={feverText}
        feverWidth={feverWidth}
        levelValue={endlessMode ? `第${state.level}段` : `Lv.${state.level}`}
        missionText={missionText}
        progressText={`${formatNumber(state.stageScore)} / ${formatNumber(state.targetScore)}`}
        resourceLabel={resourceLabel}
        resourceValue={resourceValue}
        scoreText={formatNumber(state.score)}
        state={state}
      />

      <BattleBoardSection
        key="board"
        actions={actionsForUI}
        boardLabel={boardLabel}
        board={renderBoard}
        boardStyle={boardStyle}
        clearingKeys={clearingKeys}
        difficulty={difficulty}
        disabled={disabled}
        endlessMode={endlessMode}
        feverActive={feverActive}
        mode={mode}
        previewKeys={previewKeys}
        previewOrderMap={previewOrderMap}
        refs={refs}
        state={state}
      />

      <StickyActionBarSection key="actions" actions={actionsForUI} disabled={disabled} onOpenChallenge={() => openDrawer("challenge")} onOpenMenu={() => openDrawer("settings")} />

      <BottomDrawerShellSection key="drawer" activePanel={activeDrawer} open={Boolean(activeDrawer)} onClose={closeDrawer} onSelectPanel={openDrawer}>
        {drawerContent}
      </BottomDrawerShellSection>

      <QuickStartOverlaySection key="quickstart" open={quickStartOpen} onDismiss={() => dismissQuickStart()} onOpenGuide={() => dismissQuickStart("guide")} requiredLength={requiredLength} />

      <ChallengeShareModal
        key="share-modal"
        open={state.shareModalOpen}
        qrDataUrl={qrDataUrl}
        shareUrl={challengeShareUrl}
        title={endlessMode ? `扫码挑战 · ${difficulty.label} · ${boardLabel}` : `分享这局 · ${mode.name} · ${difficulty.label}`}
        subtitle={
          endlessMode
            ? `挑战码：${state.activeSeedCode}。朋友扫码后会直接打开同一盘。`
            : `当前得分：${formatNumber(state.score)}。可以扫码打开，或直接复制链接发给朋友。`
        }
        onClose={closeShareModal}
        onCopyLink={copyChallengeLinkFromModal}
        onSystemShare={shareChallengeFromModal}
        shareFeedback={modalShareFeedback}
      />

      <ConfirmRestartModal
        key="confirm-restart"
        open={confirmRestartOpen}
        onCancel={() => setConfirmRestartOpen(false)}
        onConfirm={() => {
          setConfirmRestartOpen(false);
          if (typeof actions.resetGame === "function") {
            actions.resetGame();
          }
        }}
      />

      <GameOverModal
        key="gameover"
        open={Boolean(state.isGameOver)}
        score={state.score}
        onRequestRestart={() => {
          if (typeof actions.closeGameOver === "function") {
            actions.closeGameOver();
          }
          setConfirmRestartOpen(true);
        }}
        onShare={() => {
          if (typeof actions.closeGameOver === "function") {
            actions.closeGameOver();
          }
          openShareModal();
        }}
        onClose={() => {
          if (typeof actions.closeGameOver === "function") {
            actions.closeGameOver();
          }
          openDrawer("settings");
        }}
      />
    </div>
  );
}
