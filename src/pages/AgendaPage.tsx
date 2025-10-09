import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Tag, 
  Button, 
  Select, 
  DatePicker, 
  Space,
  Table,
  Progress,
  Badge,
  Modal,
  Descriptions,
  Spin,
  Alert,
  message
} from 'antd';
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  UserOutlined, 
  EnvironmentOutlined,
  SyncOutlined,
  PlusOutlined,
  FilterOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import EChartsReact from 'echarts-for-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenant } from '../contexts/TenantContext';
import { useTenantData } from '../hooks/useTenantData';
import { useScheduling } from '../hooks/useScheduling';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AgendaPage: React.FC = () => {
  const { currentTenant, isLoading } = useTenant();
  const { meetings, loading: dataLoading } = useTenantData();
  const { 
    conflicts, 
    suggestions, 
    resources,
    loading: schedulingLoading, 
    detectConflicts, 
    getSuggestions, 
    resolveConflicts,
    allocateResources
  } = useScheduling();
  
  const [selectedExecutive, setSelectedExecutive] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [optimizationLoading, setOptimizationLoading] = useState(false);

  // Use tenant-specific data or mock data
  const executives = currentTenant ? 
    ['all', ...meetings.map(m => m.executive)] : 
    ['all', 'CEO Maria Silva', 'CFO Pedro Almeida', 'CMO João Santos', 'Diretor Jurídico Carlos Lima', 'CHRO Fernanda Brito'];

  // Detect conflicts and allocate resources when tenant changes
  useEffect(() => {
    if (currentTenant && !isLoading) {
      detectConflicts();
      getSuggestions();
      allocateResources();
    }
  }, [currentTenant, isLoading]);

  const getSourceColor = (source: string) => {
    const sources = [
      { name: 'Outlook', color: '#0078d4' },
      { name: 'Google Calendar', color: '#4285f4' },
      { name: 'Manual', color: '#52c41a' },
      { name: 'Outros', color: '#fa8c16' },
    ];
    const sourceConfig = sources.find(s => s.name === source);
    return sourceConfig ? sourceConfig.color : '#1890ff';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'green';
      case 'tentative': return 'orange';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Alta': return 'red';
      case 'Média': return 'orange';
      case 'Baixa': return 'green';
      default: return 'default';
    }
  };

  // Mock data for calendar stats
  const calendarStats = [
    { title: 'Reuniões Hoje', value: meetings.length, color: '#1890ff' },
    { title: 'Reuniões Esta Semana', value: meetings.length * 3, color: '#52c41a' },
    { title: 'Reuniões Confirmadas', value: Math.floor(meetings.length * 0.8), color: '#722ed1' },
    { title: 'Conflitos de Agenda', value: conflicts.length, color: '#ff4d4f' },
    { title: 'Recursos Alocados', value: resources.filter(r => r.availability).length, color: '#13c2c2' },
  ];

  // Mock data for calendar sources
  const calendarSources = [
    { name: 'Outlook', value: 45, color: '#0078d4' },
    { name: 'Google Calendar', value: 35, color: '#4285f4' },
    { name: 'Manual', value: 15, color: '#52c41a' },
    { name: 'Outros', value: 5, color: '#fa8c16' },
  ];

  // Mock data for executive schedule
  const executiveSchedule = currentTenant ? 
    meetings.map((meeting, index) => ({
      name: meeting.executive,
      meetings: index + 1,
      travelTime: (index + 1) * 15,
      availability: 100 - ((index + 1) * 10),
      nextMeeting: `${meeting.time} - ${meeting.title}`
    })) :
    [
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

  const eventColumns = [
    {
      title: 'Reunião',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.executive}
          </Text>
        </div>
      ),
    },
    {
      title: 'Horário',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => (
        <div>
          <Text>{time}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Hoje
          </Text>
        </div>
      ),
    },
    {
      title: 'Local',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => (
        <Space>
          <EnvironmentOutlined />
          <Text>{location || 'Sala de Reuniões'}</Text>
        </Space>
      ),
    },
    {
      title: 'Fonte',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag color={getSourceColor(source || 'Manual')} icon={<SyncOutlined />}>
          {source || 'Manual'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge status={getStatusColor(status || 'confirmed') as any} text={status || 'confirmed'} />
      ),
    },
    {
      title: 'Prioridade',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority || 'Média')}>{priority || 'Média'}</Tag>
      ),
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => {
            setSelectedEvent(record);
            setIsModalVisible(true);
          }}
        >
          Ver Detalhes
        </Button>
      ),
    },
  ];

  const getPieChartOption = (data: any[], title: string) => ({
    title: {
      text: title,
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: '50%',
        data: data.map(item => ({ 
          value: item.value, 
          name: item.name,
          itemStyle: { color: item.color }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  });

  const getBarChartOption = (data: any[], title: string) => ({
    title: {
      text: title,
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.name.split(' ')[0] + ' ' + item.name.split(' ')[1]), // Primeiro nome + sobrenome
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: 'Disponibilidade (%)',
    },
    series: [
      {
        name: 'Disponibilidade',
        type: 'bar',
        data: data.map(item => item.availability),
        itemStyle: {
          color: '#1890ff'
        }
      },
    ],
  });

  const handleOptimizeSchedule = async () => {
    setOptimizationLoading(true);
    try {
      const result = await resolveConflicts();
      message.success('Agenda otimizada com sucesso!');
      if (result && result.suggestions) {
        console.log('Sugestões de otimização:', result.suggestions);
      }
    } catch (error) {
      message.error('Falha ao otimizar agenda');
    } finally {
      setOptimizationLoading(false);
    }
  };

  const handleAllocateResources = async () => {
    setOptimizationLoading(true);
    try {
      await allocateResources();
      message.success('Recursos alocados com sucesso!');
    } catch (error) {
      message.error('Falha ao alocar recursos');
    } finally {
      setOptimizationLoading(false);
    }
  };

  if (isLoading || dataLoading || schedulingLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Agenda Global e Multi-Fuso</Title>
          <Paragraph>
            Gerenciamento centralizado de calendários executivos com integrações em tempo real.
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Button type="primary" icon={<PlusOutlined />}>
              Nova Reunião
            </Button>
            <Button 
              icon={<SyncOutlined />} 
              onClick={handleOptimizeSchedule}
              loading={optimizationLoading}
            >
              Otimizar Agenda
            </Button>
            <Button 
              icon={<EnvironmentOutlined />} 
              onClick={handleAllocateResources}
              loading={optimizationLoading}
            >
              Alocar Recursos
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Alerta de conflitos */}
      {conflicts.length > 0 && (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningOutlined />
              <span>{conflicts.length} conflito(s) de agenda detectado(s)</span>
            </div>
          }
          description={`Há ${conflicts.length} conflito(s) de agenda que precisam ser resolvidos. Clique em "Otimizar Agenda" para resolver automaticamente.`}
          type="warning"
          showIcon
          action={
            <Button 
              size="small" 
              type="primary"
              onClick={handleOptimizeSchedule}
              loading={optimizationLoading}
            >
              Resolver
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Alerta de sugestões */}
      {suggestions.length > 0 && conflicts.length === 0 && (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleOutlined />
              <span>{suggestions.length} sugestão(ões) de otimização disponível(is)</span>
            </div>
          }
          description="A agenda pode ser otimizada para melhor uso do tempo dos executivos."
          type="success"
          showIcon
          action={
            <Button 
              size="small" 
              type="primary"
              onClick={handleOptimizeSchedule}
              loading={optimizationLoading}
            >
              Aplicar Sugestões
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Alerta de recursos não disponíveis */}
      {resources.filter(r => !r.availability).length > 0 && (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningOutlined />
              <span>{resources.filter(r => !r.availability).length} recurso(s) não disponível(is)</span>
            </div>
          }
          description={`Há ${resources.filter(r => !r.availability).length} recurso(s) necessário(s) que não estão disponíveis. Verifique as sugestões de alternativas.`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Filtros */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Text strong>Filtros:</Text>
          </Col>
          <Col>
            <Select
              placeholder="Selecionar Executivo"
              style={{ width: 200 }}
              value={selectedExecutive}
              onChange={setSelectedExecutive}
              suffixIcon={<UserOutlined />}
            >
              {executives.map(exec => (
                <Option key={exec} value={exec}>
                  {exec === 'all' ? 'Todos os Executivos' : exec}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <RangePicker
              placeholder={['Data Início', 'Data Fim']}
              onChange={setSelectedDate}
              suffixIcon={<CalendarOutlined />}
            />
          </Col>
          <Col>
            <Button icon={<FilterOutlined />}>
              Mais Filtros
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Estatísticas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {calendarStats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                valueStyle={{ color: stat.color }}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Gráficos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="Fontes de Calendário">
            <EChartsReact 
              option={getPieChartOption(calendarSources, 'Integrações de Calendário')} 
              style={{ height: 300 }} 
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Disponibilidade dos Executivos">
            <EChartsReact 
              option={getBarChartOption(executiveSchedule, 'Disponibilidade (%)')} 
              style={{ height: 300 }} 
            />
          </Card>
        </Col>
      </Row>

      {/* Agenda dos Executivos */}
      <Card title="Agenda dos Executivos" style={{ marginBottom: 24 }}>
        <Table
          columns={[
            {
              title: 'Executivo',
              dataIndex: 'name',
              key: 'name',
              render: (name: string) => (
                <Space>
                  <UserOutlined />
                  <Text strong>{name}</Text>
                </Space>
              ),
            },
            {
              title: 'Reuniões',
              dataIndex: 'meetings',
              key: 'meetings',
              render: (meetings: number) => (
                <Tag color="blue">{meetings} reuniões</Tag>
              ),
            },
            {
              title: 'Tempo de Viagem',
              dataIndex: 'travelTime',
              key: 'travelTime',
              render: (time: number) => (
                <Space>
                  <ClockCircleOutlined />
                  <Text>{time} min</Text>
                </Space>
              ),
            },
            {
              title: 'Disponibilidade',
              dataIndex: 'availability',
              key: 'availability',
              render: (availability: number) => (
                <Progress 
                  percent={availability} 
                  size="small" 
                  status={availability > 80 ? 'success' : availability > 60 ? 'normal' : 'exception'}
                />
              ),
            },
            {
              title: 'Próxima Reunião',
              dataIndex: 'nextMeeting',
              key: 'nextMeeting',
              render: (meeting: string) => (
                <Text type="secondary">{meeting}</Text>
              ),
            },
          ]}
          dataSource={executiveSchedule}
          pagination={false}
          size="small"
          loading={dataLoading}
        />
      </Card>

      {/* Lista de Eventos */}
      <Card title="Reuniões e Compromissos">
        <Table
          columns={eventColumns}
          dataSource={meetings.map((meeting, index) => ({
            key: meeting.id,
            title: meeting.title,
            time: meeting.time,
            executive: meeting.executive,
            location: index % 2 === 0 ? 'Sala de Reuniões A' : 'Videoconferência',
            source: index % 3 === 0 ? 'Outlook' : index % 3 === 1 ? 'Google Calendar' : 'Manual',
            status: index % 4 === 0 ? 'confirmed' : index % 4 === 1 ? 'tentative' : 'confirmed',
            priority: index % 3 === 0 ? 'Alta' : index % 3 === 1 ? 'Média' : 'Baixa',
          }))}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          size="small"
          loading={dataLoading}
        />
      </Card>

      {/* Modal de Detalhes */}
      <Modal
        title="Detalhes da Reunião"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Fechar
          </Button>,
          <Button key="edit" type="primary">
            Editar
          </Button>,
        ]}
        width={600}
      >
        {selectedEvent && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Título">
              {selectedEvent.title}
            </Descriptions.Item>
            <Descriptions.Item label="Executivo">
              {selectedEvent.executive}
            </Descriptions.Item>
            <Descriptions.Item label="Data e Hora">
              Hoje, {selectedEvent.time}
            </Descriptions.Item>
            <Descriptions.Item label="Local">
              Sala de Reuniões
            </Descriptions.Item>
            <Descriptions.Item label="Fonte">
              <Tag color={getSourceColor('Manual')}>
                Manual
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge status={getStatusColor('confirmed') as any} text="confirmed" />
            </Descriptions.Item>
            <Descriptions.Item label="Prioridade">
              <Tag color={getPriorityColor('Média')}>
                Média
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Participantes">
              Participantes da reunião
            </Descriptions.Item>
            <Descriptions.Item label="Descrição">
              Descrição da reunião
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AgendaPage;