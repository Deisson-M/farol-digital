import type { Nivel } from '../types/api';
import type { SituacaoTrilha, StatusCurso } from '../types/trilhas';

export const ROTULO_NIVEL: Record<Nivel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
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

/** Versão para leitores de tela: "1 hora e 30 minutos". */
export function duracaoPorExtenso(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  const h = horas === 1 ? '1 hora' : `${horas} horas`;
  const m = resto === 1 ? '1 minuto' : `${resto} minutos`;
  if (horas === 0) return m;
  return resto === 0 ? h : `${h} e ${m}`;
}

export function formatarData(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}

export function pluralizar(qtd: number, singular: string, plural: string) {
  return `${qtd} ${qtd === 1 ? singular : plural}`;
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 14990 → "R$ 149,90"; 0 → "Gratuito". */
export function formatarPreco(centavos: number, rotuloGratis = 'Gratuito'): string {
  return centavos === 0 ? rotuloGratis : moeda.format(centavos / 100);
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}
