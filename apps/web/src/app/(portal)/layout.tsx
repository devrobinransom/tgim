import { AppShell } from '../../ui/AppShell';

export default function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
