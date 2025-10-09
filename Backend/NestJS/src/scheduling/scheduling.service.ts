import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../meetings/meeting.entity';
import { Executive } from '../executives/executive.entity';

export interface SchedulingConflict {
  meetingId: number;
  conflictType: 'time_overlap' | 'resource_conflict' | 'executive_unavailable' | 'travel_conflict';
  conflictingMeetings: number[];
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface OptimizedSchedule {
  meetingId: number;
  suggestedTime: Date;
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

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(Executive)
    private executiveRepository: Repository<Executive>,
  ) {}

  /**
   * Detecta conflitos de agendamento
   */
  async detectSchedulingConflicts(tenantId: number): Promise<SchedulingConflict[]> {
    // Buscar todas as reuniões do tenant
    const meetings = await this.meetingRepository.find({
      where: { tenant: { id: tenantId } },
      order: { startTime: 'ASC' },
      relations: ['executive'],
    });

    const conflicts: SchedulingConflict[] = [];

    // Verificar sobreposições de tempo
    for (let i = 0; i < meetings.length; i++) {
      const meeting1 = meetings[i];
      
      for (let j = i + 1; j < meetings.length; j++) {
        const meeting2 = meetings[j];
        
        // Verificar se é a mesma reunião
        if (meeting1.id === meeting2.id) continue;
        
        // Verificar sobreposição de tempo
        if (this.hasTimeOverlap(meeting1, meeting2)) {
          conflicts.push({
            meetingId: meeting1.id,
            conflictType: 'time_overlap',
            conflictingMeetings: [meeting2.id],
            description: `Sobreposição de horário com a reunião "${meeting2.title}"`,
            severity: 'high',
          });
        }
        
        // Verificar conflitos de executivo (mesmo executivo em reuniões simultâneas)
        if (meeting1.executive && meeting2.executive && 
            meeting1.executive.id === meeting2.executive.id &&
            this.hasTimeOverlap(meeting1, meeting2)) {
          conflicts.push({
            meetingId: meeting1.id,
            conflictType: 'executive_unavailable',
            conflictingMeetings: [meeting2.id],
            description: `Executivo ${meeting1.executive.firstName} ${meeting1.executive.lastName} não disponível`,
            severity: 'high',
          });
        }
      }
    }

    // Verificar conflitos de viagem
    await this.detectTravelConflicts(meetings, conflicts);

    return conflicts;
  }

  /**
   * Verifica se duas reuniões têm sobreposição de tempo
   */
  private hasTimeOverlap(meeting1: Meeting, meeting2: Meeting): boolean {
    return (
      (meeting1.startTime <= meeting2.startTime && meeting1.endTime > meeting2.startTime) ||
      (meeting2.startTime <= meeting1.startTime && meeting2.endTime > meeting1.startTime)
    );
  }

  /**
   * Detecta conflitos de viagem
   */
  private async detectTravelConflicts(meetings: Meeting[], conflicts: SchedulingConflict[]): Promise<void> {
    // Esta é uma implementação simplificada
    // Em uma solução real, você teria dados de viagem associados às reuniões
    
    for (const meeting of meetings) {
      // Simular detecção de conflito de viagem com base na localização
      if (meeting.location && meeting.location.toLowerCase().includes('aeroporto')) {
        // Verificar se há outra reunião no mesmo dia
        const sameDayMeetings = meetings.filter(m => 
          m.id !== meeting.id && 
          m.startTime.toDateString() === meeting.startTime.toDateString()
        );
        
        if (sameDayMeetings.length > 0) {
          conflicts.push({
            meetingId: meeting.id,
            conflictType: 'travel_conflict',
            conflictingMeetings: sameDayMeetings.map(m => m.id),
            description: 'Conflito com viagem programada',
            severity: 'medium',
          });
        }
      }
    }
  }

