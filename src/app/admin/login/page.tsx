import VaradaScene from '@/components/archive/varada-scene'
import AdminLoginForm from './admin-login-form'
import styles from '../admin.module.css'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const callbackFailed = (await searchParams).error === 'auth_callback_failed'

  return (
    <div className={styles.loginPage}>
      <section className={styles.loginWelcome}>
        <p className={styles.eyebrow}>Pawpaw author’s studio</p>
        <h1 className={styles.loginWelcomeTitle}>Make the next page worth finding.</h1>
        <p>Write the memory. Choose the moments. See it exactly as family will. The machinery can stay backstage.</p>
        <VaradaScene sceneId="artist" sizes="(max-width: 720px) 11rem, 20rem" className={styles.loginCharacter} />
      </section>
      <AdminLoginForm callbackFailed={callbackFailed} />
    </div>
  )
}
