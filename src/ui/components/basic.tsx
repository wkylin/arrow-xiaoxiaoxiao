import React from "react";
import { cx } from "../helpers";

export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  labelId?: string | null;
}

export function StatCard({ label, value, labelId = null }: StatCardProps) {
  return (
    <article className="stat-card">
      {labelId ? <span id={labelId}>{label}</span> : <span>{label}</span>}
      <strong>{value}</strong>
    </article>
  );
}

export interface ModeButtonProps {
  modeKey: string;
  active?: boolean;
  label: React.ReactNode;
  onClick?: () => void;
}

export function ModeButton({ modeKey, active, label, onClick }: ModeButtonProps) {
  return (
    <button className={cx("mode-btn", active && "active")} type="button" data-mode={modeKey} onClick={onClick}>
      {label}
    </button>
  );
}

export interface DifficultyButtonProps {
  difficultyKey: string;
  active?: boolean;
  label: React.ReactNode;
  onClick?: () => void;
}

export function DifficultyButton({ difficultyKey, active, label, onClick }: DifficultyButtonProps) {
  return (
    <button className={cx("difficulty-btn", active && "active")} type="button" data-difficulty={difficultyKey} onClick={onClick}>
      {label}
    </button>
  );
}

export interface SizeButtonProps {
  size: number;
  active?: boolean;
  onClick?: () => void;
}

export function SizeButton({ size, active, onClick }: SizeButtonProps) {
  return (
    <button className={cx("size-btn", active && "active")} type="button" data-size={String(size)} onClick={onClick}>
      {size}×{size}
    </button>
  );
}

export interface MeterBlockProps {
  label: React.ReactNode;
  value: React.ReactNode;
  fillClassName?: string;
  width: number;
}

export function MeterBlock({ label, value, fillClassName, width }: MeterBlockProps) {
  return (
    <div className="meter-block">
      <div className="meter-label">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="meter-track">
        <div className={cx("meter-fill", fillClassName)} style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
      </div>
    </div>
  );
}

export interface TipCardProps {
  title: React.ReactNode;
  text: React.ReactNode;
  emphasis?: boolean;
}

export function TipCard({ title, text, emphasis = false }: TipCardProps) {
  return (
    <article className={cx("tip-card", emphasis && "emphasis")}>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export interface GuideStepProps {
  index: React.ReactNode;
  title: React.ReactNode;
  text: React.ReactNode;
}

export function GuideStep({ index, title, text }: GuideStepProps) {
  return (
    <article className="guide-step">
      <span className="guide-index">{index}</span>
      <div className="guide-copy">
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}
