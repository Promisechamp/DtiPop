// src/pages/LandingPage.jsx
import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Home,
  Users,
  UserRound,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import logo from "@/assets/dti.png";

const LandingPage = () => {
  const pillars = [
    {
      id: "me",
      title: "Me",
      eyebrow: "Personal",
      description:
        "Tools that help you keep track of the things that matter to you.",
      icon: UserRound,
      href: "/app/pop",
      action: "Explore PoP",
      available: true,
      iconStyle: "bg-primary-100/80 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300",
      accent: "text-primary-700 dark:text-primary-400",
      shadow: "shadow-primary",
    },
    {
      id: "home",
      title: "My Home",
      eyebrow: "Home",
      description:
        "A smarter way to organize, manage and take care of your home.",
      icon: Home,
      href: "#",
      action: "Coming soon",
      available: false,
      iconStyle: "bg-brand-100/80 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300",
      accent: "text-brand-700 dark:text-brand-400",
      shadow: "shadow-brand",
    },
    {
      id: "community",
      title: "My Community",
      eyebrow: "Community",
      description:
        "Connect useful things with people and communities that need them.",
      icon: Users,
      href: "/app/dti",
      action: "Explore DTI",
      available: true,
      iconStyle: "bg-cyan-100/80 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
      accent: "text-cyan-700 dark:text-cyan-400",
      shadow: "shadow-cyan",
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-ink-50 font-nunito text-ink-900">
      {/* Ambient blobs – using your primary/brand/cyan colors */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-48 -top-48 h-[30rem] w-[30rem] rounded-full bg-primary-100/60 blur-[120px]"
        />
        <motion.div
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -right-48 top-[20%] h-[32rem] w-[32rem] rounded-full bg-brand-100/50 blur-[130px]"
        />
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-15rem] left-[35%] h-[30rem] w-[30rem] rounded-full bg-cyan-100/40 blur-[120px]"
        />
      </div>

      {/* Navbar – glass effect using ink and primary/brand */}
      <header className="relative z-50 px-4 pt-4 sm:px-6 lg:px-8">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-2xl border border-ink-200/60 bg-white/80 px-4 shadow-navbar backdrop-blur-xl sm:px-5">
          <a href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-ink-100 transition group-hover:scale-105">
              <img src={logo} alt="ESTUCH" className="h-full w-full rounded-xl object-contain" />
            </div>
            <div className="leading-none">
              <span className="block text-base font-black tracking-[-0.04em] text-ink-950">
                ESTUCH
              </span>
              <span className="mt-1 block text-[8px] font-extrabold uppercase tracking-[0.18em] text-ink-400">
                Life, connected.
              </span>
            </div>
          </a>

          <div className="hidden items-center gap-8 sm:flex">
            <a href="#ecosystem" className="text-xs font-extrabold text-ink-500 transition hover:text-primary-600">
              Ecosystem
            </a>
            <a href="#about" className="text-xs font-extrabold text-ink-500 transition hover:text-primary-600">
              About ESTUCH
            </a>
          </div>

          <a
            href="#ecosystem"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-brand-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-primary transition hover:-translate-y-0.5 hover:shadow-primary/60"
          >
            Explore
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </nav>
      </header>

      {/* Main content */}
      <main>
        {/* Hero */}
        <section className="relative px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28 lg:pt-32">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-white/90 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary-700 shadow-xs backdrop-blur-sm"
            >
              <Sparkles size={13} />
              One ecosystem. Different parts of life.
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-7 max-w-4xl text-[clamp(3.4rem,10vw,7.2rem)] font-black leading-[0.86] tracking-[-0.075em] text-ink-950"
            >
              Everything that
              <br />
              <span className="bg-gradient-to-r from-primary-500 via-brand-500 to-cyan-500 bg-clip-text text-transparent">
                matters, connected.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-7 max-w-2xl text-base font-medium leading-7 text-ink-500 sm:text-lg"
            >
              ESTUCH brings together simple digital services built around
              everyday life — from the things you own, to your home, to the
              communities you are part of.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
            >
              {["Me", "My Home", "My Community"].map((item, index) => (
                <React.Fragment key={item}>
                  <span className="rounded-full border border-ink-200 bg-white/80 px-4 py-1.5 text-[10px] font-extrabold text-ink-600 shadow-xs backdrop-blur-sm">
                    {item}
                  </span>
                  {index < 2 && <span className="text-ink-300">·</span>}
                </React.Fragment>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-10"
            >
              <a
                href="#ecosystem"
                className="btn-primary inline-flex items-center gap-2 shadow-medium hover:-translate-y-0.5 hover:shadow-large"
              >
                Start exploring
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </motion.div>
          </div>
        </section>

        {/* Ecosystem cards */}
        <section id="ecosystem" className="scroll-mt-10 px-5 pb-24 sm:px-8 sm:pb-32">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">
                  The ESTUCH ecosystem
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-ink-950 sm:text-4xl">
                  Choose your space.
                </h2>
              </div>
              <p className="max-w-sm text-xs font-medium leading-6 text-ink-400 sm:text-right">
                Different services, one connected ecosystem.
              </p>
            </motion.div>

            <div className="grid gap-5 md:grid-cols-3">
              {pillars.map((pillar, index) => {
                const Icon = pillar.icon;
                const CardContent = (
                  <motion.div
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={pillar.available ? { y: -6, transition: { type: "spring", stiffness: 300 } } : {}}
                    className={`card group relative h-full overflow-hidden rounded-[1.75rem] p-6 transition-all duration-300 ${
                      pillar.available
                        ? `hover:${pillar.shadow} hover:border-primary-400/40 hover:shadow-card-hover`
                        : "opacity-90"
                    }`}
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary-500/5 blur-2xl" />

                    <div className="relative">
                      <div className="flex items-start justify-between">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${pillar.iconStyle}`}>
                          <Icon size={21} />
                        </div>
                        {!pillar.available && (
                          <span className="rounded-full border border-ink-200 dark:border-ink-700 bg-ink-50/80 dark:bg-ink-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-ink-500 dark:text-ink-300">
                            Soon
                          </span>
                        )}
                      </div>

                      <p className={`mt-8 text-[9px] font-black uppercase tracking-[0.18em] ${pillar.accent}`}>
                        {pillar.eyebrow}
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink-950">
                        {pillar.title}
                      </h3>
                      <p className="mt-3 min-h-[72px] text-sm font-medium leading-6 text-ink-500 dark:text-ink-400">
                        {pillar.description}
                      </p>

                      <div className={`mt-7 flex items-center justify-between text-xs font-extrabold ${pillar.accent}`}>
                        <span>{pillar.action}</span>
                        {pillar.available ? (
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-50 dark:bg-ink-300 shadow-xs transition-transform group-hover:translate-x-1 text-ink-950">
                            <ArrowUpRight size={14} />
                          </span>
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-ink-200 dark:border-ink-700 bg-ink-50/70 dark:bg-ink-300 text-ink-400">
                            <ChevronRight size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );

                if (!pillar.available) {
                  return <div key={pillar.id} className="h-full">{CardContent}</div>;
                }

                return (
                  <a key={pillar.id} href={pillar.href} className="block h-full">
                    {CardContent}
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* About section */}
        <section id="about" className="border-y border-ink-200 bg-white px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-brand-50 text-primary-700 shadow-xs ring-1 ring-ink-100">
                <Sparkles size={20} />
              </div>

              <h2 className="mt-6 text-3xl font-black tracking-[-0.05em] text-ink-950 sm:text-4xl">
                Built around real life.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-ink-500">
                ESTUCH is a growing ecosystem of services designed to make
                everyday life a little easier, more organized and more
                connected.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <span className="rounded-full bg-primary-50 px-4 py-2 text-xs font-extrabold text-primary-700 ring-1 ring-primary-200/50">
                  Me
                </span>
                <span className="rounded-full bg-brand-50 px-4 py-2 text-xs font-extrabold text-brand-700 ring-1 ring-brand-200/50">
                  My Home
                </span>
                <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-extrabold text-cyan-700 ring-1 ring-cyan-200/50">
                  My Community
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gradient-to-b from-ink-950 to-ink-900 px-5 py-10 text-white sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-xs">
                  <img src={logo} alt="ESTUCH" className="h-full w-full rounded-lg object-contain" />
                </div>
                <div>
                  <p className="text-sm text-ink-500 tracking-[-0.02em]">ESTUCH</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-ink-400">
                    Life, connected.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-ink-400">
                <a href="#ecosystem" className="transition hover:text-white">Ecosystem</a>
                <a href="#about" className="transition hover:text-white">About</a>
                <a href="/app/dti" className="transition hover:text-white">Don't Trash It</a>
                <a href="/app/pop" className="transition hover:text-white">Proof of Purchase</a>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-[10px] font-medium text-ink-500 sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} ESTUCH. All rights reserved.</span>
              <span>Me · My Home · My Community</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
