import { BotaoVoltar } from '../components/BotaoVoltar';
import { Link } from 'react-router-dom';
import { CartaoTrilha } from '../components/CartaoTrilha';
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados';
import { useRequisicao } from '../hooks/useRequisicao';
import { ROTULO_SITUACAO_TRILHA } from '../lib/formatos';
import { trilhasService } from '../services/trilhas.service';
import type { MinhaTrilha, SituacaoTrilha } from '../types/trilhas';

const GRUPOS: SituacaoTrilha[] = ['em_andamento', 'nao_iniciada', 'concluida'];

export function MinhasTrilhasPage() {
  const { dados, carregando, erro, recarregar } = useRequisicao(() => trilhasService.minhas(), []);

  const proxima = dados?.find((t) => t.progresso.proximaEtapa && t.progresso.situacao === 'em_andamento');

  return (
    <section className="pagina" aria-labelledby="titulo-minhas">
      <BotaoVoltar destinoPadrao="/meus-cursos" />
      <header className="pagina__cabecalho">
        <p className="sobretitulo">Área do aluno</p>
        <h1 id="titulo-minhas">Minhas trilhas</h1>
      </header>

      {carregando && <Carregando texto="Carregando suas trilhas…" />}
      {erro && <EstadoErro erro={erro} aoTentarNovamente={recarregar} />}
      {dados && dados.length === 0 && (
        <EstadoVazio titulo="Você ainda não começou nenhuma trilha.">
          <p>
            <Link to="/trilhas">Explore o catálogo</Link> e matricule-se no primeiro curso de uma trilha para começar.
          </p>
        </EstadoVazio>
      )}

      {proxima?.progresso.proximaEtapa && (
        <aside className="destaque" aria-labelledby="titulo-recomendacao">
          <p className="sobretitulo" id="titulo-recomendacao">
            Recomendação para hoje
          </p>
          <p className="destaque__texto">
            {proxima.progresso.proximaEtapa.motivo === 'continuar' ? 'Continue' : 'Comece'}{' '}
            <strong>{proxima.progresso.proximaEtapa.titulo}</strong> na trilha{' '}
            <Link to={`/trilhas/${proxima.id}`}>{proxima.titulo}</Link>.
          </p>
        </aside>
      )}

      {dados &&
        GRUPOS.map((situacao) => {
          const itens = dados.filter((t) => t.progresso.situacao === situacao);
          if (itens.length === 0) return null;
          return <Grupo key={situacao} titulo={ROTULO_SITUACAO_TRILHA[situacao]} itens={itens} />;
        })}
    </section>
  );
}

function Grupo({ titulo, itens }: { titulo: string; itens: MinhaTrilha[] }) {
  const id = `grupo-${titulo.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="grupo-trilhas">
      <h2 id={id}>
        {titulo} <span className="contador">{itens.length}</span>
      </h2>
      <ul className="grade-cartoes" role="list">
        {itens.map((t) => (
          <li key={t.id}>
            <CartaoTrilha trilha={t} progresso={t.progresso} />
          </li>
        ))}
      </ul>
    </section>
  );
}
