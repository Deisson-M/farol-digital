import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { possuiPermissao } from '../src/lib/permissoes.js';
import { montarRegistro, sanitizarDetalhes } from '../src/modules/auditoria/auditoria.service.js';

describe('permissões', () => {
  it('somente admin e coordenador gerenciam trilhas', () => {
    assert.equal(possuiPermissao('admin', 'trilhas:gerenciar'), true);
    assert.equal(possuiPermissao('coordenador', 'trilhas:gerenciar'), true);
    assert.equal(possuiPermissao('professor', 'trilhas:gerenciar'), false);
    assert.equal(possuiPermissao('estudante', 'trilhas:gerenciar'), false);
    assert.equal(possuiPermissao(undefined, 'trilhas:gerenciar'), false);
  });

  it('anônimos e estudantes não veem rascunhos', () => {
    assert.equal(possuiPermissao(undefined, 'trilhas:ver-rascunhos'), false);
    assert.equal(possuiPermissao('estudante', 'trilhas:ver-rascunhos'), false);
  });
});

describe('auditoria', () => {
  it('remove chaves sensíveis, inclusive aninhadas', () => {
    const limpo = sanitizarDetalhes({
      campos: ['titulo'],
      senha: '123',
      usuario: { token: 'abc', nome: 'x', authorization: 'Bearer y' },
      lista: [{ senhaHash: 'h', ok: true }],
    });
    assert.deepEqual(limpo, { campos: ['titulo'], usuario: { nome: 'x' }, lista: [{ ok: true }] });
  });

  it('gera identificador único de evento e normaliza o recurso', () => {
    const a = montarRegistro({ usuarioId: 1, acao: 'trilha.criar', recursoTipo: 'trilha', recursoId: 7, resultado: 'sucesso' });
    const b = montarRegistro({ usuarioId: 1, acao: 'trilha.criar', recursoTipo: 'trilha', recursoId: 7, resultado: 'sucesso' });
    assert.match(a.eventoId, /^[0-9a-f-]{36}$/);
    assert.notEqual(a.eventoId, b.eventoId);
    assert.equal(a.recursoId, '7');
    assert.equal(a.detalhes, null);
  });
});
