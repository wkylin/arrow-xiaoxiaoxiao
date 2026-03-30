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
  previewValid?: boolean;
  clearingKeys: Set<string>;
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
  previewValid,
  clearingKeys,
  disabled,
  onPreview,
  onClick,
}: BoardCellProps) {
  const direction = DIRECTIONS[cell.dir];
  const special = cell.special ? SPECIAL_META[cell.special] : null;
  const cellKey = keyOf(rowIndex, colIndex);
  const isPreviewing = previewKeys.has(cellKey);
  const isClearing = clearingKeys.has(cellKey);
  const isStart = previewStartKey === cellKey;

  const ariaLabel = `${rowIndex + 1}行${colIndex + 1}列，${direction.name}${special ? `，特殊格：${special.name}` : ""}`;

  return (
    <button
      type="button"
      className={cx(
        "cell",
        direction.key,
        cell.special && `special-${cell.special}`,
        isPreviewing && "preview",
        isPreviewing && !previewValid && "invalid",
        isStart && "start",
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
