import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatarDuracao, formatarPreco, pluralizar, ROTULO_NIVEL } from '@/lib/formatos';
import { corNivel, cores, espaco, fonteTitulo, raio, sombra } from '@/lib/tema';
import type { Curso, Nivel, TrilhaResumo } from '@/lib/tipos';
import { BarraProgresso, type NomeIcone } from './ui';

const ICONE_NIVEL: Record<Nivel, NomeIcone> = { iniciante: 'book-outline', intermediario: 'shield-checkmark-outline', avancado: 'star-outline' };

/** Cartão de curso: faixa colorida pelo nível + título, descrição, duração e preço. */
export function CartaoCurso({ curso, largura }: { curso: Curso; largura?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${curso.titulo}, ${ROTULO_NIVEL[curso.nivel]}, ${formatarPreco(curso.precoCentavos)}`}
      onPress={() => router.push({ pathname: '/curso/[id]', params: { id: String(curso.id) } })}
      style={({ pressed }) => [estilos.cartao, largura ? { width: largura } : null, pressed && { opacity: 0.9 }]}
    >
      <View style={[estilos.faixa, { backgroundColor: corNivel[curso.nivel] }]}>
        <View style={estilos.faixaEsquerda}>
          <Ionicons name={ICONE_NIVEL[curso.nivel]} size={16} color={cores.branco} />
          <Text style={estilos.faixaTexto}>{ROTULO_NIVEL[curso.nivel]}</Text>
        </View>
        {curso.destaque && (
          <View style={estilos.selo}>
            <Ionicons name="star" size={11} color={cores.branco} />
            <Text style={estilos.seloTexto}>Destaque</Text>
          </View>
        )}
      </View>
      <View style={estilos.corpo}>
        <Text style={estilos.titulo} numberOfLines={2}>
          {curso.titulo}
        </Text>
        <Text style={estilos.descricao} numberOfLines={3}>
          {curso.descricao}
        </Text>
        <View style={estilos.rodape}>
          <View style={estilos.faixaEsquerda}>
            <Ionicons name="time-outline" size={15} color={cores.textoSuave} />
            <Text style={estilos.meta}>{formatarDuracao(curso.cargaHorariaMinutos)}</Text>
          </View>
          <Text style={[estilos.preco, curso.gratuito && { color: cores.positivo }]}>{formatarPreco(curso.precoCentavos)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Cartão de trilha: tema, título, número de cursos, carga horária e (opcional) progresso. */
export function CartaoTrilha({
  trilha,
  progresso,
  largura,
}: {
  trilha: TrilhaResumo;
  progresso?: { percentual: number; cursosConcluidos: number; cursosConsiderados: number };
  largura?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Trilha ${trilha.titulo}, ${pluralizar(trilha.totalCursos, 'curso', 'cursos')}`}
      onPress={() => router.push({ pathname: '/trilha/[id]', params: { id: String(trilha.id) } })}
      style={({ pressed }) => [estilos.cartao, largura ? { width: largura } : null, pressed && { opacity: 0.9 }]}
    >
      <View style={[estilos.faixa, { backgroundColor: corNivel[trilha.nivel] }]}>
        <View style={estilos.faixaEsquerda}>
          <MaterialCommunityIcons name="lighthouse-on" size={16} color={cores.branco} />
          <Text style={estilos.faixaTexto}>{trilha.tema}</Text>
        </View>
      </View>
      <View style={estilos.corpo}>
        <Text style={[estilos.nivel, { color: corNivel[trilha.nivel] }]}>NÍVEL {ROTULO_NIVEL[trilha.nivel].toUpperCase()}</Text>
        <Text style={estilos.titulo} numberOfLines={2}>
          {trilha.titulo}
        </Text>
        <Text style={estilos.descricao} numberOfLines={3}>
          {trilha.descricao}
        </Text>
        <View style={estilos.numeros}>
          <View>
            <Text style={estilos.numeroRotulo}>CURSOS</Text>
            <Text style={estilos.numeroValor}>{pluralizar(trilha.totalCursos, 'curso', 'cursos')}</Text>
          </View>
          <View>
            <Text style={estilos.numeroRotulo}>CARGA HORÁRIA</Text>
            <Text style={estilos.numeroValor}>{formatarDuracao(trilha.cargaHorariaTotalMinutos)}</Text>
          </View>
        </View>
        {progresso && (
          <BarraProgresso
            valor={progresso.percentual}
            rotulo="Seu progresso"
            descricao={`${progresso.cursosConcluidos} de ${progresso.cursosConsiderados}`}
          />
        )}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.grande,
    borderWidth: 1,
    borderColor: cores.borda,
    overflow: 'hidden',
    ...sombra,
  },
  faixa: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espaco.lg,
    paddingVertical: 9,
  },
  faixaEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  faixaTexto: { color: cores.branco, fontWeight: '800', fontSize: 13 },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: raio.pilula,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  seloTexto: { color: cores.branco, fontWeight: '800', fontSize: 11 },
  corpo: { padding: espaco.lg, gap: 8, flexGrow: 1 },
  nivel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  titulo: { ...fonteTitulo, fontSize: 18, lineHeight: 23, color: cores.titulo },
  descricao: { color: cores.textoSuave, fontSize: 14, lineHeight: 20 },
  rodape: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: { color: cores.textoSuave, fontSize: 14 },
  preco: { ...fonteTitulo, color: cores.titulo, fontSize: 15 },
  numeros: { flexDirection: 'row', gap: espaco.xl },
  numeroRotulo: { fontSize: 11, letterSpacing: 0.8, color: cores.textoSuave },
  numeroValor: { fontWeight: '800', color: cores.texto, fontSize: 15 },
});
