import type { Papel } from '../db/schema/enums.js';

/**
 * Matriz de permissões centralizada. Cada etapa acrescenta suas ações aqui,
 * para que rotas e testes consultem a mesma fonte.
 */
export const PERMISSOES = {
  'trilhas:gerenciar': ['admin', 'coordenador'],
  'trilhas:ver-rascunhos': ['admin', 'coordenador'],
  'cursos:ver-rascunhos': ['admin', 'coordenador', 'professor'],
  'docentes:aprovar': ['admin', 'coordenador'],
} as const satisfies Record<string, readonly Papel[]>;

export type Permissao = keyof typeof PERMISSOES;

export function possuiPermissao(papel: Papel | undefined, permissao: Permissao): boolean {
  if (!papel) return false;
  return (PERMISSOES[permissao] as readonly Papel[]).includes(papel);
}
