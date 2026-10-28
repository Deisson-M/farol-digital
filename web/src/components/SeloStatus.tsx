import { STATUS_CURSO } from '../lib/formatos';
import type { StatusCurso } from '../types/trilhas';

export function SeloStatus({ status }: { status: StatusCurso }) {
  const { rotulo, simbolo } = STATUS_CURSO[status];
  return (
    <span className={`selo selo--${status}`}>
      <span className="selo__simbolo" aria-hidden="true">
        {simbolo}
      </span>
      {rotulo}
    </span>
  );
}
