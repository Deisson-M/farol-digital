/**
 * Regras de negócio puras das trilhas de aprendizagem (sem dependência de
 * banco ou framework), para que possam ser testadas isoladamente.
 */
import type { CriterioConclusao, SituacaoMatricula, SituacaoTrilha } from '../../db/schema/enums.js';

export type StatusCursoNaTrilha = 'concluido' | 'em_andamento' | 'disponivel' | 'bloqueado';

export interface CursoDaTrilha {
  cursoId: number;
  titulo: string;
  ordem: number;
  obrigatorio: boolean;
  requerAnteriores: boolean;
  cargaHorariaMinutos: number;
}

export interface MatriculaResumo {
  cursoId: number;
  situacao: SituacaoMatricula;
  progressoPercentual: number;
}

export interface CriteriosTrilha {
  criterioConclusao: CriterioConclusao;
  percentualMinimo: number;
}

export interface CursoComStatus extends CursoDaTrilha {
  status: StatusCursoNaTrilha;
  progressoPercentual: number;
  /** Títulos dos cursos obrigatórios anteriores ainda não concluídos. */
  pendencias: string[];
}

export interface ResultadoProgresso {
  cursos: CursoComStatus[];
  percentual: number;
  cursosConcluidos: number;
  cursosConsiderados: number;
  situacao: SituacaoTrilha;
  proximaEtapa: { cursoId: number; titulo: string; motivo: 'continuar' | 'iniciar' } | null;
  cargaHorariaTotalMinutos: number;
  cargaHorariaRestanteMinutos: number;
  criterio: string;
}

const ordenar = (cursos: CursoDaTrilha[]) => [...cursos].sort((a, b) => a.ordem - b.ordem);

/** Matrículas canceladas não contam como andamento nem conclusão. */
function statusMatricula(matricula: MatriculaResumo | undefined): 'concluido' | 'em_andamento' | null {
  if (!matricula) return null;
  if (matricula.situacao === 'concluida') return 'concluido';
  if (matricula.situacao === 'ativa' || matricula.situacao === 'trancada') return 'em_andamento';
  return null;
}

export function descreverCriterio(criterios: CriteriosTrilha): string {
  return criterios.criterioConclusao === 'percentual_minimo'
    ? `Concluir pelo menos ${criterios.percentualMinimo}% dos cursos obrigatórios.`
    : 'Concluir todos os cursos obrigatórios da trilha.';
}

/**
 * Calcula o estado de cada curso e o progresso geral da trilha.
 *
 * - Progresso = cursos obrigatórios concluídos ÷ cursos obrigatórios (se a
 *   trilha não tiver obrigatórios, todos os cursos são considerados).
 * - Um curso com `requerAnteriores` fica bloqueado enquanto houver curso
 *   obrigatório de ordem menor não concluído.
 * - Matrícula concluída sempre prevalece (o estudante pode ter feito o curso
 *   fora da trilha); matrícula ativa aparece como "em andamento".
 */
