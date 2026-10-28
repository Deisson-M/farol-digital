import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Botao, Campo, EstadoErro, estilos as ui } from '@/components/ui';
import { normalizarErro, SITE_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { avaliarSenha, formatarTelefone } from '@/lib/formatos';
import { cores, espaco, fonteTitulo, raio } from '@/lib/tema';
import type { DadosCadastro, ErroApi } from '@/lib/tipos';

type Erros = Partial<Record<'nome' | 'email' | 'telefone' | 'areaAtuacao' | 'senha' | 'confirmacao' | 'aceiteTermos', string>>;

/** "docente" é o valor técnico da API para o perfil de professor. */
const PERFIS: Array<{ valor: DadosCadastro['tipo']; rotulo: string }> = [
  { valor: 'aluno', rotulo: 'Sou aluno' },
  { valor: 'docente', rotulo: 'Sou professor' },
];

export default function CadastroTela() {
  const { cadastrar } = useAuth();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const [dados, setDados] = useState<DadosCadastro>({
    tipo: params.tipo === 'professor' ? 'docente' : 'aluno',
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    areaAtuacao: '',
    aceiteTermos: false,
  });
  const [confirmacao, setConfirmacao] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erroApi, setErroApi] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  const professor = dados.tipo === 'docente';
  const senha = avaliarSenha(dados.senha);

  const alterar = <K extends keyof DadosCadastro>(campo: K, valor: DadosCadastro[K]) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  function validar(): Erros {
    const e: Erros = {};
    if (dados.nome.trim().split(/\s+/).length < 2) e.nome = 'Informe nome e sobrenome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) e.email = 'Informe um e-mail válido.';
    const tel = dados.telefone?.replace(/\D/g, '') ?? '';
    if (tel && (tel.length < 10 || tel.length > 11)) e.telefone = 'Informe o celular com DDD.';
    if (professor && (dados.areaAtuacao?.trim().length ?? 0) < 3) e.areaAtuacao = 'Conte qual é a sua área de atuação ou formação.';
    if (!senha.valida) e.senha = 'A senha precisa ter 8 caracteres, uma letra e um número.';
    if (confirmacao !== dados.senha) e.confirmacao = 'As senhas não são iguais.';
    if (!dados.aceiteTermos) e.aceiteTermos = 'Para continuar, aceite os Termos de Uso e o Aviso de Privacidade.';
    return e;
  }

  async function aoEnviar() {
    setErroApi(null);
    const encontrados = validar();
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    try {
      await cadastrar({ ...dados, nome: dados.nome.trim(), email: dados.email.trim() });
      if (router.canDismiss()) router.dismissAll();
      router.navigate('/conta');
    } catch (e) {
      setErroApi(normalizarErro(e));
    } finally {
      setEnviando(false);
    }
  }

  const olho = (
    <Pressable onPress={() => setVerSenha((v) => !v)} accessibilityRole="button" accessibilityLabel={verSenha ? 'Ocultar senhas' : 'Mostrar senhas'} hitSlop={10}>
      <Ionicons name={verSenha ? 'eye-off-outline' : 'eye-outline'} size={22} color={cores.textoSuave} />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={estilos.titulo}>Crie sua conta</Text>
        <Text style={ui.textoSuave}>
          Já tem cadastro?{' '}
          <Text style={estilos.link} onPress={() => router.replace('/entrar')}>
            Entrar
          </Text>
        </Text>

        <View style={estilos.alternador} accessibilityRole="radiogroup" accessibilityLabel="Tipo de conta">
          {PERFIS.map((p) => {
            const ativo = dados.tipo === p.valor;
            return (
              <Pressable
                key={p.valor}
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
                onPress={() => alterar('tipo', p.valor)}
                style={[estilos.alternadorOpcao, ativo && estilos.alternadorAtivo]}
              >
                <Text style={[estilos.alternadorTexto, ativo && { color: cores.primario }]}>{p.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>

        {professor && (
          <View style={estilos.aviso}>
            <Ionicons name="time-outline" size={20} color={cores.link} />
            <Text style={estilos.avisoTexto}>O cadastro de professor passa por uma análise rápida da coordenação. Enquanto isso, você já pode estudar como aluno.</Text>
          </View>
        )}

        {erroApi && <EstadoErro erro={erroApi} />}

        <Campo rotulo="Nome completo" value={dados.nome} onChangeText={(v) => alterar('nome', v)} placeholder="Como você quer ser chamado" autoComplete="name" erro={erros.nome} />
        <Campo
          rotulo="E-mail"
          value={dados.email}
          onChangeText={(v) => alterar('email', v)}
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          erro={erros.email}
        />
        <Campo
          rotulo="Celular"
          opcional
          value={dados.telefone}
          onChangeText={(v) => alterar('telefone', formatarTelefone(v))}
          placeholder="(11) 99999-9999"
          keyboardType="phone-pad"
          erro={erros.telefone}
        />
        {professor && (
          <Campo
            rotulo="Área de atuação ou formação"
            value={dados.areaAtuacao}
            onChangeText={(v) => alterar('areaAtuacao', v)}
            placeholder="Ex.: Pedagogia, Segurança da informação"
            erro={erros.areaAtuacao}
          />
        )}
        <Campo
          rotulo="Crie uma senha"
          value={dados.senha}
          onChangeText={(v) => alterar('senha', v)}
          secureTextEntry={!verSenha}
          autoCapitalize="none"
          autoComplete="new-password"
          erro={erros.senha}
          direita={olho}
        />
        <View style={estilos.regras}>
          {senha.regras.map((r) => (
            <Text key={r.texto} style={[estilos.regra, r.ok && { color: cores.positivo }]}>
              {r.ok ? '✓' : '×'} {r.texto}
            </Text>
          ))}
        </View>
        <Campo
          rotulo="Repita a senha"
          value={confirmacao}
          onChangeText={(v) => {
            setConfirmacao(v);
            setErros((e) => ({ ...e, confirmacao: undefined }));
          }}
          secureTextEntry={!verSenha}
          autoCapitalize="none"
          autoComplete="new-password"
          erro={erros.confirmacao}
        />

        <View style={estilos.termos}>
          <Switch
            value={dados.aceiteTermos}
            onValueChange={(v) => alterar('aceiteTermos', v)}
            trackColor={{ true: cores.primario, false: cores.bordaForte }}
            thumbColor={cores.branco}
            accessibilityLabel="Aceito os Termos de Uso e o Aviso de Privacidade"
          />
          <Text style={[ui.texto, { flex: 1 }]}>
            Concordo com os{' '}
            <Text style={estilos.link} onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/termos`)}>
              Termos de Uso e o Aviso de Privacidade
            </Text>
            . Meus dados serão usados apenas para criar e manter minha conta, conforme a LGPD.
          </Text>
        </View>
        {erros.aceiteTermos && <Text style={ui.erroCampo}>⚠ {erros.aceiteTermos}</Text>}

        <Botao titulo={professor ? 'Enviar cadastro de professor' : 'Criar conta grátis'} carregando={enviando} aoPressionar={aoEnviar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.xl, gap: espaco.lg, paddingBottom: 56 },
  titulo: { ...fonteTitulo, fontSize: 28, color: cores.titulo },
  link: { color: cores.link, fontWeight: '800', textDecorationLine: 'underline' },
  alternador: { flexDirection: 'row', padding: 4, borderRadius: raio.pilula, backgroundColor: cores.superficie2 },
  alternadorOpcao: { flex: 1, paddingVertical: 11, borderRadius: raio.pilula, alignItems: 'center' },
  alternadorAtivo: { backgroundColor: cores.superficie, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  alternadorTexto: { fontWeight: '800', fontSize: 15, color: cores.textoSuave },
  aviso: {
    flexDirection: 'row',
    gap: espaco.sm,
    padding: espaco.md,
    borderRadius: raio.medio,
    backgroundColor: 'rgba(14, 107, 116, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14, 107, 116, 0.3)',
  },
  avisoTexto: { flex: 1, color: cores.texto, lineHeight: 20 },
  regras: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md, marginTop: -8 },
  regra: { color: cores.textoSuave, fontSize: 13, fontWeight: '700' },
  termos: { flexDirection: 'row', gap: espaco.md, alignItems: 'flex-start' },
});
