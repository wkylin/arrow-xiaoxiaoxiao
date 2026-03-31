import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FEVER_DURATION,
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
  ChallengeBriefSection,
  ChallengeDrawerSection,
  GuideDrawerSection,
  InstallGuideModal,
  MinimalHeaderSection,
  StickyActionBarSection,
} from "./ui/sections";
const SHARE_FEEDBACK_DURATION = 1800;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function App(): JSX.Element {
  const { state, renderBoard, refs, actions, helpers } = useArrowGame();
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [drawerShareFeedback, setDrawerShareFeedback] = useState<ShareActionResult | null>(null);
  const [modalShareFeedback, setModalShareFeedback] = useState<ShareActionResult | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const drawerShareFeedbackTimeoutRef = useRef<number | null>(null);
  const modalShareFeedbackTimeoutRef = useRef<number | null>(null);

  const mode = helpers.getModeConfig(state.modeKey);
  const difficulty = helpers.getDifficultyConfig(state.difficultyKey);
  const endlessMode = state.modeKey === "endless";
  const boardSize = renderBoard.length || (endlessMode ? state.customBoardSize : difficulty.boardSize);
  const boardLabel = `${boardSize}×${boardSize}`;
  const boardStyle = useMemo(() => getBoardMetrics(boardSize), [boardSize]);
  const feverActive = helpers.isFeverActive(state);
  const previewKeys = useMemo(() => new Set(state.previewChain.map(({ row, col }: any) => keyOf(row, col))), [state.previewChain]);
  const previewOrderMap = useMemo(
    () => new Map(state.previewChain.map(({ row, col }: any, index: number) => [keyOf(row, col), index + 1])),
    [state.previewChain],
  );
  const clearingKeys = useMemo(() => new Set(state.clearingKeys), [state.clearingKeys]);
  const clearingOrderMap = useMemo(
    () => new Map(state.clearingKeys.map((cellKey: string, index: number) => [cellKey, index + 1])),
    [state.clearingKeys],
  );
  const feverRemain = feverActive ? Math.max(0, state.feverActiveUntil - Date.now()) : 0;
  const feverText = feverActive ? `${(feverRemain / 1000).toFixed(1)}s` : `${Math.round(state.feverCharge)}%`;
  const feverWidth = feverActive ? (feverRemain / FEVER_DURATION) * 100 : state.feverCharge;
  const levelValue = endlessMode ? `第${state.level}段` : `Lv.${state.level}`;
  const progressText = state.modeKey === "classic"
    ? `${boardLabel} · ${state.stageScore}/${state.targetScore}`
    : `${formatNumber(state.stageScore)} / ${formatNumber(state.targetScore)}`;
  const disabled = state.isLocked;
  const boardDisabled = state.isLocked || state.isGameOver || state.awaitingStart;
  const requiredLength = feverActive ? difficulty.feverClearLength : difficulty.baseClearLength;
  const currentPathKey = state.currentPathKey;
  const boardTimerText = formatSeconds(state.boardTimeLeft);
  const seedModeLabel = formatSeedModeLabel(state.seedMode);
  const canApplySeedInput = Boolean(state.seedInput.trim());
  const isIosDevice = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }, []);
  const installAction = useMemo(() => {
    if (isStandaloneApp) {
      return null;
    }

    if (deferredInstallPrompt) {
      return {
        label: "安装到桌面",
      };
    }

    if (isIosDevice) {
      return {
        label: "添加到主屏幕",
      };
    }

    return null;
  }, [deferredInstallPrompt, isIosDevice, isStandaloneApp]);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const nav = window.navigator as Navigator & { standalone?: boolean };
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const updateStandaloneState = () => {
      setIsStandaloneApp(mediaQuery.matches || Boolean(nav.standalone));
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setInstallGuideOpen(false);
      updateStandaloneState();
    };

    updateStandaloneState();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateStandaloneState);
    } else {
      mediaQuery.addListener(updateStandaloneState);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);

      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", updateStandaloneState);
      } else {
        mediaQuery.removeListener(updateStandaloneState);
      }
    };
  }, []);

  const openInstallEntry = useCallback(async () => {
    if (deferredInstallPrompt) {
      const promptEvent = deferredInstallPrompt;
      setDeferredInstallPrompt(null);

      try {
        await promptEvent.prompt();
        await promptEvent.userChoice;
      } catch {
        // Ignore prompt failures and let the button disappear until the browser emits again.
      }

      return;
    }

    if (isIosDevice) {
      setInstallGuideOpen(true);
    }
  }, [deferredInstallPrompt, isIosDevice]);

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
  if (activeDrawer === "challenge") {
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
    requestRestart: actions.requestRestart,
    shareChallengeLink: openShareModal,
  };

  return (
    <div className="app-shell focus-minimal-app">
      <MinimalHeaderSection
        key="header"
        actions={actionsForUI}
        boardLabel={boardLabel}
        difficulty={difficulty}
        installAction={installAction ? { ...installAction, onClick: openInstallEntry } : null}
        mode={mode}
        onOpenGuide={() => openDrawer("guide")}
        state={state}
      />

      <BattleBoardSection
        key="board"
        actions={actionsForUI}
        boardLabel={boardLabel}
        boardTimerText={boardTimerText}
        board={renderBoard}
        boardStyle={boardStyle}
        clearingKeys={clearingKeys}
        clearingOrderMap={clearingOrderMap}
        currentPathKey={currentPathKey}
        difficulty={difficulty}
        disabled={boardDisabled}
        endlessMode={endlessMode}
        feverActive={feverActive}
        levelValue={levelValue}
        mode={mode}
        previewKeys={previewKeys}
        previewOrderMap={previewOrderMap}
        refs={refs}
        state={state}
      />

      <ChallengeBriefSection
        key="mission"
        feverText={feverText}
        feverWidth={feverWidth}
        progressText={progressText}
        state={state}
      />

      <StickyActionBarSection
        key="actions"
        actions={actionsForUI}
        awaitingStart={state.awaitingStart}
        disabled={disabled}
        gameOver={state.isGameOver}
      />

      <BottomDrawerShellSection key="drawer" activePanel={activeDrawer} open={Boolean(activeDrawer)} onClose={closeDrawer} onSelectPanel={openDrawer}>
        {drawerContent}
      </BottomDrawerShellSection>

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
        shareFeedback={modalShareFeedback}
      />

      <InstallGuideModal open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />
    </div>
  );
}
