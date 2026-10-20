import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  ShieldCheck,
  Globe,
  RefreshCw,
  Target,
  Eye,
  Sparkles,
  Users,
  Recycle,
  Code,
  ArrowUpRight,
  ArrowRight,
  Grid3x3,
  Boxes,
} from 'lucide-react';


/* =========================================================
   DATA
========================================================= */

const founder = {
  name: 'Promise Uche',
  role: 'Founder & Lead Developer',
  bio: 'Passionate about reducing waste and connecting communities through technology.',
  avatar:
    'https://res.cloudinary.com/djda2nagd/image/upload/v1785845286/kam5bpxnjtkxy9rtnjzy.jpg',
};

const values = [
  {
    icon: Heart,
    number: '01',
    title: 'Generosity',
    description:
      'We believe giving should feel natural. When something is no longer useful to you, it can still mean everything to someone else.',
  },
  {
    icon: ShieldCheck,
    number: '02',
    title: 'Transparency',
    description:
      'Trust grows when people can see what is happening. We aim to make every meaningful handoff clear and accountable.',
  },
  {
    icon: Globe,
    number: '03',
    title: 'Global community',
    description:
      'Need does not stop at a border. We connect people across cities, countries and cultures around things that still have value.',
  },
  {
    icon: RefreshCw,
    number: '04',
    title: 'Second lives',
    description:
      'We want useful things to stay useful for as long as possible, reducing unnecessary waste through reuse.',
  },
];

const missionTags = ['Give', 'Connect', 'Reuse', 'Impact'];

/* =========================================================
   PAGE
========================================================= */

