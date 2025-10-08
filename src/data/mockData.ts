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

// Agenda Mock Data
export const calendarEvents = [
  {
    id: 1,
    title: 'Reunião Estratégica Q1 2025',
    start: new Date(2025, 0, 7, 9, 0),
    end: new Date(2025, 0, 7, 11, 0),
    executive: 'CEO Maria Silva',
    location: 'Sala de Reuniões Principal',
    source: 'Outlook',
    priority: 'Alta',
    attendees: ['CEO Maria Silva', 'CFO Pedro Almeida', 'CMO João Santos'],
    description: 'Reunião para definição de estratégias do primeiro trimestre de 2025',
    status: 'confirmed'
  },
  {
    id: 2,
    title: 'Briefing Projeto Alpha',
    start: new Date(2025, 0, 7, 14, 0),
    end: new Date(2025, 0, 7, 15, 30),
    executive: 'CMO João Santos',
    location: 'Videoconferência',
    source: 'Google Calendar',
    priority: 'Média',
    attendees: ['CMO João Santos', 'Equipe Marketing'],
    description: 'Apresentação dos resultados do projeto Alpha',
    status: 'tentative'
  },
  {
    id: 3,
    title: 'Alinhamento Jurídico',
    start: new Date(2025, 0, 8, 10, 0),
    end: new Date(2025, 0, 8, 11, 0),
    executive: 'Diretor Jurídico Carlos Lima',
    location: 'Escritório Jurídico',
    source: 'Outlook',
    priority: 'Alta',
    attendees: ['Diretor Jurídico Carlos Lima', 'Advogado Sênior'],
    description: 'Revisão de contratos e questões legais pendentes',
    status: 'confirmed'
  },
  {
    id: 4,
    title: 'Viagem Frankfurt - Preparação',
    start: new Date(2025, 0, 9, 8, 0),
    end: new Date(2025, 0, 9, 9, 0),
    executive: 'CFO Pedro Almeida',
    location: 'Escritório CFO',
    source: 'Manual',
    priority: 'Alta',
    attendees: ['CFO Pedro Almeida', 'Assistente Executivo'],
    description: 'Preparação para viagem de negócios a Frankfurt',
    status: 'confirmed'
  },
  {
    id: 5,
    title: 'Reunião RH - Políticas',
    start: new Date(2025, 0, 9, 15, 0),
    end: new Date(2025, 0, 9, 16, 0),
    executive: 'CHRO Fernanda Brito',
    location: 'Sala RH',
    source: 'Google Calendar',
    priority: 'Média',
    attendees: ['CHRO Fernanda Brito', 'Equipe RH'],
    description: 'Discussão sobre novas políticas de recursos humanos',
    status: 'confirmed'
  }
];

export const calendarStats = [
  { title: 'Reuniões Hoje', value: 3, color: '#1890ff' },
  { title: 'Reuniões Esta Semana', value: 12, color: '#52c41a' },
  { title: 'Reuniões Confirmadas', value: 8, color: '#722ed1' },
  { title: 'Reuniões Pendentes', value: 4, color: '#fa8c16' },
];

export const calendarSources = [
  { name: 'Outlook', value: 45, color: '#0078d4' },
  { name: 'Google Calendar', value: 35, color: '#4285f4' },
  { name: 'Manual', value: 15, color: '#52c41a' },
  { name: 'Outros', value: 5, color: '#fa8c16' },
];

export const executiveSchedule = [
  { 
    name: 'CEO Maria Silva', 
    meetings: 8, 
    travelTime: 120, 
    availability: 85,
    nextMeeting: '09:00 - Reunião Estratégica Q1 2025'
  },
  { 
    name: 'CFO Pedro Almeida', 
    meetings: 6, 
    travelTime: 90, 
    availability: 92,
    nextMeeting: '14:00 - Briefing Financeiro'
  },
  { 
    name: 'CMO João Santos', 
    meetings: 5, 
    travelTime: 60, 
    availability: 78,
    nextMeeting: '10:30 - Reunião Marketing'
  },
  { 
    name: 'Diretor Jurídico Carlos Lima', 
    meetings: 4, 
    travelTime: 45, 
    availability: 88,
    nextMeeting: '15:00 - Alinhamento Jurídico'
  },
  { 
    name: 'CHRO Fernanda Brito', 
    meetings: 3, 
    travelTime: 30, 
    availability: 95,
    nextMeeting: '11:00 - Reunião RH'
  },
];

