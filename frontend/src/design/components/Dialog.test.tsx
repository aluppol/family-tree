import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, useState } from 'react';
import { expect, test, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from './Dialog';
import { DialogFormActions } from './DialogFormActions';

function DialogOpener(): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { setIsOpen(true); }}>
        Add parent
      </button>
      <Dialog isOpen={isOpen} title="Add a parent" onClose={() => { setIsOpen(false); }}>
        <label>
          Person
          <input />
        </label>
      </Dialog>
    </>
  );
}

test('a closed dialog renders nothing', () => {
  render(<DialogOpener />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('an open dialog is a modal labelled by its title', async () => {
  render(<DialogOpener />);
  await userEvent.click(screen.getByRole('button', { name: 'Add parent' }));
  const dialog = screen.getByRole('dialog', { name: 'Add a parent' });
  expect(dialog).toHaveAttribute('open');
  expect(screen.getByRole('textbox', { name: 'Person' })).toBeInTheDocument();
});

test('Escape closes the dialog and focus returns to the button that opened it', async () => {
  render(<DialogOpener />);
  const opener = screen.getByRole('button', { name: 'Add parent' });
  await userEvent.click(opener);
  await userEvent.click(screen.getByRole('textbox', { name: 'Person' }));
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

test('the close button closes the dialog', async () => {
  render(<DialogOpener />);
  await userEvent.click(screen.getByRole('button', { name: 'Add parent' }));
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('ConfirmDialog confirms and cancels', async () => {
  const handleConfirm = vi.fn();
  const handleCancel = vi.fn();
  render(
    <ConfirmDialog isOpen title="Delete Emma Wedgwood?" confirmLabel="Delete person" onConfirm={handleConfirm} onCancel={handleCancel}>
      <p>This cannot be undone.</p>
    </ConfirmDialog>,
  );
  expect(screen.getByRole('dialog', { name: 'Delete Emma Wedgwood?' })).toHaveTextContent('This cannot be undone.');
  await userEvent.click(screen.getByRole('button', { name: 'Delete person' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(handleConfirm).toHaveBeenCalledOnce();
  expect(handleCancel).toHaveBeenCalledOnce();
});

test('ConfirmDialog ignores a second confirmation while pending and shows the failure', async () => {
  const handleConfirm = vi.fn();
  const failure = new ApiError(400, { code: 'kinship.cycle', message: 'That would make a person their own ancestor.', fields: {} });
  render(
    <ConfirmDialog isOpen isPending title="Remove link?" confirmLabel="Remove link" onConfirm={handleConfirm} onCancel={vi.fn()} error={failure}>
      <p>Both people stay.</p>
    </ConfirmDialog>,
  );
  const confirmButton = screen.getByRole('button', { name: 'Working…' });
  expect(confirmButton).toHaveAttribute('aria-disabled', 'true');
  await userEvent.click(confirmButton);
  expect(handleConfirm).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('That would make a person their own ancestor.');
});

test('DialogFormActions submits the surrounding form and cancels', async () => {
  const handleSubmit = vi.fn((event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
  });
  const handleCancel = vi.fn();
  render(
    <form onSubmit={handleSubmit}>
      <DialogFormActions submitLabel="Save" pendingLabel="Saving…" isPending={false} onCancel={handleCancel} />
    </form>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(handleSubmit).toHaveBeenCalledOnce();
  expect(handleCancel).toHaveBeenCalledOnce();
});
