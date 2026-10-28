/**
 * Valores enumerados compartilhados entre o schema do banco (Drizzle) e as
 * validações da API (Zod). Arquivo sem dependências para ser reutilizável em testes.
 */
export const PAPEIS = ['estudante', 'professor', 'coordenador', 'admin'] as const;
export type Papel = (typeof PAPEIS)[number];

export const NIVEIS = ['iniciante', 'intermediario', 'avancado'] as const;
export type Nivel = (typeof NIVEIS)[number];

export const SITUACOES_MATRICULA = ['ativa', 'concluida', 'cancelada', 'trancada'] as const;
export type SituacaoMatricula = (typeof SITUACOES_MATRICULA)[number];

export const RESULTADOS_AUDITORIA = ['sucesso', 'falha', 'negado'] as const;
export type ResultadoAuditoria = (typeof RESULTADOS_AUDITORIA)[number];

export const CRITERIOS_CONCLUSAO = ['todos_obrigatorios', 'percentual_minimo'] as const;
export type CriterioConclusao = (typeof CRITERIOS_CONCLUSAO)[number];

export const SITUACOES_TRILHA = ['nao_iniciada', 'em_andamento', 'concluida'] as const;
export type SituacaoTrilha = (typeof SITUACOES_TRILHA)[number];

/** Situação do cadastro de docente: só "aprovado" recebe permissões de professor. */
export const SITUACOES_DOCENTE = ['nao_se_aplica', 'pendente', 'aprovado', 'recusado'] as const;
export type SituacaoDocente = (typeof SITUACOES_DOCENTE)[number];

export const METODOS_PAGAMENTO = [
  'cartao_credito',
  'cartao_debito',
  'pix',
  'boleto',
  'paypal',
  'carteira_digital',
] as const;
export type MetodoPagamento = (typeof METODOS_PAGAMENTO)[number];

export const SITUACOES_PEDIDO = ['aguardando_pagamento', 'pago', 'cancelado', 'expirado'] as const;
export type SituacaoPedido = (typeof SITUACOES_PEDIDO)[number];

export const SITUACOES_PAGAMENTO = ['pendente', 'aprovado', 'recusado', 'expirado', 'cancelado'] as const;
export type SituacaoPagamento = (typeof SITUACOES_PAGAMENTO)[number];
