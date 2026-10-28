import { randomUUID } from 'node:crypto';
import type { ResultadoAuditoria } from '../../db/schema/enums.js';

export interface EventoAuditoria {
  usuarioId: number | null;
  acao: string;
  recursoTipo: string;
  recursoId?: string | number | null;
  resultado: ResultadoAuditoria;
  correlacaoId?: string | null;
  justificativa?: string | null;
  /** Somente metadados não sensíveis (nunca senhas, tokens ou dados pessoais desnecessários). */
  detalhes?: Record<string, unknown> | null;
}

export interface RegistroAuditoria {
  registrar(evento: EventoAuditoria): Promise<void>;
}

const CHAVES_PROIBIDAS = /senha|password|token|secret|segredo|authorization|cpf|hash/i;

/** Remove chaves sensíveis dos detalhes antes de persistir (defesa em profundidade). */
export function sanitizarDetalhes(
  detalhes: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!detalhes) return null;
  const limpar = (valor: unknown): unknown => {
    if (Array.isArray(valor)) return valor.map(limpar);
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(
        Object.entries(valor as Record<string, unknown>)
          .filter(([chave]) => !CHAVES_PROIBIDAS.test(chave))
          .map(([chave, v]) => [chave, limpar(v)]),
      );
    }
    return valor;
  };
  return limpar(detalhes) as Record<string, unknown>;
}

export function montarRegistro(evento: EventoAuditoria) {
  return {
    eventoId: randomUUID(),
    usuarioId: evento.usuarioId,
    acao: evento.acao,
    recursoTipo: evento.recursoTipo,
    recursoId: evento.recursoId == null ? null : String(evento.recursoId),
    resultado: evento.resultado,
    correlacaoId: evento.correlacaoId ?? null,
    justificativa: evento.justificativa ?? null,
    detalhes: sanitizarDetalhes(evento.detalhes),
  };
}
