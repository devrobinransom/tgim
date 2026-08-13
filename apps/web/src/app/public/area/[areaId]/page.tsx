import { PublicPage } from '../../../../portals/PublicPage';

export default async function Page({ params }: { params: Promise<{ areaId: string }> }) {
  const { areaId } = await params;
  return <PublicPage areaId={areaId} />;
}
