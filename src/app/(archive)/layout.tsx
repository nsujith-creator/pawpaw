import PrivateHistoryGuard from '@/components/auth/private-history-guard'
import FamilyHeader from '@/components/archive/family-header'
import PwaControls from '@/components/pwa/pwa-controls'
import { requireFamilyAccess } from '@/lib/auth/family-access'

export default async function ArchiveLayout({ children }: { children: React.ReactNode }) {
  await requireFamilyAccess()

  return (
    <>
      <PwaControls />
      <PrivateHistoryGuard />
      <div data-private-surface="family">
        <FamilyHeader />
        {children}
      </div>
    </>
  )
}
