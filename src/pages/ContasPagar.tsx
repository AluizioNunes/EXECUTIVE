import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Space, Tag, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, ReloadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTenant } from '../contexts/TenantContext';
import ListGrid from '../components/ListGrid.tsx';
import ContasPagarModal from '../components/ContasPagarModal.tsx';

export type ContaPagar = {
  IdContasPagar: number;
  Descricao: string;
  TipoCobranca?: string;
  IdCobranca?: string;
  TagCobranca?: string;
  Credor?: string;
  TipoCredor?: string;
  ValorOriginal?: number;
  TipoPagamento?: string;
  Parcelas?: number;
  Desconto?: number;
  Acrescimo?: number;
  ValorFinal?: number;
  DevedorIdExecutivo?: number;
  Devedor?: string;
  StatusPagamento?: string;
  StatusCobranca?: string;
  Vencimento?: string;
  DocumentoPath?: string;
  URLCobranca?: string;
  Usuario?: string;
  Senha?: string;
  Empresa?: string;
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://localhost:8000');
};

const endpoint = () => `${apiBaseUrl()}/api/contas-pagar`;

const { Title, Text } = Typography;

const statusPagamentoColor = (value?: string) => {
  const v = (value || '').toUpperCase();
  if (v === 'PAGO') return 'green';
  if (v.includes('PARCIAL')) return 'gold';
  return 'red';
};

const ContasPagar: React.FC = () => {
  const { currentTenant } = useTenant();
  const empresaNome = currentTenant?.name || '';

  const [data, setData] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContaPagar | null>(null);

  const fetchContasPagar = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${endpoint()}?empresa=${encodeURIComponent(empresaNome)}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ContaPagar[];
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
      message.error('Falha ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  }, [empresaNome]);

  useEffect(() => {
    fetchContasPagar();
    setModalOpen(false);
    setEditing(null);
  }, [fetchContasPagar, currentTenant?.id]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((c) => {
      return (
        (c.Descricao || '').toLowerCase().includes(s) ||
        (c.Credor || '').toLowerCase().includes(s) ||
        (c.Devedor || '').toLowerCase().includes(s) ||
        (c.StatusPagamento || '').toLowerCase().includes(s) ||
        String(c.ValorFinal ?? c.ValorOriginal ?? '').includes(s) ||
        String(c.IdContasPagar).includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditar = (record: ContaPagar) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: ContaPagar) => {
    const id = record.IdContasPagar;
    (async () => {
      try {
        const res = await fetch(`${endpoint()}/${id}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 204) throw new Error(await res.text());
        message.success('Conta a pagar excluída');
        fetchContasPagar();
      } catch {
        message.error('Falha ao excluir conta a pagar');
      }
    })();
  };

  const handleSalvar = async (
    values: Omit<ContaPagar, 'IdContasPagar'> &
      Partial<Pick<ContaPagar, 'IdContasPagar'>> & { documentoFile?: File | null }
  ) => {
    const payload: any = { ...values };
    delete payload.documentoFile;
    payload.Empresa = payload.Empresa || empresaNome;

    try {
      let saved: ContaPagar;
      if (editing?.IdContasPagar) {
        const res = await fetch(`${endpoint()}/${editing.IdContasPagar}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        saved = (await res.json()) as ContaPagar;
      } else {
        const res = await fetch(endpoint(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        saved = (await res.json()) as ContaPagar;
      }

      if (values.documentoFile) {
        const formData = new FormData();
        formData.append('file', values.documentoFile);
        const res = await fetch(`${endpoint()}/${saved.IdContasPagar}/documento`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error(await res.text());
      }

      message.success(editing ? 'Conta a pagar atualizada' : 'Conta a pagar criada');
      setModalOpen(false);
      setEditing(null);
      fetchContasPagar();
    } catch {
      message.error('Falha ao salvar conta a pagar');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>CONTAS A PAGAR</Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por descrição, credor, devedor, status ou valor"
            style={{ width: 420 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchContasPagar} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>
            Nova Conta a Pagar
          </Button>
        </Space>
      </Space>

      <ListGrid<ContaPagar>
        rowKey="IdContasPagar"
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        loading={loading}
        columns={[
          { title: 'Descrição', dataIndex: 'Descricao', key: 'Descricao' },
          { title: 'Credor', dataIndex: 'Credor', key: 'Credor', width: 220 },
          {
            title: 'Valor Final',
            dataIndex: 'ValorFinal',
            key: 'ValorFinal',
            render: (v: number) => (
              <Text>{Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
            ),
            width: 140,
          },
          {
            title: 'Vencimento',
            dataIndex: 'Vencimento',
            key: 'Vencimento',
            render: (d: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-'),
            width: 130,
          },
          {
            title: 'Devedor',
            dataIndex: 'Devedor',
            key: 'Devedor',
            width: 220,
          },
          {
            title: 'Status Pgto',
            dataIndex: 'StatusPagamento',
            key: 'StatusPagamento',
            width: 110,
            render: (s: string) => <Tag color={statusPagamentoColor(s)}>{s || '-'}</Tag>,
          },
          {
            title: 'Documento',
            key: 'Documento',
            width: 140,
            render: (_, record) =>
              record.DocumentoPath ? (
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(`${apiBaseUrl()}/api/contas-pagar/${record.IdContasPagar}/documento`, '_blank')}
                >
                  Baixar
                </Button>
              ) : (
                <Text>-</Text>
              ),
          },
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

      <ContasPagarModal
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

export default ContasPagar;
