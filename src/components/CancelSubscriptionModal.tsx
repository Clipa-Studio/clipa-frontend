'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'

interface CancelSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, detail?: string) => Promise<void> | void
}

const CANCEL_REASONS = [
  { id: 'not_useful', label: 'Not useful right now' },
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'missing_features', label: 'Missing features I need' },
  { id: 'found_alternative', label: 'Found a better alternative' },
  { id: 'technical_issues', label: 'Technical issues' },
  { id: 'other', label: 'Other' },
]

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
}: CancelSubscriptionModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [otherDetail, setOtherDetail] = useState('')
  const [step, setStep] = useState<'reason' | 'confirm'>('reason')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId)
  }

  const handleNext = () => {
    if (selectedReason) {
      setStep('confirm')
    }
  }

  const handleConfirm = async () => {
    if (!selectedReason) return
    setLoading(true)
    try {
      const reason = CANCEL_REASONS.find(r => r.id === selectedReason)?.label || selectedReason
      await onConfirm(reason, selectedReason === 'other' ? otherDetail : undefined)
      setSelectedReason(null)
      setOtherDetail('')
      setStep('reason')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedReason(null)
    setOtherDetail('')
    setStep('reason')
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {step === 'reason' ? (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                We&apos;re sorry to see you go
              </h2>
              <p className="text-gray-400 mt-1">
                How did we fall short?
              </p>
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="space-y-2">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleReasonSelect(reason.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedReason === reason.id
                        ? 'border-primary-500 bg-primary-500/5'
                        : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900'
                    }`}
                  >
                    <span className={selectedReason === reason.id ? 'text-primary-400' : 'text-gray-300'}>
                      {reason.label}
                    </span>
                  </button>
                ))}
              </div>

              {selectedReason === 'other' && (
                <textarea
                  value={otherDetail}
                  onChange={(e) => setOtherDetail(e.target.value)}
                  placeholder="Please tell us more..."
                  className="w-full mt-3 px-4 py-3 border-2 border-gray-800 bg-gray-900 text-gray-100 placeholder-gray-500 rounded-xl focus:border-primary-500 focus:outline-none resize-none"
                  rows={3}
                />
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 text-gray-300 font-medium rounded-xl border-2 border-gray-700 hover:bg-gray-800 transition-colors"
                >
                  Never mind
                </button>
                <button
                  onClick={handleNext}
                  disabled={!selectedReason}
                  className="flex-1 px-4 py-3 text-white font-medium rounded-xl bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Confirm Step */}
            <div className="px-6 py-5 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                Confirm cancellation
              </h2>
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-amber-400">Your subscription will be canceled</p>
                    <p className="text-amber-400/70 text-sm mt-1">
                      You&apos;ll lose access to Pro features at the end of your billing period.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('reason')}
                  className="flex-1 px-4 py-3 text-gray-300 font-medium rounded-xl border-2 border-gray-700 hover:bg-gray-800 transition-colors"
                >
                  Go back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 px-4 py-3 text-white font-medium rounded-xl bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    'Cancel subscription'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
