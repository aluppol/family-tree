export type ClassNamePart = string | false | null | undefined;

export function classNames(...parts: ClassNamePart[]): string {
  return parts.filter((part) => typeof part === 'string' && part !== '').join(' ');
}
