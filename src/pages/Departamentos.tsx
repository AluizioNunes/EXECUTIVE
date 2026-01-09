import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Input, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import ListGrid from '../components/ListGrid.tsx';
import DepartamentosModal from './DepartamentosModal.tsx';
import { useTenant } from '../contexts/TenantContext';

export type Departamento = {
  IdDepartamento: number;
  Departamento: string;
  Descricao?: string;
  IdTenant?: number;
  Tenant?: string;
  DataCadastro?: string;
  Cadastrante?: string;
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const endpoint = () => `${apiBaseUrl()}/api/departamentos`;

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const isExecutiveAuth = () => String(localStorage.getItem('auth_tenant_slug') || '').toLowerCase() === 'executive';

const { Title, Text } = Typography;

const DepartamentosPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { message, modal } = AntdApp.useApp();

  const [data, setData] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Departamento | null>(null);

  const tenantQuery =
    isExecutiveAuth() && currentTenant?.id && currentTenant.id !== 0 ? `?tenant_id=${currentTenant.id}` : '';

  const fetchDepartamentos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${endpoint()}${tenantQuery}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as Departamento[];
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
      message.error('Falha ao carregar departamentos');
    } finally {
      setLoading(false);
    }
  }, [message, tenantQuery]);

  useEffect(() => {
    fetchDepartamentos();
    setModalOpen(false);
    setEditing(null);
  }, [fetchDepartamentos, currentTenant?.id]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((d) => {
      return (
        String(d.IdDepartamento).includes(s) ||
        (d.Departamento || '').toLowerCase().includes(s) ||
        (d.Descricao || '').toLowerCase().includes(s) ||
        (d.Tenant || '').toLowerCase().includes(s) ||
        (d.Cadastrante || '').toLowerCase().includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditar = (record: Departamento) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: Departamento) => {
    modal.confirm({
      title: 'Excluir departamento?',
      content: `Confirma excluir o departamento "${record.Departamento}"?`,
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const res = await fetch(`${endpoint()}/${record.IdDepartamento}${tenantQuery}`, {
            method: 'DELETE',
            headers: authHeaders(),
          });
          if (!res.ok) throw new Error(await res.text());
          message.success('Departamento excluído');
          fetchDepartamentos();
        } catch {
          message.error('Falha ao excluir departamento');
        }
      },
    });
  };

  const handleSalvar = async (
    values: Omit<Departamento, 'IdDepartamento'> & Partial<Pick<Departamento, 'IdDepartamento'>>
  ) => {
    const payload = {
      Departamento: String(values.Departamento ?? ''),
      Descricao: values.Descricao ? String(values.Descricao) : undefined,
    };

    try {
      if (editing?.IdDepartamento) {
        const res = await fetch(`${endpoint()}/${editing.IdDepartamento}${tenantQuery}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Departamento atualizado');
      } else {
        const res = await fetch(`${endpoint()}${tenantQuery}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Departamento criado');
      }

      setModalOpen(false);
      setEditing(null);
      fetchDepartamentos();
    } catch {
      message.error('Falha ao salvar departamento');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>DEPARTAMENTOS</Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por id, departamento, descrição, tenant ou cadastrante"
            style={{ width: 520 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchDepartamentos} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>
            Novo Departamento
          </Button>
        </Space>
      </Space>

      <ListGrid<Departamento>
        rowKey="IdDepartamento"
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        loading={loading}
        columns={[
          { title: 'Departamento', dataIndex: 'Departamento', key: 'Departamento', width: 240 },
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

      <DepartamentosModal
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

export default DepartamentosPage;
