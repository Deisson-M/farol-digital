import { BotaoVoltar } from '../components/BotaoVoltar';
import { Link, useParams } from 'react-router-dom';
import { BarraProgresso } from '../components/BarraProgresso';
import { Carregando, EstadoErro } from '../components/Estados';
import { SeloStatus } from '../components/SeloStatus';
import { useAuth } from '../contexts/AuthContext';
import { useRequisicao } from '../hooks/useRequisicao';
import {
  duracaoPorExtenso,
  formatarData,
  formatarDuracao,
  pluralizar,
  ROTULO_NIVEL,
  ROTULO_SITUACAO_TRILHA,
} from '../lib/formatos';
import { trilhasService } from '../services/trilhas.service';
import type { CursoComStatus, CursoDaTrilha, ProgressoTrilha } from '../types/trilhas';

export function TrilhaDetalhePage() {
  const id = Number(useParams().id);
  const { usuario, carregando: carregandoSessao } = useAuth();
  const idValido = Number.isInteger(id) && id > 0;

  const detalhe = useRequisicao(() => trilhasService.detalhar(id), [id], idValido);
  const progresso = useRequisicao(
    () => trilhasService.progresso(id),
    [id, usuario?.id],
    idValido && Boolean(usuario) && Boolean(detalhe.dados?.publicada),
  );

  if (!idValido) {
    return <EstadoErro erro={{ status: 404, codigo: 'NAO_ENCONTRADO', mensagem: 'Trilha não encontrada.' }} />;
  }
  if (detalhe.carregando || carregandoSessao) return <Carregando texto="Carregando trilha…" />;
  if (detalhe.erro) return <EstadoErro erro={detalhe.erro} aoTentarNovamente={detalhe.recarregar} />;
  if (!detalhe.dados) return null;

  const trilha = detalhe.dados;

  return (
    <article className="pagina" aria-labelledby="titulo-trilha">
      <BotaoVoltar destinoPadrao="/trilhas" />
      <nav aria-label="Trilha de navegação" className="migalhas">
        <Link to="/trilhas">Trilhas</Link> <span aria-hidden="true">/</span> <span aria-current="page">{trilha.titulo}</span>
      </nav>

      <header className={`trilha-cabecalho trilha-cabecalho--${trilha.nivel}`}>
        <div className="cartao-trilha__meta">
          <span className="etiqueta">{ROTULO_NIVEL[trilha.nivel]}</span>
          <span>{trilha.tema}</span>
          {!trilha.publicada && <span className="etiqueta etiqueta--alerta">Rascunho — visível só para gestores</span>}
        </div>
        <h1 id="titulo-trilha">{trilha.titulo}</h1>
        <p className="pagina__intro">{trilha.descricao}</p>
        <dl className="trilha-cabecalho__numeros">
          <div>
            <dt>Cursos</dt>
            <dd>{pluralizar(trilha.totalCursos, 'curso', 'cursos')}</dd>
          </div>
          <div>
            <dt>Carga horária estimada</dt>
            <dd>
              <span aria-hidden="true">{formatarDuracao(trilha.cargaHorariaTotalMinutos)}</span>
              <span className="sr-only">{duracaoPorExtenso(trilha.cargaHorariaTotalMinutos)}</span>
            </dd>
          </div>
          <div>
            <dt>Para concluir</dt>
            <dd>{trilha.criterio}</dd>
          </div>
        </dl>
      </header>

      <div className="trilha-corpo">
        <section aria-labelledby="titulo-objetivos" className="cartao">
          <h2 id="titulo-objetivos">Objetivos de aprendizagem</h2>
          <ul className="lista-objetivos">
            {trilha.objetivos.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titulo-progresso" className="cartao">
          <h2 id="titulo-progresso">Seu progresso</h2>
          {!usuario && (
            <p>
              <Link to="/entrar" state={{ voltarPara: `/trilhas/${trilha.id}` }}>
                Entre na sua conta
              </Link>{' '}
              para acompanhar o progresso e ver quais cursos já estão liberados.
            </p>
          )}
          {usuario && progresso.carregando && <Carregando texto="Calculando seu progresso…" />}
          {usuario && progresso.erro && <EstadoErro erro={progresso.erro} aoTentarNovamente={progresso.recarregar} />}
          {usuario && progresso.dados && <ResumoProgresso progresso={progresso.dados} />}
          {usuario && !trilha.publicada && <p className="texto-suave">O progresso fica disponível após a publicação.</p>}
        </section>
      </div>

      <section aria-labelledby="titulo-sequencia" className="secao-sequencia">
        <h2 id="titulo-sequencia">Sequência de cursos</h2>
        {trilha.cursos.length === 0 ? (
          <p className="texto-suave">Esta trilha ainda não tem cursos associados.</p>
        ) : (
          <ol className="sequencia">
            {(progresso.dados?.cursos ?? trilha.cursos).map((curso) => (
              <ItemSequencia key={curso.cursoId} curso={curso} />
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}

function ResumoProgresso({ progresso }: { progresso: ProgressoTrilha }) {
  return (
    <div className="resumo-progresso">
      <p>
        Situação: <strong>{ROTULO_SITUACAO_TRILHA[progresso.situacao]}</strong>
        {progresso.concluidaEm && <> em {formatarData(progresso.concluidaEm)}</>}
      </p>
      <BarraProgresso
        tamanho="grande"
        valor={progresso.percentual}
        rotulo="Progresso na trilha"
        descricao={`${progresso.cursosConcluidos} de ${progresso.cursosConsiderados} cursos obrigatórios`}
      />
      {progresso.situacao !== 'concluida' && progresso.cargaHorariaRestanteMinutos > 0 && (
        <p className="texto-suave">
          Faltam cerca de {formatarDuracao(progresso.cargaHorariaRestanteMinutos)} de estudo.
        </p>
      )}
      {progresso.proximaEtapa ? (
        <div className="proxima-etapa">
          <p className="sobretitulo">Próxima etapa recomendada</p>
          <p className="proxima-etapa__titulo">
            {progresso.proximaEtapa.motivo === 'continuar' ? 'Continue: ' : 'Comece: '}
            {progresso.proximaEtapa.titulo}
          </p>
        </div>
      ) : (
        progresso.situacao === 'concluida' && <p className="mensagem-sucesso">Parabéns! Você concluiu esta trilha.</p>
      )}
    </div>
  );
}

function ItemSequencia({ curso }: { curso: CursoDaTrilha | CursoComStatus }) {
  const comStatus = 'status' in curso ? curso : null;
  return (
    <li className={`sequencia__item ${comStatus ? `sequencia__item--${comStatus.status}` : ''}`}>
      <span className="sequencia__ordem" aria-hidden="true">
        {curso.ordem}
      </span>
      <div className="sequencia__conteudo">
        <div className="sequencia__linha">
          <h3 className="sequencia__titulo">
            <span className="sr-only">Etapa {curso.ordem}: </span>
            {curso.titulo}
          </h3>
          {comStatus && <SeloStatus status={comStatus.status} />}
        </div>
        <p className="texto-suave">
          {formatarDuracao(curso.cargaHorariaMinutos)} · {curso.obrigatorio ? 'Obrigatório' : 'Opcional'}
          {!curso.requerAnteriores && curso.ordem > 1 && ' · Pode ser feito a qualquer momento'}
        </p>
        {comStatus?.status === 'em_andamento' && (
          <BarraProgresso valor={comStatus.progressoPercentual} rotulo={`Progresso em ${curso.titulo}`} />
        )}
        {comStatus?.status === 'bloqueado' && comStatus.pendencias.length > 0 && (
          <p className="sequencia__pendencias">Para liberar, conclua antes: {comStatus.pendencias.join(', ')}.</p>
        )}
      </div>
    </li>
  );
}
