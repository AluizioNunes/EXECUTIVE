import React, { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Card, Table, Button, Space, Tag, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import PJModal from '../components/PJModal';
import { useTenant } from '../contexts/TenantContext';

export type PessoaJuridica = {
  id: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  email: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  empresaId: number;
  ativo: boolean;
};

const initialPJs: PessoaJuridica[] = [
  { id: 1, razaoSocial: 'Alfa Consultoria Ltda', nomeFantasia: 'Alfa', cnpj: '12345678000199', email: 'contato@alfaconsultoria.com', telefone: '(11) 99999-1001', ativo: true, inscricaoEstadual: '123.456.789.000', endereco: 'Av. Paulista, 1000', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil', empresaId: 1 },
  { id: 2, razaoSocial: 'Beta Tech S/A', nomeFantasia: 'Beta Tech', cnpj: '98765432000155', email: 'ti@betatech.com', telefone: '(11) 99999-1002', ativo: true, endereco: 'Rua das Flores, 200', cidade: 'Campinas', estado: 'SP', pais: 'Brasil', empresaId: 1 },
  { id: 3, razaoSocial: 'Gamma Serviços ME', nomeFantasia: 'Gamma', cnpj: '11122233000177', email: 'financeiro@gammaservicos.com', telefone: '(11) 99999-1003', ativo: false, endereco: 'Rua A, 50', cidade: 'Curitiba', estado: 'PR', pais: 'Brasil', empresaId: 1 },
];

const onlyDigits = (s: string) => s.replace(/\D/g, '');
const formatCNPJ = (s: string) => {
  const d = onlyDigits(s).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
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

const normalizePJList = (tenantId: number | undefined, list: any[]): PessoaJuridica[] => {
  const empresaFallback = Number.isFinite(Number(tenantId)) ? Number(tenantId) : 0;
  return list
    .filter((p) => p && Number.isFinite(Number(p.id)))
    .map((p) => ({
      id: Number(p.id),
      razaoSocial: String(p.razaoSocial ?? ''),
      nomeFantasia: p.nomeFantasia ? String(p.nomeFantasia) : undefined,
      cnpj: String(p.cnpj ?? ''),
      inscricaoEstadual: p.inscricaoEstadual ? String(p.inscricaoEstadual) : undefined,
      email: String(p.email ?? ''),
      telefone: p.telefone ? String(p.telefone) : undefined,
      endereco: p.endereco ? String(p.endereco) : undefined,
      cidade: p.cidade ? String(p.cidade) : undefined,
      estado: p.estado ? String(p.estado) : undefined,
      pais: p.pais ? String(p.pais) : undefined,
      empresaId: Number.isFinite(Number(p.empresaId)) ? Number(p.empresaId) : empresaFallback,
      ativo: Boolean(p.ativo),
    }));
};

const loadPJ = (tenantId: number | undefined): PessoaJuridica[] => {
  migrateToTenantKey(tenantId, 'pj_list');
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId, 'pj_list'));
    if (!raw) return initialPJs.map((p) => ({ ...p, empresaId: Number(tenantId ?? p.empresaId) }));
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizePJList(tenantId, parsed) : [];
  } catch {
    return initialPJs;
  }
};

const PessoaJuridicaPage: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const [data, setData] = useState<PessoaJuridica[]>(() => loadPJ(tenantId));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PessoaJuridica | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setData(loadPJ(tenantId));
    setEditing(null);
    setModalOpen(false);
  }, [tenantId]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(p =>
      p.razaoSocial.toLowerCase().includes(s) ||
      (p.nomeFantasia ?? '').toLowerCase().includes(s) ||
      p.email.toLowerCase().includes(s) ||
      onlyDigits(p.cnpj).includes(onlyDigits(s)) ||
      (p.cidade ?? '').toLowerCase().includes(s) ||
      (p.estado ?? '').toLowerCase().includes(s) ||
      (p.pais ?? '').toLowerCase().includes(s)
    );
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleSalvar = (values: Omit<PessoaJuridica, 'id'> & Partial<Pick<PessoaJuridica, 'id'>>) => {
    const empresaId = Number(tenantId ?? values.empresaId);
    let newData: PessoaJuridica[];
    if (editing) {
      newData = data.map(p => p.id === editing.id ? { ...(editing as PessoaJuridica), ...values, empresaId, id: editing.id } : p);
      message.success('PJ atualizada com sucesso');
    } else {
      const newId = Math.max(0, ...data.map(p => p.id)) + 1;
      newData = [...data, { ...values, empresaId, id: newId } as PessoaJuridica];
      message.success('PJ criada com sucesso');
    }
    setData(newData);
    try { localStorage.setItem(tenantStorageKey(tenantId, 'pj_list'), JSON.stringify(newData)); } catch {}
    setModalOpen(false);
    setEditing(null);
  };

  const handleEditar = (record: PessoaJuridica) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: PessoaJuridica) => {
    modal.confirm({
      title: 'Excluir PJ',
      content: `Deseja excluir a PJ "${record.razaoSocial}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        const newData = data.filter(p => p.id !== record.id);
        setData(newData);
        try { localStorage.setItem(tenantStorageKey(tenantId, 'pj_list'), JSON.stringify(newData)); } catch {}
        message.success('PJ excluída');
      }
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <h2>PJ - Pessoa Jurídica</h2>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por razão social, fantasia, e-mail, CNPJ ou localização"
            style={{ width: 420 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>Nova PJ</Button>
        </Space>
      </Space>

      <Card variant="borderless">
        <Table<PessoaJuridica>
          rowKey="id"
          dataSource={filteredData}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'CNPJ', dataIndex: 'cnpj', key: 'cnpj', render: (cnpj: string) => formatCNPJ(cnpj) },
            { title: 'Razão Social', dataIndex: 'razaoSocial', key: 'razaoSocial' },
            { title: 'Nome Fantasia', dataIndex: 'nomeFantasia', key: 'nomeFantasia' },
            { title: 'Localização', key: 'local', render: (_, r) => `${r.cidade ?? '-'} / ${r.estado ?? '-'} - ${r.pais ?? '-'}` },
            { title: 'Inscrição Estadual', dataIndex: 'inscricaoEstadual', key: 'inscricaoEstadual' },
            { title: 'E-mail', dataIndex: 'email', key: 'email' },
            { title: 'Telefone', dataIndex: 'telefone', key: 'telefone' },
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

      <PJModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        initialData={editing || undefined}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onSave={(values) => handleSalvar(values)}
      />
    </Space>
  );
};

export default PessoaJuridicaPage;
