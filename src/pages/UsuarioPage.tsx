import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import UsuarioModal from '../components/UsuarioModal';

export type Usuario = {
  id: number;
  username: string;
  email: string;
  pfId?: number;
  ativo: boolean;
};

const initialUsuarios: Usuario[] = [];

const loadUsuarios = (): Usuario[] => {
  try {
    const raw = localStorage.getItem('usuario_list');
    return raw ? JSON.parse(raw) : initialUsuarios;
  } catch { return initialUsuarios; }
};

const pfNameMap = (): Record<number, string> => {
  try {
    const raw = localStorage.getItem('pf_list');
    const list = raw ? JSON.parse(raw) : [];
    const map: Record<number, string> = {};
    list.forEach((pf: any) => { map[pf.id] = pf.nomeCompleto; });
    return map;
  } catch { return {}; }
};

const UsuarioPage: React.FC = () => {
  const [data, setData] = useState<Usuario[]>(loadUsuarios());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [search, setSearch] = useState('');

  const pfMap = useMemo(() => pfNameMap(), [modalOpen]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(u => (u.username || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s) || ((pfMap[u.pfId || 0] || '').toLowerCase().includes(s)));
  }, [data, search, pfMap]);

  const handleNova = () => { setEditing(null); setModalOpen(true); };

  const handleSalvar = (values: Omit<Usuario, 'id'> & Partial<Pick<Usuario, 'id'>>) => {
    let newData: Usuario[];
    if (editing) {
      newData = data.map(u => u.id === editing.id ? { ...(editing as Usuario), ...values, id: editing.id } : u);
      message.success('Usuário atualizado');
    } else {
      const newId = Math.max(0, ...data.map(u => u.id)) + 1;
      newData = [...data, { ...values, id: newId } as Usuario];
      message.success('Usuário criado');
    }
    setData(newData);
    try { localStorage.setItem('usuario_list', JSON.stringify(newData)); } catch {}
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
        try { localStorage.setItem('usuario_list', JSON.stringify(newData)); } catch {}
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

      <Card bordered={false}>
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