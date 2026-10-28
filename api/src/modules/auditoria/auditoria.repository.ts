import type { Database } from '../../db/client.js';
import { auditoriaEventos } from '../../db/schema/base.js';
import { montarRegistro, type EventoAuditoria, type RegistroAuditoria } from './auditoria.service.js';

/** Implementação MySQL do registro de auditoria (somente INSERT). */
export function criarRegistroAuditoria(db: Pick<Database, 'insert'>): RegistroAuditoria {
  return {
    async registrar(evento: EventoAuditoria) {
      await db.insert(auditoriaEventos).values(montarRegistro(evento));
    },
  };
}
