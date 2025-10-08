import React from 'react';
import { Typography, Row, Col, Card, Statistic, List, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import EChartsReact from 'echarts-for-react';
import { format } from 'date-fns';
import {
  dashboardStats,
  upcomingMeetings,
  executiveTasks,
  communicationChannels,
  documentApprovalStatus,
  executiveInteractionFrequency,
} from '../data/mockData';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const today = new Date();

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

  return (
    <div>
      <Title level={2}>Dashboard Executivo</Title>
      <Paragraph>Visão geral das atividades de secretariado para {format(today, 'dd/MM/yyyy')}.</Paragraph>

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
              dataSource={upcomingMeetings}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<a href="#">{item.title}</a>}
                    description={`Com: ${item.executive} | Local: ${item.location} | Horário: ${item.time}`}
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
              dataSource={executiveTasks}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<a href="#">{item.title}</a>}
                    description={
                      <>
                        <span>Para: {item.executive} | Vencimento: {item.dueDate} | </span>
                        <Tag color={item.priority === 'Alta' ? 'red' : 'orange'}>{item.priority}</Tag>
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
