import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Input, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import ListGrid from '../components/ListGrid.tsx';
import ColaboradoresModal from './ColaboradoresModal.tsx';
import { useTenant } from '../contexts/TenantContext';

export type Colaborador = {
  IdColaborador: number;
  Colaborador: string;
  Descricao?: string;
  Funcao: string;
  IdTenant?: number;
  Tenant?: string;
  DataCadastro?: string;
  Cadastrante?: string;
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const endpoint = () => `${apiBaseUrl()}/api/colaboradores`;

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const isExecutiveAuth = () => String(localStorage.getItem('auth_tenant_slug') || '').toLowerCase() === 'executive';

const { Title, Text } = Typography;

const ColaboradoresPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { message, modal } = AntdApp.useApp();

  const [data, setData] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Colaborador | null>(null);

  const tenantQuery =
    isExecutiveAuth() && currentTenant?.id && currentTenant.id !== 0 ? `?tenant_id=${currentTenant.id}` : '';

  const fetchColaboradores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${endpoint()}${tenantQuery}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as Colaborador[];
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
      message.error('Falha ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  }, [message, tenantQuery]);

  useEffect(() => {
    fetchColaboradores();
    setModalOpen(false);
    setEditing(null);
  }, [fetchColaboradores, currentTenant?.id]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((c) => {
      return (
        String(c.IdColaborador).includes(s) ||
        (c.Colaborador || '').toLowerCase().includes(s) ||
        (c.Funcao || '').toLowerCase().includes(s) ||
        (c.Descricao || '').toLowerCase().includes(s) ||
        (c.Tenant || '').toLowerCase().includes(s) ||
        (c.Cadastrante || '').toLowerCase().includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditar = (record: Colaborador) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: Colaborador) => {
    modal.confirm({
      title: 'Excluir colaborador?',
      content: `Confirma excluir o colaborador "${record.Colaborador}"?`,
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const res = await fetch(`${endpoint()}/${record.IdColaborador}${tenantQuery}`, {
            method: 'DELETE',
            headers: authHeaders(),
          });
          if (!res.ok) throw new Error(await res.text());
          message.success('Colaborador excluído');
          fetchColaboradores();
        } catch {
          message.error('Falha ao excluir colaborador');
        }
      },
    });
  };

  const handleSalvar = async (
    values: Omit<Colaborador, 'IdColaborador'> & Partial<Pick<Colaborador, 'IdColaborador'>>
  ) => {
    const payload = {
      Colaborador: String(values.Colaborador ?? ''),
      Funcao: String(values.Funcao ?? ''),
      Descricao: values.Descricao ? String(values.Descricao) : undefined,
    };

    try {
      if (editing?.IdColaborador) {
        const res = await fetch(`${endpoint()}/${editing.IdColaborador}${tenantQuery}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Colaborador atualizado');
      } else {
        const res = await fetch(`${endpoint()}${tenantQuery}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Colaborador criado');
      }

      setModalOpen(false);
      setEditing(null);
      fetchColaboradores();
    } catch {
      message.error('Falha ao salvar colaborador');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>COLABORADORES</Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por id, colaborador, função, descrição, tenant ou cadastrante"
            style={{ width: 560 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchColaboradores} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>
            Novo Colaborador
          </Button>
        </Space>
      </Space>

      <ListGrid<Colaborador>
        rowKey="IdColaborador"
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        loading={loading}
        columns={[
          { title: 'Colaborador', dataIndex: 'Colaborador', key: 'Colaborador', width: 260 },
          { title: 'Função', dataIndex: 'Funcao', key: 'Funcao', width: 220 },
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

      <ColaboradoresModal
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

export default ColaboradoresPage;
