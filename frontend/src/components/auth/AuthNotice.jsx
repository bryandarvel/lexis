import { AnimatePresence, motion } from 'motion/react'

const estilos = {
  erro: 'border-red-300/30 bg-red-300/10 text-red-100',
  sucesso:
    'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
}

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
          className={`rounded-xl border px-4 py-3 text-sm leading-6 ${estilos[tipo]}`}
        >
          {mensagem}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
