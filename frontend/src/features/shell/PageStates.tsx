import type { ReactElement } from 'react';
import { ErrorState, PageContainer } from '../../design/components';

export interface PageErrorProps {
  error: unknown;
  onRetry: () => Promise<unknown>;
}

export function PageError({ error, onRetry }: PageErrorProps): ReactElement {
  function handleRetry(): void {
    void onRetry();
  }
  return (
    <PageContainer width="narrow">
      <ErrorState error={error} onRetry={handleRetry} titleLevel={1} />
    </PageContainer>
  );
}
