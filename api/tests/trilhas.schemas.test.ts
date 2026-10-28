import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import '../src/lib/zod-pt.js';
import {
  atualizarTrilhaBody,
  criarTrilhaBody,
  definirCursosBody,
  filtrosCatalogo,
  idParam,
} from '../src/modules/trilhas/trilhas.schemas.js';

const valida = {
  titulo: '  Navegação segura  ',
  descricao: 'Aprenda a navegar com segurança na internet.',
  tema: 'Segurança',
  nivel: 'intermediario',
  objetivos: ['Reconhecer sites confiáveis'],
};

describe('validações de trilhas (Zod)', () => {
  it('aplica padrões e remove espaços na criação', () => {
    const r = criarTrilhaBody.parse(valida);
    assert.equal(r.titulo, 'Navegação segura');
    assert.equal(r.criterioConclusao, 'todos_obrigatorios');
    assert.equal(r.percentualMinimo, 100);
  });

  it('não aceita "publicada" nem campos desconhecidos na criação', () => {
    assert.equal(criarTrilhaBody.safeParse({ ...valida, publicada: true }).success, false);
    assert.equal(criarTrilhaBody.safeParse({ ...valida, criadoPor: 1 }).success, false);
  });

  it('rejeita slug inválido, nível inexistente e lista de objetivos vazia', () => {
    assert.equal(criarTrilhaBody.safeParse({ ...valida, slug: 'Com Espaço' }).success, false);
    assert.equal(criarTrilhaBody.safeParse({ ...valida, nivel: 'expert' }).success, false);
    assert.equal(criarTrilhaBody.safeParse({ ...valida, objetivos: [] }).success, false);
  });

  it('atualização exige ao menos um campo e valida percentual', () => {
    assert.equal(atualizarTrilhaBody.safeParse({}).success, false);
    assert.equal(atualizarTrilhaBody.safeParse({ publicada: true }).success, true);
    assert.equal(atualizarTrilhaBody.safeParse({ percentualMinimo: 0 }).success, false);
    assert.equal(atualizarTrilhaBody.safeParse({ percentualMinimo: 101 }).success, false);
  });

  it('sequência: aplica padrões e limita a 50 cursos', () => {
    const r = definirCursosBody.parse({ cursos: [{ cursoId: 4 }] });
    assert.deepEqual(r.cursos[0], { cursoId: 4, obrigatorio: true, requerAnteriores: true });
    const muitos = Array.from({ length: 51 }, (_, i) => ({ cursoId: i + 1 }));
    assert.equal(definirCursosBody.safeParse({ cursos: muitos }).success, false);
    assert.equal(definirCursosBody.safeParse({ cursos: [{ cursoId: -1 }] }).success, false);
  });

  it('parâmetros: id positivo e paginação com limites', () => {
    assert.equal(idParam.parse({ id: '12' }).id, 12);
    assert.equal(idParam.safeParse({ id: 'abc' }).success, false);
    assert.equal(idParam.safeParse({ id: '0' }).success, false);
    assert.deepEqual(filtrosCatalogo.parse({}), { pagina: 1, limite: 12 });
    assert.equal(filtrosCatalogo.safeParse({ limite: '500' }).success, false);
  });

  it('mensagens padrão em português', () => {
    const r = filtrosCatalogo.safeParse({ limite: '500' });
    assert.equal(r.success, false);
    assert.equal(r.error?.issues[0]?.message, 'O valor máximo é 50.');
    const r2 = criarTrilhaBody.safeParse({ ...valida, extra: 1 });
    assert.equal(r2.error?.issues[0]?.message, 'Campo(s) não permitido(s): extra.');
    const r3 = criarTrilhaBody.safeParse({ ...valida, tema: undefined });
    assert.equal(r3.error?.issues[0]?.message, 'Campo obrigatório.');
  });
});
