import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BotaoVoltar } from '../components/BotaoVoltar';
import { Carregando, EstadoErro } from '../components/Estados';
import { Icone } from '../components/Icone';
import { useAuth } from '../contexts/AuthContext';
import { useRequisicao } from '../hooks/useRequisicao';
import { duracaoPorExtenso, formatarDuracao, formatarPreco, ROTULO_NIVEL } from '../lib/formatos';
import { normalizarErro } from '../services/api';
import { cursosService } from '../services/cursos.service';
import { pagamentosService } from '../services/pagamentos.service';
import type { ErroApi } from '../types/api';

export function CursoDetalhePage() {
  const id = Number(useParams().id);
  const { usuario, carregando: carregandoSessao } = useAuth();
  const navegar = useNavigate();
  const valido = Number.isInteger(id) && id > 0;
  const curso = useRequisicao(() => cursosService.detalhar(id), [id, usuario?.id], valido && !carregandoSessao);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [aviso, setAviso] = useState('');

  if (!valido) return <EstadoErro erro={{ status: 404, codigo: 'NAO_ENCONTRADO', mensagem: 'Curso não encontrado.' }} />;
  if (curso.carregando || carregandoSessao) return <Carregando texto="Carregando curso…" />;
  if (curso.erro) return <EstadoErro erro={curso.erro} aoTentarNovamente={curso.recarregar} />;
  if (!curso.dados) return null;
  const c = curso.dados;
  const temAcesso = c.matricula === 'ativa' || c.matricula === 'concluida' || c.matricula === 'trancada';

  async function acao() {
    if (!usuario) {
      navegar('/entrar', { state: { voltarPara: `/cursos/${id}` } });
      return;
    }
    setErro(null);
    setProcessando(true);
    try {
      if (c.gratuito) {
        await cursosService.matricular(id);
        setAviso('Matrícula realizada! O curso já está em “Meus cursos”.');
        await curso.recarregar();
      } else {
        const pedido = await pagamentosService.criarPedido(id);
        navegar(`/checkout/${pedido.codigo}`);
      }
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setProcessando(false);
    }
  }

  const rotuloAcao = c.gratuito ? 'Matricular-se grátis' : `Comprar por ${formatarPreco(c.precoCentavos)}`;

  return (
    <article className="pagina" aria-labelledby="titulo-curso">
      <BotaoVoltar destinoPadrao="/cursos" />

      <div className={`curso-detalhe cartao-curso--${c.nivel}`}>
        <div className="curso-detalhe__principal">
          <div className="cartao-trilha__meta">
            <span className="etiqueta etiqueta--nivel">{ROTULO_NIVEL[c.nivel]}</span>
            {c.destaque && (
              <span className="destaque-selo">
                <Icone nome="estrela" tamanho={14} /> Destaque
              </span>
            )}
          </div>
          <h1 id="titulo-curso">{c.titulo}</h1>
          <p className="pagina__intro">{c.descricao}</p>
          <ul className="lista-icones" role="list">
            <li>
              <Icone nome="relogio" />
              <span>
                Carga horária: <span aria-hidden="true">{formatarDuracao(c.cargaHorariaMinutos)}</span>
                <span className="sr-only">{duracaoPorExtenso(c.cargaHorariaMinutos)}</span>
              </span>
            </li>
            <li>
              <Icone nome="livro" />
              <span>Estude no seu ritmo, com acesso pelo computador ou celular</span>
            </li>
            <li>
              <Icone nome="acesso" />
              <span>Conteúdo com navegação por teclado e texto ampliável</span>
            </li>
          </ul>
        </div>

        <aside className="cartao caixa-compra" aria-labelledby="titulo-compra">
          <h2 id="titulo-compra" className="sr-only">
            Acesso ao curso
          </h2>
          <p className={`caixa-compra__preco ${c.gratuito ? 'preco--gratis' : ''}`}>{formatarPreco(c.precoCentavos)}</p>
          {!c.gratuito && <p className="texto-suave">Em até 6x sem juros no cartão, Pix, boleto, PayPal e mais.</p>}
          <p role="status" className="mensagem-sucesso" hidden={!aviso}>
            {aviso}
          </p>
          {erro && <EstadoErro erro={erro} />}
          {temAcesso ? (
            <>
              <p className="mensagem-sucesso">
                <Icone nome="check" /> {c.matricula === 'concluida' ? 'Você concluiu este curso.' : 'Você está matriculado neste curso.'}
              </p>
              <Link to="/meus-cursos" className="botao botao--positivo botao--largo">
                Ir para meus cursos
              </Link>
            </>
          ) : (
            <button type="button" className="botao botao--primario botao--largo botao--grande" disabled={processando} onClick={acao}>
              {processando ? 'Aguarde…' : rotuloAcao}
            </button>
          )}
          {!usuario && <p className="texto-suave caixa-compra__nota">Você precisa entrar ou criar uma conta para continuar.</p>}
          {!c.gratuito && (
            <p className="caixa-compra__seguro texto-suave">
              <Icone nome="cadeado" tamanho={16} /> Pagamento protegido
            </p>
          )}
        </aside>
      </div>

      {/* Barra flutuante de ação no celular */}
      {!temAcesso && (
        <div className="barra-acao-movel">
          <span className={`preco ${c.gratuito ? 'preco--gratis' : ''}`}>{formatarPreco(c.precoCentavos)}</span>
          <button type="button" className="botao botao--primario" disabled={processando} onClick={acao} aria-label={rotuloAcao}>
            {c.gratuito ? 'Matricular' : 'Comprar'}
          </button>
        </div>
      )}
    </article>
  );
}
