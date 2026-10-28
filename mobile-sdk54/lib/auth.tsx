import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { aoSessaoExpirar, armazenamentoToken, definirToken } from './api';
import { authServico } from './servicos';
import type { DadosCadastro, Usuario } from './tipos';

interface ValorAuth {
  usuario: Usuario | null;
  /** true enquanto restaura a sessão salva no aparelho. */
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  cadastrar: (dados: DadosCadastro) => Promise<Usuario>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<ValorAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Restaura a sessão a partir do token salvo no aparelho.
  useEffect(() => {
    let ativo = true;
    aoSessaoExpirar(() => setUsuario(null));
    (async () => {
      const token = await armazenamentoToken.obter();
      if (!token) {
        if (ativo) setCarregando(false);
        return;
      }
      definirToken(token);
      try {
        const u = await authServico.eu();
        if (ativo) setUsuario(u);
      } catch {
        definirToken(null);
        await armazenamentoToken.limpar();
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
      aoSessaoExpirar(null);
    };
  }, []);

  const iniciarSessao = useCallback(async (token: string, u: Usuario) => {
    definirToken(token);
    await armazenamentoToken.salvar(token);
    setUsuario(u);
    return u;
  }, []);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const { token, usuario: u } = await authServico.entrar(email, senha);
      return iniciarSessao(token, u);
    },
    [iniciarSessao],
  );

  const cadastrar = useCallback(
    async (dados: DadosCadastro) => {
      const { token, usuario: u } = await authServico.cadastrar(dados);
      return iniciarSessao(token, u);
    },
    [iniciarSessao],
  );

  const sair = useCallback(async () => {
    try {
      await authServico.sair();
    } catch {
      /* mesmo sem resposta da API, a sessão é encerrada no aparelho */
    }
    definirToken(null);
    await armazenamentoToken.limpar();
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, carregando, entrar, cadastrar, sair }), [usuario, carregando, entrar, cadastrar, sair]);
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
