import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { armazenamentoToken, EVENTO_SESSAO_EXPIRADA } from '../services/api';
import { authService } from '../services/auth.service';
import type { DadosCadastro, Papel, Usuario } from '../types/api';

interface ValorAuth {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  cadastrar: (dados: DadosCadastro) => Promise<Usuario>;
  sair: () => Promise<void>;
  /** Considera o papel efetivo: docente pendente ainda não tem permissões de professor. */
  temPapel: (...papeis: Papel[]) => boolean;
}

const AuthContext = createContext<ValorAuth | null>(null);

export function papelEfetivo(u: Usuario): Papel {
  return u.papel === 'professor' && u.situacaoDocente !== 'aprovado' ? 'estudante' : u.papel;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(() => Boolean(armazenamentoToken.obter()));

  // Restaura a sessão a partir do token salvo nesta aba.
  useEffect(() => {
    if (!armazenamentoToken.obter()) return;
    let ativo = true;
    authService
      .eu()
      .then((u) => ativo && setUsuario(u))
      .catch(() => armazenamentoToken.limpar())
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const aoExpirar = () => setUsuario(null);
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  const iniciarSessao = useCallback((token: string, u: Usuario) => {
    armazenamentoToken.salvar(token);
    setUsuario(u);
    return u;
  }, []);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const { token, usuario: u } = await authService.entrar(email, senha);
      return iniciarSessao(token, u);
    },
    [iniciarSessao],
  );

  const cadastrar = useCallback(
    async (dados: DadosCadastro) => {
      const { token, usuario: u } = await authService.cadastrar(dados);
      return iniciarSessao(token, u);
    },
    [iniciarSessao],
  );

  const sair = useCallback(async () => {
    try {
      await authService.sair();
    } finally {
      armazenamentoToken.limpar();
      setUsuario(null);
    }
  }, []);

  const temPapel = useCallback((...papeis: Papel[]) => Boolean(usuario && papeis.includes(papelEfetivo(usuario))), [usuario]);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, cadastrar, sair, temPapel }),
    [usuario, carregando, entrar, cadastrar, sair, temPapel],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
