'use client'

import { useState, useEffect, useRef, useCallback, type FocusEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { analytics } from "../lib/analytics";
import { useAuth } from "../contexts/AuthContext";
import AuthenticatedDownloadButton from "./AuthenticatedDownloadButton";
import { BLOG_CATEGORIES } from "../lib/blogCategories";

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileBlogOpen, setMobileBlogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [blogMenuOpen, setBlogMenuOpen] = useState(false);
  const blogCloseTimer = useRef<number | null>(null);

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  const prefetchedRoutes = useRef<Set<string>>(new Set());

  const prefetchRoute = useCallback((href: string) => {
    if (prefetchedRoutes.current.has(href)) return;
    prefetchedRoutes.current.add(href);
    router.prefetch(href);
  }, [router]);

  const prefetchPrimaryContentRoutes = useCallback(() => {
    prefetchRoute('/blog/overview');
    prefetchRoute('/releases');
  }, [prefetchRoute]);

  const prefetchBlogRoutes = useCallback(() => {
    for (const category of BLOG_CATEGORIES) {
      prefetchRoute(`/blog/${category.slug}`);
    }
  }, [prefetchRoute]);

  const clearBlogCloseTimer = () => {
    if (blogCloseTimer.current) {
      window.clearTimeout(blogCloseTimer.current);
      blogCloseTimer.current = null;
    }
  };

  const openBlogMenu = () => {
    clearBlogCloseTimer();
    prefetchBlogRoutes();
    setBlogMenuOpen(true);
  };

  const closeBlogMenu = () => {
    clearBlogCloseTimer();
    setBlogMenuOpen(false);
  };

  const scheduleBlogMenuClose = () => {
    clearBlogCloseTimer();
    blogCloseTimer.current = window.setTimeout(() => {
      setBlogMenuOpen(false);
      blogCloseTimer.current = null;
    }, 120);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  const closeBlogMenus = () => {
    closeBlogMenu();
    setMobileBlogOpen(false);
  };

  const handleBlogBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closeBlogMenu();
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dropdownOpen]);

  useEffect(() => {
    return () => clearBlogCloseTimer();
  }, []);

  useEffect(() => {
    const runPrefetch = () => prefetchPrimaryContentRoutes();
    const idleWindow = window as Window & typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const idleId = idleWindow.requestIdleCallback(runPrefetch, { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = globalThis.setTimeout(runPrefetch, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, [prefetchPrimaryContentRoutes]);

  const navLinks = [
    { name: "Changelog", href: "/releases" },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="absolute w-px h-px overflow-hidden whitespace-nowrap border-0 focus:static focus:w-auto focus:h-auto focus:overflow-visible focus:whitespace-normal focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary-500 focus:text-white focus:text-sm focus:font-medium"
        style={{ clip: 'rect(0,0,0,0)' }}
      >
        Skip to content
      </a>
      {/* Navbar */}
      <header
        onMouseLeave={closeBlogMenu}
        onBlur={handleBlogBlur}
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "bg-[#0C0C14]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-lg shadow-black/20" : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            {/* Logo */}
            <a
              href="/"
              onMouseEnter={closeBlogMenus}
              onClick={(e) => {
                e.preventDefault();
                if (pathname === "/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  router.push("/");
                }
              }}
              className="flex items-center gap-2.5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <img
                src="/images/logo.png"
                alt="Clipa"
                className="w-8 h-8"
              />
              <span className="text-[22px] font-semibold tracking-wide text-white">Clipa</span>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8 text-[16px] font-medium text-gray-300">
              <Link
                href="/pricing"
                onMouseEnter={closeBlogMenus}
                onClick={() => {
                  closeBlogMenus();
                  analytics.navClick('Pricing');
                }}
                className="hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:text-white"
              >
                Pricing
              </Link>
              <div
                className="relative"
                onMouseEnter={openBlogMenu}
                onMouseLeave={scheduleBlogMenuClose}
                onFocus={openBlogMenu}
              >
                <Link
                  href="/blog/overview"
                  onClick={() => analytics.navClick('Blog')}
                  className="hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:text-white"
                  aria-expanded={blogMenuOpen}
                >
                  Blog
                </Link>
              </div>
              {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onMouseEnter={() => {
                      if (link.href === '/releases') prefetchRoute('/releases');
                      closeBlogMenus();
                    }}
                    onClick={() => {
                      closeBlogMenus();
                      analytics.navClick(link.name);
                    }}
                    className="hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:text-white"
                  >
                    {link.name}
                  </Link>
              ))}
            </nav>
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-6">
            {!loading && (
              <>
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 text-[16px] font-medium transition-colors text-gray-300 hover:text-white"
                    >
                      {displayName}
                      <svg className={`w-4 h-4 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {dropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                        <div className="absolute right-0 mt-3 w-48 bg-[#1C1C28] rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden p-1">
                          <Link
                            href="/mypage"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            My Page
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white rounded-lg transition-colors w-full"
                          >
                            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="text-[16px] font-medium transition-colors text-gray-300 hover:text-white"
                  >
                    Sign in
                  </Link>
                )}
              </>
            )}
            <AuthenticatedDownloadButton
              location="header"
              analyticsLocation="header"
              className="btn-block btn-block-sm"
            >
              Download Free for Mac
            </AuthenticatedDownloadButton>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-300"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        <div
          className={`absolute left-0 right-0 top-16 hidden overflow-hidden border-b border-white/[0.08] bg-[#0C0C14]/90 shadow-2xl shadow-black/30 backdrop-blur-xl transition-[max-height,opacity,transform] duration-300 ease-out lg:block ${
            blogMenuOpen
              ? 'max-h-[520px] translate-y-0 opacity-100 pointer-events-auto'
              : 'max-h-0 -translate-y-3 opacity-0 pointer-events-none'
          }`}
          onMouseEnter={openBlogMenu}
          onMouseLeave={scheduleBlogMenuClose}
        >
          <div
            className={`transition-transform duration-300 ease-out ${
              blogMenuOpen ? 'translate-y-0' : '-translate-y-4'
            }`}
          >
            <div className="mx-auto grid max-w-7xl grid-cols-[260px_minmax(0,1fr)] gap-14 px-6 py-10">
              <div className="border-r border-white/10 pr-10">
                <p className="text-sm font-medium text-primary-300/80">Blog</p>
                <Link
                  href="/blog/overview"
                  onClick={() => {
                    setBlogMenuOpen(false);
                    analytics.navClick('Blog Overview');
                  }}
                  className="mt-3 inline-flex text-xl font-semibold text-white transition-colors hover:text-primary-200"
                >
                  Browse articles
                </Link>
                <p className="mt-3 max-w-[210px] text-sm leading-relaxed text-white/50">
                  Articles organized by workflow, comparison, use case, and troubleshooting.
                </p>
              </div>
              <div className="grid max-w-4xl grid-cols-2 gap-x-5 gap-y-2">
                {BLOG_CATEGORIES.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/blog/${category.slug}`}
                    onClick={() => {
                      setBlogMenuOpen(false);
                      analytics.navClick(`Blog ${category.label}`);
                    }}
                    className="group block rounded-xl border border-transparent px-4 py-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                  >
                    <span className="block text-[17px] font-semibold leading-tight text-white transition-colors group-hover:text-primary-200">
                      {category.label}
                    </span>
                    <span className="mt-1 block max-w-[340px] text-sm leading-relaxed text-white/55 group-hover:text-white/70">
                      {category.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden border-b overflow-hidden transition-all duration-200 ease-out bg-[#0C0C14] ${
          mobileMenuOpen
            ? 'max-h-[720px] opacity-100 border-white/[0.08]'
            : 'max-h-0 opacity-0 border-transparent'
        }`}>
            <div className="px-6 py-4 flex flex-col gap-4">
              <Link
                href="/pricing"
                onClick={() => {
                  closeBlogMenus();
                  setMobileMenuOpen(false);
                }}
                className="text-lg font-medium py-2 border-b text-gray-200 border-white/[0.08]"
              >
                Pricing
              </Link>
              <div className="border-b border-white/[0.08] pb-2">
                <button
                  type="button"
                  onClick={() => {
                    prefetchBlogRoutes();
                    setMobileBlogOpen(!mobileBlogOpen);
                  }}
                  className="flex w-full items-center justify-between py-2 text-left text-lg font-medium text-gray-200"
                  aria-expanded={mobileBlogOpen}
                >
                  Blog
                  <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${mobileBlogOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`grid overflow-hidden transition-all duration-200 ${mobileBlogOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="min-h-0">
                    <div className="grid gap-1 pb-1 pt-2">
                      {BLOG_CATEGORIES.map((category) => (
                        <Link
                          key={category.slug}
                          href={`/blog/${category.slug}`}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setMobileBlogOpen(false);
                          }}
                          className="rounded-lg px-3 py-2 text-base text-white/60 hover:bg-white/5 hover:text-white"
                        >
                          {category.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <Link
                href="/releases"
                onMouseEnter={() => prefetchRoute('/releases')}
                onClick={() => {
                  closeBlogMenus();
                  setMobileMenuOpen(false);
                }}
                className="text-lg font-medium py-2 border-b text-gray-200 border-white/[0.08]"
              >
                Changelog
              </Link>
              {user ? (
                <>
                  <Link
                    href="/mypage"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium py-2 border-b text-gray-200 border-white/[0.08]"
                  >
                    My Page
                  </Link>
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="text-lg font-medium py-2 border-b text-left text-gray-200 border-white/[0.08]"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 mt-4">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-block-ghost w-full py-3 text-center"
                  >
                    Sign in
                  </Link>
                  <AuthenticatedDownloadButton
                    location="mobile_menu"
                    analyticsLocation="mobile_menu"
                    onBeforeNavigate={() => setMobileMenuOpen(false)}
                    className="btn-block w-full py-3 text-center"
                  >
                    Download Free for Mac
                  </AuthenticatedDownloadButton>
                </div>
              )}
            </div>
          </div>
      </header>
    </>
  );
}
