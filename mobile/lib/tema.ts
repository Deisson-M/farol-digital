import { Platform } from 'react-native';

/** Cores e medidas do Farol Digital (as mesmas do site). */
export const cores = {
  fundo: '#F7F3EC',
  superficie: '#FFFFFF',
  superficie2: '#F1EBE1',
  borda: '#E4DCCF',
  bordaForte: '#C9BDA9',
  texto: '#1D2A33',
  textoSuave: '#5B6670',
  titulo: '#0F3B45',
  noite: '#0F3B45',
  noite2: '#14505C',
  luz: '#FDBA74',
  primario: '#C2410C',
  primarioSuave: 'rgba(194, 65, 12, 0.09)',
  link: '#0E6B74',
  positivo: '#2F7D4F',
  positivoSuave: 'rgba(47, 125, 79, 0.1)',
  alerta: '#B42318',
  alertaSuave: 'rgba(180, 35, 24, 0.07)',
  aviso: '#8A5A00',
  avisoSuave: 'rgba(234, 179, 8, 0.15)',
  branco: '#FFFFFF',
} as const;

export const corNivel = {
  iniciante: '#2F7D4F',
  intermediario: '#0E6B74',
  avancado: '#C2410C',
} as const;

export const raio = { pequeno: 8, medio: 12, grande: 18, pilula: 999 } as const;

export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const sombra = {
  shadowColor: '#1D2A33',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

/** Títulos usam a fonte serifada do sistema, lembrando a identidade do site. */
export const fonteTitulo = {
  fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
  fontWeight: '700' as const,
};
