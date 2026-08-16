'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isAppleMobile() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export default function PwaControls() {
  const [online, setOnline] = useState(true)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null)
  const [appleMobile, setAppleMobile] = useState(false)
  const [showAppleInstall, setShowAppleInstall] = useState(false)

  useEffect(() => {
    const updateConnection = () => {
      setOnline(navigator.onLine)
      setAppleMobile(isAppleMobile())
    }
    updateConnection()
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)

    const onInstallPrompt = (event: Event) => {
      const promptEvent = event as InstallPromptEvent
      promptEvent.preventDefault()
      setInstallPrompt(promptEvent)
    }
    window.addEventListener('beforeinstallprompt', onInstallPrompt)

    if (!('serviceWorker' in navigator)) return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
    }

    const onControllerChange = () => window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    void navigator.serviceWorker.register('/service-worker.js').then(registration => {
      const checkForUpdate = () => {
        if (registration.waiting && navigator.serviceWorker.controller) setUpdateWorker(registration.waiting)
      }
      checkForUpdate()
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) checkForUpdate()
        })
      })
    }).catch(() => undefined)

    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  function applyUpdate() {
    updateWorker?.postMessage({ type: 'SKIP_WAITING' })
  }

  // A quiet family page has no routine connectivity banner. This region appears
  // only when the visitor can act (install/update) or needs a truthful warning.
  const needsNotice = !online || Boolean(updateWorker)

  if (online && !installPrompt && !appleMobile && !updateWorker) return null

  return (
    <aside className={`pwaStatus${needsNotice ? ' pwaStatusNotice' : ''}`} aria-live="polite">
      {!online && <span>Offline — saving, publishing, and uploads need a connection.</span>}
      {installPrompt && <button type="button" onClick={() => void install()}>Install Pawpaw</button>}
      {!installPrompt && appleMobile && (
        <>
          <button
            type="button"
            aria-expanded={showAppleInstall}
            onClick={() => setShowAppleInstall(value => !value)}
          >
            Install Pawpaw
          </button>
          {showAppleInstall && <span>On iPhone or iPad: Share → Add to Home Screen.</span>}
        </>
      )}
      {updateWorker && <button type="button" onClick={applyUpdate}>A new version is ready</button>}
    </aside>
  )
}
