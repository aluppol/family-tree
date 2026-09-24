import { vi } from 'vitest';

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement): void {
  this.open = true;
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement): void {
  this.open = false;
};

Element.prototype.scrollIntoView = vi.fn();

window.scrollTo = vi.fn();

window.matchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: () => false,
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || event.defaultPrevented) {
    return;
  }
  const topmostDialog = [...document.querySelectorAll('dialog')].filter((dialog) => dialog.open).at(-1);
  if (topmostDialog?.dispatchEvent(new Event('cancel', { cancelable: true })) === true) {
    topmostDialog.close();
  }
});
