import React from "react";
import { DIFFICULTIES, MODES, keyOf } from "../gameCore";
import { cx } from "./helpers";
import { BoardCell } from "./components/BoardCell";
import { DifficultyButton, GuideStep, MeterBlock, ModeButton, SizeButton, TipCard } from "./components/basic";

export function MinimalHeaderSection({ actions, boardLabel, difficulty, mode, onOpenGuide, onOpenMenu, state }) {
  return (
    <header className="minimal-header">
      <div className="header-main">
        <div className="header-copy">
          <h1 className="minimal-title">箭阵！消消消</h1>
          <p className="header-slogan">一笔成链，越绕越爽</p>
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
          <button className="icon-btn" type="button" onClick={onOpenMenu} aria-label="打开玩法与设置">
            ☰
          </button>
        </div>
      </div>
      <div className="header-badges">
        <span className="meta-chip strong">{mode.name}</span>
        <span className="meta-chip">{difficulty.label}</span>
        <span className="meta-chip">{boardLabel}</span>
      </div>
    </header>
  );
}

export function MissionControlSection({ feverText, feverWidth, levelValue, missionText, progressText, resourceLabel, resourceValue, scoreText, state }) {
  return (
    <section className="mission-panel">
      <div className="mission-primary">
        <span className="mission-label">当前目标</span>
        <strong className="mission-value">{missionText}</strong>
      </div>

      <div className="live-strip">
        <div className="live-pill">
          <span>总分</span>
          <strong>{scoreText}</strong>
        </div>
        <div className="live-pill">
          <span>阶段</span>
          <strong>{levelValue}</strong>
        </div>
        <div className="live-pill">
          <span>{resourceLabel}</span>
          <strong>{resourceValue}</strong>
        </div>
      </div>

      <MeterBlock label="进度" value={progressText} fillClassName="stage-fill" width={state.targetScore ? (state.stageScore / state.targetScore) * 100 : 0} />
      <MeterBlock label="狂热" value={feverText} fillClassName="fever-fill" width={feverWidth} />
    </section>
  );
}

export function CompactRulesSection({ onOpenGuide, requiredLength }: { onOpenGuide: () => void; requiredLength: number }) {
  return (
    <section className="compact-rules">
      <div className="rule-pill-row">
        <span className="rule-pill">点任意格子</span>
        <span className="rule-pill">看数字顺序</span>
        <span className="rule-pill accent">满 {requiredLength} 格消除</span>
      </div>
      <button className="secondary-btn learn-btn" type="button" onClick={onOpenGuide}>怎么玩？</button>
    </section>
  );
}

export function BattleBoardSection({
  actions,
  board,
  boardLabel,
  boardStyle,
  clearingKeys,
  difficulty,
  disabled,
  endlessMode,
  feverActive,
  mode,
  previewKeys,
  previewOrderMap,
  refs,
  state,
}: any) {
  const boardStatusLabel =
    state.isLocked
      ? "结算中"
      : feverActive
        ? "狂热中"
        : state.previewChain.length
          ? state.previewValid
            ? "可消除"
            : "预览"
          : "战况";

  return (
    <section className="board-panel board-panel-minimal">
      <div className="board-head minimal-board-head">
        <div>
          <h2 id="board-title">当前棋盘</h2>
        </div>
        <span id="fever-badge" className={cx("fever-badge", feverActive && "active")} aria-hidden={!feverActive}>狂热</span>
      </div>

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
                previewValid={state.previewValid}
                clearingKeys={clearingKeys}
                disabled={disabled}
                onPreview={() => actions.previewCell(rowIndex, colIndex)}
                onClick={() => actions.clickCell(rowIndex, colIndex)}
              />
            )),
          )}
        </div>
        <div ref={refs.particleLayerRef} className="particle-layer" aria-hidden="true" />
      </div>

      <section className="board-status-shell" aria-live="polite">
        <span className={cx("board-status-badge", feverActive && "fever", state.previewChain.length && state.previewValid && "success", state.previewChain.length && !state.previewValid && "preview")}>
          {boardStatusLabel}
        </span>
        <p id="status-text" className="board-status-text">{state.statusText}</p>
      </section>
    </section>
  );
}

