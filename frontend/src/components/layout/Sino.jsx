import { Link } from 'react-router'

import {
  descreverAvisosNaoLidos,
  formatarContagemDoSino,
} from '../../utils/navegacao-casca.js'
import { IconeSino } from './icones-casca.jsx'

/*
 * Sino da casca: um só componente para os dois papéis (UX-009). É um link
 * para a página de notificações do papel; a central no próprio sino fica para
 * o lote do tema e dos avisos.
 */
export default function Sino({ para, total }) {
  return (
    <Link
      to={para}
      aria-label={descreverAvisosNaoLidos(total)}
      className="casca-sino"
    >
      <span className="casca-sino-icone">
        <IconeSino />
      </span>
      {total > 0 && (
        <span aria-hidden="true" className="casca-sino-contagem">
          {formatarContagemDoSino(total)}
        </span>
      )}
    </Link>
  )
}
