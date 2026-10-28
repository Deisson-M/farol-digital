import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarraProgresso, Botao, Carregando, Cartao, EstadoErro, estilos as ui } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatarDuracao, pluralizar, ROTULO_NIVEL, ROTULO_SITUACAO_TRILHA, STATUS_CURSO } from '@/lib/formatos';
import { trilhasServico } from '@/lib/servicos';
import { corNivel, cores, espaco, fonteTitulo, raio } from '@/lib/tema';
import type { CursoComStatus, CursoDaTrilha } from '@/lib/tipos';
import { useRequisicao } from '@/lib/useRequisicao';

export default function TrilhaTela() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trilhaId = Number(id);
  const { usuario } = useAuth();
  const trilha = useRequisicao(() => trilhasServico.detalhar(trilhaId), [trilhaId]);
  const progresso = useRequisicao(
    () => (usuario ? trilhasServico.progresso(trilhaId) : Promise.resolve(null)),
    [trilhaId, usuario?.id],
  );

  if (trilha.carregando && !trilha.dados) return <View style={estilos.centro}><Carregando texto="Carregando trilha…" /></View>;
  if (trilha.erro) return <View style={estilos.centro}><EstadoErro erro={trilha.erro} aoTentarNovamente={trilha.recarregar} /></View>;
  const t = trilha.dados;
  if (!t) return null;

  const p = progresso.dados;
  const statusPorCurso = new Map<number, CursoComStatus>(p?.cursos.map((c) => [c.cursoId, c]) ?? []);

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Stack.Screen options={{ title: t.tema }} />
      <View style={[estilos.topo, { borderTopColor: corNivel[t.nivel] }]}>
        <Text style={[estilos.nivel, { color: corNivel[t.nivel] }]}>
          {t.tema.toUpperCase()} · {ROTULO_NIVEL[t.nivel].toUpperCase()}
        </Text>
        <Text style={estilos.titulo} accessibilityRole="header">
          {t.titulo}
        </Text>
        <Text style={estilos.descricao}>{t.descricao}</Text>
        <View style={estilos.numeros}>
          <View>
            <Text style={estilos.numeroRotulo}>CURSOS</Text>
            <Text style={estilos.numeroValor}>{pluralizar(t.totalCursos, 'curso', 'cursos')}</Text>
          </View>
          <View>
            <Text style={estilos.numeroRotulo}>CARGA HORÁRIA</Text>
            <Text style={estilos.numeroValor}>{formatarDuracao(t.cargaHorariaTotalMinutos)}</Text>
          </View>
        </View>
        <Text style={ui.textoSuave}>Para concluir: {t.criterio}</Text>
      </View>

      <Cartao estilo={{ gap: espaco.sm }}>
        <Text style={estilos.subtitulo}>Seu progresso</Text>
        {!usuario ? (
          <>
            <Text style={ui.textoSuave}>Entre na sua conta para acompanhar o progresso e ver quais cursos já estão liberados.</Text>
            <Botao titulo="Entrar" pequeno aoPressionar={() => router.push('/entrar')} />
          </>
        ) : progresso.carregando && !p ? (
          <Carregando />
        ) : progresso.erro ? (
          <EstadoErro erro={progresso.erro} aoTentarNovamente={progresso.recarregar} />
        ) : p ? (
          <>
            <BarraProgresso valor={p.percentual} rotulo={ROTULO_SITUACAO_TRILHA[p.situacao]} descricao={`${p.cursosConcluidos} de ${p.cursosConsiderados}`} />
            {p.proximaEtapa && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/curso/[id]', params: { id: String(p.proximaEtapa!.cursoId) } })}
                style={estilos.proxima}
              >
                <Text style={estilos.proximaRotulo}>PRÓXIMA ETAPA RECOMENDADA</Text>
                <Text style={estilos.proximaTitulo}>
                  {p.proximaEtapa.motivo === 'continuar' ? 'Continuar: ' : 'Começar: '}
                  {p.proximaEtapa.titulo} ›
                </Text>
              </Pressable>
            )}
          </>
        ) : null}
      </Cartao>

      <Cartao estilo={{ gap: espaco.sm }}>
        <Text style={estilos.subtitulo}>Objetivos de aprendizagem</Text>
        {t.objetivos.map((o) => (
          <Text key={o} style={ui.texto}>
            • {o}
          </Text>
        ))}
      </Cartao>

      <Text style={[estilos.subtitulo, { marginTop: espaco.sm }]} accessibilityRole="header">
        Sequência de cursos
      </Text>
      {t.cursos.map((c, i) => (
        <ItemSequencia key={c.cursoId} curso={c} status={statusPorCurso.get(c.cursoId)} ultimo={i === t.cursos.length - 1} />
      ))}
    </ScrollView>
  );
}

