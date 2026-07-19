import PrivateHistoryGuard from '@/components/auth/private-history-guard'
import FamilyHeader from '@/components/archive/family-header'

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PrivateHistoryGuard />
      <div data-private-surface="family">
        <FamilyHeader />
        {children}
      </div>
    </>
  )
}