export function calcularProgressoTrilha(
  criterios: CriteriosTrilha,
  cursosTrilha: CursoDaTrilha[],
  matriculas: MatriculaResumo[],
): ResultadoProgresso {
  const porCurso = new Map(matriculas.map((m) => [m.cursoId, m]));
  const ordenados = ordenar(cursosTrilha);
  const pendentesAnteriores: string[] = [];

  const cursos: CursoComStatus[] = ordenados.map((curso) => {
    const matricula = porCurso.get(curso.cursoId);
    const estado = statusMatricula(matricula);
    const pendencias = curso.requerAnteriores ? [...pendentesAnteriores] : [];

    let status: StatusCursoNaTrilha;
    if (estado === 'concluido') status = 'concluido';
    else if (estado === 'em_andamento') status = 'em_andamento';
    else if (pendencias.length > 0) status = 'bloqueado';
    else status = 'disponivel';

    if (curso.obrigatorio && status !== 'concluido') pendentesAnteriores.push(curso.titulo);

    return {
      ...curso,
      status,
      progressoPercentual: status === 'concluido' ? 100 : Math.min(100, Math.max(0, matricula?.progressoPercentual ?? 0)),
      pendencias: status === 'bloqueado' ? pendencias : [],
    };
  });

  const obrigatorios = cursos.filter((c) => c.obrigatorio);
  const considerados = obrigatorios.length > 0 ? obrigatorios : cursos;
  const cursosConcluidos = considerados.filter((c) => c.status === 'concluido').length;
  const cursosConsiderados = considerados.length;
  const percentual = cursosConsiderados === 0 ? 0 : Math.floor((cursosConcluidos / cursosConsiderados) * 100);

  const atingiuCriterio =
    cursosConsiderados > 0 &&
    (criterios.criterioConclusao === 'percentual_minimo'
      ? percentual >= criterios.percentualMinimo
      : cursosConcluidos === cursosConsiderados);

  const houveAtividade = cursos.some((c) => c.status === 'concluido' || c.status === 'em_andamento');
  const situacao: SituacaoTrilha = atingiuCriterio ? 'concluida' : houveAtividade ? 'em_andamento' : 'nao_iniciada';

  const emAndamento = cursos.find((c) => c.status === 'em_andamento');
  const disponivel =
    cursos.find((c) => c.status === 'disponivel' && c.obrigatorio) ?? cursos.find((c) => c.status === 'disponivel');
  const proximaEtapa = emAndamento
    ? { cursoId: emAndamento.cursoId, titulo: emAndamento.titulo, motivo: 'continuar' as const }
    : disponivel
      ? { cursoId: disponivel.cursoId, titulo: disponivel.titulo, motivo: 'iniciar' as const }
      : null;

  const cargaHorariaTotalMinutos = cursos.reduce((total, c) => total + c.cargaHorariaMinutos, 0);
  const cargaHorariaRestanteMinutos = cursos
    .filter((c) => c.status !== 'concluido')
    .reduce((total, c) => total + Math.round(c.cargaHorariaMinutos * (1 - c.progressoPercentual / 100)), 0);

  return {
    cursos,
    percentual,
    cursosConcluidos,
    cursosConsiderados,
    situacao,
    proximaEtapa,
    cargaHorariaTotalMinutos,
    cargaHorariaRestanteMinutos,
    criterio: descreverCriterio(criterios),
  };
}

export interface ProgressoPersistido {
  situacao: SituacaoTrilha;
  iniciadaEm: Date | null;
  concluidaEm: Date | null;
}

/**
 * Decide as datas e a situação a persistir. Uma trilha já concluída permanece
 * concluída (registro histórico), mesmo que novos cursos sejam adicionados
 * depois; o percentual continua refletindo a composição atual.
 */
export function consolidarSituacao(
  anterior: ProgressoPersistido | null,
  calculado: Pick<ResultadoProgresso, 'situacao'>,
  agora: Date,
): ProgressoPersistido {
  const jaConcluida = anterior?.situacao === 'concluida';
  const situacao: SituacaoTrilha = jaConcluida ? 'concluida' : calculado.situacao;
  const iniciadaEm = anterior?.iniciadaEm ?? (situacao !== 'nao_iniciada' ? agora : null);
  const concluidaEm = anterior?.concluidaEm ?? (situacao === 'concluida' ? agora : null);
  return { situacao, iniciadaEm, concluidaEm };
}

export interface ItemSequencia {
  cursoId: number;
  obrigatorio: boolean;
  requerAnteriores: boolean;
}

/**
 * Valida a sequência enviada pelo administrador e retorna a lista de
 * problemas encontrados (vazia quando válida).
 */
export function validarSequencia(itens: ItemSequencia[], cursosExistentes: Set<number>): string[] {
  const problemas: string[] = [];
  const vistos = new Set<number>();

  for (const item of itens) {
    if (vistos.has(item.cursoId)) problemas.push(`O curso ${item.cursoId} aparece mais de uma vez na trilha.`);
    vistos.add(item.cursoId);
    if (!cursosExistentes.has(item.cursoId)) problemas.push(`O curso ${item.cursoId} não existe.`);
  }

  if (itens.length > 0 && !itens.some((i) => i.obrigatorio)) {
    problemas.push('A trilha precisa de pelo menos um curso obrigatório.');
  }

  return problemas;
}

/** Converte a lista ordenada recebida na API em linhas com `ordem` 1..n. */
export function normalizarSequencia(itens: ItemSequencia[]) {
  return itens.map((item, indice) => ({ ...item, ordem: indice + 1 }));
}

/** Gera slug estável a partir do título (sem acentos, minúsculo, hifenizado). */
export function gerarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}
