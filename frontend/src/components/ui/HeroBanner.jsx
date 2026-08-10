import { motion } from 'motion/react'

import useGsapHeroIntro from '../../hooks/useGsapHeroIntro.js'

export default function HeroBanner({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  metadata = [],
}) {
  const heroRef = useGsapHeroIntro()

  return (
    <section
      ref={heroRef}
      className="relative isolate min-h-[68vh] overflow-hidden"
    >
      <div
        data-hero-backdrop
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-lexis-950 via-lexis-900 to-lexis-700"
      />

      <div
        aria-hidden="true"
        className="absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-lexis-400/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute right-8 top-1/2 hidden -translate-y-1/2 text-[22rem] font-black leading-none text-lexis-100/[0.035] lg:block"
      >
        L
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-lexis-950 via-transparent to-transparent" />

      <div className="relative mx-auto flex min-h-[68vh] max-w-7xl items-end px-6 pb-20 pt-24">
        <div className="max-w-3xl">
          <p
            data-hero-reveal
            className="text-sm font-bold uppercase tracking-[0.24em] text-lexis-300"
          >
            {eyebrow}
          </p>

          <h1
            data-hero-reveal
            className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-7xl"
          >
            {title}
          </h1>

          <p
            data-hero-reveal
            className="mt-6 max-w-2xl text-base leading-7 text-lexis-100 sm:text-lg"
          >
            {description}
          </p>

          {metadata.length > 0 && (
            <ul
              data-hero-reveal
              className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-lexis-200"
            >
              {metadata.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-lexis-400" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div
            data-hero-reveal
            className="mt-8 flex flex-wrap gap-3"
          >
            {primaryAction && (
              <motion.a
                href={primaryAction.href}
                whileHover={{ scale: 1.035 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-lexis-400 px-6 font-bold text-lexis-950 shadow-lg shadow-lexis-500/20 transition-colors hover:bg-lexis-300"
              >
                {primaryAction.label}
              </motion.a>
            )}

            {secondaryAction && (
              <motion.a
                href={secondaryAction.href}
                whileHover={{ scale: 1.035 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-lexis-200/20 bg-lexis-950/50 px-6 font-semibold text-lexis-50 backdrop-blur transition-colors hover:bg-lexis-800/80"
              >
                {secondaryAction.label}
              </motion.a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}