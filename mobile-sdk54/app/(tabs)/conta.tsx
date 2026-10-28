import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarraProgresso, Botao, Carregando, Cartao, EstadoErro, EstadoVazio, Marca, Secao, estilos as ui } from '@/components/ui';
import { normalizarErro } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatarDuracao, ROTULO_MATRICULA, ROTULO_NIVEL, ROTULO_SITUACAO_TRILHA } from '@/lib/formatos';
import { cursosServico, trilhasServico } from '@/lib/servicos';
import { cores, espaco, fonteTitulo, raio } from '@/lib/tema';
import type { ErroApi, MinhaMatricula, MinhaTrilha, Papel } from '@/lib/tipos';

const ROTULO_PAPEL: Record<Papel, string> = {
  estudante: 'Aluno',
  professor: 'Professor',
  coordenador: 'Coordenação',
  admin: 'Administração',
};

export default function ContaTela() {
  const { usuario, carregando, sair } = useAuth();

  if (carregando) {
    return (
      <View style={estilos.centro}>
        <Carregando texto="Verificando sua sessão…" />
      </View>
    );
  }
  if (!usuario) return <Visitante />;

  return <AreaDoAluno aoSair={sair} />;
}

function Visitante() {
  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <View style={estilos.visitante}>
        <Marca tamanho={64} />
        <Text style={estilos.visitanteTitulo}>Sua área de estudos</Text>
        <Text style={[ui.textoSuave, { textAlign: 'center' }]}>
          Entre ou crie uma conta grátis para se matricular nos cursos e acompanhar seu progresso nas trilhas.
        </Text>
        <Botao titulo="Entrar" aoPressionar={() => router.push('/entrar')} estilo={{ alignSelf: 'stretch' }} />
        <Botao titulo="Criar conta grátis" variante="secundario" aoPressionar={() => router.push('/cadastro')} estilo={{ alignSelf: 'stretch' }} />
      </View>
    </ScrollView>
  );
}

