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
  Space,
  Progress,
  Tooltip,
  Modal,
  Descriptions,
  Avatar,
  Table,
  Input
} from 'antd';
import { 
  PlusOutlined, 
  UserOutlined, 
  CalendarOutlined,
  DollarOutlined,
  ProjectOutlined,
  EditOutlined,
  EyeOutlined
} from '@ant-design/icons';
import EChartsReact from 'echarts-for-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  projectsData,
  projectStats,
  tasksData,
} from '../data/mockData';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const ProjectsPage: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');

  const executives = ['all', 'CEO Maria Silva', 'CFO Pedro Almeida', 'CMO João Santos', 'Diretor Jurídico Carlos Lima', 'CHRO Fernanda Brito'];
  const statusOptions = ['all', 'active', 'planning', 'completed', 'on_hold'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'planning': return 'orange';
      case 'completed': return 'blue';
      case 'on_hold': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'planning': return 'Planejamento';
      case 'completed': return 'Concluído';
      case 'on_hold': return 'Pausado';
      default: return status;
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

  const getProjectTasks = (projectId: number) => {
    return tasksData.filter(task => task.projectId === projectId);
  };

  const getProjectProgress = (project: any) => {
    const projectTasks = getProjectTasks(project.id);
    if (projectTasks.length === 0) return project.progress;
    
    const completedTasks = projectTasks.filter(task => task.status === 'done').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  const filteredProjects = projectsData.filter(project => {
    const statusMatch = filterStatus === 'all' || project.status === filterStatus;
    const ownerMatch = filterOwner === 'all' || project.owner === filterOwner;
    return statusMatch && ownerMatch;
  });

  const getBudgetChartOption = () => {
    const data = projectsData.map(project => ({
      name: project.name.split(' ')[0] + ' ' + project.name.split(' ')[1],
      budget: project.budget,
      spent: project.spent,
      remaining: project.budget - project.spent
    }));

    return {
      title: {
        text: 'Orçamento dos Projetos',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      legend: {
        data: ['Orçamento', 'Gasto', 'Restante'],
        top: 30
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.name),
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: 'Valor (R$)',
        axisLabel: {
          formatter: function(value: number) {
            return 'R$ ' + (value / 1000).toFixed(0) + 'k';
          }
        }
      },
      series: [
        {
          name: 'Orçamento',
          type: 'bar',
          data: data.map(item => item.budget),
          itemStyle: { color: '#1890ff' }
        },
        {
          name: 'Gasto',
          type: 'bar',
          data: data.map(item => item.spent),
          itemStyle: { color: '#ff4d4f' }
        },
        {
          name: 'Restante',
          type: 'bar',
          data: data.map(item => item.remaining),
          itemStyle: { color: '#52c41a' }
        },
      ],
    };
  };

  const getStatusChartOption = () => {
    const statusCount = projectsData.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as any);

    const data = Object.entries(statusCount).map(([status, count]) => ({
      name: getStatusText(status),
      value: count
    }));

    return {
      title: {
        text: 'Status dos Projetos',
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
          data: data,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  };

  const projectColumns = [
    {
      title: 'Projeto',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
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
      title: 'Responsável',
      dataIndex: 'owner',
      key: 'owner',
      render: (owner: string) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{owner.split(' ')[0]}</Text>
        </Space>
      ),
    },
    {
      title: 'Progresso',
      dataIndex: 'progress',
      key: 'progress',
      render: (_: any, record: any) => (
        <div>
          <Progress 
            percent={getProjectProgress(record)} 
            size="small"
            status={getProjectProgress(record) === 100 ? 'success' : 'active'}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {getProjectTasks(record.id).length} tarefas
          </Text>
        </div>
      ),
    },
    {
      title: 'Orçamento',
      key: 'budget',
      render: (record: any) => (
        <div>
          <Text strong>R$ {(record.spent / 1000).toFixed(0)}k</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            de R$ {(record.budget / 1000).toFixed(0)}k
          </Text>
        </div>
      ),
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Ver Detalhes">
            <Button 
              type="text" 
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedProject(record);
                setIsModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Gestão de Projetos</Title>
          <Paragraph>
            Visão geral e controle de todos os projetos executivos com integração a tarefas.
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Button type="primary" icon={<PlusOutlined />}>
              Novo Projeto
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
              placeholder="Status"
              style={{ width: 150 }}
              value={filterStatus}
              onChange={setFilterStatus}
            >
              <Option value="all">Todos</Option>
              {statusOptions.slice(1).map(status => (
                <Option key={status} value={status}>
                  {getStatusText(status)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Responsável"
              style={{ width: 200 }}
              value={filterOwner}
              onChange={setFilterOwner}
              suffixIcon={<UserOutlined />}
            >
              {executives.map(exec => (
                <Option key={exec} value={exec}>
                  {exec === 'all' ? 'Todos' : exec}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Search
              placeholder="Buscar projeto..."
              style={{ width: 200 }}
              onSearch={(value) => console.log(value)}
            />
          </Col>
        </Row>
      </Card>

      {/* Estatísticas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {projectStats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                suffix={stat.suffix}
                valueStyle={{ color: stat.color }}
                prefix={<ProjectOutlined />}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Gráficos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="Status dos Projetos">
            <EChartsReact 
              option={getStatusChartOption()} 
              style={{ height: 300 }} 
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Orçamento dos Projetos">
            <EChartsReact 
              option={getBudgetChartOption()} 
              style={{ height: 300 }} 
            />
          </Card>
        </Col>
      </Row>

      {/* Lista de Projetos */}
      <Card title="Projetos">
        <Table
          columns={projectColumns}
          dataSource={filteredProjects}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* Modal de Detalhes do Projeto */}
      <Modal
        title="Detalhes do Projeto"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Fechar
          </Button>,
          <Button key="edit" type="primary" icon={<EditOutlined />}>
            Editar
          </Button>,
        ]}
        width={800}
      >
        {selectedProject && (
          <div>
            <Descriptions column={1} bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Nome">
                {selectedProject.name}
              </Descriptions.Item>
              <Descriptions.Item label="Descrição">
                {selectedProject.description}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedProject.status)}>
                  {getStatusText(selectedProject.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Prioridade">
                <Tag color={getPriorityColor(selectedProject.priority)}>
                  {selectedProject.priority}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Responsável">
                <Space>
                  <Avatar icon={<UserOutlined />} />
                  <Text>{selectedProject.owner}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Período">
                <Space>
                  <CalendarOutlined />
                  <Text>
                    {format(selectedProject.startDate, 'dd/MM/yyyy', { locale: ptBR })} - 
                    {format(selectedProject.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Orçamento">
                <Space>
                  <DollarOutlined />
                  <Text>R$ {(selectedProject.spent / 1000).toFixed(0)}k / R$ {(selectedProject.budget / 1000).toFixed(0)}k</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Progresso">
                <Progress 
                  percent={getProjectProgress(selectedProject)}
                  status={getProjectProgress(selectedProject) === 100 ? 'success' : 'active'}
                />
              </Descriptions.Item>
            </Descriptions>

            <Title level={4}>Equipe do Projeto</Title>
            <Row gutter={[8, 8]} style={{ marginBottom: 24 }}>
              {selectedProject.teamMembers.map((member: string, index: number) => (
                <Col key={index}>
                  <Tag color="blue" icon={<UserOutlined />}>
                    {member}
                  </Tag>
                </Col>
              ))}
            </Row>

            <Title level={4}>Tarefas do Projeto</Title>
            <Table
              columns={[
                {
                  title: 'Tarefa',
                  dataIndex: 'title',
                  key: 'title',
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={getStatusColor(status)}>
                      {getStatusText(status)}
                    </Tag>
                  ),
                },
                {
                  title: 'Responsável',
                  dataIndex: 'assignee',
                  key: 'assignee',
                  render: (assignee: string) => assignee.split(' ')[0],
                },
                {
                  title: 'Vencimento',
                  dataIndex: 'dueDate',
                  key: 'dueDate',
                  render: (date: Date) => format(date, 'dd/MM/yyyy', { locale: ptBR }),
                },
              ]}
              dataSource={getProjectTasks(selectedProject.id)}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectsPage;
