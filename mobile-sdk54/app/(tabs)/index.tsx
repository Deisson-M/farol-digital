import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { CartaoCurso, CartaoTrilha } from '@/components/Cartoes';
import { Botao, Carregando, EstadoErro, Secao, estilos as ui, type NomeIcone } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { primeiroNome } from '@/lib/formatos';
import { cursosServico, trilhasServico } from '@/lib/servicos';
import { cores, espaco, fonteTitulo, raio, sombra } from '@/lib/tema';
import { useRequisicao } from '@/lib/useRequisicao';

const TEMAS: Array<{ icone: NomeIcone; rotulo: string; busca: string }> = [
  { icone: 'desktop-outline', rotulo: 'Informática', busca: 'computador' },
  { icone: 'phone-portrait-outline', rotulo: 'Celular', busca: 'celular' },
  { icone: 'shield-checkmark-outline', rotulo: 'Segurança', busca: 'segur' },
  { icone: 'lock-closed-outline', rotulo: 'Privacidade', busca: 'dados' },
  { icone: 'card-outline', rotulo: 'Finanças', busca: 'pagamento' },
  { icone: 'sparkles-outline', rotulo: 'Inteligência artificial', busca: 'inteligência' },
  { icone: 'people-outline', rotulo: 'Família', busca: 'família' },
];

const DICAS = [
  { icone: 'key-outline' as NomeIcone, texto: 'Use uma senha diferente para cada conta importante.' },
  { icone: 'chatbubble-ellipses-outline' as NomeIcone, texto: 'Desconfie de mensagens com urgência pedindo Pix ou códigos.' },
  { icone: 'finger-print-outline' as NomeIcone, texto: 'Ative a verificação em duas etapas no e-mail e no WhatsApp.' },
];

