import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Badge } from './Badge';
import { Banner } from './Banner';
import { Card, CardSection } from './Card';
import { PageContainer } from './PageContainer';
import { PageHeader } from './PageHeader';

test('PageHeader shows the page heading, description and actions', () => {
  render(<PageHeader title="People" description="Everyone in your tree." actions={<button type="button">Add person</button>} />);
  expect(screen.getByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument();
  expect(screen.getByText('Everyone in your tree.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add person' })).toBeInTheDocument();
});

test('PageHeader without extras shows only the heading', () => {
  const { container } = render(<PageHeader title="Add a person" />);
  expect(container.querySelectorAll('header > *')).toHaveLength(1);
});

test('CardSection is a region named by its heading', () => {
  render(
    <CardSection title="Parents" actions={<button type="button">Add parent</button>}>
      <p>No parents recorded yet.</p>
    </CardSection>,
  );
  const region = screen.getByRole('region', { name: 'Parents' });
  expect(region).toHaveTextContent('No parents recorded yet.');
  expect(screen.getByRole('button', { name: 'Add parent' })).toBeInTheDocument();
});

test('Card, PageContainer, Badge and Banner render their content', () => {
  render(
    <PageContainer width="narrow">
      <Card className="extra">
        <Badge tone="accent">Home person</Badge>
        <Banner tone="success">Imported 3 people.</Banner>
        <Banner>Demo sandbox.</Banner>
      </Card>
    </PageContainer>,
  );
  expect(screen.getByText('Home person')).toBeInTheDocument();
  expect(screen.getByText('Imported 3 people.')).toBeInTheDocument();
  expect(screen.getByText('Demo sandbox.')).toBeInTheDocument();
});
