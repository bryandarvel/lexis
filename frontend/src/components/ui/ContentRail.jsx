import {
  Children,
  useRef,
} from 'react'
import { motion } from 'motion/react'

import {
  listItemVariants,
  listVariants,
} from '../../animations/motionVariants.js'

export default function ContentRail({
  id,
  eyebrow,
  title,
  description,
  emptyMessage,
  children,
}) {
  const railRef = useRef(null)
  const items = Children.toArray(children)

  function moverFileira(direction) {
    const rail = railRef.current

    if (!rail) {
      return
    }

    const distance = Math.max(
      rail.clientWidth * 0.8,
      280,
    )

    rail.scrollBy({
      left: distance * direction,
      behavior: 'smooth',
    })
  }

  return (
    <section
      id={id}
      className="scroll-mt-24 py-12"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-lexis-400">
              {eyebrow}
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white">
              {title}
            </h2>

            {description && (
              <p className="mt-3 max-w-2xl text-lexis-200">
                {description}
              </p>
            )}
          </div>

          {items.length > 1 && (
            <div className="hidden gap-2 md:flex">
              <motion.button
                type="button"
                aria-label={`Voltar na fileira ${title}`}
                onClick={() => moverFileira(-1)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-lexis-200/20 bg-lexis-900/80 text-2xl text-white transition-colors hover:bg-lexis-700"
              >
                ‹
              </motion.button>

              <motion.button
                type="button"
                aria-label={`Avançar na fileira ${title}`}
                onClick={() => moverFileira(1)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-lexis-200/20 bg-lexis-900/80 text-2xl text-white transition-colors hover:bg-lexis-700"
              >
                ›
              </motion.button>
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <motion.div
            ref={railRef}
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="-mx-2 mt-7 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-7 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, index) => (
              <motion.div
                key={item.key ?? index}
                variants={listItemVariants}
                className="flex-none snap-start"
              >
                {item}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-lexis-300/20 bg-lexis-900/35 px-6 py-10 text-lexis-200">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  )
}