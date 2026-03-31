import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DIRECTIONS,
  FEVER_DURATION,
  analyzeBoardPaths,
  buildRandomBoard,
  ensurePlayableBoard,
  getBestScoreKey,
  getChain,
  getDifficultyConfig,
  getMoveLimit,
  getNextPathStep,
  getModeConfig,
  getRequiredClearLength,
  hasMetStageGoal,
  isFeverActive,
  keyOf,
  repairBoard,
} from "./gameCore";
import { getClassicChallengeLevelMeta, getLengthRangeDistance, resolveBoardSizeForRun } from "./game/challengeProgression";
import {
  buildGameOverStateForReason,
  buildLevelUpStateFromState,
  resolveSuccessfulClear,
} from "./game/clearResolution";
import {
  ensureAudioContext as ensureAudioContextRef,
  playSoundEffect,
  shakeBoardEffect,
  spawnChainParticlesEffect,
  spawnStatusBurstEffect,
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
import { applyBoardChallengeState, buildBoardIntroStatus } from "./game/pathChallenge";
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

const STEP_CHEERS = [
  "起步不错，继续沿箭头走。",
  "这步很稳，路线开始成形了。",
  "不错，离最优越来越近。",
  "节奏对了，别手滑。",
  "快到了，再盯紧最后几步。",
];

const FAILURE_LINES = [
  "继续努力，这盘还能再解得更漂亮。",
  "差一点，再看清全盘就能拿下。",
  "这条路不够长，换个起点再冲一次。",
];

function getStepStatus(currentLength, targetLength) {
  const progressIndex = Math.min(STEP_CHEERS.length - 1, Math.max(0, currentLength - 1));
  return `${STEP_CHEERS[progressIndex]} 当前 ${currentLength}/${targetLength}。`;
}

function getFailureStatus(actualLength, targetLength, prefix) {
  const suffix = FAILURE_LINES[(actualLength + targetLength) % FAILURE_LINES.length];
  return `${prefix} 你走到了 ${actualLength} 格，本盘最优是 ${targetLength} 格。${suffix}`;
}

function getFailureBurstText(actualLength, targetLength) {
  if (actualLength + 1 >= targetLength) {
    return "差一点";
  }

  if (actualLength <= 1) {
    return "再想想";
  }

  return "继续努力";
}

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
  const lastGameOverRef = useRef(state.isGameOver);

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
    const resolvedBoardSize = resolveBoardSizeForRun({
      modeKey,
      level,
      difficultyKey,
      customBoardSize: boardSizeOverride,
    });
    const classicMeta = modeKey === "classic" ? getClassicChallengeLevelMeta(level) : null;
    const maxAttempts = classicMeta ? 80 : 1;
    const requiredLength = getDifficultyConfig(difficultyKey).baseClearLength;
    let bestCandidate = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const initialBoard = buildRandomBoard({
        modeKey,
        level,
        difficultyKey,
        boardSizeOverride: resolvedBoardSize,
        nextId: nextIdRef.current,
        random: nextRandom,
      });
      const playableBoard = ensurePlayableBoard({
        board: initialBoard.board,
        modeKey,
        level,
        missionGoal,
        missionCollected,
        difficultyKey,
        boardSizeOverride: resolvedBoardSize,
        nextId: initialBoard.nextId,
        random: nextRandom,
      });

      if (!classicMeta) {
        nextIdRef.current = playableBoard.nextId;
        return playableBoard.board;
      }

      const analysis = analyzeBoardPaths(playableBoard.board, requiredLength);
      const distance = getLengthRangeDistance(analysis.bestLength, classicMeta.targetMin, classicMeta.targetMax);
      const candidate = {
        board: playableBoard.board,
        nextId: playableBoard.nextId,
        distance,
        bestLength: analysis.bestLength,
      };

      if (!bestCandidate || candidate.distance < bestCandidate.distance || (
        candidate.distance === bestCandidate.distance
        && Math.abs(classicMeta.targetMax - candidate.bestLength) < Math.abs(classicMeta.targetMax - bestCandidate.bestLength)
      )) {
        bestCandidate = candidate;
      }

      if (distance === 0) {
        nextIdRef.current = playableBoard.nextId;
        return playableBoard.board;
      }
    }

    nextIdRef.current = bestCandidate?.nextId ?? nextIdRef.current;
    return bestCandidate?.board ?? [];
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

      const activeBoardSize = resolveBoardSizeForRun({
        modeKey: currentState.modeKey,
        level: currentState.level,
        difficultyKey: currentState.difficultyKey,
        customBoardSize: getActiveBoardSize(currentState.modeKey, currentState.customBoardSize),
      });
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
      applyState((liveState) => applyBoardChallengeState({
        ...liveState,
        board: repaired.board,
        isLocked: false,
        statusText,
      }, statusText));
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

  const spawnStatusBurst = useCallback(
    ({ row = null, col = null, subtext = "", text, tone = "mission" }) => {
      spawnStatusBurstEffect({
        boardFrameRef,
        boardRef,
        particleLayerRef,
        timeoutIdsRef,
        row,
        col,
        text,
        subtext,
        tone,
      });
    },
    [],
  );

  useEffect(() => {
    if (!lastGameOverRef.current && state.isGameOver) {
      spawnStatusBurst({
        text: state.gameOverTitle ?? "本局结束",
        subtext: state.gameOverTitle === "时间到了" ? "准备好就重新开局" : "点击重新开局",
        tone: "failure",
      });
    }

    lastGameOverRef.current = state.isGameOver;
  }, [spawnStatusBurst, state.gameOverTitle, state.isGameOver]);

  const buildGameOverState = useCallback(
    (currentState, reason, options = {}) => buildGameOverStateForReason({ currentState, reason, persistBestScores, ...options }),
    [persistBestScores],
  );

  const shakeBoard = useCallback(() => {
    shakeBoardEffect(boardRef);
  }, []);

  const clearPreview = useCallback(
    (statusText = null) => {
      applyState((currentState) => (currentState.pathInProgress
        ? currentState
        : {
            ...currentState,
            previewChain: [],
            previewStartKey: null,
            previewValid: true,
            currentPathKey: null,
            expectedNextKey: null,
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
    (
      modeKeyOverride = null,
      difficultyKeyOverride = null,
      customBoardSizeOverride = null,
      seedOverrides = null,
      runtimeOptions = {},
    ) => {
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
        awaitingStart: runtimeOptions.awaitingStart ?? false,
      });

      applyState(nextState);
    },
    [applyState, buildRunState],
  );

  const requestRestart = useCallback(() => {
    actionVersionRef.current += 1;
    const currentState = gameRef.current;
    const activeBoardSize = resolveBoardSizeForRun({
      modeKey: currentState.modeKey,
      level: currentState.level,
      difficultyKey: currentState.difficultyKey,
      customBoardSize: getActiveBoardSize(currentState.modeKey, currentState.customBoardSize),
    });
    const board = makeFreshBoard(
      currentState.modeKey,
      currentState.level,
      currentState.missionGoal,
      0,
      currentState.difficultyKey,
      activeBoardSize,
    );

    const nextState = applyBoardChallengeState({
      ...currentState,
      board,
      awaitingStart: false,
      missionCollected: 0,
      movesLeft: currentState.modeKey === "rush" ? getMoveLimit(currentState.level, currentState.difficultyKey) : 0,
      combo: 1,
      lastClearAt: 0,
      timeLeft: 0,
      feverCharge: 0,
      feverActiveUntil: 0,
      isLocked: false,
      isGameOver: false,
      suppressGameOverUntilReset: false,
      gameOverTitle: null,
    });

    applyState(nextState);
    spawnStatusBurst({
      text: "挑战已开始",
      subtext: "这次要更努力了",
      tone: "mission",
    });
  }, [applyState, makeFreshBoard, spawnStatusBurst]);

  const startChallenge = useCallback(() => {
    const currentState = gameRef.current;
    if (!currentState.awaitingStart || currentState.isLocked || currentState.isGameOver || !currentState.board.length) {
      return;
    }

    applyState({
      ...currentState,
      awaitingStart: false,
      boardTimeLeft: currentState.boardTimeLimit,
      previewChain: [],
      previewStartKey: null,
      previewValid: true,
      pathInProgress: false,
      currentPathKey: null,
      expectedNextKey: null,
      statusText: buildBoardIntroStatus({
        modeKey: currentState.modeKey,
        pathTargetLength: currentState.pathTargetLength,
        pathTargetStarts: currentState.pathTargetStarts,
      }),
    });
  }, [applyState]);

  const commitSetupInstruction = useCallback(
    (instruction) => {
      if (!instruction) {
        return;
      }

      const currentState = gameRef.current;
      commitStorageEntries(instruction.storageEntries);

      if (instruction.resetOptions) {
        resetGame(
          instruction.resetOptions.modeKeyOverride,
          instruction.resetOptions.difficultyKeyOverride,
          instruction.resetOptions.customBoardSizeOverride,
          instruction.resetOptions.seedOverrides,
          { awaitingStart: currentState.awaitingStart },
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
    if (currentState.awaitingStart || currentState.isLocked || currentState.isGameOver) {
      return;
    }

    if (currentState.pathInProgress) {
      updateChallengeStatus(`已经走到 ${currentState.previewChain.length}/${currentState.pathTargetLength}，继续沿最后一个箭头往下找。`);
      return;
    }

    applyState(createHintState(currentState, true));
  }, [applyState, updateChallengeStatus]);

  const handleBoardLeave = useCallback(() => {}, []);

  const previewCell = useCallback(() => {}, []);

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

  const failCurrentPath = useCallback(
    (currentState, message, row = null, col = null) => {
      applyState({
        ...currentState,
        combo: 1,
        previewChain: [],
        previewStartKey: null,
        previewValid: true,
        clearingKeys: [],
        pathInProgress: false,
        currentPathKey: null,
        expectedNextKey: null,
        statusText: message,
      });
      playSound("invalid");
      shakeBoard();
      spawnStatusBurst({
        row,
        col,
        text: getFailureBurstText(currentState.previewChain.length, currentState.pathTargetLength),
        subtext: "换条路再试",
        tone: "failure",
      });
    },
    [applyState, playSound, shakeBoard, spawnStatusBurst],
  );

  const clickCell = useCallback(
    (row, col) => {
      const currentState = gameRef.current;
      if (currentState.awaitingStart || currentState.isLocked || currentState.isGameOver) {
        return;
      }

      if (!currentState.board[row]?.[col]) {
        repairCurrentBoard();
        return;
      }

      const cellKey = keyOf(row, col);

      if (!currentState.pathInProgress || !currentState.previewChain.length) {
        const nextPath = [{ row, col }];
        const nextStep = getNextPathStep(currentState.board, nextPath);
        const startResult = getChain(currentState.board, row, col, getRequiredClearLength(currentState));

        if (!nextStep) {
          if (startResult.chain.length >= currentState.pathTargetLength) {
            handleSuccessfulClear(startResult);
            return;
          }

          failCurrentPath(
            currentState,
            getFailureStatus(
              startResult.chain.length,
              currentState.pathTargetLength,
              "这条路线一出手就走到头了。",
            ),
            row,
            col,
          );
          return;
        }

        applyState({
          ...currentState,
          previewChain: nextPath,
          previewStartKey: cellKey,
          previewValid: true,
          pathInProgress: true,
          currentPathKey: cellKey,
          expectedNextKey: keyOf(nextStep.row, nextStep.col),
          statusText: getStepStatus(1, currentState.pathTargetLength),
        });
        playSound("clear");
        return;
      }

      if (currentState.expectedNextKey !== cellKey) {
        const currentStep = currentState.previewChain[currentState.previewChain.length - 1];
        const currentCell = currentState.board[currentStep.row]?.[currentStep.col];
        const directionName = currentCell ? DIRECTIONS[currentCell.dir].name : "箭头方向";

        failCurrentPath(
          currentState,
          getFailureStatus(
            currentState.previewChain.length,
            currentState.pathTargetLength,
            `走偏了，上一格的 ${directionName} 没有把你带到这里。`,
          ),
          row,
          col,
        );
        return;
      }

      const nextPath = [...currentState.previewChain, { row, col }];
      const nextStep = getNextPathStep(currentState.board, nextPath);

      if (nextStep) {
        applyState({
          ...currentState,
          previewChain: nextPath,
          previewValid: true,
          pathInProgress: true,
          currentPathKey: cellKey,
          expectedNextKey: keyOf(nextStep.row, nextStep.col),
          statusText: getStepStatus(nextPath.length, currentState.pathTargetLength),
        });
        playSound("clear");
        return;
      }

      const start = nextPath[0];
      const result = getChain(currentState.board, start.row, start.col, getRequiredClearLength(currentState));
      if (result.chain.length < currentState.pathTargetLength) {
        failCurrentPath(
          {
            ...currentState,
            previewChain: nextPath,
            previewStartKey: keyOf(start.row, start.col),
            currentPathKey: cellKey,
            expectedNextKey: null,
          },
          getFailureStatus(
            result.chain.length,
            currentState.pathTargetLength,
            result.loop ? "这条路虽然绕成了闭环，但还不是本盘上限。" : "这条路已经走到尽头，但长度还不够。",
          ),
          row,
          col,
        );
        return;
      }

      handleSuccessfulClear(result);
    },
    [applyState, failCurrentPath, handleSuccessfulClear, playSound, repairCurrentBoard],
  );

  const shuffleBoard = useCallback(() => {
    const currentState = gameRef.current;
    if (currentState.awaitingStart || currentState.isLocked || currentState.isGameOver) {
      return;
    }

    const difficulty = getDifficultyConfig(currentState.difficultyKey);
    const activeBoardSize = resolveBoardSizeForRun({
      modeKey: currentState.modeKey,
      level: currentState.level,
      difficultyKey: currentState.difficultyKey,
      customBoardSize: getActiveBoardSize(currentState.modeKey, currentState.customBoardSize),
    });
    actionVersionRef.current += 1;

    const board = makeFreshBoard(
      currentState.modeKey,
      currentState.level,
      currentState.missionGoal,
      currentState.missionCollected,
      currentState.difficultyKey,
      activeBoardSize,
    );
    const shuffleStatus =
      currentState.modeKey === "classic"
        ? `箭阵已重组，扣除 ${difficulty.shuffleScorePenalty} 分与 ${difficulty.classicShuffleCost} 秒。`
        : currentState.modeKey === "rush"
          ? `箭阵已重组，扣除 ${difficulty.shuffleScorePenalty} 分与 ${difficulty.rushShuffleCost} 步。`
          : `箭阵已重组，扣除 ${difficulty.shuffleScorePenalty} 分。`;

    let nextState = applyBoardChallengeState({
      ...currentState,
      board,
      combo: 1,
      score: Math.max(0, currentState.score - difficulty.shuffleScorePenalty),
      timeLeft: 0,
      movesLeft:
        currentState.modeKey === "rush"
          ? Math.max(0, currentState.movesLeft - difficulty.rushShuffleCost)
          : currentState.movesLeft,
    }, shuffleStatus);

    if (nextState.modeKey === "classic") {
      nextState = {
        ...nextState,
        boardTimeLeft: Math.max(0, currentState.boardTimeLeft - difficulty.classicShuffleCost),
      };
    }

    if (nextState.modeKey === "classic" && nextState.boardTimeLeft <= 0) {
      if (!gameRef.current.suppressGameOverUntilReset) {
        nextState = buildGameOverState({ ...nextState, boardTimeLeft: 0 }, "timeout");
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
    resetGame(
      state.modeKey,
      state.difficultyKey,
      state.customBoardSize,
      { seedInput: state.seedInput, seedMode: state.seedMode },
      { awaitingStart: true },
    );
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

      if (!currentState.isLocked && !currentState.awaitingStart) {
        const nextBoardTimeLeft = Math.max(0, currentState.boardTimeLeft - 0.1);
        if (nextBoardTimeLeft !== currentState.boardTimeLeft) {
          nextState = {
            ...nextState,
            boardTimeLeft: nextBoardTimeLeft,
          };
          changed = true;
        }

        if (nextBoardTimeLeft <= 0) {
          actionVersionRef.current += 1;
          if (!gameRef.current.suppressGameOverUntilReset) {
            applyState(buildGameOverState({ ...currentState, boardTimeLeft: 0 }, "timeout"));
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
      startChallenge,
      switchBoardSize,
      switchDifficulty,
      switchMode,
      toggleSound,
      updateSeedInput,
      useDailySeed,
      useRandomSeed,
      requestRestart,
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
