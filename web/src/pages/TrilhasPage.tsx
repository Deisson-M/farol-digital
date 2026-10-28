import { BotaoVoltar } from '../components/BotaoVoltar';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CartaoTrilha } from '../components/CartaoTrilha';
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados';
import { useRequisicao } from '../hooks/useRequisicao';
import { ROTULO_NIVEL } from '../lib/formatos';
import { trilhasService } from '../services/trilhas.service';
import type { Nivel } from '../types/api';

const NIVEIS = Object.keys(ROTULO_NIVEL) as Nivel[];
const POR_PAGINA = 12;

export function TrilhasPage() {
  const [params, setParams] = useSearchParams();
  const nivel = (params.get('nivel') as Nivel | null) ?? undefined;
  const busca = params.get('busca') ?? '';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);
  const [termo, setTermo] = useState(busca);

  useEffect(() => setTermo(busca), [busca]);

  const { dados, carregando, erro, recarregar } = useRequisicao(
    () => trilhasService.listar({ nivel, busca: busca || undefined, pagina, limite: POR_PAGINA }),
    [nivel, busca, pagina],
  );

  const atualizar = (mudancas: Record<string, string | undefined>) => {
    const novo = new URLSearchParams(params);
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) novo.set(chave, valor);
      else novo.delete(chave);
    }
    setParams(novo);
  };

  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / POR_PAGINA)) : 1;

  return (
    <section className="pagina" aria-labelledby="titulo-trilhas">
      <BotaoVoltar destinoPadrao="/" />
      <header className="pagina__cabecalho">
        <p className="sobretitulo">Roteiros de estudo</p>
        <h1 id="titulo-trilhas">Trilhas de aprendizagem</h1>
        <p className="pagina__intro">
          Cada trilha reúne cursos em uma ordem recomendada para alcançar um objetivo. Escolha a sua e siga o caminho iluminado.
        </p>
      </header>

      <div className="catalogo">
        <form
          className="filtros"
          role="search"
          aria-label="Filtrar trilhas"
          onSubmit={(e) => {
            e.preventDefault();
            atualizar({ busca: termo.trim() || undefined, pagina: undefined });
          }}
        >
          <div className="filtros__busca">
            <label htmlFor="busca">Buscar</label>
            <div className="campo-com-botao">
              <input
                id="busca"
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Ex.: senhas, golpes, IA"
              />
              <button type="submit" className="botao botao--primario">
                Buscar
              </button>
            </div>
          </div>
          <fieldset className="filtro-niveis">
            <legend>Nível</legend>
            <div className="segmentado">
              <button type="button" aria-pressed={!nivel} onClick={() => atualizar({ nivel: undefined, pagina: undefined })}>
                Todos
              </button>
              {NIVEIS.map((n) => (
                <button key={n} type="button" aria-pressed={nivel === n} onClick={() => atualizar({ nivel: n, pagina: undefined })}>
                  {ROTULO_NIVEL[n]}
                </button>
              ))}
            </div>
          </fieldset>
        </form>

        <div className="catalogo__resultados">
          <div aria-live="polite" aria-busy={carregando}>
            {carregando && <Carregando texto="Carregando trilhas…" />}
            {erro && <EstadoErro erro={erro} aoTentarNovamente={recarregar} />}
            {dados && dados.itens.length === 0 && (
              <EstadoVazio titulo="Nenhuma trilha encontrada.">
                <p>Tente outro termo de busca ou remova o filtro de nível.</p>
              </EstadoVazio>
            )}
            {dados && dados.itens.length > 0 && (
              <>
                <p className="texto-suave resultado-contagem">
                  {dados.total === 1 ? '1 trilha encontrada' : `${dados.total} trilhas encontradas`}
                </p>
                <ul className="grade-cartoes" role="list">
                  {dados.itens.map((t) => (
                    <li key={t.id}>
                      <CartaoTrilha trilha={t} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {dados && totalPaginas > 1 && (
            <nav className="paginacao" aria-label="Paginação">
              <button
                type="button"
                className="botao botao--secundario"
                disabled={pagina <= 1}
                onClick={() => atualizar({ pagina: String(pagina - 1) })}
              >
                Anterior
              </button>
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                className="botao botao--secundario"
                disabled={pagina >= totalPaginas}
                onClick={() => atualizar({ pagina: String(pagina + 1) })}
              >
                Próxima
              </button>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}