const AboutPage = () => {
  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] py-5 lg:py-7">
        {/* =========================================================
            HERO
        ========================================================= */}

        <section className="relative mb-7 overflow-hidden ">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-primary-100/60 blur-3xl" />
            <div className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-brand-50/80 blur-3xl" />
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
                About Don't Trash It
              </div>

              <h1 className="mt-6 text-3xl font-black leading-tight tracking-tight text-ink-950 sm:text-4xl lg:text-5xl">
                Useful things deserve{' '}
                <span className="text-primary-600">another life.</span>
              </h1>

              <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-ink-500 sm:text-base">
                Don't Trash It exists to make one simple idea possible: when
                you no longer need something, someone else should have the
                chance to use it.
              </p>

              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  Join the mission
                  <ArrowUpRight size={15} />
                </Link>

                <Link
                  to="/how-it-works"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
                >
                  See how it works
                  <ArrowRight size={15} />
                </Link>
              </div>
            </motion.div>

            {/* Belief visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative mx-auto w-full max-w-[440px]"
            >
              <div className="relative overflow-hidden rounded-[26px] bg-primary-600 p-6 shadow-sm sm:p-8">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
                      Our belief
                    </span>

                    <Sparkles size={16} className="text-white/70" />
                  </div>

                  <div className="py-10">
                    <p className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                      "Don't throw away{' '}
                      <span className="text-white/70">
                        what someone else might need.
                      </span>
                      "
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <Recycle size={18} className="text-white/70" />

                      <p className="mt-6 text-xs font-extrabold text-white">
                        Less waste
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <Users size={18} className="text-white/70" />

                      <p className="mt-6 text-xs font-extrabold text-white">
                        More opportunity
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =========================================================
            BIG STATEMENT
        ========================================================= */}

        <section className="mb-7 overflow-hidden rounded-[26px] border border-ink-100 bg-white px-6 py-12 shadow-sm sm:px-10 sm:py-16 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
              Why we exist
            </p>

            <h2 className="mt-4 text-2xl font-black leading-tight tracking-tight text-ink-950 sm:text-3xl lg:text-4xl">
              The distance between{' '}
              <span className="text-primary-600">surplus</span> and{' '}
              <span className="text-primary-600">need</span> shouldn't be a
              dead end.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-7 text-ink-500 sm:text-base">
              Around us are perfectly useful things sitting unused because
              their owners no longer need them. At the same time, other people
              are searching for exactly those things.
            </p>
          </motion.div>
        </section>

        {/* =========================================================
            MISSION + VISION
        ========================================================= */}

        <section className="mb-7">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[26px] bg-primary-600 p-7 text-white shadow-sm sm:p-9"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white">
                  <Target size={18} />
                </div>

                <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                  Our mission
                </p>

                <h3 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  Connect surplus with need.
                </h3>

                <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-white/80">
                  We are building a global community where giving is simple,
                  transparent and meaningful. Our goal is to help useful items
                  find people who can actually use them.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {missionTags.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-extrabold text-white/90"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[26px] border border-ink-100 bg-white p-7 shadow-sm sm:p-9"
            >
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <Eye size={18} />
                </div>

                <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                  Our vision
                </p>

                <h3 className="mt-1 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                  A world where useful things keep moving.
                </h3>

                <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-ink-500">
                  We imagine a more circular world where people have easier
                  access to resources, communities trust one another and fewer
                  useful things become waste.
                </p>

                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
                    <RefreshCw size={14} />
                  </div>

                  <p className="text-xs font-extrabold text-ink-600">
                    Keep useful things in circulation.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =========================================================
            VALUES
        ========================================================= */}

        <section className="mb-7">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 max-w-2xl"
          >
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
              What guides us
            </p>

            <h2 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
              The principles behind DTI.
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-ink-500">
              Technology is only the tool. The real foundation is how people
              treat one another and the world around them.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => {
              const Icon = value.icon;

              return (
                <motion.div
                  key={value.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                  viewport={{ once: true }}
                  className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
                >
                  <span className="absolute right-4 top-2 text-5xl font-black tracking-tight text-ink-50 transition-colors group-hover:text-primary-50">
                    {value.number}
                  </span>

                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                      <Icon size={16} />
                    </div>

                    <h3 className="mt-6 text-sm font-black text-ink-950">
                      {value.title}
                    </h3>

                    <p className="mt-2 text-xs font-medium leading-5 text-ink-500">
                      {value.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            FOUNDER
        ========================================================= */}

        <section className="mb-7">
          <div className="grid items-center gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-12">
            {/* Founder image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative mx-auto w-full max-w-sm"
            >
              <div className="relative overflow-hidden rounded-[26px] bg-primary-600 p-4 shadow-sm">
                <div className="overflow-hidden rounded-2xl bg-ink-100">
                  <img
                    src={founder.avatar}
                    alt={founder.name}
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>

                <div className="absolute bottom-7 left-7 rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 shadow-md">
                  <p className="text-xs font-black text-ink-950">
                    Founder & Lead Developer
                  </p>

                  <p className="mt-0.5 text-[10px] font-bold text-ink-400">
                    Don't Trash It
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Founder story */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                The person behind the idea
              </p>

              <h2 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Built from a simple belief.
              </h2>

              <p className="mt-5 text-sm font-medium leading-7 text-ink-500 sm:text-base">
                Don't Trash It was founded by{' '}
                <span className="font-extrabold text-ink-800">
                  {founder.name}
                </span>
                , a developer passionate about using technology to solve
                practical problems and create stronger communities.
              </p>

              <p className="mt-3 text-sm font-medium leading-7 text-ink-500 sm:text-base">
                The idea behind DTI is simple: there are countless useful
                things sitting unused while other people are looking for those
                exact resources. The challenge is connecting the two.
              </p>

              <div className="mt-6 border-l-2 border-primary-500 pl-4">
                <p className="text-base font-black leading-7 text-ink-900 sm:text-lg">
                  "If something still has value, its story shouldn't end just
                  because its current owner is finished with it."
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <Code size={16} />
                </div>

                <div>
                  <p className="text-sm font-black text-ink-950">
                    {founder.name}
                  </p>

                  <p className="text-[11px] font-bold text-ink-400">
                    {founder.role}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =========================================================
            MANIFESTO
        ========================================================= */}

        <section className="mb-7">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[26px] bg-primary-600 p-7 shadow-sm sm:p-10 lg:p-12"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white">
                  <Sparkles size={16} />
                </div>

                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                  Our manifesto
                </span>
              </div>

              <div className="mt-8 max-w-3xl">
                <p className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                  We believe that{' '}
                  <span className="text-white/70">generosity</span> can scale.
                </p>

                <p className="mt-5 text-sm font-medium leading-7 text-white/80 sm:text-base">
                  That technology can make giving easier. That transparency can
                  make communities stronger. That a laptop, a bicycle, a book
                  or a sewing machine can mean something completely different
                  to someone who genuinely needs it.
                </p>

                <p className="mt-4 text-sm font-extrabold leading-7 text-white sm:text-base">
                  And most importantly, we believe the things we no longer need
                  don't have to become waste.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* =========================================================
            CTA
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
                Be part of it
              </p>

              <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                A better destination starts with{' '}
                <span className="text-white/80">one item.</span>
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-6 text-white/80">
                Give something useful another chance. Find something you need.
                Help us build a world where good things keep moving.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-primary-700 transition hover:bg-primary-50"
                >
                  Join the mission
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

export default AboutPage;