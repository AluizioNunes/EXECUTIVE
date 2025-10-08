import { addDays, format } from 'date-fns';

const today = new Date();

export const dashboardStats = [
  { title: 'Reuniões Agendadas (Hoje)', value: 5, suffix: 'reuniões' },
  { title: 'Tarefas Pendentes (Alta Prioridade)', value: 3, suffix: 'tarefas' },
  { title: 'Viagens Próximas', value: 2, suffix: 'viagens' },
  { title: 'Documentos Aguardando Aprovação', value: 7, suffix: 'documentos' },
];

export const upcomingMeetings = [
  {
    id: 1,
    time: format(today, 'HH:mm'),
    title: 'Reunião Estratégica - Diretoria Executiva',
    executive: 'CEO Maria Silva',
    location: 'Sala de Reuniões Principal',
  },
  {
    id: 2,
    time: format(addDays(today, 0), 'HH:mm'),
    title: 'Briefing Projeto Alpha - Gerência',
    executive: 'CMO João Santos',
    location: 'Videoconferência',
  },
  {
    id: 3,
    time: format(addDays(today, 0), 'HH:mm'),
    title: 'Alinhamento Equipe Secretariado',
    executive: 'Coord. Ana Costa',
    location: 'Sala 301',
  },
];

export const executiveTasks = [
  {
    id: 1,
    title: 'Preparar apresentação para Conselho',
    executive: 'CEO Maria Silva',
    dueDate: format(addDays(today, 2), 'dd/MM/yyyy'),
    priority: 'Alta',
  },
  {
    id: 2,
    title: 'Organizar viagem para Frankfurt (passagens/hotel)',
    executive: 'CFO Pedro Almeida',
    dueDate: format(addDays(today, 5), 'dd/MM/yyyy'),
    priority: 'Alta',
  },
  {
    id: 3,
    title: 'Revisar minuta de contrato fornecedor X',
    executive: 'Diretor Jurídico Carlos Lima',
    dueDate: format(addDays(today, 1), 'dd/MM/yyyy'),
    priority: 'Média',
  },
];

export const communicationChannels = [
  { value: 45, name: 'E-mails (Interno)' },
  { value: 30, name: 'E-mails (Externo)' },
  { value: 15, name: 'Mensagens Instantâneas' },
  { value: 10, name: 'Telefone' },
];

export const documentApprovalStatus = [
  { value: 7, name: 'Aguardando' },
  { value: 12, name: 'Aprovados (Hoje)' },
  { value: 3, name: 'Rejeitados (Hoje)' },
];

export const executiveInteractionFrequency = [
  { name: 'CEO Maria Silva', value: 10 },
  { name: 'CFO Pedro Almeida', value: 8 },
  { name: 'CMO João Santos', value: 6 },
  { name: 'Diretor Jurídico Carlos Lima', value: 5 },
  { name: 'CHRO Fernanda Brito', value: 4 },
];
