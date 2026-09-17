import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';


const AboutPage = () => {
  const founder = {
    name: 'Promise Uche',
    role: 'Founder & Lead Developer',
    bio: 'Passionate about reducing waste and connecting communities through technology.',
    avatar:
      'https://res.cloudinary.com/djda2nagd/image/upload/v1785845286/kam5bpxnjtkxy9rtnjzy.jpg',
  };

  const values = [
    {
      icon: 'bi bi-heart-fill',
      number: '01',
      title: 'Generosity',
      description:
        'We believe giving should feel natural. When something is no longer useful to you, it can still mean everything to someone else.',
    },
    {
      icon: 'bi bi-shield-check',
      number: '02',
      title: 'Transparency',
      description:
        'Trust grows when people can see what is happening. We aim to make every meaningful handoff clear and accountable.',
    },
    {
      icon: 'bi bi-globe2',
      number: '03',
      title: 'Global community',
      description:
        'Need does not stop at a border. We connect people across cities, countries and cultures around things that still have value.',
    },
    {
      icon: 'bi bi-arrow-repeat',
      number: '04',
      title: 'Second lives',
      description:
        'We want useful things to stay useful for as long as possible, reducing unnecessary waste through reuse.',
    },
  ];

  return (
    <div className="rounded overflow-hidden ">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-20 h-[30rem] w-[30rem] rounded-full bg-brand-50/80 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-8 lg:px-10 lg:pb-28 lg:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_0.75fr]">
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-primary-500" />
                About Don't Trash It
              </div>

              <h1 className="max-w-4xl text-[3.7rem] font-black leading-[0.94] tracking-[-0.055em] text-ink-900 sm:text-6xl md:text-7xl lg:text-[5.7rem]">
                Useful things
                <br />
                deserve
                <br />
                <span className="text-primary-600">another life.</span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-ink-500 sm:text-xl">
                Don't Trash It exists to make one simple idea possible:
                when you no longer need something, someone else should have
                the chance to use it.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-3 rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-bold text-white shadow-primary transition hover:-translate-y-0.5 hover:bg-primary-700"
                >
                  Join the mission
                  <i className="bi bi-arrow-up-right transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-3 rounded-xl border border-ink-300 bg-white px-6 py-3.5 text-sm font-bold text-ink-700 shadow-sm transition hover:border-primary-300 hover:bg-primary-50"
                >
                  See how it works
                  <i className="bi bi-arrow-right" />
                </Link>
              </div>
            </motion.div>

            {/* Hero visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative mx-auto w-full max-w-[480px]"
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-brand-700 p-7 shadow-card sm:p-9">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-300/20 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-200">
                      Our belief
                    </span>
                    <i className="bi bi-stars text-lg text-primary-200" />
                  </div>
                  <div className="py-16">
                    <p className="text-3xl font-black leading-tight tracking-[-0.04em] text-white sm:text-4xl">
                      "Don't throw away
                      <span className="text-primary-200"> what someone else
                      might need.</span>"
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <i className="bi bi-recycle text-xl text-primary-200" />
                      <p className="mt-8 text-xs font-bold text-white">Less waste</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <i className="bi bi-people text-xl text-primary-200" />
                      <p className="mt-8 text-xs font-bold text-white">More opportunity</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── BIG STATEMENT ── */}
      <section className="border-y border-ink-200 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">Why we exist</p>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.045em] text-ink-900 sm:text-5xl lg:text-6xl">
              The distance between
              <span className="text-primary-600"> surplus </span>
              and
              <span className="text-primary-600"> need </span>
              shouldn't be a dead end.
            </h2>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-ink-500">
              Around us are perfectly useful things sitting unused because
              their owners no longer need them. At the same time, other people
              are searching for exactly those things.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── MISSION + VISION ── */}
      <section className="bg-primary py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-brand-700 p-8 text-white shadow-card sm:p-10"
            >
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand-300/20 blur-3xl" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
                  <i className="bi bi-bullseye text-xl" />
                </div>
                <p className="mt-9 text-xs font-bold uppercase tracking-[0.2em] text-primary-200">Our mission</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight">Connect surplus with need.</h3>
                <p className="mt-5 max-w-lg text-sm leading-7 text-primary-100">
                  We are building a global community where giving is simple,
                  transparent and meaningful. Our goal is to help useful items
                  find people who can actually use them.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {['Give', 'Connect', 'Reuse', 'Impact'].map((item) => (
                    <span key={item} className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-primary-100">
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
              className="relative overflow-hidden rounded-2xl border border-ink-200 bg-white p-8 shadow-card sm:p-10"
            >
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <i className="bi bi-eye text-xl" />
                </div>
                <p className="mt-9 text-xs font-bold uppercase tracking-[0.2em] text-primary-600">Our vision</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-ink-900">A world where useful things keep moving.</h3>
                <p className="mt-5 max-w-lg text-sm leading-7 text-ink-500">
                  We imagine a more circular world where people have easier
                  access to resources, communities trust one another and fewer
                  useful things become waste.
                </p>
                <div className="mt-8 flex items-center gap-3 rounded-2xl bg-surface-100 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
                    <i className="bi bi-arrow-repeat" />
                  </div>
                  <p className="text-xs font-bold text-ink-600">Keep useful things in circulation.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="bg-white py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 max-w-2xl"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-600">What guides us</p>
            <h2 className="text-4xl font-black tracking-[-0.045em] text-ink-900 sm:text-5xl">The principles behind DTI.</h2>
            <p className="mt-5 text-base leading-7 text-ink-500">
              Technology is only the tool. The real foundation is how people
              treat one another and the world around them.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <motion.div
                key={value.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-xl border border-ink-200 bg-white p-7 shadow-card transition-all hover:-translate-y-1 hover:border-primary-200 hover:shadow-md"
              >
                <span className="absolute right-5 top-3 text-6xl font-black tracking-[-0.08em] text-ink-100 transition-colors group-hover:text-primary-50">
                  {value.number}
                </span>
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <i className={`${value.icon} text-lg`} />
                  </div>
                  <h3 className="mt-8 text-lg font-black text-ink-900">{value.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-500">{value.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="bg-brand py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            {/* Founder image */}
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative mx-auto w-full max-w-sm"
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-brand-700 p-4 shadow-card">
                <div className="overflow-hidden rounded-xl bg-ink-200">
                  <img
                    src={founder.avatar}
                    alt={founder.name}
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
                <div className="absolute bottom-8 left-8 rounded-xl bg-white px-4 py-3 shadow-card">
                  <p className="text-xs font-black text-ink-900">Founder & Lead Developer</p>
                  <p className="mt-0.5 text-[10px] text-ink-400">Don't Trash It</p>
                </div>
              </div>
            </motion.div>

            {/* Founder story */}
            <motion.div
              initial={{ opacity: 0, x: 25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-600">The person behind the idea</p>
              <h2 className="text-4xl font-black tracking-[-0.045em] text-ink-900 sm:text-5xl">Built from a simple belief.</h2>
              <p className="mt-6 text-base leading-8 text-ink-500">
                Don't Trash It was founded by{' '}
                <span className="font-bold text-ink-900">{founder.name}</span>, a developer passionate about using technology to solve practical problems and create stronger communities.
              </p>
              <p className="mt-4 text-base leading-8 text-ink-500">
                The idea behind DTI is simple: there are countless useful
                things sitting unused while other people are looking for those
                exact resources. The challenge is connecting the two.
              </p>
              <div className="mt-8 border-l-2 border-primary-500 pl-5">
                <p className="text-lg font-bold leading-7 text-ink-900">
                  "If something still has value, its story shouldn't end just
                  because its current owner is finished with it."
                </p>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <i className="bi bi-code-slash" />
                </div>
                <div>
                  <p className="text-sm font-black text-ink-900">{founder.name}</p>
                  <p className="text-xs text-ink-400">{founder.role}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MANIFESTO ── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-brand-700 p-8 shadow-card sm:p-12 lg:p-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                <i className="bi bi-stars" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-200">Our manifesto</span>
            </div>
            <div className="mt-10 max-w-4xl">
              <p className="text-3xl font-black leading-tight tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                We believe that
                <span className="text-primary-200"> generosity </span>
                can scale.
              </p>
              <p className="mt-7 text-base leading-8 text-primary-100 sm:text-lg">
                That technology can make giving easier. That transparency can
                make communities stronger. That a laptop, a bicycle, a book or
                a sewing machine can mean something completely different to
                someone who genuinely needs it.
              </p>
              <p className="mt-5 text-base font-bold leading-8 text-white sm:text-lg">
                And most importantly, we believe the things we no longer need
                don't have to become waste.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-brand-700 py-24 lg:py-32">
        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl" />
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-200">Be part of it</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.045em] text-white sm:text-6xl">
              A better destination
              <br />
              starts with <span className="text-primary-200">one item.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-primary-100">
              Give something useful another chance. Find something you need.
              Help us build a world where good things keep moving.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-primary-700 shadow-lg transition hover:bg-primary-50"
              >
                Join the mission
                <i className="bi bi-arrow-up-right" />
              </Link>
              <Link
                to="/browse"
                className="inline-flex items-center gap-3 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                Explore items
                <i className="bi bi-grid" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
						
    </div>
  );
};

export default AboutPage;