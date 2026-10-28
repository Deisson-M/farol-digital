import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizarErro } from './api';
import type { ErroApi } from './tipos';

/** Executa uma busca na API e controla carregando/erro/dados. `recarregar` repete a busca. */
export function useRequisicao<T>(buscar: () => Promise<T>, dependencias: unknown[]) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [carregando, setCarregando] = useState(true);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const executar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await buscarRef.current());
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => {
    void executar();
  }, [executar]);

  return { dados, erro, carregando, recarregar: executar, setDados };
}
