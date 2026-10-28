import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CartaoTrilha } from '@/components/Cartoes';
import { Carregando, Chip, EstadoErro, EstadoVazio, Faixa, estilos as ui } from '@/components/ui';
import { ROTULO_NIVEL } from '@/lib/formatos';
import { trilhasServico } from '@/lib/servicos';
import { espaco } from '@/lib/tema';
import type { Nivel } from '@/lib/tipos';
import { useRequisicao } from '@/lib/useRequisicao';

const NIVEIS = Object.keys(ROTULO_NIVEL) as Nivel[];

export default function TrilhasTela() {
  const [nivel, setNivel] = useState<Nivel | undefined>();
  const { dados, erro, carregando, recarregar } = useRequisicao(() => trilhasServico.listar({ nivel, limite: 50 }), [nivel]);

  return (
    <FlatList
      data={carregando ? [] : (dados?.itens ?? [])}
      keyExtractor={(t) => String(t.id)}
      renderItem={({ item }) => <CartaoTrilha trilha={item} />}
      contentContainerStyle={estilos.lista}
      ItemSeparatorComponent={() => <View style={{ height: espaco.md }} />}
      refreshing={false}
      onRefresh={() => void recarregar()}
      ListHeaderComponent={
        <View style={estilos.cabecalho}>
          <Faixa
            sobretitulo="Roteiros de estudo"
            titulo="Trilhas de aprendizagem"
            texto="Cursos em uma ordem recomendada para você alcançar um objetivo, passo a passo."
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espaco.sm }}>
            <Chip rotulo="Todos os níveis" ativo={!nivel} aoPressionar={() => setNivel(undefined)} />
            {NIVEIS.map((n) => (
              <Chip key={n} rotulo={ROTULO_NIVEL[n]} ativo={nivel === n} aoPressionar={() => setNivel(n)} />
            ))}
          </ScrollView>
          {carregando && <Carregando texto="Carregando trilhas…" />}
          {erro && <EstadoErro erro={erro} aoTentarNovamente={recarregar} />}
          {dados && !carregando && (
            <Text style={ui.textoSuave}>{dados.total === 1 ? '1 trilha encontrada' : `${dados.total} trilhas encontradas`}</Text>
          )}
        </View>
      }
      ListEmptyComponent={!carregando && !erro ? <EstadoVazio titulo="Nenhuma trilha encontrada." /> : null}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, paddingBottom: 48 },
  cabecalho: { gap: espaco.md, marginBottom: espaco.md },
});
