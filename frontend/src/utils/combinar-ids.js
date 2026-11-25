/*
 * Une listas de ids para aria-describedby, sem repetir nem deixar espaço
 * sobrando. Aceita undefined, texto com vários ids e texto vazio.
 */
export function combinarIds(...ids) {
  return [
    ...new Set(ids.filter(Boolean).join(' ').split(/\s+/).filter(Boolean)),
  ].join(' ')
}