// Tasks Mock Data
export const tasksData = [
  {
    id: 1,
    title: 'Preparar apresentação para Conselho',
    description: 'Criar apresentação executiva com resultados Q4 2024 e planejamento Q1 2025',
    status: 'todo',
    priority: 'Alta',
    assignee: 'CEO Maria Silva',
    projectId: 1,
    dueDate: new Date(2025, 0, 10),
    createdAt: new Date(2025, 0, 5),
    tags: ['apresentação', 'conselho', 'resultados'],
    estimatedHours: 8,
    actualHours: 0
  },
  {
    id: 2,
    title: 'Organizar viagem para Frankfurt',
    description: 'Reservar passagens, hotel e organizar agenda de reuniões em Frankfurt',
    status: 'in_progress',
    priority: 'Alta',
    assignee: 'CFO Pedro Almeida',
    projectId: 2,
    dueDate: new Date(2025, 0, 15),
    createdAt: new Date(2025, 0, 3),
    tags: ['viagem', 'logística', 'reuniões'],
    estimatedHours: 4,
    actualHours: 2
  },
  {
    id: 3,
    title: 'Revisar minuta de contrato fornecedor X',
    description: 'Analisar e revisar cláusulas contratuais com fornecedor principal',
    status: 'in_progress',
    priority: 'Média',
    assignee: 'Diretor Jurídico Carlos Lima',
    projectId: 3,
    dueDate: new Date(2025, 0, 12),
    createdAt: new Date(2025, 0, 4),
    tags: ['contrato', 'jurídico', 'fornecedor'],
    estimatedHours: 6,
    actualHours: 3
  },
  {
    id: 4,
    title: 'Implementar nova política de RH',
    description: 'Desenvolver e implementar nova política de trabalho remoto',
    status: 'todo',
    priority: 'Média',
    assignee: 'CHRO Fernanda Brito',
    projectId: 4,
    dueDate: new Date(2025, 0, 20),
    createdAt: new Date(2025, 0, 6),
    tags: ['RH', 'política', 'remoto'],
    estimatedHours: 12,
    actualHours: 0
  },
  {
    id: 5,
    title: 'Campanha marketing Q1 2025',
    description: 'Desenvolver estratégia e materiais para campanha de marketing do primeiro trimestre',
    status: 'done',
    priority: 'Alta',
    assignee: 'CMO João Santos',
    projectId: 5,
    dueDate: new Date(2025, 0, 8),
    createdAt: new Date(2024, 11, 20),
    tags: ['marketing', 'campanha', 'Q1'],
    estimatedHours: 16,
    actualHours: 18
  },
  {
    id: 6,
    title: 'Auditoria financeira anual',
    description: 'Preparar documentação e processos para auditoria externa',
    status: 'in_progress',
    priority: 'Alta',
    assignee: 'CFO Pedro Almeida',
    projectId: 6,
    dueDate: new Date(2025, 0, 25),
    createdAt: new Date(2025, 0, 2),
    tags: ['auditoria', 'financeiro', 'documentação'],
    estimatedHours: 20,
    actualHours: 8
  }
];

