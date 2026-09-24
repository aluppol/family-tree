import { render, screen } from '@testing-library/react';
import { createRef, type ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { ShellView } from './ShellView';

function shellWhile({ isNavigating }: { isNavigating: boolean }): ReactElement {
  return (
    <MemoryRouter>
      <ShellView
        viewerName="Demo Visitor"
        isSandbox={false}
        menu={{ pathname: '/', isOpen: false, onToggle: () => undefined, onNavigate: () => undefined }}
        menuButtonRef={createRef<HTMLButtonElement>()}
        mainRef={createRef<HTMLElement>()}
        isNavigating={isNavigating}
      >
        <p>Page</p>
      </ShellView>
    </MemoryRouter>
  );
}

test('a page change in progress shows a progress bar and marks the main region busy', () => {
  render(shellWhile({ isNavigating: true }));
  expect(screen.getByRole('progressbar', { name: 'Loading the page' })).toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
});

test('an idle page shows no progress bar', () => {
  render(shellWhile({ isNavigating: false }));
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false');
});
