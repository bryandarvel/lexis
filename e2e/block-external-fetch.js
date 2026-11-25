// Preload exclusivo da suíte backend: qualquer fetch não explicitamente
// simulado pelo próprio teste falha antes de tocar a rede.
globalThis.fetch = async () => {
  throw new Error('Fetch externo não simulado na suíte backend isolada.')
}
