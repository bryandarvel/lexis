import { motion } from 'motion/react'
import { Link } from 'react-router'

import {
  cardVariants,
} from '../../animations/motionVariants.js'

const gradientClasses = [
  'from-lexis-400/35 via-lexis-700/20 to-lexis-950',
  'from-cyan-300/30 via-lexis-800/20 to-lexis-950',
  'from-blue-400/30 via-lexis-700/20 to-lexis-950',
]

export default function ContentCard({
  eyebrow,
  title,
  description,
  status,
  details = [],
  accentIndex = 0,
  to,
  actionLabel = 'Abrir',
}) {
  const gradientClass =
    gradientClasses[
      accentIndex % gradientClasses.length
    ]

  const initial =
    title?.trim().charAt(0).toUpperCase() ??
    'L'

  const interactiveClasses = to
    ? 'cursor-pointer focus-within:ring-2 focus-within:ring-lexis-300 focus-within:ring-offset-2 focus-within:ring-offset-lexis-950'
    : ''

  return (
    <motion.article
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      whileTap={
        to
          ? {
              scale: 0.985,
            }
          : undefined
      }
      className={`group relative min-h-[18rem] w-[18rem] overflow-hidden rounded-2xl border border-lexis-200/10 bg-lexis-900 shadow-xl shadow-black/20 sm:w-[22rem] ${interactiveClasses}`}
    >
      {to && (
        <Link
          to={to}
          aria-label={`${actionLabel}: ${title}`}
          className="absolute inset-0 z-20 rounded-2xl focus:outline-none"
        >
          <span className="sr-only">
            {actionLabel}: {title}
          </span>
        </Link>
      )}

      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`}
      />

      <div
        aria-hidden="true"
        className="absolute -right-5 -top-12 text-[13rem] font-black leading-none text-white/[0.055] transition-colors group-hover:text-white/[0.08]"
      >
        {initial}
      </div>

      <div className="relative flex min-h-[18rem] flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-lexis-300">
            {eyebrow}
          </p>

          {status && (
            <span className="rounded-full border border-lexis-300/20 bg-lexis-950/50 px-3 py-1 text-xs font-semibold text-lexis-200 backdrop-blur">
              {status}
            </span>
          )}
        </div>

        <div className="mt-auto">
          <h3 className="line-clamp-3 text-2xl font-bold tracking-tight text-white">
            {title}
          </h3>

          {description && (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-lexis-100">
              {description}
            </p>
          )}

          {details.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {details.map(
                (detail, detailIndex) => (
                  <li
                    key={`${detail}-${detailIndex}`}
                    className="rounded-lg bg-lexis-950/45 px-3 py-1.5 text-xs font-medium text-lexis-200"
                  >
                    {detail}
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </div>
    </motion.article>
  )
}