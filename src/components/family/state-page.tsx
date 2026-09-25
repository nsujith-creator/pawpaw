// A whole colour page for the moments in between: nothing here yet, something broke, wrong address.
import Link from 'next/link'
import styles from './family.module.css'

interface Props {
  colour?: 'teal' | 'rose' | 'sky' | 'duck' | 'night'
  title: string
  body: string
  action?: { href: string; label: string }
  secondary?: { href: string; label: string }
  onRetry?: () => void
}

export default function StatePage({ colour = 'sky', title, body, action, secondary, onRetry }: Props) {
  return (
    <main className={styles.state} data-colour={colour}>
      <div className={styles.statePage}>
        <h1 className={styles.stateTitle}>{title}</h1>
        <p className={styles.stateBody}>{body}</p>
        {(action || secondary || onRetry) && (
          <div className={styles.stateActions}>
            {onRetry && <button type="button" onClick={onRetry} className={styles.pill}>Try again</button>}
            {action && <Link href={action.href} className={onRetry ? styles.pillGhost : styles.pill}>{action.label}</Link>}
            {secondary && <Link href={secondary.href} className={styles.pillGhost}>{secondary.label}</Link>}
          </div>
        )}
      </div>
    </main>
  )
}
