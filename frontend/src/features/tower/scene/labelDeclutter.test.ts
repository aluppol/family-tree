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

test('the label size grows with the name and the focus label is larger', () => {
  const plain = estimatedLabelSize('Ana Petrović', false);
  const focus = estimatedLabelSize('Ana Petrović', true);
  expect(estimatedLabelSize('Ana', false).width).toBeLessThan(plain.width);
  expect(focus.width).toBeGreaterThan(plain.width);
  expect(focus.height).toBeGreaterThan(plain.height);
});
