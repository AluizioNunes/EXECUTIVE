import React, { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Card, Table, Button, Space, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import PFModal from '../components/PFModal';
import { useTenant } from '../contexts/TenantContext';

export type PessoaFisica = {
  id: number;
  Nome: string;
  Nascimento?: string;
  Sexo?: string;
  RG?: string;
  Expedidor?: string;
  UFexpedidor?: string;
  Expedicao?: string;
  CPF: string;
  Celular?: string;
  Email?: string;
  IdTenant: number;
  Tenant: string;
  DataCadastro: string;
  Cadastrante?: string;
  Imagem?: string;
  Observacoes?: string;
};

const initialPFs: PessoaFisica[] = [
  {
    id: 1,
    Nome: 'João Pereira',
    Nascimento: '1988-01-10',
    Sexo: 'M',
    RG: '12.345.678-9',
    Expedidor: 'SSP',
    UFexpedidor: 'SP',
    Expedicao: '2005-05-22',
    CPF: '12345678901',
    Celular: '11999990001',
    Email: 'joao.pereira@empresa.com',
    IdTenant: 1,
    Tenant: 'TENANT 1',
    DataCadastro: '2026-01-01',
    Cadastrante: 'SYSTEM',
    Imagem: '',
    Observacoes: '',
  },
];

const onlyDigits = (s: string) => s.replace(/\D/g, '');
const formatCPF = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
};

const formatCelular = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
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

const normalizePFList = (tenantId: number | undefined, tenantName: string, list: any[]): PessoaFisica[] => {
  const tenantFallback = Number.isFinite(Number(tenantId)) ? Number(tenantId) : 0;
  const nameFallback = tenantName || (tenantFallback ? `TENANT ${tenantFallback}` : 'EXECUTIVE');
  const today = new Date().toISOString().slice(0, 10);

  return list
    .filter((p) => p && Number.isFinite(Number(p.id)))
    .map((p) => {
      const asAny = p as any;
      const isNewShape = typeof asAny.Nome !== 'undefined' || typeof asAny.CPF !== 'undefined';

      if (isNewShape) {
        return {
          id: Number(asAny.id),
          Nome: String(asAny.Nome ?? '').trim(),
          Nascimento: asAny.Nascimento ? String(asAny.Nascimento) : undefined,
          Sexo: asAny.Sexo ? String(asAny.Sexo) : undefined,
          RG: asAny.RG ? String(asAny.RG) : undefined,
          Expedidor: asAny.Expedidor ? String(asAny.Expedidor) : undefined,
          UFexpedidor: asAny.UFexpedidor ? String(asAny.UFexpedidor) : undefined,
          Expedicao: asAny.Expedicao ? String(asAny.Expedicao) : undefined,
          CPF: String(asAny.CPF ?? ''),
          Celular: asAny.Celular ? String(asAny.Celular) : undefined,
          Email: asAny.Email ? String(asAny.Email) : undefined,
          IdTenant: Number.isFinite(Number(asAny.IdTenant)) ? Number(asAny.IdTenant) : tenantFallback,
          Tenant: String(asAny.Tenant ?? '').trim() || nameFallback,
          DataCadastro: String(asAny.DataCadastro ?? '').trim() || today,
          Cadastrante: asAny.Cadastrante ? String(asAny.Cadastrante) : undefined,
          Imagem: asAny.Imagem ? String(asAny.Imagem) : undefined,
          Observacoes: asAny.Observacoes ? String(asAny.Observacoes) : undefined,
        };
      }

      const legacyTenantId =
        Number.isFinite(Number(asAny.IdTenant)) ? Number(asAny.IdTenant)
          : Number.isFinite(Number(asAny.empresaId)) ? Number(asAny.empresaId)
            : tenantFallback;

      return {
        id: Number(asAny.id),
        Nome: String(asAny.nomeCompleto ?? asAny.Nome ?? '').trim(),
        CPF: String(asAny.cpf ?? asAny.CPF ?? ''),
        Celular: asAny.telefone ? String(asAny.telefone) : undefined,
        Email: asAny.email ? String(asAny.email) : undefined,
        IdTenant: legacyTenantId,
        Tenant: String(asAny.Tenant ?? '').trim() || (legacyTenantId ? `TENANT ${legacyTenantId}` : nameFallback),
        DataCadastro: today,
        Cadastrante: asAny.Cadastrante ? String(asAny.Cadastrante) : undefined,
        Observacoes: '',
        Imagem: '',
      };
    })
    .filter((p) => Boolean(p.Nome));
};

const loadPF = (tenantId: number | undefined, tenantName: string): PessoaFisica[] => {
  migrateToTenantKey(tenantId, 'pf_list');
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId, 'pf_list'));
    if (!raw) {
      const id = Number(tenantId ?? 0);
      const name = tenantName || (id ? `TENANT ${id}` : 'EXECUTIVE');
      return initialPFs.map((p) => ({ ...p, IdTenant: id || p.IdTenant, Tenant: name }));
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizePFList(tenantId, tenantName, parsed) : [];
  } catch {
    return initialPFs;
  }
};

const PessoaFisicaPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;
  const tenantName = currentTenant?.name || '';
  const { message, modal } = AntdApp.useApp();

  const [data, setData] = useState<PessoaFisica[]>(() => loadPF(tenantId, tenantName));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PessoaFisica | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setData(loadPF(tenantId, tenantName));
    setEditing(null);
    setModalOpen(false);
  }, [tenantId, tenantName]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter((p) => {
      const nome = String(p.Nome || '').toLowerCase();
      const email = String(p.Email || '').toLowerCase();
      const cpf = onlyDigits(String(p.CPF || ''));
      const rg = String(p.RG || '').toLowerCase();
      const celular = onlyDigits(String(p.Celular || ''));
      return (
        nome.includes(s) ||
        email.includes(s) ||
        rg.includes(s) ||
        cpf.includes(onlyDigits(s)) ||
        celular.includes(onlyDigits(s)) ||
        String(p.Tenant || '').toLowerCase().includes(s)
      );
    });
  }, [data, search]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const apiBaseUrl = () => {
    const env = (import.meta as any).env || {};
    return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
  };

  const uploadImagem = async (args: { id: number; tenant: string; file: File }) => {
    const token = localStorage.getItem('auth_token');
    const body = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsDataURL(args.file);
    });
    const res = await fetch(`${apiBaseUrl()}/api/pessoa-fisica/imagem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ Id: args.id, Tenant: args.tenant, ImageBase64: body }),
    });
    if (!res.ok) throw new Error('Falha ao salvar imagem');
    const json = (await res.json()) as any;
    return String(json?.path || '');
  };

  const handleSalvar = async (
    values: Omit<PessoaFisica, 'id'> & Partial<Pick<PessoaFisica, 'id'>>,
    imagemFile?: File | null
  ) => {
    const idTenant = Number(tenantId ?? values.IdTenant ?? 0);
    const tenant = String(currentTenant?.name || values.Tenant || '').trim();
    const dataCadastro = String(values.DataCadastro || '').trim() || new Date().toISOString().slice(0, 10);
    const cadas = String(values.Cadastrante || '').trim();

    let savedId: number;
    let base: PessoaFisica;

    if (editing) {
      savedId = editing.id;
      base = { ...(editing as PessoaFisica), ...values, id: savedId, IdTenant: idTenant, Tenant: tenant, DataCadastro: dataCadastro, Cadastrante: cadas };
    } else {
      savedId = Math.max(0, ...data.map((p) => p.id)) + 1;
      base = { ...(values as PessoaFisica), id: savedId, IdTenant: idTenant, Tenant: tenant, DataCadastro: dataCadastro, Cadastrante: cadas };
    }

    let finalRow = base;
    if (imagemFile) {
      try {
        const path = await uploadImagem({ id: savedId, tenant, file: imagemFile });
        finalRow = { ...finalRow, Imagem: path };
      } catch {
        message.error('Falha ao salvar imagem');
      }
    }

    const newData = editing ? data.map((p) => (p.id === savedId ? finalRow : p)) : [...data, finalRow];
    setData(newData);
    try { localStorage.setItem(tenantStorageKey(tenantId, 'pf_list'), JSON.stringify(newData)); } catch {}
    setModalOpen(false);
    setEditing(null);
    message.success(editing ? 'PF atualizada com sucesso' : 'PF criada com sucesso');
  };

  const handleEditar = (record: PessoaFisica) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: PessoaFisica) => {
    modal.confirm({
      title: 'Excluir PF',
      content: `Deseja excluir a PF "${record.Nome}"?`,
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
            placeholder="Buscar por nome, CPF, celular, e-mail, RG ou tenant"
            style={{ width: 520 }}
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
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
          columns={[
            { title: 'Nome', dataIndex: 'Nome', key: 'Nome' },
            { title: 'Nascimento', dataIndex: 'Nascimento', key: 'Nascimento' },
            { title: 'Sexo', dataIndex: 'Sexo', key: 'Sexo' },
            { title: 'RG', dataIndex: 'RG', key: 'RG' },
            { title: 'Expedidor', dataIndex: 'Expedidor', key: 'Expedidor' },
            { title: 'UF Expedidor', dataIndex: 'UFexpedidor', key: 'UFexpedidor' },
            { title: 'Expedição', dataIndex: 'Expedicao', key: 'Expedicao' },
            { title: 'CPF', dataIndex: 'CPF', key: 'CPF', render: (cpf: string) => formatCPF(cpf) },
            { title: 'Celular', dataIndex: 'Celular', key: 'Celular', render: (c: string) => formatCelular(c) },
            { title: 'Email', dataIndex: 'Email', key: 'Email' },
            { title: 'IdTenant', dataIndex: 'IdTenant', key: 'IdTenant' },
            { title: 'Tenant', dataIndex: 'Tenant', key: 'Tenant' },
            { title: 'DataCadastro', dataIndex: 'DataCadastro', key: 'DataCadastro' },
            { title: 'Cadastrante', dataIndex: 'Cadastrante', key: 'Cadastrante' },
            { title: 'Imagem', dataIndex: 'Imagem', key: 'Imagem', render: (v: string) => (v ? String(v).split(/[\\/]/).pop() : '') },
            { title: 'Observações', dataIndex: 'Observacoes', key: 'Observacoes' },
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
        onSave={(values, imagemFile) => handleSalvar(values, imagemFile)}
      />
    </Space>
  );
};

export default PessoaFisicaPage;
