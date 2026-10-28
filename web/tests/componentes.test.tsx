import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BarraProgresso } from '../src/components/BarraProgresso';
import { CartaoTrilha } from '../src/components/CartaoTrilha';
import { SeloStatus } from '../src/components/SeloStatus';
import { duracaoPorExtenso, formatarDuracao } from '../src/lib/formatos';

describe('formatos', () => {
  it('formata durações', () => {
    expect(formatarDuracao(45)).toBe('45 min');
    expect(formatarDuracao(120)).toBe('2 h');
    expect(formatarDuracao(90)).toBe('1 h 30 min');
    expect(duracaoPorExtenso(61)).toBe('1 hora e 1 minuto');
  });
});

describe('BarraProgresso', () => {
  it('expõe o valor para tecnologias assistivas e limita a 0–100', () => {
    render(<BarraProgresso valor={140} rotulo="Progresso na trilha" descricao="3 de 3 cursos" />);
    const barra = screen.getByRole('progressbar', { name: 'Progresso na trilha' });
    expect(barra).toHaveAttribute('aria-valuenow', '100');
    expect(barra).toHaveAttribute('aria-valuetext', '100%, 3 de 3 cursos');
  });
});

describe('SeloStatus', () => {
  it('mostra texto além da cor', () => {
    render(<SeloStatus status="bloqueado" />);
    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
  });
});

describe('CartaoTrilha', () => {
  it('mostra dados da trilha, link de detalhe e progresso', () => {
    render(
      <MemoryRouter>
        <CartaoTrilha
          trilha={{
            id: 3,
            slug: 'navegacao-segura',
            titulo: 'Navegação segura',
            descricao: 'Descrição da trilha',
            tema: 'Segurança',
            nivel: 'intermediario',
            publicada: true,
            totalCursos: 3,
            cargaHorariaTotalMinutos: 330,
          }}
          progresso={{ percentual: 33, cursosConcluidos: 1, cursosConsiderados: 3 }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Navegação segura' })).toHaveAttribute('href', '/trilhas/3');
    expect(screen.getByText('3 cursos')).toBeInTheDocument();
    expect(screen.getByText('5 horas e 30 minutos')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  });
});