// Projects Mock Data
export const projectsData = [
  {
    id: 1,
    name: 'Planejamento Estratégico 2025',
    description: 'Definição de estratégias e objetivos para o ano de 2025',
    status: 'active',
    priority: 'Alta',
    owner: 'CEO Maria Silva',
    startDate: new Date(2024, 11, 1),
    endDate: new Date(2025, 2, 31),
    progress: 35,
    budget: 500000,
    spent: 175000,
    teamMembers: ['CEO Maria Silva', 'CFO Pedro Almeida', 'CMO João Santos'],
    tasks: [1],
    tags: ['estratégia', 'planejamento', '2025']
  },
  {
    id: 2,
    name: 'Expansão Internacional - Europa',
    description: 'Projeto de expansão dos negócios para o mercado europeu',
    status: 'active',
    priority: 'Alta',
    owner: 'CFO Pedro Almeida',
    startDate: new Date(2024, 10, 15),
    endDate: new Date(2025, 5, 30),
    progress: 60,
    budget: 2000000,
    spent: 1200000,
    teamMembers: ['CFO Pedro Almeida', 'Diretor Jurídico Carlos Lima'],
    tasks: [2],
    tags: ['expansão', 'internacional', 'europa']
  },
  {
    id: 3,
    name: 'Otimização de Fornecedores',
    description: 'Revisão e otimização dos contratos e relacionamentos com fornecedores',
    status: 'active',
    priority: 'Média',
    owner: 'Diretor Jurídico Carlos Lima',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 3, 30),
    progress: 25,
    budget: 150000,
    spent: 37500,
    teamMembers: ['Diretor Jurídico Carlos Lima', 'CFO Pedro Almeida'],
    tasks: [3],
    tags: ['fornecedores', 'contratos', 'otimização']
  },
  {
    id: 4,
    name: 'Modernização RH',
    description: 'Implementação de novas políticas e processos de recursos humanos',
    status: 'planning',
    priority: 'Média',
    owner: 'CHRO Fernanda Brito',
    startDate: new Date(2025, 0, 15),
    endDate: new Date(2025, 6, 15),
    progress: 10,
    budget: 300000,
    spent: 30000,
    teamMembers: ['CHRO Fernanda Brito', 'Equipe RH'],
    tasks: [4],
    tags: ['RH', 'modernização', 'políticas']
  },
  {
    id: 5,
    name: 'Campanha Marketing Q1 2025',
    description: 'Desenvolvimento e execução da campanha de marketing do primeiro trimestre',
    status: 'completed',
    priority: 'Alta',
    owner: 'CMO João Santos',
    startDate: new Date(2024, 11, 1),
    endDate: new Date(2025, 0, 8),
    progress: 100,
    budget: 800000,
    spent: 750000,
    teamMembers: ['CMO João Santos', 'Equipe Marketing'],
    tasks: [5],
    tags: ['marketing', 'campanha', 'Q1']
  },
  {
    id: 6,
    name: 'Auditoria Financeira 2024',
    description: 'Preparação e execução da auditoria financeira anual',
    status: 'active',
    priority: 'Alta',
    owner: 'CFO Pedro Almeida',
    startDate: new Date(2024, 11, 15),
    endDate: new Date(2025, 1, 28),
    progress: 70,
    budget: 400000,
    spent: 280000,
    teamMembers: ['CFO Pedro Almeida', 'Equipe Financeira'],
    tasks: [6],
    tags: ['auditoria', 'financeiro', '2024']
  }
];

export const taskStats = [
  { title: 'Total de Tarefas', value: 6, color: '#1890ff' },
  { title: 'Em Andamento', value: 3, color: '#fa8c16' },
  { title: 'Concluídas', value: 1, color: '#52c41a' },
  { title: 'Pendentes', value: 2, color: '#722ed1' },
];

export const projectStats = [
  { title: 'Projetos Ativos', value: 4, color: '#1890ff' },
  { title: 'Em Planejamento', value: 1, color: '#fa8c16' },
  { title: 'Concluídos', value: 1, color: '#52c41a' },
  { title: 'Orçamento Total', value: 4150000, suffix: 'R$', color: '#722ed1' },
];

export const kanbanColumns = [
  {
    id: 'todo',
    title: 'A Fazer',
    color: '#722ed1'
  },
  {
    id: 'in_progress',
    title: 'Em Andamento',
    color: '#fa8c16'
  },
  {
    id: 'review',
    title: 'Em Revisão',
    color: '#1890ff'
  },
  {
    id: 'done',
    title: 'Concluído',
    color: '#52c41a'
  }
];

