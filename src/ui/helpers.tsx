import React from "react";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatSeconds(value: number) {
  return `${Math.max(0, value).toFixed(1)}s`;
}

export function formatNumber(value: number) {
  return Number(value).toLocaleString("zh-CN");
}

export function formatSeedModeLabel(seedMode: string) {
  if (seedMode === "daily") {
    return "今日挑战";
  }

  if (seedMode === "manual") {
    return "手动种子";
  }

  return "随机新盘";
}

export function getBoardMetrics(boardSize: number) {
  if (boardSize <= 4) {
    return {
      "--board-size": String(boardSize),
      "--board-frame-padding": "12px",
      "--cell-gap": "10px",
      "--cell-radius": "20px",
      "--cell-font-size": "clamp(28px, 8vw, 36px)",
      "--path-order-size": "24px",
      "--path-order-font-size": "11px",
      "--path-order-offset": "8px",
      "--path-order-padding": "6px",
      "--badge-size": "22px",
      "--badge-font-size": "11px",
      "--badge-offset": "8px",
      "--badge-padding": "5px",
      "--cell-outline-width": "3px",
    } as Record<string, string>;
  }

  if (boardSize <= 5) {
    return {
      "--board-size": String(boardSize),
      "--board-frame-padding": "11px",
      "--cell-gap": "8px",
      "--cell-radius": "18px",
      "--cell-font-size": "clamp(24px, 7vw, 34px)",
      "--path-order-size": "22px",
      "--path-order-font-size": "11px",
      "--path-order-offset": "7px",
      "--path-order-padding": "6px",
      "--badge-size": "20px",
      "--badge-font-size": "11px",
      "--badge-offset": "7px",
      "--badge-padding": "5px",
      "--cell-outline-width": "3px",
    } as Record<string, string>;
  }

  if (boardSize <= 7) {
    return {
      "--board-size": String(boardSize),
      "--board-frame-padding": "10px",
      "--cell-gap": "7px",
      "--cell-radius": "16px",
      "--cell-font-size": "clamp(22px, 6vw, 30px)",
      "--path-order-size": "20px",
      "--path-order-font-size": "10px",
      "--path-order-offset": "6px",
      "--path-order-padding": "5px",
      "--badge-size": "18px",
      "--badge-font-size": "10px",
      "--badge-offset": "6px",
      "--badge-padding": "4px",
      "--cell-outline-width": "3px",
    } as Record<string, string>;
  }

  if (boardSize <= 8) {
    return {
      "--board-size": String(boardSize),
      "--board-frame-padding": "9px",
      "--cell-gap": "6px",
      "--cell-radius": "14px",
      "--cell-font-size": "clamp(19px, 5.2vw, 26px)",
      "--path-order-size": "18px",
      "--path-order-font-size": "9px",
      "--path-order-offset": "5px",
      "--path-order-padding": "4px",
      "--badge-size": "17px",
      "--badge-font-size": "9px",
      "--badge-offset": "5px",
      "--badge-padding": "4px",
      "--cell-outline-width": "2px",
    } as Record<string, string>;
  }

  return {
    "--board-size": String(boardSize),
    "--board-frame-padding": "7px",
    "--cell-gap": "3px",
    "--cell-radius": "10px",
    "--cell-font-size": "clamp(14px, 4vw, 18px)",
    "--path-order-size": "15px",
    "--path-order-font-size": "8px",
    "--path-order-offset": "3px",
    "--path-order-padding": "3px",
    "--badge-size": "14px",
    "--badge-font-size": "8px",
    "--badge-offset": "3px",
    "--badge-padding": "3px",
    "--cell-outline-width": "2px",
  } as Record<string, string>;
}

export type JSXStyle = Record<string, string>;

// helpers are named exports — no default export required
