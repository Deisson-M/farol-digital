import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { cores, espaco, fonteTitulo, raio, sombra } from '@/lib/tema';
import type { ErroApi } from '@/lib/tipos';
import { listarDetalhes } from '@/lib/api';

export type NomeIcone = ComponentProps<typeof Ionicons>['name'];

/** Símbolo do Farol Digital: farol em um círculo laranja. */
export function Marca({ tamanho = 40 }: { tamanho?: number }) {
  return (
    <View style={[estilos.marca, { width: tamanho, height: tamanho, borderRadius: tamanho / 2 }]}>
      <MaterialCommunityIcons name="lighthouse-on" size={tamanho * 0.58} color={cores.branco} />
    </View>
  );
}

type VarianteBotao = 'primario' | 'secundario' | 'claro' | 'positivo' | 'perigo';

export function Botao({
  titulo,
  aoPressionar,
  variante = 'primario',
  icone,
  carregando = false,
  desativado = false,
  pequeno = false,
  estilo,
}: {
  titulo: string;
  aoPressionar: () => void;
  variante?: VarianteBotao;
  icone?: NomeIcone;
  carregando?: boolean;
  desativado?: boolean;
  pequeno?: boolean;
  estilo?: ViewStyle;
}) {
  const cor = {
    primario: { fundo: cores.primario, texto: cores.branco, borda: cores.primario },
    secundario: { fundo: 'transparent', texto: cores.texto, borda: cores.bordaForte },
    claro: { fundo: cores.branco, texto: cores.noite, borda: cores.branco },
    positivo: { fundo: cores.positivo, texto: cores.branco, borda: cores.positivo },
    perigo: { fundo: 'transparent', texto: cores.alerta, borda: cores.alerta },
  }[variante];
  const inativo = desativado || carregando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      onPress={aoPressionar}
      disabled={inativo}
      style={({ pressed }) => [
        estilos.botao,
        pequeno && estilos.botaoPequeno,
        { backgroundColor: cor.fundo, borderColor: cor.borda, opacity: inativo ? 0.55 : pressed ? 0.85 : 1 },
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={cor.texto} />
      ) : (
        <>
          <Text style={[estilos.botaoTexto, pequeno && { fontSize: 14 }, { color: cor.texto }]}>{titulo}</Text>
          {icone && <Ionicons name={icone} size={pequeno ? 16 : 18} color={cor.texto} />}
        </>
      )}
    </Pressable>
  );
}

export function Campo({
  rotulo,
  erro,
  opcional,
  direita,
  ...props
}: TextInputProps & { rotulo: string; erro?: string; opcional?: boolean; direita?: ReactNode }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>
        {rotulo}
        {opcional && <Text style={estilos.textoSuave}> (opcional)</Text>}
      </Text>
      <View style={[estilos.entrada, erro ? { borderColor: cores.alerta } : null]}>
        <TextInput
          placeholderTextColor="#8B949B"
          style={estilos.entradaTexto}
          accessibilityLabel={rotulo}
          accessibilityHint={erro}
          {...props}
        />
        {direita}
      </View>
      {erro ? <Text style={estilos.erroCampo}>⚠ {erro}</Text> : null}
    </View>
  );
}

/** Opção selecionável em formato de pílula (filtros). */
export function Chip({ rotulo, ativo, aoPressionar }: { rotulo: string; ativo: boolean; aoPressionar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={aoPressionar}
      style={[estilos.chip, ativo && estilos.chipAtivo]}
    >
      <Text style={[estilos.chipTexto, ativo && { color: cores.branco }]}>
        {ativo ? '✓ ' : ''}
        {rotulo}
      </Text>
    </Pressable>
  );
}

