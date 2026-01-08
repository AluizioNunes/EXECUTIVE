import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Input, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import ListGrid from '../components/ListGrid.tsx';
import TenantsModal from '../components/TenantsModal.tsx';

export type TenantRecord = {
  IdTenant: number;
  Tenant: string;
  Slug: string;
  DataCriacao: string;
  DataUpdate: string;
  Cadastrante?: string;
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const endpoint = () => `${apiBaseUrl()}/api/tenants`;

const { Title, Text } = Typography;

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const errorTextFromBody = (raw: string) => {
  const t = String(raw || '').trim();
  if (!t) return 'Erro inesperado';
  try {
    const parsed = JSON.parse(t) as any;
    const detail = parsed?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    return t;
  } catch {
    return t;
  }
};

const Tenants: React.FC = () => {
  const [data, setData] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TenantRecord | null>(null);
  const { message, modal } = AntdApp.useApp();

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint(), { headers: authHeaders() });
      if (!res.ok) throw new ApiError(res.status, errorTextFromBody(await res.text()));
      const json = (await res.json()) as TenantRecord[];
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      setData([]);
      const status = err instanceof ApiError ? err.status : undefined;
      if (status === 401) {
        localStorage.removeItem('auth_token');
        message.error('Não autorizado. Faça login novamente.');
        return;
      }
      const detail = err instanceof Error ? err.message : 'Falha ao carregar tenants';
      message.error(status ? `Falha ao carregar tenants (${status}): ${detail}` : detail);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchTenants();
    setModalOpen(false);
    setEditing(null);
  }, [fetchTenants]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((t) => {
      return (
        String(t.IdTenant).includes(s) ||
        (t.Tenant || '').toLowerCase().includes(s) ||
        (t.Slug || '').toLowerCase().includes(s) ||
        (t.Cadastrante || '').toLowerCase().includes(s) ||
        (t.DataCriacao || '').toLowerCase().includes(s) ||
        (t.DataUpdate || '').toLowerCase().includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditar = (record: TenantRecord) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: TenantRecord) => {
    modal.confirm({
      title: 'Excluir Tenant',
      content: `Deseja excluir o tenant "${record.Tenant}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const res = await fetch(`${endpoint()}/${record.IdTenant}`, { method: 'DELETE', headers: authHeaders() });
          if (!res.ok && res.status !== 204) throw new ApiError(res.status, errorTextFromBody(await res.text()));
          message.success('Tenant excluído');
          fetchTenants();
        } catch (err) {
          const status = err instanceof ApiError ? err.status : undefined;
          if (status === 401) {
            localStorage.removeItem('auth_token');
            message.error('Não autorizado. Faça login novamente.');
            return;
          }
          const detail = err instanceof Error ? err.message : 'Falha ao excluir tenant';
          message.error(status ? `Falha ao excluir tenant (${status}): ${detail}` : detail);
        }
      },
    });
  };

  const handleSalvar = async (
    values: Pick<TenantRecord, 'Tenant' | 'Slug' | 'Cadastrante'> & Partial<Pick<TenantRecord, 'IdTenant'>>
  ) => {
    const payload = {
      Tenant: String(values.Tenant ?? ''),
      Slug: String(values.Slug ?? ''),
      Cadastrante: values.Cadastrante ? String(values.Cadastrante) : undefined,
    };

    try {
      if (editing?.IdTenant) {
        const res = await fetch(`${endpoint()}/${editing.IdTenant}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new ApiError(res.status, errorTextFromBody(await res.text()));
        message.success('Tenant atualizado');
      } else {
        const res = await fetch(endpoint(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new ApiError(res.status, errorTextFromBody(await res.text()));
        message.success('Tenant criado');
      }

      setModalOpen(false);
      setEditing(null);
      fetchTenants();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      if (status === 401) {
        localStorage.removeItem('auth_token');
        message.error('Não autorizado. Faça login novamente.');
        return;
      }
      const detail = err instanceof Error ? err.message : 'Falha ao salvar tenant';
      message.error(status ? `Falha ao salvar tenant (${status}): ${detail}` : detail);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>TENANTS</Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por id, tenant, slug, datas ou cadastrante"
            style={{ width: 520 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchTenants} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>
            Novo Tenant
          </Button>
        </Space>
      </Space>

      <ListGrid<TenantRecord>
        rowKey="IdTenant"
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        loading={loading}
        columns={[
          { title: 'Tenant', dataIndex: 'Tenant', key: 'Tenant' },
          { title: 'Slug', dataIndex: 'Slug', key: 'Slug', width: 220 },
          { title: 'Criado', dataIndex: 'DataCriacao', key: 'DataCriacao', width: 120, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Atualizado', dataIndex: 'DataUpdate', key: 'DataUpdate', width: 120, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Cadastrante', dataIndex: 'Cadastrante', key: 'Cadastrante', width: 180, render: (v: string) => <Text>{v || '-'}</Text> },
          {
            title: 'Ações',
            key: 'acoes',
            width: 150,
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

      <TenantsModal
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

export default Tenants;
