import React, { useState } from 'react';
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
  Descriptions
} from 'antd';
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  UserOutlined, 
  EnvironmentOutlined,
  SyncOutlined,
  PlusOutlined,
  FilterOutlined
} from '@ant-design/icons';
import EChartsReact from 'echarts-for-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  calendarEvents,
  calendarStats,
  calendarSources,
  executiveSchedule,
} from '../data/mockData';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AgendaPage: React.FC = () => {
  const [selectedExecutive, setSelectedExecutive] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const executives = ['all', 'CEO Maria Silva', 'CFO Pedro Almeida', 'CMO João Santos', 'Diretor Jurídico Carlos Lima', 'CHRO Fernanda Brito'];

  const getSourceColor = (source: string) => {
    const sourceConfig = calendarSources.find(s => s.name === source);
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

  const filteredEvents = calendarEvents.filter(event => {
    const executiveMatch = selectedExecutive === 'all' || event.executive === selectedExecutive;
    const dateMatch = !selectedDate || 
      (event.start >= selectedDate[0] && event.start <= selectedDate[1]);
    return executiveMatch && dateMatch;
  });

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
      dataIndex: 'start',
      key: 'start',
      render: (date: Date) => (
        <div>
          <Text>{format(date, 'HH:mm')}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {format(date, 'dd/MM', { locale: ptBR })}
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
          <Text>{location}</Text>
        </Space>
      ),
    },
    {
      title: 'Fonte',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag color={getSourceColor(source)} icon={<SyncOutlined />}>
          {source}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge status={getStatusColor(status) as any} text={status} />
      ),
    },
    {
      title: 'Prioridade',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>{priority}</Tag>
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
            <Button icon={<SyncOutlined />}>
              Sincronizar
            </Button>
          </Space>
        </Col>
      </Row>

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
        />
      </Card>

      {/* Lista de Eventos */}
      <Card title="Reuniões e Compromissos">
        <Table
          columns={eventColumns}
          dataSource={filteredEvents}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
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
              {format(selectedEvent.start, 'dd/MM/yyyy HH:mm', { locale: ptBR })} - 
              {format(selectedEvent.end, 'HH:mm', { locale: ptBR })}
            </Descriptions.Item>
            <Descriptions.Item label="Local">
              {selectedEvent.location}
            </Descriptions.Item>
            <Descriptions.Item label="Fonte">
              <Tag color={getSourceColor(selectedEvent.source)}>
                {selectedEvent.source}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge status={getStatusColor(selectedEvent.status) as any} text={selectedEvent.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Prioridade">
              <Tag color={getPriorityColor(selectedEvent.priority)}>
                {selectedEvent.priority}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Participantes">
              {selectedEvent.attendees.join(', ')}
            </Descriptions.Item>
            <Descriptions.Item label="Descrição">
              {selectedEvent.description}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AgendaPage;
