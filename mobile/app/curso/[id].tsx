import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Botao, Carregando, Cartao, EstadoErro, estilos as ui, type NomeIcone } from '@/components/ui';
import { normalizarErro, SITE_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatarDuracao, formatarPreco, ROTULO_MATRICULA, ROTULO_NIVEL } from '@/lib/formatos';
import { cursosServico } from '@/lib/servicos';
import { corNivel, cores, espaco, fonteTitulo, raio } from '@/lib/tema';
import type { ErroApi } from '@/lib/tipos';
import { useRequisicao } from '@/lib/useRequisicao';

const BENEFICIOS: Array<{ icone: NomeIcone; texto: string }> = [
  { icone: 'phone-portrait-outline', texto: 'Estude no seu ritmo, pelo celular ou computador' },
  { icone: 'shield-checkmark-outline', texto: 'Conteúdo focado em segurança e proteção de dados' },
  { icone: 'accessibility-outline', texto: 'Linguagem simples e recursos de acessibilidade' },
];

export default function CursoTela() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cursoId = Number(id);
  const { usuario } = useAuth();
  const { dados: curso, erro, carregando, recarregar } = useRequisicao(() => cursosServico.detalhar(cursoId), [cursoId, usuario?.id]);
  const [processando, setProcessando] = useState(false);
  const [erroAcao, setErroAcao] = useState<ErroApi | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const primeiraVez = useRef(true);

  // Ao voltar para a tela (ex.: depois de entrar na conta), atualiza a situação da matrícula.
  useFocusEffect(
    useCallback(() => {
      if (primeiraVez.current) {
        primeiraVez.current = false;
        return;
      }
      void recarregar();
    }, [recarregar]),
  );

  if (carregando && !curso) return <View style={estilos.centro}><Carregando texto="Carregando curso…" /></View>;
  if (erro) return <View style={estilos.centro}><EstadoErro erro={erro} aoTentarNovamente={recarregar} /></View>;
  if (!curso) return null;

  const temAcesso = curso.matricula === 'ativa' || curso.matricula === 'concluida';

  async function matricular() {
    setProcessando(true);
    setErroAcao(null);
    try {
      await cursosServico.matricular(cursoId);
      setAviso('Matrícula feita! O curso já aparece em Minha conta.');
      await recarregar();
    } catch (e) {
      setErroAcao(normalizarErro(e));
    } finally {
      setProcessando(false);
    }
  }

  async function comprarNoSite() {
    await WebBrowser.openBrowserAsync(`${SITE_URL}/cursos/${cursoId}`);
    void recarregar();
  }

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Stack.Screen options={{ title: ROTULO_NIVEL[curso.nivel] }} />
      <View style={[estilos.topo, { borderTopColor: corNivel[curso.nivel] }]}>
        <View style={ui.linhaEntre}>
          <View style={[estilos.etiqueta, { borderColor: corNivel[curso.nivel] }]}>
            <Text style={[estilos.etiquetaTexto, { color: corNivel[curso.nivel] }]}>{ROTULO_NIVEL[curso.nivel]}</Text>
          </View>
          {curso.destaque && (
            <Text style={estilos.destaque}>
              <Ionicons name="star" size={13} color={cores.aviso} /> Destaque
            </Text>
          )}
        </View>
        <Text style={estilos.titulo} accessibilityRole="header">
          {curso.titulo}
        </Text>
        <Text style={estilos.descricao}>{curso.descricao}</Text>
        <View style={estilos.beneficio}>
          <Ionicons name="time-outline" size={20} color={cores.positivo} />
          <Text style={ui.texto}>Carga horária: {formatarDuracao(curso.cargaHorariaMinutos)}</Text>
        </View>
        {BENEFICIOS.map((b) => (
          <View key={b.texto} style={estilos.beneficio}>
            <Ionicons name={b.icone} size={20} color={cores.positivo} />
            <Text style={[ui.texto, { flex: 1 }]}>{b.texto}</Text>
          </View>
        ))}
      </View>

      <Cartao estilo={estilos.compra}>
        <Text style={[estilos.preco, curso.gratuito && { color: cores.positivo }]}>{formatarPreco(curso.precoCentavos)}</Text>
        {!curso.gratuito && <Text style={[ui.textoSuave, { textAlign: 'center' }]}>Em até 6x sem juros no cartão, Pix, boleto e mais.</Text>}
        {aviso && <Text style={estilos.sucesso}>✓ {aviso}</Text>}
        {erroAcao && <EstadoErro erro={erroAcao} />}

        {temAcesso ? (
          <>
            <Text style={estilos.sucesso}>✓ Situação: {ROTULO_MATRICULA[curso.matricula!]}</Text>
            <Botao titulo="Ir para minha conta" variante="positivo" aoPressionar={() => router.navigate('/conta')} />
          </>
        ) : !usuario ? (
          <>
            <Botao titulo={curso.gratuito ? 'Entrar para se matricular' : 'Entrar para comprar'} aoPressionar={() => router.push('/entrar')} />
            <Text style={[ui.textoSuave, { textAlign: 'center' }]}>
              Não tem conta?{' '}
              <Text style={estilos.link} onPress={() => router.push('/cadastro')}>
                Cadastre-se grátis
              </Text>
            </Text>
          </>
        ) : curso.gratuito ? (
          <Botao titulo="Matricular-se grátis" icone="checkmark-circle-outline" carregando={processando} aoPressionar={matricular} />
        ) : (
          <>
            <Botao titulo="Comprar pelo site" icone="open-outline" aoPressionar={comprarNoSite} />
            <Text style={[ui.textoSuave, { textAlign: 'center' }]}>
              O pagamento é feito no site do Farol Digital, com a mesma conta. Depois volte aqui para estudar.
            </Text>
          </>
        )}
        {!curso.gratuito && (
          <Text style={[ui.textoSuave, { textAlign: 'center' }]}>
            <Ionicons name="lock-closed-outline" size={13} /> Pagamento protegido
          </Text>
        )}
      </Cartao>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', padding: espaco.lg },
  conteudo: { padding: espaco.lg, paddingBottom: 48, gap: espaco.lg },
  topo: {
    backgroundColor: cores.superficie,
    borderRadius: raio.grande,
    borderTopWidth: 6,
    padding: espaco.xl,
    gap: espaco.md,
  },
  etiqueta: { borderWidth: 1, borderRadius: raio.pilula, paddingHorizontal: 10, paddingVertical: 2 },
  etiquetaTexto: { fontWeight: '800', fontSize: 13 },
  destaque: { color: cores.aviso, fontWeight: '800', fontSize: 13 },
  titulo: { ...fonteTitulo, fontSize: 28, lineHeight: 34, color: cores.titulo },
  descricao: { color: cores.textoSuave, fontSize: 16, lineHeight: 24 },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  compra: { gap: espaco.md, borderTopWidth: 6, borderTopColor: cores.primario },
  preco: { ...fonteTitulo, fontSize: 32, color: cores.titulo, textAlign: 'center' },
  sucesso: { color: cores.positivo, fontWeight: '800', textAlign: 'center' },
  link: { color: cores.link, fontWeight: '800', textDecorationLine: 'underline' },
});
