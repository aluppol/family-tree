import type { ComponentType, ReactElement } from 'react';
import type { Language } from '../../i18n/languages';
import styles from './LanguageSwitcher.module.scss';

const WIDTH = 30;
const HEIGHT = 20;
const BAND = HEIGHT / 3;
const US_STRIPE = HEIGHT / 13;
const US_CANTON_WIDTH = (WIDTH * 2) / 5;
const US_CANTON_HEIGHT = US_STRIPE * 7;
const STAR_OUTER_RADIUS = (HEIGHT * 0.0616) / 2;
const STAR_INNER_RADIUS = STAR_OUTER_RADIUS * 0.382;
const US_RED = '#b22234';
const US_BLUE = '#3c3b6e';
const RUSSIAN_BLUE = '#0039a6';
const RUSSIAN_RED = '#d52b1e';
const SERBIAN_RED = '#c6363c';
const SERBIAN_BLUE = '#0c4076';
const SERBIAN_GOLD = '#edb92e';
const WHITE = '#ffffff';
const SERBIAN_ARMS_PLACEMENT = `translate(${String((WIDTH * 5) / 14)} 0) scale(${String(WIDTH / 1350)})`;
const SERBIAN_SHIELD = 'M168.75 301.25v274.75c0 45-20 89-50 121s-72 54-118.75 54-88.75-22-118.75-54-50-76-50-121V301.25z';
const SERBIAN_EAGLE =
  'M0 420L-20 410L-45 372L-50 345L-62 335L-78 340L-95 352L-80 362L-68 368L-50 395L-42 420L-80 395L-120 360L-150 335L-148 380L-150 420L-140 460L-148 500L-125 495L-128 530L-105 520L-100 555L-80 540L-60 565L-38 560L-36 600L-60 640L-48 650L-25 615L-40 690L0 670L40 690L25 615L48 650L60 640L36 600L38 560L60 565L80 540L100 555L105 520L128 530L125 495L148 500L140 460L150 420L148 380L150 335L120 360L80 395L42 420L50 395L68 368L80 362L95 352L78 340L62 335L50 345L45 372L20 410Z';
const SERBIAN_CROWN = 'M-4 80h8v12h12v8H4v40H-4v-40h-12v-8h12zM-100 262C-100 190-60 150 0 140c60 10 100 50 100 122zM-101 264.7l6 31h190l6-31-101-5z';
const US_RED_STRIPES = Array.from({ length: 7 }, (_, index) => `M0 ${rounded(index * 2 * US_STRIPE)}h${String(WIDTH)}v${rounded(US_STRIPE)}H0z`).join('');
const US_STARS = starCentres()
  .map(([centreX, centreY]) => starPath(centreX, centreY))
  .join('');

const FLAGS: Readonly<Record<Language, ComponentType>> = { en: UsFlag, ru: RussianFlag, sr: SerbianFlag };

export function LanguageFlag({ language }: { language: Language }): ReactElement {
  const Flag = FLAGS[language];
  return <Flag />;
}

function UsFlag(): ReactElement {
  return (
    <FlagFrame>
      <rect width={WIDTH} height={HEIGHT} fill={WHITE} />
      <path d={US_RED_STRIPES} fill={US_RED} />
      <rect width={US_CANTON_WIDTH} height={US_CANTON_HEIGHT} fill={US_BLUE} />
      <path d={US_STARS} fill={WHITE} />
    </FlagFrame>
  );
}

function RussianFlag(): ReactElement {
  return (
    <FlagFrame>
      <rect width={WIDTH} height={BAND} fill={WHITE} />
      <rect y={BAND} width={WIDTH} height={BAND} fill={RUSSIAN_BLUE} />
      <rect y={2 * BAND} width={WIDTH} height={BAND} fill={RUSSIAN_RED} />
    </FlagFrame>
  );
}

function SerbianFlag(): ReactElement {
  return (
    <FlagFrame>
      <rect width={WIDTH} height={BAND} fill={SERBIAN_RED} />
      <rect y={BAND} width={WIDTH} height={BAND} fill={SERBIAN_BLUE} />
      <rect y={2 * BAND} width={WIDTH} height={BAND} fill={WHITE} />
      <g transform={SERBIAN_ARMS_PLACEMENT}>
        <path d={SERBIAN_CROWN} fill={SERBIAN_GOLD} />
        <path d={SERBIAN_SHIELD} fill={SERBIAN_RED} stroke={WHITE} strokeWidth={8} />
        <path d={SERBIAN_EAGLE} fill={WHITE} />
      </g>
    </FlagFrame>
  );
}

function FlagFrame({ children }: { children: ReactElement[] }): ReactElement {
  return (
    <svg className={styles.flag} viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function starCentres(): (readonly [number, number])[] {
  const rows = Array.from({ length: 9 }, (_, index) => index + 1);
  const columns = Array.from({ length: 11 }, (_, index) => index + 1);
  return rows.flatMap((row) => columns.filter((column) => column % 2 === row % 2).map((column) => [(column * US_CANTON_WIDTH) / 12, (row * US_CANTON_HEIGHT) / 10] as const));
}

function starPath(centreX: number, centreY: number): string {
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? STAR_OUTER_RADIUS : STAR_INNER_RADIUS;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return `${rounded(centreX + radius * Math.cos(angle))} ${rounded(centreY + radius * Math.sin(angle))}`;
  });
  return `M${points.join('L')}Z`;
}

function rounded(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}