export function StickyActionBarSection({ actions, disabled, onOpenChallenge, onOpenMenu }: any) {
  return (
    <section className="sticky-action-bar">
      <div className="sticky-action-grid">
        <button
          id="hint-btn"
          className="secondary-btn"
          type="button"
          onClick={() => { if (typeof actions.showHint === "function") actions.showHint(); }}
          disabled={disabled}
        >提示</button>

        <button id="shuffle-btn" className="primary-btn" type="button" onClick={actions.shuffleBoard} disabled={disabled}>重组</button>

        <button
          id="restart-btn"
          className="secondary-btn"
          type="button"
          onClick={() => { if (typeof actions.requestRestart === "function") { actions.requestRestart(); } else if (typeof actions.resetGame === "function") { actions.resetGame(); } }}
          disabled={disabled}
        >重新开局</button>

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
              <h2>玩法与设置</h2>
              <p className="drawer-desc">想看规则、换难度、开挑战，都在这里。</p>
            </div>
            <button className="icon-btn" type="button" onClick={onClose} aria-label="关闭抽屉">✕</button>
          </div>

          <div className="drawer-tabs">
            <button className={cx("drawer-tab", activePanel === "guide" && "active")} type="button" onClick={() => onSelectPanel("guide")}>玩法</button>
            <button className={cx("drawer-tab", activePanel === "settings" && "active")} type="button" onClick={() => onSelectPanel("settings")}>设置</button>
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

export function GameOverModal({ open, score, onRequestRestart, onShare, onClose }: { open: boolean; score: number; onRequestRestart: () => void; onShare: () => void; onClose: () => void }) {
  if (!open) return null;

  return (
    <>
      <div className="starter-backdrop" />
      <section className="starter-overlay" role="dialog" aria-modal="true" aria-label="局终态">
        <div className="starter-card">
          <h2>时间到！</h2>
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
          <span className="difficulty-desc">{`${difficulty.label} · ${boardLabel}：${difficulty.desc}`}</span>
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

export function ChallengeDrawerSection({ actions, canApplySeedInput, endlessMode, seedModeLabel, state }: any) {
  if (!endlessMode) {
    return (
      <section className="seed-panel">
        <div className="difficulty-head">
          <strong>挑战码只在无尽模式开放</strong>
          <span className="difficulty-desc">想反复挑战同一盘面、发二维码给朋友或玩每日挑战，就切到无尽模式。</span>
        </div>
        <div className="seed-actions">
          <button className="secondary-btn seed-btn" type="button" onClick={() => actions.switchMode("endless")}>切到无尽模式</button>
        </div>
      </section>
    );
  }

  return (
    <div className="drawer-stack">
      <section className="seed-panel">
        <div className="seed-head">
          <div className="difficulty-head">
            <strong>挑战种子</strong>
            <span className="difficulty-desc">同一码 + 同难度 + 同尺寸 = 同一盘面，适合练同一题。</span>
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
          <button className="secondary-btn seed-btn share-btn" type="button" onClick={actions.copyChallengeCode}>复制挑战码</button>
          <button className="secondary-btn seed-btn share-btn" type="button" onClick={actions.copyChallengeLink}>复制链接</button>
          <button className="secondary-btn seed-btn share-btn" type="button" onClick={actions.shareChallengeLink}>二维码分享</button>
        </div>
      </section>
    </div>
  );
}

export function GuideDrawerSection({ boardLabel, difficulty, endlessMode, mode, requiredLength }) {
  return (
    <div className="drawer-stack">
      <div className="guide-steps">
        <GuideStep key="1" index="1" title="点一个起点" text="不是自己拉线，也不是凑三个相同图案。" />
        <GuideStep key="2" index="2" title="系统会自动前进" text="它会沿箭头一直走到出界，或撞到已走过的格子形成闭环。" />
        <GuideStep
          key="3"
          index="3"
          title={`够 ${requiredLength} 格就会消除`}
          text={
            endlessMode
              ? `当前 ${difficulty.label} · ${boardLabel}，没有时间和步数限制。`
              : `当前 ${difficulty.label} · ${boardLabel}，目标和资源会随难度变化。`
          }
        />
      </div>

      <div className="tips-grid">
        <TipCard key="how" title="这一局的重点" text={mode.tips} />
        <TipCard
          key="difficulty"
          title="这局先盯住什么"
          text={`优先找长链和闭环。当前难度下，普通状态至少 ${difficulty.baseClearLength} 格，狂热状态至少 ${difficulty.feverClearLength} 格。`}
          emphasis
        />
      </div>
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
              <strong>1. 点任意格子</strong>
              <p>它只是起点。</p>
            </div>
            <div className="starter-step">
              <strong>2. 看数字顺序</strong>
              <p>系统会自动沿箭头走。</p>
            </div>
            <div className="starter-step">
              <strong>{`3. 满 ${requiredLength} 格就消除`}</strong>
              <p>走出边界或闭环后再结算。</p>
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
