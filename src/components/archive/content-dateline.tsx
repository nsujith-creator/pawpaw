import { formatDisplayDate } from '@/lib/content/display-date'
import styles from './content-dateline.module.css'

interface ContentDatelineProps {
  date: string | null
  context?: string
  label?: string
}

export default function ContentDateline({
  date,
  context,
  label = 'Written',
}: ContentDatelineProps) {
  const displayDate = formatDisplayDate(date)
  if (!displayDate || !date) return null

  return (
    <p className={styles.dateline}>
      {label}{' '}
      <time dateTime={date}>{displayDate}</time>
      {context && <>{' '}<span className={styles.separator} aria-hidden="true">·</span>{' '}{context}</>}
    </p>
  )
}
