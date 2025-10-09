import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../meetings/meeting.entity';
import { Task } from '../tasks/task.entity';
import { Executive } from '../executives/executive.entity';

// Interfaces para os dados de relatórios
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

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Executive)
    private executiveRepository: Repository<Executive>,
  ) {}

  /**
   * Gera relatório de produtividade dos executivos
   */
  async getExecutiveProductivityReport(tenantId: number): Promise<ExecutiveProductivity[]> {
    // Buscar todos os executivos do tenant
    const executives = await this.executiveRepository.find({
      where: { tenant: { id: tenantId } },
    });

    // Buscar reuniões e tarefas do tenant
    const meetings = await this.meetingRepository.find({
      where: { tenant: { id: tenantId } },
      relations: ['executive'],
    });

    const tasks = await this.taskRepository.find({
      where: { tenant: { id: tenantId } },
    });

    // Calcular produtividade para cada executivo
    const productivityReport: ExecutiveProductivity[] = executives.map(executive => {
      const executiveMeetings = meetings.filter(m => 
        m.executive && m.executive.id === executive.id
      ).length;

      const executiveTasks = tasks.filter(t => 
        t.assignee && t.assignee.id === executive.id && t.status === 'done'
      ).length;

      // Calcular pontuação de produtividade (simplificada)
      const productivityScore = (executiveMeetings * 0.6) + (executiveTasks * 0.4);

      return {
        executiveId: executive.id,
        executiveName: `${executive.firstName} ${executive.lastName}`,
        meetingsCount: executiveMeetings,
        tasksCompleted: executiveTasks,
        productivityScore: parseFloat(productivityScore.toFixed(2)),
      };
    });

    // Ordenar por pontuação de produtividade
    return productivityReport.sort((a, b) => b.productivityScore - a.productivityScore);
  }

  /**
   * Gera relatório de eficiência de reuniões
   */
  async getMeetingEfficiencyReport(tenantId: number, days: number = 30): Promise<MeetingEfficiency[]> {
    // Calcular data de início
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Buscar reuniões do período
    const meetings = await this.meetingRepository.find({
      where: { 
        tenant: { id: tenantId },
        startTime: startDate,
      },
    });

    // Agrupar reuniões por data
    const meetingsByDate: Record<string, Meeting[]> = {};
    
    meetings.forEach(meeting => {
      const dateKey = meeting.startTime.toISOString().split('T')[0];
      if (!meetingsByDate[dateKey]) {
        meetingsByDate[dateKey] = [];
      }
      meetingsByDate[dateKey].push(meeting);
    });

    // Calcular eficiência para cada dia
    const efficiencyReport: MeetingEfficiency[] = Object.keys(meetingsByDate).map(date => {
      const dayMeetings = meetingsByDate[date];
      const totalMeetings = dayMeetings.length;
      const completedMeetings = dayMeetings.filter(m => m.status === 'completed').length;
      
      // Calcular duração média em minutos
      const totalDuration = dayMeetings.reduce((sum, meeting) => {
        const duration = (meeting.endTime.getTime() - meeting.startTime.getTime()) / (1000 * 60);
        return sum + duration;
      }, 0);
      
      const averageDuration = totalMeetings > 0 ? totalDuration / totalMeetings : 0;
      const efficiencyRate = totalMeetings > 0 ? (completedMeetings / totalMeetings) * 100 : 0;

      return {
        date,
        totalMeetings,
        completedMeetings,
        averageDuration: parseFloat(averageDuration.toFixed(2)),
        efficiencyRate: parseFloat(efficiencyRate.toFixed(2)),
      };
    });

    return efficiencyReport;
  }

  /**
   * Gera relatório de status das tarefas
   */
  async getTaskAnalyticsReport(tenantId: number): Promise<TaskAnalytics[]> {
    // Buscar todas as tarefas do tenant
    const tasks = await this.taskRepository.find({
      where: { tenant: { id: tenantId } },
    });

    // Contar tarefas por status
    const statusCounts: Record<string, number> = {};
    tasks.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    });

    // Calcular porcentagens
    const totalTasks = tasks.length;
    const taskAnalytics: TaskAnalytics[] = Object.keys(statusCounts).map(status => {
      const count = statusCounts[status];
      const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
      
      return {
        status,
        count,
        percentage: parseFloat(percentage.toFixed(2)),
      };
    });

    return taskAnalytics;
  }

  /**
   * Gera relatório de utilização de recursos
   */
  async getResourceUtilizationReport(tenantId: number): Promise<ResourceUtilization[]> {
    // Buscar todas as reuniões do tenant
    const meetings = await this.meetingRepository.find({
      where: { tenant: { id: tenantId } },
    });

    // Contar utilização de recursos (baseado na localização como proxy)
    const resourceCounts: Record<string, number> = {};
    
    meetings.forEach(meeting => {
      if (meeting.location) {
        // Normalizar nomes de salas
        const normalizedLocation = meeting.location
          .toLowerCase()
          .replace(/sala\s*/i, 'Sala ')
          .replace(/auditório/i, 'Auditório')
          .replace(/conferência/i, 'Conferência');
        
        resourceCounts[normalizedLocation] = (resourceCounts[normalizedLocation] || 0) + 1;
      }
    });

    // Calcular taxa de utilização (simplificada)
    const totalMeetings = meetings.length;
    const resourceUtilization: ResourceUtilization[] = Object.keys(resourceCounts).map(resourceName => {
      const usageCount = resourceCounts[resourceName];
      const utilizationRate = totalMeetings > 0 ? (usageCount / totalMeetings) * 100 : 0;
      
      return {
        resourceName,
        usageCount,
        utilizationRate: parseFloat(utilizationRate.toFixed(2)),
      };
    });

    // Ordenar por taxa de utilização
    return resourceUtilization.sort((a, b) => b.utilizationRate - a.utilizationRate);
  }

  /**
   * Gera relatório executivo completo
   */
  async getExecutiveDashboardReport(tenantId: number): Promise<any> {
    const [
      productivity,
      meetingEfficiency,
      taskAnalytics,
      resourceUtilization
    ] = await Promise.all([
      this.getExecutiveProductivityReport(tenantId),
      this.getMeetingEfficiencyReport(tenantId, 30),
      this.getTaskAnalyticsReport(tenantId),
      this.getResourceUtilizationReport(tenantId),
    ]);

    return {
      productivity,
      meetingEfficiency,
      taskAnalytics,
      resourceUtilization,
      generatedAt: new Date(),
    };
  }
}