import React, { useMemo, useState } from 'react';
import { Card, Typography, Row, Col, Tag, List, Button, Space, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { userData } from '../data/mockData';
import FuncaoModal from '../components/FuncaoModal';

const { Title, Text } = Typography;

export type Funcao = {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  permissoes: string[];
};

const initialFuncoes: Funcao[] = [
  { id: 1, nome: 'Administrador', descricao: 'Acesso total ao sistema', ativo: true, permissoes: ['admin'] },
  { id: 2, nome: 'Gestor Financeiro', descricao: 'Gestão de contas e relatórios', ativo: true, permissoes: ['financial'] },
  { id: 3, nome: 'Gerente de Projetos', descricao: 'Planejamento e execução de projetos', ativo: true, permissoes: ['projects'] },
  { id: 4, nome: 'Analista de Tarefas', descricao: 'Gestão de tarefas executivas', ativo: false, permissoes: ['tasks'] },
];

const Perfil: React.FC = () => {
  const [funcoes, setFuncoes] = useState<Funcao[]>(initialFuncoes);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Funcao | null>(null);

  const stats = useMemo(() => {
    const total = funcoes.length;
    const ativos = funcoes.filter(f => f.ativo).length;
    const inativos = total - ativos;
    return { total, ativos, inativos };
  }, [funcoes]);

  const handleNovaFuncao = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleSalvar = (data: Omit<Funcao, 'id'> & Partial<Pick<Funcao, 'id'>>) => {
    if (editing) {
      setFuncoes(prev => prev.map(f => f.id === editing.id ? { ...(editing as Funcao), ...data, id: editing.id! } : f));
      message.success('Função atualizada com sucesso');
    } else {
      const newId = Math.max(0, ...funcoes.map(f => f.id)) + 1;
      setFuncoes(prev => [...prev, { ...data, id: newId } as Funcao]);
      message.success('Função criada com sucesso');
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleEditar = (funcao: Funcao) => {
    setEditing(funcao);
    setModalOpen(true);
  };

  const handleExcluir = (funcao: Funcao) => {
    Modal.confirm({
      title: 'Excluir função',
      content: `Deseja realmente excluir a função "${funcao.nome}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        setFuncoes(prev => prev.filter(f => f.id !== funcao.id));
        message.success('Função excluída');
      }
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>PERFIL</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleNovaFuncao}>
          Nova Função
        </Button>
      </Space>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card>
            <Title level={4}>Total de Funções</Title>
            <Text>{stats.total}</Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Title level={4}>Ativas</Title>
            <Tag color="green" style={{ marginBottom: 8 }}>Ativo</Tag>
            <Text>{stats.ativos}</Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Title level={4}>Inativas</Title>
            <Tag color="red" style={{ marginBottom: 8 }}>Inativo</Tag>
            <Text>{stats.inativos}</Text>
          </Card>
        </Col>
      </Row>

      <Card title="Funções Cadastradas" bordered={false}>
        <List
          grid={{ gutter: 16, column: 3 }}
          dataSource={funcoes}
          renderItem={(item) => (
            <List.Item>
              <Card
                title={item.nome}
                actions={[
                  <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => handleEditar(item)}>Editar</Button>,
                  <Button key="delete" type="link" danger icon={<DeleteOutlined />} onClick={() => handleExcluir(item)}>Excluir</Button>
                ]}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text type="secondary">{item.descricao}</Text>
                  <Space wrap>
                    {item.permissoes.map(p => (
                      <Tag key={p} color="blue">{p}</Tag>
                    ))}
                  </Space>
                  <Tag color={item.ativo ? 'green' : 'red'}>{item.ativo ? 'Ativo' : 'Inativo'}</Tag>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Card>

      <FuncaoModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        initialData={editing || undefined}
        permissionOptions={userData.permissions}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onSave={(data) => handleSalvar(data)}
      />
    </Space>
  );
};

export default Perfil;