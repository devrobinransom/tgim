import { PublicPage } from '../../../../portals/PublicPage';

export default async function Page({ params }: { params: Promise<{ promiseId: string }> }) {
  const { promiseId } = await params;
  return <PublicPage promiseId={promiseId} />;
}
