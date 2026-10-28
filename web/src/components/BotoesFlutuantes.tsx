import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icone } from './Icone';

const CHAVE_ESCALA = 'farol.escalaFonte';
const ESCALAS = [1, 1.125, 1.25, 1.375];

function lerEscala() {
  try {
    const v = Number(localStorage.getItem(CHAVE_ESCALA));
    return ESCALAS.includes(v) ? v : 1;
  } catch {
    return 1;
  }
}

/** Botões flutuantes: ajuda rápida (com ajuste de tamanho do texto) e voltar ao topo. */
export function BotoesFlutuantes() {
  const [mostrarTopo, setMostrarTopo] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [escala, setEscala] = useState(lerEscala);
  const painel = useRef<HTMLDivElement>(null);
  const botaoAjuda = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const aoRolar = () => setMostrarTopo(window.scrollY > 480);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--escala-fonte', String(escala));
    try {
      localStorage.setItem(CHAVE_ESCALA, String(escala));
    } catch {
      /* preferência vale só nesta visita */
    }
  }, [escala]);

  // Esc fecha o painel e devolve o foco ao botão.
  useEffect(() => {
    if (!ajudaAberta) return;
    painel.current?.querySelector<HTMLElement>('a, button')?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAjudaAberta(false);
        botaoAjuda.current?.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [ajudaAberta]);

  const indice = ESCALAS.indexOf(escala);
  const fechar = () => setAjudaAberta(false);

  return (
    <div className="flutuantes">
      {ajudaAberta && (
        <div className="painel-ajuda" ref={painel} role="dialog" aria-modal="false" aria-labelledby="titulo-ajuda">
          <div className="painel-ajuda__topo">
            <h2 id="titulo-ajuda">Precisa de ajuda?</h2>
            <button type="button" className="botao-icone" onClick={fechar}>
              <Icone nome="fechar" />
              <span className="sr-only">Fechar ajuda</span>
            </button>
          </div>
          <ul className="painel-ajuda__links">
            <li>
              <Link to="/#perguntas" onClick={fechar}>
                Perguntas frequentes
              </Link>
            </li>
            <li>
              <Link to="/cursos?preco=gratuito" onClick={fechar}>
                Ver cursos gratuitos
              </Link>
            </li>
            <li>
              <Link to="/esqueci-senha" onClick={fechar}>
                Esqueci minha senha
              </Link>
            </li>
          </ul>
          <div className="painel-ajuda__fonte" role="group" aria-label="Tamanho do texto">
            <span>Tamanho do texto</span>
            <button type="button" className="botao-icone" disabled={indice <= 0} onClick={() => setEscala(ESCALAS[indice - 1] ?? 1)}>
              <Icone nome="texto_menos" />
              <span className="sr-only">Diminuir texto</span>
            </button>
            <output aria-live="polite">{Math.round(escala * 100)}%</output>
            <button
              type="button"
              className="botao-icone"
              disabled={indice >= ESCALAS.length - 1}
              onClick={() => setEscala(ESCALAS[indice + 1] ?? escala)}
            >
              <Icone nome="texto_mais" />
              <span className="sr-only">Aumentar texto</span>
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`fab fab--secundario ${mostrarTopo ? '' : 'fab--oculto'}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        tabIndex={mostrarTopo ? 0 : -1}
        aria-hidden={!mostrarTopo}
      >
        <Icone nome="topo" />
        <span className="sr-only">Voltar ao topo</span>
      </button>
      <button
        type="button"
        ref={botaoAjuda}
        className="fab fab--principal"
        aria-label="Ajuda"
        aria-expanded={ajudaAberta}
        onClick={() => setAjudaAberta((v) => !v)}
      >
        <Icone nome={ajudaAberta ? 'fechar' : 'ajuda'} tamanho={24} />
        <span className="fab__rotulo">Ajuda</span>
      </button>
    </div>
  );
}
