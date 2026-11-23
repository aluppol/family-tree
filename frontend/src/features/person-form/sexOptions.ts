import type { Sex } from '../../api/types';
import type { SelectOption } from '../../design/components';
import type { Translate } from '../../i18n/translate';

const SEXES: readonly Sex[] = ['female', 'male', 'other', 'unknown'];

export function sexOptions(t: Translate): SelectOption<Sex>[] {
  return SEXES.map((sex) => ({ value: sex, label: t(`sex.${sex}`) }));
}
