import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import PJModal from '../components/PJModal';

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
  ativo: boolean;
};

const initialPJs: PessoaJuridica[] = [
  { id: 1, razaoSocial: 'Alfa Consultoria Ltda', nomeFantasia: 'Alfa', cnpj: '12345678000199', email: 'contato@alfaconsultoria.com', telefone: '(11) 99999-1001', ativo: true, inscricaoEstadual: '123.456.789.000', endereco: 'Av. Paulista, 1000', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil' },
  { id: 2, razaoSocial: 'Beta Tech S/A', nomeFantasia: 'Beta Tech', cnpj: '98765432000155', email: 'ti@betatech.com', telefone: '(11) 99999-1002', ativo: true, endereco: 'Rua das Flores, 200', cidade: 'Campinas', estado: 'SP', pais: 'Brasil' },
  { id: 3, razaoSocial: 'Gamma Serviços ME', nomeFantasia: 'Gamma', cnpj: '11122233000177', email: 'financeiro@gammaservicos.com', telefone: '(11) 99999-1003', ativo: false, endereco: 'Rua A, 50', cidade: 'Curitiba', estado: 'PR', pais: 'Brasil' },
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

const loadPJ = (): PessoaJuridica[] => {
  try {
    const raw = localStorage.getItem('pj_list');
    return raw ? JSON.parse(raw) : initialPJs;
  } catch {
    return initialPJs;
  }
};

const PJ: React.FC = () => {
  const [data, setData] = useState<PessoaJuridica[]>(loadPJ());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PessoaJuridica | null>(null);
  const [search, setSearch] = useState('');

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
    let newData: PessoaJuridica[];
    if (editing) {
      newData = data.map(p => p.id === editing.id ? { ...(editing as PessoaJuridica), ...values, id: editing.id } : p);
      message.success('PJ atualizada com sucesso');
    } else {
      const newId = Math.max(0, ...data.map(p => p.id)) + 1;
      newData = [...data, { ...values, id: newId } as PessoaJuridica];
      message.success('PJ criada com sucesso');
    }
    setData(newData);
    try { localStorage.setItem('pj_list', JSON.stringify(newData)); } catch {}
    setModalOpen(false);
    setEditing(null);
  };

  const handleEditar = (record: PessoaJuridica) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: PessoaJuridica) => {
    Modal.confirm({
      title: 'Excluir PJ',
      content: `Deseja excluir a PJ "${record.razaoSocial}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        const newData = data.filter(p => p.id !== record.id);
        setData(newData);
        try { localStorage.setItem('pj_list', JSON.stringify(newData)); } catch {}
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

      <Card bordered={false}>
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

export default PJ;