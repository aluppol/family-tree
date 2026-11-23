import { type ReactElement, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { FamilyChart } from '../../api/types';
import { useT } from '../../i18n/languageContext';
import type { Translate } from '../../i18n/translate';
import { fullName } from '../people/personName';
import { usePersonIdParam } from '../people/usePersonIdParam';
import { NotFoundView } from '../shell/NotFoundPage';
import { PageError } from '../shell/PageStates';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { ChartPageView } from './ChartPageView';
import { useFamilyChart } from './chartQueries';
import { layoutHourglass } from './layout/hourglassLayout';

export function ChartPage(): ReactElement {
  const personId = usePersonIdParam();
  return personId === null ? <NotFoundView /> : <FamilyChartScreen personId={personId} />;
}

function FamilyChartScreen({ personId }: { personId: number }): ReactElement {
  const t = useT();
  const chart = useFamilyChart({ personId });
  const navigate = useNavigate();
  const layout = useMemo(() => (chart.data === undefined ? undefined : layoutHourglass(chart.data)), [chart.data]);
  const focusName = focusNameOf(t, chart.data);
  const handleNavigate = useCallback(
    (href: string) => {
      void navigate(href);
    },
    [navigate],
  );
  useDocumentTitle(focusName === undefined ? null : t('chart.titleOf', { name: focusName }));
  if (chart.isLoadingError) {
    return <PageError error={chart.error} onRetry={chart.refetch} />;
  }
  return (
    <ChartPageView
      personId={personId}
      focusName={focusName}
      layout={layout}
      onNavigate={handleNavigate}
    />
  );
}

function focusNameOf(t: Translate, chart: FamilyChart | undefined): string | undefined {
  const focusPerson = chart?.people.find((person) => person.id === chart.focus_id);
  return focusPerson === undefined ? undefined : fullName(t, focusPerson);
}
