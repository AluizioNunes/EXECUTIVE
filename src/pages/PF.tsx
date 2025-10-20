import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import PFModal from '../components/PFModal';

export type PessoaFisica = {
  id: number;
  nomeCompleto: string;
  cpf: string;
  email: string;
  telefone?: string;
  empresaIds?: number[];
  ativo: boolean;
};

const initialPFs: PessoaFisica[] = [
  { id: 1, nomeCompleto: 'João Pereira', cpf: '12345678901', email: 'joao.pereira@empresa.com', telefone: '(11) 99999-0001', empresaIds: [1], ativo: true },
  { id: 2, nomeCompleto: 'Ana Costa', cpf: '98765432100', email: 'ana.costa@empresa.com', telefone: '(11) 99999-0002', empresaIds: [2], ativo: true },
  { id: 3, nomeCompleto: 'Carlos Lima', cpf: '11122233344', email: 'carlos.lima@empresa.com', telefone: '(11) 99999-0003', empresaIds: [], ativo: false },
];

const onlyDigits = (s: string) => s.replace(/\D/g, '');
const formatCPF = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
};

const loadPF = (): PessoaFisica[] => {
  try {
    const raw = localStorage.getItem('pf_list');
    return raw ? JSON.parse(raw) : initialPFs;
  } catch {
    return initialPFs;
  }
};

const empresaLabelMap = (): Record<number, string> => {
  try {
    const raw = localStorage.getItem('pj_list');
    const list = raw ? JSON.parse(raw) : [];
    const map: Record<number, string> = {};
    list.forEach((pj: any) => { map[pj.id] = pj.nomeFantasia || pj.razaoSocial; });
    return map;
  } catch {
    return {};
  }
};

const PF: React.FC = () => {
  const [data, setData] = useState<PessoaFisica[]>(loadPF());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PessoaFisica | null>(null);
  const [search, setSearch] = useState('');

  const empresaMap = useMemo(() => empresaLabelMap(), [modalOpen]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(p => {
      const matchesText = p.nomeCompleto.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || onlyDigits(p.cpf).includes(onlyDigits(s));
      const matchesEmpresa = (p.empresaIds ?? []).some(id => (empresaMap[id] ?? '').toLowerCase().includes(s));
      return matchesText || matchesEmpresa;
    });
  }, [data, search, empresaMap]);

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleSalvar = (values: Omit<PessoaFisica, 'id'> & Partial<Pick<PessoaFisica, 'id'>>) => {
    let newData: PessoaFisica[];
    if (editing) {
      newData = data.map(p => p.id === editing.id ? { ...(editing as PessoaFisica), ...values, id: editing.id } : p);
      message.success('PF atualizada com sucesso');
    } else {
      const newId = Math.max(0, ...data.map(p => p.id)) + 1;
      newData = [...data, { ...values, id: newId } as PessoaFisica];
      message.success('PF criada com sucesso');
    }
    setData(newData);
    try { localStorage.setItem('pf_list', JSON.stringify(newData)); } catch {}
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
        try { localStorage.setItem('pf_list', JSON.stringify(newData)); } catch {}
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

      <Card bordered={false}>
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
                {(r.empresaIds ?? []).length === 0 && <Tag>-</Tag>}
                {(r.empresaIds ?? []).map((id) => (
                  <Tag key={id}>{empresaMap[id] ?? id}</Tag>
                ))}
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