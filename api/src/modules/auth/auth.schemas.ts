import { z } from 'zod';
import { PAPEIS, SITUACOES_DOCENTE } from '../../db/schema/enums.js';

const email = z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(190);

export const loginBody = z.object({
  email,
  senha: z.string().min(1, 'Informe a senha.').max(200),
});

const telefone = z
  .string()
  .trim()
  .max(20)
  .refine((v) => v === '' || /^\+?[\d\s().-]{10,20}$/.test(v), 'Informe um telefone com DDD.')
  .optional();

const camposComuns = {
  nome: z
    .string()
    .trim()
    .min(3, 'Informe seu nome completo.')
    .max(150)
    .refine((v) => v.includes(' '), 'Informe nome e sobrenome.'),
  email,
  senha: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(200),
  telefone,
  aceiteTermos: z.literal(true, {
    errorMap: () => ({ message: 'É preciso aceitar os Termos de Uso e o Aviso de Privacidade.' }),
  }),
};

/** Cadastro público: aluno ou docente (docente fica pendente até aprovação). */
export const cadastroBody = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('aluno'), ...camposComuns }).strict(),
  z
    .object({
      tipo: z.literal('docente'),
      ...camposComuns,
      areaAtuacao: z.string().trim().min(3, 'Informe sua área de atuação ou formação.').max(120),
    })
    .strict(),
]);
export type CadastroDados = z.infer<typeof cadastroBody>;

export const esqueciSenhaBody = z.object({ email }).strict();

export const redefinirSenhaBody = z
  .object({
    token: z.string().min(20).max(200),
    novaSenha: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(200),
  })
  .strict();

export const usuarioPublico = z.object({
  id: z.number(),
  nome: z.string(),
  email: z.string(),
  papel: z.enum(PAPEIS),
  situacaoDocente: z.enum(SITUACOES_DOCENTE),
});
