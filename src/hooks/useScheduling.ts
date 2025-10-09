import { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';

// Mock data types
export interface SchedulingConflict {
  meetingId: number;
  conflictType: 'time_overlap' | 'resource_conflict' | 'executive_unavailable' | 'travel_conflict';
  conflictingMeetings: number[];
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface OptimizedSchedule {
  meetingId: number;
  suggestedTime: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ResourceAllocation {
  meetingId: number;
  resourceName: string;
  resourceType: 'room' | 'equipment' | 'vehicle';
  availability: boolean;
  suggestedAlternative?: string;
}

export const useScheduling = () => {
  const { currentTenant, isLoading } = useTenant();
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizedSchedule[]>([]);
  const [resources, setResources] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data
  const mockConflicts: Record<number, SchedulingConflict[]> = {
    1: [
      {
        meetingId: 1,
        conflictType: 'time_overlap',
        conflictingMeetings: [2],
        description: 'Sobreposição de horário com a reunião "Briefing Financeiro"',
        severity: 'high'
      },
      {
        meetingId: 1,
        conflictType: 'executive_unavailable',
        conflictingMeetings: [3],
        description: 'Executivo João Silva não disponível',
        severity: 'high'
      }
    ],
    2: [],
    3: [
      {
        meetingId: 5,
        conflictType: 'time_overlap',
        conflictingMeetings: [6],
        description: 'Sobreposição de horário com a reunião "Avaliação de Desempenho"',
        severity: 'medium'
      }
    ]
  };

  const mockSuggestions: Record<number, OptimizedSchedule[]> = {
    1: [
      {
        meetingId: 1,
        suggestedTime: '2025-10-09T10:00:00',
        priority: 'high',
        reason: 'Resolução de conflito de agendamento'
      }
    ],
    2: [],
    3: [
      {
        meetingId: 5,
        suggestedTime: '2025-10-09T12:00:00',
        priority: 'medium',
        reason: 'Resolução de conflito de agendamento'
      }
    ]
  };

  const mockResources: Record<number, ResourceAllocation[]> = {
    1: [
      {
        meetingId: 1,
        resourceName: 'Sala de Conferências Grande',
        resourceType: 'room',
        availability: true
      },
      {
        meetingId: 1,
        resourceName: 'Projetor',
        resourceType: 'equipment',
        availability: false,
        suggestedAlternative: 'Telão'
      },
      {
        meetingId: 2,
        resourceName: 'Sala de Reuniões Média',
        resourceType: 'room',
        availability: true
      }
    ],
    2: [
      {
        meetingId: 3,
        resourceName: 'Sala de Reuniões Média',
        resourceType: 'room',
        availability: true
      },
      {
        meetingId: 3,
        resourceName: 'Projetor',
        resourceType: 'equipment',
        availability: true
      }
    ],
    3: [
      {
        meetingId: 5,
        resourceName: 'Sala de Reuniões Pequena',
        resourceType: 'room',
        availability: false,
        suggestedAlternative: 'Sala de Reuniões Média'
      }
    ]
  };

  const detectConflicts = async () => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setConflicts(mockConflicts[currentTenant.id] || []);
    } catch (err) {
      setError('Falha ao detectar conflitos de agendamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async () => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setSuggestions(mockSuggestions[currentTenant.id] || []);
    } catch (err) {
      setError('Falha ao obter sugestões de agendamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const allocateResources = async () => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setResources(mockResources[currentTenant.id] || []);
    } catch (err) {
      setError('Falha ao alocar recursos para reuniões');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resolveConflicts = async () => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate conflict resolution
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConflicts([]);
      setSuggestions(mockSuggestions[currentTenant.id] || []);
      
      return {
        message: 'Conflitos resolvidos com sucesso',
        suggestions: mockSuggestions[currentTenant.id] || []
      };
    } catch (err) {
      setError('Falha ao resolver conflitos de agendamento');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const allocateResourcesForMeeting = async (meetingId: number) => {
    if (!currentTenant || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate resource allocation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const allResources = mockResources[currentTenant.id] || [];
      const meetingResources = allResources.filter(r => r.meetingId === meetingId);
      
      return {
        message: 'Recursos alocados com sucesso',
        allocations: meetingResources
      };
    } catch (err) {
      setError('Falha ao alocar recursos para a reunião');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    conflicts,
    suggestions,
    resources,
    loading,
    error,
    detectConflicts,
    getSuggestions,
    allocateResources,
    resolveConflicts,
    allocateResourcesForMeeting
  };
};