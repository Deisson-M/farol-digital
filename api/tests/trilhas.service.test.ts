import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { ErroAplicacao } from '../src/lib/erros.js';
import type { EventoAuditoria, RegistroAuditoria } from '../src/modules/auditoria/auditoria.service.js';
import type { CursoDaTrilha, MatriculaResumo, ProgressoPersistido } from '../src/modules/trilhas/trilhas.regras.js';
import type { CriarTrilhaDados } from '../src/modules/trilhas/trilhas.schemas.js';
import {
  TrilhasService,
  type ProgressoParaSalvar,
  type TrilhaRegistro,
  type TrilhasRepository,
} from '../src/modules/trilhas/trilhas.service.js';

/** Repositório em memória que segue o mesmo contrato da implementação MySQL. */
class RepositorioMemoria implements TrilhasRepository {
  trilhas = new Map<number, TrilhaRegistro>();
  cursos = new Map<number, { titulo: string; minutos: number }>();
  sequencias = new Map<number, Array<{ cursoId: number; ordem: number; obrigatorio: boolean; requerAnteriores: boolean }>>();
  matriculas: Array<MatriculaResumo & { usuarioId: number }> = [];
  progresso = new Map<string, ProgressoParaSalvar>();
  private proximoId = 1;

  async listar(f: { incluirRascunhos: boolean; pagina: number; limite: number }) {
    const itens = [...this.trilhas.values()]
      .filter((t) => f.incluirRascunhos || t.publicada)
      .map((t) => {
        const seq = this.sequencias.get(t.id) ?? [];
        return {
          ...t,
          totalCursos: seq.length,
          cargaHorariaTotalMinutos: seq.reduce((s, c) => s + (this.cursos.get(c.cursoId)?.minutos ?? 0), 0),
        };
      });
    return { itens: itens.slice((f.pagina - 1) * f.limite, f.pagina * f.limite), total: itens.length };
  }
  async buscarPorId(id: number) {
    return this.trilhas.get(id) ?? null;
  }
  async slugEmUso(slug: string, excetoId?: number) {
    return [...this.trilhas.values()].some((t) => t.slug === slug && t.id !== excetoId);
  }
  async listarCursos(trilhaId: number): Promise<CursoDaTrilha[]> {
    return (this.sequencias.get(trilhaId) ?? []).map((s) => ({
      ...s,
      titulo: this.cursos.get(s.cursoId)?.titulo ?? '?',
      cargaHorariaMinutos: this.cursos.get(s.cursoId)?.minutos ?? 0,
    }));
  }
  async listarMatriculas(usuarioId: number, cursoIds: number[]) {
    return this.matriculas.filter((m) => m.usuarioId === usuarioId && cursoIds.includes(m.cursoId));
  }
  async buscarProgresso(usuarioId: number, trilhaId: number): Promise<ProgressoPersistido | null> {
    return this.progresso.get(`${usuarioId}:${trilhaId}`) ?? null;
  }
  async salvarProgresso(usuarioId: number, trilhaId: number, dados: ProgressoParaSalvar) {
    this.progresso.set(`${usuarioId}:${trilhaId}`, dados);
  }
  async idsTrilhasDoUsuario(usuarioId: number) {
    const ids = new Set<number>();
    for (const [trilhaId, seq] of this.sequencias) {
      if (seq.some((s) => this.matriculas.some((m) => m.usuarioId === usuarioId && m.cursoId === s.cursoId && m.situacao !== 'cancelada'))) {
        ids.add(trilhaId);
      }
    }
    return [...ids].filter((id) => this.trilhas.get(id)?.publicada);
  }
  async cursosExistentes(ids: number[]) {
    return new Set(ids.filter((id) => this.cursos.has(id)));
  }
  async inserir(dados: Omit<TrilhaRegistro, 'id'> & { criadoPor: number }) {
    const id = this.proximoId++;
    const { criadoPor: _autor, ...resto } = dados;
    this.trilhas.set(id, { id, ...resto });
    return id;
  }
  async atualizar(id: number, dados: Partial<TrilhaRegistro>) {
    const atual = this.trilhas.get(id);
    if (atual) this.trilhas.set(id, { ...atual, ...dados });
  }
  async substituirCursos(trilhaId: number, linhas: Array<{ cursoId: number; ordem: number; obrigatorio: boolean; requerAnteriores: boolean }>) {
    this.sequencias.set(trilhaId, linhas);
  }
}

