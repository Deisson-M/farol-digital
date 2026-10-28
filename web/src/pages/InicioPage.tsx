import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartaoCurso } from '../components/CartaoCurso';
import { CartaoTrilha } from '../components/CartaoTrilha';
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados';
import { Icone, type NomeIcone } from '../components/Icone';
import { useAuth } from '../contexts/AuthContext';
import { useRequisicao } from '../hooks/useRequisicao';
import { cursosService } from '../services/cursos.service';
import { trilhasService } from '../services/trilhas.service';

/** Atalhos de busca exibidos como "temas" na página inicial. */
const TEMAS: Array<{ icone: NomeIcone; rotulo: string; busca: string }> = [
  { icone: 'livro', rotulo: 'Informática básica', busca: 'computador' },
  { icone: 'celular', rotulo: 'Celular e apps', busca: 'celular' },
  { icone: 'escudo', rotulo: 'Segurança digital', busca: 'segur' },
  { icone: 'cadeado', rotulo: 'Privacidade e LGPD', busca: 'dados' },
  { icone: 'grafico', rotulo: 'Planilhas e produtividade', busca: 'planilha' },
  { icone: 'cartao', rotulo: 'Finanças e compras', busca: 'pagamento' },
  { icone: 'estrela', rotulo: 'Inteligência artificial', busca: 'inteligência' },
  { icone: 'codigo', rotulo: 'Programação', busca: 'programação' },
  { icone: 'pessoas', rotulo: 'Família e comunidade', busca: 'família' },
];

const DIFERENCIAIS: Array<{ icone: NomeIcone; titulo: string; texto: string }> = [
  { icone: 'farol', titulo: 'Caminho iluminado', texto: 'Cada trilha mostra onde você está, o que já concluiu e qual é a próxima etapa recomendada.' },
  { icone: 'pessoas', titulo: 'Para todas as idades', texto: 'Linguagem simples e exemplos do cotidiano, de quem nunca ligou um computador a quem quer programar.' },
  { icone: 'escudo', titulo: 'Proteção em primeiro lugar', texto: 'Conteúdo focado em golpes, privacidade e boas práticas para você navegar sem medo.' },
  { icone: 'acesso', titulo: 'Acessível de verdade', texto: 'Navegação completa pelo teclado, ajuste do tamanho do texto e alto contraste nas cores.' },
  { icone: 'coracao', titulo: 'Preço justo', texto: 'A maior parte do catálogo é gratuita. Os cursos avançados têm valor informado antes da compra.' },
  { icone: 'check', titulo: 'Aprendizado prático', texto: 'Atividades guiadas e objetivos claros em cada curso, para aplicar no dia seguinte.' },
];

const ETAPAS = [
  { titulo: 'Cadastre-se', texto: 'Crie sua conta de aluno ou professor em menos de um minuto.' },
  { titulo: 'Escolha um tema', texto: 'Navegue pelo catálogo ou siga uma trilha pronta para o seu objetivo.' },
  { titulo: 'Estude no seu ritmo', texto: 'Acesse quando e onde quiser, pelo computador ou pelo celular.' },
  { titulo: 'Acompanhe a evolução', texto: 'Veja seu progresso em cada trilha e comemore cada etapa concluída.' },
];

const PERGUNTAS = [
  { p: 'Quanto custa estudar no Farol Digital?', r: 'Todos os cursos de nível iniciante e intermediário são gratuitos. Os cursos avançados são pagos, com o valor exibido na página do curso antes de qualquer compra.' },
  { p: 'Como posso pagar um curso avançado?', r: 'Aceitamos cartão de crédito (em até 6x sem juros), cartão de débito, Pix, boleto bancário, PayPal e carteiras digitais como Google Pay e Apple Pay.' },
  { p: 'Nunca usei um computador. Consigo acompanhar?', r: 'Sim! Comece pela trilha “Primeiros passos na informática”, que parte do zero e explica cada passo com calma.' },
  { p: 'Posso estudar pelo celular?', r: 'Pode. O site se adapta a qualquer tamanho de tela, e a trilha “Celular e comunicação no dia a dia” ensina a aproveitar melhor o seu aparelho.' },
  { p: 'Quero dar aulas. Como faço?', r: 'No cadastro, escolha a opção “Sou professor” e informe sua área de atuação. A coordenação analisa o pedido e libera as ferramentas de professor após a aprovação.' },
  { p: 'Perdi o acesso à minha conta. E agora?', r: 'Na tela de entrada, clique em “Esqueci minha senha”. Você recebe um link de uso único, válido por 30 minutos, para cadastrar uma nova senha.' },
];

