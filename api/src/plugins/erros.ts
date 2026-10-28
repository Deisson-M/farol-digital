import type { FastifyError, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { ErroAplicacao } from '../lib/erros.js';

async function errosPlugin(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      erro: { codigo: 'ROTA_NAO_ENCONTRADA', mensagem: `Rota ${request.method} ${request.url} não existe.` },
    });
  });

  app.setErrorHandler((erro: FastifyError | ErroAplicacao, request, reply) => {
    const correlacaoId = request.id;

    if (erro instanceof ErroAplicacao) {
      return reply.status(erro.status).send({
        erro: { codigo: erro.codigo, mensagem: erro.message, detalhes: erro.detalhes, correlacaoId },
      });
    }

    if (hasZodFastifySchemaValidationErrors(erro)) {
      return reply.status(400).send({
        erro: {
          codigo: 'DADOS_INVALIDOS',
          mensagem: 'Os dados enviados são inválidos. Revise os campos indicados.',
          detalhes: erro.validation.map((item) => ({
            campo: item.instancePath.replace(/^\//, '').replace(/\//g, '.') || undefined,
            mensagem: item.message,
          })),
          correlacaoId,
        },
      });
    }

    // Violação de unicidade do MySQL (ex.: slug duplicado)
    if ((erro as { code?: string }).code === 'ER_DUP_ENTRY') {
      return reply.status(409).send({
        erro: { codigo: 'CONFLITO', mensagem: 'Já existe um registro com estes dados.', correlacaoId },
      });
    }

    if (erro.statusCode && erro.statusCode < 500) {
      return reply.status(erro.statusCode).send({
        erro: { codigo: erro.code ?? 'REQUISICAO_INVALIDA', mensagem: erro.message, correlacaoId },
      });
    }

    request.log.error({ err: erro }, 'Erro não tratado');
    return reply.status(500).send({
      erro: {
        codigo: 'ERRO_INTERNO',
        mensagem: 'Ocorreu um erro inesperado. Informe o código de correlação ao suporte.',
        correlacaoId,
      },
    });
  });
}

export default fp(errosPlugin, { name: 'erros' });
