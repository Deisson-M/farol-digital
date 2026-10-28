import type { DadosCadastro, DocentePendente, SituacaoDocente, Usuario } from '../types/api';
import { api } from './api';

export const authService = {
  async entrar(email: string, senha: string) {
    const { data } = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { email, senha });
    return data;
  },
  async cadastrar(dados: DadosCadastro) {
    const corpo: DadosCadastro = { ...dados, telefone: dados.telefone?.trim() || undefined };
    if (dados.tipo === 'aluno') delete corpo.areaAtuacao;
    const { data } = await api.post<{ token: string; usuario: Usuario }>('/auth/cadastro', corpo);
    return data;
  },
  async esqueciSenha(email: string) {
    const { data } = await api.post<{ mensagem: string }>('/auth/esqueci-senha', { email });
    return data.mensagem;
  },
  async redefinirSenha(token: string, novaSenha: string) {
    const { data } = await api.post<{ mensagem: string }>('/auth/redefinir-senha', { token, novaSenha });
    return data.mensagem;
  },
  async sair() {
    await api.post('/auth/logout');
  },
  async eu() {
    const { data } = await api.get<Usuario>('/auth/me');
    return data;
  },
};

export const docentesService = {
  async listar(situacao: SituacaoDocente = 'pendente') {
    const { data } = await api.get<{ itens: DocentePendente[] }>('/admin/docentes', { params: { situacao } });
    return data.itens;
  },
  async decidir(id: number, decisao: 'aprovado' | 'recusado', justificativa?: string) {
    const { data } = await api.patch(`/admin/docentes/${id}`, { decisao, justificativa });
    return data as { id: number; situacaoDocente: SituacaoDocente };
  },
};
