import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BotaoVoltar } from '../components/BotaoVoltar';
import { Carregando, EstadoErro } from '../components/Estados';
import { Icone, type NomeIcone } from '../components/Icone';
import { useRequisicao } from '../hooks/useRequisicao';
import {
  cpfValido,
  detectarBandeira,
  formatarCpf,
  formatarNumeroCartao,
  formatarValidade,
  luhnValido,
  ROTULO_BANDEIRA,
  tokenizarCartaoSimulado,
  validadeOk,
} from '../lib/cartao';
import { formatarData, formatarDataHora, formatarPreco } from '../lib/formatos';
import { normalizarErro } from '../services/api';
import { novaChaveIdempotencia, pagamentosService } from '../services/pagamentos.service';
import type { ErroApi } from '../types/api';
import type { DadosPagamento, MetodoPagamento, Pagamento, Pedido } from '../types/pagamentos';

const ICONE_METODO: Record<MetodoPagamento, NomeIcone> = {
  cartao_credito: 'cartao',
  cartao_debito: 'cartao',
  pix: 'pix',
  boleto: 'boleto',
  paypal: 'paypal',
  carteira_digital: 'carteira',
};

const DESCRICAO_METODO: Record<MetodoPagamento, string> = {
  cartao_credito: 'Em até 6x sem juros',
  cartao_debito: 'À vista, aprovação na hora',
  pix: 'Aprovação em segundos',
  boleto: 'Compensa em até 3 dias úteis',
  paypal: 'Pague com sua conta PayPal',
  carteira_digital: 'Google Pay ou Apple Pay',
};

export function CheckoutPage() {
  const codigo = useParams().codigo ?? '';
  const pedido = useRequisicao(() => pagamentosService.obterPedido(codigo), [codigo], Boolean(codigo));

  if (pedido.carregando && !pedido.dados) return <Carregando texto="Carregando pedido…" />;
  if (pedido.erro) return <EstadoErro erro={pedido.erro} aoTentarNovamente={pedido.recarregar} />;
  if (!pedido.dados) return null;

  return <Checkout pedido={pedido.dados} recarregar={pedido.recarregar} />;
}

