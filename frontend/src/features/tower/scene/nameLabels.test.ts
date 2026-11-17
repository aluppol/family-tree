import { expect, test } from 'vitest';
import { layoutTower } from '../layout/towerLayout';
import { personIdOf, towerGraphOf } from '../testing/towerScript';
import { NameLabels } from './nameLabels';
import type { SceneFocus } from './sceneTypes';

const GRAPH = towerGraphOf({
  people: [['Jovan', 'male', null], ['Petar', 'male', null], ['Ana', 'female', null], ['Luka', 'male', null]],
  parents: [['Jovan', 'Petar'], ['Petar', 'Ana'], ['Jovan', 'Luka']],
});
const LAYOUT = layoutTower(GRAPH);

function focusOn(focus: string, { highlighted, labelled }: { highlighted: readonly string[]; labelled: readonly string[] }): SceneFocus {
  const idsOf = (names: readonly string[]): Set<number> => new Set(names.map((name) => personIdOf(GRAPH, name)));
  return { focusId: personIdOf(GRAPH, focus), highlightedIds: idsOf(highlighted), labelledIds: idsOf(labelled), pathIds: [] };
}

test('the selected person comes first, the close family next, and everyone else gets a compact label', () => {
  const labels = new NameLabels(LAYOUT.nodes);
  labels.show(focusOn('Petar', { highlighted: ['Petar', 'Jovan', 'Ana'], labelled: ['Luka', 'Jovan', 'Ana'] }));
  expect(labels.screenLabels().map((label) => [label.element.textContent, label.kind])).toEqual([
    ['Petar', 'focus'],
    ['Jovan', 'regular'],
    ['Ana', 'regular'],
    ['Luka', 'compact'],
  ]);
});

test('a hovered person without a label is named right after the selected one until the pointer moves on', () => {
  const labels = new NameLabels(LAYOUT.nodes);
  labels.show(focusOn('Petar', { highlighted: ['Petar'], labelled: ['Petar'] }));
  labels.showHover(personIdOf(GRAPH, 'Luka'));
  expect(labels.screenLabels().map((label) => label.element.textContent)).toEqual(['Petar', 'Luka']);
  labels.showHover(personIdOf(GRAPH, 'Petar'));
  expect(labels.screenLabels()).toHaveLength(1);
  labels.dispose();
  expect(labels.group.children).toHaveLength(0);
});
