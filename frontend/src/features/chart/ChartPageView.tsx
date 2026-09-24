import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { Banner, ButtonLink, Icon, LoadingState, PageContainer, PageHeader } from '../../design/components';
import { profilePath, treePath } from '../../routePaths';
import styles from './ChartPage.module.scss';
import { ChartView } from './ChartView';
import { GenerationControls, type Generations } from './GenerationControls';
import type { HourglassLayout } from './layout/types';
import type { ChartLinks } from './PersonNode';

export interface ChartPageViewProps {
  personId: number;
  focusName: string | undefined;
  layout: HourglassLayout | undefined;
  generations: Generations;
  isUpdating: boolean;
  onGenerationsChange: (generations: Generations) => void;
  onNavigate: (href: string) => void;
}

const CHART_LINKS: ChartLinks = { profile: profilePath, tree: treePath };

const FAMILY_TREE = 'Family tree';

export function ChartPageView({ personId, focusName, layout, generations, isUpdating, onGenerationsChange, onNavigate }: ChartPageViewProps): ReactElement {
  return (
    <PageContainer>
      <PageHeader
        title={focusName ?? FAMILY_TREE}
        description={focusName === undefined ? undefined : FAMILY_TREE}
        actions={<ProfileLink personId={personId} />}
      />
      <GenerationControls generations={generations} isUpdating={isUpdating} onGenerationsChange={onGenerationsChange} />
      {layout === undefined ? (
        <LoadingState label="Loading the family tree…" />
      ) : (
        <>
          {layout.nodes.length === 1 && <LonePersonHint personId={personId} />}
          <ChartView layout={layout} label={focusName === undefined ? FAMILY_TREE : `Family tree of ${focusName}`} links={CHART_LINKS} onNavigate={onNavigate} />
        </>
      )}
    </PageContainer>
  );
}

function ProfileLink({ personId }: { personId: number }): ReactElement {
  return (
    <ButtonLink to={profilePath(personId)}>
      <Icon name="person" />
      Profile
    </ButtonLink>
  );
}

function LonePersonHint({ personId }: { personId: number }): ReactElement {
  return (
    <div className={styles.hint}>
      <Banner>
        No relatives to show yet. <Link to={profilePath(personId)}>Add parents or children from the profile page</Link>.
      </Banner>
    </div>
  );
}
