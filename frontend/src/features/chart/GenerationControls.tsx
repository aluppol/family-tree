import type { ReactElement } from 'react';
import { SelectField, type SelectOption } from '../../design/components';
import styles from './ChartPage.module.scss';

export interface Generations {
  readonly ancestors: number;
  readonly descendants: number;
}

export interface GenerationControlsProps {
  generations: Generations;
  isUpdating: boolean;
  onGenerationsChange: (generations: Generations) => void;
}

const ANCESTOR_OPTIONS = countOptions(1, 8);
const DESCENDANT_OPTIONS = countOptions(0, 6);

export function GenerationControls({ generations, isUpdating, onGenerationsChange }: GenerationControlsProps): ReactElement {
  function handleAncestorsChange(count: string): void {
    onGenerationsChange({ ...generations, ancestors: Number(count) });
  }
  function handleDescendantsChange(count: string): void {
    onGenerationsChange({ ...generations, descendants: Number(count) });
  }
  return (
    <div className={styles.controls}>
      <SelectField
        className={styles.generationField}
        label="Ancestor generations"
        options={ANCESTOR_OPTIONS}
        value={String(generations.ancestors)}
        onValueChange={handleAncestorsChange}
      />
      <SelectField
        className={styles.generationField}
        label="Descendant generations"
        options={DESCENDANT_OPTIONS}
        value={String(generations.descendants)}
        onValueChange={handleDescendantsChange}
      />
      <p role="status" className={styles.status}>
        {isUpdating ? 'Updating the tree…' : ''}
      </p>
    </div>
  );
}

function countOptions(smallest: number, largest: number): SelectOption<string>[] {
  return Array.from({ length: largest - smallest + 1 }, (_, offset) => {
    const count = String(smallest + offset);
    return { value: count, label: count };
  });
}
