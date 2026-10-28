/**
 * Erro de domínio com código estável e status HTTP. O handler global converte
 * para o formato { erro: { codigo, mensagem, detalhes? } }.
 */
export class ErroAplicacao extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensagem: string,
    public readonly detalhes?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroAplicacao';
  }
}

export const naoEncontrado = (recurso: string) =>
  new ErroAplicacao(404, 'NAO_ENCONTRADO', `${recurso} não encontrado(a).`);

export const conflito = (mensagem: string, detalhes?: unknown) =>
  new ErroAplicacao(409, 'CONFLITO', mensagem, detalhes);

export const regraNegocio = (mensagem: string, detalhes?: unknown) =>
  new ErroAplicacao(422, 'REGRA_DE_NEGOCIO', mensagem, detalhes);

export const proibido = (mensagem = 'Você não tem permissão para realizar esta ação.') =>
  new ErroAplicacao(403, 'PROIBIDO', mensagem);

export const naoAutenticado = (mensagem = 'Autenticação necessária.') =>
  new ErroAplicacao(401, 'NAO_AUTENTICADO', mensagem);
