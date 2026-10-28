import { BotaoVoltar } from '../components/BotaoVoltar';

/**
 * MODELO de Termos de Uso e Aviso de Privacidade. O texto final deve ser
 * revisado pela assessoria jurídica e pelo encarregado (DPO) antes da publicação.
 */
export function TermosPage() {
  return (
    <article className="pagina pagina--media texto-longo" aria-labelledby="titulo-termos">
      <BotaoVoltar destinoPadrao="/cadastro" />
      <h1 id="titulo-termos">Termos de Uso e Aviso de Privacidade</h1>
      <p className="aviso-info aviso-info--alerta">Versão 2026.10 — texto-modelo, sujeito a revisão jurídica.</p>

      <section id="termos" tabIndex={-1} aria-labelledby="titulo-uso">
        <h2 id="titulo-uso">Termos de Uso</h2>
        <p>Ao criar uma conta, você concorda em usar a plataforma para fins educacionais, mantendo seus dados de acesso em sigilo.</p>
        <p>É proibido publicar ou enviar conteúdo discriminatório, ofensivo ou que incite ódio por raça, cor, etnia, religião, origem, gênero, orientação sexual, idade ou deficiência. Contas que descumprirem esta regra podem ser suspensas.</p>
        <p>Cursos pagos são liberados após a confirmação do pagamento. O direito de arrependimento segue o Código de Defesa do Consumidor (7 dias para compras on-line).</p>
        <p>Cadastros de professor passam por análise antes da liberação das ferramentas de ensino.</p>
      </section>

      <section id="privacidade" tabIndex={-1} aria-labelledby="titulo-privacidade">
        <h2 id="titulo-privacidade">Aviso de Privacidade</h2>
        <p>
          <strong>Dados coletados:</strong> nome, e-mail, telefone (opcional), área de atuação (professores), progresso nos cursos e
          histórico de compras. No boleto, o CPF é enviado ao processador de pagamentos e guardamos somente parte do número.
        </p>
        <p>
          <strong>Finalidades:</strong> criar e manter sua conta, oferecer os cursos, processar pagamentos, emitir certificados e
          cumprir obrigações legais.
        </p>
        <p>
          <strong>Cartões:</strong> o número completo e o código de segurança não passam pelos nossos servidores — vão direto
          para o processador de pagamentos.
        </p>
        <p>
          <strong>Seus direitos (LGPD):</strong> acesso, correção, portabilidade, eliminação e informações sobre o tratamento.
          A central “Minha privacidade” será disponibilizada na plataforma.
        </p>
      </section>
    </article>
  );
}
