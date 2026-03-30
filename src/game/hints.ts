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
      previewValid: false,
      statusText: manual
        ? "这盘暂时没找到特别直观的长链，试试换个起点，或者点“重组箭阵”。"
        : currentState.statusText,
    };
  }

  const orderText = formatHintOrder(hint.result);
  const extra = hint.result.loop ? " 这条链还会绕成闭环。" : "";

  return {
    ...currentState,
    previewChain: hint.result.chain,
    previewStartKey: keyOf(hint.row, hint.col),
    previewValid: hint.result.valid,
    statusText: manual
      ? `提示：先点这个发光起点，系统会按 ${orderText} 的数字顺序自动走；只要满 ${hint.result.requiredLength} 格就会消除。${extra}`
      : `先试试发光起点：看格子里的数字 ${orderText}，这就是自动前进的顺序；满 ${hint.result.requiredLength} 格就能消除。`,
  };
}
