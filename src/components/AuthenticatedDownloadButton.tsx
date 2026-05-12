'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { analytics } from '../lib/analytics'
import {
  DOWNLOAD_FEEDBACK_EVENT,
  DOWNLOAD_FEEDBACK_STORAGE_KEY,
  startDownload,
  type DownloadFeedbackDetail,
} from '../lib/startDownload'

type AnalyticsLocation = 'header' | 'hero' | 'cta' | 'mobile_menu'

interface AuthenticatedDownloadButtonProps {
  children: ReactNode
  className: string
  location: string
  analyticsLocation?: AnalyticsLocation
  onBeforeNavigate?: () => void
}

const clearDownloadFeedback = () => {
  try {
    sessionStorage.removeItem(DOWNLOAD_FEEDBACK_STORAGE_KEY)
  } catch {
    // Storage may be unavailable in restricted browser modes.
  }
}

const parseDownloadFeedback = (location: string): DownloadFeedbackDetail | null => {
  try {
    const raw = sessionStorage.getItem(DOWNLOAD_FEEDBACK_STORAGE_KEY)
    if (!raw) return null

    const detail = JSON.parse(raw) as Partial<DownloadFeedbackDetail>
    if (typeof detail.expiresAt !== 'number') return null

    if (detail.expiresAt <= Date.now()) {
      clearDownloadFeedback()
      return null
    }

    if (detail.location && detail.location !== location) return null

    return {
      location: detail.location,
      expiresAt: detail.expiresAt,
    }
  } catch {
    clearDownloadFeedback()
    return null
  }
}

export default function AuthenticatedDownloadButton({
  children,
  className,
  location,
  analyticsLocation,
  onBeforeNavigate,
}: AuthenticatedDownloadButtonProps) {
  const [downloadFeedbackExpiresAt, setDownloadFeedbackExpiresAt] = useState<number | null>(null)
  const isPreparingDownload = downloadFeedbackExpiresAt !== null

  useEffect(() => {
    const applyFeedback = (detail: DownloadFeedbackDetail | null) => {
      if (!detail || detail.expiresAt <= Date.now()) return
      if (detail.location && detail.location !== location) return
      setDownloadFeedbackExpiresAt(detail.expiresAt)
    }

    applyFeedback(parseDownloadFeedback(location))

    const handleFeedback = (event: Event) => {
      applyFeedback((event as CustomEvent<DownloadFeedbackDetail>).detail)
    }

    window.addEventListener(DOWNLOAD_FEEDBACK_EVENT, handleFeedback)
    return () => window.removeEventListener(DOWNLOAD_FEEDBACK_EVENT, handleFeedback)
  }, [location])

  useEffect(() => {
    if (!downloadFeedbackExpiresAt) return

    const remainingMs = Math.max(downloadFeedbackExpiresAt - Date.now(), 0)
    const timeout = window.setTimeout(() => {
      setDownloadFeedbackExpiresAt(null)
      parseDownloadFeedback(location)
    }, remainingMs)

    return () => window.clearTimeout(timeout)
  }, [downloadFeedbackExpiresAt, location])

  const handleClick = () => {
    if (isPreparingDownload) return

    const referrer = document.referrer || 'Direct visit'

    if (analyticsLocation) {
      analytics.downloadClick(analyticsLocation)
    }

    onBeforeNavigate?.()
    void startDownload(location, referrer)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPreparingDownload}
      className={`${className} ${isPreparingDownload ? 'btn-download-pending' : ''}`}
      aria-label={isPreparingDownload ? 'Preparing Clipa Studio download' : 'Download Clipa Studio for Mac'}
      aria-busy={isPreparingDownload}
    >
      {isPreparingDownload ? (
        <>
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          <span>Preparing download...</span>
        </>
      ) : children}
    </button>
  )
}
