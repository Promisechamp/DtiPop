import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Camera,
  Users,
  CheckCircle2,
  Package,
  Sparkles,
  Eye,
  ShieldCheck,
  Globe,
  RefreshCw,
  ArrowUpRight,
  ArrowRight,
  Grid3x3,
  Heart,
  Search,
  Boxes,
  Upload,
} from 'lucide-react';


/* =========================================================
   DATA
========================================================= */

const steps = [
  {
    number: '01',
    icon: UserPlus,
    eyebrow: 'Start here',
    title: 'Create your account',
    description:
      "Join the network in a few clicks. Tell us where you're based and a little about yourself so the community knows who they're connecting with.",
    detail: 'Free to join',
  },
  {
    number: '02',
    icon: Camera,
    eyebrow: 'Give it purpose',
    title: 'List what you have',
    description:
      'Take a few photos, describe the item honestly, add its condition and tell potential recipients where it is.',
    detail: 'A few minutes',
  },
  {
    number: '03',
    icon: Users,
    eyebrow: 'Find the right person',
    title: 'Review applications',
    description:
      'People who genuinely need your item can apply. Read their profiles, messages and reasons for requesting it.',
    detail: 'You stay in control',
  },
  {
    number: '04',
    icon: CheckCircle2,
    eyebrow: 'Make the choice',
    title: 'Choose a recipient',
    description:
      'Select the person you believe will benefit most. The handoff is recorded openly so the community can celebrate the impact.',
    detail: 'Your decision',
  },
  {
    number: '05',
    icon: Package,
    eyebrow: 'Send it forward',
    title: 'Arrange the delivery',
    description:
      'Choose how the item gets there. We help make shipping costs clear so everyone knows what to expect before anything moves.',
    detail: 'Clear costs',
  },
  {
    number: '06',
    icon: Sparkles,
    eyebrow: 'The best part',
    title: 'Give it a second life',
    description:
      'The item reaches someone who needs it, stays useful for longer and becomes part of a bigger story of reuse and generosity.',
    detail: 'Real-world impact',
  },
];

const principles = [
  {
    icon: Eye,
    title: 'Transparent',
    description:
      'Important handoff decisions happen in the open. The community can see the impact being created.',
  },
  {
    icon: ShieldCheck,
    title: 'Community-first',
    description:
      'Profiles, reviews and meaningful conversations help people make informed decisions.',
  },
  {
    icon: Globe,
    title: 'Built for anywhere',
    description:
      'Useful things should not be limited by geography when someone somewhere else needs them.',
  },
  {
    icon: RefreshCw,
    title: 'Designed for reuse',
    description:
      'The goal is simple: keep good things useful instead of sending them straight to waste.',
  },
];

const journeySteps = [
  {
    icon: Camera,
    title: 'You have something useful',
    text: 'Laptop, bicycle, books…',
  },
  {
    icon: Users,
    title: 'Someone needs it',
    text: 'Real people, real requests.',
  },
  {
    icon: Package,
    title: 'It moves',
    text: 'A handoff begins.',
  },
  {
    icon: Heart,
    title: 'It gets a second life',
    text: 'And the story continues.',
  },
];

const summarySteps = [
  ['01', 'List', 'Tell the community what you have.'],
  ['02', 'Connect', 'Meet people who need it.'],
  ['03', 'Send', 'Agree on the handoff.'],
  ['04', 'Impact', 'Give the item another life.'],
];

const donorSteps = [
  'List an item in minutes',
  'Review people who apply',
  'Choose your recipient',
  'Arrange the handoff',
];

const recipientSteps = [
  'Browse available items',
  'Apply for what you need',
  'Tell your story',
  'Arrange delivery with the donor',
];

/* =========================================================
   PAGE
========================================================= */

