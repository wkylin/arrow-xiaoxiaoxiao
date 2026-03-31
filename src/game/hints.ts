import { findBestStart, getRequiredClearLength, keyOf } from "../gameCore";

export function sleep(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

export function formatHintOrder(result) {
  const visibleSteps = Math.min(result.chain.length, 4);
  const text = Array.from({ length: visibleSteps }, (_, index) => index + 1).join("→");
  return result.chain.length > visibleSteps ? `${text}…` : text;
}

export function createHintState(currentState, manual = false) {
  const hint = findBestStart(currentState.board, getRequiredClearLength(currentState));
  if (!hint) {
    return {
      ...currentState,
      previewChain: [],
      previewStartKey: null,
      previewValid: true,
      pathInProgress: false,
      currentPathKey: null,
      expectedNextKey: null,
      statusText: manual
        ? "这盘暂时没找到特别直观的长链，试试换个起点，或者点“重组箭阵”。"
        : currentState.statusText,
    };
  }

  const hintChain = hint.result.chain.slice(0, Math.min(2, hint.result.chain.length));
  const handoffCell = hintChain[hintChain.length - 1] ?? null;
  const nextHintCell = hint.result.chain[hintChain.length] ?? null;
  const orderText = formatHintOrder(hint.result);
  const extra = hint.result.loop ? " 这条路尾段会绕成闭环。" : "";

  return {
    ...currentState,
    previewChain: hintChain,
    previewStartKey: keyOf(hint.row, hint.col),
    previewValid: true,
    pathInProgress: Boolean(handoffCell && nextHintCell),
    currentPathKey: handoffCell ? keyOf(handoffCell.row, handoffCell.col) : null,
    expectedNextKey: nextHintCell ? keyOf(nextHintCell.row, nextHintCell.col) : null,
    statusText: manual
      ? `提示：最优路线从这个起点出发，上限 ${hint.result.chain.length} 格。前两步已替你标出，从下一格接着点。${extra}`
      : `先试试这个起点：最优路线一共 ${hint.result.chain.length} 格，前两步是 ${orderText}。`,
  };
}
