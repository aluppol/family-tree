import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { markPhotoRevised } from '../../api/photos';
import { Avatar, type AvatarPerson } from './Avatar';

const EMMA: AvatarPerson = { id: 2, given_names: 'Emma', surname: 'Wedgwood', sex: 'female', has_photo: false };

test('a person without a photo is shown by initials that assistive technology skips', () => {
  const { container } = render(<Avatar person={EMMA} />);
  expect(container).toHaveTextContent('EW');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('initials can carry an accessible name', () => {
  render(<Avatar person={EMMA} alt="Emma Wedgwood" />);
  expect(screen.getByRole('img', { name: 'Emma Wedgwood' })).toHaveTextContent('EW');
});

test('a nameless person shows a question mark', () => {
  const { container } = render(<Avatar person={{ ...EMMA, given_names: ' ', surname: '' }} />);
  expect(container).toHaveTextContent('?');
});

test('a person with a photo shows it from the photo endpoint', () => {
  render(<Avatar person={{ ...EMMA, id: 70, has_photo: true }} alt="Emma Wedgwood" size="huge" />);
  expect(screen.getByRole('img', { name: 'Emma Wedgwood' })).toHaveAttribute('src', '/api/people/70/photo/');
});

test('a photo that fails to load falls back to initials', () => {
  const { container } = render(<Avatar person={{ ...EMMA, id: 71, has_photo: true }} />);
  const photo = container.querySelector('img');
  expect(photo).not.toBeNull();
  if (photo !== null) {
    fireEvent.error(photo);
  }
  expect(container.querySelector('img')).toBeNull();
  expect(container).toHaveTextContent('EW');
});

test('a changed photo gets a new address so the browser does not reuse the old one', () => {
  render(<Avatar person={{ ...EMMA, id: 72, has_photo: true }} alt="Emma Wedgwood" />);
  act(() => {
    markPhotoRevised(72);
  });
  expect(screen.getByRole('img', { name: 'Emma Wedgwood' })).toHaveAttribute('src', '/api/people/72/photo/?revision=1');
});
