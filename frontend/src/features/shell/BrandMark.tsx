import type { ReactElement } from 'react';
import styles from './Shell.module.scss';

export function BrandMark(): ReactElement {
  return (
    <svg className={styles.brandMark} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect className={styles.brandMarkTile} width="64" height="64" rx="14" />
      <path className={styles.brandMarkLines} d="M32 18v12M20 30h24M20 30v10M44 30v10" />
      <circle className={styles.brandMarkNode} cx="32" cy="15" r="6" />
      <circle className={styles.brandMarkNode} cx="20" cy="45" r="6" />
      <circle className={styles.brandMarkNode} cx="44" cy="45" r="6" />
    </svg>
  );
}