const HowItWorksPage = () => {
  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* =========================================================
            HERO
        ========================================================= */}

        <section className="relative mb-7 overflow-hidden ">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-primary-100/60 blur-3xl" />
            <div className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-primary-50/80 blur-3xl" />
          </div>

          <div className="grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_0.85fr] lg:gap-14 lg:p-14">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-700">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                How it works
              </div>

              <h1 className="mt-6 text-3xl font-black leading-tight tracking-tight text-ink-950 sm:text-4xl lg:text-5xl">
                From something you{' '}
                <span className="text-primary-600">don't need</span> to
                something someone does.
              </h1>

              <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-ink-500 sm:text-base">
                We make it simple to move useful things from people who have
                them to people who need them.
              </p>

              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  Start giving
                  <ArrowUpRight size={15} />
                </Link>

                <Link
                  to="/browse"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
                >
                  See what's available
                  <Grid3x3 size={15} />
                </Link>
              </div>
            </motion.div>

            {/* Journey visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative mx-auto w-full max-w-[460px]"
            >
              <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-400">
                    The journey
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-[10px] font-extrabold text-primary-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    6 simple steps
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute bottom-7 left-[21px] top-7 w-px bg-primary-100" />

                  {journeySteps.map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + index * 0.1 }}
                        className="relative mb-5 flex gap-4 last:mb-0"
                      >
                        <div className="relative z-10 flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                          <Icon size={16} />
                        </div>

                        <div className="pt-1">
                          <p className="text-sm font-black text-ink-950">
                            {item.title}
                          </p>

                          <p className="mt-1 text-xs font-medium text-ink-400">
                            {item.text}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                    <Sparkles size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-primary-900">
                      That's the whole idea.
                    </p>

                    <p className="mt-0.5 text-[11px] font-medium text-primary-700">
                      Useful things keep moving.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =========================================================
            QUICK SUMMARY
        ========================================================= */}

        <section className="mb-7 overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {summarySteps.map(([number, title, description], index) => (
              <motion.div
                key={number}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                viewport={{ once: true }}
                className={`p-5 sm:p-6 ${
                  index < 3 ? 'border-r border-ink-100' : ''
                } ${
                  index >= 2 ? 'border-t border-ink-100 md:border-t-0' : ''
                }`}
              >
                <p className="text-[10px] font-extrabold tracking-widest text-primary-600">
                  {number}
                </p>

                <p className="mt-2 text-sm font-black text-ink-950">{title}</p>

                <p className="mt-1 text-xs font-medium leading-5 text-ink-400">
                  {description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* =========================================================
            MAIN STEPS
        ========================================================= */}

        <section className="mb-7">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 max-w-2xl"
          >
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
              The complete journey
            </p>

            <h2 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
              Six steps. One meaningful handoff.
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-ink-500">
              Whether you're giving something away or looking for something you
              need, the process is designed to stay simple and clear.
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute bottom-0 left-[50%] top-0 hidden w-px -translate-x-1/2 bg-ink-100 lg:block" />

            <div className="space-y-4 lg:space-y-0">
              {steps.map((step, index) => {
                const isEven = index % 2 === 0;
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, x: isEven ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true, amount: 0.2 }}
                    className="relative lg:grid lg:min-h-[280px] lg:grid-cols-2 lg:items-center"
                  >
                    <div
                      className={`${
                        isEven
                          ? 'lg:pr-16 lg:text-right'
                          : 'lg:col-start-2 lg:pl-16'
                      }`}
                    >
                      <div
                        className={`rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm transition hover:border-ink-200 hover:shadow-md sm:p-7 ${
                          isEven ? 'lg:ml-auto' : ''
                        }`}
                      >
                        <div
                          className={`flex items-start gap-4 ${
                            isEven ? 'lg:flex-row-reverse' : ''
                          }`}
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                            <Icon size={18} />
                          </div>

                          <div className="flex-1">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                              {step.eyebrow}
                            </p>

                            <h3 className="mt-1 text-lg font-black tracking-tight text-ink-950">
                              {step.title}
                            </h3>
                          </div>
                        </div>

                        <p className="mt-4 text-sm font-medium leading-6 text-ink-500">
                          {step.description}
                        </p>

                        <div
                          className={`mt-4 inline-flex items-center gap-2 rounded-full border border-ink-100 bg-ink-50 px-3 py-1.5 text-[10px] font-extrabold text-ink-500 ${
                            isEven ? 'lg:float-right' : ''
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                          {step.detail}
                        </div>
                      </div>
                    </div>

                    <div className="absolute left-1/2 top-1/2 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[6px] border-white bg-primary-600 text-xs font-black text-white shadow-md lg:flex">
                      {step.number}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            DONOR / RECIPIENT
        ========================================================= */}

        <section className="mb-7">
          <div className="mb-6 text-center">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
              There are two sides to every handoff
            </p>

            <h2 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
              Give something. Find something.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Donor */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[26px] bg-primary-600 p-7 text-white shadow-sm sm:p-9"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white">
                  <Upload size={18} />
                </div>

                <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                  For donors
                </p>

                <h3 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  You have something useful.
                </h3>

                <p className="mt-3 max-w-md text-sm font-medium leading-6 text-white/80">
                  List it, explain why you're giving it away and choose the
                  person you believe will benefit most.
                </p>

                <div className="mt-6 space-y-2.5">
                  {donorSteps.map((item, idx) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm font-medium text-white/90"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-extrabold text-white">
                        {idx + 1}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>

                <Link
                  to="/register"
                  className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-primary-700 transition hover:bg-primary-50"
                >
                  Give something away
                  <ArrowRight size={15} />
                </Link>
              </div>
            </motion.div>

            {/* Recipient */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[26px] border border-ink-100 bg-white p-7 shadow-sm sm:p-9"
            >
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <Search size={18} />
                </div>

                <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                  For recipients
                </p>

                <h3 className="mt-1 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                  You need something.
                </h3>

                <p className="mt-3 max-w-md text-sm font-medium leading-6 text-ink-500">
                  Browse available items, tell the donor why you need one and
                  keep an eye on your applications.
                </p>

                <div className="mt-6 space-y-2.5">
                  {recipientSteps.map((item, idx) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm font-medium text-ink-600"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-extrabold text-primary-600">
                        {idx + 1}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>

                <Link
                  to="/browse"
                  className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  Browse available items
                  <ArrowRight size={15} />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =========================================================
            TRUST / PRINCIPLES
        ========================================================= */}

        <section className="mb-7">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                Built around trust
              </p>

              <h2 className="text-2xl font-black leading-tight tracking-tight text-ink-950 sm:text-3xl">
                Good intentions deserve a good system.
              </h2>

              <p className="mt-4 max-w-md text-sm font-medium leading-7 text-ink-500">
                Giving something away should feel rewarding, not complicated.
                That's why transparency and community are at the centre of the
                experience.
              </p>
            </motion.div>

            <div className="grid gap-3 sm:grid-cols-2">
              {principles.map((principle, index) => {
                const Icon = principle.icon;

                return (
                  <motion.div
                    key={principle.title}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07 }}
                    viewport={{ once: true }}
                    className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-ink-200 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                      <Icon size={16} />
                    </div>

                    <h3 className="mt-5 text-sm font-black text-ink-950">
                      {principle.title}
                    </h3>

                    <p className="mt-1.5 text-xs font-medium leading-5 text-ink-500">
                      {principle.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================= */}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-[26px] bg-primary-600 shadow-sm"
        >
          <div className="relative px-6 py-12 text-center sm:px-10 sm:py-16">
            <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

            <div className="relative z-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white">
                <Boxes size={24} />
              </div>

              <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                Ready when you are
              </p>

              <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                The next useful thing could start with{' '}
                <span className="text-white/80">you.</span>
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-6 text-white/80">
                Don't let something useful become something forgotten. Give it
                a destination.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-primary-700 transition hover:bg-primary-50"
                >
                  Create your account
                  <ArrowUpRight size={15} />
                </Link>

                <Link
                  to="/browse"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 bg-transparent px-5 text-sm font-extrabold text-white transition hover:border-white/60 hover:bg-white/10"
                >
                  Explore items
                  <Grid3x3 size={15} />
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default HowItWorksPage;