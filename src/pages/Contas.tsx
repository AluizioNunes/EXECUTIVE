import React, { useEffect, useMemo, useState } from 'react';
import { Input, Select, Space, Tag, Typography } from 'antd';
import { useTenant } from '../contexts/TenantContext';
import ListGrid from '../components/ListGrid.tsx';
import type { PessoaJuridica } from './PJ';

export type Conta = {
  id: number;
  conta: string;
  tributo: string;
  idTributo: number;
  tipoId: string;
  cidade: string;
  uf: string;
  referente: string;
  responsavelPjId?: number;
  empresaId: number;
  ativo: boolean;
};

const initialContas: Conta[] = [
  {
    id: 1,
    conta: 'IPVA - MANAUS',
    tributo: 'IPVA',
    idTributo: 89876,
    tipoId: 'Matricula',
    cidade: 'Manaus',
    uf: 'AM',
    referente: 'APARTAMENTO - ARUBA',
    responsavelPjId: undefined,
    empresaId: 1,
    ativo: true,
  },
];

const tenantStorageKey = (tenantId: number | undefined, baseKey: string) => (tenantId ? `${tenantId}_${baseKey}` : baseKey);

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

const normalizeContaList = (tenantId: number | undefined, list: any[]): Conta[] => {
  const empresaFallback = Number.isFinite(Number(tenantId)) ? Number(tenantId) : 0;
  return list
    .filter((c) => c && Number.isFinite(Number(c.id)))
    .map((c) => ({
      id: Number(c.id),
      conta: String(c.conta ?? ''),
      tributo: String(c.tributo ?? ''),
      idTributo: Number(c.idTributo ?? 0),
      tipoId: String(c.tipoId ?? ''),
      cidade: String(c.cidade ?? ''),
      uf: String(c.uf ?? ''),
      referente: String(c.referente ?? ''),
      responsavelPjId: Number.isFinite(Number(c.responsavelPjId)) ? Number(c.responsavelPjId) : undefined,
      empresaId: Number.isFinite(Number(c.empresaId)) ? Number(c.empresaId) : empresaFallback,
      ativo: Boolean(c.ativo),
    }));
};

const loadContas = (tenantId: number | undefined): Conta[] => {
  migrateToTenantKey(tenantId, 'contas_list');
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId, 'contas_list'));
    if (!raw) return initialContas.map((c) => ({ ...c, empresaId: Number(tenantId ?? c.empresaId) }));
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeContaList(tenantId, parsed) : [];
  } catch {
    return initialContas;
  }
};

const loadPJs = (tenantId: number | undefined): PessoaJuridica[] => {
  migrateToTenantKey(tenantId, 'pj_list');
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId, 'pj_list'));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PessoaJuridica[]) : [];
  } catch {
    return [];
  }
};

const { Title } = Typography;

const Contas: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const [data, setData] = useState<Conta[]>(() => loadContas(tenantId));
  const [pjs, setPjs] = useState<PessoaJuridica[]>(() => loadPJs(tenantId));
  const [search, setSearch] = useState('');

  useEffect(() => {
    setData(loadContas(tenantId));
    setPjs(loadPJs(tenantId));
  }, [tenantId]);

  const responsavelById = useMemo(() => {
    const map = new Map<number, PessoaJuridica>();
    for (const pj of pjs) map.set(pj.id, pj);
    return map;
  }, [pjs]);

  const pjOptions = useMemo(() => pjs.map((pj) => ({ value: pj.id, label: pj.razaoSocial })), [pjs]);

  const persist = (next: Conta[]) => {
    setData(next);
    try {
      localStorage.setItem(tenantStorageKey(tenantId, 'contas_list'), JSON.stringify(next));
    } catch {}
  };

  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((c) => {
      const resp = c.responsavelPjId ? responsavelById.get(c.responsavelPjId) : undefined;
      return (
        c.conta.toLowerCase().includes(s) ||
        c.tributo.toLowerCase().includes(s) ||
        String(c.idTributo).includes(s) ||
        c.tipoId.toLowerCase().includes(s) ||
        c.cidade.toLowerCase().includes(s) ||
        c.uf.toLowerCase().includes(s) ||
        c.referente.toLowerCase().includes(s) ||
        (resp?.razaoSocial ?? '').toLowerCase().includes(s)
      );
    });
  }, [data, search, responsavelById]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={3}>CONTAS</Title>
        <Input.Search
          allowClear
          placeholder="Buscar por conta, tributo, id, cidade, UF, referente ou responsável"
          style={{ width: 520 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Space>

      <ListGrid<Conta>
        rowKey="id"
        dataSource={filteredData}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Conta', dataIndex: 'conta', key: 'conta' },
          { title: 'Tributo', dataIndex: 'tributo', key: 'tributo' },
          { title: 'IdTributo', dataIndex: 'idTributo', key: 'idTributo' },
          { title: 'TipoId', dataIndex: 'tipoId', key: 'tipoId' },
          { title: 'Cidade', dataIndex: 'cidade', key: 'cidade' },
          { title: 'UF', dataIndex: 'uf', key: 'uf', width: 80 },
          { title: 'Referente', dataIndex: 'referente', key: 'referente' },
          {
            title: 'Responsável',
            key: 'responsavel',
            render: (_, r) => (
              <Select
                allowClear
                placeholder="Selecionar PJ"
                options={pjOptions}
                value={r.responsavelPjId}
                style={{ width: 280 }}
                onChange={(nextId) => {
                  const next = data.map((c) => (c.id === r.id ? { ...c, responsavelPjId: nextId } : c));
                  persist(next);
                }}
              />
            ),
          },
          {
            title: 'Status',
            dataIndex: 'ativo',
            key: 'ativo',
            width: 110,
            render: (ativo: boolean) => <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>,
          },
        ]}
      />
    </Space>
  );
};

export default Contas;