  /**
   * Sugere horários otimizados para reuniões
   */
  async suggestOptimizedSchedule(
    tenantId: number,
    meetingId?: number,
  ): Promise<OptimizedSchedule[]> {
    // Buscar todas as reuniões do tenant
    const meetings = await this.meetingRepository.find({
      where: { tenant: { id: tenantId } },
      order: { startTime: 'ASC' },
    });

    const suggestions: OptimizedSchedule[] = [];

    // Se um ID de reunião específico foi fornecido, otimizar apenas essa reunião
    if (meetingId) {
      const meeting = meetings.find(m => m.id === meetingId);
      if (meeting) {
        const suggestion = await this.generateSuggestionForMeeting(meeting, meetings);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    } else {
      // Otimize todas as reuniões
      for (const meeting of meetings) {
        const suggestion = await this.generateSuggestionForMeeting(meeting, meetings);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions;
  }

  /**
   * Gera uma sugestão para uma reunião específica
   */
  private async generateSuggestionForMeeting(
    meeting: Meeting,
    allMeetings: Meeting[],
  ): Promise<OptimizedSchedule | null> {
    // Verificar se a reunião já tem conflitos
    const hasConflicts = allMeetings.some(m => 
      m.id !== meeting.id && this.hasTimeOverlap(meeting, m)
    );

    if (hasConflicts) {
      // Tentar encontrar um horário melhor
      const suggestedTime = await this.findOptimalTime(meeting, allMeetings);
      
      if (suggestedTime && suggestedTime.getTime() !== meeting.startTime.getTime()) {
        return {
          meetingId: meeting.id,
          suggestedTime,
          priority: meeting.priority === 'high' ? 'high' : 'medium',
          reason: 'Resolução de conflito de agendamento',
        };
      }
    }

    return null;
  }

  /**
   * Encontra um horário ótimo para uma reunião
   */
  private async findOptimalTime(
    meeting: Meeting,
    allMeetings: Meeting[],
  ): Promise<Date> {
    // Esta é uma implementação simplificada
    // Em uma solução real, você poderia usar algoritmos mais complexos
    
    // Encontrar o próximo horário disponível
    let suggestedTime = new Date(meeting.startTime);
    const meetingDuration = meeting.endTime.getTime() - meeting.startTime.getTime();
    
    // Verificar os próximos 7 dias
    for (let i = 0; i < 7; i++) {
      const candidateTime = new Date(suggestedTime);
      candidateTime.setDate(candidateTime.getDate() + i);
      
      const candidateEndTime = new Date(candidateTime.getTime() + meetingDuration);
      
      const hasConflict = allMeetings.some(m => 
        m.id !== meeting.id && 
        (
          (candidateTime <= m.startTime && candidateEndTime > m.startTime) ||
          (m.startTime <= candidateTime && m.endTime > candidateTime)
        )
      );
      
      if (!hasConflict) {
        return candidateTime;
      }
    }
    
    // Se não encontrar um horário melhor, retornar o horário original
    return meeting.startTime;
  }

  /**
   * Aloca recursos para reuniões
   */
  async allocateResources(tenantId: number): Promise<ResourceAllocation[]> {
    // Buscar todas as reuniões do tenant
    const meetings = await this.meetingRepository.find({
      where: { tenant: { id: tenantId } },
    });
    
    const resourceAllocations: ResourceAllocation[] = [];
    
    // Alocar salas de reunião
    for (const meeting of meetings) {
      const roomAllocation = this.allocateMeetingRoom(meeting);
      resourceAllocations.push(roomAllocation);
      
      // Alocar equipamentos
      const equipmentAllocations = this.allocateEquipment(meeting);
      resourceAllocations.push(...equipmentAllocations);
    }
    
    return resourceAllocations;
  }

  /**
   * Aloca uma sala de reunião para uma reunião
   */
  private allocateMeetingRoom(meeting: Meeting): ResourceAllocation {
    // Lógica simples para alocar uma sala
    const roomName = this.suggestMeetingRoom(meeting);
    
    // Em uma implementação real, você verificaria a disponibilidade da sala
    const isAvailable = Math.random() > 0.3; // 70% de chance de estar disponível
    
    return {
      meetingId: meeting.id,
      resourceName: roomName,
      resourceType: 'room',
      availability: isAvailable,
      ...(isAvailable ? {} : { suggestedAlternative: this.suggestAlternativeRoom(meeting) })
    };
  }

  /**
   * Aloca equipamentos para uma reunião
   */
  private allocateEquipment(meeting: Meeting): ResourceAllocation[] {
    const requiredEquipment = this.getRequiredEquipment(meeting);
    const allocations: ResourceAllocation[] = [];
    
    for (const equipment of requiredEquipment) {
      // Em uma implementação real, você verificaria a disponibilidade do equipamento
      const isAvailable = Math.random() > 0.2; // 80% de chance de estar disponível
      
      allocations.push({
        meetingId: meeting.id,
        resourceName: equipment,
        resourceType: 'equipment',
        availability: isAvailable,
        ...(isAvailable ? {} : { suggestedAlternative: this.suggestAlternativeEquipment(equipment) })
      });
    }
    
    return allocations;
  }

  /**
   * Sugere uma sala de reunião para uma reunião
   */
  private suggestMeetingRoom(meeting: Meeting): string {
    // Lógica simples para sugerir uma sala
    if (meeting.attendees && meeting.attendees.length > 10) {
      return 'Sala de Conferências Grande';
    } else if (meeting.attendees && meeting.attendees.length > 5) {
      return 'Sala de Reuniões Média';
    } else {
      return 'Sala de Reuniões Pequena';
    }
  }

  /**
   * Sugere uma sala alternativa
   */
  private suggestAlternativeRoom(meeting: Meeting): string {
    const rooms = [
      'Sala de Reuniões Pequena',
      'Sala de Reuniões Média',
      'Sala de Conferências Grande',
      'Auditório'
    ];
    
    // Retornar uma sala diferente da sugerida
    const suggestedRoom = this.suggestMeetingRoom(meeting);
    return rooms.find(room => room !== suggestedRoom) || rooms[0];
  }

  /**
   * Determina os equipamentos necessários para uma reunião
   */
  private getRequiredEquipment(meeting: Meeting): string[] {
    const equipment: string[] = [];
    
    // Adicionar equipamentos básicos
    equipment.push('Projetor');
    
    // Adicionar equipamentos adicionais com base no título ou descrição
    if (meeting.title.toLowerCase().includes('video') || 
        meeting.description?.toLowerCase().includes('video')) {
      equipment.push('Sistema de Videoconferência');
    }
    
    if (meeting.title.toLowerCase().includes('apresentação') || 
        meeting.description?.toLowerCase().includes('apresentação')) {
      equipment.push('Microfone');
    }
    
    if (meeting.title.toLowerCase().includes('demo') || 
        meeting.description?.toLowerCase().includes('demonstração')) {
      equipment.push('Computador');
    }
    
    return equipment;
  }

  /**
   * Sugere equipamento alternativo
   */
  private suggestAlternativeEquipment(equipment: string): string {
    const alternatives: Record<string, string> = {
      'Projetor': 'Telão',
      'Sistema de Videoconferência': 'Plataforma de Videoconferência Online',
      'Microfone': 'Microfone Sem Fio',
      'Computador': 'Notebook',
    };
    
    return alternatives[equipment] || 'Equipamento Alternativo';
  }
}