import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Space, Table, Tooltip, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTenant } from '../contexts/TenantContext';
import ExecutivosModal from './ExecutivosModal';

export type Executivo = {
  IdExecutivo: number;
  Executivo: string;
  Funcao: string;
  Perfil: string;
  Empresa: string;
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://localhost:8000');
};

const endpoint = () => `${apiBaseUrl()}/api/executivos`;

const ExecutivosPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<Executivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Executivo | null>(null);
  const [search, setSearch] = useState('');

  const fetchExecutivos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint(), { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as Executivo[];
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
      message.error('Falha ao carregar executivos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExecutivos();
  }, [fetchExecutivos, currentTenant?.id]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((e) => {
      return (
        (e.Executivo || '').toLowerCase().includes(s) ||
        (e.Funcao || '').toLowerCase().includes(s) ||
        (e.Perfil || '').toLowerCase().includes(s) ||
        (e.Empresa || '').toLowerCase().includes(s) ||
        String(e.IdExecutivo).includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditar = (record: Executivo) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: Executivo) => {
    Modal.confirm({
      title: 'Excluir Executivo',
      content: `Deseja excluir o executivo "${record.Executivo}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const res = await fetch(`${endpoint()}/${record.IdExecutivo}`, { method: 'DELETE' });
          if (!res.ok && res.status !== 204) throw new Error(await res.text());
          message.success('Executivo excluído');
          fetchExecutivos();
        } catch {
          message.error('Falha ao excluir executivo');
        }
      },
    });
  };

  const handleSalvar = async (
    values: Omit<Executivo, 'IdExecutivo'> & Partial<Pick<Executivo, 'IdExecutivo'>>
  ) => {
    const payload = {
      Executivo: String(values.Executivo ?? ''),
      Funcao: String(values.Funcao ?? ''),
      Perfil: String(values.Perfil ?? ''),
      Empresa: String(values.Empresa ?? ''),
    };

    try {
      if (editing?.IdExecutivo) {
        const res = await fetch(`${endpoint()}/${editing.IdExecutivo}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Executivo atualizado');
      } else {
        const res = await fetch(endpoint(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        message.success('Executivo criado');
      }

      setModalOpen(false);
      setEditing(null);
      fetchExecutivos();
    } catch {
      message.error('Falha ao salvar executivo');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <h2>EXECUTIVOS</h2>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por id, executivo, função, perfil ou empresa"
            style={{ width: 460 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tooltip title="Recarregar">
            <Button icon={<ReloadOutlined />} onClick={fetchExecutivos} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>
            Novo Executivo
          </Button>
        </Space>
      </Space>

      <Card variant="borderless">
        <Table<Executivo>
          rowKey="IdExecutivo"
          loading={loading}
          dataSource={filtered}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'IdExecutivo', dataIndex: 'IdExecutivo', key: 'IdExecutivo', width: 120 },
            { title: 'Executivo', dataIndex: 'Executivo', key: 'Executivo' },
            { title: 'Funcao', dataIndex: 'Funcao', key: 'Funcao' },
            { title: 'Perfil', dataIndex: 'Perfil', key: 'Perfil' },
            { title: 'Empresa', dataIndex: 'Empresa', key: 'Empresa' },
            {
              title: 'Ações',
              key: 'acoes',
              width: 120,
              render: (_, record) => (
                <Space>
                  <Tooltip title="Editar">
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEditar(record)} />
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleExcluir(record)} />
                  </Tooltip>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <ExecutivosModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        initialData={editing || undefined}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={(values) => handleSalvar(values)}
      />
    </Space>
  );
};

export default ExecutivosPage;
