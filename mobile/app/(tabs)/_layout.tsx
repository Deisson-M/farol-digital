import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { Text, View } from 'react-native';
import { Marca, type NomeIcone } from '@/components/ui';
import { cores, fonteTitulo } from '@/lib/tema';

function TituloMarca() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Marca tamanho={30} />
      <Text style={{ ...fonteTitulo, fontSize: 20, color: cores.titulo }}>
        Farol <Text style={{ color: cores.primario, fontStyle: 'italic' }}>Digital</Text>
      </Text>
    </View>
  );
}

const icone =
  (nome: NomeIcone, ativo: NomeIcone) =>
  ({ color, focused, size }: { color: string; focused: boolean; size: number }) => <Ionicons name={focused ? ativo : nome} size={size} color={color} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <TituloMarca />,
        headerTitleAlign: 'left',
        headerStyle: { backgroundColor: cores.superficie, borderBottomWidth: 3, borderBottomColor: cores.primario },
        headerShadowVisible: false,
        tabBarActiveTintColor: cores.primario,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone('home-outline', 'home') }} />
      <Tabs.Screen name="cursos" options={{ title: 'Cursos', tabBarIcon: icone('library-outline', 'library') }} />
      <Tabs.Screen name="trilhas" options={{ title: 'Trilhas', tabBarIcon: icone('map-outline', 'map') }} />
      <Tabs.Screen name="conta" options={{ title: 'Minha conta', tabBarIcon: icone('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