function ItemSequencia({ curso, status, ultimo }: { curso: CursoDaTrilha; status?: CursoComStatus; ultimo: boolean }) {
  const s = status?.status;
  const concluido = s === 'concluido';
  const bloqueado = s === 'bloqueado';
  const corCirculo = concluido ? cores.positivo : s === 'em_andamento' ? cores.link : cores.bordaForte;
  return (
    <View style={estilos.item}>
      <View style={estilos.itemTrilho}>
        <View style={[estilos.circulo, { borderColor: corCirculo }, concluido && { backgroundColor: cores.positivo }]}>
          <Text style={[estilos.circuloTexto, concluido && { color: cores.branco }]}>{concluido ? '✓' : curso.ordem}</Text>
        </View>
        {!ultimo && <View style={[estilos.linha, concluido && { backgroundColor: cores.positivo }]} />}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${curso.ordem}. ${curso.titulo}${s ? `, ${STATUS_CURSO[s].rotulo}` : ''}`}
        onPress={() => router.push({ pathname: '/curso/[id]', params: { id: String(curso.cursoId) } })}
        style={[estilos.itemCartao, bloqueado && estilos.itemBloqueado]}
      >
        <Text style={estilos.itemTitulo}>{curso.titulo}</Text>
        <Text style={ui.textoSuave}>
          {formatarDuracao(curso.cargaHorariaMinutos)} · {curso.obrigatorio ? 'Obrigatório' : 'Opcional'}
          {!curso.requerAnteriores ? ' · Pode ser feito a qualquer momento' : ''}
        </Text>
        {s && (
          <Text style={[estilos.status, { color: concluido ? cores.positivo : bloqueado ? cores.textoSuave : cores.link }]}>
            {STATUS_CURSO[s].simbolo} {STATUS_CURSO[s].rotulo}
          </Text>
        )}
        {status && status.pendencias.length > 0 && <Text style={estilos.pendencia}>Conclua antes: {status.pendencias.join(', ')}</Text>}
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', padding: espaco.lg },
  conteudo: { padding: espaco.lg, paddingBottom: 48, gap: espaco.lg },
  topo: { backgroundColor: cores.superficie, borderRadius: raio.grande, borderTopWidth: 6, padding: espaco.xl, gap: espaco.md },
  nivel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  titulo: { ...fonteTitulo, fontSize: 26, lineHeight: 32, color: cores.titulo },
  descricao: { color: cores.textoSuave, fontSize: 16, lineHeight: 24 },
  numeros: { flexDirection: 'row', gap: espaco.xl },
  numeroRotulo: { fontSize: 11, letterSpacing: 0.8, color: cores.textoSuave },
  numeroValor: { fontWeight: '800', color: cores.texto, fontSize: 16 },
  subtitulo: { ...fonteTitulo, fontSize: 20, color: cores.titulo },
  proxima: {
    marginTop: espaco.sm,
    padding: espaco.md,
    borderRadius: raio.medio,
    backgroundColor: cores.positivoSuave,
    borderLeftWidth: 4,
    borderLeftColor: cores.positivo,
  },
  proximaRotulo: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: cores.positivo },
  proximaTitulo: { fontWeight: '800', fontSize: 16, color: cores.texto, marginTop: 2 },
  item: { flexDirection: 'row', gap: espaco.md },
  itemTrilho: { alignItems: 'center', width: 40 },
  circulo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.superficie,
  },
  circuloTexto: { fontWeight: '800', color: cores.texto },
  linha: { flex: 1, width: 2, backgroundColor: cores.bordaForte, marginVertical: 4 },
  itemCartao: {
    flex: 1,
    marginBottom: espaco.md,
    padding: espaco.md,
    gap: 4,
    borderRadius: raio.medio,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  itemBloqueado: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  itemTitulo: { fontWeight: '800', fontSize: 16, color: cores.titulo },
  status: { fontWeight: '800', fontSize: 14 },
  pendencia: { color: cores.aviso, fontSize: 14 },
});
