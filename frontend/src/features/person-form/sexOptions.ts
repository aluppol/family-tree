import type { Sex } from '../../api/types';
import type { SelectOption } from '../../design/components';

export const SEX_OPTIONS: readonly SelectOption<Sex>[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
];
