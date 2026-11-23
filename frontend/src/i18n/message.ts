import type { MessageParams, TextKey } from './catalogue';
import type { Translate } from './translate';

export interface Message {
  readonly key: TextKey;
  readonly params?: MessageParams;
}

export type FieldMessage = Message | string;

export function messageOf(key: TextKey, params?: MessageParams): Message {
  return params === undefined ? { key } : { key, params };
}

export function messageText(t: Translate, message: FieldMessage): string {
  return typeof message === 'string' ? message : t(message.key, message.params);
}

export function optionalMessageText(t: Translate, message: FieldMessage | undefined): string | undefined {
  return message === undefined ? undefined : messageText(t, message);
}
