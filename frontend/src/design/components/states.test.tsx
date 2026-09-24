import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { ClientRejection } from '../../api/errorKind';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { InlineError } from './InlineError';
import { LoadingState } from './LoadingState';

function apiError(status: number, message = 'The server says no.'): ApiError {
  return new ApiError(status, { code: `test.${String(status)}`, message, fields: {} });
}

test('LoadingState is a status with a hidden label', () => {
  render(<LoadingState label="Loading people…" />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading people…');
});

test('LoadingState has a default label', () => {
  render(<LoadingState />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading…');
});

test('an ended session offers to sign in again with a full page load', () => {
  render(<ErrorState error={apiError(401)} />);
  expect(screen.getByRole('heading', { name: 'Your session has ended' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/');
});

test('a missing resource uses not-found wording and the server message', () => {
  render(<ErrorState error={apiError(404, 'Person 99 does not exist.')} titleLevel={1} />);
  expect(screen.getByRole('heading', { level: 1, name: 'Not found' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Person 99 does not exist.');
  expect(screen.getByRole('link', { name: 'Go to your family tree' })).toHaveAttribute('href', '/');
});

test.each([0, 500, 503])('status %i means the server cannot be reached and offers a retry', async (status) => {
  const handleRetry = vi.fn();
  render(<ErrorState error={apiError(status)} onRetry={handleRetry} />);
  expect(screen.getByRole('heading', { name: 'Cannot reach the server' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(handleRetry).toHaveBeenCalledOnce();
});

test('other client errors show the server message without a retry', () => {
  render(<ErrorState error={apiError(400, 'That date does not exist.')} onRetry={vi.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('That date does not exist.');
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
});

test('a forbidden request says the viewer has no access', () => {
  render(<ErrorState error={apiError(403, 'You have no Family Tree role.')} />);
  expect(screen.getByRole('heading', { name: 'You do not have access' })).toBeInTheDocument();
});

test('an unexpected error hides its internals and offers a retry', () => {
  render(<ErrorState error={new TypeError('undefined is not a function')} onRetry={vi.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Something unexpected went wrong. Please try again.');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});

test('EmptyState shows its title, explanation and actions', () => {
  render(
    <EmptyState title="No people yet" actions={<button type="button">Add person</button>}>
      <p>Add the first person.</p>
    </EmptyState>,
  );
  expect(screen.getByRole('heading', { level: 2, name: 'No people yet' })).toBeInTheDocument();
  expect(screen.getByText('Add the first person.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add person' })).toBeInTheDocument();
});

test('InlineError renders nothing without an error', () => {
  const { container } = render(<InlineError error={null} />);
  expect(container).toBeEmptyDOMElement();
});

test('InlineError announces the server message', () => {
  render(<InlineError error={apiError(400, 'Robert Darwin is already a parent of Charles Darwin.')} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Robert Darwin is already a parent of Charles Darwin.');
});

test('InlineError shows client rejections as they are', () => {
  render(<InlineError error={new ClientRejection('This file is not a photo we can read.')} />);
  expect(screen.getByRole('alert')).toHaveTextContent('This file is not a photo we can read.');
});

test('InlineError offers to sign in again when the session ended', () => {
  render(<InlineError error={apiError(401)} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Your session has ended.');
  expect(screen.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/');
});
