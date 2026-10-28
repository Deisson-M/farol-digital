import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { cores, fonteTitulo } from '@/lib/tema';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: cores.superficie },
            headerTintColor: cores.primario,
            headerTitleStyle: { ...fonteTitulo, color: cores.titulo },
            contentStyle: { backgroundColor: cores.fundo },
            headerBackTitle: 'Voltar',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="curso/[id]" options={{ title: 'Curso' }} />
          <Stack.Screen name="trilha/[id]" options={{ title: 'Trilha' }} />
          <Stack.Screen name="entrar" options={{ title: 'Entrar', presentation: 'modal' }} />
          <Stack.Screen name="cadastro" options={{ title: 'Criar conta', presentation: 'modal' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
