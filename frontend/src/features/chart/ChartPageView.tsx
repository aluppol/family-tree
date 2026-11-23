import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { Banner, ButtonLink, Icon, LoadingState, PageContainer, PageHeader } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { profilePath, treePath } from '../../routePaths';
import { ViewSwitch } from '../tree-views/ViewSwitch';
import styles from './ChartPage.module.scss';
import { ChartView } from './ChartView';
import type { HourglassLayout } from './layout/types';
import type { ChartLinks } from './PersonNode';

export interface ChartPageViewProps {
  personId: number;
  focusName: string | undefined;
  layout: HourglassLayout | undefined;
  onNavigate: (href: string) => void;
}

const CHART_LINKS: ChartLinks = { profile: profilePath, tree: treePath };

export function ChartPageView({ personId, focusName, layout, onNavigate }: ChartPageViewProps): ReactElement {
  const t = useT();
  return (
    <PageContainer>
      <PageHeader
        title={focusName ?? t('chart.title')}
        description={focusName === undefined ? undefined : t('chart.title')}
        actions={
          <>
            <ViewSwitch personId={personId} current="cards" />
            <ProfileLink personId={personId} />
          </>
        }
      />
      {layout === undefined ? (
        <LoadingState label={t('chart.loading')} />
      ) : (
        <>
          {layout.nodes.length === 1 && <LonePersonHint personId={personId} />}
          <ChartView layout={layout} label={focusName === undefined ? t('chart.title') : t('chart.titleOf', { name: focusName })} links={CHART_LINKS} onNavigate={onNavigate} />
        </>
      )}
    </PageContainer>
  );
}

function ProfileLink({ personId }: { personId: number }): ReactElement {
  const t = useT();
  return (
    <ButtonLink to={profilePath(personId)}>
      <Icon name="person" />
      {t('common.profile')}
    </ButtonLink>
  );
}

function LonePersonHint({ personId }: { personId: number }): ReactElement {
  const t = useT();
  return (
    <div className={styles.hint}>
      <Banner>
        {t('chart.lonePerson')} <Link to={profilePath(personId)}>{t('chart.lonePersonLink')}</Link>.
      </Banner>
    </div>
  );
}
