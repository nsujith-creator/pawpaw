import AdminLoginForm from './admin-login-form'
import styles from '../admin.module.css'

export const metadata = { title: 'Sign in' }

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const callbackFailed = (await searchParams).error === 'auth_callback_failed'
  return (
    <main className={styles.login}>
      <div className={styles.loginCover}>
        <p className={styles.word}>pawpaw <span>desk</span></p>
        <h1 className={styles.loginTitle}>Where her stories get written.</h1>
      </div>
      <AdminLoginForm callbackFailed={callbackFailed} />
    </main>
  )
}