export function BarraProgresso({ valor, rotulo, descricao }: { valor: number; rotulo?: string; descricao?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <View
      style={{ gap: 6 }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={rotulo ?? 'Progresso'}
      accessibilityValue={{ min: 0, max: 100, now: v, text: `${v}%${descricao ? `, ${descricao}` : ''}` }}
    >
      {(rotulo || descricao) && (
        <View style={estilos.linhaEntre}>
          <Text style={estilos.progressoRotulo}>{rotulo}</Text>
          <Text style={estilos.progressoRotulo}>
            {v}%{descricao ? <Text style={estilos.textoSuave}> · {descricao}</Text> : null}
          </Text>
        </View>
      )}
      <View style={estilos.trilho}>
        <View style={[estilos.preenchimento, { width: `${v}%` }]} />
      </View>
    </View>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <View style={estilos.estado} accessibilityLiveRegion="polite">
      <ActivityIndicator color={cores.primario} />
      <Text style={estilos.textoSuave}>{texto}</Text>
    </View>
  );
}

export function EstadoErro({ erro, aoTentarNovamente }: { erro: ErroApi; aoTentarNovamente?: () => void }) {
  const detalhes = listarDetalhes(erro);
  return (
    <View style={[estilos.estado, estilos.estadoErro]} accessibilityRole="alert">
      <Text style={[estilos.estadoTitulo, { color: cores.alerta }]}>{erro.mensagem}</Text>
      {detalhes.map((d) => (
        <Text key={d} style={estilos.texto}>
          • {d}
        </Text>
      ))}
      {aoTentarNovamente && <Botao titulo="Tentar novamente" variante="secundario" pequeno aoPressionar={aoTentarNovamente} />}
    </View>
  );
}

export function EstadoVazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <View style={[estilos.estado, estilos.estadoVazio]}>
      <Text style={estilos.estadoTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

/** Faixa escura com o título da tela, como no site. */
export function Faixa({ sobretitulo, titulo, texto, children }: { sobretitulo?: string; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <View style={estilos.faixa}>
      <View style={estilos.faixaBrilho} />
      {sobretitulo && <Text style={estilos.faixaSobretitulo}>{sobretitulo.toUpperCase()}</Text>}
      <Text style={estilos.faixaTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      {texto && <Text style={estilos.faixaTexto}>{texto}</Text>}
      {children}
    </View>
  );
}

export function Secao({ sobretitulo, titulo, acao, children }: { sobretitulo?: string; titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <View style={estilos.secao}>
      <View style={estilos.linhaEntre}>
        <View style={{ flex: 1 }}>
          {sobretitulo && <Text style={estilos.sobretitulo}>{sobretitulo.toUpperCase()}</Text>}
          <Text style={estilos.secaoTitulo} accessibilityRole="header">
            {titulo}
          </Text>
        </View>
        {acao}
      </View>
      {children}
    </View>
  );
}

export function Cartao({ children, estilo }: { children: ReactNode; estilo?: ViewStyle }) {
  return <View style={[estilos.cartao, estilo]}>{children}</View>;
}

export const estilos = StyleSheet.create({
  marca: { backgroundColor: cores.primario, alignItems: 'center', justifyContent: 'center' },
  texto: { color: cores.texto, fontSize: 15, lineHeight: 22 },
  textoSuave: { color: cores.textoSuave, fontSize: 14, lineHeight: 20 },
  linhaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espaco.sm },
  botao: {
    minHeight: 48,
    paddingHorizontal: espaco.xl,
    borderRadius: raio.pilula,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.sm,
  },
  botaoPequeno: { minHeight: 38, paddingHorizontal: espaco.lg },
  botaoTexto: { fontSize: 16, fontWeight: '800' },
  campo: { gap: 6 },
  rotulo: { fontSize: 15, fontWeight: '700', color: cores.texto },
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: cores.bordaForte,
    borderRadius: raio.medio,
    backgroundColor: cores.superficie,
    paddingHorizontal: espaco.md,
  },
  entradaTexto: { flex: 1, fontSize: 16, color: cores.texto, paddingVertical: 10 },
  erroCampo: { color: cores.alerta, fontWeight: '700', fontSize: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: raio.pilula,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  chipAtivo: { backgroundColor: cores.noite, borderColor: cores.noite },
  chipTexto: { fontWeight: '700', color: cores.texto, fontSize: 14 },
  progressoRotulo: { fontWeight: '700', color: cores.texto, fontSize: 14 },
  trilho: { height: 10, borderRadius: raio.pilula, backgroundColor: cores.borda, overflow: 'hidden' },
  preenchimento: { height: '100%', backgroundColor: cores.positivo, borderRadius: raio.pilula },
  estado: {
    gap: espaco.sm,
    padding: espaco.lg,
    borderRadius: raio.medio,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    alignItems: 'flex-start',
  },
  estadoErro: { backgroundColor: cores.alertaSuave, borderColor: 'rgba(180, 35, 24, 0.35)' },
  estadoVazio: { borderStyle: 'dashed' },
  estadoTitulo: { fontWeight: '800', fontSize: 15, color: cores.texto },
  faixa: {
    overflow: 'hidden',
    padding: espaco.xl,
    borderRadius: raio.grande,
    backgroundColor: cores.noite,
    gap: 6,
  },
  faixaBrilho: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(253, 186, 116, 0.18)',
  },
  faixaSobretitulo: { color: cores.luz, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  faixaTitulo: { ...fonteTitulo, color: cores.branco, fontSize: 28, lineHeight: 34 },
  faixaTexto: { color: '#C9DCDF', fontSize: 15, lineHeight: 22 },
  secao: { gap: espaco.md, marginTop: espaco.xxl },
  sobretitulo: { color: cores.primario, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 2 },
  secaoTitulo: { ...fonteTitulo, color: cores.titulo, fontSize: 22 },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.grande,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.lg,
    ...sombra,
  },
});