function Checkout({ pedido, recarregar }: { pedido: Pedido; recarregar: () => Promise<void> }) {
  const [pagamento, setPagamento] = useState<Pagamento | null>(pedido.pagamentoAtual);
  useEffect(() => setPagamento(pedido.pagamentoAtual), [pedido.pagamentoAtual]);

  const aoResultado = useCallback(
    async (p: Pagamento) => {
      setPagamento(p);
      if (p.situacao === 'aprovado') await recarregar();
    },
    [recarregar],
  );

  const pago = pedido.situacao === 'pago' || pagamento?.situacao === 'aprovado';
  const pendente = pagamento?.situacao === 'pendente';

  return (
    <section className="pagina" aria-labelledby="titulo-checkout">
      <BotaoVoltar destinoPadrao={`/cursos/${pedido.curso.id}`} />
      <header className="pagina__cabecalho">
        <p className="sobretitulo">Pagamento</p>
        <h1 id="titulo-checkout">{pago ? 'Pagamento confirmado' : 'Finalizar compra'}</h1>
      </header>

      {pedido.ambienteDemonstracao && !pago && (
        <p className="aviso-info aviso-info--alerta">
          <Icone nome="aviso" /> Ambiente de demonstração: nenhuma cobrança real será feita. Cartão de teste aprovado: 4242
          4242 4242 4242 · recusado: 4000 0000 0000 0002 (qualquer validade futura e CVV).
        </p>
      )}

      <div className="checkout">
        <div className="checkout__principal">
          {pago ? (
            <Sucesso pedido={pedido} />
          ) : pendente && pagamento ? (
            <Pendente pedido={pedido} pagamento={pagamento} aoMudar={aoResultado} />
          ) : (
            <>
              {pagamento && (pagamento.situacao === 'recusado' || pagamento.situacao === 'expirado') && (
                <div className="estado estado--erro" role="alert">
                  <p className="estado__titulo">
                    {pagamento.situacao === 'expirado' ? 'O prazo do pagamento anterior expirou.' : 'Pagamento não aprovado.'}
                  </p>
                  {pagamento.motivoRecusa && <p>{pagamento.motivoRecusa}</p>}
                  <p>Escolha uma forma de pagamento para tentar novamente.</p>
                </div>
              )}
              <EscolhaPagamento pedido={pedido} aoResultado={aoResultado} />
            </>
          )}
        </div>
        <Resumo pedido={pedido} pagamento={pagamento} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function EscolhaPagamento({ pedido, aoResultado }: { pedido: Pedido; aoResultado: (p: Pagamento) => Promise<void> }) {
  const [metodo, setMetodo] = useState<MetodoPagamento>('cartao_credito');
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Uma chave por tentativa: cliques repetidos na mesma tentativa não geram cobrança duplicada.
  const chave = useRef(novaChaveIdempotencia());

  async function enviar(dados: DadosPagamento) {
    if (enviando) return;
    setErro(null);
    setEnviando(true);
    try {
      const resultado = await pagamentosService.pagar(pedido.codigo, dados, chave.current);
      chave.current = novaChaveIdempotencia();
      await aoResultado(resultado);
    } catch (e) {
      const erroNormalizado = normalizarErro(e);
      // Erros de validação podem ser corrigidos e reenviados com nova chave.
      if (erroNormalizado.status >= 400 && erroNormalizado.status < 500) chave.current = novaChaveIdempotencia();
      setErro(erroNormalizado);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cartao">
      <fieldset className="metodos">
        <legend>
          <h2>Forma de pagamento</h2>
        </legend>
        <div className="metodos__grade">
          {pedido.metodos.map((m) => (
            <label key={m.metodo} className={`metodo ${metodo === m.metodo ? 'metodo--ativo' : ''}`}>
              <input
                type="radio"
                name="metodo"
                value={m.metodo}
                checked={metodo === m.metodo}
                onChange={() => {
                  setMetodo(m.metodo);
                  setErro(null);
                }}
              />
              <Icone nome={ICONE_METODO[m.metodo]} tamanho={24} />
              <span className="metodo__nome">{m.rotulo}</span>
              <span className="metodo__descricao">{DESCRICAO_METODO[m.metodo]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="metodo-form" aria-live="polite">
        {erro && <EstadoErro erro={erro} />}
        {(metodo === 'cartao_credito' || metodo === 'cartao_debito') && (
          <FormCartao key={metodo} credito={metodo === 'cartao_credito'} pedido={pedido} enviando={enviando} aoEnviar={enviar} />
        )}
        {metodo === 'pix' && (
          <div className="metodo-info">
            <p>
              Ao continuar, geramos um código Pix <strong>copia e cola</strong> válido por 30 minutos. Pague pelo app do seu
              banco e o acesso é liberado assim que o pagamento for confirmado.
            </p>
            <button type="button" className="botao botao--primario botao--grande" disabled={enviando} onClick={() => enviar({ metodo: 'pix' })}>
              {enviando ? 'Gerando…' : 'Gerar código Pix'}
            </button>
          </div>
        )}
        {metodo === 'boleto' && <FormBoleto enviando={enviando} aoEnviar={enviar} />}
        {metodo === 'paypal' && (
          <div className="metodo-info">
            <p>Você será levado ao PayPal para entrar na sua conta e autorizar o pagamento. Depois, volta automaticamente para cá.</p>
            <button type="button" className="botao botao--primario botao--grande" disabled={enviando} onClick={() => enviar({ metodo: 'paypal' })}>
              {enviando ? 'Preparando…' : 'Continuar para o PayPal'}
            </button>
          </div>
        )}
        {metodo === 'carteira_digital' && (
          <div className="metodo-info">
            <p>Pague com o cartão salvo na sua carteira digital, sem digitar os dados do cartão.</p>
            <div className="botoes-carteira">
              {['Google Pay', 'Apple Pay'].map((nome) => (
                <button
                  key={nome}
                  type="button"
                  className="botao botao--carteira"
                  disabled={enviando}
                  onClick={async () => {
                    // Simulação: em produção, o token vem da Payment Request API / SDK da carteira.
                    const token = `sim_wallet_${novaChaveIdempotencia().slice(0, 16)}`;
                    await enviar({ metodo: 'carteira_digital', tokenPagamento: token });
                  }}
                >
                  Pagar com {nome}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormCartao({
  credito,
  pedido,
  enviando,
  aoEnviar,
}: {
  credito: boolean;
  pedido: Pedido;
  enviando: boolean;
  aoEnviar: (d: DadosPagamento) => Promise<void>;
}) {
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [validade, setValidade] = useState('');
  const [cvv, setCvv] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [erros, setErros] = useState<Record<string, string>>({});
  const bandeira = detectarBandeira(numero);
  const limparErro = (campo: string) => setErros(({ [campo]: _removido, ...resto }) => resto);

  async function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    const encontrados: Record<string, string> = {};
    if (!luhnValido(numero)) encontrados.numero = 'Número do cartão inválido. Confira os dígitos.';
    if (nome.trim().length < 3) encontrados.nome = 'Informe o nome como está no cartão.';
    if (!validadeOk(validade)) encontrados.validade = 'Validade inválida ou vencida (use MM/AA).';
    if (!new RegExp(bandeira === 'amex' ? '^\\d{4}$' : '^\\d{3}$').test(cvv)) {
      encontrados.cvv = bandeira === 'amex' ? 'O código tem 4 dígitos.' : 'O código tem 3 dígitos.';
    }
    setErros(encontrados);
    const primeiro = Object.keys(encontrados)[0];
    if (primeiro) {
      document.getElementById(`cartao-${primeiro}`)?.focus();
      return;
    }
    // O número completo e o CVV ficam só no navegador: a API recebe o token.
    const tokenizado = await tokenizarCartaoSimulado(numero);
    await aoEnviar({
      metodo: credito ? 'cartao_credito' : 'cartao_debito',
      parcelas: credito ? parcelas : 1,
      tokenPagamento: tokenizado.token,
      cartao: { bandeira: tokenizado.bandeira, final: tokenizado.final },
    });
  }

  const campo = (id: string) => ({
    id: `cartao-${id}`,
    'aria-invalid': erros[id] ? true : undefined,
    'aria-describedby': erros[id] ? `cartao-${id}-erro` : undefined,
  });
  const erro = (id: string) =>
    erros[id] ? (
      <p id={`cartao-${id}-erro`} className="erro-campo">
        {erros[id]}
      </p>
    ) : null;

  return (
    <form onSubmit={aoSubmeter} noValidate className="formulario">
      <div className="grade-campos">
        <div className="campo campo--largo">
          <label htmlFor="cartao-numero">Número do cartão</label>
          <div className="campo-com-sufixo">
            <input
              {...campo('numero')}
              inputMode="numeric"
              autoComplete="cc-number"
              value={numero}
              onChange={(e) => {
                setNumero(formatarNumeroCartao(e.target.value));
                limparErro('numero');
              }}
              placeholder="0000 0000 0000 0000"
            />
            {numero.replace(/\D/g, '').length >= 2 && <span className="sufixo">{ROTULO_BANDEIRA[bandeira]}</span>}
          </div>
          {erro('numero')}
        </div>
        <div className="campo campo--largo">
          <label htmlFor="cartao-nome">Nome impresso no cartão</label>
          <input {...campo('nome')} autoComplete="cc-name" value={nome} onChange={(e) => {
              setNome(e.target.value.toUpperCase());
              limparErro('nome');
            }} />
          {erro('nome')}
        </div>
        <div className="campo">
          <label htmlFor="cartao-validade">Validade</label>
          <input
            {...campo('validade')}
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={validade}
            onChange={(e) => {
              setValidade(formatarValidade(e.target.value));
              limparErro('validade');
            }}
          />
          {erro('validade')}
        </div>
        <div className="campo">
          <label htmlFor="cartao-cvv">Código de segurança (CVV)</label>
          <input
            {...campo('cvv')}
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            value={cvv}
            onChange={(e) => {
              setCvv(e.target.value.replace(/\D/g, '').slice(0, 4));
              limparErro('cvv');
            }}
          />
          {erro('cvv')}
        </div>
        {credito && (
          <div className="campo campo--largo">
            <label htmlFor="cartao-parcelas">Parcelas</label>
            <select id="cartao-parcelas" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
              {pedido.parcelamento.map((o) => (
                <option key={o.parcelas} value={o.parcelas}>
                  {o.parcelas === 1
                    ? `À vista — ${formatarPreco(pedido.valorCentavos)}`
                    : `${o.parcelas}x de ${formatarPreco(o.valorParcelaCentavos)} sem juros`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <button type="submit" className="botao botao--primario botao--grande botao--largo" disabled={enviando}>
        <Icone nome="cadeado" /> {enviando ? 'Processando…' : `Pagar ${formatarPreco(pedido.valorCentavos)}`}
      </button>
    </form>
  );
}

function FormBoleto({ enviando, aoEnviar }: { enviando: boolean; aoEnviar: (d: DadosPagamento) => Promise<void> }) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [erros, setErros] = useState<{ nome?: string; cpf?: string }>({});

  return (
    <form
      className="formulario"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const encontrados: typeof erros = {};
        if (nome.trim().split(/\s+/).length < 2) encontrados.nome = 'Informe o nome completo do pagador.';
        if (!cpfValido(cpf)) encontrados.cpf = 'CPF inválido.';
        setErros(encontrados);
        if (encontrados.nome || encontrados.cpf) {
          document.getElementById(encontrados.nome ? 'boleto-nome' : 'boleto-cpf')?.focus();
          return;
        }
        await aoEnviar({ metodo: 'boleto', pagador: { nome: nome.trim(), cpf } });
      }}
    >
      <p className="texto-suave">O boleto vence em 3 dias úteis. O acesso é liberado após a compensação (até 3 dias úteis).</p>
      <div className="grade-campos">
        <div className="campo">
          <label htmlFor="boleto-nome">Nome completo do pagador</label>
          <input id="boleto-nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={erros.nome ? true : undefined} aria-describedby={erros.nome ? 'boleto-nome-erro' : undefined} />
          {erros.nome && <p id="boleto-nome-erro" className="erro-campo">{erros.nome}</p>}
        </div>
        <div className="campo">
          <label htmlFor="boleto-cpf">CPF do pagador</label>
          <input
            id="boleto-cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(e.target.value))}
            aria-invalid={erros.cpf ? true : undefined}
            aria-describedby={erros.cpf ? 'boleto-cpf-erro' : 'boleto-cpf-ajuda'}
          />
          <p id="boleto-cpf-ajuda" className="ajuda">
            Exigido pelos bancos para emitir o boleto. Guardamos apenas parte do número.
          </p>
          {erros.cpf && <p id="boleto-cpf-erro" className="erro-campo">{erros.cpf}</p>}
        </div>
      </div>
      <button type="submit" className="botao botao--primario botao--grande" disabled={enviando}>
        {enviando ? 'Gerando…' : 'Gerar boleto'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------

function Pendente({ pedido, pagamento, aoMudar }: { pedido: Pedido; pagamento: Pagamento; aoMudar: (p: Pagamento) => Promise<void> }) {
  const navegar = useNavigate();
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const restante = useContagem(pagamento.metodo === 'pix' ? pagamento.expiraEm : null);

  // Verifica a confirmação periodicamente (Pix/boleto/PayPal são confirmados pelo provedor).
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const atual = await pagamentosService.obterPagamento(pagamento.codigo);
        if (atual.situacao !== 'pendente') await aoMudar(atual);
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [pagamento.codigo, aoMudar]);

  async function executar(acao: () => Promise<Pagamento>) {
    setErro(null);
    setOcupado(true);
    try {
      await aoMudar(await acao());
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 3000);
    } catch {
      setErro({ status: 0, codigo: 'COPIA', mensagem: 'Não foi possível copiar automaticamente. Selecione o texto e copie.' });
    }
  }

  return (
    <div className="cartao pendente">
      {erro && <EstadoErro erro={erro} />}

      {pagamento.metodo === 'pix' && pagamento.pixCopiaCola && (
        <>
          <h2>Pague com Pix</h2>
          <ol className="instrucoes">
            <li>Abra o app do seu banco e escolha Pix &gt; Copia e cola.</li>
            <li>Cole o código abaixo e confirme o valor de {formatarPreco(pagamento.valorCentavos)}.</li>
            <li>Pronto! Esta página atualiza sozinha quando o pagamento for confirmado.</li>
          </ol>
          <label htmlFor="pix-codigo" className="rotulo-forte">
            Código Pix copia e cola
          </label>
          <textarea id="pix-codigo" className="codigo-copiavel" readOnly rows={3} value={pagamento.pixCopiaCola} onFocus={(e) => e.currentTarget.select()} />
          <div className="acoes-linha">
            <button type="button" className="botao botao--primario" onClick={() => copiar(pagamento.pixCopiaCola!)}>
              <Icone nome={copiado ? 'check' : 'copiar'} /> {copiado ? 'Código copiado!' : 'Copiar código'}
            </button>
            {restante !== null && (
              <span className="contagem" role="timer" aria-live="off">
                Expira em {restante}
              </span>
            )}
          </div>
        </>
      )}

      {pagamento.metodo === 'boleto' && pagamento.boletoLinhaDigitavel && (
        <>
          <h2>Boleto gerado</h2>
          <p>
            Vencimento: <strong>{formatarData(`${pagamento.boletoVencimento}T12:00:00Z`)}</strong>. Pague no app do banco,
            internet banking ou casa lotérica.
          </p>
          <label htmlFor="boleto-linha" className="rotulo-forte">
            Linha digitável
          </label>
          <textarea id="boleto-linha" className="codigo-copiavel" readOnly rows={2} value={pagamento.boletoLinhaDigitavel} onFocus={(e) => e.currentTarget.select()} />
          <div className="acoes-linha">
            <button type="button" className="botao botao--primario" onClick={() => copiar(pagamento.boletoLinhaDigitavel!)}>
              <Icone nome={copiado ? 'check' : 'copiar'} /> {copiado ? 'Linha copiada!' : 'Copiar linha digitável'}
            </button>
          </div>
        </>
      )}

      {pagamento.metodo === 'paypal' && pagamento.urlAprovacao && (
        <>
          <h2>Autorize no PayPal</h2>
          <p>Entre na sua conta PayPal para autorizar o pagamento de {formatarPreco(pagamento.valorCentavos)}.</p>
          <button
            type="button"
            className="botao botao--primario botao--grande"
            onClick={() => {
              const url = new URL(pagamento.urlAprovacao!, window.location.origin);
              const base = import.meta.env.BASE_URL.replace(/\/$/, '');
              const caminho = base && url.pathname.startsWith(base) ? url.pathname.slice(base.length) || '/' : url.pathname;
              if (url.origin === window.location.origin) navegar(`${caminho}?pedido=${pedido.codigo}`);
              else window.location.assign(url.toString());
            }}
          >
            Continuar no PayPal <Icone nome="seta_direita" />
          </button>
        </>
      )}

      <p className="texto-suave status-aguardando" role="status">
        <span className="spinner" aria-hidden="true" /> Aguardando confirmação do pagamento…
      </p>

      <div className="acoes-linha">
        <button type="button" className="botao botao--secundario" disabled={ocupado} onClick={() => executar(() => pagamentosService.obterPagamento(pagamento.codigo))}>
          Já paguei, verificar agora
        </button>
        <button type="button" className="botao botao--alerta" disabled={ocupado} onClick={() => executar(() => pagamentosService.cancelar(pagamento.codigo))}>
          Escolher outra forma de pagamento
        </button>
      </div>

      {pagamento.simulado && pagamento.metodo !== 'paypal' && (
        <div className="caixa-simulacao">
          <p>
            <strong>Demonstração:</strong> simule a resposta do banco.
          </p>
          <div className="acoes-linha">
            <button type="button" className="botao botao--positivo" disabled={ocupado} onClick={() => executar(() => pagamentosService.simularConfirmacao(pagamento.codigo, 'aprovado'))}>
              Simular pagamento confirmado
            </button>
            <button type="button" className="botao botao--alerta" disabled={ocupado} onClick={() => executar(() => pagamentosService.simularConfirmacao(pagamento.codigo, 'recusado'))}>
              Simular recusa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function useContagem(fimIso: string | null) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!fimIso) return;
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [fimIso]);
  if (!fimIso) return null;
  const s = Math.max(0, Math.floor((new Date(fimIso).getTime() - agora) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function Sucesso({ pedido }: { pedido: Pedido }) {
  return (
    <div className="cartao sucesso" role="status">
      <span className="sucesso__icone">
        <Icone nome="check" tamanho={36} />
      </span>
      <h2>Tudo certo! Seu acesso está liberado.</h2>
      <p>
        O curso <strong>{pedido.curso.titulo}</strong> já aparece em “Meus cursos”.
        {pedido.pagoEm && <> Pagamento confirmado em {formatarDataHora(pedido.pagoEm)}.</>}
      </p>
      <div className="acoes-linha">
        <Link to="/meus-cursos" className="botao botao--primario">
          Ir para meus cursos
        </Link>
        <Link to="/cursos" className="botao botao--secundario">
          Ver outros cursos
        </Link>
      </div>
    </div>
  );
}

function Resumo({ pedido, pagamento }: { pedido: Pedido; pagamento: Pagamento | null }) {
  const metodo = pagamento ? pedido.metodos.find((m) => m.metodo === pagamento.metodo)?.rotulo : null;
  return (
    <aside className="cartao resumo-pedido" aria-labelledby="titulo-resumo">
      <h2 id="titulo-resumo">Resumo do pedido</h2>
      <dl>
        <div>
          <dt>Curso</dt>
          <dd>
            <Link to={`/cursos/${pedido.curso.id}`}>{pedido.curso.titulo}</Link>
          </dd>
        </div>
        {metodo && (
          <div>
            <dt>Forma de pagamento</dt>
            <dd>
              {metodo}
              {pagamento?.cartao && ` · ${pagamento.cartao.bandeira} final ${pagamento.cartao.final}`}
              {pagamento && pagamento.parcelas > 1 && ` · ${pagamento.parcelas}x`}
            </dd>
          </div>
        )}
        <div className="resumo-pedido__total">
          <dt>Total</dt>
          <dd>{formatarPreco(pedido.valorCentavos)}</dd>
        </div>
      </dl>
      <p className="texto-suave resumo-pedido__seguro">
        <Icone nome="cadeado" tamanho={16} /> Os dados do cartão vão direto para o processador de pagamentos. O Farol não
        armazena número completo nem código de segurança.
      </p>
      <p className="texto-suave">Pedido {pedido.codigo.slice(0, 8).toUpperCase()}</p>
    </aside>
  );
}
