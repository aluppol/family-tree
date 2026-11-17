import { Color } from 'three';
import type { NodeTone } from '../layout/towerTypes';

export interface ScenePalette {
  readonly background: Color;
  readonly ring: Color;
  readonly edge: Color;
  readonly gold: Color;
  readonly trunk: Color;
  readonly marriedIn: Color;
  readonly other: Color;
  readonly lines: readonly Color[];
}

const TOKEN_FALLBACKS = {
  '--color-canvas': '#faf7f2',
  '--color-tower-ring': '#c9bfae',
  '--color-tower-edge': '#a89f94',
  '--color-tower-gold': '#a8733a',
  '--color-tower-trunk': '#52514e',
  '--color-tower-married-in': '#8f877d',
  '--color-tower-other': '#b9ad99',
} as const;

const LINE_FALLBACKS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'] as const;

type ColorToken = keyof typeof TOKEN_FALLBACKS;

export function readPalette(element: Element): ScenePalette {
  const style = getComputedStyle(element);
  const tokenColor = (token: ColorToken): Color => new Color(style.getPropertyValue(token).trim() || TOKEN_FALLBACKS[token]);
  return {
    background: tokenColor('--color-canvas'),
    ring: tokenColor('--color-tower-ring'),
    edge: tokenColor('--color-tower-edge'),
    gold: tokenColor('--color-tower-gold'),
    trunk: tokenColor('--color-tower-trunk'),
    marriedIn: tokenColor('--color-tower-married-in'),
    other: tokenColor('--color-tower-other'),
    lines: LINE_FALLBACKS.map((fallback, position) => new Color(style.getPropertyValue(`--color-tower-line-${String(position + 1)}`).trim() || fallback)),
  };
}

export function toneColor(palette: ScenePalette, tone: NodeTone): Color {
  switch (tone.kind) {
    case 'line':
      return palette.lines[tone.lineIndex] ?? palette.other;
    case 'trunk':
      return palette.trunk;
    case 'married-in':
      return palette.marriedIn;
    case 'other':
      return palette.other;
  }
}

export function fadedTowardBackground(color: Color, palette: ScenePalette, amount: number): Color {
  return color.clone().lerp(palette.background, amount);
}
