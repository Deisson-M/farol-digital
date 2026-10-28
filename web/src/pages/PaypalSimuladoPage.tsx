import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Carregando, EstadoErro } from '../components/Estados';
import { useRequisicao } from '../hooks/useRequisicao';
import { formatarPreco } from '../lib/formatos';
import { normalizarErro } from '../services/api';
import { pagamentosService } from '../services/pagamentos.service';
import type { ErroApi } from '../types/api';

/**
 * Tela que imita a aprovação no PayPal (SOMENTE no ambiente de demonstração).
 * Com o gateway real, o usuário é redirecionado ao site do PayPal e volta por URL de retorno.
 */
export function PaypalSimuladoPage() {
  const codigo = useParams().codigo ?? '';
  const pedido = useSearchParams()[0].get('pedido');
  const navegar = useNavigate();
  const pagamento = useRequisicao(() => pagamentosService.obterPagamento(codigo), [codigo]);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const voltar = () => navegar(pedido ? `/checkout/${pedido}` : '/meus-cursos', { replace: true });

  async function decidir(resultado: 'aprovado' | 'recusado') {
    setOcupado(true);
    setErro(null);
    try {
      if (resultado === 'aprovado') await pagamentosService.simularConfirmacao(codigo, 'aprovado');
      else await pagamentosService.cancelar(codigo);
      voltar();
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setOcupado(false);
    }
  }

  if (pagamento.carregando) return <Carregando texto="Conectando ao PayPal…" />;
  if (pagamento.erro) return <EstadoErro erro={pagamento.erro} />;
  if (!pagamento.dados) return null;

  return (
    <section className="pagina pagina--estreita" aria-labelledby="titulo-paypal">
      <div className="cartao paypal-simulado">
        <p className="aviso-info aviso-info--alerta">Simulação do PayPal — nenhuma conta real é usada.</p>
        <h1 id="titulo-paypal">Autorizar pagamento</h1>
        <p>
          Farol Digital solicita <strong>{formatarPreco(pagamento.dados.valorCentavos)}</strong>.
        </p>
        {erro && <EstadoErro erro={erro} />}
        {pagamento.dados.situacao === 'pendente' ? (
          <div className="acoes-linha">
            <button type="button" className="botao botao--positivo" disabled={ocupado} onClick={() => decidir('aprovado')}>
              Autorizar pagamento
            </button>
            <button type="button" className="botao botao--secundario" disabled={ocupado} onClick={() => decidir('recusado')}>
              Cancelar e voltar
            </button>
          </div>
        ) : (
          <button type="button" className="botao botao--primario" onClick={voltar}>
            Voltar à loja
          </button>
        )}
      </div>
    </section>
  );
}
