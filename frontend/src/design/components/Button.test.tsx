import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, test, vi } from 'vitest';
import { Button, IconButton } from './Button';
import { ButtonAnchor, ButtonLink } from './ButtonLink';
import { Icon } from './Icon';

test('Button is a plain button by default and reports clicks', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Save</Button>);
  const button = screen.getByRole('button', { name: 'Save' });
  expect(button).toHaveAttribute('type', 'button');
  await userEvent.click(button);
  expect(handleClick).toHaveBeenCalledOnce();
});

test('Button can submit a form', () => {
  render(
    <Button type="submit" variant="primary">
      Add person
    </Button>,
  );
  expect(screen.getByRole('button', { name: 'Add person' })).toHaveAttribute('type', 'submit');
});

test('IconButton names itself with its label and hides the icon from assistive technology', () => {
  const { container } = render(<IconButton label="Zoom in" icon={<Icon name="plus" />} />);
  const button = screen.getByRole('button', { name: 'Zoom in' });
  expect(button).toHaveAttribute('title', 'Zoom in');
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('ButtonLink navigates inside the app', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ButtonLink to="/people">Browse people</ButtonLink>} />
        <Route path="/people" element={<h1>People page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('link', { name: 'Browse people' }));
  expect(screen.getByRole('heading', { name: 'People page' })).toBeInTheDocument();
});

test('ButtonAnchor is a plain link for full page loads and downloads', () => {
  render(
    <ButtonAnchor href="/api/gedcom/export/?format=gedzip" download>
      GEDZIP
    </ButtonAnchor>,
  );
  const link = screen.getByRole('link', { name: 'GEDZIP' });
  expect(link).toHaveAttribute('href', '/api/gedcom/export/?format=gedzip');
  expect(link).toHaveAttribute('download');
});
