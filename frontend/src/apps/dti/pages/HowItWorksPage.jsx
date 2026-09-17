import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HowItWorksPage = () => {
  const steps = [
    {
      number: '01',
      icon: 'bi bi-person-plus',
      eyebrow: 'Start here',
      title: 'Create your account',
      description:
        "Join the network in a few clicks. Tell us where you're based and a little about yourself so the community knows who they're connecting with.",
      detail: 'Free to join',
    },
    {
      number: '02',
      icon: 'bi bi-camera',
      eyebrow: 'Give it purpose',
      title: 'List what you have',
      description:
        'Take a few photos, describe the item honestly, add its condition and tell potential recipients where it is.',
      detail: 'A few minutes',
    },
    {
      number: '03',
      icon: 'bi bi-people',
      eyebrow: 'Find the right person',
      title: 'Review applications',
      description:
        'People who genuinely need your item can apply. Read their profiles, messages and reasons for requesting it.',
      detail: 'You stay in control',
    },
    {
      number: '04',
      icon: 'bi bi-check2-circle',
      eyebrow: 'Make the choice',
      title: 'Choose a recipient',
      description:
        'Select the person you believe will benefit most. The handoff is recorded openly so the community can celebrate the impact.',
      detail: 'Your decision',
    },
    {
      number: '05',
      icon: 'bi bi-box-seam',
      eyebrow: 'Send it forward',
      title: 'Arrange the delivery',
      description:
        'Choose how the item gets there. We help make shipping costs clear so everyone knows what to expect before anything moves.',
      detail: 'Clear costs',
    },
    {
      number: '06',
      icon: 'bi bi-stars',
      eyebrow: 'The best part',
      title: 'Give it a second life',
      description:
        'The item reaches someone who needs it, stays useful for longer and becomes part of a bigger story of reuse and generosity.',
      detail: 'Real-world impact',
    },
  ];

  const principles = [
    {
      icon: 'bi bi-eye',
      title: 'Transparent',
      description:
        'Important handoff decisions happen in the open. The community can see the impact being created.',
    },
    {
      icon: 'bi bi-shield-check',
      title: 'Community-first',
      description:
        'Profiles, reviews and meaningful conversations help people make informed decisions.',
    },
    {
      icon: 'bi bi-globe2',
      title: 'Built for anywhere',
      description:
        'Useful things should not be limited by geography when someone somewhere else needs them.',
    },
    {
      icon: 'bi bi-arrow-repeat',
      title: 'Designed for reuse',
      description:
        'The goal is simple: keep good things useful instead of sending them straight to waste.',
    },
  ];

  return (
    <div className="overflow-hidden bg-ink-50/30">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-ink-50/30">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-20 h-[30rem] w-[30rem] rounded-full bg-primary-50/80 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-8 lg:px-10 lg:pb-28 lg:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_0.8fr]">
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-primary-500" />
                How it works
              </div>

              <h1 className="max-w-3xl text-[2.6rem] font-black leading-[0.94] tracking-[-0.055em] text-ink-900 sm:text-6xl md:text-7xl">
                From something
                <br />
                you <span className="text-primary-600">don't need</span>
                <br />
                to something
                <br />
                someone does.
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-ink-500 sm:text-xl">
                We make it simple to move useful things from people who have
                them to people who need them.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Start giving
                  <i className="bi bi-arrow-up-right transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <Link
                  to="/browse"
                  className="inline-flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-6 py-3.5 text-sm font-bold text-ink-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/60"
                >
                  See what's available
                  <i className="bi bi-grid" />
                </Link>
              </div>
            </motion.div>

            {/* Journey visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative mx-auto w-full max-w-[500px]"
            >
              <div className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                    The journey
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-[10px] font-bold text-primary-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    6 simple steps
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute bottom-7 left-[21px] top-7 w-px bg-primary-100" />
                  {[
                    {
                      icon: 'bi bi-camera',
                      title: 'You have something useful',
                      text: 'Laptop, bicycle, books...',
                    },
                    {
                      icon: 'bi bi-people',
                      title: 'Someone needs it',
                      text: 'Real people, real requests.',
                    },
                    {
                      icon: 'bi bi-box-seam',
                      title: 'It moves',
                      text: 'A handoff begins.',
                    },
                    {
                      icon: 'bi bi-heart-fill',
                      title: 'It gets a second life',
                      text: 'And the story continues.',
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + index * 0.15 }}
                      className="relative mb-6 flex gap-4 last:mb-0"
                    >
                      <div className="relative z-10 flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                        <i className={item.icon} />
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-black text-ink-900">{item.title}</p>
                        <p className="mt-1 text-xs text-ink-400">{item.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 p-5 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                      <i className="bi bi-stars" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">That's the whole idea.</p>
                      <p className="mt-1 text-[10px] text-primary-100">Useful things keep moving.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── QUICK SUMMARY ── */}
      <section className="border-y border-ink-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 md:grid-cols-4 lg:px-10">
          {[
            ['01', 'List', 'Tell the community what you have.'],
            ['02', 'Connect', 'Meet people who need it.'],
            ['03', 'Send', 'Agree on the handoff.'],
            ['04', 'Impact', 'Give the item another life.'],
          ].map(([number, title, description], index) => (
            <motion.div
              key={number}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              viewport={{ once: true }}
              className={`px-4 py-8 sm:px-6 lg:px-8 ${
                index < 3 ? 'border-r border-ink-100' : ''
              }`}
            >
              <p className="text-[10px] font-black tracking-widest text-primary-600">{number}</p>
              <p className="mt-2 text-sm font-black text-ink-900">{title}</p>
              <p className="mt-1 text-xs leading-5 text-ink-400">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── MAIN STEPS ── */}
      <section className="bg-white py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-2xl"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-600">The complete journey</p>
            <h2 className="text-4xl font-black tracking-[-0.045em] text-ink-900 sm:text-5xl">
              Six steps.<br />One meaningful handoff.
            </h2>
            <p className="mt-5 text-base leading-7 text-ink-500">
              Whether you're giving something away or looking for something you need, the process is designed to stay simple and clear.
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute bottom-0 left-[50%] top-0 hidden w-px -translate-x-1/2 bg-ink-100 lg:block" />
            <div className="space-y-5 lg:space-y-0">
              {steps.map((step, index) => {
                const isEven = index % 2 === 0;
                return (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, x: isEven ? -25 : 25 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55 }}
                    viewport={{ once: true, amount: 0.2 }}
                    className="relative lg:grid lg:min-h-[300px] lg:grid-cols-2 lg:items-center"
                  >
                    <div className={`${isEven ? 'lg:pr-20 lg:text-right' : 'lg:col-start-2 lg:pl-20'}`}>
                      <div className={`rounded-xl border border-ink-100/80 bg-white p-7 shadow-sm transition hover:border-primary-200 hover:shadow-md sm:p-8 ${isEven ? 'lg:ml-auto' : ''}`}>
                        <div className={`flex items-start gap-4 ${isEven ? 'lg:flex-row-reverse' : ''}`}>
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                            <i className={`${step.icon} text-lg`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-600">{step.eyebrow}</p>
                            <h3 className="mt-1 text-xl font-black tracking-tight text-ink-900">{step.title}</h3>
                          </div>
                        </div>
                        <p className="mt-5 text-sm leading-7 text-ink-500">{step.description}</p>
                        <div className={`mt-5 inline-flex items-center gap-2 rounded-full bg-ink-50 px-3 py-1.5 text-[10px] font-bold text-ink-500 ${isEven ? 'lg:float-right' : ''}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                          {step.detail}
                        </div>
                      </div>
                    </div>
                    <div className="absolute left-1/2 top-1/2 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[6px] border-white bg-gradient-to-r from-primary-500 to-brand-600 text-xs font-black text-white shadow-lg lg:flex">
                      {step.number}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── DONOR / RECIPIENT ── */}
      <section className="bg-ink-50/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-600">There are two sides to every handoff</p>
            <h2 className="text-4xl font-black tracking-[-0.04em] text-ink-900 sm:text-5xl">Give something.<br className="sm:hidden" /> Find something.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Donor — primary gradient background */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-brand-700 p-8 text-white shadow-sm sm:p-10"
            >
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary-300/20 blur-3xl" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
                  <i className="bi bi-box-arrow-up-right text-lg" />
                </div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-primary-200">For donors</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight">You have something useful.</h3>
                <p className="mt-4 max-w-md text-sm leading-7 text-primary-100">
                  List it, explain why you're giving it away and choose the person you believe will benefit most.
                </p>
                <div className="mt-8 space-y-3">
                  {['List an item in minutes', 'Review people who apply', 'Choose your recipient', 'Arrange the handoff'].map((item, idx) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-primary-100">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-primary-200">{idx + 1}</span>
                      {item}
                    </div>
                  ))}
                </div>
                <Link to="/register" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-50">
                  Give something away <i className="bi bi-arrow-right" />
                </Link>
              </div>
            </motion.div>

            {/* Recipient — white card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white p-8 shadow-sm sm:p-10"
            >
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <i className="bi bi-search text-lg" />
                </div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-primary-600">For recipients</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-ink-900">You need something.</h3>
                <p className="mt-4 max-w-md text-sm leading-7 text-ink-500">
                  Browse available items, tell the donor why you need one and keep an eye on your applications.
                </p>
                <div className="mt-8 space-y-3">
                  {['Browse available items', 'Apply for what you need', 'Tell your story', 'Arrange delivery with the donor'].map((item, idx) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-ink-600">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-[10px] font-bold text-primary-600">{idx + 1}</span>
                      {item}
                    </div>
                  ))}
                </div>
                <Link to="/browse" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:shadow-md">
                  Browse available items <i className="bi bi-arrow-right" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TRUST / PRINCIPLES ── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-14 lg:grid-cols-[0.75fr_1.25fr]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-600">Built around trust</p>
              <h2 className="text-4xl font-black leading-tight tracking-[-0.04em] text-ink-900 sm:text-5xl">
                Good intentions deserve a good system.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-ink-500">
                Giving something away should feel rewarding, not complicated. That's why transparency and community are at the centre of the experience.
              </p>
            </motion.div>

            <div className="grid gap-3 sm:grid-cols-2">
              {principles.map((principle, index) => (
                <motion.div
                  key={principle.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                  viewport={{ once: true }}
                  className="rounded-xl border border-ink-100/80 bg-white p-6 shadow-sm transition hover:border-primary-200 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 shadow-sm">
                    <i className={principle.icon} />
                  </div>
                  <h3 className="mt-7 text-base font-black text-ink-900">{principle.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-500">{principle.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-brand-700 py-24 lg:py-32">
        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-primary-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-primary-300/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl px-5 text-center sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-primary-600 shadow-lg">
              DTI
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-200">Ready when you are</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.045em] text-white sm:text-6xl">
              The next useful thing<br />could start with <span className="text-primary-200">you.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-primary-100">
              Don't let something useful become something forgotten. Give it a destination.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-50"
              >
                Create your account <i className="bi bi-arrow-up-right" />
              </Link>
              <Link
                to="/browse"
                className="inline-flex items-center gap-3 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                Explore items <i className="bi bi-grid" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;