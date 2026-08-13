import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'TGIM — The Great Indian Manifesto',
  description: 'Evidence-linked civic demand, promises, and public delivery records.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
