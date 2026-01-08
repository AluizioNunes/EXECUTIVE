import { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';

// Mock data types
interface Executive {
  id: number;
  name: string;
  position: string;
}

interface Meeting {
  id: number;
  title: string;
  time: string;
  executive: string;
}

interface Task {
  id: number;
  title: string;
  priority: string;
  dueDate: string;
  executive?: string;
}

// Mock data
const mockExecutives: Record<number, Executive[]> = {
  1: [
    { id: 1, name: 'João Silva', position: 'CEO' },
    { id: 2, name: 'Maria Santos', position: 'CFO' },
    { id: 3, name: 'Pedro Almeida', position: 'CTO' },
  ],
  2: [
    { id: 4, name: 'Ana Costa', position: 'Diretora de Marketing' },
    { id: 5, name: 'Carlos Lima', position: 'Diretor de Operações' },
  ],
  3: [
    { id: 6, name: 'Fernanda Brito', position: 'Diretora de RH' },
    { id: 7, name: 'Roberto Nunes', position: 'Diretor Financeiro' },
    { id: 8, name: 'Juliana Mendes', position: 'Diretora de Vendas' },
  ],
};

const mockMeetings: Record<number, Meeting[]> = {
  1: [
    { id: 1, title: 'Reunião Estratégica', time: '10:00', executive: 'João Silva' },
    { id: 2, title: 'Briefing Financeiro', time: '14:00', executive: 'Maria Santos' },
  ],
  2: [
    { id: 3, title: 'Planejamento de Campanha', time: '09:30', executive: 'Ana Costa' },
    { id: 4, title: 'Revisão de Processos', time: '15:00', executive: 'Carlos Lima' },
  ],
  3: [
    { id: 5, title: 'Avaliação de Desempenho', time: '11:00', executive: 'Fernanda Brito' },
  ],
};

const mockTasks: Record<number, Task[]> = {
  1: [
    { id: 1, title: 'Preparar apresentação para conselho', priority: 'Alta', dueDate: '15/10/2025', executive: 'João Silva' },
    { id: 2, title: 'Revisar orçamento anual', priority: 'Média', dueDate: '20/10/2025', executive: 'Maria Santos' },
  ],
  2: [
    { id: 3, title: 'Criar briefing de campanha', priority: 'Alta', dueDate: '12/10/2025', executive: 'Ana Costa' },
    { id: 4, title: 'Organizar reunião com fornecedores', priority: 'Baixa', dueDate: '25/10/2025', executive: 'Carlos Lima' },
  ],
  3: [
    { id: 5, title: 'Elaborar políticas de RH', priority: 'Média', dueDate: '18/10/2025', executive: 'Fernanda Brito' },
  ],
};

export const useTenantData = () => {
  const { currentTenant, isLoading } = useTenant();
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  useEffect(() => {
    if (currentTenant && !isLoading) {
      setDataLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        if (currentTenant.id === 0) {
          setExecutives(Object.values(mockExecutives).flat());
          setMeetings(Object.values(mockMeetings).flat());
          setTasks(Object.values(mockTasks).flat());
        } else {
          setExecutives(mockExecutives[currentTenant.id] || []);
          setMeetings(mockMeetings[currentTenant.id] || []);
          setTasks(mockTasks[currentTenant.id] || []);
        }
        setDataLoading(false);
      }, 300);
    } else {
      setExecutives([]);
      setMeetings([]);
      setTasks([]);
    }
  }, [currentTenant, isLoading]);

  return {
    executives,
    meetings,
    tasks,
    loading: isLoading || dataLoading,
  };
};