export function InicioPage() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [termo, setTermo] = useState('');
  const destaques = useRequisicao(() => cursosService.listar({ destaque: true, limite: 6 }), []);
  const trilhas = useRequisicao(() => trilhasService.listar({ limite: 3 }), []);
  const totais = useRequisicao(
    async () => {
      const [todos, gratis, listaTrilhas] = await Promise.all([
        cursosService.listar({ limite: 1 }),
        cursosService.listar({ preco: 'gratuito', limite: 1 }),
        trilhasService.listar({ limite: 1 }),
      ]);
      return { cursos: todos.total, gratuitos: gratis.total, trilhas: listaTrilhas.total };
    },
    [],
  );

  const metade = Math.ceil(PERGUNTAS.length / 2);

  return (
    <div className="inicio">
      <section className="capa" aria-labelledby="titulo-capa">
        <div className="capa__interno">
          <div className="capa__texto">
            <p className="capa__selo">
              <Icone nome="farol" tamanho={18} /> Escola on-line de cultura digital
            </p>
            <h1 id="titulo-capa">
              Uma luz para você navegar no <em>mundo digital</em> com autonomia.
            </h1>
            <p className="capa__subtitulo">
              Do primeiro clique à programação: cursos e trilhas sobre informática, celular, segurança, privacidade,
              produtividade e inteligência artificial.
            </p>
            <form
              className="capa__busca"
              role="search"
              aria-label="Buscar cursos"
              onSubmit={(e) => {
                e.preventDefault();
                const busca = termo.trim();
                navegar(busca ? `/cursos?busca=${encodeURIComponent(busca)}` : '/cursos');
              }}
            >
              <label htmlFor="busca-capa" className="sr-only">
                O que você quer aprender?
              </label>
              <Icone nome="lupa" />
              <input
                id="busca-capa"
                type="search"
                placeholder="O que você quer aprender hoje?"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
              />
              <button type="submit" className="botao botao--primario">
                Buscar
              </button>
            </form>
            <div className="capa__acoes">
              {usuario ? (
                <Link to="/meus-cursos" className="botao botao--claro botao--grande">
                  Continuar estudando <Icone nome="seta_direita" />
                </Link>
              ) : (
                <Link to="/cadastro" className="botao botao--claro botao--grande">
                  Começar gratuitamente <Icone nome="seta_direita" />
                </Link>
              )}
              <Link to="/trilhas" className="capa__link">
                Conhecer as trilhas
              </Link>
            </div>
          </div>
          <div className="capa__arte" aria-hidden="true">
            <svg viewBox="0 0 240 260" className="farol-arte">
              <path className="farol-arte__luz" d="M120 62 L240 20 L240 104 Z" />
              <path className="farol-arte__luz farol-arte__luz--2" d="M120 62 L0 20 L0 104 Z" />
              <rect x="104" y="48" width="32" height="26" rx="4" className="farol-arte__lanterna" />
              <path d="M98 48 h44 l-22 -20 z" className="farol-arte__teto" />
              <path d="M100 74 h40 l14 150 h-68 z" className="farol-arte__torre" />
              <path d="M96 110 h48 v14 h-48 z M92 160 h56 v14 h-56 z" className="farol-arte__faixa" />
              <path d="M10 236 q55 -22 110 0 t110 0 v24 h-220 z" className="farol-arte__mar" />
            </svg>
          </div>
        </div>
      </section>

      {totais.dados && totais.dados.cursos > 0 && (
        <dl className="numeros" aria-label="O Farol Digital em números">
          <div className="numeros__item">
            <dt>Cursos no catálogo</dt>
            <dd>{totais.dados.cursos}</dd>
          </div>
          <div className="numeros__item">
            <dt>Cursos gratuitos</dt>
            <dd>{totais.dados.gratuitos}</dd>
          </div>
          <div className="numeros__item">
            <dt>Trilhas de aprendizagem</dt>
            <dd>{totais.dados.trilhas}</dd>
          </div>
          <div className="numeros__item">
            <dt>Níveis de dificuldade</dt>
            <dd>3</dd>
          </div>
        </dl>
      )}

      <section className="bloco" aria-labelledby="titulo-temas">
        <header className="bloco__cabecalho">
          <p className="sobretitulo">Explore</p>
          <h2 id="titulo-temas">Escolha por tema</h2>
        </header>
        <ul className="temas" role="list">
          {TEMAS.map((t) => (
            <li key={t.rotulo}>
              <Link to={`/cursos?busca=${encodeURIComponent(t.busca)}`} className="tema">
                <span className="tema__icone">
                  <Icone nome={t.icone} tamanho={22} />
                </span>
                {t.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bloco bloco--sobre" aria-labelledby="titulo-sobre">
        <div className="sobre__texto">
          <p className="sobretitulo">Quem somos</p>
          <h2 id="titulo-sobre">Educação digital que ninguém precisa enfrentar sozinho.</h2>
          <p>
            O Farol Digital nasceu para orientar quem se sente perdido diante da tecnologia. Assim como um farol guia os
            barcos até o porto, nossas trilhas guiam cada estudante por uma sequência clara de cursos, com metas
            definidas e progresso sempre visível.
          </p>
          <p>
            Trabalhamos para diminuir a exclusão digital, prevenir golpes e incentivar o uso consciente da internet e
            da inteligência artificial, sempre respeitando a privacidade e os dados de quem estuda com a gente.
          </p>
        </div>
        <ul className="diferenciais" role="list">
          {DIFERENCIAIS.map((d) => (
            <li key={d.titulo} className="diferencial">
              <span className="diferencial__icone">
                <Icone nome={d.icone} tamanho={22} />
              </span>
              <div>
                <h3>{d.titulo}</h3>
                <p>{d.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bloco" aria-labelledby="titulo-etapas">
        <header className="bloco__cabecalho">
          <p className="sobretitulo">Passo a passo</p>
          <h2 id="titulo-etapas">Seu caminho em quatro etapas</h2>
        </header>
        <ol className="linha-tempo">
          {ETAPAS.map((e, i) => (
            <li key={e.titulo} className="linha-tempo__etapa">
              <span className="linha-tempo__numero" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{e.titulo}</h3>
              <p>{e.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bloco" aria-labelledby="titulo-destaques">
        <header className="bloco__cabecalho bloco__cabecalho--linha">
          <div>
            <p className="sobretitulo">Mais procurados</p>
            <h2 id="titulo-destaques">Cursos em destaque</h2>
          </div>
          <Link to="/cursos" className="link-seta">
            Ver catálogo completo <Icone nome="seta_direita" tamanho={18} />
          </Link>
        </header>
        {destaques.carregando && <Carregando texto="Carregando cursos…" />}
        {destaques.erro && <EstadoErro erro={destaques.erro} aoTentarNovamente={destaques.recarregar} />}
        {destaques.dados && destaques.dados.itens.length === 0 && <EstadoVazio titulo="Nenhum curso em destaque no momento." />}
        {destaques.dados && destaques.dados.itens.length > 0 && (
          <ul className="grade-cartoes" role="list">
            {destaques.dados.itens.map((c) => (
              <li key={c.id}>
                <CartaoCurso curso={c} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bloco" aria-labelledby="titulo-trilhas-inicio">
        <header className="bloco__cabecalho bloco__cabecalho--linha">
          <div>
            <p className="sobretitulo">Roteiros prontos</p>
            <h2 id="titulo-trilhas-inicio">Trilhas para começar</h2>
          </div>
          <Link to="/trilhas" className="link-seta">
            Ver todas as trilhas <Icone nome="seta_direita" tamanho={18} />
          </Link>
        </header>
        {trilhas.carregando && <Carregando texto="Carregando trilhas…" />}
        {trilhas.erro && <EstadoErro erro={trilhas.erro} aoTentarNovamente={trilhas.recarregar} />}
        {trilhas.dados && trilhas.dados.itens.length > 0 && (
          <ul className="grade-cartoes" role="list">
            {trilhas.dados.itens.map((t) => (
              <li key={t.id}>
                <CartaoTrilha trilha={t} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="convite-docente" aria-labelledby="titulo-docente">
        <div className="convite-docente__icone" aria-hidden="true">
          <Icone nome="livro" tamanho={40} />
        </div>
        <div className="convite-docente__texto">
          <h2 id="titulo-docente">Você ensina? Venha iluminar outros caminhos.</h2>
          <p>Cadastre-se como professor, publique trilhas e acompanhe de perto o desenvolvimento dos seus alunos.</p>
        </div>
        <Link to="/cadastro?tipo=professor" className="botao botao--primario botao--grande">
          Quero ser professor
        </Link>
      </section>

      <section id="perguntas" tabIndex={-1} className="bloco" aria-labelledby="titulo-perguntas">
        <header className="bloco__cabecalho">
          <p className="sobretitulo">Ajuda</p>
          <h2 id="titulo-perguntas">Dúvidas frequentes</h2>
        </header>
        <div className="perguntas-colunas">
          {[PERGUNTAS.slice(0, metade), PERGUNTAS.slice(metade)].map((coluna, i) => (
            <div key={i} className="perguntas">
              {coluna.map((q) => (
                <details key={q.p} className="pergunta">
                  <summary>{q.p}</summary>
                  <p>{q.r}</p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
