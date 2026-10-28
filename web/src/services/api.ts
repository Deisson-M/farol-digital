import axios, { AxiosError } from 'axios';
import type { ErroApi } from '../types/api';

const CHAVE_TOKEN = 'farol.token';

export const armazenamentoToken = {
  obter: () => {
    try {
      return sessionStorage.getItem(CHAVE_TOKEN);
    } catch {
      return null;
    }
  },
  salvar: (token: string) => {
    try {
      sessionStorage.setItem(CHAVE_TOKEN, token);
    } catch {
      /* armazenamento indisponível: a sessão dura apenas enquanto a aba estiver aberta */
    }
  },
  limpar: () => {
    try {
      sessionStorage.removeItem(CHAVE_TOKEN);
    } catch {
      /* ignora */
    }
  },
};

/** Disparado quando a API responde 401, para o contexto de autenticação encerrar a sessão. */
export const EVENTO_SESSAO_EXPIRADA = 'farol:sessao-expirada';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = armazenamentoToken.obter();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro: AxiosError<{ erro?: Omit<ErroApi, 'status'> }>) => {
    const status = erro.response?.status ?? 0;
    if (status === 401 && armazenamentoToken.obter()) {
      armazenamentoToken.limpar();
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }
    return Promise.reject(normalizarErro(erro));
  },
);

export function normalizarErro(erro: unknown): ErroApi {
  if (erro && typeof erro === 'object' && 'codigo' in erro && 'mensagem' in erro) return erro as ErroApi;

  if (axios.isAxiosError(erro)) {
    const corpo = (erro.response?.data as { erro?: Omit<ErroApi, 'status'> } | undefined)?.erro;
    if (corpo) return { status: erro.response?.status ?? 0, ...corpo };
    if (!erro.response) {
      return {
        status: 0,
        codigo: 'SEM_CONEXAO',
        mensagem: 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
      };
    }
  }
  return { status: 0, codigo: 'ERRO_DESCONHECIDO', mensagem: 'Ocorreu um erro inesperado. Tente novamente.' };
}

/** Extrai a lista de problemas (strings ou {campo, mensagem}) de um erro de validação. */
export function listarDetalhes(erro: ErroApi): string[] {
  if (!Array.isArray(erro.detalhes)) return [];
  return erro.detalhes.map((d: unknown) => {
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object' && 'mensagem' in d) {
      const item = d as { campo?: string; mensagem: string };
      return item.campo ? `${item.campo}: ${item.mensagem}` : item.mensagem;
    }
    return String(d);
  });
}
