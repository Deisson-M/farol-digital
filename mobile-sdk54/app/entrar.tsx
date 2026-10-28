import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Botao, Campo, EstadoErro, Marca, estilos as ui } from '@/components/ui';
import { normalizarErro } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { authServico } from '@/lib/servicos';
import { cores, espaco, fonteTitulo } from '@/lib/tema';
import type { ErroApi } from '@/lib/tipos';

export default function EntrarTela() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function aoEnviar() {
    setErro(null);
    setMensagem(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      if (router.canGoBack()) router.back();
      else router.replace('/conta');
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function esqueci() {
    setErro(null);
    if (!email.includes('@')) {
      setErro({ status: 0, codigo: 'EMAIL', mensagem: 'Digite seu e-mail acima para receber o link de nova senha.' });
      return;
    }
    try {
      const r = await authServico.esqueciSenha(email.trim());
      setMensagem(r.mensagem);
    } catch (e) {
      setErro(normalizarErro(e));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View style={estilos.topo}>
          <Marca tamanho={56} />
          <Text style={estilos.titulo}>Bem-vindo de volta!</Text>
          <Text style={[ui.textoSuave, { textAlign: 'center' }]}>Entre para continuar seus cursos e trilhas.</Text>
        </View>

        {erro && <EstadoErro erro={erro} />}
        {mensagem && <Text style={estilos.sucesso}>✓ {mensagem}</Text>}

        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Campo
          rotulo="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!verSenha}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => email && senha && void aoEnviar()}
          direita={
            <Pressable onPress={() => setVerSenha((v) => !v)} accessibilityRole="button" accessibilityLabel={verSenha ? 'Ocultar senha' : 'Mostrar senha'} hitSlop={10}>
              <Ionicons name={verSenha ? 'eye-off-outline' : 'eye-outline'} size={22} color={cores.textoSuave} />
            </Pressable>
          }
        />
        <Text style={estilos.link} onPress={esqueci} accessibilityRole="link">
          Esqueci minha senha
        </Text>

        <Botao titulo="Entrar" carregando={enviando} desativado={!email || !senha} aoPressionar={aoEnviar} />

        <Text style={[ui.textoSuave, { textAlign: 'center' }]}>
          Ainda não tem conta?{' '}
          <Text style={estilos.link} onPress={() => router.replace('/cadastro')}>
            Cadastre-se grátis
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.xl, gap: espaco.lg, paddingBottom: 48 },
  topo: { alignItems: 'center', gap: espaco.sm, marginBottom: espaco.sm },
  titulo: { ...fonteTitulo, fontSize: 26, color: cores.titulo },
  link: { color: cores.link, fontWeight: '800', textDecorationLine: 'underline', alignSelf: 'flex-end' },
  sucesso: { color: cores.positivo, fontWeight: '700', lineHeight: 20 },
});
