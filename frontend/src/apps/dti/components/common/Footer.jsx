import React from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/dti.png';
import popLogo from '@/assets/popLogo3.png';

const Footer = () => {
  const quickLinks = [
    {
      to: '/browse',
      label: 'Browse Items',
      icon: 'bi-grid',
    },
    {
      to: '/winners',
      label: 'Winners',
      icon: 'bi-trophy',
    },
    {
      to: '/how-it-works',
      label: 'How It Works',
      icon: 'bi-question-circle',
    },
    {
      to: '/about',
      label: 'About Us',
      icon: 'bi-info-circle',
    },
  ];

  const supportLinks = [
    {
      to: '/faq',
      label: 'FAQ',
    },
    {
      to: '/contact',
      label: 'Contact',
    },
    {
      to: '/privacy',
      label: 'Privacy Policy',
    },
    {
      to: '/terms',
      label: 'Terms of Service',
    },
  ];

  const socialLinks = [
    {
      label: 'Facebook',
      icon: 'bi-facebook',
      href: '#',
    },
    {
      label: 'X',
      icon: 'bi-twitter-x',
      href: '#',
    },
    {
      label: 'Instagram',
      icon: 'bi-instagram',
      href: '#',
    },
    {
      label: 'YouTube',
      icon: 'bi-youtube',
      href: '#',
    },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-ink-100 bg-ink-50 text-ink-700">

      {/* =================================================
          AMBIENT BACKGROUND
      ================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[32rem] w-[32rem] rounded-full bg-primary-200/30 blur-3xl" />

        <div className="absolute -right-48 top-1/3 h-[30rem] w-[30rem] rounded-full bg-brand-200/30 blur-3xl" />

        <div className="absolute -bottom-56 left-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-200/25 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">

        {/* =================================================
            BRAND / TOP STATEMENT
        ================================================= */}
        <div className="border-b border-ink-200/70 py-14 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">

            {/* Brand */}
            <div>
              <Link
                to="/"
                className="group inline-flex items-center gap-3"
              >
                <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl">
                  <img
                    src={logo}
                    alt="Don't Trash It"
                    className="logo h-full w-full rounded-xl object-contain"
                  />
                </div>

                <div>
                  <div className="text-lg font-extrabold tracking-[-0.025em] text-ink-900">
                    Don't Trash It
                  </div>

                  <div className="text-[9px] font-bold uppercase tracking-[0.17em] text-cyan-600">
                    Give it another life
                  </div>
                </div>
              </Link>

              <p className="mt-6 max-w-xl text-sm leading-7 text-ink-500">
                We connect useful things with people who need them.
                Give your surplus a second life, reduce waste, and
                create opportunities across communities.
              </p>
            </div>

            {/* Brand statement */}
            <div className="lg:justify-self-end">
              <div className="max-w-sm rounded-xl border border-ink-100 bg-white p-5 shadow-soft">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500" />
                  </span>

                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                    Our purpose
                  </span>
                </div>

                <p className="mt-3 text-sm font-bold leading-6 text-ink-700">
                  Keep useful things moving toward the people,
                  communities and opportunities that need them.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            MAIN FOOTER
        ================================================= */}
        <div className="py-12 md:py-14">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">

            {/* Explore */}
            <div className="lg:col-span-3">
              <h3 className="mb-5 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">
                Explore
              </h3>

              <ul className="space-y-3.5">
                {quickLinks.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="group inline-flex items-center gap-2.5 text-sm font-medium text-ink-500 transition-colors hover:text-primary-700"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-ink-100 bg-white text-ink-400 transition-all group-hover:border-primary-100 group-hover:bg-primary-50 group-hover:text-primary-600">
                        <i className={`bi ${item.icon} text-[11px]`} />
                      </span>

                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div className="lg:col-span-2">
              <h3 className="mb-5 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">
                Support
              </h3>

              <ul className="space-y-3.5">
                {supportLinks.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm font-medium text-ink-500 transition-colors hover:text-primary-700"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Connect */}
            <div className="lg:col-span-3">
              <h3 className="mb-5 text-[10px] font-black uppercase tracking-[0.18em] text-ink-400">
                Connect
              </h3>

              <div className="mb-5 flex items-center gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    title={social.label}
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                  >
                    <i
                      className={`bi ${social.icon} text-[15px] transition-transform group-hover:scale-110`}
                    />
                  </a>
                ))}
              </div>

              <div className="space-y-3">
                <a
                  href="mailto:support@donttrashit.com"
                  className="group flex items-center gap-3 text-sm font-medium text-ink-500 transition-colors hover:text-primary-700"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-100 bg-white text-ink-400 transition-colors group-hover:text-cyan-600">
                    <i className="bi bi-envelope text-sm" />
                  </span>

                  <span>support@donttrashit.com</span>
                </a>

                <div className="flex items-center gap-3 text-sm font-medium text-ink-500">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-100 bg-white text-ink-400">
                    <i className="bi bi-globe2 text-sm" />
                  </span>

                  <span>Global Community</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="lg:col-span-4">
              <div className="relative overflow-hidden rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 via-brand-50 to-cyan-50 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary-200/40 blur-3xl" />

                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                    Make an impact
                  </p>

                  <h3 className="mt-3 text-xl font-black tracking-[-0.025em] text-ink-900">
                    Have something useful?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-ink-500">
                    Give it a new destination instead of letting it go to waste.
                  </p>

                  <Link
                    to="/create"
                    className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-brand-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-primary transition-all hover:-translate-y-0.5 hover:from-primary-500 hover:to-brand-500"
                  >
                    List an item

                    <i className="bi bi-arrow-up-right text-[10px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            BOTTOM INFORMATION BAR
        ================================================= */}
        <div className="border-t border-ink-200/70 py-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">

            <p className="text-center text-xs text-ink-400 md:text-left">
              © {new Date().getFullYear()} Don't Trash It. All rights reserved.
            </p>

            <div className="flex items-center gap-1.5 text-xs text-ink-400">
              <span>Made with</span>

              <i className="bi bi-heart-fill text-[10px] text-primary-500" />

              <span>for a world with less waste.</span>
            </div>

            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: 'smooth',
                })
              }
              className="group inline-flex items-center gap-2 text-xs font-bold text-ink-500 transition-colors hover:text-primary-700"
            >
              Back to top

              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-100 bg-white transition-all group-hover:border-primary-200 group-hover:bg-primary-50 group-hover:text-primary-600">
                <i className="bi bi-arrow-up text-[10px]" />
              </span>
            </button>
          </div>
        </div>

        {/* =================================================
            POP × DTI ECOSYSTEM
        ================================================= */}
        <div className="border-t border-ink-100 py-7">
          <div className="flex flex-col items-center justify-center">

            <div className="flex items-center justify-center">

              {/* PoP */}
              <a
                href="/app/pop"
                aria-label="Proof of Purchase"
                className="group flex items-center rounded-xl p-2 transition-all duration-200 hover:bg-primary-50"
              >
                <img
                  src={popLogo}
                  alt="Proof of Purchase"
                  className="logo h-10 w-10 rounded-md bg-gradient-to-r from-primary-600 to-brand-600 object-contain shadow-sm transition-transform duration-200 group-hover:scale-105"
                />
              </a>

              {/* Divider */}
              <div className="mx-2 h-7 w-px bg-ink-200" />

              {/* DTI */}
              <a
                href="/app/dti"
                aria-label="Don't Trash It"
                className="group flex items-center rounded-xl p-2 transition-all duration-200 hover:bg-cyan-50"
              >
                <img
                  src={logo}
                  alt="Don't Trash It"
                  className="logo h-10 w-10 rounded-md object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </a>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[9px] font-bold text-ink-300">
              <span>PoP</span>
              <span className="h-1 w-1 rounded-full bg-ink-300" />
              <span>Don't Trash It</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;