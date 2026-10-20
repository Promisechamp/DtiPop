// src/pages/LandingPage.jsx
// Rendered inside UsersAppShell (see RootApp), so it has no header of its own.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Code2,
  Heart,
  Layers3,
  Leaf,
  Package,
  Recycle,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Zap,
} from 'lucide-react';

import { DTI_BASE, POP_BASE } from '@/utils/routeBases';

/* =========================================================
   ROUTES
   Everything except `home` lives under an app prefix.
========================================================= */

const ROUTES = {
  home: '/',

  dtiRegister: `${DTI_BASE}/register`,
  dtiLogin: `${DTI_BASE}/login`,
  dtiCreate: `${DTI_BASE}/create`,
  dtiBrowse: `${DTI_BASE}/browse`,
  dtiWinners: `${DTI_BASE}/winners`,
  dtiAbout: `${DTI_BASE}/about`,
  dtiHowItWorks: `${DTI_BASE}/how-it-works`,
  dtiFaq: `${DTI_BASE}/faq`,
  dtiContact: `${DTI_BASE}/contact`,
  dtiPrivacy: `${DTI_BASE}/privacy`,
  dtiTerms: `${DTI_BASE}/terms`,

  popLogin: `${POP_BASE}/login`,
  popRegister: `${POP_BASE}/register`,
};

/* =========================================================
   DESIGN HELPERS

   Uses the existing Tailwind theme classes and CSS variables.
   No additional CSS stylesheet is required.
========================================================= */

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

const viewport = { once: true, amount: 0.15 };

const SectionEyebrow = ({ children, light = false }) => (
  <div
    className={`mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${
      light ? 'text-white/70' : 'text-primary-600'
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        light ? 'bg-white' : 'bg-primary-500'
      }`}
    />
    {children}
  </div>
);

