import type { ReactNode } from 'react';
import { Icone } from './Icone';

const VANTAGENS = [
  'Cursos gratuitos de inclusão digital',
  'Aprenda a se proteger de golpes on-line',
  'Seus dados tratados conforme a LGPD',
];

/** Tela dividida usada em "Entrar" e "Criar conta": painel ilustrado à esquerda e formulário à direita. */
export function PainelAutenticacao({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className="autenticacao">
      <aside className="autenticacao__painel">
        <span className="autenticacao__icone" aria-hidden="true">
          <Icone nome="farol" tamanho={34} />
        </span>
        <p className="autenticacao__titulo">{titulo}</p>
        <p className="autenticacao__texto">{texto}</p>
        <ul className="autenticacao__vantagens" role="list">
          {VANTAGENS.map((v) => (
            <li key={v}>
              <Icone nome="check" tamanho={18} /> {v}
            </li>
          ))}
        </ul>
      </aside>
      <div className="autenticacao__conteudo">{children}</div>
    </div>
  );
}
