import type { ReactNode } from 'react';
import { listarDetalhes } from '../services/api';
import type { ErroApi } from '../types/api';

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="estado" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function EstadoErro({ erro, aoTentarNovamente }: { erro: ErroApi; aoTentarNovamente?: () => void }) {
  const detalhes = listarDetalhes(erro);
  return (
    <div className="estado estado--erro" role="alert">
      <p className="estado__titulo">
        <span aria-hidden="true">⚠ </span>
        {erro.mensagem}
      </p>
      {detalhes.length > 0 && (
        <ul className="estado__detalhes">
          {detalhes.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
      {erro.correlacaoId && <p className="texto-suave">Código para o suporte: {erro.correlacaoId}</p>}
      {aoTentarNovamente && (
        <button type="button" className="botao botao--secundario" onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EstadoVazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="estado estado--vazio">
      <p className="estado__titulo">{titulo}</p>
      {children}
    </div>
  );
}
