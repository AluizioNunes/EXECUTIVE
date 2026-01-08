import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Input, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTenant } from '../contexts/TenantContext';
import ListGrid from '../components/ListGrid.tsx';
import CentroCustosModal from '../components/CentroCustosModal.tsx';

export type CentroCusto = {
  IdCustos: number;
  CodigoInterno?: string;
  Classe?: string;
  Nome: string;
  Cidade?: string;
  UF?: string;
  Empresa: string;
  Departamento?: string;
  Responsavel?: string;
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const endpoint = () => `${apiBaseUrl()}/api/centro-custos`;

const { Title, Text } = Typography;

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const CentroCustos: React.FC = () => {
  const { currentTenant } = useTenant();
  const empresaNome = currentTenant?.id === 0 ? '' : currentTenant?.name || '';

  const [data, setData] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CentroCusto | null>(null);
  const { message, modal } = AntdApp.useApp();

  const fetchCentroCustos = useCallback(async () => {
    setLoading(true);
    try {
      const url = empresaNome ? `${endpoint()}?empresa=${encodeURIComponent(empresaNome)}` : endpoint();
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as CentroCusto[];
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
      message.error('Falha ao carregar centro de custos');
    } finally {
      setLoading(false);
    }
  }, [empresaNome, message]);

  useEffect(() => {
    fetchCentroCustos();
    setModalOpen(false);
    setEditing(null);
  }, [fetchCentroCustos, currentTenant?.id]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((c) => {
      return (
        String(c.IdCustos).includes(s) ||
        (c.CodigoInterno || '').toLowerCase().includes(s) ||
        (c.Classe || '').toLowerCase().includes(s) ||
        (c.Nome || '').toLowerCase().includes(s) ||
        (c.Cidade || '').toLowerCase().includes(s) ||
        (c.UF || '').toLowerCase().includes(s) ||
        (c.Departamento || '').toLowerCase().includes(s) ||
        (c.Responsavel || '').toLowerCase().includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditar = (record: CentroCusto) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: CentroCusto) => {
    modal.confirm({
      title: 'Excluir Centro de Custos',
      content: `Deseja excluir o centro de custos "${record.Nome}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const res = await fetch(`${endpoint()}/${record.IdCustos}`, { method: 'DELETE', headers: authHeaders() });
          if (!res.ok && res.status !== 204) throw new Error(await res.text());
          message.success('Centro de custos excluído');
          fetchCentroCustos();
        } catch {
          message.error('Falha ao excluir centro de custos');
        }
      },
    });
  };

  const handleSalvar = async (values: Omit<CentroCusto, 'IdCustos'> & Partial<Pick<CentroCusto, 'IdCustos'>>) => {
    const payload: Omit<CentroCusto, 'IdCustos'> = {
      Empresa: String(values.Empresa ?? empresaNome ?? ''),
      Nome: String(values.Nome ?? ''),
      CodigoInterno: values.CodigoInterno ? String(values.CodigoInterno) : undefined,
      Classe: values.Classe ? String(values.Classe) : undefined,
      Cidade: values.Cidade ? String(values.Cidade) : undefined,
      UF: values.UF ? String(values.UF) : undefined,
      Departamento: values.Departamento ? String(values.Departamento) : undefined,
      Responsavel: values.Responsavel ? String(values.Responsavel) : undefined,
    };

    try {
      if (editing?.IdCustos) {
        const res = await fetch(`${endpoint()}/${editing.IdCustos}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Centro de custos atualizado');
      } else {
        const res = await fetch(endpoint(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Centro de custos criado');
      }

      setModalOpen(false);
      setEditing(null);
      fetchCentroCustos();
    } catch {
      message.error('Falha ao salvar centro de custos');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>CENTRO DE CUSTOS</Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por id, nome, código, classe, cidade, UF, departamento ou responsável"
            style={{ width: 560 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchCentroCustos} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>
            Novo Centro de Custos
          </Button>
        </Space>
      </Space>

      <ListGrid<CentroCusto>
        rowKey="IdCustos"
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        loading={loading}
        columns={[
          { title: 'Código', dataIndex: 'CodigoInterno', key: 'CodigoInterno', width: 130, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Nome', dataIndex: 'Nome', key: 'Nome' },
          { title: 'Classe', dataIndex: 'Classe', key: 'Classe', width: 160, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Cidade', dataIndex: 'Cidade', key: 'Cidade', width: 170, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'UF', dataIndex: 'UF', key: 'UF', width: 80, render: (v: string) => <Text>{v || '-'}</Text> },
          { title: 'Departamento', dataIndex: 'Departamento', key: 'Departamento', width: 170, render: (v: string) => <Text>{v || '-'}</Text> },
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

      <CentroCustosModal
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

export default CentroCustos;
