import type { ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { BotaoVoltar } from './components/BotaoVoltar';
import { Layout } from './components/Layout';
import { RotaProtegida } from './components/RotaProtegida';
import { AuthProvider } from './contexts/AuthContext';
import { AdminDocentesPage } from './pages/admin/AdminDocentesPage';
import { AdminTrilhasPage } from './pages/admin/AdminTrilhasPage';
import { TrilhaEditorPage } from './pages/admin/TrilhaEditorPage';
import { CadastroPage } from './pages/CadastroPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CursoDetalhePage } from './pages/CursoDetalhePage';
import { CursosPage } from './pages/CursosPage';
import { EsqueciSenhaPage } from './pages/EsqueciSenhaPage';
import { InicioPage } from './pages/InicioPage';
import { LoginPage } from './pages/LoginPage';
import { MeusCursosPage } from './pages/MeusCursosPage';
import { MinhasTrilhasPage } from './pages/MinhasTrilhasPage';
import { PaypalSimuladoPage } from './pages/PaypalSimuladoPage';
import { RedefinirSenhaPage } from './pages/RedefinirSenhaPage';
import { TermosPage } from './pages/TermosPage';
import { TrilhaDetalhePage } from './pages/TrilhaDetalhePage';
import { TrilhasPage } from './pages/TrilhasPage';

const gestores = (pagina: ReactNode) => <RotaProtegida papeis={['admin', 'coordenador']}>{pagina}</RotaProtegida>;
const logado = (pagina: ReactNode) => <RotaProtegida>{pagina}</RotaProtegida>;

function NaoEncontrada() {
  return (
    <section className="pagina pagina--estreita centralizado">
      <BotaoVoltar destinoPadrao="/" />
      <p className="codigo-erro" aria-hidden="true">
        404
      </p>
      <h1>Página não encontrada</h1>
      <p className="texto-suave">O endereço pode ter mudado ou não existir mais.</p>
      <Link to="/" className="botao botao--primario">
        Ir para a página inicial
      </Link>
    </section>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<InicioPage />} />
            <Route path="entrar" element={<LoginPage />} />
            <Route path="cadastro" element={<CadastroPage />} />
            <Route path="esqueci-senha" element={<EsqueciSenhaPage />} />
            <Route path="redefinir-senha" element={<RedefinirSenhaPage />} />
            <Route path="termos" element={<TermosPage />} />
            <Route path="cursos" element={<CursosPage />} />
            <Route path="cursos/:id" element={<CursoDetalhePage />} />
            <Route path="trilhas" element={<TrilhasPage />} />
            <Route path="trilhas/:id" element={<TrilhaDetalhePage />} />
            <Route path="meus-cursos" element={logado(<MeusCursosPage />)} />
            <Route path="minhas-trilhas" element={logado(<MinhasTrilhasPage />)} />
            <Route path="checkout/:codigo" element={logado(<CheckoutPage />)} />
            <Route path="pagamento/paypal-simulado/:codigo" element={logado(<PaypalSimuladoPage />)} />
            <Route path="admin/trilhas" element={gestores(<AdminTrilhasPage />)} />
            <Route path="admin/trilhas/nova" element={gestores(<TrilhaEditorPage />)} />
            <Route path="admin/trilhas/:id" element={gestores(<TrilhaEditorPage />)} />
            <Route path="admin/professores" element={gestores(<AdminDocentesPage />)} />
            <Route path="*" element={<NaoEncontrada />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