export default function InicioTela() {
  const { usuario } = useAuth();
  const { width } = useWindowDimensions();
  const [termo, setTermo] = useState('');
  const larguraCartao = Math.min(300, width * 0.78);

  const destaques = useRequisicao(() => cursosServico.listar({ destaque: true, limite: 8 }), []);
  const trilhas = useRequisicao(() => trilhasServico.listar({ limite: 5 }), []);
  const totais = useRequisicao(async () => {
    const [todos, gratis, listaTrilhas] = await Promise.all([
      cursosServico.listar({ limite: 1 }),
      cursosServico.listar({ preco: 'gratuito', limite: 1 }),
      trilhasServico.listar({ limite: 1 }),
    ]);
    return { cursos: todos.total, gratuitos: gratis.total, trilhas: listaTrilhas.total };
  }, []);

  const buscar = (busca: string) => router.navigate({ pathname: '/cursos', params: busca ? { busca } : {} });
  const atualizando = destaques.carregando && destaques.dados !== null;

  return (
    <ScrollView
      contentContainerStyle={estilos.conteudo}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => {
            void destaques.recarregar();
            void trilhas.recarregar();
            void totais.recarregar();
          }}
          tintColor={cores.primario}
        />
      }
    >
      {/* Capa */}
      <View style={estilos.capa}>
        <View style={estilos.capaLuz} />
        <MaterialCommunityIcons name="lighthouse-on" size={88} color="rgba(253, 186, 116, 0.35)" style={estilos.capaFarol} />
        <View style={estilos.capaSelo}>
          <MaterialCommunityIcons name="lighthouse-on" size={14} color={cores.luz} />
          <Text style={estilos.capaSeloTexto}>Educação digital segura</Text>
        </View>
        <Text style={estilos.capaTitulo}>
          {usuario ? `Olá, ${primeiroNome(usuario.nome)}! ` : ''}Navegue no <Text style={estilos.capaRealce}>mundo digital</Text> com segurança.
        </Text>
        <Text style={estilos.capaTexto}>Cursos de inclusão digital, proteção de dados e prevenção de golpes, do primeiro clique ao uso de IA.</Text>
        <View style={estilos.busca}>
          <Ionicons name="search" size={20} color={cores.textoSuave} />
          <TextInput
            style={estilos.buscaEntrada}
            placeholder="O que você quer aprender?"
            placeholderTextColor="#8B949B"
            value={termo}
            onChangeText={setTermo}
            returnKeyType="search"
            onSubmitEditing={() => buscar(termo.trim())}
            accessibilityLabel="Buscar cursos"
          />
        </View>
        {usuario ? (
          <Botao titulo="Continuar estudando" variante="claro" icone="arrow-forward" aoPressionar={() => router.navigate('/conta')} />
        ) : (
          <Botao titulo="Começar gratuitamente" variante="claro" icone="arrow-forward" aoPressionar={() => router.push('/cadastro')} />
        )}
      </View>

      {/* Números */}
      {totais.dados && totais.dados.cursos > 0 && (
        <View style={estilos.numeros}>
          {[
            { valor: totais.dados.cursos, rotulo: 'cursos' },
            { valor: totais.dados.gratuitos, rotulo: 'gratuitos' },
            { valor: totais.dados.trilhas, rotulo: 'trilhas' },
          ].map((n, i) => (
            <View key={n.rotulo} style={[estilos.numero, i > 0 && estilos.numeroDivisor]}>
              <Text style={estilos.numeroValor}>{n.valor}</Text>
              <Text style={ui.textoSuave}>{n.rotulo}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Temas */}
      <Secao sobretitulo="Explore" titulo="Escolha por tema">
        <View style={estilos.temas}>
          {TEMAS.map((t) => (
            <Pressable
              key={t.rotulo}
              accessibilityRole="button"
              accessibilityLabel={`Cursos de ${t.rotulo}`}
              onPress={() => buscar(t.busca)}
              style={({ pressed }) => [estilos.tema, pressed && { borderColor: cores.primario }]}
            >
              <View style={estilos.temaIcone}>
                <Ionicons name={t.icone} size={18} color={cores.primario} />
              </View>
              <Text style={estilos.temaTexto}>{t.rotulo}</Text>
            </Pressable>
          ))}
        </View>
      </Secao>

      {/* Cursos em destaque */}
      <Secao
        sobretitulo="Mais procurados"
        titulo="Cursos em destaque"
        acao={
          <Link href="/cursos" style={estilos.verTodos}>
            Ver todos
          </Link>
        }
      >
        {destaques.carregando && !destaques.dados && <Carregando texto="Carregando cursos…" />}
        {destaques.erro && <EstadoErro erro={destaques.erro} aoTentarNovamente={destaques.recarregar} />}
        {destaques.dados && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.carrossel}>
            {destaques.dados.itens.map((c) => (
              <CartaoCurso key={c.id} curso={c} largura={larguraCartao} />
            ))}
          </ScrollView>
        )}
      </Secao>

      {/* Dicas rápidas */}
      <View style={estilos.dicas}>
        <Text style={estilos.dicasTitulo}>Dicas rápidas de segurança</Text>
        {DICAS.map((d) => (
          <View key={d.texto} style={estilos.dica}>
            <Ionicons name={d.icone} size={20} color={cores.luz} />
            <Text style={estilos.dicaTexto}>{d.texto}</Text>
          </View>
        ))}
      </View>

      {/* Trilhas */}
      <Secao
        sobretitulo="Roteiros prontos"
        titulo="Trilhas para começar"
        acao={
          <Link href="/trilhas" style={estilos.verTodos}>
            Ver todas
          </Link>
        }
      >
        {trilhas.carregando && !trilhas.dados && <Carregando texto="Carregando trilhas…" />}
        {trilhas.erro && <EstadoErro erro={trilhas.erro} aoTentarNovamente={trilhas.recarregar} />}
        {trilhas.dados && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.carrossel}>
            {trilhas.dados.itens.map((t) => (
              <CartaoTrilha key={t.id} trilha={t} largura={larguraCartao} />
            ))}
          </ScrollView>
        )}
      </Secao>

      {!usuario && (
        <View style={estilos.convite}>
          <Ionicons name="school-outline" size={30} color={cores.primario} />
          <Text style={estilos.conviteTitulo}>Você é professor?</Text>
          <Text style={ui.textoSuave}>Cadastre-se como professor e ajude mais pessoas a usar a tecnologia com segurança.</Text>
          <Botao titulo="Quero ser professor" pequeno aoPressionar={() => router.push({ pathname: '/cadastro', params: { tipo: 'professor' } })} />
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.lg, paddingBottom: 48 },
  capa: {
    overflow: 'hidden',
    backgroundColor: cores.noite,
    borderRadius: raio.grande,
    padding: espaco.xl,
    gap: espaco.md,
  },
  capaLuz: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(253, 186, 116, 0.16)',
  },
  capaFarol: { position: 'absolute', right: 8, top: 14 },
  capaSelo: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: raio.pilula,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  capaSeloTexto: { color: cores.luz, fontWeight: '800', fontSize: 12 },
  capaTitulo: { ...fonteTitulo, color: cores.branco, fontSize: 28, lineHeight: 34, paddingRight: 40 },
  capaRealce: { color: cores.luz, fontStyle: 'italic' },
  capaTexto: { color: '#C9DCDF', fontSize: 15, lineHeight: 22 },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    backgroundColor: cores.superficie,
    borderRadius: raio.medio,
    paddingHorizontal: espaco.md,
    minHeight: 50,
  },
  buscaEntrada: { flex: 1, fontSize: 16, color: cores.texto, paddingVertical: 10 },
  numeros: {
    flexDirection: 'row',
    marginTop: espaco.lg,
    backgroundColor: cores.superficie,
    borderRadius: raio.grande,
    paddingVertical: espaco.lg,
    ...sombra,
  },
  numero: { flex: 1, alignItems: 'center' },
  numeroDivisor: { borderLeftWidth: 1, borderLeftColor: cores.borda },
  numeroValor: { ...fonteTitulo, fontSize: 26, color: cores.primario },
  temas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  tema: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: raio.pilula,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  temaIcone: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.primarioSuave,
  },
  temaTexto: { fontWeight: '700', color: cores.texto },
  verTodos: { color: cores.link, fontWeight: '800', textDecorationLine: 'underline' },
  carrossel: { gap: espaco.md, paddingBottom: 10, paddingRight: espaco.lg },
  dicas: {
    marginTop: espaco.xxl,
    padding: espaco.xl,
    borderRadius: raio.grande,
    backgroundColor: cores.noite2,
    gap: espaco.md,
  },
  dicasTitulo: { ...fonteTitulo, color: cores.branco, fontSize: 20 },
  dica: { flexDirection: 'row', gap: espaco.md, alignItems: 'flex-start' },
  dicaTexto: { flex: 1, color: '#E8F1F2', fontSize: 15, lineHeight: 21 },
  convite: {
    marginTop: espaco.xxl,
    padding: espaco.xl,
    gap: espaco.sm,
    borderRadius: raio.grande,
    backgroundColor: cores.superficie,
    borderLeftWidth: 6,
    borderLeftColor: cores.primario,
    alignItems: 'flex-start',
    ...sombra,
  },
  conviteTitulo: { ...fonteTitulo, fontSize: 20, color: cores.titulo },
});
