import React from 'react';
import { Typography, Row, Col, Card, Statistic, List, Tag, Alert, Button } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ApartmentOutlined, CalendarOutlined, ProjectOutlined } from '@ant-design/icons';
import EChartsReact from 'echarts-for-react';
import { format } from 'date-fns';
import { useTenant } from '../contexts/TenantContext';
import { useTenantData } from '../hooks/useTenantData';
import { useTenantNavigation } from '../hooks/useTenantNavigation';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const today = new Date();
  const { currentTenant } = useTenant();
  const { executives, meetings, tasks, loading } = useTenantData();
  const { navigateTo } = useTenantNavigation();

  const getPieChartOption = (data: any[], title: string) => ({
    title: {
      text: title,
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
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
        data: data.map(item => ({ value: item.value, name: item.name })),
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

  const getBarChartOption = (data: any[], title: string, xName: string, yName: string) => ({
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
      data: data.map(item => item[xName]),
    },
    yAxis: {
      type: 'value',
      name: yName,
    },
    series: [
      {
        name: yName,
        type: 'bar',
        data: data.map(item => item.value),
      },
    ],
  });

  // Mock data for dashboard stats
  const dashboardStats = [
    { title: 'Reuniões Agendadas (Hoje)', value: meetings.length, suffix: 'reuniões' },
    { title: 'Tarefas Pendentes (Alta Prioridade)', value: tasks.filter(t => t.priority === 'Alta').length, suffix: 'tarefas' },
    { title: 'Executivos', value: executives.length, suffix: 'executivos' },
    { title: 'Tarefas Concluídas', value: tasks.filter(t => t.priority === 'Alta').length, suffix: 'tarefas' },
  ];

  // Mock data for communication channels
  const communicationChannels = [
    { value: 45, name: 'E-mails (Interno)' },
    { value: 30, name: 'E-mails (Externo)' },
    { value: 15, name: 'Mensagens Instantâneas' },
    { value: 10, name: 'Telefone' },
  ];

  // Mock data for document approval status
  const documentApprovalStatus = [
    { value: 7, name: 'Aguardando' },
    { value: 12, name: 'Aprovados (Hoje)' },
    { value: 3, name: 'Rejeitados (Hoje)' },
  ];

  // Mock data for executive interaction frequency
  const executiveInteractionFrequency = executives.map((exec, index) => ({
    name: exec.name,
    value: (index + 1) * 2,
  }));

  return (
    <div>
      {/* Tenant Context Banner */}
      {currentTenant && (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ApartmentOutlined />
              <span>Você está visualizando dados da empresa: <strong>{currentTenant.name}</strong></span>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      <Title level={2}>Dashboard Executivo</Title>
      <Paragraph>Visão geral das atividades de secretariado para {format(today, 'dd/MM/yyyy')}.</Paragraph>

      {/* Quick Actions */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        <Button 
          type="primary" 
          icon={<CalendarOutlined />}
          onClick={() => navigateTo('/agenda')}
        >
          Ver Agenda
        </Button>
        <Button 
          icon={<ProjectOutlined />}
          onClick={() => navigateTo('/tasks')}
        >
          Ver Tarefas
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {dashboardStats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                suffix={stat.suffix}
                valueStyle={{ color: stat.title.includes('Pendentes') ? '#cf1322' : '#3f8600' }}
                prefix={stat.title.includes('Pendentes') ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="Próximas Reuniões">
            <List
              itemLayout="horizontal"
              dataSource={meetings.slice(0, 3)}
              loading={loading}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<a href="#">{item.title}</a>}
                    description={`Com: ${item.executive} | Horário: ${item.time}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Tarefas Urgentes/Próximas">
            <List
              itemLayout="horizontal"
              dataSource={tasks.slice(0, 3)}
              loading={loading}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<a href="#">{item.title}</a>}
                    description={
                      <>
                        <span>Para: {item.executive || 'Não atribuído'} | Vencimento: {item.dueDate} | </span>
                        <Tag color={item.priority === 'Alta' ? 'red' : item.priority === 'Média' ? 'orange' : 'green'}>{item.priority}</Tag>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="Canais de Comunicação Utilizados">
            <EChartsReact option={getPieChartOption(communicationChannels, 'Canais de Comunicação')} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Status de Aprovação de Documentos">
            <EChartsReact option={getPieChartOption(documentApprovalStatus, 'Status de Documentos')} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Frequência de Interação por Executivo">
            <EChartsReact option={getBarChartOption(executiveInteractionFrequency, 'Interação Executiva', 'name', 'Interações')} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomePage;