/**
 * Seed de DESENVOLVIMENTO do Farol Digital: cria usuários de demonstração, cursos,
 * trilhas e algumas matrículas para visualizar o progresso.
 * Idempotente: pode ser executado várias vezes sem duplicar registros.
 */
import { readFileSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { gerarSlug } from '../modules/trilhas/trilhas.regras.js';
import { db, pool } from './client.js';
import { VERSAO_TERMOS } from '../modules/auth/auth.regras.js';
import { cursos, matriculas, usuarios, type Nivel, type Papel, type SituacaoDocente } from './schema/base.js';
import { trilhaCursos, trilhas } from './schema/trilhas.js';

if (env.NODE_ENV === 'production') {
  console.error('O seed de demonstração não pode ser executado em produção.');
  process.exit(1);
}

const SENHA = env.SEED_SENHA_PADRAO ?? 'Farol@2026dev';

interface DadosSeed {
  usuarios: Array<{ nome: string; email: string; papel: Papel; situacaoDocente?: SituacaoDocente; areaAtuacao?: string }>;
  /** Iniciante e intermediário são gratuitos; avançados são pagos (preço em centavos). */
  cursos: Array<{ titulo: string; nivel: Nivel; minutos: number; preco?: number; destaque?: boolean; descricao: string }>;
  trilhas: Array<{
    titulo: string;
    tema: string;
    nivel: Nivel;
    descricao: string;
    objetivos: string[];
    criterio?: 'todos_obrigatorios' | 'percentual_minimo';
    percentualMinimo?: number;
    cursos: Array<{ titulo: string; obrigatorio?: boolean; requerAnteriores?: boolean }>;
  }>;
  matriculas: Array<{ email: string; curso: string; situacao: 'ativa' | 'concluida'; progresso: number }>;
}

/** Os dados de demonstração ficam em dados-seed.json (o mesmo conteúdo do arquivo .sql do banco). */
const DADOS = JSON.parse(readFileSync(new URL('./dados-seed.json', import.meta.url), 'utf-8')) as DadosSeed;
const USUARIOS = DADOS.usuarios;
const CURSOS = DADOS.cursos;
const TRILHAS = DADOS.trilhas;

async function semear() {
  const senhaHash = await bcrypt.hash(SENHA, 12);

  for (const u of USUARIOS) {
    await db
      .insert(usuarios)
      .values({
        ...u,
        senhaHash,
        situacaoDocente: u.situacaoDocente ?? 'nao_se_aplica',
        termosVersao: VERSAO_TERMOS,
        termosAceitosEm: new Date(),
      })
      .onDuplicateKeyUpdate({ set: { nome: u.nome, papel: u.papel, situacaoDocente: u.situacaoDocente ?? 'nao_se_aplica' } });
  }

  for (const c of CURSOS) {
    await db
      .insert(cursos)
      .values({
        slug: gerarSlug(c.titulo),
        titulo: c.titulo,
        descricao: c.descricao,
        nivel: c.nivel,
        cargaHorariaMinutos: c.minutos,
        precoCentavos: c.preco ?? 0,
        destaque: c.destaque ?? false,
        publicado: true,
      })
      .onDuplicateKeyUpdate({
        set: { titulo: c.titulo, descricao: c.descricao, cargaHorariaMinutos: c.minutos, precoCentavos: c.preco ?? 0, destaque: c.destaque ?? false },
      });
  }

  const listaCursos = await db.select({ id: cursos.id, titulo: cursos.titulo }).from(cursos);
  const idCurso = new Map(listaCursos.map((c) => [c.titulo, c.id]));
  const [admin] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, 'admin@farol.dev'));

  for (const t of TRILHAS) {
    const slug = gerarSlug(t.titulo);
    await db
      .insert(trilhas)
      .values({
        slug,
        titulo: t.titulo,
        descricao: t.descricao,
        tema: t.tema,
        nivel: t.nivel,
        objetivos: t.objetivos,
        criterioConclusao: t.criterio ?? 'todos_obrigatorios',
        percentualMinimo: t.percentualMinimo ?? 100,
        publicada: true,
        criadoPor: admin?.id ?? null,
      })
      .onDuplicateKeyUpdate({
        set: { descricao: t.descricao, objetivos: t.objetivos, criterioConclusao: t.criterio ?? 'todos_obrigatorios', percentualMinimo: t.percentualMinimo ?? 100 },
      });

    const [trilha] = await db.select({ id: trilhas.id }).from(trilhas).where(eq(trilhas.slug, slug));
    if (!trilha) continue;

    await db.delete(trilhaCursos).where(eq(trilhaCursos.trilhaId, trilha.id));
    await db.insert(trilhaCursos).values(
      t.cursos.map((c, i) => {
        const cursoId = idCurso.get(c.titulo);
        if (!cursoId) throw new Error(`Curso do seed não encontrado: ${c.titulo}`);
        return {
          trilhaId: trilha.id,
          cursoId,
          ordem: i + 1,
          obrigatorio: c.obrigatorio ?? true,
          requerAnteriores: c.requerAnteriores ?? true,
        };
      }),
    );
  }

  // Matrículas de demonstração (para visualizar o progresso nas trilhas).
  const listaUsuarios = await db.select({ id: usuarios.id, email: usuarios.email }).from(usuarios);
  const idUsuario = new Map(listaUsuarios.map((u) => [u.email, u.id]));
  for (const m of DADOS.matriculas) {
    const usuarioId = idUsuario.get(m.email);
    const cursoId = idCurso.get(m.curso);
    if (!usuarioId || !cursoId) continue;
    const [existente] = await db
      .select({ id: matriculas.id })
      .from(matriculas)
      .where(and(eq(matriculas.usuarioId, usuarioId), eq(matriculas.cursoId, cursoId)));
    if (existente) continue;
    await db.insert(matriculas).values({
      usuarioId,
      cursoId,
      situacao: m.situacao,
      progressoPercentual: m.progresso,
      concluidoEm: m.situacao === 'concluida' ? new Date() : null,
    });
  }

  console.log('Seed concluído. Usuários de demonstração (senha definida em SEED_SENHA_PADRAO):');
  for (const u of USUARIOS) console.log(`  ${u.papel.padEnd(12)} ${u.email}`);
}

semear()
  .catch((erro: unknown) => {
    console.error('Falha no seed:', erro);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
