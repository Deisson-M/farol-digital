import { Link } from 'react-router-dom';
import { duracaoPorExtenso, formatarDuracao, formatarPreco, ROTULO_NIVEL } from '../lib/formatos';
import type { Curso, Nivel } from '../types/api';
import { Icone, type NomeIcone } from './Icone';

const ICONE_NIVEL: Record<Nivel, NomeIcone> = { iniciante: 'livro', intermediario: 'escudo', avancado: 'estrela' };

export function CartaoCurso({ curso }: { curso: Curso }) {
  return (
    <article className={`cartao cartao-curso cartao-curso--${curso.nivel}`}>
      <div className="cartao-curso__faixa">
        <span className="cartao-curso__nivel">
          <Icone nome={ICONE_NIVEL[curso.nivel]} tamanho={18} /> {ROTULO_NIVEL[curso.nivel]}
        </span>
        {curso.destaque && (
          <span className="destaque-selo">
            <Icone nome="estrela" tamanho={14} /> Destaque
          </span>
        )}
      </div>
      <div className="cartao-curso__corpo">
        <h3 className="cartao-curso__titulo">
          <Link to={`/cursos/${curso.id}`} className="link-cartao">
            {curso.titulo}
          </Link>
        </h3>
        <p className="cartao-curso__descricao">{curso.descricao}</p>
        <p className="cartao-curso__rodape">
          <span className="texto-suave cartao-curso__duracao">
            <Icone nome="relogio" tamanho={16} />
            <span aria-hidden="true">{formatarDuracao(curso.cargaHorariaMinutos)}</span>
            <span className="sr-only">Carga horária: {duracaoPorExtenso(curso.cargaHorariaMinutos)}</span>
          </span>
          <span className={`preco ${curso.gratuito ? 'preco--gratis' : ''}`}>{formatarPreco(curso.precoCentavos)}</span>
        </p>
      </div>
    </article>
  );
}