// Financial Mock Data
export const accountsPayable = [
  {
    id: 1,
    description: 'Passagens aéreas - Viagem Frankfurt',
    supplier: 'Latam Airlines',
    amount: 8500.00,
    dueDate: new Date(2025, 0, 15),
    category: 'Viagens',
    status: 'pending',
    priority: 'Alta',
    executive: 'CFO Pedro Almeida',
    project: 'Expansão Internacional - Europa',
    invoiceNumber: 'LAT-2025-001',
    paymentMethod: 'Cartão Corporativo',
    notes: 'Passagens para reuniões em Frankfurt - 2 pessoas'
  },
  {
    id: 2,
    description: 'Hospedagem - Hotel Frankfurt',
    supplier: 'Marriott Hotel Frankfurt',
    amount: 3200.00,
    dueDate: new Date(2025, 0, 12),
    category: 'Viagens',
    status: 'pending',
    priority: 'Alta',
    executive: 'CFO Pedro Almeida',
    project: 'Expansão Internacional - Europa',
    invoiceNumber: 'MAR-2025-002',
    paymentMethod: 'Transferência Bancária',
    notes: '3 noites - quarto executivo'
  },
  {
    id: 3,
    description: 'Serviços de advocacia - Contratos',
    supplier: 'Advocacia Silva & Associados',
    amount: 15000.00,
    dueDate: new Date(2025, 0, 20),
    category: 'Serviços Profissionais',
    status: 'pending',
    priority: 'Média',
    executive: 'Diretor Jurídico Carlos Lima',
    project: 'Otimização de Fornecedores',
    invoiceNumber: 'AS-2025-003',
    paymentMethod: 'Transferência Bancária',
    notes: 'Revisão de contratos com fornecedores'
  },
  {
    id: 4,
    description: 'Consultoria em marketing digital',
    supplier: 'Digital Marketing Solutions',
    amount: 8500.00,
    dueDate: new Date(2025, 0, 25),
    category: 'Marketing',
    status: 'pending',
    priority: 'Média',
    executive: 'CMO João Santos',
    project: 'Campanha Marketing Q1 2025',
    invoiceNumber: 'DMS-2025-004',
    paymentMethod: 'Transferência Bancária',
    notes: 'Consultoria para campanha Q1 2025'
  },
  {
    id: 5,
    description: 'Software de gestão RH',
    supplier: 'HR Tech Solutions',
    amount: 4500.00,
    dueDate: new Date(2025, 0, 30),
    category: 'Tecnologia',
    status: 'pending',
    priority: 'Baixa',
    executive: 'CHRO Fernanda Brito',
    project: 'Modernização RH',
    invoiceNumber: 'HTS-2025-005',
    paymentMethod: 'Cartão Corporativo',
    notes: 'Licença anual do software de RH'
  },
  {
    id: 6,
    description: 'Auditoria externa',
    supplier: 'Audit Partners',
    amount: 25000.00,
    dueDate: new Date(2025, 1, 5),
    category: 'Auditoria',
    status: 'pending',
    priority: 'Alta',
    executive: 'CFO Pedro Almeida',
    project: 'Auditoria Financeira 2024',
    invoiceNumber: 'AP-2025-006',
    paymentMethod: 'Transferência Bancária',
    notes: 'Serviços de auditoria financeira anual'
  }
];

