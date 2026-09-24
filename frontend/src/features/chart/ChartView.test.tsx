import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChartView } from './ChartView';
import styles from './ChartView.module.scss';
import { layoutHourglass } from './layout/hourglassLayout';
import type { ChartLinks } from './PersonNode';
import { CHARLES_DARWIN_ID, darwinFamilyChart, GEORGE_DARWIN_ID } from './testing/darwinFamily';
import { familyChart } from './testing/familyScript';

const LINKS: ChartLinks = {
  profile: (personId) => `/people/${String(personId)}`,
  tree: (personId) => `/tree/${String(personId)}`,
};

const CHART_LABEL = 'Family tree of Charles Robert Darwin';

const ADOPTION = familyChart({
  focus: 'Ann',
  people: [
    ['Ann', 'female', 1950],
    ['Cara', 'female', 1975],
    ['Dan', 'male', 1980],
  ],
  parents: [
    ['Ann', 'Cara'],
    ['Ann', 'Dan', 'adopted'],
  ],
});

describe('ChartView people', () => {
  it('draws every person as a link to their profile, named with their life years', () => {
    renderChart(CHARLES_DARWIN_ID);
    expect(screen.getByRole('link', { name: 'Charles Robert Darwin, 1809–1882' })).toHaveAttribute('href', '/people/1');
    expect(screen.getByRole('link', { name: 'Emma Wedgwood, 1808–1896' })).toHaveAttribute('href', '/people/2');
    expect(screen.getAllByRole('link', { name: /, \d{4}–\d{4}/ })).toHaveLength(25);
  });

  it('writes given names and surname on separate lines and truncates long names', () => {
    renderChart(CHARLES_DARWIN_ID);
    const bernard = screen.getByRole('link', { name: 'Bernard Richard Meirion Darwin, 1876–1961' });
    expect(within(bernard).getByText('Bernard Richar…')).toBeInTheDocument();
    expect(within(bernard).getByText('Darwin', { selector: 'text' })).toBeInTheDocument();
    expect(within(bernard).getByText('1876–1961')).toBeInTheDocument();
    expect(within(bernard).getByText('Bernard Richard Meirion Darwin', { selector: 'title' })).toBeInTheDocument();
  });

  it('marks the focus person as the current one', () => {
    renderChart(CHARLES_DARWIN_ID);
    expect(screen.getByRole('link', { name: 'Charles Robert Darwin, 1809–1882' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Emma Wedgwood, 1808–1896' })).not.toHaveAttribute('aria-current');
  });
});

describe('ChartView repeats and photos', () => {
  it('draws a person reached twice once more and says so', () => {
    renderChart(GEORGE_DARWIN_ID);
    const josiahs = screen.getAllByRole('link', { name: /^Josiah Wedgwood, 1730–1795/ });
    expect(josiahs.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Josiah Wedgwood, 1730–1795',
      'Josiah Wedgwood, 1730–1795, also shown elsewhere in this tree',
    ]);
  });

  it('shows the photo of a person who has one and falls back to initials when it fails to load', () => {
    renderChart(CHARLES_DARWIN_ID);
    const charles = screen.getByRole('link', { name: 'Charles Robert Darwin, 1809–1882' });
    const photo = charles.querySelector('image');
    expect(photo).toHaveAttribute('href', '/api/people/1/photo/');
    fireEvent.error(photo ?? charles);
    expect(charles.querySelector('image')).toBeNull();
    expect(within(charles).getByText('CD')).toBeInTheDocument();
  });
});

describe('ChartView lines', () => {
  it('dashes the line to an adopted child and keeps birth lines solid', () => {
    render(<ChartView layout={layoutHourglass(ADOPTION)} label={CHART_LABEL} links={LINKS} onNavigate={vi.fn()} />);
    const canvas = screen.getByRole('group', { name: CHART_LABEL });
    expect(canvas.getElementsByClassName(styles.parentage ?? '')).toHaveLength(2);
    expect(canvas.getElementsByClassName(styles.dashed ?? '')).toHaveLength(1);
  });

  it('draws an empty chart when the layout has nobody in it', () => {
    const emptyLayout = { nodes: [], edges: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
    render(<ChartView layout={emptyLayout} label={CHART_LABEL} links={LINKS} onNavigate={vi.fn()} />);
    expect(within(screen.getByRole('group', { name: CHART_LABEL })).queryAllByRole('link')).toEqual([]);
  });
});

describe('ChartView navigation', () => {
  it('opens a profile when a person is clicked', () => {
    const { onNavigate } = renderChart(CHARLES_DARWIN_ID);
    fireEvent.click(screen.getByRole('link', { name: 'Emma Wedgwood, 1808–1896' }));
    expect(onNavigate).toHaveBeenCalledWith('/people/2');
  });

  it('leaves clicks with a modifier key to the browser', () => {
    const { onNavigate } = renderChart(CHARLES_DARWIN_ID);
    const emma = screen.getByRole('link', { name: 'Emma Wedgwood, 1808–1896' });
    fireEvent.click(emma, { ctrlKey: true });
    fireEvent.click(emma, { button: 1 });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('opens a profile with Enter or Space', async () => {
    const { user, onNavigate } = renderChart(CHARLES_DARWIN_ID);
    screen.getByRole('link', { name: 'Emma Wedgwood, 1808–1896' }).focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.keyboard('a');
    expect(onNavigate.mock.calls).toEqual([['/people/2'], ['/people/2']]);
  });

  it('centres the tree on another person but not on the focus person', () => {
    const { onNavigate } = renderChart(CHARLES_DARWIN_ID);
    fireEvent.click(screen.getByRole('link', { name: 'Centre the tree on Emma Wedgwood' }));
    expect(onNavigate).toHaveBeenCalledWith('/tree/2');
    expect(screen.queryByRole('link', { name: 'Centre the tree on Charles Robert Darwin' })).not.toBeInTheDocument();
  });
});

describe('ChartView zoom', () => {
  it('opens at a readable scale and zooms in, out and to fit with labelled buttons', async () => {
    const { user } = renderChart(CHARLES_DARWIN_ID);
    expect(sceneScale()).toBe(0.75);
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(sceneScale()).toBeCloseTo(1.05);
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(sceneScale()).toBeCloseTo(0.75);
    await user.click(screen.getByRole('button', { name: 'Fit the tree to the screen' }));
    expect(sceneScale()).toBe(0.02);
  });
});

describe('ChartView keyboard focus', () => {
  it('puts the zoom buttons first in the tab order and brings a person into view when the keyboard reaches them', async () => {
    const { user } = renderChart(CHARLES_DARWIN_ID);
    const openingTransform = sceneTransform();
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName('Zoom in');
    await user.tab();
    await user.tab();
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName('Erasmus Darwin, 1731–1802');
    expect(sceneTransform()).not.toBe(openingTransform);
  });

  it('keeps the view still when a person is focused with the pointer', () => {
    renderChart(CHARLES_DARWIN_ID);
    const openingTransform = sceneTransform();
    fireEvent.focusIn(screen.getByRole('link', { name: 'Erasmus Darwin, 1731–1802' }));
    expect(sceneTransform()).toBe(openingTransform);
  });
});

describe('ChartView legend', () => {
  it('explains the line styles and the repeat marker', () => {
    renderChart(CHARLES_DARWIN_ID);
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(within(legend).getAllByRole('listitem').map((entry) => entry.textContent)).toEqual([
      'Birth parent',
      'Adoptive, foster or other parent',
      'Appears more than once in this tree',
    ]);
  });
});

function renderChart(focusId: number): { user: ReturnType<typeof userEvent.setup>; onNavigate: ReturnType<typeof vi.fn> } {
  const onNavigate = vi.fn();
  render(<ChartView layout={layoutHourglass(darwinFamilyChart(focusId))} label={CHART_LABEL} links={LINKS} onNavigate={onNavigate} />);
  return { user: userEvent.setup(), onNavigate };
}

function sceneTransform(): string {
  return screen.getByRole('group', { name: CHART_LABEL }).querySelector(':scope > g')?.getAttribute('transform') ?? '';
}

function sceneScale(): number {
  return Number(/scale\(([^)]+)\)/.exec(sceneTransform())?.[1]);
}
