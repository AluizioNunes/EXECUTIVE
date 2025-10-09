import React, { useEffect } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Table, 
  Progress, 
  Spin, 
  Alert,
  DatePicker
} from 'antd';
import { 
  BarChartOutlined, 
  TeamOutlined, 
  CalendarOutlined, 
  CheckCircleOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import EChartsReact from 'echarts-for-react';
import { useTenant } from '../contexts/TenantContext';
import { useAnalytics } from '../hooks/useAnalytics';

const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const AnalyticsPage: React.FC = () => {
  const { currentTenant, isLoading } = useTenant();
  const { 
    productivity, 
    meetingEfficiency, 
    taskAnalytics, 
    resourceUtilization,
    loading, 
    error, 
    fetchAllAnalytics 
  } = useAnalytics();

  useEffect(() => {
    if (currentTenant && !isLoading) {
      fetchAllAnalytics();
    }
  }, [currentTenant, isLoading]);

  // Opções para gráfico de produtividade
  const getProductivityChartOption = () => ({
    title: {
      text: 'Produtividade dos Executivos',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: productivity.map(p => p.executiveName),
    },
    yAxis: {
      type: 'value',
      name: 'Pontuação',
    },
    series: [{
      data: productivity.map(p => p.productivityScore),
      type: 'bar',
      itemStyle: {
        color: '#1890ff'
      }
    }]
  });

  // Opções para gráfico de eficiência de reuniões
  const getMeetingEfficiencyChartOption = () => ({
    title: {
      text: 'Eficiência de Reuniões (Últimos 7 dias)',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: meetingEfficiency.slice(0, 7).map(m => m.date),
    },
    yAxis: {
      type: 'value',
      name: 'Taxa de Eficiência (%)',
    },
    series: [{
      data: meetingEfficiency.slice(0, 7).map(m => m.efficiencyRate),
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#52c41a'
      }
    }]
  });

  // Opções para gráfico de status das tarefas
  const getTaskStatusChartOption = () => ({
    title: {
      text: 'Distribuição de Status das Tarefas',
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
        name: 'Status',
        type: 'pie',
        radius: '50%',
        data: taskAnalytics.map(t => ({
          value: t.count,
          name: t.status === 'todo' ? 'A Fazer' : 
                t.status === 'in_progress' ? 'Em Andamento' : 
                t.status === 'review' ? 'Em Revisão' : 'Concluído',
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  });

  // Colunas para tabela de produtividade
  const productivityColumns = [
    {
      title: 'Executivo',
      dataIndex: 'executiveName',
      key: 'executiveName',
    },
    {
      title: 'Reuniões',
      dataIndex: 'meetingsCount',
      key: 'meetingsCount',
      sorter: (a: any, b: any) => a.meetingsCount - b.meetingsCount,
    },
    {
      title: 'Tarefas Concluídas',
      dataIndex: 'tasksCompleted',
      key: 'tasksCompleted',
      sorter: (a: any, b: any) => a.tasksCompleted - b.tasksCompleted,
    },
    {
      title: 'Pontuação de Produtividade',
      dataIndex: 'productivityScore',
      key: 'productivityScore',
      sorter: (a: any, b: any) => a.productivityScore - b.productivityScore,
      render: (score: number) => (
        <Progress percent={score} size="small" status="active" />
      ),
    },
  ];

  // Colunas para tabela de utilização de recursos
  const resourceColumns = [
    {
      title: 'Recurso',
      dataIndex: 'resourceName',
      key: 'resourceName',
    },
    {
      title: 'Utilizações',
      dataIndex: 'usageCount',
      key: 'usageCount',
      sorter: (a: any, b: any) => a.usageCount - b.usageCount,
    },
    {
      title: 'Taxa de Utilização',
      dataIndex: 'utilizationRate',
      key: 'utilizationRate',
      sorter: (a: any, b: any) => a.utilizationRate - b.utilizationRate,
      render: (rate: number) => (
        <Progress 
          percent={rate} 
          size="small" 
          status={rate > 80 ? 'exception' : rate > 60 ? 'normal' : 'success'} 
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Erro ao carregar dados analíticos"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <BarChartOutlined /> Dashboard Analítico
          </Title>
          <Paragraph>
            Visão abrangente da produtividade, eficiência e utilização de recursos.
          </Paragraph>
        </Col>
        <Col>
          <RangePicker placeholder={['Data Início', 'Data Fim']} />
        </Col>
      </Row>

      {/* Estatísticas Resumo */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Executivos Ativos"
              value={productivity.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Média de Produtividade"
              value={productivity.length > 0 ? 
                (productivity.reduce((sum, p) => sum + p.productivityScore, 0) / productivity.length).toFixed(1) : 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Eficiência Média de Reuniões"
              value={meetingEfficiency.length > 0 ? 
                (meetingEfficiency.reduce((sum, m) => sum + m.efficiencyRate, 0) / meetingEfficiency.length).toFixed(1) : 0}
              suffix="%"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tarefas Concluídas"
              value={taskAnalytics.find(t => t.status === 'done')?.count || 0}
              prefix={<PieChartOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Gráficos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card>
            <EChartsReact 
              option={getProductivityChartOption()} 
              style={{ height: 300 }} 
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card>
            <EChartsReact 
              option={getMeetingEfficiencyChartOption()} 
              style={{ height: 300 }} 
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card>
            <EChartsReact 
              option={getTaskStatusChartOption()} 
              style={{ height: 300 }} 
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Utilização de Recursos">
            <Table
              columns={resourceColumns}
              dataSource={resourceUtilization}
              pagination={false}
              size="small"
              rowKey="resourceName"
            />
          </Card>
        </Col>
      </Row>

      {/* Tabelas Detalhadas */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Produtividade dos Executivos">
            <Table
              columns={productivityColumns}
              dataSource={productivity}
              pagination={{ pageSize: 5 }}
              size="middle"
              rowKey="executiveId"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsPage;