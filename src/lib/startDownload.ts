import { buildDownloadUrl } from './download'
import { recordFirstAppDownload } from './downloadTracking'
import { supabase } from './supabase'

export const DOWNLOAD_FEEDBACK_MS = 3_500
export const DOWNLOAD_FEEDBACK_EVENT = 'clipa:download-feedback'
export const DOWNLOAD_FEEDBACK_STORAGE_KEY = 'clipa:downloadFeedback'

export interface DownloadFeedbackDetail {
  location?: string
  expiresAt: number
}

const setDownloadFeedback = (location?: string) => {
  if (typeof window === 'undefined') return

  const detail: DownloadFeedbackDetail = {
    location,
    expiresAt: Date.now() + DOWNLOAD_FEEDBACK_MS,
  }

  try {
    sessionStorage.setItem(DOWNLOAD_FEEDBACK_STORAGE_KEY, JSON.stringify(detail))
  } catch {
    // Download feedback is best-effort; never block the download itself.
  }

  window.dispatchEvent(new CustomEvent<DownloadFeedbackDetail>(DOWNLOAD_FEEDBACK_EVENT, { detail }))
}

const DOWNLOAD_FRAME_NAME = 'clipa-download-frame'

const getDownloadFrame = () => {
  const existingFrame = document.querySelector<HTMLIFrameElement>(`iframe[name="${DOWNLOAD_FRAME_NAME}"]`)
  if (existingFrame) return existingFrame

  const iframe = document.createElement('iframe')
  iframe.name = DOWNLOAD_FRAME_NAME
  iframe.style.display = 'none'
  iframe.setAttribute('aria-hidden', 'true')
  document.body.appendChild(iframe)
  return iframe
}

const appendHiddenField = (form: HTMLFormElement, name: string, value?: string) => {
  if (!value) return

  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = name
  input.value = value
  form.appendChild(input)
}

const submitDownload = (accessToken?: string, location?: string, referrer?: string) => {
  getDownloadFrame()

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = buildDownloadUrl()
  form.target = DOWNLOAD_FRAME_NAME
  form.style.display = 'none'

  appendHiddenField(form, 'access_token', accessToken)
  appendHiddenField(form, 'location', location)
  appendHiddenField(form, 'referrer', referrer)

  document.body.appendChild(form)
  form.submit()
  window.setTimeout(() => form.remove(), 1000)
}

export const startDownload = async (location?: string, referrer?: string) => {
  setDownloadFeedback(location)
  void recordFirstAppDownload(location, referrer)

  try {
    const { data: { session } } = await supabase.auth.getSession()
    submitDownload(session?.access_token, location, referrer)
  } catch (error) {
    console.error('Failed to read auth session before download:', error)
    submitDownload(undefined, location, referrer)
  }
}
