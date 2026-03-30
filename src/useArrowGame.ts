import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FEVER_DURATION,
  buildRandomBoard,
  ensurePlayableBoard,
  getBestScoreKey,
  getChain,
  getDifficultyConfig,
  getModeConfig,
  getRequiredClearLength,
  hasMetStageGoal,
  isFeverActive,
  keyOf,
  repairBoard,
} from "./gameCore";
import {
  buildGameOverStateForReason,
  buildLevelUpStateFromState,
  getPreviewDescription,
  resolveSuccessfulClear,
} from "./game/clearResolution";
import {
  ensureAudioContext as ensureAudioContextRef,
  playSoundEffect,
  shakeBoardEffect,
  spawnChainParticlesEffect,
} from "./game/effects";
import {
  buildRunStateFromConfig,
  resolveBoardSizeSwitch,
  resolveDifficultySwitch,
  resolveDailySeedSelection,
  resolveModeSwitch,
  resolveRandomSeedSelection,
  resolveSeedApplication,
  resolveSeedInputUpdate,
} from "./game/gameSetup";
import { createHintState } from "./game/hints";
import {
  closeShareModalState,
  copyChallengeCodeAction,
  copyChallengeLinkAction,
  openShareModalState,
  shareChallengeViaSystemAction,
} from "./game/share";
import {
  buildChallengeShareUrl,
  createBootstrapState,
  ensureBestScoreEntry,
  getActiveBoardSize,
  getBestScoreStorageKey,
  getStorageItem,
  getStoredBestScore,
  IDLE_STATUS,
  setStorageItem,
} from "./game/session";

