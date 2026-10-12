import { AnimatePresence, motion } from 'motion/react'

export default function AuthNotice({
  mensagem,
  tipo = 'erro',
}) {
  return (
    <AnimatePresence initial={false}>
      {mensagem && (
        <motion.div
          key={`${tipo}-${mensagem}`}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          role={tipo === 'erro' ? 'alert' : 'status'}
          aria-live={tipo === 'erro' ? 'assertive' : 'polite'}
          className={`auth-notice auth-notice-${tipo} rounded-xl border px-4 py-3 text-sm leading-6`}
        >
          {mensagem}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
