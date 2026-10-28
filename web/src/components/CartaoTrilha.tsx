import { Link } from 'react-router-dom';
import { duracaoPorExtenso, formatarDuracao, pluralizar, ROTULO_NIVEL } from '../lib/formatos';
import type { TrilhaResumo } from '../types/trilhas';
import { BarraProgresso } from './BarraProgresso';
import { Icone } from './Icone';

interface Props {
  trilha: TrilhaResumo;
  progresso?: { percentual: number; cursosConcluidos: number; cursosConsiderados: number };
}

export function CartaoTrilha({ trilha, progresso }: Props) {
  return (
    <article className={`cartao cartao-trilha cartao-trilha--${trilha.nivel}`}>
      <div className="cartao-curso__faixa">
        <span className="cartao-curso__nivel">
          <Icone nome="farol" tamanho={18} /> {trilha.tema}
        </span>
        {!trilha.publicada && <span className="etiqueta etiqueta--alerta">Rascunho</span>}
      </div>
      <div className="cartao-curso__corpo">
        <p className="cartao-trilha__nivel">Nível {ROTULO_NIVEL[trilha.nivel].toLowerCase()}</p>
        <h3 className="cartao-trilha__titulo">
          <Link to={`/trilhas/${trilha.id}`} className="link-cartao">
            {trilha.titulo}
          </Link>
        </h3>
        <p className="cartao-trilha__descricao">{trilha.descricao}</p>
        <dl className="cartao-trilha__numeros">
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
        </dl>
        {progresso && (
          <BarraProgresso
            valor={progresso.percentual}
            rotulo="Seu progresso"
            descricao={`${progresso.cursosConcluidos} de ${progresso.cursosConsiderados} obrigatórios`}
          />
        )}
      </div>
    </article>
  );
}
