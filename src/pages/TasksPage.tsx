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
  Badge,
  Tooltip,
  Modal,
  Descriptions,
  Avatar
} from 'antd';
import { 
  PlusOutlined, 
  UserOutlined, 
  CalendarOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  ProjectOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  tasksData,
  taskStats,
  kanbanColumns,
  projectsData,
} from '../data/mockData';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const TasksPage: React.FC = () => {
  const [tasks] = useState(tasksData);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  const executives = ['all', 'CEO Maria Silva', 'CFO Pedro Almeida', 'CMO João Santos', 'Diretor Jurídico Carlos Lima', 'CHRO Fernanda Brito'];
  const projects = ['all', ...projectsData.map(p => p.name)];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Alta': return 'red';
      case 'Média': return 'orange';
      case 'Baixa': return 'green';
      default: return 'default';
    }
  };

  const getProjectName = (projectId: number) => {
    const project = projectsData.find(p => p.id === projectId);
    return project ? project.name : 'Sem Projeto';
  };

  const getProjectColor = (projectId: number) => {
    const project = projectsData.find(p => p.id === projectId);
    return project ? (project.priority === 'Alta' ? 'red' : project.priority === 'Média' ? 'orange' : 'green') : 'default';
  };

  const filteredTasks = tasks.filter(task => {
    const assigneeMatch = filterAssignee === 'all' || task.assignee === filterAssignee;
    const projectMatch = filterProject === 'all' || getProjectName(task.projectId) === filterProject;
    return assigneeMatch && projectMatch;
  });

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const TaskCard: React.FC<{ task: any }> = ({ task }) => {
    const isOverdue = task.dueDate < new Date() && task.status !== 'done';
    
    return (
      <Card
        size="small"
        style={{ 
          marginBottom: 8, 
          cursor: 'pointer',
          borderLeft: `4px solid ${kanbanColumns.find(col => col.id === task.status)?.color}`,
          opacity: task.status === 'done' ? 0.7 : 1
        }}
        onClick={() => {
          setSelectedTask(task);
          setIsModalVisible(true);
        }}
        actions={[
          <Tooltip title="Editar">
            <EditOutlined />
          </Tooltip>,
          <Tooltip title="Excluir">
            <DeleteOutlined />
          </Tooltip>
        ]}
      >
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: '14px' }}>
            {task.title}
          </Text>
          {isOverdue && (
            <Badge 
              count="ATRASADO" 
              style={{ backgroundColor: '#ff4d4f', marginLeft: 8 }}
            />
          )}
        </div>
        
        <Paragraph 
          style={{ 
            fontSize: '12px', 
            color: '#666', 
            margin: '4px 0',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {task.description}
        </Paragraph>

        <div style={{ marginBottom: 8 }}>
          <Tag color={getPriorityColor(task.priority)}>
            {task.priority}
          </Tag>
          <Tag color={getProjectColor(task.projectId)}>
            {getProjectName(task.projectId)}
          </Tag>
        </div>

        <Row justify="space-between" align="middle" style={{ fontSize: '12px' }}>
          <Col>
            <Space size={4}>
              <UserOutlined />
              <Text type="secondary">{task.assignee.split(' ')[0]}</Text>
            </Space>
          </Col>
          <Col>
            <Space size={4}>
              <CalendarOutlined />
              <Text type="secondary">
                {format(task.dueDate, 'dd/MM', { locale: ptBR })}
              </Text>
            </Space>
          </Col>
        </Row>

        <div style={{ marginTop: 8 }}>
          <Progress 
            percent={task.actualHours > 0 ? (task.actualHours / task.estimatedHours) * 100 : 0}
            size="small"
            format={() => `${task.actualHours}h/${task.estimatedHours}h`}
          />
        </div>
      </Card>
    );
  };

  const KanbanColumn: React.FC<{ column: any }> = ({ column }) => {
    const columnTasks = getTasksByStatus(column.id);
    
    return (
      <Col xs={24} sm={12} md={6} style={{ height: '100%' }}>
        <Card
          title={
            <Space>
              <div 
                style={{ 
                  width: 12, 
                  height: 12, 
                  backgroundColor: column.color, 
                  borderRadius: '50%' 
                }} 
              />
              <span>{column.title}</span>
              <Badge count={columnTasks.length} style={{ backgroundColor: column.color }} />
            </Space>
          }
          style={{ height: '100%' }}
          bodyStyle={{ padding: '12px', height: 'calc(100% - 57px)', overflowY: 'auto' }}
        >
          {columnTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          
          {columnTasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              <DragOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>Nenhuma tarefa</div>
            </div>
          )}
        </Card>
      </Col>
    );
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Gestão de Tarefas</Title>
          <Paragraph>
            Sistema Kanban para gerenciamento de tarefas com integração a projetos.
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Button type="primary" icon={<PlusOutlined />}>
              Nova Tarefa
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
              placeholder="Responsável"
              style={{ width: 200 }}
              value={filterAssignee}
              onChange={setFilterAssignee}
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
            <Select
              placeholder="Projeto"
              style={{ width: 200 }}
              value={filterProject}
              onChange={setFilterProject}
              suffixIcon={<ProjectOutlined />}
            >
              {projects.map(project => (
                <Option key={project} value={project}>
                  {project === 'all' ? 'Todos os Projetos' : project}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Estatísticas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {taskStats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                valueStyle={{ color: stat.color }}
                prefix={<ProjectOutlined />}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Kanban Board */}
      <Card title="Kanban Board" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} style={{ minHeight: '600px' }}>
          {kanbanColumns.map(column => (
            <KanbanColumn key={column.id} column={column} />
          ))}
        </Row>
      </Card>

      {/* Modal de Detalhes da Tarefa */}
      <Modal
        title="Detalhes da Tarefa"
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
        width={700}
      >
        {selectedTask && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Título">
              {selectedTask.title}
            </Descriptions.Item>
            <Descriptions.Item label="Descrição">
              {selectedTask.description}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={kanbanColumns.find(col => col.id === selectedTask.status)?.color}>
                {kanbanColumns.find(col => col.id === selectedTask.status)?.title}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Prioridade">
              <Tag color={getPriorityColor(selectedTask.priority)}>
                {selectedTask.priority}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Responsável">
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text>{selectedTask.assignee}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Projeto">
              <Tag color={getProjectColor(selectedTask.projectId)}>
                {getProjectName(selectedTask.projectId)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Data de Vencimento">
              <Space>
                <CalendarOutlined />
                <Text>{format(selectedTask.dueDate, 'dd/MM/yyyy', { locale: ptBR })}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Horas Estimadas/Reais">
              <Space>
                <ClockCircleOutlined />
                <Text>{selectedTask.actualHours}h / {selectedTask.estimatedHours}h</Text>
                <Progress 
                  percent={selectedTask.actualHours > 0 ? (selectedTask.actualHours / selectedTask.estimatedHours) * 100 : 0}
                  size="small"
                  style={{ width: 100 }}
                />
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Tags">
              <Space wrap>
                {selectedTask.tags.map((tag: string) => (
                  <Tag key={tag} color="blue">{tag}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Data de Criação">
              {format(selectedTask.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default TasksPage;
