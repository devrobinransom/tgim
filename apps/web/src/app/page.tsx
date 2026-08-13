import { redirect } from 'next/navigation';
import { AREA_ID } from '../lib/portal';

export default function HomePage() {
  redirect(`/public/area/${AREA_ID}`);
}
