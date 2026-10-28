/** Ícones de traço (24×24). Decorativos por padrão: o texto ao lado dá o significado. */
const CAMINHOS = {
  voltar: 'M15 18l-6-6 6-6',
  seta_direita: 'M5 12h14M13 5l7 7-7 7',
  topo: 'M12 19V5M5 12l7-7 7 7',
  ajuda: 'M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  fechar: 'M18 6L6 18M6 6l12 12',
  olho: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  olho_fechado: 'M17.9 17.9A10.7 10.7 0 0112 19c-7 0-11-7-11-7a19.8 19.8 0 015.1-5.9M9.9 4.2A10 10 0 0112 4c7 0 11 7 11 7a19.6 19.6 0 01-2.2 3.2M1 1l22 22M14.1 14.1a3 3 0 01-4.2-4.2',
  check: 'M20 6L9 17l-5-5',
  copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
  cadeado: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
  cartao: 'M2 5h20v14H2zM2 10h20M6 15h4',
  pix: 'M12 2l4 4-4 4-4-4zM2 12l4-4 4 4-4 4zM14 12l4-4 4 4-4 4zM12 14l4 4-4 4-4-4z',
  boleto: 'M3 5v14M6 5v14M9 5v14M12 5v14M15 5v14M18 5v14M21 5v14',
  carteira: 'M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H3zM3 7l13-4v4M17 14h.01',
  paypal: 'M7 21l2-14h6a4 4 0 010 8h-4l-1 6zM10 7h5',
  escudo: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  pessoas: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  acesso: 'M12 4a2 2 0 100-4 2 2 0 000 4zM4 7l8 2 8-2M12 9v6l-4 7M12 15l4 7',
  livro: 'M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5A2.5 2.5 0 006.5 22H20v-5',
  coracao: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z',
  lupa: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  relogio: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  estrela: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  aviso: 'M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01',
  texto_mais: 'M4 20l5-14 5 14M6 15h6M18 8v6M15 11h6',
  texto_menos: 'M4 20l5-14 5 14M6 15h6M15 11h6',
  farol: 'M9 22l1-12h4l1 12M8 10h8M10 10V7h4v3M12 7V4M3 5l5 2.5M21 5l-5 2.5M6 22h12',
  celular: 'M7 2h10v20H7zM11 18h2',
  grafico: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  codigo: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, tamanho = 20, rotulo }: { nome: NomeIcone; tamanho?: number; rotulo?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={rotulo ? undefined : true}
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      focusable="false"
      className="icone"
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
