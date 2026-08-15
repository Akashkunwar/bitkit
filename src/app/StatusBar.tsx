import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const INSTALL_DISMISSED = 'bitkit-install-dismissed'

/**
 * Offline state, update availability, and the install invitation.
 *
 * All three are things the browser signals but never surfaces clearly: a
 * service-worker update sits waiting until the tab is closed, and the install
 * prompt is discarded unless something calls it.
 */
export function StatusBar() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null)
  const [installDismissed, setInstallDismissed] = useState(
    () => localStorage.getItem(INSTALL_DISMISSED) === '1',
  )

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  useEffect(() => {
    const online = () => setOffline(false)
    const down = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Chrome fires this then throws it away unless preventDefault is called.
      event.preventDefault()
      setInstallPrompt(event as InstallPrompt)
    }
    const onInstalled = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismissInstall = () => {
    setInstallDismissed(true)
    try {
      localStorage.setItem(INSTALL_DISMISSED, '1')
    } catch {
      /* private mode */
    }
  }

  const showInstall = Boolean(installPrompt) && !installDismissed

  if (!offline && !needRefresh && !showInstall) return null

  return (
    <div className="status-stack no-print">
      {offline ? (
        <div className="status-chip" data-tone="info" role="status">
          <span className="status-dot" aria-hidden="true" />
          Offline — every tool still works. Only the first load needed the network.
        </div>
      ) : null}

      {needRefresh ? (
        <div className="status-chip" data-tone="update" role="status">
          <span>A new version is ready.</span>
          <button type="button" className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>
            Reload
          </button>
          <button type="button" className="btn-ghost" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
        </div>
      ) : null}

      {showInstall ? (
        <div className="status-chip" data-tone="install">
          <span>Install BitKit for offline use and a spot in your dock.</span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              void installPrompt?.prompt().then(async () => {
                const choice = await installPrompt.userChoice
                if (choice.outcome === 'accepted') setInstallPrompt(null)
                else dismissInstall()
              })
            }}
          >
            Install
          </button>
          <button type="button" className="btn-ghost" onClick={dismissInstall}>
            No thanks
          </button>
        </div>
      ) : null}
    </div>
  )
}
