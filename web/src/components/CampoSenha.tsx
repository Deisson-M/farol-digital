import { useId, useState } from 'react';
import { Icone } from './Icone';

/** Mesmas regras da API: 8+ caracteres, letra e número. */
export function avaliarSenha(senha: string) {
  const regras = [
    { ok: senha.length >= 8, texto: 'Pelo menos 8 caracteres' },
    { ok: /[A-Za-zÀ-ÿ]/.test(senha), texto: 'Uma letra' },
    { ok: /\d/.test(senha), texto: 'Um número' },
  ];
  const extra = Number(senha.length >= 12) + Number(/[^A-Za-z0-9]/.test(senha)) + Number(/[a-z]/.test(senha) && /[A-Z]/.test(senha));
  const basicas = regras.every((r) => r.ok);
  const nivel = !senha ? 0 : !basicas ? 1 : extra >= 2 ? 3 : 2;
  return { regras, valida: basicas, nivel, rotulo: ['', 'Fraca', 'Boa', 'Forte'][nivel] ?? '' };
}

interface Props {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  mostrarForca?: boolean;
  erro?: string;
}

export function CampoSenha({ id, rotulo, valor, aoMudar, autoComplete, mostrarForca = false, erro }: Props) {
  const [visivel, setVisivel] = useState(false);
  const idAjuda = useId();
  const avaliacao = avaliarSenha(valor);
  const descritores = [mostrarForca ? idAjuda : null, erro ? `${id}-erro` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-senha">
        <input
          id={id}
          type={visivel ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores}
          required
        />
        <button type="button" className="campo-senha__alternar" onClick={() => setVisivel((v) => !v)} aria-pressed={visivel}>
          <Icone nome={visivel ? 'olho_fechado' : 'olho'} />
          <span className="sr-only">{visivel ? 'Ocultar senha' : 'Mostrar senha'}</span>
        </button>
      </div>
      {mostrarForca && (
        <div id={idAjuda} className="forca-senha">
          <div className={`forca-senha__barra forca-senha__barra--${avaliacao.nivel}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {valor && <span className="forca-senha__rotulo">Força: {avaliacao.rotulo}</span>}
          <ul className="forca-senha__regras">
            {avaliacao.regras.map((r) => (
              <li key={r.texto} className={r.ok ? 'ok' : ''}>
                <Icone nome={r.ok ? 'check' : 'fechar'} tamanho={14} />
                {r.texto}
                <span className="sr-only">{r.ok ? ' (atendido)' : ' (pendente)'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {erro && (
        <p id={`${id}-erro`} className="erro-campo">
          {erro}
        </p>
      )}
    </div>
  );
}
