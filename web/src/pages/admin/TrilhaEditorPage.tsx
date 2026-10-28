import { BotaoVoltar } from '../../components/BotaoVoltar';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Carregando, EstadoErro } from '../../components/Estados';
import { useRequisicao } from '../../hooks/useRequisicao';
import { formatarDuracao, ROTULO_NIVEL } from '../../lib/formatos';
import { normalizarErro } from '../../services/api';
import { cursosService } from '../../services/cursos.service';
import { trilhasService } from '../../services/trilhas.service';
import type { CursoResumo, ErroApi, Nivel } from '../../types/api';
import type { DadosTrilha, ItemSequencia, TrilhaDetalhe } from '../../types/trilhas';

const VAZIO: DadosTrilha = {
  titulo: '',
  descricao: '',
  tema: '',
  nivel: 'iniciante',
  objetivos: [],
  criterioConclusao: 'todos_obrigatorios',
  percentualMinimo: 100,
};

export function TrilhaEditorPage() {
  const parametro = useParams().id;
  const nova = parametro === undefined;
  const id = Number(parametro);
  const navegar = useNavigate();

  const trilha = useRequisicao(() => trilhasService.detalhar(id), [id], !nova);
  const cursos = useRequisicao(async () => (await cursosService.listar({ limite: 200 })).itens, []);

  if (!nova && trilha.carregando) return <Carregando texto="Carregando trilha…" />;
  if (!nova && trilha.erro) return <EstadoErro erro={trilha.erro} aoTentarNovamente={trilha.recarregar} />;

  return (
    <section className="pagina" aria-labelledby="titulo-editor">
      <BotaoVoltar destinoPadrao="/admin/trilhas" />
      <nav aria-label="Trilha de navegação" className="migalhas">
        <Link to="/admin/trilhas">Gerenciar trilhas</Link> <span aria-hidden="true">/</span>{' '}
        <span aria-current="page">{nova ? 'Nova trilha' : trilha.dados?.titulo}</span>
      </nav>
      <header className="pagina__cabecalho">
        <h1 id="titulo-editor">{nova ? 'Nova trilha' : 'Editar trilha'}</h1>
        {nova && (
          <p className="pagina__intro">
            A trilha é criada como rascunho. Depois de salvar, associe os cursos e publique.
          </p>
        )}
      </header>

      <FormularioDados
        inicial={trilha.dados ?? undefined}
        aoSalvar={(salva) => {
          if (nova) navegar(`/admin/trilhas/${salva.id}`, { replace: true });
          else trilha.definirDados(salva);
        }}
      />

      {!nova && trilha.dados && (
        <>
          <EditorSequencia
            trilha={trilha.dados}
            cursos={cursos.dados ?? []}
            carregandoCursos={cursos.carregando}
            aoSalvar={trilha.definirDados}
          />
          <Publicacao trilha={trilha.dados} aoSalvar={trilha.definirDados} />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function FormularioDados({ inicial, aoSalvar }: { inicial?: TrilhaDetalhe; aoSalvar: (t: TrilhaDetalhe) => void }) {
  const [dados, setDados] = useState<DadosTrilha>(VAZIO);
  const [objetivosTexto, setObjetivosTexto] = useState('');
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!inicial) return;
    setDados({
      titulo: inicial.titulo,
      slug: inicial.slug,
      descricao: inicial.descricao,
      tema: inicial.tema,
      nivel: inicial.nivel,
      objetivos: inicial.objetivos,
      criterioConclusao: inicial.criterioConclusao,
      percentualMinimo: inicial.percentualMinimo,
    });
    setObjetivosTexto(inicial.objetivos.join('\n'));
  }, [inicial]);

  const alterar = <K extends keyof DadosTrilha>(campo: K, valor: DadosTrilha[K]) => setDados((d) => ({ ...d, [campo]: valor }));

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso('');
    setEnviando(true);
    const objetivos = objetivosTexto
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);
    const corpo: DadosTrilha = { ...dados, objetivos, slug: dados.slug?.trim() || undefined };
    try {
      const salva = inicial ? await trilhasService.atualizar(inicial.id, corpo) : await trilhasService.criar(corpo);
      setAviso('Dados da trilha salvos.');
      aoSalvar(salva);
    } catch (err) {
      setErro(normalizarErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="cartao formulario" onSubmit={aoEnviar} aria-labelledby="titulo-dados" noValidate>
      <h2 id="titulo-dados">Dados da trilha</h2>
      {erro && <EstadoErro erro={erro} />}
      <p role="status" className="mensagem-sucesso" hidden={!aviso}>
        {aviso}
      </p>

      <div className="grade-campos">
        <div className="campo campo--largo">
          <label htmlFor="titulo">Título</label>
          <input id="titulo" required minLength={5} maxLength={160} value={dados.titulo} onChange={(e) => alterar('titulo', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="slug">Identificador na URL (opcional)</label>
          <input
            id="slug"
            aria-describedby="ajuda-slug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={dados.slug ?? ''}
            onChange={(e) => alterar('slug', e.target.value)}
          />
          <p id="ajuda-slug" className="ajuda">
            Letras minúsculas, números e hífens. Se ficar vazio, é gerado a partir do título.
          </p>
        </div>
        <div className="campo">
          <label htmlFor="tema">Tema</label>
          <input id="tema" required maxLength={80} value={dados.tema} onChange={(e) => alterar('tema', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="nivel">Nível</label>
          <select id="nivel" value={dados.nivel} onChange={(e) => alterar('nivel', e.target.value as Nivel)}>
            {(Object.keys(ROTULO_NIVEL) as Nivel[]).map((n) => (
              <option key={n} value={n}>
                {ROTULO_NIVEL[n]}
              </option>
            ))}
          </select>
        </div>
        <div className="campo campo--largo">
          <label htmlFor="descricao">Descrição</label>
          <textarea id="descricao" rows={3} required minLength={20} value={dados.descricao} onChange={(e) => alterar('descricao', e.target.value)} />
        </div>
        <div className="campo campo--largo">
          <label htmlFor="objetivos">Objetivos de aprendizagem</label>
          <textarea
            id="objetivos"
            rows={4}
            aria-describedby="ajuda-objetivos"
            value={objetivosTexto}
            onChange={(e) => setObjetivosTexto(e.target.value)}
          />
          <p id="ajuda-objetivos" className="ajuda">
            Um objetivo por linha (de 1 a 12).
          </p>
        </div>
        <fieldset className="campo campo--largo">
          <legend>Critério de conclusão</legend>
          <label className="opcao">
            <input
              type="radio"
              name="criterio"
              checked={dados.criterioConclusao === 'todos_obrigatorios'}
              onChange={() => alterar('criterioConclusao', 'todos_obrigatorios')}
            />
            Concluir todos os cursos obrigatórios
          </label>
          <label className="opcao">
            <input
              type="radio"
              name="criterio"
              checked={dados.criterioConclusao === 'percentual_minimo'}
              onChange={() => alterar('criterioConclusao', 'percentual_minimo')}
            />
            Concluir um percentual mínimo dos obrigatórios
          </label>
          {dados.criterioConclusao === 'percentual_minimo' && (
            <div className="campo campo--inline">
              <label htmlFor="percentual">Percentual mínimo (%)</label>
              <input
                id="percentual"
                type="number"
                min={1}
                max={100}
                value={dados.percentualMinimo}
                onChange={(e) => alterar('percentualMinimo', Number(e.target.value))}
              />
            </div>
          )}
        </fieldset>
      </div>

      <button type="submit" className="botao botao--primario" disabled={enviando}>
        {enviando ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Criar trilha'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------

interface LinhaEditor extends ItemSequencia {
  titulo: string;
  cargaHorariaMinutos: number;
}

function EditorSequencia({
  trilha,
  cursos,
  carregandoCursos,
  aoSalvar,
}: {
  trilha: TrilhaDetalhe;
  cursos: CursoResumo[];
  carregandoCursos: boolean;
  aoSalvar: (t: TrilhaDetalhe) => void;
}) {
  const [linhas, setLinhas] = useState<LinhaEditor[]>([]);
  const [selecionado, setSelecionado] = useState('');
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setLinhas(
      trilha.cursos.map((c) => ({
        cursoId: c.cursoId,
        titulo: c.titulo,
        cargaHorariaMinutos: c.cargaHorariaMinutos,
        obrigatorio: c.obrigatorio,
        requerAnteriores: c.requerAnteriores,
      })),
    );
  }, [trilha]);

  const disponiveis = useMemo(() => cursos.filter((c) => !linhas.some((l) => l.cursoId === c.id)), [cursos, linhas]);

  const mover = (indice: number, direcao: -1 | 1) => {
    setLinhas((atual) => {
      const destino = indice + direcao;
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      const [item] = copia.splice(indice, 1);
      if (item) copia.splice(destino, 0, item);
      return copia;
    });
    setAviso(`Curso movido para a posição ${indice + direcao + 1}.`);
  };

  const alterarLinha = (indice: number, mudanca: Partial<LinhaEditor>) =>
    setLinhas((atual) => atual.map((l, i) => (i === indice ? { ...l, ...mudanca } : l)));

  function adicionar() {
    const curso = cursos.find((c) => c.id === Number(selecionado));
    if (!curso) return;
    setLinhas((atual) => [
      ...atual,
      { cursoId: curso.id, titulo: curso.titulo, cargaHorariaMinutos: curso.cargaHorariaMinutos, obrigatorio: true, requerAnteriores: true },
    ]);
    setSelecionado('');
    setAviso(`“${curso.titulo}” adicionado na posição ${linhas.length + 1}.`);
  }

  async function salvar() {
    setErro(null);
    setAviso('');
    setSalvando(true);
    try {
      const atualizada = await trilhasService.definirCursos(
        trilha.id,
        linhas.map(({ cursoId, obrigatorio, requerAnteriores }) => ({ cursoId, obrigatorio, requerAnteriores })),
      );
      aoSalvar(atualizada);
      setAviso('Sequência de cursos salva.');
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-sequencia-editor">
      <h2 id="titulo-sequencia-editor">Sequência de cursos</h2>
      <p className="texto-suave">
        A ordem da lista é a ordem recomendada. Cursos que “exigem anteriores” só são liberados após concluir os
        obrigatórios que vêm antes deles.
      </p>
      {erro && <EstadoErro erro={erro} />}
      <p role="status" aria-live="polite" className="mensagem-sucesso" hidden={!aviso}>
        {aviso}
      </p>

      {linhas.length === 0 ? (
        <p className="texto-suave">Nenhum curso associado ainda.</p>
      ) : (
        <ol className="editor-sequencia">
          {linhas.map((l, i) => (
            <li key={l.cursoId} className="editor-sequencia__item">
              <span className="sequencia__ordem" aria-hidden="true">
                {i + 1}
              </span>
              <div className="editor-sequencia__info">
                <strong>{l.titulo}</strong>
                <span className="texto-suave"> · {formatarDuracao(l.cargaHorariaMinutos)}</span>
                <div className="editor-sequencia__opcoes">
                  <label className="opcao">
                    <input type="checkbox" checked={l.obrigatorio} onChange={(e) => alterarLinha(i, { obrigatorio: e.target.checked })} />
                    Obrigatório<span className="sr-only"> — {l.titulo}</span>
                  </label>
                  <label className="opcao">
                    <input
                      type="checkbox"
                      checked={l.requerAnteriores}
                      disabled={i === 0}
                      onChange={(e) => alterarLinha(i, { requerAnteriores: e.target.checked })}
                    />
                    Exige concluir os obrigatórios anteriores<span className="sr-only"> — {l.titulo}</span>
                  </label>
                </div>
              </div>
              <div className="editor-sequencia__acoes">
                <button type="button" className="botao botao--fantasma botao--pequeno" disabled={i === 0} onClick={() => mover(i, -1)}>
                  <span aria-hidden="true">↑</span>
                  <span className="sr-only">Mover {l.titulo} para cima</span>
                </button>
                <button
                  type="button"
                  className="botao botao--fantasma botao--pequeno"
                  disabled={i === linhas.length - 1}
                  onClick={() => mover(i, 1)}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="sr-only">Mover {l.titulo} para baixo</span>
                </button>
                <button
                  type="button"
                  className="botao botao--perigo botao--pequeno"
                  onClick={() => {
                    setLinhas((atual) => atual.filter((_, j) => j !== i));
                    setAviso(`“${l.titulo}” removido da sequência.`);
                  }}
                >
                  Remover<span className="sr-only"> {l.titulo}</span>
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="adicionar-curso">
        <div className="campo campo--inline">
          <label htmlFor="novo-curso">Adicionar curso</label>
          <select id="novo-curso" value={selecionado} onChange={(e) => setSelecionado(e.target.value)} disabled={carregandoCursos}>
            <option value="">{carregandoCursos ? 'Carregando cursos…' : 'Selecione um curso'}</option>
            {disponiveis.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titulo} ({ROTULO_NIVEL[c.nivel]}){c.publicado ? '' : ' — não publicado'}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="botao botao--secundario" disabled={!selecionado} onClick={adicionar}>
          Adicionar
        </button>
      </div>

      <button type="button" className="botao botao--primario" disabled={salvando} onClick={salvar}>
        {salvando ? 'Salvando…' : 'Salvar sequência'}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Publicacao({ trilha, aoSalvar }: { trilha: TrilhaDetalhe; aoSalvar: (t: TrilhaDetalhe) => void }) {
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [processando, setProcessando] = useState(false);

  async function alternar() {
    setErro(null);
    setProcessando(true);
    try {
      aoSalvar(await trilhasService.atualizar(trilha.id, { publicada: !trilha.publicada }));
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-publicacao">
      <h2 id="titulo-publicacao">Publicação</h2>
      <p>
        Situação atual:{' '}
        <span className={`etiqueta ${trilha.publicada ? 'etiqueta--sucesso' : 'etiqueta--alerta'}`}>
          {trilha.publicada ? 'Publicada' : 'Rascunho'}
        </span>
      </p>
      {erro && <EstadoErro erro={erro} />}
      <button type="button" className={trilha.publicada ? 'botao botao--secundario' : 'botao botao--primario'} disabled={processando} onClick={alternar}>
        {trilha.publicada ? 'Despublicar trilha' : 'Publicar trilha'}
      </button>
    </section>
  );
}
