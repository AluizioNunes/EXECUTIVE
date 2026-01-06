import { useCallback, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';

// Interfaces para os dados de analytics
export interface ExecutiveProductivity {
  executiveId: number;
  executiveName: string;
  meetingsCount: number;
  tasksCompleted: number;
  productivityScore: number;
}

export interface MeetingEfficiency {
  date: string;
  totalMeetings: number;
  completedMeetings: number;
  averageDuration: number;
  efficiencyRate: number;
}

export interface TaskAnalytics {
  status: string;
  count: number;
  percentage: number;
}

export interface ResourceUtilization {
  resourceName: string;
  usageCount: number;
  utilizationRate: number;
}

const mockProductivity: Record<number, ExecutiveProductivity[]> = {
  1: [
    {
      executiveId: 1,
      executiveName: 'João Silva',
      meetingsCount: 15,
      tasksCompleted: 25,
      productivityScore: 85.5
    },
    {
      executiveId: 2,
      executiveName: 'Maria Santos',
      meetingsCount: 12,
      tasksCompleted: 20,
      productivityScore: 78.0
    },
    {
      executiveId: 3,
      executiveName: 'Pedro Almeida',
      meetingsCount: 8,
      tasksCompleted: 18,
      productivityScore: 72.3
    }
  ],
  2: [
    {
      executiveId: 4,
      executiveName: 'Ana Costa',
      meetingsCount: 10,
      tasksCompleted: 22,
      productivityScore: 81.2
    },
    {
      executiveId: 5,
      executiveName: 'Carlos Lima',
      meetingsCount: 7,
      tasksCompleted: 15,
      productivityScore: 68.5
    }
  ],
  3: [
    {
      executiveId: 6,
      executiveName: 'Fernanda Brito',
      meetingsCount: 13,
      tasksCompleted: 28,
      productivityScore: 88.7
    },
    {
      executiveId: 7,
      executiveName: 'Roberto Nunes',
      meetingsCount: 9,
      tasksCompleted: 19,
      productivityScore: 75.4
    },
    {
      executiveId: 8,
      executiveName: 'Juliana Mendes',
      meetingsCount: 11,
      tasksCompleted: 24,
      productivityScore: 82.1
    }
  ]
};

const mockMeetingEfficiency: Record<number, MeetingEfficiency[]> = {
  1: [
    { date: '2025-10-01', totalMeetings: 5, completedMeetings: 4, averageDuration: 45.2, efficiencyRate: 80.0 },
    { date: '2025-10-02', totalMeetings: 3, completedMeetings: 3, averageDuration: 38.7, efficiencyRate: 100.0 },
    { date: '2025-10-03', totalMeetings: 7, completedMeetings: 6, averageDuration: 52.1, efficiencyRate: 85.7 },
    { date: '2025-10-04', totalMeetings: 4, completedMeetings: 4, averageDuration: 41.3, efficiencyRate: 100.0 },
    { date: '2025-10-05', totalMeetings: 6, completedMeetings: 5, averageDuration: 48.9, efficiencyRate: 83.3 },
  ],
  2: [
    { date: '2025-10-01', totalMeetings: 4, completedMeetings: 4, averageDuration: 42.5, efficiencyRate: 100.0 },
    { date: '2025-10-02', totalMeetings: 2, completedMeetings: 2, averageDuration: 35.8, efficiencyRate: 100.0 },
    { date: '2025-10-03', totalMeetings: 5, completedMeetings: 4, averageDuration: 49.2, efficiencyRate: 80.0 },
  ],
  3: [
    { date: '2025-10-01', totalMeetings: 6, completedMeetings: 5, averageDuration: 51.7, efficiencyRate: 83.3 },
    { date: '2025-10-02', totalMeetings: 4, completedMeetings: 4, averageDuration: 39.4, efficiencyRate: 100.0 },
    { date: '2025-10-03', totalMeetings: 8, completedMeetings: 7, averageDuration: 55.3, efficiencyRate: 87.5 },
    { date: '2025-10-04', totalMeetings: 3, completedMeetings: 3, averageDuration: 44.1, efficiencyRate: 100.0 },
  ]
};

const mockTaskAnalytics: Record<number, TaskAnalytics[]> = {
  1: [
    { status: 'todo', count: 12, percentage: 30.0 },
    { status: 'in_progress', count: 8, percentage: 20.0 },
    { status: 'review', count: 5, percentage: 12.5 },
    { status: 'done', count: 15, percentage: 37.5 },
  ],
  2: [
    { status: 'todo', count: 8, percentage: 25.0 },
    { status: 'in_progress', count: 6, percentage: 18.75 },
    { status: 'review', count: 4, percentage: 12.5 },
    { status: 'done', count: 14, percentage: 43.75 },
  ],
  3: [
    { status: 'todo', count: 15, percentage: 35.7 },
    { status: 'in_progress', count: 10, percentage: 23.8 },
    { status: 'review', count: 7, percentage: 16.7 },
    { status: 'done', count: 10, percentage: 23.8 },
  ]
};

const mockResourceUtilization: Record<number, ResourceUtilization[]> = {
  1: [
    { resourceName: 'Sala de Conferências Grande', usageCount: 25, utilizationRate: 68.5 },
    { resourceName: 'Sala de Reuniões Média', usageCount: 18, utilizationRate: 52.3 },
    { resourceName: 'Sala de Reuniões Pequena', usageCount: 32, utilizationRate: 89.1 },
    { resourceName: 'Auditório', usageCount: 5, utilizationRate: 15.4 },
  ],
  2: [
    { resourceName: 'Sala de Conferências Grande', usageCount: 12, utilizationRate: 45.7 },
    { resourceName: 'Sala de Reuniões Média', usageCount: 15, utilizationRate: 58.2 },
    { resourceName: 'Sala de Reuniões Pequena', usageCount: 20, utilizationRate: 72.8 },
  ],
  3: [
    { resourceName: 'Sala de Conferências Grande', usageCount: 18, utilizationRate: 55.3 },
    { resourceName: 'Sala de Reuniões Média', usageCount: 22, utilizationRate: 67.9 },
    { resourceName: 'Sala de Reuniões Pequena', usageCount: 28, utilizationRate: 82.4 },
    { resourceName: 'Auditório', usageCount: 8, utilizationRate: 28.6 },
  ]
};

export const useAnalytics = () => {
  const { currentTenant, isLoading } = useTenant();
  const [productivity, setProductivity] = useState<ExecutiveProductivity[]>([]);
  const [meetingEfficiency, setMeetingEfficiency] = useState<MeetingEfficiency[]>([]);
  const [taskAnalytics, setTaskAnalytics] = useState<TaskAnalytics[]>([]);
  const [resourceUtilization, setResourceUtilization] = useState<ResourceUtilization[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExecutiveProductivity = useCallback(async () => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setProductivity(mockProductivity[currentTenant.id] || []);
    } catch (err) {
      setError('Falha ao carregar relatório de produtividade');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, isLoading]);

  const fetchMeetingEfficiency = useCallback(async () => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setMeetingEfficiency(mockMeetingEfficiency[currentTenant.id] || []);
    } catch (err) {
      setError('Falha ao carregar relatório de eficiência de reuniões');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, isLoading]);

  const fetchTaskAnalytics = useCallback(async () => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setTaskAnalytics(mockTaskAnalytics[currentTenant.id] || []);
    } catch (err) {
      setError('Falha ao carregar análise de tarefas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, isLoading]);

  const fetchResourceUtilization = useCallback(async () => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setResourceUtilization(mockResourceUtilization[currentTenant.id] || []);
    } catch (err) {
      setError('Falha ao carregar relatório de utilização de recursos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, isLoading]);

  const fetchAllAnalytics = useCallback(async () => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API calls
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 500)),
        new Promise(resolve => setTimeout(resolve, 600)),
        new Promise(resolve => setTimeout(resolve, 400)),
        new Promise(resolve => setTimeout(resolve, 700)),
      ]);
      
      setProductivity(mockProductivity[currentTenant.id] || []);
      setMeetingEfficiency(mockMeetingEfficiency[currentTenant.id] || []);
      setTaskAnalytics(mockTaskAnalytics[currentTenant.id] || []);
      setResourceUtilization(mockResourceUtilization[currentTenant.id] || []);
    } catch (err) {
      setError('Falha ao carregar relatórios analíticos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, isLoading]);

  return {
    productivity,
    meetingEfficiency,
    taskAnalytics,
    resourceUtilization,
    loading,
    error,
    fetchExecutiveProductivity,
    fetchMeetingEfficiency,
    fetchTaskAnalytics,
    fetchResourceUtilization,
    fetchAllAnalytics
  };
};
