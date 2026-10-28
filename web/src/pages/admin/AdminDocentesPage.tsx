import { useState } from 'react';
import { BotaoVoltar } from '../../components/BotaoVoltar';
import { Carregando, EstadoErro, EstadoVazio } from '../../components/Estados';
import { useRequisicao } from '../../hooks/useRequisicao';
import { formatarData } from '../../lib/formatos';
import { normalizarErro } from '../../services/api';
import { docentesService } from '../../services/auth.service';
import type { DocentePendente, ErroApi, SituacaoDocente } from '../../types/api';

const ABAS: Array<{ valor: SituacaoDocente; rotulo: string }> = [
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'aprovado', rotulo: 'Aprovados' },
  { valor: 'recusado', rotulo: 'Recusados' },
];

export function AdminDocentesPage() {
  const [aba, setAba] = useState<SituacaoDocente>('pendente');
  const lista = useRequisicao(() => docentesService.listar(aba), [aba]);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [processando, setProcessando] = useState<number | null>(null);

  async function decidir(d: DocentePendente, decisao: 'aprovado' | 'recusado') {
    let justificativa: string | undefined;
    if (decisao === 'recusado') {
      justificativa = window.prompt(`Justificativa da recusa de ${d.nome} (mínimo 5 caracteres):`)?.trim();
      if (!justificativa) return;
    }
    setErro(null);
    setAviso('');
    setProcessando(d.id);
    try {
      await docentesService.decidir(d.id, decisao, justificativa);
      setAviso(`${d.nome} foi ${decisao === 'aprovado' ? 'aprovado(a)' : 'recusado(a)'}.`);
      await lista.recarregar();
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setProcessando(null);
    }
  }

  return (
    <section className="pagina" aria-labelledby="titulo-docentes">
      <BotaoVoltar destinoPadrao="/admin/trilhas" />
      <header className="pagina__cabecalho">
        <p className="sobretitulo">Gestão</p>
        <h1 id="titulo-docentes">Cadastros de professores</h1>
        <p className="pagina__intro">Professores só recebem as ferramentas de ensino depois da aprovação.</p>
      </header>

      <div className="segmentado abas" role="group" aria-label="Filtrar por situação">
        {ABAS.map((a) => (
          <button key={a.valor} type="button" aria-pressed={aba === a.valor} onClick={() => setAba(a.valor)}>
            {a.rotulo}
          </button>
        ))}
      </div>

      <p role="status" className="mensagem-sucesso" hidden={!aviso}>
        {aviso}
      </p>
      {erro && <EstadoErro erro={erro} />}
      {lista.carregando && <Carregando />}
      {lista.erro && <EstadoErro erro={lista.erro} aoTentarNovamente={lista.recarregar} />}
      {lista.dados && lista.dados.length === 0 && <EstadoVazio titulo="Nenhum cadastro nesta situação." />}
      {lista.dados && lista.dados.length > 0 && (
        <div className="tabela-rolagem" role="region" aria-labelledby="titulo-docentes" tabIndex={0}>
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Professor</th>
                <th scope="col">Área de atuação</th>
                <th scope="col">Cadastro</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.dados.map((d) => (
                <tr key={d.id}>
                  <th scope="row">
                    {d.nome}
                    <div className="texto-suave">{d.email}</div>
                  </th>
                  <td>{d.areaAtuacao ?? '—'}</td>
                  <td>{formatarData(d.criadoEm)}</td>
                  <td className="tabela__acoes">
                    {d.situacaoDocente !== 'aprovado' && (
                      <button type="button" className="botao botao--positivo botao--pequeno" disabled={processando === d.id} onClick={() => decidir(d, 'aprovado')}>
                        Aprovar<span className="sr-only"> {d.nome}</span>
                      </button>
                    )}
                    {d.situacaoDocente !== 'recusado' && (
                      <button type="button" className="botao botao--alerta botao--pequeno" disabled={processando === d.id} onClick={() => decidir(d, 'recusado')}>
                        Recusar<span className="sr-only"> {d.nome}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