class AuditoriaMemoria implements RegistroAuditoria {
  eventos: EventoAuditoria[] = [];
  async registrar(evento: EventoAuditoria) {
    this.eventos.push(evento);
  }
}

const ctx = { usuarioId: 1, correlacaoId: 'teste-correlacao-1' };
const ESTUDANTE = 10;

const dadosTrilha = (extra: Partial<CriarTrilhaDados> = {}): CriarTrilhaDados => ({
  titulo: 'Navegação segura na internet',
  descricao: 'Aprenda a navegar com segurança e reconhecer sites confiáveis.',
  tema: 'Segurança digital',
  nivel: 'intermediario',
  objetivos: ['Verificar sites confiáveis'],
  criterioConclusao: 'todos_obrigatorios',
  percentualMinimo: 100,
  ...extra,
});

async function esperarErro(promessa: Promise<unknown>, status: number) {
  await assert.rejects(promessa, (erro: unknown) => {
    assert.ok(erro instanceof ErroAplicacao, 'deveria ser ErroAplicacao');
    assert.equal(erro.status, status);
    return true;
  });
}

describe('TrilhasService', () => {
  let repo: RepositorioMemoria;
  let auditoria: AuditoriaMemoria;
  let service: TrilhasService;
  const agora = new Date('2026-10-20T12:00:00Z');

  beforeEach(() => {
    repo = new RepositorioMemoria();
    auditoria = new AuditoriaMemoria();
    service = new TrilhasService(repo, auditoria, () => agora);
    repo.cursos.set(1, { titulo: 'Navegadores', minutos: 60 });
    repo.cursos.set(2, { titulo: 'Downloads seguros', minutos: 90 });
    repo.cursos.set(3, { titulo: 'Atualizações', minutos: 30 });
  });

  async function criarPublicada() {
    const trilha = await service.criar(dadosTrilha(), ctx);
    await service.definirCursos(
      trilha.id,
      [
        { cursoId: 1, obrigatorio: true, requerAnteriores: true },
        { cursoId: 2, obrigatorio: true, requerAnteriores: true },
        { cursoId: 3, obrigatorio: false, requerAnteriores: false },
      ],
      ctx,
    );
    await service.atualizar(trilha.id, { publicada: true }, ctx);
    return trilha.id;
  }

  it('cria trilha como rascunho, gera slug e audita', async () => {
    const trilha = await service.criar(dadosTrilha(), ctx);
    assert.equal(trilha.slug, 'navegacao-segura-na-internet');
    assert.equal(trilha.publicada, false);
    assert.equal(auditoria.eventos[0]?.acao, 'trilha.criar');
    assert.equal(auditoria.eventos[0]?.correlacaoId, 'teste-correlacao-1');
  });

  it('rejeita slug duplicado com 409', async () => {
    await service.criar(dadosTrilha(), ctx);
    await esperarErro(service.criar(dadosTrilha(), ctx), 409);
  });

  it('não publica trilha sem cursos (422)', async () => {
    const trilha = await service.criar(dadosTrilha(), ctx);
    await esperarErro(service.atualizar(trilha.id, { publicada: true }, ctx), 422);
  });

  it('publica após associar cursos e registra trilha.publicar', async () => {
    const id = await criarPublicada();
    const detalhe = await service.detalhar(id, false);
    assert.equal(detalhe.publicada, true);
    assert.equal(detalhe.totalCursos, 3);
    assert.equal(detalhe.cargaHorariaTotalMinutos, 180);
    assert.deepEqual(auditoria.eventos.map((e) => e.acao), ['trilha.criar', 'trilha.definir_cursos', 'trilha.publicar']);
  });

  it('rascunho é invisível para o público (404) e visível para gestores', async () => {
    const trilha = await service.criar(dadosTrilha(), ctx);
    await esperarErro(service.detalhar(trilha.id, false), 404);
    assert.equal((await service.detalhar(trilha.id, true)).id, trilha.id);
    assert.equal((await service.listar({ pagina: 1, limite: 12 }, false)).total, 0);
    assert.equal((await service.listar({ pagina: 1, limite: 12 }, true)).total, 1);
  });

  it('rejeita sequência com curso inexistente ou duplicado (422) sem alterar a trilha', async () => {
    const trilha = await service.criar(dadosTrilha(), ctx);
    await esperarErro(
      service.definirCursos(trilha.id, [{ cursoId: 1, obrigatorio: true, requerAnteriores: true }, { cursoId: 1, obrigatorio: true, requerAnteriores: true }], ctx),
      422,
    );
    await esperarErro(service.definirCursos(trilha.id, [{ cursoId: 42, obrigatorio: true, requerAnteriores: true }], ctx), 422);
    assert.equal(repo.sequencias.get(trilha.id), undefined);
  });

  it('não permite esvaziar trilha publicada', async () => {
    const id = await criarPublicada();
    await esperarErro(service.definirCursos(id, [], ctx), 422);
  });

  it('calcula e persiste o progresso do estudante', async () => {
    const id = await criarPublicada();
    repo.matriculas.push({ usuarioId: ESTUDANTE, cursoId: 1, situacao: 'concluida', progressoPercentual: 100 });

    const progresso = await service.progresso(ESTUDANTE, id);
    assert.equal(progresso.percentual, 50);
    assert.equal(progresso.situacao, 'em_andamento');
    assert.equal(progresso.proximaEtapa?.cursoId, 2);
    assert.equal(progresso.iniciadaEm, agora.toISOString());
    assert.deepEqual(progresso.cursos.map((c) => c.status), ['concluido', 'disponivel', 'disponivel']);
    assert.equal(repo.progresso.get(`${ESTUDANTE}:${id}`)?.percentual, 50);
  });

  it('não expõe progresso de trilha não publicada', async () => {
    const trilha = await service.criar(dadosTrilha(), ctx);
    await esperarErro(service.progresso(ESTUDANTE, trilha.id), 404);
  });

  it('"minhas trilhas" lista apenas trilhas com matrícula do próprio usuário', async () => {
    const id = await criarPublicada();
    repo.matriculas.push({ usuarioId: ESTUDANTE, cursoId: 2, situacao: 'ativa', progressoPercentual: 30 });
    repo.matriculas.push({ usuarioId: 99, cursoId: 1, situacao: 'concluida', progressoPercentual: 100 });

    const minhas = await service.minhas(ESTUDANTE);
    assert.equal(minhas.length, 1);
    assert.equal(minhas[0]?.id, id);
    assert.equal(minhas[0]?.progresso.percentual, 0);
    assert.equal(minhas[0]?.progresso.situacao, 'em_andamento');
    assert.equal((await service.minhas(12345)).length, 0);
  });

  it('mantém trilha concluída mesmo após novo curso obrigatório ser adicionado', async () => {
    const id = await criarPublicada();
    repo.matriculas.push(
      { usuarioId: ESTUDANTE, cursoId: 1, situacao: 'concluida', progressoPercentual: 100 },
      { usuarioId: ESTUDANTE, cursoId: 2, situacao: 'concluida', progressoPercentual: 100 },
    );
    assert.equal((await service.progresso(ESTUDANTE, id)).situacao, 'concluida');

    await service.definirCursos(
      id,
      [
        { cursoId: 1, obrigatorio: true, requerAnteriores: true },
        { cursoId: 2, obrigatorio: true, requerAnteriores: true },
        { cursoId: 3, obrigatorio: true, requerAnteriores: true },
      ],
      ctx,
    );
    const depois = await service.progresso(ESTUDANTE, id);
    assert.equal(depois.situacao, 'concluida');
    assert.equal(depois.percentual, 66);
    assert.equal(depois.concluidaEm, agora.toISOString());
  });

  it('atualizar trilha inexistente retorna 404', async () => {
    await esperarErro(service.atualizar(999, { titulo: 'Novo título' }, ctx), 404);
  });
});
