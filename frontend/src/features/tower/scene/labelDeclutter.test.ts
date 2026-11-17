import { expect, test } from 'vitest';
import { type LabelBox, estimatedLabelSize, visibleLabelKeys } from './labelDeclutter';

function box(key: string, [x, y]: readonly [number, number], isInView = true): LabelBox {
  return { key, x, y, width: 100, height: 20, isInView };
}

test('a label that would cover a more important one is hidden', () => {
  expect([...visibleLabelKeys([box('focus', [100, 100]), box('parent', [150, 105]), box('child', [100, 140])])]).toEqual(['focus', 'child']);
});

test('labels behind the camera are hidden and do not block others', () => {
  expect([...visibleLabelKeys([box('behind', [100, 100], false), box('front', [100, 100])])]).toEqual(['front']);
});

test('the label size grows with the name, the focus label is the largest and a compact one the smallest', () => {
  const plain = estimatedLabelSize('Ana Petrović', 'regular');
  const focus = estimatedLabelSize('Ana Petrović', 'focus');
  const compact = estimatedLabelSize('Ana Petrović', 'compact');
  expect(estimatedLabelSize('Ana', 'regular').width).toBeLessThan(plain.width);
  expect([focus.width > plain.width, focus.height > plain.height]).toEqual([true, true]);
  expect([compact.width < plain.width, compact.height < plain.height]).toEqual([true, true]);
});
