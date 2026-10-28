import { z } from 'zod';
import { CRITERIOS_CONCLUSAO, NIVEIS, SITUACOES_TRILHA } from '../../db/schema/enums.js';

export const idParam = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

export const filtrosCatalogo = z.object({
  nivel: z.enum(NIVEIS).optional(),
  tema: z.string().trim().max(80).optional(),
  busca: z.string().trim().max(120).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(12),
});
export type FiltrosCatalogo = z.infer<typeof filtrosCatalogo>;

const objetivos = z
  .array(z.string().trim().min(3, 'Cada objetivo precisa de pelo menos 3 caracteres.').max(240))
  .min(1, 'Informe pelo menos um objetivo de aprendizagem.')
  .max(12, 'Use no máximo 12 objetivos.');

const camposTrilha = {
  titulo: z.string().trim().min(5, 'O título precisa de pelo menos 5 caracteres.').max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens.')
    .max(160),
  descricao: z.string().trim().min(20, 'A descrição precisa de pelo menos 20 caracteres.').max(5000),
  tema: z.string().trim().min(3).max(80),
  nivel: z.enum(NIVEIS),
  objetivos,
  criterioConclusao: z.enum(CRITERIOS_CONCLUSAO),
  percentualMinimo: z.number().int().min(1).max(100),
  publicada: z.boolean(),
};

/** Novas trilhas nascem como rascunho; a publicação é feita via PATCH após associar cursos. */
export const criarTrilhaBody = z
  .object({
    titulo: camposTrilha.titulo,
    slug: camposTrilha.slug.optional(),
    descricao: camposTrilha.descricao,
    tema: camposTrilha.tema,
    nivel: camposTrilha.nivel,
    objetivos: camposTrilha.objetivos,
    criterioConclusao: camposTrilha.criterioConclusao.default('todos_obrigatorios'),
    percentualMinimo: camposTrilha.percentualMinimo.default(100),
  })
  .strict();
export type CriarTrilhaDados = z.infer<typeof criarTrilhaBody>;

export const atualizarTrilhaBody = z
  .object(camposTrilha)
  .partial()
  .strict()
  .refine((dados) => Object.keys(dados).length > 0, { message: 'Informe ao menos um campo para atualizar.' });
export type AtualizarTrilhaDados = z.infer<typeof atualizarTrilhaBody>;

export const definirCursosBody = z
  .object({
    cursos: z
      .array(
        z
          .object({
            cursoId: z.number().int().positive(),
            obrigatorio: z.boolean().default(true),
            requerAnteriores: z.boolean().default(true),
          })
          .strict(),
      )
      .max(50, 'Uma trilha pode ter no máximo 50 cursos.'),
  })
  .strict();
export type DefinirCursosDados = z.infer<typeof definirCursosBody>;

// ---------- Respostas ----------

export const trilhaResumoSchema = z.object({
  id: z.number(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  tema: z.string(),
  nivel: z.enum(NIVEIS),
  publicada: z.boolean(),
  totalCursos: z.number(),
  cargaHorariaTotalMinutos: z.number(),
});

export const cursoDaTrilhaSchema = z.object({
  cursoId: z.number(),
  titulo: z.string(),
  ordem: z.number(),
  obrigatorio: z.boolean(),
  requerAnteriores: z.boolean(),
  cargaHorariaMinutos: z.number(),
});

export const trilhaDetalheSchema = trilhaResumoSchema.extend({
  objetivos: z.array(z.string()),
  criterioConclusao: z.enum(CRITERIOS_CONCLUSAO),
  percentualMinimo: z.number(),
  criterio: z.string(),
  cursos: z.array(cursoDaTrilhaSchema),
});

export const paginaTrilhasSchema = z.object({
  itens: z.array(trilhaResumoSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
});

export const progressoTrilhaSchema = z.object({
  trilhaId: z.number(),
  situacao: z.enum(SITUACOES_TRILHA),
  percentual: z.number(),
  cursosConcluidos: z.number(),
  cursosConsiderados: z.number(),
  criterio: z.string(),
  cargaHorariaTotalMinutos: z.number(),
  cargaHorariaRestanteMinutos: z.number(),
  iniciadaEm: z.string().nullable(),
  concluidaEm: z.string().nullable(),
  proximaEtapa: z
    .object({ cursoId: z.number(), titulo: z.string(), motivo: z.enum(['continuar', 'iniciar']) })
    .nullable(),
  cursos: z.array(
    cursoDaTrilhaSchema.extend({
      status: z.enum(['concluido', 'em_andamento', 'disponivel', 'bloqueado']),
      progressoPercentual: z.number(),
      pendencias: z.array(z.string()),
    }),
  ),
});

export const minhaTrilhaSchema = trilhaResumoSchema.extend({
  progresso: progressoTrilhaSchema.omit({ cursos: true }),
});
