import { createHash, randomBytes } from 'node:crypto';
import type { Papel, SituacaoDocente } from '../../db/schema/enums.js';

/** Versão vigente dos Termos de Uso e do Aviso de Privacidade aceitos no cadastro. */
export const VERSAO_TERMOS = '2026.10';

/** Validade do link de redefinição de senha. */
export const VALIDADE_REDEFINICAO_MS = 30 * 60 * 1000;

/**
 * Regras de senha: 8 a 72 caracteres (limite do bcrypt), com letra e número,
 * sem ser igual ao e-mail. Retorna a lista de problemas (vazia = válida).
 */
export function validarSenha(senha: string, email?: string): string[] {
  const problemas: string[] = [];
  if (senha.length < 8) problemas.push('A senha precisa ter pelo menos 8 caracteres.');
  if (new TextEncoder().encode(senha).length > 72) problemas.push('A senha pode ter no máximo 72 caracteres.');
  if (!/[A-Za-zÀ-ÿ]/.test(senha)) problemas.push('A senha precisa ter pelo menos uma letra.');
  if (!/\d/.test(senha)) problemas.push('A senha precisa ter pelo menos um número.');
  if (email && senha.trim().toLowerCase() === email.trim().toLowerCase()) {
    problemas.push('A senha não pode ser igual ao e-mail.');
  }
  return problemas;
}

/**
 * Papel usado nas verificações de permissão. Docente com cadastro ainda não
 * aprovado navega como estudante até a aprovação.
 */
export function papelEfetivo(papel: Papel, situacaoDocente: SituacaoDocente): Papel {
  if (papel === 'professor' && situacaoDocente !== 'aprovado') return 'estudante';
  return papel;
}

/** Token aleatório de 256 bits para o link + hash que vai para o banco. */
export function gerarTokenRedefinicao() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** Normaliza telefone para dígitos (com DDD), aceitando +55. Retorna null se vazio. */
export function normalizarTelefone(valor: string | undefined | null): string | null {
  if (!valor) return null;
  const digitos = valor.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return digitos || null;
}
