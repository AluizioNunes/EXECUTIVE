import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import UsuarioModal from '../components/UsuarioModal';
import { useTenant } from '../contexts/TenantContext';

export type Usuario = {
  id: number;
  username: string;
  email: string;
  pfId?: number;
  empresaId: number;
  ativo: boolean;
};

const initialUsuarios: Usuario[] = [];

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

const normalizeUsuarioList = (tenantId: number | undefined, list: any[]): Usuario[] => {
  const empresaFallback = Number.isFinite(Number(tenantId)) ? Number(tenantId) : 0;
  return list
    .filter((u) => u && Number.isFinite(Number(u.id)))
    .map((u) => ({
      id: Number(u.id),
      username: String(u.username ?? ''),
      email: String(u.email ?? ''),
      pfId: Number.isFinite(Number(u.pfId)) ? Number(u.pfId) : undefined,
      empresaId: Number.isFinite(Number(u.empresaId)) ? Number(u.empresaId) : empresaFallback,
      ativo: Boolean(u.ativo),
    }));
};

const loadUsuarios = (tenantId: number | undefined): Usuario[] => {
  migrateToTenantKey(tenantId, 'usuario_list');
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId, 'usuario_list'));
    if (!raw) return initialUsuarios;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeUsuarioList(tenantId, parsed) : [];
  } catch { return initialUsuarios; }
};

const pfNameMap = (tenantId: number | undefined): Record<number, string> => {
  migrateToTenantKey(tenantId, 'pf_list');
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId, 'pf_list'));
    const list = raw ? JSON.parse(raw) : [];
    const map: Record<number, string> = {};
    list.forEach((pf: any) => { map[pf.id] = pf.nomeCompleto; });
    return map;
  } catch { return {}; }
};

const UsuarioPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const [data, setData] = useState<Usuario[]>(() => loadUsuarios(tenantId));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [search, setSearch] = useState('');

  const [pfMap, setPfMap] = useState<Record<number, string>>(() => pfNameMap(tenantId));

  useEffect(() => {
    setPfMap(pfNameMap(tenantId));
  }, [modalOpen, tenantId]);

  useEffect(() => {
    setData(loadUsuarios(tenantId));
    setEditing(null);
    setModalOpen(false);
  }, [tenantId]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(u => (u.username || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s) || ((pfMap[u.pfId || 0] || '').toLowerCase().includes(s)));
  }, [data, search, pfMap]);

  const handleNova = () => { setEditing(null); setModalOpen(true); };

  const handleSalvar = (values: Omit<Usuario, 'id'> & Partial<Pick<Usuario, 'id'>>) => {
    const empresaId = Number(tenantId ?? values.empresaId);
    let newData: Usuario[];
    if (editing) {
      newData = data.map(u => u.id === editing.id ? { ...(editing as Usuario), ...values, empresaId, id: editing.id } : u);
      message.success('Usuário atualizado');
    } else {
      const newId = Math.max(0, ...data.map(u => u.id)) + 1;
      newData = [...data, { ...values, empresaId, id: newId } as Usuario];
      message.success('Usuário criado');
    }
    setData(newData);
    try { localStorage.setItem(tenantStorageKey(tenantId, 'usuario_list'), JSON.stringify(newData)); } catch {}
    setModalOpen(false); setEditing(null);
  };

  const handleEditar = (record: Usuario) => { setEditing(record); setModalOpen(true); };

  const handleExcluir = (record: Usuario) => {
    Modal.confirm({
      title: 'Excluir Usuário',
      content: `Deseja excluir o usuário "${record.username}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        const newData = data.filter(u => u.id !== record.id);
        setData(newData);
        try { localStorage.setItem(tenantStorageKey(tenantId, 'usuario_list'), JSON.stringify(newData)); } catch {}
        message.success('Usuário excluído');
      }
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <h2>USUÁRIO</h2>
        <Space>
          <Input.Search allowClear placeholder="Buscar por usuário, e-mail ou pessoa" style={{ width: 360 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>Novo Usuário</Button>
        </Space>
      </Space>

      <Card variant="borderless">
        <Table<Usuario>
          rowKey="id"
          dataSource={filtered}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Usuário', dataIndex: 'username', key: 'username' },
            { title: 'E-mail', dataIndex: 'email', key: 'email' },
            { title: 'Pessoa (PF)', key: 'pf', render: (_, r) => pfMap[r.pfId || 0] || '-' },
            { title: 'Status', dataIndex: 'ativo', key: 'ativo', render: (ativo: boolean) => <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag> },
            { title: 'Ações', key: 'acoes', render: (_, record) => (
              <Space>
                <Button type="link" icon={<EditOutlined />} onClick={() => handleEditar(record)}>Editar</Button>
                <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleExcluir(record)}>Excluir</Button>
              </Space>
            ) },
          ]}
        />
      </Card>

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
