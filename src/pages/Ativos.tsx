import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Input, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTenant } from '../contexts/TenantContext';
import ListGrid from '../components/ListGrid.tsx';
import AtivosModal from '../components/AtivosModal.tsx';

export type Ativo = {
  IdAtivo: number;
  Ativo: string;
  CodigoInternoAtivo?: string;
  Placa?: string;
  Cidade?: string;
  UF?: string;
  CentroCusto?: string;
  Proprietario?: string;
  Responsavel?: string;
  Atribuido?: string;
  Empresa?: string;
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const endpoint = () => `${apiBaseUrl()}/api/ativos`;

const { Title, Text } = Typography;

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const Ativos: React.FC = () => {
  const { currentTenant } = useTenant();
  const empresaNome = currentTenant?.id === 0 ? '' : currentTenant?.name || '';

  const [data, setData] = useState<Ativo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ativo | null>(null);
  const { message, modal } = AntdApp.useApp();

  const fetchAtivos = useCallback(async () => {
    setLoading(true);
    try {
      const url = empresaNome ? `${endpoint()}?empresa=${encodeURIComponent(empresaNome)}` : endpoint();
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as Ativo[];
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
      message.error('Falha ao carregar ativos');
    } finally {
      setLoading(false);
    }
  }, [empresaNome, message]);

  useEffect(() => {
    fetchAtivos();
    setModalOpen(false);
    setEditing(null);
  }, [fetchAtivos, currentTenant?.id]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((a) => {
      return (
        String(a.IdAtivo).includes(s) ||
        (a.Ativo || '').toLowerCase().includes(s) ||
        (a.CodigoInternoAtivo || '').toLowerCase().includes(s) ||
        (a.Placa || '').toLowerCase().includes(s) ||
        (a.Cidade || '').toLowerCase().includes(s) ||
        (a.UF || '').toLowerCase().includes(s) ||
        (a.CentroCusto || '').toLowerCase().includes(s) ||
        (a.Proprietario || '').toLowerCase().includes(s) ||
        (a.Responsavel || '').toLowerCase().includes(s) ||
        (a.Atribuido || '').toLowerCase().includes(s) ||
        (a.Empresa || '').toLowerCase().includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditar = (record: Ativo) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: Ativo) => {
    modal.confirm({
      title: 'Excluir Ativo',
      content: `Deseja excluir o ativo "${record.Ativo}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const res = await fetch(`${endpoint()}/${record.IdAtivo}`, { method: 'DELETE', headers: authHeaders() });
          if (!res.ok && res.status !== 204) throw new Error(await res.text());
          message.success('Ativo excluído');
          fetchAtivos();
        } catch {
          message.error('Falha ao excluir ativo');
        }
      },
    });
  };

  const handleSalvar = async (values: Omit<Ativo, 'IdAtivo'> & Partial<Pick<Ativo, 'IdAtivo'>>) => {
    const payload: Omit<Ativo, 'IdAtivo'> = {
      Empresa: String(values.Empresa ?? empresaNome ?? ''),
      Ativo: String(values.Ativo ?? ''),
      CodigoInternoAtivo: values.CodigoInternoAtivo ? String(values.CodigoInternoAtivo) : undefined,
      Placa: values.Placa ? String(values.Placa) : undefined,
      Cidade: values.Cidade ? String(values.Cidade) : undefined,
      UF: values.UF ? String(values.UF) : undefined,
      CentroCusto: values.CentroCusto ? String(values.CentroCusto) : undefined,
      Proprietario: values.Proprietario ? String(values.Proprietario) : undefined,
      Responsavel: values.Responsavel ? String(values.Responsavel) : undefined,
      Atribuido: values.Atribuido ? String(values.Atribuido) : undefined,
    };

    try {
      if (editing?.IdAtivo) {
        const res = await fetch(`${endpoint()}/${editing.IdAtivo}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Ativo atualizado');
      } else {
        const res = await fetch(endpoint(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Ativo criado');
      }

      setModalOpen(false);
      setEditing(null);
      fetchAtivos();
    } catch {
      message.error('Falha ao salvar ativo');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>ATIVOS</Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por id, ativo, código, placa, cidade, UF, centro de custo ou responsáveis"
            style={{ width: 520 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchAtivos} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>
            Novo Ativo
          </Button>
        </Space>
      </Space>

      <ListGrid<Ativo>
        rowKey="IdAtivo"
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        loading={loading}
        columns={[
          { title: 'Ativo', dataIndex: 'Ativo', key: 'Ativo' },
          { title: 'Código', dataIndex: 'CodigoInternoAtivo', key: 'CodigoInternoAtivo', width: 140, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Placa', dataIndex: 'Placa', key: 'Placa', width: 120, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Cidade', dataIndex: 'Cidade', key: 'Cidade', width: 170, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'UF', dataIndex: 'UF', key: 'UF', width: 80, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Centro Custo', dataIndex: 'CentroCusto', key: 'CentroCusto', width: 160, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Responsável', dataIndex: 'Responsavel', key: 'Responsavel', width: 180, render: (v: string) => <Text>{v || '-'}</Text> },
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

      <AtivosModal
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

export default Ativos;
