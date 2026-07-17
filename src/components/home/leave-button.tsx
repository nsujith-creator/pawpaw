import styles from './leave-button.module.css'

// Viewer logout control. Plain form POST — works without JavaScript.
// Rendered on every viewer-facing state (published and empty alike) so the
// family can always end the session on a shared device.
export default function LeaveButton() {
  return (
    <form action="/logout/viewer" method="post" className={styles.form}>
      <button type="submit" className={styles.button}>Leave</button>
    </form>
  )
}
