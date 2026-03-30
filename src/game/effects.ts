import { DIRECTIONS, SPECIAL_META } from "../gameCore";

const SOUND_PATTERNS = {
  clear: [
    [560, 0.05, 0, "triangle", 0.028],
    [760, 0.06, 0.05, "triangle", 0.025],
    [980, 0.08, 0.11, "triangle", 0.022],
  ],
  invalid: [[180, 0.08, 0, "sawtooth", 0.035]],
  shuffle: [
    [270, 0.07, 0, "square", 0.03],
    [210, 0.09, 0.07, "square", 0.025],
  ],
  level: [
    [700, 0.06, 0, "triangle", 0.03],
    [940, 0.08, 0.07, "triangle", 0.028],
    [1180, 0.12, 0.15, "triangle", 0.022],
  ],
  fever: [
    [520, 0.05, 0, "triangle", 0.03],
    [760, 0.06, 0.05, "triangle", 0.028],
    [1020, 0.08, 0.11, "triangle", 0.024],
    [1340, 0.12, 0.18, "triangle", 0.02],
  ],
  gameover: [
    [420, 0.08, 0, "sine", 0.03],
    [310, 0.12, 0.08, "sine", 0.024],
  ],
};

export function ensureAudioContext({ audioContextRef, soundEnabled, force = false }) {
  if (!force && !soundEnabled) {
    return null;
  }

  const legacyWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioCtor = window.AudioContext || legacyWindow.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioCtor();
  }

  if (audioContextRef.current.state === "suspended") {
    audioContextRef.current.resume().catch(() => {});
  }

  return audioContextRef.current;
}

export function playTone(context, frequency, duration, delay = 0, type = "triangle", volume = 0.03) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + delay;
  const endAt = startAt + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

export function playSoundEffect({ audioContextRef, soundEnabled, kind, force = false }) {
  const context = ensureAudioContext({ audioContextRef, soundEnabled, force });
  if (!context) {
    return;
  }

  const pattern = SOUND_PATTERNS[kind];
  if (!pattern) {
    return;
  }

  pattern.forEach(([frequency, duration, delay, type, volume]) => {
    playTone(context, frequency, duration, delay, type, volume);
  });
}

export function scheduleTrackedTimeout({ timeoutIdsRef, callback, delay }) {
  const timeoutId = window.setTimeout(() => {
    timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    callback();
  }, delay);

  timeoutIdsRef.current.push(timeoutId);
}

export function spawnParticleEffect({ particleLayerRef, timeoutIdsRef, x, y, color }) {
  if (!particleLayerRef.current) {
    return;
  }

  const particle = document.createElement("span");
  const dx = `${Math.round((Math.random() - 0.5) * 90)}px`;
  const dy = `${Math.round((Math.random() - 0.5) * 90 - 20)}px`;

  particle.className = "particle";
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  particle.style.color = color;
  particle.style.background = color;
  particle.style.setProperty("--dx", dx);
  particle.style.setProperty("--dy", dy);
  particleLayerRef.current.appendChild(particle);

  scheduleTrackedTimeout({
    timeoutIdsRef,
    callback: () => particle.remove(),
    delay: 760,
  });
}

export function spawnFloatingTextEffect({ particleLayerRef, timeoutIdsRef, text, x, y, tone = "score" }) {
  if (!particleLayerRef.current) {
    return;
  }

  const label = document.createElement("span");
  label.className = `floating-text ${tone}`;
  label.textContent = text;
  label.style.left = `${x}px`;
  label.style.top = `${y}px`;
  particleLayerRef.current.appendChild(label);

  scheduleTrackedTimeout({
    timeoutIdsRef,
    callback: () => label.remove(),
    delay: 920,
  });
}

export function spawnChainParticlesEffect({
  boardSnapshot,
  result,
  gain,
  summary,
  feverTriggered,
  feverActive,
  boardFrameRef,
  boardRef,
  particleLayerRef,
  timeoutIdsRef,
}) {
  if (!boardFrameRef.current || !boardRef.current) {
    return;
  }

  const boardRect = boardFrameRef.current.getBoundingClientRect();
  let totalX = 0;
  let totalY = 0;
  let count = 0;

  result.chain.forEach(({ row, col }) => {
    const cellElement = boardRef.current.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    const cell = boardSnapshot[row][col];
    if (!cellElement || !cell) {
      return;
    }

    const rect = cellElement.getBoundingClientRect();
    const centerX = rect.left - boardRect.left + rect.width / 2;
    const centerY = rect.top - boardRect.top + rect.height / 2;

    totalX += centerX;
    totalY += centerY;
    count += 1;

    const amount = 4 + (cell.special ? 2 : 0);
    const color = cell.special ? SPECIAL_META[cell.special].color : DIRECTIONS[cell.dir].color;

    for (let index = 0; index < amount; index += 1) {
      spawnParticleEffect({ particleLayerRef, timeoutIdsRef, x: centerX, y: centerY, color });
    }
  });

  if (!count) {
    return;
  }

  const centerX = totalX / count;
  const centerY = totalY / count;
  spawnFloatingTextEffect({
    particleLayerRef,
    timeoutIdsRef,
    text: `+${gain}`,
    x: centerX,
    y: centerY,
    tone: feverTriggered || feverActive ? "fever" : "score",
  });

  if (summary.gem) {
    spawnFloatingTextEffect({
      particleLayerRef,
      timeoutIdsRef,
      text: `星钻 +${summary.gem}`,
      x: centerX,
      y: centerY - 24,
      tone: "mission",
    });
  }

  if (feverTriggered) {
    spawnFloatingTextEffect({
      particleLayerRef,
      timeoutIdsRef,
      text: "狂热！",
      x: centerX,
      y: centerY - 48,
      tone: "fever",
    });
  }
}

export function shakeBoardEffect(boardRef) {
  if (!boardRef.current) {
    return;
  }

  boardRef.current.classList.remove("shake");
  void boardRef.current.offsetWidth;
  boardRef.current.classList.add("shake");
}