function AreaDoAluno({ aoSair }: { aoSair: () => Promise<void> }) {
  const { usuario } = useAuth();
  const [matriculas, setMatriculas] = useState<MinhaMatricula[] | null>(null);
  const [trilhas, setTrilhas] = useState<MinhaTrilha[] | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [m, t] = await Promise.all([cursosServico.minhasMatriculas(), trilhasServico.minhas()]);
      setMatriculas(m);
      setTrilhas(t);
    } catch (e) {
      setErro(normalizarErro(e));
    }
  }, []);

  // Atualiza sempre que a aba é aberta (ex.: depois de se matricular em um curso).
  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  if (!usuario) return null;
  const iniciais = usuario.nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const professorPendente = usuario.papel === 'professor' && usuario.situacaoDocente === 'pendente';

  const confirmarSaida = () =>
    Alert.alert('Sair da conta', 'Deseja mesmo sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void aoSair() },
    ]);

  return (
    <ScrollView
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          tintColor={cores.primario}
          onRefresh={async () => {
            setAtualizando(true);
            await carregar();
            setAtualizando(false);
          }}
        />
      }
    >
      <View style={estilos.perfil}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{iniciais}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={estilos.perfilNome}>{usuario.nome}</Text>
          <Text style={estilos.perfilEmail}>{usuario.email}</Text>
          <View style={estilos.papel}>
            <Text style={estilos.papelTexto}>{ROTULO_PAPEL[usuario.papel]}</Text>
          </View>
        </View>
      </View>

      {professorPendente && (
        <View style={estilos.aviso}>
          <Ionicons name="time-outline" size={20} color={cores.aviso} />
          <Text style={estilos.avisoTexto}>Seu cadastro de professor está em análise. Enquanto isso, você pode estudar como aluno.</Text>
        </View>
      )}

      {erro && (
        <View style={{ marginTop: espaco.lg }}>
          <EstadoErro erro={erro} aoTentarNovamente={carregar} />
        </View>
      )}

      <Secao sobretitulo="Área do aluno" titulo="Meus cursos">
        {!matriculas && !erro && <Carregando texto="Carregando seus cursos…" />}
        {matriculas && matriculas.length === 0 && (
          <EstadoVazio titulo="Você ainda não está matriculado em nenhum curso.">
            <Botao titulo="Ver cursos gratuitos" pequeno aoPressionar={() => router.navigate('/cursos')} />
          </EstadoVazio>
        )}
        {matriculas?.map((m) => (
          <Pressable
            key={m.cursoId}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/curso/[id]', params: { id: String(m.cursoId) } })}
          >
            <Cartao estilo={{ gap: espaco.sm }}>
              <Text style={estilos.itemTitulo}>{m.titulo}</Text>
              <Text style={ui.textoSuave}>
                {ROTULO_NIVEL[m.nivel]} · {formatarDuracao(m.cargaHorariaMinutos)} ·{' '}
                <Text style={{ color: m.situacao === 'concluida' ? cores.positivo : cores.link, fontWeight: '700' }}>
                  {ROTULO_MATRICULA[m.situacao]}
                </Text>
              </Text>
              <BarraProgresso valor={m.situacao === 'concluida' ? 100 : m.progressoPercentual} />
            </Cartao>
          </Pressable>
        ))}
      </Secao>

      <Secao titulo="Minhas trilhas">
        {!trilhas && !erro && <Carregando texto="Carregando suas trilhas…" />}
        {trilhas && trilhas.length === 0 && (
          <EstadoVazio titulo="Você ainda não começou nenhuma trilha.">
            <Botao titulo="Explorar trilhas" pequeno variante="secundario" aoPressionar={() => router.navigate('/trilhas')} />
          </EstadoVazio>
        )}
        {trilhas?.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/trilha/[id]', params: { id: String(t.id) } })}
          >
            <Cartao estilo={{ gap: espaco.sm }}>
              <Text style={estilos.itemTitulo}>{t.titulo}</Text>
              <Text style={ui.textoSuave}>{ROTULO_SITUACAO_TRILHA[t.progresso.situacao]}</Text>
              <BarraProgresso
                valor={t.progresso.percentual}
                descricao={`${t.progresso.cursosConcluidos} de ${t.progresso.cursosConsiderados} obrigatórios`}
                rotulo="Progresso"
              />
            </Cartao>
          </Pressable>
        ))}
      </Secao>

      <Botao titulo="Sair da conta" variante="perigo" icone="log-out-outline" aoPressionar={confirmarSaida} estilo={{ marginTop: espaco.xxl }} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', padding: espaco.lg },
  conteudo: { padding: espaco.lg, paddingBottom: 48, gap: espaco.md },
  visitante: {
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.xl,
    marginTop: espaco.xl,
    backgroundColor: cores.superficie,
    borderRadius: raio.grande,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  visitanteTitulo: { ...fonteTitulo, fontSize: 24, color: cores.titulo },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.lg,
    padding: espaco.xl,
    borderRadius: raio.grande,
    backgroundColor: cores.noite,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.primario,
  },
  avatarTexto: { color: cores.branco, fontSize: 24, fontWeight: '800' },
  perfilNome: { ...fonteTitulo, color: cores.branco, fontSize: 20 },
  perfilEmail: { color: '#C9DCDF', fontSize: 14 },
  papel: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: raio.pilula,
    backgroundColor: 'rgba(253, 186, 116, 0.2)',
  },
  papelTexto: { color: cores.luz, fontWeight: '800', fontSize: 12 },
  aviso: {
    flexDirection: 'row',
    gap: espaco.sm,
    padding: espaco.md,
    borderRadius: raio.medio,
    backgroundColor: cores.avisoSuave,
  },
  avisoTexto: { flex: 1, color: cores.aviso, fontWeight: '700', lineHeight: 20 },
  itemTitulo: { ...fonteTitulo, fontSize: 17, color: cores.titulo },
});
