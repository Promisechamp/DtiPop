// src/pages/LandingPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/* =========================================================
   LANDING PAGE
========================================================= */

const categories = [
  {
    title: 'Electronics',
    description: 'Phones, computers, accessories and useful tech.',
    icon: 'bi-phone',
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-600',
    hoverBorder: 'hover:border-primary-200',
  },
  {
    title: 'Furniture',
    description: 'Give chairs, tables and home items another life.',
    icon: 'bi-house',
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-600',
    hoverBorder: 'hover:border-brand-200',
  },
  {
    title: 'Clothing',
    description: 'Quality clothing waiting for a new owner.',
    icon: 'bi-bag',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    hoverBorder: 'hover:border-cyan-200',
  },
  {
    title: 'Books',
    description: 'Share knowledge instead of leaving books unused.',
    icon: 'bi-book',
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-600',
    hoverBorder: 'hover:border-primary-200',
  },
  {
    title: 'Appliances',
    description: 'Useful household appliances that still have value.',
    icon: 'bi-plug',
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-600',
    hoverBorder: 'hover:border-brand-200',
  },
  {
    title: 'Other Items',
    description: 'Something useful that does not fit a category.',
    icon: 'bi-box-seam',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    hoverBorder: 'hover:border-cyan-200',
  },
];

const impactStats = [
  {
    value: '10K+',
    label: 'Items shared',
    icon: 'bi-box-seam',
  },
  {
    value: '7K+',
    label: 'People connected',
    icon: 'bi-people',
  },
  {
    value: '3K+',
    label: 'Items given new homes',
    icon: 'bi-house-heart',
  },
  {
    value: '20+',
    label: 'Communities reached',
    icon: 'bi-globe2',
  },
];

const steps = [
  {
    number: '01',
    title: 'List what you have',
    description:
      'Have something useful you no longer need? Create a simple listing and tell the community about it.',
    icon: 'bi-plus-circle',
  },
  {
    number: '02',
    title: 'Connect with someone',
    description:
      'People who need the item can discover it and submit an application or request.',
    icon: 'bi-chat-heart',
  },
  {
    number: '03',
    title: 'Give it another life',
    description:
      'Choose a recipient, arrange the handover and keep something useful out of the waste stream.',
    icon: 'bi-arrow-repeat',
  },
];

const testimonials = [
  {
    quote:
      'I had a few things sitting around that I no longer used. Instead of throwing them away, I found people who genuinely needed them.',
    name: 'Community Member',
    role: 'Donor',
    initials: 'CM',
  },
  {
    quote:
      'The idea is simple but powerful. Something that has little use for one person can make a real difference to somebody else.',
    name: 'Community Member',
    role: 'Recipient',
    initials: 'CR',
  },
  {
    quote:
      'It feels good knowing that useful things can continue to serve a purpose instead of becoming unnecessary waste.',
    name: 'Community Member',
    role: 'Community Member',
    initials: 'CC',
  },
];

/* =========================================================
   ANIMATION
========================================================= */

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: 'easeOut',
    },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

/* =========================================================
   REUSABLE ICON
========================================================= */

const Icon = ({ name, className = '' }) => (
  <i className={`bi ${name} ${className}`} aria-hidden="true" />
);

/* =========================================================
   LANDING PAGE
========================================================= */

