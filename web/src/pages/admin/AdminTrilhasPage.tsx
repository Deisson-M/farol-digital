import { BotaoVoltar } from '../../components/BotaoVoltar';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Carregando, EstadoErro, EstadoVazio } from '../../components/Estados';
import { useRequisicao } from '../../hooks/useRequisicao';
import { formatarDuracao, ROTULO_NIVEL } from '../../lib/formatos';
import { normalizarErro } from '../../services/api';
import { trilhasService } from '../../services/trilhas.service';
import type { ErroApi } from '../../types/api';
import type { TrilhaResumo } from '../../types/trilhas';

export function AdminTrilhasPage() {
  const { dados, carregando, erro, recarregar } = useRequisicao(() => trilhasService.listar({ limite: 50 }), []);
  const [erroAcao, setErroAcao] = useState<ErroApi | null>(null);
  const [aviso, setAviso] = useState('');
  const [processando, setProcessando] = useState<number | null>(null);

  async function alternarPublicacao(trilha: TrilhaResumo) {
    setErroAcao(null);
    setAviso('');
    setProcessando(trilha.id);
    try {
      await trilhasService.atualizar(trilha.id, { publicada: !trilha.publicada });
      setAviso(`“${trilha.titulo}” foi ${trilha.publicada ? 'despublicada' : 'publicada'}.`);
      await recarregar();
    } catch (e) {
      setErroAcao(normalizarErro(e));
    } finally {
      setProcessando(null);
    }
  }

  return (
    <section className="pagina" aria-labelledby="titulo-admin-trilhas">
      <BotaoVoltar destinoPadrao="/" />
      <header className="pagina__cabecalho pagina__cabecalho--acoes">
        <div>
          <p className="sobretitulo">Gestão</p>
          <h1 id="titulo-admin-trilhas">Gerenciar trilhas</h1>
        </div>
        <Link to="/admin/trilhas/nova" className="botao botao--primario">
          Nova trilha
        </Link>
      </header>

      <p role="status" className="mensagem-sucesso" hidden={!aviso}>
        {aviso}
      </p>
      {erroAcao && <EstadoErro erro={erroAcao} />}
      {carregando && <Carregando texto="Carregando trilhas…" />}
      {erro && <EstadoErro erro={erro} aoTentarNovamente={recarregar} />}
      {dados && dados.itens.length === 0 && <EstadoVazio titulo="Nenhuma trilha cadastrada ainda." />}

      {dados && dados.itens.length > 0 && (
        <div className="tabela-rolagem" role="region" aria-labelledby="titulo-admin-trilhas" tabIndex={0}>
          <table className="tabela">
            <caption className="sr-only">Trilhas cadastradas, incluindo rascunhos</caption>
            <thead>
              <tr>
                <th scope="col">Trilha</th>
                <th scope="col">Nível</th>
                <th scope="col">Cursos</th>
                <th scope="col">Carga horária</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((t) => (
                <tr key={t.id}>
                  <th scope="row">
                    <Link to={`/trilhas/${t.id}`}>{t.titulo}</Link>
                    <div className="texto-suave">{t.tema}</div>
                  </th>
                  <td>{ROTULO_NIVEL[t.nivel]}</td>
                  <td>{t.totalCursos}</td>
                  <td>{formatarDuracao(t.cargaHorariaTotalMinutos)}</td>
                  <td>
                    <span className={`etiqueta ${t.publicada ? 'etiqueta--sucesso' : 'etiqueta--alerta'}`}>
                      {t.publicada ? 'Publicada' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="tabela__acoes">
                    <Link to={`/admin/trilhas/${t.id}`} className="botao botao--secundario botao--pequeno">
                      Editar<span className="sr-only"> {t.titulo}</span>
                    </Link>
                    <button
                      type="button"
                      className="botao botao--fantasma botao--pequeno"
                      disabled={processando === t.id}
                      onClick={() => alternarPublicacao(t)}
                    >
                      {t.publicada ? 'Despublicar' : 'Publicar'}
                      <span className="sr-only"> {t.titulo}</span>
                    </button>
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
