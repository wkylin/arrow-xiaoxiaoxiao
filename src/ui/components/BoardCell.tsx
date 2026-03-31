import React from "react";
import { DIRECTIONS, SPECIAL_META, keyOf } from "../../gameCore";
import { cx } from "../helpers";

export interface BoardCellProps {
  cell: any;
  rowIndex: number;
  colIndex: number;
  previewKeys: Set<string>;
  previewOrder?: number | null;
  previewStartKey?: string | null;
  currentPathKey?: string | null;
  previewValid?: boolean;
  clearingKeys: Set<string>;
  clearingOrder?: number | null;
  disabled?: boolean;
  onPreview?: () => void;
  onClick?: () => void;
}

export function BoardCell({
  cell,
  rowIndex,
  colIndex,
  previewKeys,
  previewOrder,
  previewStartKey,
  currentPathKey,
  previewValid,
  clearingKeys,
  clearingOrder,
  disabled,
  onPreview,
  onClick,
}: BoardCellProps) {
  if (!cell) {
    return <div className="cell cell-empty" aria-hidden="true" data-row={String(rowIndex)} data-col={String(colIndex)} />;
  }

  const direction = DIRECTIONS[cell.dir];
  const special = cell.special ? SPECIAL_META[cell.special] : null;
  const cellKey = keyOf(rowIndex, colIndex);
  const isPreviewing = previewKeys.has(cellKey);
  const isClearing = clearingKeys.has(cellKey);
  const isStart = previewStartKey === cellKey;
  const isCurrent = currentPathKey === cellKey;

  const ariaLabel = `${rowIndex + 1}行${colIndex + 1}列，${direction.name}${special ? `，特殊格：${special.name}` : ""}`;

  return (
    <button
      type="button"
      style={isClearing && clearingOrder ? { "--clear-delay": `${Math.max(0, clearingOrder - 1) * 140}ms` } as React.CSSProperties : undefined}
      className={cx(
        "cell",
        direction.key,
        cell.special && `special-${cell.special}`,
        isPreviewing && "preview",
        isPreviewing && !previewValid && "invalid",
        isStart && "start",
        isCurrent && "current",
        isClearing && "clearing",
      )}
      disabled={disabled}
      data-row={String(rowIndex)}
      data-col={String(colIndex)}
      aria-label={ariaLabel}
      onPointerEnter={(event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === "mouse") {
          onPreview && onPreview();
        }
      }}
      onPointerDown={(event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType !== "mouse") {
          onPreview && onPreview();
        }
      }}
      onFocus={onPreview}
      onClick={onClick}
    >
      <span className="cell-arrow">{direction.symbol}</span>
      {previewOrder ? <span className="path-order">{previewOrder}</span> : null}
      {special ? <span className="cell-badge">{special.badge}</span> : null}
    </button>
  );
}
