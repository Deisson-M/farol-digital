import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CampoSenha } from '../components/CampoSenha';
import { EstadoErro } from '../components/Estados';
import { PainelAutenticacao } from '../components/PainelAutenticacao';
import { useAuth } from '../contexts/AuthContext';
import { normalizarErro } from '../services/api';
import type { ErroApi } from '../types/api';

export function LoginPage() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const estado = local.state as { voltarPara?: string; mensagem?: string } | null;
  const destino = estado?.voltarPara ?? '/meus-cursos';
  if (usuario) return <Navigate to={destino} replace />;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PainelAutenticacao titulo="Bem-vindo de volta!" texto="Entre para continuar seus cursos e acompanhar o progresso nas trilhas.">
      <section className="cadastro" aria-labelledby="titulo-login">
        <h1 id="titulo-login">Entrar na sua conta</h1>
        <p className="texto-suave">
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se grátis</Link>
        </p>
        {estado?.mensagem && (
          <p className="mensagem-sucesso" role="status">
            {estado.mensagem}
          </p>
        )}
        <form className="formulario" onSubmit={aoEnviar} noValidate>
          {erro && <EstadoErro erro={erro} />}
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <CampoSenha id="senha" rotulo="Senha" valor={senha} aoMudar={setSenha} autoComplete="current-password" />
          <p className="alinhar-direita">
            <Link to="/esqueci-senha">Esqueci minha senha</Link>
          </p>
          <button type="submit" className="botao botao--primario botao--largo botao--grande" disabled={enviando || !email || !senha}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </PainelAutenticacao>
  );
}
