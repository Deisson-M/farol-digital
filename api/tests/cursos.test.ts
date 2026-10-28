import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SituacaoMatricula } from '../src/db/schema/enums.js';
import { ErroAplicacao } from '../src/lib/erros.js';
import { CursosService, type CursoRegistro, type CursosRepository } from '../src/modules/cursos/cursos.service.js';

const curso = (id: number, preco: number, publicado = true): CursoRegistro => ({
  id,
  slug: `curso-${id}`,
  titulo: `Curso ${id}`,
  descricao: null,
  nivel: 'iniciante',
  cargaHorariaMinutos: 60,
  precoCentavos: preco,
  destaque: false,
  publicado,
});

function criar() {
  const cursos = [curso(1, 0), curso(2, 9990), curso(3, 0, false)];
  const matriculas = new Map<string, SituacaoMatricula>();
  const repo: CursosRepository = {
    async listar(f) {
      const itens = cursos.filter((c) => (f.incluirRascunhos || c.publicado) && (!f.preco || (f.preco === 'gratuito') === (c.precoCentavos === 0)));
      return { itens, total: itens.length };
    },
    buscarPorId: async (id) => cursos.find((c) => c.id === id) ?? null,
    situacaoMatricula: async (u, c) => matriculas.get(`${u}:${c}`) ?? null,
    matricular: async (u, c) => void matriculas.set(`${u}:${c}`, 'ativa'),
    listarMatriculas: async () => [],
  };
  return { service: new CursosService(repo, { registrar: async () => {} }), matriculas };
}

const erro = (status: number) => (e: unknown) => e instanceof ErroAplicacao && e.status === status;

describe('CursosService', () => {
  it('filtra gratuitos/pagos e marca o campo gratuito', async () => {
    const { service } = criar();
    const pagos = await service.listar({ preco: 'pago', pagina: 1, limite: 10 }, false);
    assert.deepEqual(pagos.itens.map((c) => [c.id, c.gratuito]), [[2, false]]);
    assert.equal((await service.listar({ pagina: 1, limite: 10 }, false)).total, 2);
  });

  it('matrícula direta só em curso gratuito publicado', async () => {
    const { service, matriculas } = criar();
    await service.matricularGratuito(5, 1, 'c');
    assert.equal(matriculas.get('5:1'), 'ativa');
    await assert.rejects(service.matricularGratuito(5, 1, 'c'), erro(409));
    await assert.rejects(service.matricularGratuito(5, 2, 'c'), erro(422));
    await assert.rejects(service.matricularGratuito(5, 3, 'c'), erro(404));
  });

  it('detalhe informa a matrícula do usuário e esconde rascunhos', async () => {
    const { service } = criar();
    await service.matricularGratuito(5, 1, 'c');
    assert.equal((await service.detalhar(1, 5, false)).matricula, 'ativa');
    assert.equal((await service.detalhar(1, null, false)).matricula, null);
    await assert.rejects(service.detalhar(3, null, false), erro(404));
  });
});
