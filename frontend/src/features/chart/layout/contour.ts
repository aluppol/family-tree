export interface Extent {
  readonly left: number;
  readonly right: number;
}

export interface Contour {
  readonly left: readonly number[];
  readonly right: readonly number[];
}

export interface OffsetContour {
  readonly contour: Contour;
  readonly offset: number;
}

export function contourOf(row: Extent, beyond: readonly OffsetContour[]): Contour {
  const merged = mergeContours(beyond);
  return { left: [row.left, ...merged.left], right: [row.right, ...merged.right] };
}

export function mergeContours(placed: readonly OffsetContour[]): Contour {
  const left: number[] = [];
  const right: number[] = [];
  for (const { contour, offset } of placed) {
    contour.left.forEach((edge, level) => {
      left[level] = Math.min(left[level] ?? Number.POSITIVE_INFINITY, edge + offset);
    });
    contour.right.forEach((edge, level) => {
      right[level] = Math.max(right[level] ?? Number.NEGATIVE_INFINITY, edge + offset);
    });
  }
  return { left, right };
}

export function mirrorContour(contour: Contour): Contour {
  return {
    left: contour.right.map((edge) => -edge),
    right: contour.left.map((edge) => -edge),
  };
}
