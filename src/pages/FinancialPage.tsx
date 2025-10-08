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
  Table,
  Badge,
  Tooltip,
  Modal,
  Descriptions,
  Avatar,
  Input,
  Tabs,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  UserOutlined, 
  CalendarOutlined,
  DollarOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  BankOutlined
} from '@ant-design/icons';
import EChartsReact from 'echarts-for-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  accountsPayable,
  accountsReceivable,
  financialStats,
  paymentCategories,
  receivableCategories,
} from '../data/mockData';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TabPane } = Tabs;

const FinancialPage: React.FC = () => {
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  const [isPayableModalVisible, setIsPayableModalVisible] = useState(false);
  const [isReceivableModalVisible, setIsReceivableModalVisible] = useState(false);
  const [filterPayableStatus, setFilterPayableStatus] = useState<string>('all');
  const [filterReceivableStatus, setFilterReceivableStatus] = useState<string>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'paid': return 'green';
      case 'overdue': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'paid': return 'Pago';
      case 'overdue': return 'Vencido';
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Cartão Corporativo': return <CreditCardOutlined />;
      case 'Transferência Bancária': return <BankOutlined />;
      default: return <DollarOutlined />;
    }
  };

  const isOverdue = (dueDate: Date) => {
    return dueDate < new Date() && new Date().getDate() !== dueDate.getDate();
  };

  const payableColumns = [
    {
      title: 'Descrição',
      dataIndex: 'description',
      key: 'description',
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.supplier}
          </Text>
        </div>
      ),
    },
    {
      title: 'Valor',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <Text strong style={{ color: '#ff4d4f' }}>
          R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Vencimento',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: Date) => (
        <div>
          <Space>
            <CalendarOutlined />
            <Text style={{ color: isOverdue(date) ? '#ff4d4f' : 'inherit' }}>
              {format(date, 'dd/MM/yyyy', { locale: ptBR })}
            </Text>
          </Space>
          {isOverdue(date) && (
            <Badge 
              count="VENCIDO" 
              style={{ backgroundColor: '#ff4d4f', marginLeft: 8 }}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Categoria',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>,
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
      dataIndex: 'executive',
      key: 'executive',
      render: (executive: string) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{executive.split(' ')[0]}</Text>
        </Space>
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
                setSelectedPayable(record);
                setIsPayableModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Marcar como Pago">
            <Button type="text" size="small" icon={<CheckCircleOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const receivableColumns = [
    {
      title: 'Descrição',
      dataIndex: 'description',
      key: 'description',
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.client}
          </Text>
        </div>
      ),
    },
    {
      title: 'Valor',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Vencimento',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: Date) => (
        <div>
          <Space>
            <CalendarOutlined />
            <Text style={{ color: isOverdue(date) ? '#ff4d4f' : 'inherit' }}>
              {format(date, 'dd/MM/yyyy', { locale: ptBR })}
            </Text>
          </Space>
          {isOverdue(date) && (
            <Badge 
              count="VENCIDO" 
              style={{ backgroundColor: '#ff4d4f', marginLeft: 8 }}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Categoria',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="green">{category}</Tag>,
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
      dataIndex: 'executive',
      key: 'executive',
      render: (executive: string) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{executive.split(' ')[0]}</Text>
        </Space>
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
                setSelectedReceivable(record);
                setIsReceivableModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Marcar como Recebido">
            <Button type="text" size="small" icon={<CheckCircleOutlined />} />
          </Tooltip>
        </Space>
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
      formatter: '{a} <br/>{b}: R$ {c} ({d}%)'
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

  const filteredPayables = accountsPayable.filter(account => 
    filterPayableStatus === 'all' || account.status === filterPayableStatus
  );

  const filteredReceivables = accountsReceivable.filter(account => 
    filterReceivableStatus === 'all' || account.status === filterReceivableStatus
  );

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Gestão Financeira</Title>
          <Paragraph>
            Controle de contas a pagar e receber com integração aos projetos executivos.
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Button type="primary" icon={<PlusOutlined />}>
              Nova Conta
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Estatísticas Financeiras */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {financialStats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                suffix={stat.suffix}
                valueStyle={{ color: stat.color }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Gráficos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="Categorias de Pagamentos">
            <EChartsReact 
              option={getPieChartOption(paymentCategories, 'Distribuição por Categoria')} 
              style={{ height: 300 }} 
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Categorias de Recebimentos">
            <EChartsReact 
              option={getPieChartOption(receivableCategories, 'Distribuição por Categoria')} 
              style={{ height: 300 }} 
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs para Contas a Pagar e Receber */}
      <Card>
        <Tabs defaultActiveKey="payable" size="large">
          <TabPane 
            tab={
              <span>
                <ExclamationCircleOutlined />
                Contas a Pagar ({accountsPayable.length})
              </span>
            } 
            key="payable"
          >
            {/* Filtros para Contas a Pagar */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col>
                <Text strong>Filtros:</Text>
              </Col>
              <Col>
                <Select
                  placeholder="Status"
                  style={{ width: 150 }}
                  value={filterPayableStatus}
                  onChange={setFilterPayableStatus}
                >
                  <Option value="all">Todos</Option>
                  <Option value="pending">Pendente</Option>
                  <Option value="paid">Pago</Option>
                  <Option value="overdue">Vencido</Option>
                </Select>
              </Col>
              <Col>
                <Search
                  placeholder="Buscar conta..."
                  style={{ width: 200 }}
                  onSearch={(value) => console.log(value)}
                />
              </Col>
            </Row>

            <Alert
              message="Atenção"
              description="Você tem 2 contas vencidas que precisam de atenção imediata."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              columns={payableColumns}
              dataSource={filteredPayables}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <CheckCircleOutlined />
                Contas a Receber ({accountsReceivable.length})
              </span>
            } 
            key="receivable"
          >
            {/* Filtros para Contas a Receber */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col>
                <Text strong>Filtros:</Text>
              </Col>
              <Col>
                <Select
                  placeholder="Status"
                  style={{ width: 150 }}
                  value={filterReceivableStatus}
                  onChange={setFilterReceivableStatus}
                >
                  <Option value="all">Todos</Option>
                  <Option value="pending">Pendente</Option>
                  <Option value="paid">Recebido</Option>
                  <Option value="overdue">Vencido</Option>
                </Select>
              </Col>
              <Col>
                <Search
                  placeholder="Buscar conta..."
                  style={{ width: 200 }}
                  onSearch={(value) => console.log(value)}
                />
              </Col>
            </Row>

            <Table
              columns={receivableColumns}
              dataSource={filteredReceivables}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Modal de Detalhes - Contas a Pagar */}
      <Modal
        title="Detalhes da Conta a Pagar"
        open={isPayableModalVisible}
        onCancel={() => setIsPayableModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsPayableModalVisible(false)}>
            Fechar
          </Button>,
          <Button key="pay" type="primary" icon={<CheckCircleOutlined />}>
            Marcar como Pago
          </Button>,
        ]}
        width={700}
      >
        {selectedPayable && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Descrição">
              {selectedPayable.description}
            </Descriptions.Item>
            <Descriptions.Item label="Fornecedor">
              {selectedPayable.supplier}
            </Descriptions.Item>
            <Descriptions.Item label="Valor">
              <Text strong style={{ color: '#ff4d4f', fontSize: '16px' }}>
                R$ {selectedPayable.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Data de Vencimento">
              <Space>
                <CalendarOutlined />
                <Text>{format(selectedPayable.dueDate, 'dd/MM/yyyy', { locale: ptBR })}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Categoria">
              <Tag color="blue">{selectedPayable.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedPayable.status)}>
                {getStatusText(selectedPayable.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Prioridade">
              <Tag color={getPriorityColor(selectedPayable.priority)}>
                {selectedPayable.priority}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Responsável">
              <Space>
                <Avatar icon={<UserOutlined />} />
                <Text>{selectedPayable.executive}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Projeto">
              {selectedPayable.project}
            </Descriptions.Item>
            <Descriptions.Item label="Número da Nota">
              <Space>
                <FileTextOutlined />
                <Text>{selectedPayable.invoiceNumber}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Forma de Pagamento">
              <Space>
                {getPaymentMethodIcon(selectedPayable.paymentMethod)}
                <Text>{selectedPayable.paymentMethod}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Observações">
              {selectedPayable.notes}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Modal de Detalhes - Contas a Receber */}
      <Modal
        title="Detalhes da Conta a Receber"
        open={isReceivableModalVisible}
        onCancel={() => setIsReceivableModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsReceivableModalVisible(false)}>
            Fechar
          </Button>,
          <Button key="receive" type="primary" icon={<CheckCircleOutlined />}>
            Marcar como Recebido
          </Button>,
        ]}
        width={700}
      >
        {selectedReceivable && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Descrição">
              {selectedReceivable.description}
            </Descriptions.Item>
            <Descriptions.Item label="Cliente">
              {selectedReceivable.client}
            </Descriptions.Item>
            <Descriptions.Item label="Valor">
              <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                R$ {selectedReceivable.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Data de Vencimento">
              <Space>
                <CalendarOutlined />
                <Text>{format(selectedReceivable.dueDate, 'dd/MM/yyyy', { locale: ptBR })}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Categoria">
              <Tag color="green">{selectedReceivable.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedReceivable.status)}>
                {getStatusText(selectedReceivable.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Prioridade">
              <Tag color={getPriorityColor(selectedReceivable.priority)}>
                {selectedReceivable.priority}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Responsável">
              <Space>
                <Avatar icon={<UserOutlined />} />
                <Text>{selectedReceivable.executive}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Projeto">
              {selectedReceivable.project}
            </Descriptions.Item>
            <Descriptions.Item label="Número da Nota">
              <Space>
                <FileTextOutlined />
                <Text>{selectedReceivable.invoiceNumber}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Forma de Recebimento">
              <Space>
                {getPaymentMethodIcon(selectedReceivable.paymentMethod)}
                <Text>{selectedReceivable.paymentMethod}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Observações">
              {selectedReceivable.notes}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default FinancialPage;
