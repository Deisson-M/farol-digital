import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CartaoCurso } from '@/components/Cartoes';
import { Carregando, Chip, EstadoErro, EstadoVazio, Faixa, estilos as ui } from '@/components/ui';
import { normalizarErro } from '@/lib/api';
import { ROTULO_NIVEL } from '@/lib/formatos';
import { cursosServico } from '@/lib/servicos';
import { cores, espaco, raio } from '@/lib/tema';
import type { Curso, ErroApi, Nivel } from '@/lib/tipos';

const POR_PAGINA = 10;
const NIVEIS = Object.keys(ROTULO_NIVEL) as Nivel[];

export default function CursosTela() {
  const params = useLocalSearchParams<{ busca?: string }>();
  const [termo, setTermo] = useState(params.busca ?? '');
  const [busca, setBusca] = useState(params.busca ?? '');
  const [nivel, setNivel] = useState<Nivel | undefined>();
  const [preco, setPreco] = useState<'gratuito' | 'pago' | undefined>();
  const [itens, setItens] = useState<Curso[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  // Quando a busca vem da tela inicial (temas ou campo de busca).
  useEffect(() => {
    if (params.busca !== undefined) {
      setTermo(params.busca);
      setBusca(params.busca);
    }
  }, [params.busca]);

  const carregar = useCallback(
    async (novaPagina: number) => {
      if (novaPagina === 1) setCarregando(true);
      else setCarregandoMais(true);
      setErro(null);
      try {
        const r = await cursosServico.listar({ busca: busca || undefined, nivel, preco, pagina: novaPagina, limite: POR_PAGINA });
        setItens((atuais) => (novaPagina === 1 ? r.itens : [...atuais, ...r.itens]));
        setTotal(r.total);
        setPagina(novaPagina);
      } catch (e) {
        setErro(normalizarErro(e));
      } finally {
        setCarregando(false);
        setCarregandoMais(false);
      }
    },
    [busca, nivel, preco],
  );

  useEffect(() => {
    void carregar(1);
  }, [carregar]);

  const temMais = itens.length < total;

  return (
    <FlatList
      data={carregando ? [] : itens}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => <CartaoCurso curso={item} />}
      contentContainerStyle={estilos.lista}
      ItemSeparatorComponent={() => <View style={{ height: espaco.md }} />}
      keyboardShouldPersistTaps="handled"
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (temMais && !carregandoMais && !carregando) void carregar(pagina + 1);
      }}
      refreshing={false}
      onRefresh={() => void carregar(1)}
      ListHeaderComponent={
        <View style={estilos.cabecalho}>
          <Faixa sobretitulo="Aprenda no seu ritmo" titulo="Catálogo de cursos" texto="Comece pelos gratuitos e avance quando se sentir pronto." />
          <View style={estilos.busca}>
            <Ionicons name="search" size={20} color={cores.textoSuave} />
            <TextInput
              style={estilos.buscaEntrada}
              placeholder="Ex.: senhas, Pix, golpes"
              placeholderTextColor="#8B949B"
              value={termo}
              onChangeText={setTermo}
              returnKeyType="search"
              onSubmitEditing={() => setBusca(termo.trim())}
              accessibilityLabel="Buscar cursos"
            />
            {termo.length > 0 && (
              <Ionicons
                name="close-circle"
                size={20}
                color={cores.textoSuave}
                accessibilityLabel="Limpar busca"
                onPress={() => {
                  setTermo('');
                  setBusca('');
                }}
              />
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
            <Chip rotulo="Todos" ativo={!preco} aoPressionar={() => setPreco(undefined)} />
            <Chip rotulo="Gratuitos" ativo={preco === 'gratuito'} aoPressionar={() => setPreco('gratuito')} />
            <Chip rotulo="Pagos" ativo={preco === 'pago'} aoPressionar={() => setPreco('pago')} />
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
            <Chip rotulo="Todos os níveis" ativo={!nivel} aoPressionar={() => setNivel(undefined)} />
            {NIVEIS.map((n) => (
              <Chip key={n} rotulo={ROTULO_NIVEL[n]} ativo={nivel === n} aoPressionar={() => setNivel(n)} />
            ))}
          </ScrollView>
          {carregando && <Carregando texto="Carregando cursos…" />}
          {erro && <EstadoErro erro={erro} aoTentarNovamente={() => void carregar(1)} />}
          {!carregando && !erro && (
            <Text style={ui.textoSuave}>{total === 1 ? '1 curso encontrado' : `${total} cursos encontrados`}</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        !carregando && !erro ? (
          <EstadoVazio titulo="Nenhum curso encontrado.">
            <Text style={ui.textoSuave}>Tente outro termo ou remova algum filtro.</Text>
          </EstadoVazio>
        ) : null
      }
      ListFooterComponent={carregandoMais ? <ActivityIndicator color={cores.primario} style={{ marginTop: espaco.lg }} /> : null}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, paddingBottom: 48 },
  cabecalho: { gap: espaco.md, marginBottom: espaco.md },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    backgroundColor: cores.superficie,
    borderWidth: 1.5,
    borderColor: cores.bordaForte,
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.lg,
    minHeight: 50,
  },
  buscaEntrada: { flex: 1, fontSize: 16, color: cores.texto, paddingVertical: 10 },
  chips: { gap: espaco.sm },
});
