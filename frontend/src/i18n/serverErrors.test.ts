import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { ClientRejection, errorMessageOf } from '../api/errorKind';
import { ENGLISH, RUSSIAN, SERBIAN } from '../test/translators';
import { en } from './en';
import { isTextKey } from './translate';

const BACKEND_PACKAGE = resolve(import.meta.dirname, '../../../backend/family_tree');
const CODE_WITH_MESSAGE = /[(,]\s*"([a-z]+(?:_[a-z]+)*\.[a-z]+(?:_[a-z]+)*)"\s*,\s*(f?"[^"\n]*"|[A-Za-z_]+)/gu;
const STRING_ASSIGNMENT = /^[ \t]*([A-Za-z_]+) = (f?)"([^"\n]*)"$/gmu;
const CLIENT_KEYS = new Set(['unexpected', 'httpStatus', 'network.unavailable']);

interface ServerError {
  readonly code: string;
  readonly message: string | null;
}

interface StringAssignment {
  readonly name: string;
  readonly text: string | null;
  readonly position: number;
}

function pythonSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'migrations' ? [] : pythonSources(path);
    }
    return entry.name.endsWith('.py') ? [path] : [];
  });
}

function serverErrors(): ServerError[] {
  return pythonSources(BACKEND_PACKAGE).flatMap((path) => {
    const source = readFileSync(path, 'utf8');
    const assignments = [...source.matchAll(STRING_ASSIGNMENT)].map(({ 1: name = '', 2: formatted, 3: text = '', index }) => ({ name, text: formatted === 'f' ? null : text, position: index }));
    return [...source.matchAll(CODE_WITH_MESSAGE)].map(({ 1: code = '', 2: argument = '', index }) => ({ code, message: staticMessage(argument, assignments.filter((assignment) => assignment.position < index)) }));
  });
}

function staticMessage(argument: string, earlierAssignments: readonly StringAssignment[]): string | null {
  if (argument.startsWith('"')) {
    return argument.slice(1, -1);
  }
  return earlierAssignments.findLast((assignment) => assignment.name === argument)?.text ?? null;
}

function catalogueErrorKeys(section: object, prefix = ''): string[] {
  return Object.entries(section).flatMap(([name, value]) => {
    const key = prefix === '' ? name : `${prefix}.${name}`;
    return typeof value === 'string' ? [key] : catalogueErrorKeys(value as object, key);
  });
}

describe('server error codes', () => {
  const errors = serverErrors();
  const codes = [...new Set(errors.map((error) => error.code))].sort();

  it('are read from the backend sources', () => {
    expect(codes).toContain('kinship.cycle');
    expect(codes).toContain('workspace.limit_reached');
    expect(codes.length).toBeGreaterThanOrEqual(40);
  });

  it('each have a text in the catalogue, and the catalogue has no code the server never sends', () => {
    expect(codes.filter((code) => !isTextKey(`errors.${code}`))).toEqual([]);
    expect(catalogueErrorKeys(en.errors).filter((key) => !CLIENT_KEYS.has(key)).sort()).toEqual(codes);
  });

  it('say in English what the server says, or pass the server message through when it varies', () => {
    for (const code of codes) {
      const messages = new Set(errors.filter((error) => error.code === code).map((error) => error.message));
      const english = ENGLISH(`errors.${code}` as never, { message: '{server}' });
      const expected = messages.size === 1 && !messages.has(null) ? [...messages][0] : '{server}';
      expect(english, code).toBe(expected);
    }
  });
});

describe('error messages', () => {
  it('translate a known server code', () => {
    const cycle = new ApiError(400, { code: 'kinship.cycle', message: 'The child is already an ancestor of this parent.', fields: {} });
    expect(errorMessageOf(cycle, ENGLISH)).toBe('The child is already an ancestor of this parent.');
    expect(errorMessageOf(cycle, RUSSIAN)).toBe('Ребёнок уже является предком этого родителя.');
    expect(errorMessageOf(cycle, SERBIAN)).toBe('Дете је већ предак овог родитеља.');
  });

  it('keep the numbers of a varying server message in English and give the gist in the other languages', () => {
    const tooLarge = new ApiError(400, { code: 'gedcom.too_large', message: 'The file is larger than 2 MB.', fields: {} });
    expect(errorMessageOf(tooLarge, ENGLISH)).toBe('The file is larger than 2 MB.');
    expect(errorMessageOf(tooLarge, RUSSIAN)).toBe('Файл слишком большой.');
  });

  it('fall back to the server message for a code the catalogue does not know', () => {
    const unknown = new ApiError(400, { code: 'brand.new_rule', message: 'A rule from a newer server.', fields: {} });
    expect(errorMessageOf(unknown, RUSSIAN)).toBe('A rule from a newer server.');
  });

  it('describe a bare status and a lost connection in the chosen language', () => {
    expect(errorMessageOf(new ApiError(502, { code: 'http.502', message: 'The server answered with status 502.', fields: {} }), RUSSIAN)).toBe('Сервер ответил с кодом 502.');
    expect(errorMessageOf(new ApiError(0, { code: 'network.unavailable', message: 'Cannot reach the server.', fields: {} }), SERBIAN)).toBe('Сервер није доступан. Проверите везу и покушајте поново.');
  });

  it('translate rejections from the browser and anything unexpected', () => {
    expect(errorMessageOf(new ClientRejection('photos.cannotResize'), RUSSIAN)).toBe('Ваш браузер не умеет уменьшать фото.');
    expect(errorMessageOf(new Error('boom'), SERBIAN)).toBe('Дошло је до неочекиване грешке. Покушајте поново.');
  });
});
