import PrivateHistoryGuard from '@/components/auth/private-history-guard'

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PrivateHistoryGuard />
      <div data-private-surface="family">{children}</div>
    </>
  )
}