export function useArrowGame() {
  const [state, setState] = useState(createBootstrapState);
  const gameRef = useRef(state);
  const nextIdRef = useRef(1);
  const audioContextRef = useRef(null);
  const actionVersionRef = useRef(0);
  const timeoutIdsRef = useRef([]);
  const randomRef = useRef(Math.random);
  const boardRef = useRef(null);
  const boardFrameRef = useRef(null);
  const particleLayerRef = useRef(null);
  const lastRenderableBoardRef = useRef(state.board);

  useEffect(() => {
    gameRef.current = state;
  }, [state]);

  const applyState = useCallback((updater) => {
    setState((previousState) => {
      const nextState = typeof updater === "function" ? updater(previousState) : updater;
      gameRef.current = nextState;
      return nextState;
    });
  }, []);

  const nextRandom = useCallback(() => randomRef.current(), []);
  const boardHasGaps = useCallback((board) => board.some((row) => row.some((cell) => !cell)), []);

  const makeFreshBoard = useCallback((modeKey, level, missionGoal, missionCollected, difficultyKey, boardSizeOverride = null) => {
    const initialBoard = buildRandomBoard({ modeKey, level, difficultyKey, boardSizeOverride, nextId: nextIdRef.current, random: nextRandom });
    const playableBoard = ensurePlayableBoard({
      board: initialBoard.board,
      modeKey,
      level,
      missionGoal,
      missionCollected,
      difficultyKey,
      boardSizeOverride,
      nextId: initialBoard.nextId,
      random: nextRandom,
    });

    nextIdRef.current = playableBoard.nextId;
    return playableBoard.board;
  }, [nextRandom]);

  const persistBestScores = useCallback((modeKey, difficultyKey, customBoardSize, score, bestScores) => {
    const activeBoardSize = getActiveBoardSize(modeKey, customBoardSize);
    const bestKey = getBestScoreKey(modeKey, difficultyKey, activeBoardSize);
    const currentBestScore = bestScores[bestKey] ?? getStoredBestScore(modeKey, difficultyKey, customBoardSize);
    if (score <= currentBestScore) {
      return ensureBestScoreEntry(bestScores, modeKey, difficultyKey, customBoardSize);
    }

    const nextBestScores = {
      ...bestScores,
      [bestKey]: score,
    };

    setStorageItem(getBestScoreStorageKey(modeKey, difficultyKey, customBoardSize), String(score));
    return nextBestScores;
  }, []);

  const buildRunState = useCallback(
    (options) => buildRunStateFromConfig({
      ...options,
      makeFreshBoard,
      setRandomSource: (nextRandomSource) => {
        randomRef.current = nextRandomSource;
      },
    }),
    [makeFreshBoard],
  );

  const repairCurrentBoard = useCallback(
    (statusText = "箭阵出现了空位，已自动补齐。") => {
      const currentState = gameRef.current;
      if (!currentState.board.length) {
        return;
      }

      const activeBoardSize = getActiveBoardSize(currentState.modeKey, currentState.customBoardSize);
      const repaired = repairBoard({
        board: currentState.board,
        modeKey: currentState.modeKey,
        level: currentState.level,
        difficultyKey: currentState.difficultyKey,
        boardSizeOverride: activeBoardSize,
        nextId: nextIdRef.current,
        random: nextRandom,
      });

      nextIdRef.current = repaired.nextId;
      applyState((liveState) => ({
        ...liveState,
        board: repaired.board,
        previewChain: [],
        previewStartKey: null,
        previewValid: false,
        clearingKeys: [],
        isLocked: false,
        statusText,
      }));
    },
    [applyState, nextRandom],
  );

  const ensureAudioContext = useCallback(
    (force = false) => ensureAudioContextRef({
      audioContextRef,
      soundEnabled: gameRef.current.soundEnabled,
      force,
    }),
    [],
  );

  const playSound = useCallback(
    (kind, force = false) => {
      playSoundEffect({
        audioContextRef,
        soundEnabled: gameRef.current.soundEnabled,
        kind,
        force,
      });
    },
    [],
  );

  const spawnChainParticles = useCallback(
    (boardSnapshot, result, gain, summary, feverTriggered) => {
      spawnChainParticlesEffect({
        boardSnapshot,
        result,
        gain,
        summary,
        feverTriggered,
        feverActive: isFeverActive(gameRef.current),
        boardFrameRef,
        boardRef,
        particleLayerRef,
        timeoutIdsRef,
      });
    },
    [],
  );

  const buildGameOverState = useCallback(
    (currentState, reason) => buildGameOverStateForReason({ currentState, reason, persistBestScores }),
    [persistBestScores],
  );

  const previewDescription = useCallback(
    (board, result) => getPreviewDescription({ board, result }),
    [],
  );

  const shakeBoard = useCallback(() => {
    shakeBoardEffect(boardRef);
  }, []);

  const clearPreview = useCallback(
    (statusText = null) => {
      applyState((currentState) => ({
        ...currentState,
        previewChain: [],
        previewStartKey: null,
        previewValid: false,
        statusText: statusText ?? currentState.statusText,
      }));
    },
    [applyState],
  );

  const updateChallengeStatus = useCallback(
    (statusText) => {
      applyState((currentState) => ({
        ...currentState,
        statusText,
      }));
    },
    [applyState],
  );

  const commitStorageEntries = useCallback((storageEntries = []) => {
    storageEntries.forEach(({ key, value }) => {
      setStorageItem(key, value);
    });
  }, []);

  const resetGame = useCallback(
    (modeKeyOverride = null, difficultyKeyOverride = null, customBoardSizeOverride = null, seedOverrides = null) => {
      actionVersionRef.current += 1;
      const currentState = gameRef.current;
      const nextState = buildRunState({
        modeKey: modeKeyOverride ?? currentState.modeKey,
        difficultyKey: difficultyKeyOverride ?? currentState.difficultyKey,
        customBoardSize: customBoardSizeOverride ?? currentState.customBoardSize,
        seedInput: seedOverrides?.seedInput ?? currentState.seedInput,
        seedMode: seedOverrides?.seedMode ?? currentState.seedMode,
        bestScores: currentState.bestScores,
        soundEnabled: currentState.soundEnabled,
      });

      applyState(nextState);
    },
    [applyState, buildRunState],
  );

  // Ensure reset clears any temporary suppress flag that prevents gameover from re-triggering
  const resetGameWrapped = useCallback((...args) => {
    resetGame(...args);
    // clear suppress flag after reset
    applyState((currentState) => ({ ...currentState, suppressGameOverUntilReset: false }));
  }, [resetGame, applyState]);

  const commitSetupInstruction = useCallback(
    (instruction) => {
      if (!instruction) {
        return;
      }

      commitStorageEntries(instruction.storageEntries);

      if (instruction.resetOptions) {
        resetGame(
          instruction.resetOptions.modeKeyOverride,
          instruction.resetOptions.difficultyKeyOverride,
          instruction.resetOptions.customBoardSizeOverride,
          instruction.resetOptions.seedOverrides,
        );
        return;
      }

      if (instruction.nextState) {
        applyState(instruction.nextState);
      }
    },
    [applyState, commitStorageEntries, resetGame],
  );

  const switchMode = useCallback(
    (modeKey) => {
      commitSetupInstruction(resolveModeSwitch({
        currentState: gameRef.current,
        nextModeKey: modeKey,
        storedSeedInput: getStorageItem("arrow-endless-seed-input", gameRef.current.seedInput),
        storedSeedMode: getStorageItem("arrow-endless-seed-mode", gameRef.current.seedMode),
      }));
    },
    [commitSetupInstruction],
  );

  const switchDifficulty = useCallback(
    (difficultyKey) => {
      commitSetupInstruction(resolveDifficultySwitch({
        currentState: gameRef.current,
        nextDifficultyKey: difficultyKey,
      }));
    },
    [commitSetupInstruction],
  );

  const switchBoardSize = useCallback(
    (nextBoardSize) => {
      commitSetupInstruction(resolveBoardSizeSwitch({
        currentState: gameRef.current,
        nextBoardSize,
      }));
    },
    [commitSetupInstruction],
  );

  const updateSeedInput = useCallback(
    (value) => {
      commitSetupInstruction(resolveSeedInputUpdate({
        currentState: gameRef.current,
        value,
      }));
    },
    [commitSetupInstruction],
  );

  const applySeedInput = useCallback(() => {
    commitSetupInstruction(resolveSeedApplication({
      currentState: gameRef.current,
    }));
  }, [commitSetupInstruction]);

  const useDailySeed = useCallback(() => {
    commitSetupInstruction(resolveDailySeedSelection({
      currentState: gameRef.current,
    }));
  }, [commitSetupInstruction]);

  const useRandomSeed = useCallback(() => {
    commitSetupInstruction(resolveRandomSeedSelection({
      currentState: gameRef.current,
    }));
  }, [commitSetupInstruction]);

  const copyChallengeCode = useCallback(async () => {
    return copyChallengeCodeAction({
      currentState: gameRef.current,
      updateChallengeStatus,
    });
  }, [updateChallengeStatus]);

  const copyChallengeLink = useCallback(async () => {
    return copyChallengeLinkAction({
      currentState: gameRef.current,
      updateChallengeStatus,
    });
  }, [updateChallengeStatus]);

  const shareChallengeViaSystem = useCallback(async () => {
    return shareChallengeViaSystemAction({
      currentState: gameRef.current,
      updateChallengeStatus,
    });
  }, [updateChallengeStatus]);

  const shareChallengeLink = useCallback(() => {
    applyState((liveState) => openShareModalState(liveState));
  }, [applyState]);

  const closeShareModal = useCallback(() => {
    applyState((currentState) => closeShareModalState(currentState));
  }, [applyState]);

  const toggleSound = useCallback(() => {
    const nextSoundEnabled = !gameRef.current.soundEnabled;
    setStorageItem("arrow-sound-enabled", nextSoundEnabled ? "1" : "0");

    applyState((currentState) => ({
      ...currentState,
      soundEnabled: nextSoundEnabled,
    }));

    if (nextSoundEnabled) {
      playSound("clear", true);
    }
  }, [applyState, playSound]);

  const showHint = useCallback(() => {
    const currentState = gameRef.current;
    if (currentState.isLocked || currentState.isGameOver) {
      return;
    }

    applyState(createHintState(currentState, true));
  }, [applyState]);

  const handleBoardLeave = useCallback(() => {
    const currentState = gameRef.current;
    if (currentState.isLocked || currentState.isGameOver) {
      return;
    }

    if (!currentState.previewChain.length) {
      clearPreview(IDLE_STATUS);
    }
  }, [clearPreview]);

  const previewCell = useCallback(
    (row, col) => {
      const currentState = gameRef.current;
      if (currentState.isLocked || currentState.isGameOver) {
        return;
      }

      if (!currentState.board[row]?.[col]) {
        repairCurrentBoard();
        return;
      }

      const result = getChain(currentState.board, row, col, getRequiredClearLength(currentState));
      applyState({
        ...currentState,
        previewChain: result.chain,
        previewStartKey: keyOf(row, col),
        previewValid: result.valid,
        statusText: previewDescription(currentState.board, result),
      });
    },
    [applyState, previewDescription, repairCurrentBoard],
  );

  const buildLevelUpState = useCallback(
    (currentState) => buildLevelUpStateFromState({ currentState, makeFreshBoard }),
    [makeFreshBoard],
  );

  const handleSuccessfulClear = useCallback(
    (result) =>
      resolveSuccessfulClear({
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
      }),
    [
      applyState,
      buildGameOverState,
      buildLevelUpState,
      nextRandom,
      persistBestScores,
      playSound,
      spawnChainParticles,
    ],
  );

  const clickCell = useCallback(
    (row, col) => {
      const currentState = gameRef.current;
      if (currentState.isLocked || currentState.isGameOver) {
        return;
      }

      if (!currentState.board[row]?.[col]) {
        repairCurrentBoard();
        return;
      }

      const result = getChain(currentState.board, row, col, getRequiredClearLength(currentState));
      if (!result.valid) {
        applyState({
          ...currentState,
          combo: 1,
          previewChain: result.chain,
          previewStartKey: keyOf(row, col),
          previewValid: false,
          statusText: `这条路径只有 ${result.chain.length} 格，还差 ${Math.max(0, result.requiredLength - result.chain.length)} 格。本次不消耗资源。`,
        });
        playSound("invalid");
        shakeBoard();
        return;
      }

      handleSuccessfulClear(result);
    },
    [applyState, handleSuccessfulClear, playSound, repairCurrentBoard, shakeBoard],
  );

  const shuffleBoard = useCallback(() => {
    const currentState = gameRef.current;
    if (currentState.isLocked || currentState.isGameOver) {
      return;
    }

    const difficulty = getDifficultyConfig(currentState.difficultyKey);
    const activeBoardSize = getActiveBoardSize(currentState.modeKey, currentState.customBoardSize);
    actionVersionRef.current += 1;

    const board = makeFreshBoard(
      currentState.modeKey,
      currentState.level,
      currentState.missionGoal,
      currentState.missionCollected,
      currentState.difficultyKey,
      activeBoardSize,
    );
    let nextState = {
      ...currentState,
      board,
      previewChain: [],
      previewStartKey: null,
      previewValid: false,
      clearingKeys: [],
      combo: 1,
      score: Math.max(0, currentState.score - difficulty.shuffleScorePenalty),
      timeLeft:
        currentState.modeKey === "classic"
          ? Math.max(0, currentState.timeLeft - difficulty.classicShuffleCost)
          : currentState.timeLeft,
      movesLeft:
        currentState.modeKey === "rush"
          ? Math.max(0, currentState.movesLeft - difficulty.rushShuffleCost)
          : currentState.movesLeft,
      statusText:
        currentState.modeKey === "classic"
          ? `箭阵已重组，扣除 ${difficulty.shuffleScorePenalty} 分与 ${difficulty.classicShuffleCost} 秒。`
          : currentState.modeKey === "rush"
            ? `箭阵已重组，扣除 ${difficulty.shuffleScorePenalty} 分与 ${difficulty.rushShuffleCost} 步。`
            : `箭阵已重组，扣除 ${difficulty.shuffleScorePenalty} 分。`,
    };

    if (nextState.modeKey === "classic" && nextState.timeLeft <= 0) {
      if (!gameRef.current.suppressGameOverUntilReset) {
        nextState = buildGameOverState(nextState, "timeout");
        playSound("gameover");
      }
    } else if (nextState.modeKey === "rush" && nextState.movesLeft <= 0 && !hasMetStageGoal(nextState)) {
      if (!gameRef.current.suppressGameOverUntilReset) {
        nextState = buildGameOverState(nextState, "moves");
        playSound("gameover");
      }
    } else {
      playSound("shuffle");
    }

    applyState(nextState);
  }, [applyState, buildGameOverState, makeFreshBoard, playSound]);

  useEffect(() => {
    document.body.dataset.mode = state.modeKey;
  }, [state.modeKey]);

  const stateBoardHasGaps = state.board.length > 0 && boardHasGaps(state.board);

  if (state.board.length > 0 && !stateBoardHasGaps) {
    lastRenderableBoardRef.current = state.board;
  }

  const renderBoard =
    stateBoardHasGaps && lastRenderableBoardRef.current.length > 0
      ? lastRenderableBoardRef.current
      : state.board;

  useLayoutEffect(() => {
    if (!state.board.length || state.isGameOver || !stateBoardHasGaps) {
      return;
    }

    repairCurrentBoard();
  }, [repairCurrentBoard, state.board, state.isGameOver, stateBoardHasGaps]);

  useEffect(() => {
    const handleFirstPointer = () => {
      // Try to create/resume AudioContext on first user gesture.
      // Pass force=true so it will create/resume even if sound is currently disabled,
      // avoiding the browser restriction about resume needing a user gesture.
      try {
        ensureAudioContext(true);
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener("pointerdown", handleFirstPointer, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstPointer);
    };
  }, [ensureAudioContext]);

  useEffect(() => {
    resetGame(state.modeKey, state.difficultyKey, state.customBoardSize, { seedInput: state.seedInput, seedMode: state.seedMode });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.history?.replaceState !== "function") {
      return;
    }

    const nextUrl = buildChallengeShareUrl({
      modeKey: state.modeKey,
      difficultyKey: state.difficultyKey,
      customBoardSize: state.customBoardSize,
      activeSeedCode: state.activeSeedCode,
    });

    if (nextUrl && nextUrl !== window.location.href) {
      window.history.replaceState({}, "", nextUrl);
    }
  }, [state.activeSeedCode, state.customBoardSize, state.difficultyKey, state.modeKey]);

  useEffect(() => {
    if (!state.shareModalOpen || typeof window === "undefined") {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeShareModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeShareModal, state.shareModalOpen]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const currentState = gameRef.current;
      if (currentState.isGameOver) {
        return;
      }

      let nextState = currentState;
      const now = Date.now();
      let changed = false;

      if (currentState.modeKey === "classic") {
        const nextTimeLeft = Math.max(0, currentState.timeLeft - 0.1);
        if (nextTimeLeft !== currentState.timeLeft) {
          nextState = {
            ...nextState,
            timeLeft: nextTimeLeft,
          };
          changed = true;
        }

        if (nextTimeLeft <= 0) {
          actionVersionRef.current += 1;
          if (!gameRef.current.suppressGameOverUntilReset) {
            applyState(buildGameOverState({ ...nextState, timeLeft: 0 }, "timeout"));
            playSound("gameover");
          }
          return;
        }
      }

      if (currentState.feverActiveUntil !== 0 && currentState.feverActiveUntil <= now) {
        nextState = {
          ...nextState,
          feverActiveUntil: 0,
          feverCharge: 0,
          statusText: "狂热结束，继续攒能量吧！",
        };
        changed = true;
      }

      if (changed) {
        applyState(nextState);
      }
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [applyState, buildGameOverState, playSound]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  return {
    state,
    renderBoard,
    refs: {
      boardRef,
      boardFrameRef,
      particleLayerRef,
    },
    actions: {
      clickCell,
      clearPreview,
      handleBoardLeave,
      previewCell,
      resetGame,
      showHint,
      applySeedInput,
      closeShareModal,
      copyChallengeCode,
      copyChallengeLink,
      shareChallengeLink,
      shareChallengeViaSystem,
      shuffleBoard,
      switchBoardSize,
      switchDifficulty,
      switchMode,
      toggleSound,
      updateSeedInput,
      useDailySeed,
      useRandomSeed,
      // 请求重启：默认直接执行重置（上层 UI 可覆盖此动作以先弹出确认模态）
      requestRestart: () => resetGameWrapped(),
      closeGameOver: () => {
        applyState((currentState) => ({
          ...currentState,
          isGameOver: false,
          isLocked: false,
          // prevent immediate re-trigger from timers/logic until next reset
          suppressGameOverUntilReset: true,
        }));
      },
    },
    constants: {
      FEVER_DURATION,
      IDLE_STATUS,
    },
    helpers: {
      buildChallengeShareUrl,
      getDifficultyConfig,
      getModeConfig,
      isFeverActive,
    },
  };
}
