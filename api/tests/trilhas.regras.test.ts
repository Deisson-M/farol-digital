import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calcularProgressoTrilha,
  consolidarSituacao,
  gerarSlug,
  normalizarSequencia,
  validarSequencia,
  type CursoDaTrilha,
  type MatriculaResumo,
} from '../src/modules/trilhas/trilhas.regras.js';

const curso = (cursoId: number, ordem: number, extra: Partial<CursoDaTrilha> = {}): CursoDaTrilha => ({
  cursoId,
  titulo: `Curso ${cursoId}`,
  ordem,
  obrigatorio: true,
  requerAnteriores: true,
  cargaHorariaMinutos: 60,
  ...extra,
});

const todos = { criterioConclusao: 'todos_obrigatorios' as const, percentualMinimo: 100 };
const trilhaBasica = [curso(1, 1), curso(2, 2), curso(3, 3)];

describe('calcularProgressoTrilha', () => {
  it('sem matrículas: 0%, não iniciada, só o primeiro curso liberado', () => {
    const r = calcularProgressoTrilha(todos, trilhaBasica, []);
    assert.equal(r.percentual, 0);
    assert.equal(r.situacao, 'nao_iniciada');
    assert.deepEqual(r.cursos.map((c) => c.status), ['disponivel', 'bloqueado', 'bloqueado']);
    assert.deepEqual(r.proximaEtapa, { cursoId: 1, titulo: 'Curso 1', motivo: 'iniciar' });
    assert.deepEqual(r.cursos[1]?.pendencias, ['Curso 1']);
    assert.deepEqual(r.cursos[2]?.pendencias, ['Curso 1', 'Curso 2']);
    assert.equal(r.cargaHorariaTotalMinutos, 180);
  });

  it('libera a próxima etapa após concluir a anterior e recomenda continuar o curso em andamento', () => {
    const matriculas: MatriculaResumo[] = [
      { cursoId: 1, situacao: 'concluida', progressoPercentual: 100 },
      { cursoId: 2, situacao: 'ativa', progressoPercentual: 50 },
    ];
    const r = calcularProgressoTrilha(todos, trilhaBasica, matriculas);
    assert.deepEqual(r.cursos.map((c) => c.status), ['concluido', 'em_andamento', 'bloqueado']);
    assert.equal(r.percentual, 33);
    assert.equal(r.cursosConcluidos, 1);
    assert.equal(r.situacao, 'em_andamento');
    assert.equal(r.proximaEtapa?.motivo, 'continuar');
    assert.equal(r.proximaEtapa?.cursoId, 2);
    // 60 min restantes do curso 2 pela metade (30) + curso 3 inteiro (60)
    assert.equal(r.cargaHorariaRestanteMinutos, 90);
  });

  it('conclui a trilha quando todos os obrigatórios estão concluídos (opcional não bloqueia)', () => {
    const cursos = [curso(1, 1), curso(2, 2, { obrigatorio: false, requerAnteriores: false }), curso(3, 3)];
    const r = calcularProgressoTrilha(todos, cursos, [
      { cursoId: 1, situacao: 'concluida', progressoPercentual: 100 },
      { cursoId: 3, situacao: 'concluida', progressoPercentual: 100 },
    ]);
    assert.equal(r.cursosConsiderados, 2);
    assert.equal(r.percentual, 100);
    assert.equal(r.situacao, 'concluida');
    assert.equal(r.cursos[1]?.status, 'disponivel');
  });

  it('curso opcional não conta como pré-requisito de etapas posteriores', () => {
    const cursos = [curso(1, 1, { obrigatorio: false }), curso(2, 2)];
    const r = calcularProgressoTrilha(todos, cursos, []);
    assert.deepEqual(r.cursos.map((c) => c.status), ['disponivel', 'disponivel']);
    // Recomenda primeiro o obrigatório disponível
    assert.equal(r.proximaEtapa?.cursoId, 2);
  });

  it('requerAnteriores = false libera o curso mesmo com pendências anteriores', () => {
    const cursos = [curso(1, 1), curso(2, 2, { requerAnteriores: false })];
    const r = calcularProgressoTrilha(todos, cursos, []);
    assert.equal(r.cursos[1]?.status, 'disponivel');
    assert.deepEqual(r.cursos[1]?.pendencias, []);
  });

  it('curso concluído fora da ordem continua contando como concluído', () => {
    const r = calcularProgressoTrilha(todos, trilhaBasica, [{ cursoId: 3, situacao: 'concluida', progressoPercentual: 100 }]);
    assert.equal(r.cursos[2]?.status, 'concluido');
    assert.equal(r.cursosConcluidos, 1);
  });

  it('matrícula cancelada não conta como andamento nem conclusão', () => {
    const r = calcularProgressoTrilha(todos, trilhaBasica, [{ cursoId: 1, situacao: 'cancelada', progressoPercentual: 80 }]);
    assert.equal(r.cursos[0]?.status, 'disponivel');
    assert.equal(r.cursos[0]?.progressoPercentual, 80);
    assert.equal(r.situacao, 'nao_iniciada');
  });

  it('critério de percentual mínimo conclui antes de 100%', () => {
    const cursos = [curso(1, 1), curso(2, 2, { requerAnteriores: false }), curso(3, 3, { requerAnteriores: false }), curso(4, 4, { requerAnteriores: false })];
    const matriculas: MatriculaResumo[] = [1, 2, 3].map((id) => ({ cursoId: id, situacao: 'concluida', progressoPercentual: 100 }));
    const r = calcularProgressoTrilha({ criterioConclusao: 'percentual_minimo', percentualMinimo: 75 }, cursos, matriculas);
    assert.equal(r.percentual, 75);
    assert.equal(r.situacao, 'concluida');
    assert.match(r.criterio, /75%/);
  });

  it('ordena pela coluna ordem mesmo que os cursos cheguem fora de ordem', () => {
    const r = calcularProgressoTrilha(todos, [curso(3, 3), curso(1, 1), curso(2, 2)], []);
    assert.deepEqual(r.cursos.map((c) => c.cursoId), [1, 2, 3]);
  });

  it('trilha sem cursos: 0% e nunca concluída', () => {
    const r = calcularProgressoTrilha(todos, [], []);
    assert.equal(r.percentual, 0);
    assert.equal(r.situacao, 'nao_iniciada');
    assert.equal(r.proximaEtapa, null);
  });

  it('limita progresso informado fora da faixa 0–100', () => {
    const r = calcularProgressoTrilha(todos, trilhaBasica, [{ cursoId: 1, situacao: 'ativa', progressoPercentual: 250 }]);
    assert.equal(r.cursos[0]?.progressoPercentual, 100);
  });
});

