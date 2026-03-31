import React from "react";
import { DIFFICULTIES, MODES, keyOf } from "../gameCore";
import { cx } from "./helpers";
import { BoardCell } from "./components/BoardCell";
import { DifficultyButton, GuideStep, MeterBlock, ModeButton, SizeButton, TipCard } from "./components/basic";

export function MinimalHeaderSection({ actions, boardLabel, difficulty, installAction, mode, onOpenGuide, state }) {
  return (
    <header className="minimal-header">
      <div className="header-main">
        <div className="header-copy">
          <h1 className="minimal-title">箭指极境</h1>
          <p className="header-slogan">无限风光在极境，直抵终点方大成！</p>
        </div>
        <div className="header-actions">
          <button className="icon-btn subtle-help-btn" type="button" onClick={onOpenGuide} aria-label="查看玩法说明">
            ?
          </button>
          <button
            id="sound-btn"
            className={cx("icon-btn", state.soundEnabled && "active")}
            type="button"
            onClick={actions.toggleSound}
            aria-label={state.soundEnabled ? "关闭音效" : "打开音效"}
          >
            {state.soundEnabled ? "🔊" : "🔈"}
          </button>
        </div>
      </div>
      <div className="header-badges">
        <div className="header-chip-cluster">
          <span className="meta-chip strong">{mode.name}</span>
          <span className="meta-chip">{difficulty.label}</span>
          <span className="meta-chip">{boardLabel}</span>
        </div>
        {installAction ? (
          <button className="meta-chip install-chip-btn" type="button" onClick={installAction.onClick}>
            {installAction.label}
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function ChallengeBriefSection({
  feverText,
  feverWidth,
  progressText,
  state,
}) {
  return (
    <section className="challenge-brief">
      <div className="challenge-meter-grid">
        <MeterBlock label="极境进度" value={progressText} fillClassName="stage-fill" width={state.targetScore ? (state.stageScore / state.targetScore) * 100 : 0} />
        <MeterBlock label="狂热" value={feverText} fillClassName="fever-fill" width={feverWidth} />
      </div>
    </section>
  );
}

export function CompactRulesSection({ onOpenGuide, requiredLength }: { onOpenGuide: () => void; requiredLength: number }) {
  return (
    <section className="compact-rules">
      <div className="rule-pill-row">
        <span className="rule-pill">先找起点</span>
        <span className="rule-pill">按箭头走</span>
        <span className="rule-pill accent">{`至少 ${requiredLength} 格，最好直取上限`}</span>
      </div>
      <button className="secondary-btn learn-btn" type="button" onClick={onOpenGuide}>怎么玩？</button>
    </section>
  );
}

export function BattleBoardSection({
  actions,
  board,
  boardTimerText,
  boardStyle,
  clearingKeys,
  clearingOrderMap,
  difficulty,
  disabled,
  endlessMode,
  feverActive,
  levelValue,
  mode,
  currentPathKey,
  previewKeys,
  previewOrderMap,
  refs,
  state,
}: any) {
  const boardStatusLabel =
    state.isGameOver
      ? "本局结束"
      : state.isLocked
      ? "庆祝中"
      : state.awaitingStart
        ? "待开局"
      : state.pathInProgress
        ? "寻路中"
        : feverActive
          ? "狂热中"
          : state.previewChain.length
          ? "提示"
            : "待出手";

  return (
    <section className="board-panel board-panel-minimal">
      <div className="board-head minimal-board-head">
        <div className="board-header-copy">
          <span className="board-level-chip">{`当前级别 ${levelValue}`}</span>
          <div className="board-steps" aria-label="挑战步骤">
            <span className="board-step">1. 定起点</span>
            <span className="board-step">2. 连路径</span>
            <span className="board-step">3. 战极限</span>
          </div>
        </div>
        <div className="board-corner-stack">
          <span className={cx("board-timer-chip", state.boardTimeLeft <= 3 && "urgent")}>{`时间 ${boardTimerText}`}</span>
          <span id="fever-badge" className={cx("fever-badge", feverActive && "active")} aria-hidden={!feverActive}>狂热</span>
        </div>
      </div>

      <section className="board-status-shell board-status-shell-top" aria-live="polite">
        <span className={cx("board-status-badge", state.isGameOver && "preview", feverActive && "fever", state.previewChain.length && state.previewValid && "success", state.previewChain.length && !state.previewValid && "preview")}>
          {boardStatusLabel}
        </span>
        <p id="status-text" className="board-status-text">{state.statusText}</p>
      </section>

      <div ref={refs.boardFrameRef} className={cx("board-frame", feverActive && "is-fever")} style={boardStyle}>
        <div ref={refs.boardRef} className="board" style={boardStyle} onMouseLeave={actions.handleBoardLeave}>
          {board.flatMap((row: any[], rowIndex: number) =>
            row.map((cell: any, colIndex: number) => (
              <BoardCell
                key={cell?.id ?? `empty-${rowIndex}-${colIndex}`}
                cell={cell}
                rowIndex={rowIndex}
                colIndex={colIndex}
                previewKeys={previewKeys}
                previewOrder={previewOrderMap.get(keyOf(rowIndex, colIndex))}
                previewStartKey={state.previewStartKey}
                currentPathKey={currentPathKey}
                previewValid={state.previewValid}
                clearingKeys={clearingKeys}
                clearingOrder={clearingOrderMap.get(keyOf(rowIndex, colIndex))}
                disabled={disabled}
                onPreview={() => actions.previewCell(rowIndex, colIndex)}
                onClick={() => actions.clickCell(rowIndex, colIndex)}
              />
            )),
          )}
        </div>
        <div ref={refs.particleLayerRef} className="particle-layer" aria-hidden="true" />
      </div>
    </section>
  );
}

export function StickyActionBarSection({ actions, awaitingStart, disabled, gameOver }: any) {
  const playDisabled = disabled || gameOver || awaitingStart;
  const restartLabel = awaitingStart ? "开始挑战" : "重新开局";
  const handleRestart = awaitingStart
    ? () => { if (typeof actions.startChallenge === "function") actions.startChallenge(); }
    : () => {
        if (typeof actions.requestRestart === "function") {
          actions.requestRestart();
        } else if (typeof actions.resetGame === "function") {
          actions.resetGame();
        }
      };

  return (
    <section className="sticky-action-bar">
      <div className="sticky-action-grid">
        <button
          id="hint-btn"
          className="secondary-btn"
          type="button"
          onClick={() => { if (typeof actions.showHint === "function") actions.showHint(); }}
          disabled={playDisabled}
        >提示</button>

        <button id="shuffle-btn" className="secondary-btn" type="button" onClick={actions.shuffleBoard} disabled={playDisabled}>重组</button>

        <button
          id="restart-btn"
          className="secondary-btn"
          type="button"
          onClick={handleRestart}
          disabled={disabled}
        >{restartLabel}</button>

        <button id="share-btn" className="secondary-btn" type="button" onClick={() => { if (typeof actions.shareChallengeLink === "function") actions.shareChallengeLink(); }}>分享</button>
      </div>
    </section>
  );

}

export function BottomDrawerShellSection({ activePanel, children, onClose, onSelectPanel, open }: any) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prevOverflow || "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button className="drawer-backdrop" type="button" onClick={onClose} aria-label="关闭抽屉" />
      <section className="bottom-drawer" role="dialog" aria-modal="true">
        <div className="drawer-sheet">
          <div className="drawer-handle" />
          <div className="drawer-head">
            <div>
              <h2>玩法与挑战</h2>
              <p className="drawer-desc">先懂规则，再去挑战极境。</p>
            </div>
            <button className="icon-btn" type="button" onClick={onClose} aria-label="关闭抽屉">✕</button>
          </div>

          <div className="drawer-tabs">
            <button className={cx("drawer-tab", activePanel === "guide" && "active")} type="button" onClick={() => onSelectPanel("guide")}>玩法</button>
            <button className={cx("drawer-tab", activePanel === "challenge" && "active")} type="button" onClick={() => onSelectPanel("challenge")}>挑战</button>
          </div>

          <div className="drawer-body">{children}</div>
        </div>
      </section>
    </>
  );
}

export function ConfirmRestartModal({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;

  return (
    <>
      <div className="starter-backdrop" />
      <section className="starter-overlay" role="dialog" aria-modal="true" aria-label="确认重新开局">
        <div className="starter-card">
          <h2>确认重新开局？</h2>
          <p>当前进度将会丢失，是否确认重新开始本局？</p>
          <div className="starter-actions">
            <button className="secondary-btn" type="button" onClick={onCancel}>取消</button>
            <button className="primary-btn" type="button" onClick={onConfirm}>确认重新开局</button>
          </div>
        </div>
      </section>
    </>
  );
}

export function GameOverModal({ message, open, score, title, onRequestRestart, onShare, onClose }: { message: string; open: boolean; score: number; title: string; onRequestRestart: () => void; onShare: () => void; onClose: () => void }) {
  if (!open) return null;

  return (
    <>
      <div className="starter-backdrop" />
      <section className="starter-overlay" role="dialog" aria-modal="true" aria-label="局终态">
        <div className="starter-card">
          <h2>{title}</h2>
          <p>{message}</p>
          <p>最终得分：{score}</p>
          <div className="starter-actions">
            <button className="secondary-btn" type="button" onClick={onShare}>分享成绩</button>
            <button className="secondary-btn" type="button" onClick={onClose}>返回菜单</button>
            <button className="primary-btn" type="button" onClick={onRequestRestart}>重新开局</button>
          </div>
        </div>
      </section>
    </>
  );
}

export function InstallGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="share-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="share-modal install-guide-modal" role="dialog" aria-modal="true" aria-label="添加到主屏幕说明" onClick={(event) => event.stopPropagation()}>
        <div className="share-modal-head">
          <div>
            <h3>添加到主屏幕</h3>
            <p className="share-modal-desc">在 iPhone 上请用 Safari 打开，然后按下面两步操作。</p>
          </div>
          <button className="icon-btn share-close-btn" type="button" onClick={onClose} aria-label="关闭安装说明">X</button>
        </div>

        <div className="install-guide-steps">
          <article className="install-guide-step">
            <span className="install-guide-index">1</span>
            <p>点 Safari 底部的分享按钮。</p>
          </article>
          <article className="install-guide-step">
            <span className="install-guide-index">2</span>
            <p>选择“添加到主屏幕”，确认后就能像 App 一样打开。</p>
          </article>
        </div>
      </section>
    </div>
  );
}

export function SettingsDrawerSection({ actions, bestScore, boardLabel, difficulty, endlessMode, sizeOptions, state }) {
  return (
    <div className="drawer-stack">
      <div className="drawer-summary-row">
        <span className="meta-chip">最高分 {bestScore.toLocaleString("zh-CN")}</span>
        <span className="meta-chip">{difficulty.label} · {boardLabel}</span>
      </div>

      <section className="difficulty-panel">
        <div className="difficulty-head">
          <strong>模式切换</strong>
          <span className="difficulty-desc">如果只是想继续玩，主界面就够了；换玩法时再来这里。</span>
        </div>
        <div className="mode-switch" role="tablist" aria-label="模式切换">
          {Object.values(MODES).map((item) => (
            <ModeButton key={item.key} modeKey={item.key} active={state.modeKey === item.key} label={item.name} onClick={() => actions.switchMode(item.key)} />
          ))}
        </div>
      </section>

      <section className="difficulty-panel">
        <div className="difficulty-head">
          <strong>难度等级</strong>
          <span className="difficulty-desc">
            {state.modeKey === "classic"
              ? `${difficulty.label}：主线会从 4×4 逐步升到 12×12，难度主要影响容错、提示门槛和重组成本。`
              : `${difficulty.label} · ${boardLabel}：${difficulty.desc}`}
          </span>
        </div>
        <div className="difficulty-switch" role="tablist" aria-label="难度切换">
          {Object.values(DIFFICULTIES).map((item) => (
            <DifficultyButton key={item.key} difficultyKey={item.key} active={state.difficultyKey === item.key} label={item.label} onClick={() => actions.switchDifficulty(item.key)} />
          ))}
        </div>
      </section>

      {endlessMode ? (
        <section className="size-panel">
          <div className="difficulty-head">
            <strong>自定义棋盘</strong>
            <span className="difficulty-desc">无尽模式支持 4×4 到 12×12。尺寸越大，越考验找长链和闭环。</span>
          </div>
          <div className="size-switch" role="tablist" aria-label="棋盘尺寸切换">
            {sizeOptions.map((size: number) => (
              <SizeButton key={String(size)} size={size} active={state.customBoardSize === size} onClick={() => actions.switchBoardSize(size)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ChallengeDrawerSection({ actions, canApplySeedInput, endlessMode, seedModeLabel, shareFeedback, state }: any) {
  const currentModeLabel = endlessMode ? "同盘挑战" : "主线极境";

  if (!endlessMode) {
    return (
      <div className="drawer-stack">
        <section className="difficulty-panel">
          <div className="difficulty-head">
            <strong>挑战模式</strong>
            <span className="difficulty-desc">主线从 4×4 开始，越强的人，越能一路冲进更大的极境。</span>
          </div>
          <div className="mode-switch" role="tablist" aria-label="挑战模式切换">
            <ModeButton key="classic" modeKey="classic" active label="主线极境" onClick={() => actions.switchMode("classic")} />
            <ModeButton key="endless" modeKey="endless" active={false} label="同盘挑战" onClick={() => actions.switchMode("endless")} />
          </div>
        </section>

        <section className="seed-panel">
          <div className="difficulty-head">
            <strong>当前主线</strong>
            <span className="difficulty-desc">一路升级即可。想和朋友解同一盘，切到“同盘挑战”。</span>
          </div>
        </section>
      </div>
    );
  }

  const challengeCodeCopied = shareFeedback?.action === "challengeCode" && shareFeedback?.tone === "success";
  const challengeLinkCopied = shareFeedback?.action === "challengeLink" && shareFeedback?.tone === "success";
  const shareFeedbackActive = shareFeedback?.action === "challengeCode" || shareFeedback?.action === "challengeLink";
  const shareFeedbackClass = shareFeedbackActive ? `share-feedback is-${shareFeedback.tone}` : "share-feedback is-hint";
  const shareFeedbackText = shareFeedbackActive ? shareFeedback.message : "链接适合直接发，挑战码适合当面约战。";

  return (
    <div className="drawer-stack">
      <section className="difficulty-panel">
        <div className="difficulty-head">
          <strong>挑战模式</strong>
          <span className="difficulty-desc">当前是同盘挑战。你可以锁定同一题，反复冲刺更强解法。</span>
        </div>
        <div className="mode-switch" role="tablist" aria-label="挑战模式切换">
          <ModeButton key="classic" modeKey="classic" active={false} label="主线极境" onClick={() => actions.switchMode("classic")} />
          <ModeButton key="endless" modeKey="endless" active label="同盘挑战" onClick={() => actions.switchMode("endless")} />
        </div>
      </section>

      <section className="seed-panel">
        <div className="seed-head">
          <div className="difficulty-head">
            <strong>{currentModeLabel}</strong>
            <span className="difficulty-desc">同一码就是同一盘，适合自己反复练，也适合发给朋友直接对战。</span>
          </div>
          <span className="seed-mode-badge">{seedModeLabel}</span>
        </div>

        <div className="seed-code-grid">
          <article className="seed-code-card">
            <span className="seed-code-label">当前挑战码</span>
            <strong className="seed-code-value">{state.activeSeedCode}</strong>
          </article>
          <article className="seed-code-card">
            <span className="seed-code-label">今日挑战码</span>
            <strong className="seed-code-value">{state.dailyChallengeCode}</strong>
          </article>
        </div>

        <div className="seed-input-row">
          <input
            className="seed-input"
            type="text"
            value={state.seedInput}
            placeholder="输入挑战码或随机种子"
            maxLength={48}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="挑战种子输入"
            onChange={(event) => actions.updateSeedInput((event.target as HTMLInputElement).value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                actions.applySeedInput();
              }
            }}
          />
        </div>

        <div className="seed-actions">
          <button className="secondary-btn seed-btn" type="button" onClick={actions.applySeedInput} disabled={!canApplySeedInput}>应用种子</button>
          <button className="secondary-btn seed-btn" type="button" onClick={actions.useDailySeed}>今日挑战</button>
          <button className="secondary-btn seed-btn" type="button" onClick={actions.useRandomSeed}>随机新盘</button>
        </div>

        <div className="seed-actions share-actions">
          <button className={`secondary-btn seed-btn share-btn${challengeCodeCopied ? " is-copied" : ""}`} type="button" onClick={actions.copyChallengeCode}>
            {challengeCodeCopied ? "已复制 ✓" : "复制挑战码"}
          </button>
          <button className={`secondary-btn seed-btn share-btn${challengeLinkCopied ? " is-copied" : ""}`} type="button" onClick={actions.copyChallengeLink}>
            {challengeLinkCopied ? "已复制 ✓" : "复制链接"}
          </button>
          <button className="secondary-btn seed-btn share-btn" type="button" onClick={actions.shareChallengeLink}>二维码分享</button>
        </div>

        <p className={shareFeedbackClass} role="status" aria-live="polite">{shareFeedbackText}</p>
      </section>
    </div>
  );
}

export function GuideDrawerSection({ boardLabel, difficulty, endlessMode, mode, requiredLength }) {
  return (
    <div className="drawer-stack">
      <div className="guide-steps">
        <GuideStep key="1" index="1" title="定起点" text="一步定生死，选错即重置。" />
        <GuideStep key="2" index="2" title="连路径" text="紧跟箭头，直抵终点，中途不能走偏。" />
        <GuideStep
          key="3"
          index="3"
          title="战极限"
          text={
            endlessMode
              ? `致远方见绝色，极境始获全胜。当前 ${boardLabel} 不限次数重试，专心把最优解打出来。`
              : `致远方见绝色，极境始获全胜。主线会从 4×4 一路升级，越往后越考验你。`
          }
        />
      </div>

      <TipCard
        key="guide-focus"
        title="这一局先看什么"
        text={endlessMode
          ? `先看上限和起点分布，再决定从哪里出手。当前 ${difficulty.label} · ${boardLabel}，找错了会立刻清空这次路线。`
          : `主线会自动升盘。当前 ${difficulty.label} · ${boardLabel}，至少 ${requiredLength} 格才能形成有效路线，但真正过关还是要命中本盘最优。`}
        emphasis
      />
    </div>
  );
}

export function QuickStartOverlaySection({ onDismiss, onOpenGuide, open, requiredLength }) {
  if (!open) {
    return null;
  }
  return (
    <>
      <div className="starter-backdrop" />
      <section className="starter-overlay" role="dialog" aria-modal="true">
        <div className="starter-card">
          <span className="eyebrow">3 秒上手</span>
          <h2>你只需要记住这三步</h2>
          <div className="starter-steps">
            <div className="starter-step">
              <strong>1. 先找最优起点</strong>
              <p>系统只告诉你上限，不会替你走。</p>
            </div>
            <div className="starter-step">
              <strong>2. 按箭头逐格点击</strong>
              <p>每一步都要点到唯一正确的下一格。</p>
            </div>
            <div className="starter-step">
              <strong>3. 必须命中本盘最优</strong>
              <p>{`至少要能走满 ${requiredLength} 格，最后还得打到这一盘的最高长度。`}</p>
            </div>
          </div>
          <div className="starter-actions">
            <button className="primary-btn" type="button" onClick={onDismiss}>开始试玩</button>
            <button className="secondary-btn" type="button" onClick={onOpenGuide}>再看一眼玩法</button>
          </div>
        </div>
      </section>
    </>
  );
}
