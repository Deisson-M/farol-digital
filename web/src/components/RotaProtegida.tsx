import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Papel } from '../types/api';
import { Carregando, EstadoErro } from './Estados';

/**
 * Protege páginas no frontend (conveniência de navegação). A autorização
 * real é sempre verificada pela API em cada requisição.
 */
export function RotaProtegida({ papeis, children }: { papeis?: Papel[]; children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) return <Carregando texto="Verificando sua sessão…" />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ voltarPara: local.pathname }} />;
  if (papeis && !papeis.includes(usuario.papel)) {
    return (
      <EstadoErro
        erro={{ status: 403, codigo: 'PROIBIDO', mensagem: 'Você não tem permissão para acessar esta página.' }}
      />
    );
  }
  return <>{children}</>;
}
