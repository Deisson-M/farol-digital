import { useNavigate } from 'react-router-dom';
import { Icone } from './Icone';

/**
 * Volta para a página anterior. Se a pessoa chegou direto pelo link (sem
 * histórico nesta aba), vai para `destinoPadrao`.
 */
export function BotaoVoltar({ destinoPadrao = '/', rotulo = 'Voltar' }: { destinoPadrao?: string; rotulo?: string }) {
  const navegar = useNavigate();
  return (
    <button
      type="button"
      className="botao-voltar"
      onClick={() => {
        const idx = (window.history.state as { idx?: number } | null)?.idx;
        if (typeof idx === 'number' ? idx > 0 : window.history.length > 1) navegar(-1);
        else navegar(destinoPadrao);
      }}
    >
      <Icone nome="voltar" />
      {rotulo}
    </button>
  );
}
