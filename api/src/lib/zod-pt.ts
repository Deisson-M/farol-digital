import { z, ZodIssueCode, type ZodErrorMap } from 'zod';

/**
 * Mensagens de validação padrão em português. Mensagens específicas definidas
 * nos schemas continuam tendo prioridade.
 */
const mapaPt: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: 'Campo obrigatório.' };
      return { message: `Tipo inválido: esperado ${issue.expected}, recebido ${issue.received}.` };
    case ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: `Use pelo menos ${issue.minimum} caractere(s).` };
      if (issue.type === 'array') return { message: `Informe pelo menos ${issue.minimum} item(ns).` };
      if (issue.type === 'number') return { message: `O valor mínimo é ${issue.minimum}.` };
      break;
    case ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Use no máximo ${issue.maximum} caractere(s).` };
      if (issue.type === 'array') return { message: `Informe no máximo ${issue.maximum} item(ns).` };
      if (issue.type === 'number') return { message: `O valor máximo é ${issue.maximum}.` };
      break;
    case ZodIssueCode.invalid_enum_value:
      return { message: `Valor inválido. Opções aceitas: ${issue.options.join(', ')}.` };
    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Informe um e-mail válido.' };
      return { message: 'Formato inválido.' };
    case ZodIssueCode.unrecognized_keys:
      return { message: `Campo(s) não permitido(s): ${issue.keys.join(', ')}.` };
    default:
      break;
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(mapaPt);
