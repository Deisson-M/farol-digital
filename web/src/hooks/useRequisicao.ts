import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { normalizarErro } from '../services/api';
import type { ErroApi } from '../types/api';

interface Estado<T> {
  dados: T | null;
  carregando: boolean;
  erro: ErroApi | null;
}

/**
 * Executa uma requisição e expõe os estados de carregamento, erro e dados.
 * Respostas de requisições antigas (dependências mudaram) são descartadas.
 */
export function useRequisicao<T>(executar: () => Promise<T>, deps: DependencyList, ativo = true) {
  const [estado, setEstado] = useState<Estado<T>>({ dados: null, carregando: ativo, erro: null });
  const sequencia = useRef(0);

  const carregar = useCallback(async () => {
    const atual = ++sequencia.current;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    try {
      const dados = await executar();
      if (atual === sequencia.current) setEstado({ dados, carregando: false, erro: null });
    } catch (erro) {
      if (atual === sequencia.current) setEstado({ dados: null, carregando: false, erro: normalizarErro(erro) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (ativo) void carregar();
    else setEstado({ dados: null, carregando: false, erro: null });
  }, [carregar, ativo]);

  return { ...estado, recarregar: carregar, definirDados: (dados: T) => setEstado({ dados, carregando: false, erro: null }) };
}
