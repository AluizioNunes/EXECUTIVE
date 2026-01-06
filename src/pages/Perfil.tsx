import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Row, Col, Tag, List, Button, Space, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { userData } from '../data/mockData';
import FuncaoModal from '../components/FuncaoModal';
import { useTenant } from '../contexts/TenantContext';

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

const tenantStorageKey = (tenantId: number | undefined, baseKey: string) =>
  tenantId ? `${tenantId}_${baseKey}` : baseKey;

const migrateToTenantKey = (tenantId: number | undefined, baseKey: string) => {
  if (!tenantId) return;
  try {
    const tenantKey = tenantStorageKey(tenantId, baseKey);
    const tenantRaw = localStorage.getItem(tenantKey);
    if (tenantRaw) return;
    const legacyRaw = localStorage.getItem(baseKey);
    if (!legacyRaw) return;
    localStorage.setItem(tenantKey, legacyRaw);
    localStorage.removeItem(baseKey);
  } catch {}
};

const loadFuncoes = (tenantId: number | undefined): Funcao[] => {
  migrateToTenantKey(tenantId, 'funcoes_list');
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId, 'funcoes_list'));
    if (!raw) return initialFuncoes;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Funcao[]) : initialFuncoes;
  } catch {
    return initialFuncoes;
  }
};

const Perfil: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const [funcoes, setFuncoes] = useState<Funcao[]>(() => loadFuncoes(tenantId));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Funcao | null>(null);

  useEffect(() => {
    setFuncoes(loadFuncoes(tenantId));
    setModalOpen(false);
    setEditing(null);
  }, [tenantId]);

  const persist = (next: Funcao[]) => {
    setFuncoes(next);
    try {
      localStorage.setItem(tenantStorageKey(tenantId, 'funcoes_list'), JSON.stringify(next));
    } catch {}
  };

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
      persist(funcoes.map(f => f.id === editing.id ? { ...(editing as Funcao), ...data, id: editing.id! } : f));
      message.success('Função atualizada com sucesso');
    } else {
      const newId = Math.max(0, ...funcoes.map(f => f.id)) + 1;
      persist([...funcoes, { ...data, id: newId } as Funcao]);
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
        persist(funcoes.filter(f => f.id !== funcao.id));
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

      <Card title="Funções Cadastradas" variant="borderless">
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
