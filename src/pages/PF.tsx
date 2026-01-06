import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import PFModal from '../components/PFModal';
import { useTenant } from '../contexts/TenantContext';

export type PessoaFisica = {
  id: number;
  nomeCompleto: string;
  cpf: string;
  email: string;
  telefone?: string;
  empresaId: number;
  ativo: boolean;
};

const initialPFs: PessoaFisica[] = [
  { id: 1, nomeCompleto: 'João Pereira', cpf: '12345678901', email: 'joao.pereira@empresa.com', telefone: '(11) 99999-0001', empresaId: 1, ativo: true },
  { id: 2, nomeCompleto: 'Ana Costa', cpf: '98765432100', email: 'ana.costa@empresa.com', telefone: '(11) 99999-0002', empresaId: 1, ativo: true },
  { id: 3, nomeCompleto: 'Carlos Lima', cpf: '11122233344', email: 'carlos.lima@empresa.com', telefone: '(11) 99999-0003', empresaId: 1, ativo: false },
];

const onlyDigits = (s: string) => s.replace(/\D/g, '');
const formatCPF = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
};

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

const normalizePFList = (tenantId: number | undefined, list: any[]): PessoaFisica[] => {
  const empresaFallback = Number.isFinite(Number(tenantId)) ? Number(tenantId) : 0;
  return list
    .filter((p) => p && Number.isFinite(Number(p.id)))
    .map((p) => {
      const empresaId =
        Number.isFinite(Number(p.empresaId))
          ? Number(p.empresaId)
          : Array.isArray(p.empresaIds) && p.empresaIds.length > 0 && Number.isFinite(Number(p.empresaIds[0]))
            ? Number(p.empresaIds[0])
            : empresaFallback;
      return {
        id: Number(p.id),
        nomeCompleto: String(p.nomeCompleto ?? ''),
        cpf: String(p.cpf ?? ''),
        email: String(p.email ?? ''),
        telefone: p.telefone ? String(p.telefone) : undefined,
        empresaId,
        ativo: Boolean(p.ativo),
      };
    });
};

const loadPF = (tenantId: number | undefined): PessoaFisica[] => {
  migrateToTenantKey(tenantId, 'pf_list');
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId, 'pf_list'));
    if (!raw) return initialPFs.map((p) => ({ ...p, empresaId: Number(tenantId ?? p.empresaId) }));
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizePFList(tenantId, parsed) : [];
  } catch {
    return initialPFs;
  }
};

const empresaLabelMap = (): Record<number, string> => {
  try {
    const raw = localStorage.getItem('empresas_list');
    const list = raw ? JSON.parse(raw) : [];
    const map: Record<number, string> = {};
    list.forEach((empresa: any) => {
      map[Number(empresa.IdEmpresas)] = empresa.NomeFantasia || empresa.RazaoSocial;
    });
    return map;
  } catch {
    return {};
  }
};

const PF: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const [data, setData] = useState<PessoaFisica[]>(() => loadPF(tenantId));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PessoaFisica | null>(null);
  const [search, setSearch] = useState('');

  const [empresaMap, setEmpresaMap] = useState<Record<number, string>>(() => empresaLabelMap());

  useEffect(() => {
    setEmpresaMap(empresaLabelMap());
  }, [modalOpen, tenantId]);

  useEffect(() => {
    setData(loadPF(tenantId));
    setEditing(null);
    setModalOpen(false);
  }, [tenantId]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(p => {
      const matchesText = p.nomeCompleto.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || onlyDigits(p.cpf).includes(onlyDigits(s));
      const matchesEmpresa = (empresaMap[p.empresaId] ?? '').toLowerCase().includes(s);
      return matchesText || matchesEmpresa;
    });
  }, [data, search, empresaMap]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleSalvar = (values: Omit<PessoaFisica, 'id'> & Partial<Pick<PessoaFisica, 'id'>>) => {
    const empresaId = Number(tenantId ?? values.empresaId);
    let newData: PessoaFisica[];
    if (editing) {
      newData = data.map(p => p.id === editing.id ? { ...(editing as PessoaFisica), ...values, empresaId, id: editing.id } : p);
      message.success('PF atualizada com sucesso');
    } else {
      const newId = Math.max(0, ...data.map(p => p.id)) + 1;
      newData = [...data, { ...values, empresaId, id: newId } as PessoaFisica];
      message.success('PF criada com sucesso');
    }
    setData(newData);
    try { localStorage.setItem(tenantStorageKey(tenantId, 'pf_list'), JSON.stringify(newData)); } catch {}
    setModalOpen(false);
    setEditing(null);
  };

  const handleEditar = (record: PessoaFisica) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: PessoaFisica) => {
    Modal.confirm({
      title: 'Excluir PF',
      content: `Deseja excluir a PF "${record.nomeCompleto}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        const newData = data.filter(p => p.id !== record.id);
        setData(newData);
        try { localStorage.setItem(tenantStorageKey(tenantId, 'pf_list'), JSON.stringify(newData)); } catch {}
        message.success('PF excluída');
      }
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <h2>PF - Pessoa Física</h2>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por nome, e-mail, CPF ou empresa"
            style={{ width: 360 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>Nova PF</Button>
        </Space>
      </Space>

      <Card variant="borderless">
        <Table<PessoaFisica>
          rowKey="id"
          dataSource={filteredData}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Nome Completo', dataIndex: 'nomeCompleto', key: 'nomeCompleto' },
            { title: 'CPF', dataIndex: 'cpf', key: 'cpf', render: (cpf: string) => formatCPF(cpf) },
            { title: 'E-mail', dataIndex: 'email', key: 'email' },
            { title: 'Telefone', dataIndex: 'telefone', key: 'telefone' },
            { title: 'Empresas', key: 'empresas', render: (_, r) => (
              <Space size={4} wrap>
                <Tag>{empresaMap[r.empresaId] ?? r.empresaId}</Tag>
              </Space>
            ) },
            {
              title: 'Status',
              dataIndex: 'ativo',
              key: 'ativo',
              render: (ativo: boolean) => <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
            },
            {
              title: 'Ações',
              key: 'acoes',
              render: (_, record) => (
                <Space>
                  <Button type="link" icon={<EditOutlined />} onClick={() => handleEditar(record)}>Editar</Button>
                  <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleExcluir(record)}>Excluir</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>

      <PFModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        initialData={editing || undefined}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onSave={(values) => handleSalvar(values)}
      />
    </Space>
  );
};

export default PF;
