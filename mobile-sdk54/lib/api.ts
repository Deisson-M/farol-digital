import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ErroApi } from './tipos';

/**
 * Descobre o endereço do computador que está rodando o Expo (o mesmo que roda a API).
 * No Expo Go, `hostUri` vem como "192.168.0.10:8081"; a API fica na porta 3333 desse IP.
 * Para usar outro endereço, defina EXPO_PUBLIC_API_URL no arquivo .env.
 */
function descobrirHost(): string {
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0];
  return host || 'localhost';
}

const HOST = descobrirHost();
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? `http://${HOST}:3333/api/v1`).replace(/\/$/, '');
/** Site (Vite) rodando no mesmo computador: usado para a compra de cursos pagos. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? `http://${HOST}:5173`).replace(/\/$/, '');

const CHAVE_TOKEN = 'farol.token';

/** Token guardado com segurança no aparelho (SecureStore). No navegador usa o localStorage. */
export const armazenamentoToken = {
  async obter(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHAVE_TOKEN) ?? null;
      return await SecureStore.getItemAsync(CHAVE_TOKEN);
    } catch {
      return null;
    }
  },
  async salvar(token: string) {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(CHAVE_TOKEN, token);
      else await SecureStore.setItemAsync(CHAVE_TOKEN, token);
    } catch {
      /* sem armazenamento: a sessão dura até fechar o app */
    }
  },
  async limpar() {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.removeItem(CHAVE_TOKEN);
      else await SecureStore.deleteItemAsync(CHAVE_TOKEN);
    } catch {
      /* ignora */
    }
  },
};

let tokenAtual: string | null = null;
let aoExpirarSessao: (() => void) | null = null;

export function definirToken(token: string | null) {
  tokenAtual = token;
}
export function aoSessaoExpirar(callback: (() => void) | null) {
  aoExpirarSessao = callback;
}

type Parametros = Record<string, string | number | boolean | undefined>;

function montarUrl(caminho: string, params?: Parametros) {
  const consulta = Object.entries(params ?? {})
    .filter(([, v]) => v !== undefined && v !== '' && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${API_URL}${caminho}${consulta ? `?${consulta}` : ''}`;
}

async function requisitar<T>(metodo: string, caminho: string, opcoes: { params?: Parametros; corpo?: unknown } = {}): Promise<T> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 15000);
  const cabecalhos: Record<string, string> = { Accept: 'application/json' };
  if (opcoes.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (tokenAtual) cabecalhos.Authorization = `Bearer ${tokenAtual}`;

  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(caminho, opcoes.params), {
      method: metodo,
      headers: cabecalhos,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
      signal: controle.signal,
    });
  } catch {
    const erro: ErroApi = {
      status: 0,
      codigo: 'SEM_CONEXAO',
      mensagem: `Não foi possível falar com o servidor (${API_URL}). Confira se a API está rodando e se o celular está na mesma rede Wi-Fi do computador.`,
    };
    throw erro;
  } finally {
    clearTimeout(limite);
  }

  const texto = await resposta.text();
  let dados: unknown = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && tokenAtual) {
      tokenAtual = null;
      void armazenamentoToken.limpar();
      aoExpirarSessao?.();
    }
    const corpo = (dados as { erro?: Omit<ErroApi, 'status'> } | null)?.erro;
    const erro: ErroApi = corpo
      ? { status: resposta.status, ...corpo }
      : { status: resposta.status, codigo: 'ERRO_DESCONHECIDO', mensagem: 'Ocorreu um erro inesperado. Tente novamente.' };
    throw erro;
  }
  return dados as T;
}

export const api = {
  get: <T>(caminho: string, params?: Parametros) => requisitar<T>('GET', caminho, { params }),
  post: <T>(caminho: string, corpo?: unknown) => requisitar<T>('POST', caminho, { corpo: corpo ?? {} }),
};

/** Converte qualquer erro em ErroApi para exibir na tela. */
export function normalizarErro(erro: unknown): ErroApi {
  if (erro && typeof erro === 'object' && 'mensagem' in erro) return erro as ErroApi;
  return { status: 0, codigo: 'ERRO_DESCONHECIDO', mensagem: 'Ocorreu um erro inesperado. Tente novamente.' };
}

/** Lista os problemas de validação devolvidos pela API (strings ou {campo, mensagem}). */
export function listarDetalhes(erro: ErroApi): string[] {
  if (!Array.isArray(erro.detalhes)) return [];
  return erro.detalhes.map((d: unknown) => {
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object' && 'mensagem' in d) return String((d as { mensagem: string }).mensagem);
    return String(d);
  });
}
