import type { Nivel, SituacaoMatricula, SituacaoTrilha, StatusCurso } from './tipos';

export const ROTULO_NIVEL: Record<Nivel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

export const ROTULO_MATRICULA: Record<SituacaoMatricula, string> = {
  ativa: 'Em andamento',
  concluida: 'Concluído',
  cancelada: 'Cancelado',
  trancada: 'Trancado',
};

export const ROTULO_SITUACAO_TRILHA: Record<SituacaoTrilha, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

/** Cada status tem texto e símbolo próprios: a informação nunca depende só da cor. */
export const STATUS_CURSO: Record<StatusCurso, { rotulo: string; simbolo: string }> = {
  concluido: { rotulo: 'Concluído', simbolo: '✓' },
  em_andamento: { rotulo: 'Em andamento', simbolo: '◐' },
  disponivel: { rotulo: 'Disponível', simbolo: '○' },
  bloqueado: { rotulo: 'Bloqueado', simbolo: '⊘' },
};

/** 90 → "1 h 30 min"; 120 → "2 h"; 45 → "45 min". */
export function formatarDuracao(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** 14990 → "R$ 149,90"; 0 → "Gratuito". Formatação manual para funcionar igual em qualquer aparelho. */
export function formatarPreco(centavos: number, rotuloGratis = 'Gratuito'): string {
  if (centavos === 0) return rotuloGratis;
  const reais = Math.floor(centavos / 100);
  const cent = String(centavos % 100).padStart(2, '0');
  const milhar = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${milhar},${cent}`;
}

export function pluralizar(qtd: number, singular: string, plural: string) {
  return `${qtd} ${qtd === 1 ? singular : plural}`;
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Mesmas regras da API: 8+ caracteres, uma letra e um número. */
export function avaliarSenha(senha: string) {
  const regras = [
    { ok: senha.length >= 8, texto: '8+ caracteres' },
    { ok: /[A-Za-zÀ-ÿ]/.test(senha), texto: 'Uma letra' },
    { ok: /\d/.test(senha), texto: 'Um número' },
  ];
  return { regras, valida: regras.every((r) => r.ok) };
}

export function formatarTelefone(valor: string) {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}
