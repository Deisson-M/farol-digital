import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { avaliarSenha, CampoSenha } from '../components/CampoSenha';
import { EstadoErro } from '../components/Estados';
import { Icone } from '../components/Icone';
import { PainelAutenticacao } from '../components/PainelAutenticacao';
import { useAuth } from '../contexts/AuthContext';
import { normalizarErro } from '../services/api';
import type { DadosCadastro, ErroApi } from '../types/api';

type Erros = Partial<Record<'nome' | 'email' | 'telefone' | 'areaAtuacao' | 'senha' | 'confirmacao' | 'aceiteTermos', string>>;

function formatarTelefone(valor: string) {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

/** Na API o perfil de professor continua com o valor técnico "docente". */
const PERFIS: Array<{ valor: DadosCadastro['tipo']; rotulo: string }> = [
  { valor: 'aluno', rotulo: 'Sou aluno' },
  { valor: 'docente', rotulo: 'Sou professor' },
];

export function CadastroPage() {
  const { usuario, cadastrar } = useAuth();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const tipoInicial = params.get('tipo');
  const [dados, setDados] = useState<DadosCadastro>({
    tipo: tipoInicial === 'professor' || tipoInicial === 'docente' ? 'docente' : 'aluno',
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    areaAtuacao: '',
    aceiteTermos: false,
  });
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroApi, setErroApi] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/meus-cursos" replace />;

  const professor = dados.tipo === 'docente';

  const alterar = <K extends keyof DadosCadastro>(campo: K, valor: DadosCadastro[K]) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  function validar(): Erros {
    const e: Erros = {};
    if (dados.nome.trim().split(/\s+/).length < 2) e.nome = 'Informe nome e sobrenome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) e.email = 'Informe um e-mail válido.';
    const tel = dados.telefone?.replace(/\D/g, '') ?? '';
    if (tel && (tel.length < 10 || tel.length > 11)) e.telefone = 'Informe o celular com DDD.';
    if (professor && (dados.areaAtuacao?.trim().length ?? 0) < 3) e.areaAtuacao = 'Conte qual é a sua área de atuação ou formação.';
    if (!avaliarSenha(dados.senha).valida) e.senha = 'A senha precisa ter 8 caracteres, uma letra e um número.';
    if (confirmacao !== dados.senha) e.confirmacao = 'As senhas não são iguais.';
    if (!dados.aceiteTermos) e.aceiteTermos = 'Para continuar, aceite os Termos de Uso e o Aviso de Privacidade.';
    return e;
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErroApi(null);
    const encontrados = validar();
    setErros(encontrados);
    const primeiro = Object.keys(encontrados)[0];
    if (primeiro) {
      document.getElementById(primeiro === 'aceiteTermos' ? 'aceite' : primeiro)?.focus();
      return;
    }
    setEnviando(true);
    try {
      await cadastrar({ ...dados, nome: dados.nome.trim(), email: dados.email.trim(), areaAtuacao: professor ? dados.areaAtuacao : '' });
      navegar('/meus-cursos', { replace: true, state: { boasVindas: true } });
    } catch (e) {
      setErroApi(normalizarErro(e));
    } finally {
      setEnviando(false);
    }
  }

  const erroDe = (campo: keyof Erros) =>
    erros[campo] ? (
      <p id={`${campo}-erro`} className="erro-campo">
        {erros[campo]}
      </p>
    ) : null;
  const aria = (campo: keyof Erros) => ({
    'aria-invalid': erros[campo] ? true : undefined,
    'aria-describedby': erros[campo] ? `${campo}-erro` : undefined,
  });

  return (
    <PainelAutenticacao
      titulo="Comece hoje, de graça."
      texto="Crie sua conta em menos de um minuto e aprenda a usar a internet com mais segurança."
    >
      <section className="cadastro" aria-labelledby="titulo-cadastro">
        <h1 id="titulo-cadastro">Crie sua conta</h1>
        <p className="texto-suave">
          Já tem cadastro? <Link to="/entrar">Entrar</Link>
        </p>

        <form className="formulario" onSubmit={aoEnviar} noValidate>
          {erroApi && <EstadoErro erro={erroApi} />}

          <fieldset className="alternador-perfil">
            <legend className="sr-only">Tipo de conta</legend>
            {PERFIS.map((p) => (
              <label key={p.valor} className={dados.tipo === p.valor ? 'ativo' : undefined}>
                <input type="radio" name="tipo" value={p.valor} checked={dados.tipo === p.valor} onChange={() => alterar('tipo', p.valor)} />
                {p.rotulo}
              </label>
            ))}
          </fieldset>
          {professor && (
            <p className="aviso-info">
              <Icone nome="relogio" /> O cadastro de professor passa por uma análise rápida da coordenação. Enquanto isso,
              você já pode estudar como aluno.
            </p>
          )}

          <div className="campo">
            <label htmlFor="nome">Nome completo</label>
            <input id="nome" autoComplete="name" placeholder="Como você quer ser chamado" value={dados.nome} onChange={(e) => alterar('nome', e.target.value)} required {...aria('nome')} />
            {erroDe('nome')}
          </div>
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={dados.email} onChange={(e) => alterar('email', e.target.value)} required {...aria('email')} />
            {erroDe('email')}
          </div>
          <div className="campo">
            <label htmlFor="telefone">
              Celular <span className="texto-suave">(opcional)</span>
            </label>
            <input
              id="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 99999-9999"
              value={dados.telefone}
              onChange={(e) => alterar('telefone', formatarTelefone(e.target.value))}
              {...aria('telefone')}
            />
            {erroDe('telefone')}
          </div>
          {professor && (
            <div className="campo">
              <label htmlFor="areaAtuacao">Área de atuação ou formação</label>
              <input
                id="areaAtuacao"
                placeholder="Ex.: Pedagogia, Segurança da informação"
                value={dados.areaAtuacao}
                onChange={(e) => alterar('areaAtuacao', e.target.value)}
                {...aria('areaAtuacao')}
              />
              {erroDe('areaAtuacao')}
            </div>
          )}
          <CampoSenha id="senha" rotulo="Crie uma senha" valor={dados.senha} aoMudar={(v) => alterar('senha', v)} autoComplete="new-password" mostrarForca erro={erros.senha} />
          <CampoSenha
            id="confirmacao"
            rotulo="Repita a senha"
            valor={confirmacao}
            aoMudar={(v) => {
              setConfirmacao(v);
              setErros((e) => ({ ...e, confirmacao: undefined }));
            }}
            autoComplete="new-password"
            erro={erros.confirmacao}
          />

          <div className="campo">
            <label className="opcao opcao--topo">
              <input
                id="aceite"
                type="checkbox"
                checked={dados.aceiteTermos}
                onChange={(e) => alterar('aceiteTermos', e.target.checked)}
                {...aria('aceiteTermos')}
              />
              <span>
                Concordo com os{' '}
                <a href={`${import.meta.env.BASE_URL}termos#termos`} target="_blank" rel="noopener">
                  Termos de Uso<span className="sr-only"> (abre em nova aba)</span>
                </a>{' '}
                e com o{' '}
                <a href={`${import.meta.env.BASE_URL}termos#privacidade`} target="_blank" rel="noopener">
                  Aviso de Privacidade<span className="sr-only"> (abre em nova aba)</span>
                </a>
                . Meus dados serão usados apenas para criar e manter minha conta, conforme a LGPD.
              </span>
            </label>
            {erroDe('aceiteTermos')}
          </div>

          <button type="submit" className="botao botao--primario botao--largo botao--grande" disabled={enviando}>
            {enviando ? 'Criando sua conta…' : professor ? 'Enviar cadastro de professor' : 'Criar conta grátis'}
          </button>
        </form>
      </section>
    </PainelAutenticacao>
  );
}
