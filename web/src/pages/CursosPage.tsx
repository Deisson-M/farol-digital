import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BotaoVoltar } from '../components/BotaoVoltar';
import { CartaoCurso } from '../components/CartaoCurso';
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados';
import { useRequisicao } from '../hooks/useRequisicao';
import { ROTULO_NIVEL } from '../lib/formatos';
import { cursosService } from '../services/cursos.service';
import type { Nivel } from '../types/api';

const POR_PAGINA = 12;
const PRECOS = [
  { valor: undefined, rotulo: 'Todos' },
  { valor: 'gratuito', rotulo: 'Gratuitos' },
  { valor: 'pago', rotulo: 'Pagos' },
] as const;

export function CursosPage() {
  const [params, setParams] = useSearchParams();
  const nivel = (params.get('nivel') as Nivel | null) ?? undefined;
  const precoParam = params.get('preco');
  const preco = precoParam === 'gratuito' || precoParam === 'pago' ? precoParam : undefined;
  const busca = params.get('busca') ?? '';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);
  const [termo, setTermo] = useState(busca);
  useEffect(() => setTermo(busca), [busca]);

  const { dados, carregando, erro, recarregar } = useRequisicao(
    () => cursosService.listar({ nivel, preco, busca: busca || undefined, pagina, limite: POR_PAGINA }),
    [nivel, preco, busca, pagina],
  );

  const atualizar = (mudancas: Record<string, string | undefined>) => {
    const novo = new URLSearchParams(params);
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) novo.set(k, v);
      else novo.delete(k);
    }
    novo.delete('pagina');
    if (mudancas.pagina) novo.set('pagina', mudancas.pagina);
    setParams(novo);
  };
  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / POR_PAGINA)) : 1;

  return (
    <section className="pagina" aria-labelledby="titulo-cursos">
      <BotaoVoltar destinoPadrao="/" />
      <header className="pagina__cabecalho">
        <p className="sobretitulo">Aprenda no seu ritmo</p>
        <h1 id="titulo-cursos">Catálogo de cursos</h1>
        <p className="pagina__intro">
          Use os filtros para encontrar o curso ideal: comece pelos gratuitos e avance para os conteúdos especializados quando se sentir
          pronto.
        </p>
      </header>

      <div className="catalogo">
        <form
          className="filtros"
          role="search"
          aria-label="Filtrar cursos"
          onSubmit={(e) => {
            e.preventDefault();
            atualizar({ busca: termo.trim() || undefined });
          }}
        >
          <div className="filtros__busca">
            <label htmlFor="busca-cursos">Buscar</label>
            <div className="campo-com-botao">
              <input
                id="busca-cursos"
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Ex.: senhas, Pix, IA"
              />
              <button type="submit" className="botao botao--primario">
                Buscar
              </button>
            </div>
          </div>
          <fieldset className="grupo-filtro">
            <legend>Preço</legend>
            <div className="segmentado">
              {PRECOS.map((p) => (
                <button key={p.rotulo} type="button" aria-pressed={preco === p.valor} onClick={() => atualizar({ preco: p.valor })}>
                  {p.rotulo}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="grupo-filtro">
            <legend>Nível</legend>
            <div className="segmentado">
              <button type="button" aria-pressed={!nivel} onClick={() => atualizar({ nivel: undefined })}>
                Todos
              </button>
              {(Object.keys(ROTULO_NIVEL) as Nivel[]).map((n) => (
                <button key={n} type="button" aria-pressed={nivel === n} onClick={() => atualizar({ nivel: n })}>
                  {ROTULO_NIVEL[n]}
                </button>
              ))}
            </div>
          </fieldset>
        </form>

        <div className="catalogo__resultados">
          <div aria-live="polite" aria-busy={carregando}>
            {carregando && <Carregando texto="Carregando cursos…" />}
            {erro && <EstadoErro erro={erro} aoTentarNovamente={recarregar} />}
            {dados && dados.itens.length === 0 && (
              <EstadoVazio titulo="Nenhum curso encontrado.">
                <p>Tente outro termo ou remova algum filtro.</p>
              </EstadoVazio>
            )}
            {dados && dados.itens.length > 0 && (
              <>
                <p className="texto-suave resultado-contagem">
                  {dados.total === 1 ? '1 curso encontrado' : `${dados.total} cursos encontrados`}
                </p>
                <ul className="grade-cartoes" role="list">
                  {dados.itens.map((c) => (
                    <li key={c.id}>
                      <CartaoCurso curso={c} />
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
