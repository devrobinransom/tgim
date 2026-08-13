import { PublicPage } from '../../../../portals/PublicPage';

export default async function Page({ params }: { params: Promise<{ clusterId: string }> }) {
  const { clusterId } = await params;
  return <PublicPage clusterId={clusterId} />;
}