describe('consolidarSituacao', () => {
  const agora = new Date('2026-10-20T12:00:00Z');

  it('registra início e conclusão na primeira vez', () => {
    assert.deepEqual(consolidarSituacao(null, { situacao: 'concluida' }, agora), {
      situacao: 'concluida',
      iniciadaEm: agora,
      concluidaEm: agora,
    });
  });

  it('não registra início para trilha não iniciada', () => {
    assert.deepEqual(consolidarSituacao(null, { situacao: 'nao_iniciada' }, agora), {
      situacao: 'nao_iniciada',
      iniciadaEm: null,
      concluidaEm: null,
    });
  });

  it('mantém a conclusão histórica se a trilha ganhar novos cursos', () => {
    const antes = new Date('2026-01-01T00:00:00Z');
    const r = consolidarSituacao({ situacao: 'concluida', iniciadaEm: antes, concluidaEm: antes }, { situacao: 'em_andamento' }, agora);
    assert.equal(r.situacao, 'concluida');
    assert.equal(r.concluidaEm, antes);
  });

  it('preserva a data de início original', () => {
    const antes = new Date('2026-01-01T00:00:00Z');
    const r = consolidarSituacao({ situacao: 'em_andamento', iniciadaEm: antes, concluidaEm: null }, { situacao: 'em_andamento' }, agora);
    assert.equal(r.iniciadaEm, antes);
  });
});

describe('validarSequencia / normalizarSequencia', () => {
  const existentes = new Set([1, 2, 3]);

  it('aceita sequência válida', () => {
    assert.deepEqual(
      validarSequencia(
        [
          { cursoId: 1, obrigatorio: true, requerAnteriores: true },
          { cursoId: 2, obrigatorio: false, requerAnteriores: false },
        ],
        existentes,
      ),
      [],
    );
  });

  it('rejeita cursos duplicados, inexistentes e trilha sem obrigatórios', () => {
    const problemas = validarSequencia(
      [
        { cursoId: 1, obrigatorio: false, requerAnteriores: true },
        { cursoId: 1, obrigatorio: false, requerAnteriores: true },
        { cursoId: 99, obrigatorio: false, requerAnteriores: true },
      ],
      existentes,
    );
    assert.equal(problemas.length, 3);
    assert.ok(problemas.some((p) => p.includes('mais de uma vez')));
    assert.ok(problemas.some((p) => p.includes('99 não existe')));
    assert.ok(problemas.some((p) => p.includes('pelo menos um curso obrigatório')));
  });

  it('lista vazia é válida (remover todos os cursos de um rascunho)', () => {
    assert.deepEqual(validarSequencia([], existentes), []);
  });

  it('normaliza a ordem para 1..n conforme a posição no array', () => {
    const r = normalizarSequencia([
      { cursoId: 3, obrigatorio: true, requerAnteriores: true },
      { cursoId: 1, obrigatorio: true, requerAnteriores: true },
    ]);
    assert.deepEqual(r.map((l) => [l.cursoId, l.ordem]), [[3, 1], [1, 2]]);
  });
});

describe('gerarSlug', () => {
  it('remove acentos, pontuação e espaços', () => {
    assert.equal(gerarSlug('Senhas, autenticação e segurança de contas'), 'senhas-autenticacao-e-seguranca-de-contas');
    assert.equal(gerarSlug('  Inteligência Artificial & Cidadania!  '), 'inteligencia-artificial-cidadania');
  });
});
