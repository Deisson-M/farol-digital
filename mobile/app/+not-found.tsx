import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Botao, Marca } from '@/components/ui';
import { cores, espaco, fonteTitulo } from '@/lib/tema';

export default function NaoEncontrada() {
  return (
    <View style={estilos.tela}>
      <Stack.Screen options={{ title: 'Ops!' }} />
      <Marca tamanho={64} />
      <Text style={estilos.titulo}>Página não encontrada</Text>
      <Text style={estilos.texto}>O endereço pode ter mudado ou não existir mais.</Text>
      <Botao titulo="Ir para o início" aoPressionar={() => router.replace('/')} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaco.md, padding: espaco.xl, backgroundColor: cores.fundo },
  titulo: { ...fonteTitulo, fontSize: 24, color: cores.titulo },
  texto: { color: cores.textoSuave, textAlign: 'center' },
});
