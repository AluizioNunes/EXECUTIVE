import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Input, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import ListGrid from '../components/ListGrid.tsx';
import FuncoesModal from './FuncoesModal.tsx';
import { useTenant } from '../contexts/TenantContext';

export type Funcao = {
  IdFuncao: number;
  Funcao: string;
  Descricao?: string;
  Departamento: string;
  IdTenant?: number;
  Tenant?: string;
  DataCadastro?: string;
  Cadastrante?: string;
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const endpoint = () => `${apiBaseUrl()}/api/funcoes`;

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const isExecutiveAuth = () => String(localStorage.getItem('auth_tenant_slug') || '').toLowerCase() === 'executive';

const { Title, Text } = Typography;

const FuncoesPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { message, modal } = AntdApp.useApp();

  const [data, setData] = useState<Funcao[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Funcao | null>(null);

  const tenantQuery =
    isExecutiveAuth() && currentTenant?.id && currentTenant.id !== 0 ? `?tenant_id=${currentTenant.id}` : '';

  const fetchFuncoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${endpoint()}${tenantQuery}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as Funcao[];
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
      message.error('Falha ao carregar funções');
    } finally {
      setLoading(false);
    }
  }, [message, tenantQuery]);

  useEffect(() => {
    fetchFuncoes();
    setModalOpen(false);
    setEditing(null);
  }, [fetchFuncoes, currentTenant?.id]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((f) => {
      return (
        String(f.IdFuncao).includes(s) ||
        (f.Funcao || '').toLowerCase().includes(s) ||
        (f.Departamento || '').toLowerCase().includes(s) ||
        (f.Descricao || '').toLowerCase().includes(s) ||
        (f.Tenant || '').toLowerCase().includes(s) ||
        (f.Cadastrante || '').toLowerCase().includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditar = (record: Funcao) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: Funcao) => {
    modal.confirm({
      title: 'Excluir função?',
      content: `Confirma excluir a função "${record.Funcao}"?`,
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const res = await fetch(`${endpoint()}/${record.IdFuncao}${tenantQuery}`, {
            method: 'DELETE',
            headers: authHeaders(),
          });
          if (!res.ok) throw new Error(await res.text());
          message.success('Função excluída');
          fetchFuncoes();
        } catch {
          message.error('Falha ao excluir função');
        }
      },
    });
  };

  const handleSalvar = async (values: Omit<Funcao, 'IdFuncao'> & Partial<Pick<Funcao, 'IdFuncao'>>) => {
    const payload = {
      Funcao: String(values.Funcao ?? ''),
      Departamento: String(values.Departamento ?? ''),
      Descricao: values.Descricao ? String(values.Descricao) : undefined,
    };

    try {
      if (editing?.IdFuncao) {
        const res = await fetch(`${endpoint()}/${editing.IdFuncao}${tenantQuery}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Função atualizada');
      } else {
        const res = await fetch(`${endpoint()}${tenantQuery}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Função criada');
      }

      setModalOpen(false);
      setEditing(null);
      fetchFuncoes();
    } catch {
      message.error('Falha ao salvar função');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>FUNÇÕES</Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por id, função, departamento, descrição, tenant ou cadastrante"
            style={{ width: 560 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchFuncoes} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>
            Nova Função
          </Button>
        </Space>
      </Space>

      <ListGrid<Funcao>
        rowKey="IdFuncao"
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        loading={loading}
        columns={[
          { title: 'Função', dataIndex: 'Funcao', key: 'Funcao', width: 220 },
          { title: 'Departamento', dataIndex: 'Departamento', key: 'Departamento', width: 220 },
          { title: 'Descrição', dataIndex: 'Descricao', key: 'Descricao', render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Tenant', dataIndex: 'Tenant', key: 'Tenant', width: 180, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Data Cadastro', dataIndex: 'DataCadastro', key: 'DataCadastro', width: 130, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Cadastrante', dataIndex: 'Cadastrante', key: 'Cadastrante', width: 160, render: (v: string) => <Text>{v || '-'}</Text> },
          {
            title: 'Ações',
            key: 'acoes',
            width: 160,
            render: (_, record) => (
              <Space>
                <Button type="link" icon={<EditOutlined />} onClick={() => handleEditar(record)}>
                  Editar
                </Button>
                <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleExcluir(record)}>
                  Excluir
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <FuncoesModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        initialData={editing || undefined}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSalvar}
      />
    </Space>
  );
};

export default FuncoesPage;
