import { type ActionDispatch, type ChangeEvent, type KeyboardEvent, type ReactNode, useEffect, useReducer } from 'react';

export interface ComboboxOption {
  id: string | number;
  label: string;
  description?: string;
  leading?: ReactNode;
}

type OptionId = ComboboxOption['id'];

export interface ComboboxInputHandlers {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onClick: () => void;
  onBlur: () => void;
}

export interface ComboboxBehaviour<Option extends ComboboxOption> {
  isOpen: boolean;
  activeOptionId: OptionId | null;
  activeOptionElementId: string | undefined;
  optionElementId: (option: Option) => string;
  choose: (option: Option) => void;
  inputHandlers: ComboboxInputHandlers;
}

export interface ComboboxBehaviourInput<Option extends ComboboxOption> {
  listboxId: string;
  query: string;
  options: readonly Option[];
  onQueryChange: (query: string) => void;
  onSelect: (option: Option) => void;
}

interface ComboboxState {
  isOpen: boolean;
  activeOptionId: OptionId | null;
}

type ComboboxAction =
  | { type: 'typed' | 'opened' | 'closed' }
  | { type: 'moved'; step: 1 | -1; optionIds: readonly OptionId[] };

interface ComboboxContext<Option extends ComboboxOption> extends ComboboxBehaviourInput<Option> {
  state: ComboboxState;
  dispatch: ActionDispatch<[ComboboxAction]>;
  activeOption: Option | undefined;
}

const CLOSED: ComboboxState = { isOpen: false, activeOptionId: null };

export function useComboboxBehaviour<Option extends ComboboxOption>(input: ComboboxBehaviourInput<Option>): ComboboxBehaviour<Option> {
  const [state, dispatch] = useReducer(comboboxReducer, CLOSED);
  const activeOption = state.isOpen ? input.options.find((option) => option.id === state.activeOptionId) : undefined;
  const context: ComboboxContext<Option> = { ...input, state, dispatch, activeOption };
  const activeOptionElementId = activeOption === undefined ? undefined : optionElementId(input.listboxId, activeOption);
  useScrollIntoView(activeOptionElementId);
  return {
    isOpen: state.isOpen,
    activeOptionId: activeOption?.id ?? null,
    activeOptionElementId,
    optionElementId: (option) => optionElementId(input.listboxId, option),
    choose: (option) => {
      choose(context, option);
    },
    inputHandlers: inputHandlers(context),
  };
}

function comboboxReducer(state: ComboboxState, action: ComboboxAction): ComboboxState {
  switch (action.type) {
    case 'typed':
      return { isOpen: true, activeOptionId: null };
    case 'opened':
      return { ...state, isOpen: true };
    case 'closed':
      return CLOSED;
    case 'moved':
      return { isOpen: true, activeOptionId: nextOptionId(state.activeOptionId, action.step, action.optionIds) };
  }
}

function nextOptionId(currentId: OptionId | null, step: 1 | -1, optionIds: readonly OptionId[]): OptionId | null {
  const currentIndex = currentId === null ? -1 : optionIds.indexOf(currentId);
  const startIndex = step === 1 ? -1 : optionIds.length;
  const fromIndex = currentIndex === -1 ? startIndex : currentIndex;
  return optionIds.at((fromIndex + step) % Math.max(optionIds.length, 1)) ?? null;
}

function inputHandlers<Option extends ComboboxOption>(context: ComboboxContext<Option>): ComboboxInputHandlers {
  return {
    onChange: (event) => {
      context.dispatch({ type: 'typed' });
      context.onQueryChange(event.target.value);
    },
    onKeyDown: (event) => {
      respondToKey(context, event);
    },
    onClick: () => {
      context.dispatch({ type: 'opened' });
    },
    onBlur: () => {
      context.dispatch({ type: 'closed' });
    },
  };
}

function respondToKey<Option extends ComboboxOption>(context: ComboboxContext<Option>, event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const optionIds = context.options.map((option) => option.id);
    context.dispatch({ type: 'moved', step: event.key === 'ArrowDown' ? 1 : -1, optionIds });
  } else if (event.key === 'Enter' && context.activeOption !== undefined) {
    event.preventDefault();
    choose(context, context.activeOption);
  } else if (event.key === 'Escape') {
    respondToEscape(context, event);
  }
}

function respondToEscape<Option extends ComboboxOption>(context: ComboboxContext<Option>, event: KeyboardEvent<HTMLInputElement>): void {
  if (context.state.isOpen) {
    event.preventDefault();
    context.dispatch({ type: 'closed' });
  } else if (context.query !== '') {
    event.preventDefault();
    context.onQueryChange('');
  }
}

function choose<Option extends ComboboxOption>(context: ComboboxContext<Option>, option: Option): void {
  context.dispatch({ type: 'closed' });
  context.onSelect(option);
}

function useScrollIntoView(elementId: string | undefined): void {
  useEffect(() => {
    if (elementId !== undefined) {
      document.getElementById(elementId)?.scrollIntoView({ block: 'nearest' });
    }
  }, [elementId]);
}

function optionElementId(listboxId: string, option: ComboboxOption): string {
  return `${listboxId}-option-${String(option.id)}`;
}
