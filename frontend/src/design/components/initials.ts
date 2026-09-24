export interface InitialledPerson {
  readonly given_names: string;
  readonly surname: string;
}

export function initialsOf(person: InitialledPerson): string {
  const initials = [person.given_names, person.surname].map((name) => name.trim().charAt(0)).join('');
  return initials === '' ? '?' : initials.toUpperCase();
}
