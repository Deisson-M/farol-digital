import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BotaoVoltar } from '../components/BotaoVoltar';
import { EstadoErro } from '../components/Estados';
import { Icone } from '../components/Icone';
import { normalizarErro } from '../services/api';
import { authService } from '../services/auth.service';
import type { ErroApi } from '../types/api';

export function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState<ErroApi | null>(null);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      setMensagem(await authService.esqueciSenha(email.trim()));
    } catch (err) {
      setErro(normalizarErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="pagina pagina--estreita" aria-labelledby="titulo-esqueci">
      <BotaoVoltar destinoPadrao="/entrar" />
      <h1 id="titulo-esqueci">Esqueci minha senha</h1>
      {mensagem ? (
        <div className="cartao formulario">
          <p className="mensagem-sucesso" role="status">
            <Icone nome="check" /> {mensagem}
          </p>
          <p className="texto-suave">Não recebeu? Confira a caixa de spam ou tente novamente em alguns minutos.</p>
          <Link to="/entrar" className="botao botao--secundario botao--largo">
            Voltar para entrar
          </Link>
        </div>
      ) : (
        <>
          <p className="texto-suave">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
          <form className="cartao formulario" onSubmit={aoEnviar} noValidate>
            {erro && <EstadoErro erro={erro} />}
            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="botao botao--primario botao--largo" disabled={enviando || !email.includes('@')}>
              {enviando ? 'Enviando…' : 'Enviar link'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
