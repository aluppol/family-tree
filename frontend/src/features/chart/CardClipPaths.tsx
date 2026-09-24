import { type ReactElement, useId, useMemo } from 'react';
import { AVATAR_CENTRE, AVATAR_RADIUS, CARD_CORNER_RADIUS, TEXT_LEFT, TEXT_WIDTH } from './cardGeometry';
import { CARD_HEIGHT, CARD_WIDTH } from './layout/geometry';

export interface CardClipIds {
  readonly card: string;
  readonly avatar: string;
  readonly text: string;
}

export function useCardClipIds(): CardClipIds {
  const baseId = `chart${useId().replace(/[^\w-]/g, '')}`;
  return useMemo(() => ({ card: `${baseId}-card`, avatar: `${baseId}-avatar`, text: `${baseId}-text` }), [baseId]);
}

export function CardClipPaths({ ids }: { ids: CardClipIds }): ReactElement {
  return (
    <defs>
      <clipPath id={ids.card}>
        <rect width={CARD_WIDTH} height={CARD_HEIGHT} rx={CARD_CORNER_RADIUS} />
      </clipPath>
      <clipPath id={ids.avatar}>
        <circle cx={AVATAR_CENTRE.x} cy={AVATAR_CENTRE.y} r={AVATAR_RADIUS} />
      </clipPath>
      <clipPath id={ids.text}>
        <rect x={TEXT_LEFT} width={TEXT_WIDTH} height={CARD_HEIGHT} />
      </clipPath>
    </defs>
  );
}
