import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BotoesFlutuantes } from './BotoesFlutuantes';
import { Icone } from './Icone';

export function Layout() {
  const { usuario, sair, temPapel } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const principal = useRef<HTMLElement>(null);
  const caminhoAnterior = useRef(local.pathname);
  const [menuAberto, setMenuAberto] = useState(false);

  // Ao trocar de página: fecha o menu e move o foco para o conteúdo (leitores de tela anunciam a nova página).
  // No carregamento inicial o foco fica no início, para o link "Pular para o conteúdo".
  useEffect(() => {
    setMenuAberto(false);
    if (caminhoAnterior.current === local.pathname) return;
    caminhoAnterior.current = local.pathname;
    if (!local.hash) {
      window.scrollTo(0, 0);
      principal.current?.focus({ preventScroll: true });
    }
  }, [local.pathname, local.hash]);

  // Âncoras como /#perguntas
  useEffect(() => {
    if (!local.hash) return;
    const alvo = document.getElementById(decodeURIComponent(local.hash.slice(1)));
    if (alvo) {
      alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      alvo.focus({ preventScroll: true });
    }
  }, [local.hash, local.pathname]);

  const gestor = temPapel('admin', 'coordenador');
  const docentePendente = usuario?.papel === 'professor' && usuario.situacaoDocente === 'pendente';

  return (
    <div className="aplicacao">
      <a className="pular-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="faixa-topo">
        <div className="faixa-topo__interno">
          <p>Cursos gratuitos de inclusão e segurança digital para todas as idades.</p>
          <nav aria-label="Links rápidos" className="faixa-topo__links">
            <Link to="/cadastro?tipo=professor">Seja professor</Link>
            <Link to="/#perguntas">Ajuda</Link>
          </nav>
        </div>
      </div>
      <header className="cabecalho">
        <div className="cabecalho__interno">
          <Link to="/" className="marca" aria-label="Farol Digital — página inicial">
            <span className="marca__simbolo" aria-hidden="true">
              <Icone nome="farol" tamanho={22} />
            </span>
            <span className="marca__nome">
              Farol<span className="marca__destaque">Digital</span>
            </span>
          </Link>

          <button
            type="button"
            className="botao-icone menu-alternar"
            aria-expanded={menuAberto}
            aria-controls="menu-principal"
            onClick={() => setMenuAberto((v) => !v)}
          >
            <Icone nome={menuAberto ? 'fechar' : 'menu'} tamanho={24} />
            <span className="sr-only">{menuAberto ? 'Fechar menu' : 'Abrir menu'}</span>
          </button>

          <div id="menu-principal" className={`menu ${menuAberto ? 'menu--aberto' : ''}`}>
            <nav aria-label="Navegação principal" className="navegacao">
              <NavLink to="/" end>
                Início
              </NavLink>
              <NavLink to="/cursos">Cursos</NavLink>
              <NavLink to="/trilhas">Trilhas</NavLink>
              {usuario && <NavLink to="/meus-cursos">Meus cursos</NavLink>}
              {usuario && <NavLink to="/minhas-trilhas">Minhas trilhas</NavLink>}
              {gestor && <NavLink to="/admin/trilhas">Gerenciar trilhas</NavLink>}
              {gestor && <NavLink to="/admin/professores">Professores</NavLink>}
            </nav>
            <div className="cabecalho__conta">
              {usuario ? (
                <>
                  <span className="cabecalho__nome texto-suave">{usuario.nome.split(' ')[0]}</span>
                  <button
                    type="button"
                    className="botao botao--secundario botao--pequeno"
                    onClick={async () => {
                      await sair();
                      navegar('/');
                    }}
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link to="/entrar" className="botao botao--secundario botao--pequeno">
                    Entrar
                  </Link>
                  <Link to="/cadastro" className="botao botao--primario botao--pequeno">
                    Criar conta
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {docentePendente && (
        <div className="faixa-aviso" role="status">
          <Icone nome="relogio" />
          Seu cadastro de professor está em análise. Enquanto isso, você pode explorar a plataforma como estudante.
        </div>
      )}

      <main id="conteudo" ref={principal} tabIndex={-1} className="conteudo">
        <Outlet />
      </main>

      <footer className="rodape">
        <div className="rodape__interno">
          <div className="rodape__coluna rodape__coluna--marca">
            <p className="marca rodape__marca">
              <span className="marca__simbolo" aria-hidden="true">
                <Icone nome="farol" tamanho={22} />
              </span>
              <span className="marca__nome">
                Farol<span className="marca__destaque">Digital</span>
              </span>
            </p>
            <p>Uma escola on-line que guia pessoas de todas as idades pelo mundo digital, com segurança e autonomia.</p>
          </div>
          <nav aria-label="Aprender" className="rodape__coluna">
            <h2 className="rodape__titulo">Aprender</h2>
            <Link to="/cursos">Catálogo de cursos</Link>
            <Link to="/cursos?preco=gratuito">Cursos gratuitos</Link>
            <Link to="/trilhas">Trilhas de aprendizagem</Link>
          </nav>
          <nav aria-label="Institucional" className="rodape__coluna">
            <h2 className="rodape__titulo">Institucional</h2>
            <Link to="/cadastro?tipo=professor">Seja professor</Link>
            <Link to="/#perguntas">Dúvidas frequentes</Link>
            <Link to="/termos">Termos e privacidade</Link>
          </nav>
        </div>
        <p className="rodape__base">© {new Date().getFullYear()} Farol Digital · Projeto acadêmico</p>
      </footer>

      <BotoesFlutuantes />
    </div>
  );
}