const ArrowLink = ({
  to,
  children,
  light = false,
  className = '',
}) => (
  <Link
    to={to}
    className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold transition duration-200 ${
      light
        ? 'border border-white/25 text-white hover:border-white/50 hover:bg-white/10'
        : 'border border-ink-200 bg-white text-ink-800 hover:border-primary-200 hover:bg-primary-50'
    } ${className}`}
  >
    {children}
    <ArrowUpRight
      size={16}
      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
    />
  </Link>
);

/* =========================================================
   CONTENT
========================================================= */

const services = [
  {
    id: 'pop',
    label: '01 / DOCUMENTATION',
    name: 'Proof of Purchase',
    shortName: 'POP',
    headline: 'Make every purchase count.',
    description:
      'A dedicated space for managing proof of purchase and keeping important transaction records organized and accessible.',
    features: [
      'Keep purchase records organized',
      'Access important documentation',
      'Simplify your record-keeping',
    ],
    icon: BadgeCheck,
    href: ROUTES.popLogin,
    action: 'Explore POP',
    theme: 'pop',
    number: '01',
  },
  {
    id: 'dti',
    label: '02 / COMMUNITY',
    name: "Don't Trash It",
    shortName: 'DTI',
    headline: 'Give useful things another life.',
    description:
      'Connect people with items they no longer need to people who can put those items to good use. Less waste, more possibility.',
    features: [
      'List items you no longer need',
      'Apply for things you can use',
      'Connect through a transparent process',
    ],
    icon: Recycle,
    href: ROUTES.dtiBrowse,
    action: 'Explore DTI',
    theme: 'dti',
    number: '02',
  },
];

const principles = [
  {
    icon: ShieldCheck,
    title: 'Trust comes first',
    description:
      'Clear information and transparent processes help people make informed decisions.',
  },
  {
    icon: Heart,
    title: 'People over things',
    description:
      'Technology works best when it helps people solve real problems and support one another.',
  },
  {
    icon: Recycle,
    title: 'Make value last',
    description:
      'Useful things deserve the opportunity to keep serving a purpose instead of going to waste.',
  },
];

const categories = [
  {
    icon: Layers3,
    name: 'Electronics',
    description: 'Devices and useful tech',
    tone: 'bg-primary-50 text-primary-700',
  },
  {
    icon: Package,
    name: 'Home & living',
    description: 'Everyday household items',
    tone: 'bg-brand-50 text-brand-700',
  },
  {
    icon: Code2,
    name: 'Books & learning',
    description: 'Resources for growing minds',
    tone: 'bg-primary-50 text-primary-700',
  },
  {
    icon: Users,
    name: 'Clothing & more',
    description: 'Things someone can use again',
    tone: 'bg-brand-50 text-brand-700',
  },
];

const faqs = [
  {
    question: "What is Don't Trash It?",
    answer:
      "Don't Trash It is a community-driven platform connecting people who want to give away useful items with people who can use them.",
  },
  {
    question: 'Is it free to use?',
    answer:
      'Yes. Listing items and applying for items on DTI are free. Any applicable shipping or delivery costs depend on the arrangement for the item.',
  },
  {
    question: 'How are item winners selected?',
    answer:
      'The donor reviews the applications and chooses the recipient. Applicants are notified of the outcome.',
  },
];

/* =========================================================
   HERO
========================================================= */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--color-page-background)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute -right-28 top-0 h-96 w-96 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-px w-[85%] -translate-x-1/2 bg-ink-100" />
      </div>

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10 lg:py-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.1 },
            },
          }}
          className="relative z-10 max-w-2xl"
        >
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-primary-700 shadow-sm">
              <Sparkles size={13} />
              A better way to make things matter
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-7 text-[42px] font-black leading-[1.02] tracking-[-0.065em] text-ink-950 sm:text-6xl lg:text-[76px]"
          >
            Good things
            <br />
            should <span className="text-primary-600">go further.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-sm font-medium leading-7 text-ink-500 sm:text-base sm:leading-8"
          >
            Meet ESTUCH — a place where better organization meets a more
            generous world. Manage important purchase records with POP, or
            help useful items find a new home with Don't Trash It.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              to={ROUTES.dtiBrowse}
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-primary-600 px-6 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition hover:-translate-y-0.5 hover:bg-primary-700"
            >
              Discover useful items
              <ArrowUpRight
                size={17}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>

            <a
              href="#services"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white/80 px-6 text-sm font-extrabold text-ink-700 transition hover:border-primary-200 hover:bg-white"
            >
              Explore our services
              <ArrowDownRight size={16} />
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3"
          >
            <div className="flex -space-x-2">
              {[
                'bg-primary-600',
                'bg-brand-500',
                'bg-primary-400',
                'bg-ink-400',
              ].map((color, index) => (
                <span
                  key={index}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-page-background)] ${color} text-white`}
                >
                  {index === 0 ? (
                    <Heart size={12} fill="currentColor" />
                  ) : index === 1 ? (
                    <Users size={12} />
                  ) : index === 2 ? (
                    <Recycle size={12} />
                  ) : (
                    <Sparkles size={12} />
                  )}
                </span>
              ))}
            </div>

            <p className="text-xs font-bold text-ink-500">
              Built around people, purpose and possibility.
            </p>
          </motion.div>
        </motion.div>

        {/* Editorial visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto w-full max-w-[550px]"
        >
          <div className="relative overflow-hidden rounded-[30px] border border-ink-100 bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:p-5">
            <div className="relative overflow-hidden rounded-[23px] bg-primary-600 p-6 text-white sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

              <div className="relative flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                  The ESTUCH idea
                </span>

                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                  <Sparkles size={17} />
                </span>
              </div>

              <h2 className="relative mt-12 max-w-sm text-3xl font-black leading-[1.08] tracking-[-0.05em] sm:text-4xl">
                Make room for
                <br />
                <span className="text-white/65">what comes next.</span>
              </h2>

              <p className="relative mt-4 max-w-xs text-sm font-medium leading-6 text-white/75">
                Keep your records organized. Keep useful things in circulation.
              </p>

              <div className="relative mt-10 grid grid-cols-2 gap-3">
                <Link
                  to={ROUTES.popLogin}
                  className="group rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:bg-white/15 sm:p-5"
                >
                  <BadgeCheck size={22} />
                  <p className="mt-6 text-lg font-black tracking-tight">
                    POP
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-white/65">
                    Purchase records
                  </p>
                  <div className="mt-4 flex items-center justify-between text-[10px] font-extrabold">
                    <span>Explore service</span>
                    <ArrowUpRight
                      size={14}
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>

                <Link
                  to={ROUTES.dtiBrowse}
                  className="group rounded-2xl border border-white/15 bg-white p-4 text-ink-950 transition hover:-translate-y-1 sm:p-5"
                >
                  <Recycle size={22} className="text-primary-600" />
                  <p className="mt-6 text-lg font-black tracking-tight">
                    DTI
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-ink-500">
                    Give things new life
                  </p>
                  <div className="mt-4 flex items-center justify-between text-[10px] font-extrabold text-primary-700">
                    <span>Browse items</span>
                    <ArrowUpRight
                      size={14}
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-5 sm:px-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <CheckCircle2 size={17} />
                </span>
                <div>
                  <p className="text-xs font-black text-ink-900">
                    Purpose in every interaction
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-ink-400">
                    One platform. Different possibilities.
                  </p>
                </div>
              </div>

              <span className="hidden text-[10px] font-black uppercase tracking-widest text-ink-300 sm:block">
                ESTUCH / 01
              </span>
            </div>
          </div>

          <div className="absolute -right-3 top-10 hidden rounded-2xl border border-ink-100 bg-white p-3.5 shadow-lg sm:block lg:-right-7">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Leaf size={17} />
              </span>
              <div>
                <p className="text-xs font-black text-ink-900">
                  Less waste
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-ink-400">
                  More possibility
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* =========================================================
   SERVICE STRIP
========================================================= */

function ServiceStrip() {
  const stats = [
    { value: '02', label: 'Connected services' },
    { value: '100%', label: 'Free item listing on DTI' },
    { value: '∞', label: 'Possibilities to make an impact' },
  ];

  return (
    <section className="border-y border-ink-100 bg-white">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-ink-100 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-10">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
            transition={{ delay: index * 0.08 }}
            className="flex items-center gap-4 py-5 sm:justify-center sm:py-7"
          >
            <p className="text-3xl font-black tracking-[-0.06em] text-primary-600 sm:text-4xl">
              {stat.value}
            </p>
            <p className="max-w-[150px] text-xs font-bold leading-5 text-ink-500">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   SERVICES
========================================================= */

function ServicesSection() {
  return (
    <section
      id="services"
      className="scroll-mt-24 bg-[var(--color-page-background)] px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
          className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <SectionEyebrow>Two services, one purpose</SectionEyebrow>

            <h2 className="text-3xl font-black leading-tight tracking-[-0.055em] text-ink-950 sm:text-4xl lg:text-5xl">
              Different needs.
              <br />
              <span className="text-primary-600">Thoughtful solutions.</span>
            </h2>
          </div>

          <p className="max-w-md text-sm font-medium leading-7 text-ink-500">
            Whether you're keeping track of purchases or helping something
            useful find a new home, ESTUCH gives you a place to begin.
          </p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-2">
          {services.map((service, index) => {
            const Icon = service.icon;
            const isDti = service.theme === 'dti';

            return (
              <motion.article
                key={service.id}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                variants={fadeUp}
                transition={{ delay: index * 0.1 }}
                className={`group relative overflow-hidden rounded-[28px] border p-6 transition duration-300 sm:p-8 lg:p-10 ${
                  isDti
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-ink-100 bg-white text-ink-950 shadow-sm hover:border-primary-200 hover:shadow-lg'
                }`}
              >
                {isDti && (
                  <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
                )}

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        isDti
                          ? 'border border-white/15 bg-white/10 text-white'
                          : 'bg-primary-50 text-primary-700'
                      }`}
                    >
                      <Icon size={22} />
                    </div>

                    <span
                      className={`text-[10px] font-black tracking-[0.2em] ${
                        isDti ? 'text-white/50' : 'text-ink-300'
                      }`}
                    >
                      {service.label}
                    </span>
                  </div>

                  <p
                    className={`mt-8 text-[11px] font-black uppercase tracking-[0.18em] ${
                      isDti ? 'text-white/65' : 'text-primary-600'
                    }`}
                  >
                    {service.shortName}
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-[-0.045em] sm:text-3xl">
                    {service.name}
                  </h3>

                  <p
                    className={`mt-3 text-xl font-extrabold leading-snug tracking-tight sm:text-2xl ${
                      isDti ? 'text-white/90' : 'text-ink-800'
                    }`}
                  >
                    {service.headline}
                  </p>

                  <p
                    className={`mt-4 max-w-lg text-sm font-medium leading-7 ${
                      isDti ? 'text-white/70' : 'text-ink-500'
                    }`}
                  >
                    {service.description}
                  </p>

                  <div className="mt-7 space-y-3">
                    {service.features.map((feature) => (
                      <div
                        key={feature}
                        className={`flex items-start gap-3 text-xs font-bold ${
                          isDti ? 'text-white/85' : 'text-ink-600'
                        }`}
                      >
                        <CheckCircle2
                          size={16}
                          className={`mt-0.5 shrink-0 ${
                            isDti ? 'text-white' : 'text-primary-600'
                          }`}
                        />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <Link
                      to={service.href}
                      className={`group/button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold transition ${
                        isDti
                          ? 'bg-white text-primary-700 hover:bg-primary-50'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {service.action}
                      <ArrowUpRight
                        size={16}
                        className="transition-transform group-hover/button:-translate-y-0.5 group-hover/button:translate-x-0.5"
                      />
                    </Link>

                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${
                        isDti ? 'text-white/45' : 'text-ink-300'
                      }`}
                    >
                      ESTUCH / {service.number}
                    </span>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   DTI JOURNEY
========================================================= */

function HowItWorksPreview() {
  const journey = [
    {
      number: '01',
      title: 'List it',
      description: 'Give your useful item a clear description and photos.',
      icon: Package,
    },
    {
      number: '02',
      title: 'Connect',
      description: 'People who need the item can submit applications.',
      icon: Users,
    },
    {
      number: '03',
      title: 'Choose',
      description: 'The donor reviews applications and selects a recipient.',
      icon: BadgeCheck,
    },
    {
      number: '04',
      title: 'Pass it on',
      description: 'Coordinate the handoff and give the item a new life.',
      icon: Truck,
    },
  ];

  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
            className="max-w-lg"
          >
            <SectionEyebrow>A little goes a long way</SectionEyebrow>

            <h2 className="text-3xl font-black leading-tight tracking-[-0.055em] text-ink-950 sm:text-4xl lg:text-5xl">
              One item.
              <br />
              <span className="text-primary-600">A whole new story.</span>
            </h2>

            <p className="mt-5 text-sm font-medium leading-7 text-ink-500">
              Don't Trash It makes giving and receiving useful things
              straightforward. You stay informed at every step, from the
              original listing to the final handoff.
            </p>

            <Link
              to={ROUTES.dtiHowItWorks}
              className="group mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-primary-700 transition hover:text-primary-600"
            >
              See how it all works
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            <div className="mt-9 rounded-2xl border border-primary-100 bg-primary-50/70 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                  <Heart size={18} />
                </span>
                <div>
                  <p className="text-sm font-black text-ink-900">
                    Giving is free on DTI
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-ink-500">
                    Listing items and applying for them cost nothing. Shipping
                    arrangements may involve separate costs.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="relative">
            <div className="absolute bottom-8 left-[25px] top-8 w-px bg-primary-100 sm:left-[29px]" />

            <div className="space-y-4">
              {journey.map((step, index) => {
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.number}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewport}
                    variants={fadeUp}
                    transition={{ delay: index * 0.08 }}
                    className="relative flex gap-4 rounded-2xl border border-ink-100 bg-[var(--color-page-background)] p-4 transition hover:border-primary-200 hover:bg-white sm:gap-5 sm:p-5"
                  >
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-white text-primary-700 shadow-sm sm:h-[58px] sm:w-[58px]">
                      <Icon size={20} />
                    </div>

                    <div className="flex-1 py-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest text-primary-600">
                          {step.number}
                        </span>
                        <h3 className="text-base font-black tracking-tight text-ink-950">
                          {step.title}
                        </h3>
                      </div>

                      <p className="mt-2 text-xs font-medium leading-6 text-ink-500 sm:text-sm">
                        {step.description}
                      </p>
                    </div>

                    <ArrowUpRight
                      size={16}
                      className="mt-2 shrink-0 text-ink-300"
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CATEGORIES
========================================================= */

function CategoriesSection() {
  return (
    <section className="bg-[var(--color-page-background)] px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
          className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <SectionEyebrow>Good things have many forms</SectionEyebrow>

            <h2 className="text-3xl font-black tracking-[-0.055em] text-ink-950 sm:text-4xl">
              There might be something
              <br className="hidden sm:block" /> here for you.
            </h2>
          </div>

          <Link
            to={ROUTES.dtiBrowse}
            className="group inline-flex items-center gap-2 text-sm font-extrabold text-primary-700 transition hover:text-primary-600"
          >
            Browse available items
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </motion.div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => {
            const Icon = category.icon;

            return (
              <motion.div
                key={category.name}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                variants={fadeUp}
                transition={{ delay: index * 0.06 }}
              >
                <Link
                  to={ROUTES.dtiBrowse}
                  className="group flex h-full items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-md sm:flex-col sm:items-start sm:p-6"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${category.tone}`}
                  >
                    <Icon size={21} />
                  </span>

                  <div className="flex-1">
                    <h3 className="text-sm font-black text-ink-950">
                      {category.name}
                    </h3>
                    <p className="mt-1.5 text-xs font-medium leading-5 text-ink-400">
                      {category.description}
                    </p>
                  </div>

                  <ArrowUpRight
                    size={16}
                    className="shrink-0 text-ink-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary-600 sm:mt-4"
                  />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   WHY ESTUCH
========================================================= */

function WhyEstuchSection() {
  return (
    <section className="overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
        >
          <SectionEyebrow>More than a platform</SectionEyebrow>

          <h2 className="text-3xl font-black leading-tight tracking-[-0.055em] text-ink-950 sm:text-4xl lg:text-5xl">
            Built with purpose.
            <br />
            <span className="text-primary-600">Made for people.</span>
          </h2>

          <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-ink-500">
            We believe everyday technology should do more than add another
            task to your day. It should help you organize what matters, make
            meaningful connections and put existing resources to better use.
          </p>

          <Link
            to={ROUTES.dtiAbout}
            className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-primary-700"
          >
            Our story
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2">
          {principles.map((principle, index) => {
            const Icon = principle.icon;

            return (
              <motion.article
                key={principle.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                variants={fadeUp}
                transition={{ delay: index * 0.08 }}
                className={`rounded-2xl border border-ink-100 p-5 sm:p-6 ${
                  index === 0
                    ? 'bg-primary-50/70'
                    : 'bg-[var(--color-page-background)]'
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                  <Icon size={19} />
                </div>

                <h3 className="mt-5 text-base font-black tracking-tight text-ink-950">
                  {principle.title}
                </h3>

                <p className="mt-2 text-xs font-medium leading-6 text-ink-500">
                  {principle.description}
                </p>
              </motion.article>
            );
          })}

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
            transition={{ delay: 0.24 }}
            className="relative overflow-hidden rounded-2xl bg-primary-600 p-5 text-white sm:col-span-2 sm:p-6"
          >
            <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-white/70">
                  <Zap size={15} />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                    A simple idea
                  </span>
                </div>

                <p className="mt-3 max-w-md text-xl font-black leading-snug tracking-tight sm:text-2xl">
                  Small actions can create meaningful change.
                </p>
              </div>

              <Link
                to={ROUTES.dtiAbout}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/25 px-4 text-xs font-extrabold text-white transition hover:bg-white/10 sm:self-auto"
              >
                Discover our mission
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   FAQ PREVIEW
========================================================= */

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="bg-[var(--color-page-background)] px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
          className="max-w-md"
        >
          <SectionEyebrow>Questions, answered</SectionEyebrow>

          <h2 className="text-3xl font-black leading-tight tracking-[-0.055em] text-ink-950 sm:text-4xl">
            A few things you might be wondering.
          </h2>

          <p className="mt-4 text-sm font-medium leading-7 text-ink-500">
            Want to understand the process, shipping or how winners are
            selected? Start here, then visit our full FAQ for more answers.
          </p>

          <Link
            to={ROUTES.dtiFaq}
            className="group mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-primary-700 transition hover:text-primary-600"
          >
            Visit the full FAQ
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <CircleHelp size={18} />
            </span>
            <div>
              <p className="text-xs font-black text-ink-900">
                Need a hand?
              </p>
              <Link
                to={ROUTES.dtiContact}
                className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-600"
              >
                Contact support <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
          className="overflow-hidden rounded-[24px] border border-ink-100 bg-white"
        >
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={faq.question}
                className="border-b border-ink-100 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenIndex(isOpen ? -1 : index)
                  }
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-ink-50/60 sm:px-6"
                >
                  <span className="text-sm font-extrabold leading-6 text-ink-900">
                    {faq.question}
                  </span>

                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                      isOpen
                        ? 'bg-primary-600 text-white'
                        : 'bg-ink-50 text-ink-500'
                    }`}
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm font-medium leading-7 text-ink-500 sm:px-6">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* =========================================================
   FINAL CTA
========================================================= */

function FinalCTA() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={fadeUp}
        className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[30px] bg-primary-600 px-6 py-12 text-center sm:px-12 sm:py-16 lg:px-20 lg:py-20"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white">
            <Sparkles size={24} />
          </span>

          <SectionEyebrow light>Start with one step</SectionEyebrow>

          <h2 className="text-3xl font-black leading-tight tracking-[-0.055em] text-white sm:text-4xl lg:text-5xl">
            Make something useful
            <br />
            <span className="text-white/65">happen today.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm font-medium leading-7 text-white/75 sm:text-base">
            Find what you need, pass something along, or discover how ESTUCH
            can help you make more of what matters.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to={ROUTES.dtiRegister}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-primary-700 transition hover:bg-primary-50"
            >
              Join the community
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>

            <Link
              to={ROUTES.dtiBrowse}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-extrabold text-white transition hover:bg-white/10"
            >
              Browse items
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* =========================================================
   FOOTER
========================================================= */

function Footer() {
  const year = new Date().getFullYear();

  const footerLinks = [
    {
      heading: 'Explore',
      links: [
        { label: 'Our services', href: '#services', section: true },
        { label: 'Browse Items', href: ROUTES.dtiBrowse },
        { label: 'Winners', href: ROUTES.dtiWinners },
      ],
    },
    {
      heading: "Don't Trash It",
      links: [
        { label: 'How it works', href: ROUTES.dtiHowItWorks },
        { label: 'About DTI', href: ROUTES.dtiAbout },
        { label: 'FAQs', href: ROUTES.dtiFaq },
      ],
    },
    {
      heading: 'Your account',
      links: [
        { label: 'Sign in', href: ROUTES.dtiLogin },
        { label: 'Create account', href: ROUTES.dtiRegister },
        { label: 'Explore POP', href: ROUTES.popLogin },
      ],
    },
    {
      heading: 'Information',
      links: [
        { label: 'Privacy policy', href: ROUTES.dtiPrivacy },
        { label: 'Terms of service', href: ROUTES.dtiTerms },
      ],
    },
  ];

  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <Link
              to={ROUTES.home}
              className="inline-flex items-center gap-2.5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary-600 text-white">
                <Layers3 size={21} strokeWidth={2.5} />
              </span>

              <span className="text-[21px] font-black tracking-[-0.07em] text-ink-950">
                estuch<span className="text-primary-600">.</span>
              </span>
            </Link>

            <p className="mt-4 text-xs font-medium leading-6 text-ink-500">
              Thoughtful tools for keeping important records organized and
              helping useful things find their next home.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink-100 bg-[var(--color-page-background)] px-3 py-2 text-[10px] font-bold text-ink-500">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              Built around people and purpose
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {footerLinks.map((group) => (
              <div key={group.heading}>
                <h3 className="text-xs font-black text-ink-900">
                  {group.heading}
                </h3>

                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.section ? (
                        <a
                          href={link.href}
                          className="text-xs font-medium text-ink-500 transition hover:text-primary-600"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-xs font-medium text-ink-500 transition hover:text-primary-600"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-medium text-ink-400">
            © {year} ESTUCH. Built with purpose.
          </p>

          <div className="flex items-center gap-2 text-[11px] font-bold text-ink-400">
            <Heart size={12} className="text-primary-600" />
            Useful things. Meaningful connections.
          </div>
        </div>
      </div>
    </footer>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function LandingPage() {
  return (
    <div className="overflow-x-clip bg-[var(--color-page-background)] text-ink-950">
      <Hero />
      <ServiceStrip />
      <ServicesSection />
      <HowItWorksPreview />
      <CategoriesSection />
      <WhyEstuchSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}