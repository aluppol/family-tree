import { type ReactElement, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { FamilyChart } from '../../api/types';
import { fullName } from '../people/personName';
import { usePersonIdParam } from '../people/usePersonIdParam';
import { NotFoundView } from '../shell/NotFoundPage';
import { PageError } from '../shell/PageStates';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { ChartPageView } from './ChartPageView';
import { useFamilyChart } from './chartQueries';
import type { Generations } from './GenerationControls';
import { layoutHourglass } from './layout/hourglassLayout';

const DEFAULT_GENERATIONS: Generations = { ancestors: 4, descendants: 3 };

export function ChartPage(): ReactElement {
  const personId = usePersonIdParam();
  return personId === null ? <NotFoundView /> : <FamilyChartScreen personId={personId} />;
}

function FamilyChartScreen({ personId }: { personId: number }): ReactElement {
  const [generations, setGenerations] = useState(DEFAULT_GENERATIONS);
  const chart = useFamilyChart({ personId, ...generations });
  const navigate = useNavigate();
  const layout = useMemo(() => (chart.data === undefined ? undefined : layoutHourglass(chart.data)), [chart.data]);
  const focusName = focusNameOf(chart.data);
  const handleNavigate = useCallback(
    (href: string) => {
      void navigate(href);
    },
    [navigate],
  );
  useDocumentTitle(focusName === undefined ? null : `Family tree of ${focusName}`);
  if (chart.isLoadingError) {
    return <PageError error={chart.error} onRetry={chart.refetch} />;
  }
  return (
    <ChartPageView
      personId={personId}
      focusName={focusName}
      layout={layout}
      generations={generations}
      isUpdating={chart.isPlaceholderData}
      onGenerationsChange={setGenerations}
      onNavigate={handleNavigate}
    />
  );
}

function focusNameOf(chart: FamilyChart | undefined): string | undefined {
  const focusPerson = chart?.people.find((person) => person.id === chart.focus_id);
  return focusPerson === undefined ? undefined : fullName(focusPerson);
}