export const accountsReceivable = [
  {
    id: 1,
    description: 'Pagamento - Contrato Fornecedor X',
    client: 'Fornecedor X Ltda',
    amount: 85000.00,
    dueDate: new Date(2025, 0, 18),
    category: 'Vendas',
    status: 'pending',
    priority: 'Alta',
    executive: 'CFO Pedro Almeida',
    project: 'Otimização de Fornecedores',
    invoiceNumber: 'FX-2025-001',
    paymentMethod: 'Transferência Bancária',
    notes: 'Pagamento referente ao contrato de fornecimento'
  },
  {
    id: 2,
    description: 'Licenciamento de software',
    client: 'TechCorp International',
    amount: 12000.00,
    dueDate: new Date(2025, 0, 22),
    category: 'Licenciamento',
    status: 'pending',
    priority: 'Média',
    executive: 'CEO Maria Silva',
    project: 'Planejamento Estratégico 2025',
    invoiceNumber: 'TCI-2025-002',
    paymentMethod: 'Transferência Bancária',
    notes: 'Licença de software corporativo'
  },
  {
    id: 3,
    description: 'Consultoria estratégica',
    client: 'Strategic Consulting Group',
    amount: 35000.00,
    dueDate: new Date(2025, 0, 28),
    category: 'Consultoria',
    status: 'pending',
    priority: 'Alta',
    executive: 'CEO Maria Silva',
    project: 'Planejamento Estratégico 2025',
    invoiceNumber: 'SCG-2025-003',
    paymentMethod: 'Transferência Bancária',
    notes: 'Consultoria para planejamento estratégico 2025'
  },
  {
    id: 4,
    description: 'Serviços de marketing',
    client: 'Marketing Agency Pro',
    amount: 18000.00,
    dueDate: new Date(2025, 1, 2),
    category: 'Marketing',
    status: 'pending',
    priority: 'Média',
    executive: 'CMO João Santos',
    project: 'Campanha Marketing Q1 2025',
    invoiceNumber: 'MAP-2025-004',
    paymentMethod: 'Transferência Bancária',
    notes: 'Serviços de marketing para campanha Q1'
  },
  {
    id: 5,
    description: 'Reembolso de despesas',
    client: 'Funcionário - Viagem',
    amount: 2800.00,
    dueDate: new Date(2025, 0, 10),
    category: 'Reembolso',
    status: 'pending',
    priority: 'Baixa',
    executive: 'CHRO Fernanda Brito',
    project: 'Viagens Corporativas',
    invoiceNumber: 'REB-2025-005',
    paymentMethod: 'Transferência Bancária',
    notes: 'Reembolso de despesas de viagem'
  }
];

export const financialStats = [
  { title: 'Total a Pagar', value: 64300.00, suffix: 'R$', color: '#ff4d4f' },
  { title: 'Total a Receber', value: 146800.00, suffix: 'R$', color: '#52c41a' },
  { title: 'Saldo Líquido', value: 82500.00, suffix: 'R$', color: '#1890ff' },
  { title: 'Vencimentos Hoje', value: 2, suffix: 'contas', color: '#fa8c16' },
];

export const paymentCategories = [
  { name: 'Viagens', value: 11700.00, color: '#1890ff' },
  { name: 'Serviços Profissionais', value: 15000.00, color: '#52c41a' },
  { name: 'Marketing', value: 8500.00, color: '#fa8c16' },
  { name: 'Tecnologia', value: 4500.00, color: '#722ed1' },
  { name: 'Auditoria', value: 25000.00, color: '#f5222d' },
];

export const receivableCategories = [
  { name: 'Vendas', value: 85000.00, color: '#1890ff' },
  { name: 'Consultoria', value: 35000.00, color: '#52c41a' },
  { name: 'Marketing', value: 18000.00, color: '#fa8c16' },
  { name: 'Licenciamento', value: 12000.00, color: '#722ed1' },
  { name: 'Reembolso', value: 2800.00, color: '#13c2c2' },
];

// User Mock Data
export const userData = {
  id: 1,
  name: 'Maria Silva Santos',
  email: 'maria.silva@executive.com',
  role: 'Secretária Executiva Senior',
  department: 'Secretariado Executivo',
  profile: 'Administrador',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
  loginTime: new Date(2025, 0, 7, 8, 30),
  lastActivity: new Date(),
  permissions: ['admin', 'financial', 'projects', 'tasks', 'agenda'],
  phone: '+55 11 99999-9999',
  location: 'São Paulo, SP'
};
