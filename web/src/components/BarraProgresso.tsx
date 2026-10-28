interface Props {
  valor: number;
  rotulo: string;
  /** Texto complementar exibido ao lado do percentual (ex.: "2 de 3 cursos"). */
  descricao?: string;
  tamanho?: 'normal' | 'grande';
}

/** Barra de progresso acessível: expõe valor numérico e texto, não apenas a cor. */
export function BarraProgresso({ valor, rotulo, descricao, tamanho = 'normal' }: Props) {
  const percentual = Math.min(100, Math.max(0, Math.round(valor)));
  return (
    <div className={`progresso progresso--${tamanho}`}>
      <div className="progresso__cabecalho">
        <span className="progresso__rotulo">{rotulo}</span>
        <span className="progresso__valor">
          {percentual}%{descricao ? <span className="texto-suave"> · {descricao}</span> : null}
        </span>
      </div>
      <div
        className="progresso__trilho"
        role="progressbar"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentual}
        aria-valuetext={descricao ? `${percentual}%, ${descricao}` : `${percentual}%`}
      >
        <div className="progresso__preenchimento" style={{ width: `${percentual}%` }} />
      </div>
    </div>
  );
}
