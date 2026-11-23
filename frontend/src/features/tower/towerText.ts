import type { PersonSummary } from '../../api/types';
import type { Translate } from '../../i18n/translate';
import { formatLifeYears } from '../dates/format';
import { fullName } from '../people/personName';
import type { SceneTexts } from './scene/sceneTypes';

export const REPEAT_MARK = '↻';

export function shortName(t: Translate, person: PersonSummary): string {
  const [firstGivenName = ''] = person.given_names.trim().split(/\s+/u);
  const name = [firstGivenName, person.surname.trim()].filter((part) => part !== '').join(' ');
  return name === '' ? fullName(t, person) : name;
}

export function lifeYearsText(t: Translate, person: PersonSummary): string {
  const lifeYears = formatLifeYears(t, person);
  return lifeYears === '' ? t('tower.yearsUnknown') : lifeYears;
}

export function towerFactsText(t: Translate, person: PersonSummary, generation: number): string {
  return t('tower.facts', { years: lifeYearsText(t, person), number: generation + 1 });
}

export function sceneTextsOf(t: Translate): SceneTexts {
  return {
    description: t('tower.sceneDescription'),
    ringLabel: (label) => (label.kind === 'decade' ? String(label.year) : t('tower.generation', { number: label.number })),
    personName: (person) => shortName(t, person),
  };
}
