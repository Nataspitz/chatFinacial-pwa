import { useEffect, useState } from 'react'
import { Button } from '../ui'
import styles from './PwaInstallPrompt.module.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export const PwaInstallPrompt = (): JSX.Element | null => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    const onInstalled = (): void => {
      setDeferredPrompt(null)
      setIsVisible(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstall = async (): Promise<void> => {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <aside className={styles.banner} role="status" aria-live="polite">
      <p className={styles.text}>Instalar app</p>
      <Button type="button" variant="primary" className={styles.button} onClick={() => void handleInstall()}>
        Instalar
      </Button>
    </aside>
  )
}