const LandingPage = () => {
  return (
    <main className="overflow-hidden bg-white text-ink-700">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative flex items-center overflow-hidden ">

        {/* Decorative atmosphere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">

          <div className="absolute -top-48 -right-40 w-[34rem] h-[34rem] rounded-full bg-primary-200/30 blur-3xl" />

          <div className="absolute -bottom-48 -left-40 w-[34rem] h-[34rem] rounded-full bg-brand-200/30 blur-3xl" />

          <div className="absolute top-[22%] right-[12%] w-3 h-3 rounded-full bg-primary-400/60" />

          <div className="absolute top-[32%] right-[22%] w-2 h-2 rounded-full bg-brand-400/70" />

          <div className="absolute bottom-[22%] left-[10%] w-3 h-3 rounded-full bg-cyan-400/60" />

          <div className="absolute top-1/2 left-1/2 w-[40rem] h-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-300/10 blur-3xl" />

        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-20">

          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

            {/* =================================================
                HERO COPY
            ================================================= */}

            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="max-w-2xl -mt-20"
            >

              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 border border-primary-100 shadow-sm mb-6"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-600" />
                </span>

                <span className="text-xs sm:text-sm font-bold text-primary-700">
                  A better home for useful things
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-[68px] leading-[1.03] font-black tracking-[-0.045em] text-ink-900"
              >
                Don't trash it.
                <br />

                <span className="bg-gradient-to-r from-primary-600 via-brand-600 to-brand-700 bg-clip-text text-transparent">
                  Give it another life.
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 text-base sm:text-lg lg:text-xl leading-8 text-ink-600 max-w-xl"
              >
                Connect useful things with people who need them.
                Share what you no longer use, discover items in your
                community, and help reduce unnecessary waste.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="mt-8 flex flex-col sm:flex-row gap-3"
              >

                <Link
                  to="/browse"
                  className="group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-primary hover:-translate-y-0.5 transition-all duration-200"
                >
                  Explore Items

                  <Icon
                    name="bi-arrow-right"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  to="/create"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white border border-ink-200 hover:border-primary-200 hover:bg-primary-50 text-ink-700 hover:text-primary-700 font-bold text-sm shadow-sm transition-all duration-200"
                >
                  <Icon name="bi-plus-lg" />
                  List an Item
                </Link>

              </motion.div>

              <motion.div
                variants={fadeUp}
                className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-500"
              >

                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <Icon
                      name="bi-check2"
                      className="text-primary-600 text-xs"
                    />
                  </span>

                  Give useful items a second life
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                    <Icon
                      name="bi-check2"
                      className="text-brand-600 text-xs"
                    />
                  </span>

                  Connect with your community
                </div>

              </motion.div>

            </motion.div>

            {/* =================================================
                HERO VISUAL
            ================================================= */}

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.94,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                duration: 0.7,
                ease: 'easeOut',
              }}
              className="relative"
            >

              <div className="relative max-w-[540px] mx-auto">

                {/* Main marketplace card */}
                <div className="relative bg-white rounded-[2rem] border border-primary-100 shadow-primary p-5 sm:p-7">

                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">

                    <div>
                      <p className="text-xs font-bold text-ink-400 uppercase tracking-[0.14em]">
                        Community marketplace
                      </p>

                      <h2 className="mt-1 text-lg font-black text-ink-900">
                        Useful things, new homes.
                      </h2>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-brand-50 border border-primary-100 flex items-center justify-center">
                      <Icon
                        name="bi-heart"
                        className="text-brand-600"
                      />
                    </div>

                  </div>

                  {/* Item grid */}
                  <div className="grid grid-cols-2 gap-3">

                    {/* Electronics */}
                    <div className="group rounded-2xl bg-primary-50/80 border border-primary-100 p-4 min-h-[170px] flex flex-col justify-between hover:bg-primary-100/70 transition-colors">

                      <div className="w-12 h-12 rounded-xl bg-white border border-primary-100 flex items-center justify-center text-primary-600 shadow-sm">
                        <Icon name="bi-laptop" className="text-xl" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-ink-800">
                          Laptop
                        </p>

                        <p className="text-xs text-ink-500 mt-1">
                          Ready for a new home
                        </p>
                      </div>

                    </div>

                    {/* Furniture */}
                    <div className="group rounded-2xl bg-brand-50/80 border border-brand-100 p-4 min-h-[170px] flex flex-col justify-between hover:bg-brand-100/70 transition-colors">

                      <div className="w-12 h-12 rounded-xl bg-white border border-brand-100 flex items-center justify-center text-brand-600 shadow-sm">
                        <Icon name="bi-house" className="text-xl" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-ink-800">
                          Furniture
                        </p>

                        <p className="text-xs text-ink-500 mt-1">
                          Still useful
                        </p>
                      </div>

                    </div>

                    {/* Clothing */}
                    <div className="group rounded-2xl bg-cyan-50/80 border border-cyan-100 p-4 min-h-[170px] flex flex-col justify-between hover:bg-cyan-100/70 transition-colors">

                      <div className="w-12 h-12 rounded-xl bg-white border border-cyan-100 flex items-center justify-center text-cyan-600 shadow-sm">
                        <Icon name="bi-bag" className="text-xl" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-ink-800">
                          Clothing
                        </p>

                        <p className="text-xs text-ink-500 mt-1">
                          Looking for someone
                        </p>
                      </div>

                    </div>

                    {/* Books */}
                    <div className="group rounded-2xl bg-gradient-to-br from-primary-50 to-brand-50 border border-brand-100 p-4 min-h-[170px] flex flex-col justify-between">

                      <div className="w-12 h-12 rounded-xl bg-white border border-brand-100 flex items-center justify-center text-brand-600 shadow-sm">
                        <Icon name="bi-book" className="text-xl" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-ink-800">
                          Books
                        </p>

                        <p className="text-xs text-ink-500 mt-1">
                          Share the knowledge
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* Bottom message */}
                  <div className="mt-4 flex items-center gap-3 p-3.5 rounded-xl bg-ink-50 border border-ink-100">

                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-100 to-brand-100 flex items-center justify-center shrink-0">
                      <Icon
                        name="bi-arrow-repeat"
                        className="text-primary-600"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-black text-ink-800">
                        Every item can have another chapter.
                      </p>

                      <p className="text-[11px] text-ink-500 mt-0.5">
                        Keep useful things moving.
                      </p>
                    </div>

                  </div>

                </div>

                {/* Floating notification */}
                <motion.div
                  animate={{
                    y: [0, -7, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute -right-3 sm:-right-8 top-12 bg-white border border-brand-100 rounded-2xl shadow-xl p-3.5 flex items-center gap-3"
                >

                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
                    <Icon
                      name="bi-heart-fill"
                      className="text-brand-600 text-sm"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-black text-ink-800">
                      Item matched!
                    </p>

                    <p className="text-[10px] text-ink-400">
                      Someone needs it
                    </p>
                  </div>

                </motion.div>

                {/* Floating impact badge */}
                <motion.div
                  animate={{
                    y: [0, 6, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute -left-3 sm:-left-8 bottom-12 bg-white border border-primary-100 rounded-2xl shadow-xl px-4 py-3"
                >

                  <div className="flex items-center gap-3">

                    <div className="flex -space-x-2">

                      <div className="w-7 h-7 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center">
                        <Icon
                          name="bi-person"
                          className="text-primary-600 text-[10px]"
                        />
                      </div>

                      <div className="w-7 h-7 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center">
                        <Icon
                          name="bi-person"
                          className="text-brand-600 text-[10px]"
                        />
                      </div>

                      <div className="w-7 h-7 rounded-full bg-cyan-100 border-2 border-white flex items-center justify-center">
                        <Icon
                          name="bi-person"
                          className="text-cyan-600 text-[10px]"
                        />
                      </div>

                    </div>

                    <div>
                      <p className="text-xs font-black text-ink-800">
                        Community powered
                      </p>

                      <p className="text-[10px] text-ink-400">
                        People helping people
                      </p>
                    </div>

                  </div>

                </motion.div>

              </div>

            </motion.div>

          </div>
        </div>
      </section>

      {/* =====================================================
          IMPACT
      ===================================================== */}

      <section className="relative bg-white border-y border-ink-100">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-ink-100">

            {impactStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                }}
                className="px-4 sm:px-8 text-center"
              >

                <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-primary-50 to-brand-50 border border-primary-100 text-primary-600 flex items-center justify-center mb-3">
                  <Icon name={stat.icon} />
                </div>

                <div className="text-2xl sm:text-3xl font-black tracking-tight text-ink-900">
                  {stat.value}
                </div>

                <p className="mt-1 text-xs sm:text-sm text-ink-500">
                  {stat.label}
                </p>

              </motion.div>
            ))}

          </div>

        </div>
      </section>

      {/* =====================================================
          CATEGORIES
      ===================================================== */}

      <section className="py-20 lg:py-24 bg-ink-50">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">

            <div className="max-w-2xl">

              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary-600">

                <span className="w-5 h-px bg-primary-500" />

                Explore

              </span>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-ink-900">
                Find something useful.
              </h2>

              <p className="mt-3 text-ink-500 leading-7">
                Browse through items shared by people and communities.
                You never know what useful thing is waiting for you.
              </p>

            </div>

            <Link
              to="/browse"
              className="group inline-flex items-center gap-2 text-sm font-black text-primary-600 hover:text-brand-600 transition-colors"
            >
              Browse everything

              <Icon
                name="bi-arrow-right"
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

            {categories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.05,
                }}
              >

                <Link
                  to="/browse"
                  className={`group block h-full bg-white rounded-2xl border border-ink-100 ${category.hoverBorder} p-5 sm:p-6 shadow-sm hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300`}
                >

                  <div
                    className={`w-12 h-12 rounded-xl ${category.iconBg} ${category.iconColor} flex items-center justify-center mb-5`}
                  >
                    <Icon
                      name={category.icon}
                      className="text-xl"
                    />
                  </div>

                  <h3 className="font-black text-ink-900">
                    {category.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-ink-500 leading-6">
                    {category.description}
                  </p>

                  <div className="mt-5 flex items-center gap-1 text-xs font-black text-primary-600 group-hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-all">
                    Explore

                    <Icon
                      name="bi-arrow-right"
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>

                </Link>

              </motion.div>
            ))}

          </div>

        </div>
      </section>

      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}

      <section className="py-20 lg:py-24 bg-white">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="max-w-2xl mx-auto text-center">

            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary-600">

              <span className="w-5 h-px bg-primary-500" />

              Simple process

              <span className="w-5 h-px bg-brand-500" />

            </span>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-ink-900">
              Giving things another life is easy.
            </h2>

            <p className="mt-4 text-ink-500 leading-7">
              A simple process designed to make sharing useful things
              straightforward for everyone.
            </p>

          </div>

          <div className="relative mt-14">

            {/* Indigo → Violet connector */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-primary-200 via-brand-300 to-primary-200" />

            <div className="grid md:grid-cols-3 gap-10">

              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                  }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  className="relative text-center"
                >

                  <div className="relative z-10 w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary-50 to-brand-50 border border-primary-100 flex items-center justify-center">

                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-primary-100 flex items-center justify-center text-primary-600">
                      <Icon
                        name={step.icon}
                        className="text-2xl"
                      />
                    </div>

                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-brand-600 text-white text-[10px] font-black flex items-center justify-center border-4 border-white shadow-primary">
                      {index + 1}
                    </span>

                  </div>

                  <div className="mt-6">

                    <span className="text-[10px] font-black tracking-[0.2em] text-brand-600">
                      {step.number}
                    </span>

                    <h3 className="mt-2 text-lg font-black text-ink-900">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm text-ink-500 leading-7 max-w-sm mx-auto">
                      {step.description}
                    </p>

                  </div>

                </motion.div>
              ))}

            </div>

          </div>

        </div>
      </section>

      {/* =====================================================
          WHY IT MATTERS
      ===================================================== */}

      <section className="py-20 lg:py-24 bg-gradient-to-br from-primary-50/70 via-white to-brand-50/70">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Visual */}
            <motion.div
              initial={{
                opacity: 0,
                x: -30,
              }}
              whileInView={{
                opacity: 1,
                x: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.6,
              }}
              className="relative"
            >

              <div className="relative max-w-lg mx-auto">

                <div className="aspect-[4/4.2] rounded-[2rem] bg-white border border-primary-100 shadow-primary p-6 overflow-hidden">

                  <div className="h-full rounded-[1.5rem] bg-gradient-to-br from-primary-100 via-brand-50 to-white relative overflow-hidden">

                    <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary-200/60 blur-sm" />

                    <div className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-brand-200/50 blur-sm" />

                    <div className="absolute inset-0 flex items-center justify-center">

                      <div className="relative">

                        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-white/90 border border-primary-100 shadow-xl flex items-center justify-center">

                          <Icon
                            name="bi-arrow-repeat"
                            className="bg-gradient-to-r from-primary-600 to-brand-600 bg-clip-text text-transparent text-6xl sm:text-7xl"
                          />

                        </div>

                        {/* Laptop */}
                        <div className="absolute -top-7 -right-10 w-16 h-16 rounded-2xl bg-white border border-primary-100 shadow-lg flex items-center justify-center text-primary-600 rotate-6">
                          <Icon
                            name="bi-laptop"
                            className="text-2xl"
                          />
                        </div>

                        {/* Furniture */}
                        <div className="absolute -bottom-6 -left-10 w-16 h-16 rounded-2xl bg-white border border-brand-100 shadow-lg flex items-center justify-center text-brand-600 -rotate-6">
                          <Icon
                            name="bi-house"
                            className="text-2xl"
                          />
                        </div>

                        {/* Heart */}
                        <div className="absolute -bottom-9 -right-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-brand-600 shadow-primary flex items-center justify-center text-white rotate-6">
                          <Icon
                            name="bi-heart-fill"
                            className="text-lg"
                          />
                        </div>

                      </div>

                    </div>

                    <div className="absolute top-5 left-5 px-3 py-2 rounded-xl bg-white/90 border border-primary-100 shadow-sm backdrop-blur">
                      <p className="text-[10px] font-black text-primary-700">
                        REUSE
                      </p>
                    </div>

                    <div className="absolute bottom-5 right-5 px-3 py-2 rounded-xl bg-white/90 border border-brand-100 shadow-sm backdrop-blur">
                      <p className="text-[10px] font-black text-brand-700">
                        RECONNECT
                      </p>
                    </div>

                  </div>

                </div>

              </div>

            </motion.div>

            {/* Copy */}
            <motion.div
              initial={{
                opacity: 0,
                x: 30,
              }}
              whileInView={{
                opacity: 1,
                x: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.6,
              }}
            >

              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary-600">

                <span className="w-5 h-px bg-primary-500" />

                Why it matters

              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink-900 leading-tight">

                One person's

                <span className="bg-gradient-to-r from-primary-600 to-brand-600 bg-clip-text text-transparent">
                  {' '}unused item
                </span>

                {' '}can be another person's opportunity.

              </h2>

              <p className="mt-6 text-ink-600 leading-8">
                We believe useful things should keep moving. Instead of
                allowing perfectly usable items to sit unused or become
                waste, Don't Trash It helps connect them with people
                who can actually use them.
              </p>

              <div className="mt-8 space-y-4">

                {/* Reason 1 */}
                <div className="flex gap-4">

                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-primary-100 flex items-center justify-center text-primary-600 shadow-sm">
                    <Icon name="bi-recycle" />
                  </div>

                  <div>
                    <h3 className="font-black text-ink-900">
                      Reduce unnecessary waste
                    </h3>

                    <p className="mt-1 text-sm text-ink-500 leading-6">
                      Keep useful items in circulation for longer.
                    </p>
                  </div>

                </div>

                {/* Reason 2 */}
                <div className="flex gap-4">

                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-brand-100 flex items-center justify-center text-brand-600 shadow-sm">
                    <Icon name="bi-people" />
                  </div>

                  <div>
                    <h3 className="font-black text-ink-900">
                      Strengthen communities
                    </h3>

                    <p className="mt-1 text-sm text-ink-500 leading-6">
                      Make it easier for people to help one another.
                    </p>
                  </div>

                </div>

                {/* Reason 3 */}
                <div className="flex gap-4">

                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-cyan-100 flex items-center justify-center text-cyan-600 shadow-sm">
                    <Icon name="bi-heart" />
                  </div>

                  <div>
                    <h3 className="font-black text-ink-900">
                      Give with purpose
                    </h3>

                    <p className="mt-1 text-sm text-ink-500 leading-6">
                      Turn things you no longer need into something meaningful.
                    </p>
                  </div>

                </div>

              </div>

              <Link
                to="/about"
                className="group mt-9 inline-flex items-center gap-2 text-sm font-black text-primary-600 hover:text-brand-600 transition-colors"
              >
                Learn more about Don't Trash It

                <Icon
                  name="bi-arrow-right"
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

            </motion.div>

          </div>

        </div>
      </section>

      {/* =====================================================
          GLOBAL COMMUNITIES
      ===================================================== */}

      <section className="py-20 lg:py-24 bg-white">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="rounded-[2rem] bg-ink-50 border border-ink-100 overflow-hidden shadow-soft">

            <div className="grid lg:grid-cols-2">

              {/* Copy */}
              <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">

                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary-600">

                  <span className="w-5 h-px bg-primary-500" />

                  Beyond one community

                </span>

                <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-ink-900">
                  Useful things can travel further.
                </h2>

                <p className="mt-5 text-ink-500 leading-8">
                  Communities are connected by generosity. Whether an
                  item stays nearby or reaches someone further away,
                  the goal is the same: keep useful things useful.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-3">

                  <div className="p-4 rounded-xl bg-white border border-primary-100 hover:border-primary-200 transition-colors">

                    <Icon
                      name="bi-globe2"
                      className="text-primary-600 text-lg"
                    />

                    <p className="mt-3 text-sm font-black text-ink-800">
                      Connected communities
                    </p>

                  </div>

                  <div className="p-4 rounded-xl bg-white border border-brand-100 hover:border-brand-200 transition-colors">

                    <Icon
                      name="bi-arrow-left-right"
                      className="text-brand-600 text-lg"
                    />

                    <p className="mt-3 text-sm font-black text-ink-800">
                      Meaningful exchanges
                    </p>

                  </div>

                </div>

              </div>

              {/* Globe visual */}
              <div className="relative min-h-[360px] lg:min-h-[500px] bg-gradient-to-br from-primary-100 via-brand-50 to-cyan-50 flex items-center justify-center overflow-hidden">

                <div className="absolute w-[360px] h-[360px] rounded-full border border-primary-200/70" />

                <div className="absolute w-[280px] h-[280px] rounded-full border border-brand-200/70" />

                <div className="absolute w-[190px] h-[190px] rounded-full border border-primary-300/60" />

                <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-white border border-primary-100 shadow-2xl flex items-center justify-center">

                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-primary-100 to-brand-100 flex items-center justify-center">

                    <Icon
                      name="bi-globe-americas"
                      className="text-primary-600 text-6xl sm:text-7xl"
                    />

                  </div>

                  <span className="absolute top-2 right-5 w-3 h-3 rounded-full bg-primary-500 shadow-primary" />

                  <span className="absolute bottom-6 left-1 w-3 h-3 rounded-full bg-cyan-500 shadow-cyan" />

                  <span className="absolute top-16 -left-2 w-2.5 h-2.5 rounded-full bg-brand-500 shadow-brand" />

                </div>

                <div className="absolute top-10 left-8 sm:left-14 px-3 py-2 rounded-xl bg-white shadow-md border border-primary-100">

                  <span className="flex items-center gap-2 text-xs font-bold text-ink-600">

                    <span className="w-2 h-2 rounded-full bg-primary-500" />

                    Community

                  </span>

                </div>

                <div className="absolute bottom-12 right-8 sm:right-14 px-3 py-2 rounded-xl bg-white shadow-md border border-brand-100">

                  <span className="flex items-center gap-2 text-xs font-bold text-ink-600">

                    <span className="w-2 h-2 rounded-full bg-brand-500" />

                    Connection

                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* =====================================================
          TESTIMONIALS
      ===================================================== */}

      <section className="py-20 lg:py-24 bg-ink-50">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="max-w-2xl mb-10">

            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary-600">

              <span className="w-5 h-px bg-primary-500" />

              Community voices

            </span>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-ink-900">
              Built around people helping people.
            </h2>

          </div>

          <div className="grid md:grid-cols-3 gap-5">

            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.initials}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.08,
                }}
                className="bg-white rounded-2xl border border-ink-100 p-6 sm:p-7 shadow-sm hover:shadow-card-hover transition-shadow"
              >

                <div className="flex gap-1 text-warning-500 mb-5">

                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                      key={star}
                      name="bi-star-fill"
                      className="text-xs"
                    />
                  ))}

                </div>

                <p className="text-sm leading-7 text-ink-600">
                  “{testimonial.quote}”
                </p>

                <div className="mt-6 pt-5 border-t border-ink-100 flex items-center gap-3">

                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-brand-100 text-primary-700 flex items-center justify-center text-xs font-black">
                    {testimonial.initials}
                  </div>

                  <div>
                    <p className="text-sm font-black text-ink-800">
                      {testimonial.name}
                    </p>

                    <p className="text-xs text-ink-400 mt-0.5">
                      {testimonial.role}
                    </p>
                  </div>

                </div>

              </motion.div>
            ))}

          </div>

        </div>
      </section>

      {/* =====================================================
          FINAL CTA
      ===================================================== */}

      <section className="py-20 lg:py-24 bg-white">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-500 via-primary-600 to-brand-600 px-6 py-14 sm:px-12 lg:px-16 text-center shadow-large">

            {/* Decorative shapes */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10" />

            <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-black/5" />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[20rem] rounded-full bg-brand-400/10 blur-3xl" />

            <div className="relative max-w-3xl mx-auto">

              <div className="mx-auto w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">

                <Icon
                  name="bi-heart-fill"
                  className="text-white text-xl"
                />

              </div>

              <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                Have something useful?
              </h2>

              <p className="mt-4 text-primary-50 text-base sm:text-lg leading-8 max-w-2xl mx-auto">
                Don't let useful things sit unused. Share them with
                someone who can give them another life.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">

                <Link
                  to="/create"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-primary-700 font-black text-sm shadow-lg hover:bg-primary-50 hover:-translate-y-0.5 transition-all"
                >
                  <Icon name="bi-plus-lg" />
                  List an Item
                </Link>

                <Link
                  to="/browse"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary-700/30 border border-white/20 text-white font-black text-sm hover:bg-brand-600/30 transition-all"
                >
                  Browse Items

                  <Icon name="bi-arrow-right" />
                </Link>

              </div>

            </div>

          </div>

        </div>
      </section>

    </main>
  );
};

export default LandingPage;