export function countOf(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString('en')} ${count === 1 ? singular : plural}`;
}
