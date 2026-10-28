import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { avaliarSenha, CampoSenha } from '../components/CampoSenha';
import { EstadoErro } from '../components/Estados';
import { normalizarErro } from '../services/api';
import { authService } from '../services/auth.service';
import type { ErroApi } from '../types/api';

export function RedefinirSenhaPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navegar = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!token) {
    return (
      <section className="pagina pagina--estreita">
        <EstadoErro erro={{ status: 400, codigo: 'TOKEN_AUSENTE', mensagem: 'Link incompleto. Abra o link exatamente como recebeu ou solicite outro.' }} />
        <Link to="/esqueci-senha" className="botao botao--primario">
          Solicitar novo link
        </Link>
      </section>
    );
  }

  const valida = avaliarSenha(senha).valida && senha === confirmacao;

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (!valida) return;
    setErro(null);
    setEnviando(true);
    try {
      const mensagem = await authService.redefinirSenha(token, senha);
      navegar('/entrar', { replace: true, state: { mensagem } });
    } catch (err) {
      setErro(normalizarErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="pagina pagina--estreita" aria-labelledby="titulo-redefinir">
      <h1 id="titulo-redefinir">Criar nova senha</h1>
      <form className="cartao formulario" onSubmit={aoEnviar} noValidate>
        {erro && (
          <>
            <EstadoErro erro={erro} />
            <Link to="/esqueci-senha">Solicitar novo link</Link>
          </>
        )}
        <CampoSenha id="nova-senha" rotulo="Nova senha" valor={senha} aoMudar={setSenha} autoComplete="new-password" mostrarForca />
        <CampoSenha
          id="confirmar-senha"
          rotulo="Confirme a nova senha"
          valor={confirmacao}
          aoMudar={setConfirmacao}
          autoComplete="new-password"
          erro={confirmacao && confirmacao !== senha ? 'As senhas não conferem.' : undefined}
        />
        <button type="submit" className="botao botao--positivo botao--largo" disabled={!valida || enviando}>
          {enviando ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </section>
  );
}
