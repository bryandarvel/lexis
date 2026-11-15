import {
  IconeAtencao,
  IconeErro,
  IconeInfo,
  IconeSucesso,
} from './icones.jsx'

/*
 * Aviso em linha (Lote 3a). O tipo nunca depende só da cor: cada um tem ícone
 * e, quando preciso, um título em texto. Erro usa role="alert"; os demais,
 * role="status". Sem animação de entrada.
 */

const TIPOS = {
  erro: { classes: 'border-erro bg-erro-fundo text-erro', Icone: IconeErro, role: 'alert' },
  sucesso: { classes: 'border-sucesso bg-sucesso-fundo text-sucesso', Icone: IconeSucesso, role: 'status' },
  atencao: { classes: 'border-atencao bg-atencao-fundo text-atencao', Icone: IconeAtencao, role: 'status' },
  info: { classes: 'border-info bg-info-fundo text-info', Icone: IconeInfo, role: 'status' },
}

export default function Aviso({ tipo = 'info', titulo, children, className = '' }) {
  const { classes, Icone, role } = TIPOS[tipo] ?? TIPOS.info

  if (!titulo && !children) {
    return null
  }

  return (
    <div
      role={role}
      className={`flex gap-3 rounded-controle border px-4 py-3 text-sm leading-6 ${classes} ${className}`}
    >
      <span className="mt-0.5 shrink-0">
        <Icone />
      </span>
      <div className="min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={titulo ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  )
}
