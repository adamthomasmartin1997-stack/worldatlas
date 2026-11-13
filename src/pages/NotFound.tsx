import { PageHeader, ButtonLink } from '../components/ui';

export function NotFound() {
  return (
    <PageHeader title="Page not found">
      <p className="muted">That page doesn't exist — maybe the country code is wrong.</p>
      <ButtonLink to="/" variant="primary">Back to the map</ButtonLink>
    </PageHeader>
  );
}
