import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Input, Space, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import UsuarioModal from '../components/UsuarioModal';
import { useTenant } from '../contexts/TenantContext';
import ListGrid from '../components/ListGrid.tsx';

export type Usuario = {
  IdUsuarios: number;
  Usuario: string;
  TenantId: number;
  Role: string;
  Nome?: string | null;
  Funcao?: string | null;
  Perfil?: string | null;
  Permissao?: string | null;
  Celular?: string | null;
  Email?: string | null;
  Ativo: number;
};

type UsuarioFormValues = {
  Usuario: string;
  Senha?: string;
  TenantId?: number;
  Role?: string;
  Nome?: string;
  Funcao?: string;
  Perfil?: string;
  Permissao?: string;
  Celular?: string;
  Email?: string;
  Ativo?: number;
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const endpoint = () => `${apiBaseUrl()}/api/usuarios`;

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const { Title, Text } = Typography;

const UsuarioPage: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const { currentTenant } = useTenant();

  const [data, setData] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint(), { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as Usuario[];
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
      message.error('Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchUsuarios();
    setModalOpen(false);
    setEditing(null);
  }, [fetchUsuarios, currentTenant?.id]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((u) => {
      return (
        String(u.IdUsuarios).includes(s) ||
        (u.Usuario || '').toLowerCase().includes(s) ||
        (u.Nome || '').toLowerCase().includes(s) ||
        (u.Email || '').toLowerCase().includes(s) ||
        (u.Celular || '').toLowerCase().includes(s) ||
        (u.Funcao || '').toLowerCase().includes(s) ||
        (u.Perfil || '').toLowerCase().includes(s) ||
        (u.Permissao || '').toLowerCase().includes(s) ||
        (u.Role || '').toLowerCase().includes(s) ||
        String(u.TenantId || '').includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => { setEditing(null); setModalOpen(true); };

  const handleSalvar = async (values: UsuarioFormValues) => {
    try {
      const payload: UsuarioFormValues = {
        Usuario: String(values.Usuario ?? ''),
        Nome: values.Nome ? String(values.Nome) : undefined,
        Email: values.Email ? String(values.Email) : undefined,
        Celular: values.Celular ? String(values.Celular) : undefined,
        Funcao: values.Funcao ? String(values.Funcao) : undefined,
        Perfil: values.Perfil ? String(values.Perfil) : undefined,
        Permissao: values.Permissao ? String(values.Permissao) : undefined,
        Role: values.Role ? String(values.Role) : undefined,
        Ativo: Number.isFinite(Number(values.Ativo)) ? Number(values.Ativo) : undefined,
        TenantId: Number.isFinite(Number(values.TenantId)) ? Number(values.TenantId) : undefined,
        Senha: values.Senha ? String(values.Senha) : undefined,
      };

      if (editing?.IdUsuarios) {
        if (!payload.Senha) delete payload.Senha;
        if (!payload.Role) delete payload.Role;
        if (!payload.Nome) delete payload.Nome;
        if (payload.TenantId === undefined) delete payload.TenantId;
        const res = await fetch(`${endpoint()}/${editing.IdUsuarios}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Usuário atualizado');
      } else {
        const res = await fetch(endpoint(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Usuário criado');
      }

      setModalOpen(false);
      setEditing(null);
      fetchUsuarios();
    } catch {
      message.error('Falha ao salvar usuário');
    }
  };

  const handleEditar = (record: Usuario) => { setEditing(record); setModalOpen(true); };

  const handleExcluir = (record: Usuario) => {
    modal.confirm({
      title: 'Excluir Usuário',
      content: `Deseja excluir o usuário "${record.Usuario}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const res = await fetch(`${endpoint()}/${record.IdUsuarios}`, { method: 'DELETE', headers: authHeaders() });
          if (!res.ok && res.status !== 204) throw new Error(await res.text());
          message.success('Usuário excluído');
          fetchUsuarios();
        } catch {
          message.error('Falha ao excluir usuário');
        }
      },
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>USUÁRIOS</Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por id, usuário, email, celular, função, perfil, permissão, role ou tenant"
            style={{ width: 560 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchUsuarios} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>Novo Usuário</Button>
        </Space>
      </Space>

      <ListGrid<Usuario>
        rowKey="IdUsuarios"
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        loading={loading}
        columns={[
          { title: 'Usuário', dataIndex: 'Usuario', key: 'Usuario' },
          { title: 'Nome', dataIndex: 'Nome', key: 'Nome', width: 220, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'E-mail', dataIndex: 'Email', key: 'Email', width: 220, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Celular', dataIndex: 'Celular', key: 'Celular', width: 140, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Função', dataIndex: 'Funcao', key: 'Funcao', width: 160, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Perfil', dataIndex: 'Perfil', key: 'Perfil', width: 160, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Permissão', dataIndex: 'Permissao', key: 'Permissao', width: 180, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Role', dataIndex: 'Role', key: 'Role', width: 120, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Tenant', dataIndex: 'TenantId', key: 'TenantId', width: 90, render: (v: number) => <Text>{Number.isFinite(Number(v)) ? String(v) : '-'}</Text> },
          { title: 'Status', dataIndex: 'Ativo', key: 'Ativo', width: 90, render: (ativo: number) => <Tag color={Number(ativo) === 1 ? 'green' : 'red'}>{Number(ativo) === 1 ? 'Ativo' : 'Inativo'}</Tag> },
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

      <UsuarioModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        initialData={editing || undefined}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onSave={(values) => handleSalvar(values as any)}
      />
    </Space>
  );
};

export default UsuarioPage;
