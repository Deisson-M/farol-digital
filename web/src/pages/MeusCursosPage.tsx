import { Link, useLocation } from 'react-router-dom';
import { BarraProgresso } from '../components/BarraProgresso';
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados';
import { Icone } from '../components/Icone';
import { useAuth } from '../contexts/AuthContext';
import { useRequisicao } from '../hooks/useRequisicao';
import { formatarDuracao, ROTULO_NIVEL } from '../lib/formatos';
import { cursosService } from '../services/cursos.service';

const ROTULO_SITUACAO = { ativa: 'Em andamento', concluida: 'Concluído', trancada: 'Trancado', cancelada: 'Cancelado' } as const;

export function MeusCursosPage() {
  const { usuario } = useAuth();
  const boasVindas = (useLocation().state as { boasVindas?: boolean } | null)?.boasVindas;
  const { dados, carregando, erro, recarregar } = useRequisicao(() => cursosService.minhasMatriculas(), []);

  return (
    <section className="pagina" aria-labelledby="titulo-meus-cursos">
      <header className="pagina__cabecalho pagina__cabecalho--acoes">
        <div>
          <p className="sobretitulo">Área do aluno</p>
          <h1 id="titulo-meus-cursos">Meus cursos</h1>
        </div>
        <Link to="/minhas-trilhas" className="botao botao--secundario">
          Ver minhas trilhas
        </Link>
      </header>

      {boasVindas && (
        <p className="mensagem-sucesso" role="status">
          <Icone nome="check" /> Conta criada! Boas-vindas ao Farol Digital, {usuario?.nome.split(' ')[0]}.
        </p>
      )}

      {carregando && <Carregando texto="Carregando seus cursos…" />}
      {erro && <EstadoErro erro={erro} aoTentarNovamente={recarregar} />}
      {dados && dados.length === 0 && (
        <EstadoVazio titulo="Você ainda não está matriculado em nenhum curso.">
          <p>Comece por um curso gratuito — leva só um clique.</p>
          <Link to="/cursos?preco=gratuito" className="botao botao--primario">
            Ver cursos gratuitos
          </Link>
        </EstadoVazio>
      )}
      {dados && dados.length > 0 && (
        <ul className="lista-matriculas" role="list">
          {dados.map((m) => (
            <li key={m.cursoId} className="cartao matricula">
              <div className="matricula__info">
                <h2 className="matricula__titulo">
                  <Link to={`/cursos/${m.cursoId}`}>{m.titulo}</Link>
                </h2>
                <p className="texto-suave">
                  {ROTULO_NIVEL[m.nivel]} · {formatarDuracao(m.cargaHorariaMinutos)} ·{' '}
                  <span className={`situacao situacao--${m.situacao}`}>{ROTULO_SITUACAO[m.situacao]}</span>
                </p>
              </div>
              <div className="matricula__progresso">
                <BarraProgresso valor={m.situacao === 'concluida' ? 100 : m.progressoPercentual} rotulo={`Progresso em ${m.titulo}`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
