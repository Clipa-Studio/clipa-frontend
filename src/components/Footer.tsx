'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="section-glow bg-[#0C0C14] pt-16 pb-10 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top — Brand + Links */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-10">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5"
            >
              <img src="/images/logo.png" alt="Clipa" className="w-7 h-7 rounded-lg" />
              <span className="text-base font-bold text-white tracking-tight">Clipa</span>
            </button>
          </div>

          {/* Links — single row */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <a href="/#features" className="text-white/60 hover:text-white transition-colors">Features</a>
            <a href="/#faq" className="text-white/60 hover:text-white transition-colors">FAQ</a>
            <Link href="/pricing" className="text-white/60 hover:text-white transition-colors">Pricing</Link>
            <Link href="/releases" className="text-white/60 hover:text-white transition-colors">Changelog</Link>
            <Link href="/blog/overview" className="text-white/60 hover:text-white transition-colors">Blog</Link>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-white/10 gap-3">
          <p className="text-xs text-white/55">
            &copy; {new Date().getFullYear()} Clipa. All rights reserved.
          </p>
          <div className="flex items-center gap-x-3 text-xs">
            <Link href="/terms" className="text-white/55 hover:text-white transition-colors">Terms</Link>
            <span className="text-white/20">&middot;</span>
            <Link href="/privacy" className="text-white/55 hover:text-white transition-colors">Privacy</Link>
            <span className="text-white/20">&middot;</span>
            <Link href="/refund" className="text-white/55 hover:text-white transition-colors">Refund</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
