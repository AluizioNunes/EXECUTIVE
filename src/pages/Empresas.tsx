import React, { useMemo, useState } from 'react';
import { Card, Descriptions, Modal, Table, Button, Space, Input, message, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, PrinterOutlined } from '@ant-design/icons';
import EmpresasModal from '../components/EmpresasModal';
import { useTenant } from '../contexts/TenantContext';

export type Empresa = {
  IdEmpresas: number;
  CNPJ: string;
  RazaoSocial: string;
  NomeFantasia: string;
  Logomarca?: string;
};

const onlyDigits = (s: string) => s.replace(/\D/g, '');
const formatCNPJ = (s: string) => {
  const d = onlyDigits(s).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
};

const initialEmpresas: Empresa[] = [
  {
    IdEmpresas: 1,
    CNPJ: '04959557000105',
    RazaoSocial: 'ENGECO - ENGENHARIA E CONSTRUÇÃO LTDA.',
    NomeFantasia: 'ENGECO',
  },
];

const loadEmpresas = (): Empresa[] => {
  try {
    const raw = localStorage.getItem('empresas_list');
    return raw ? JSON.parse(raw) : initialEmpresas;
  } catch {
    return initialEmpresas;
  }
};

const Empresas: React.FC = () => {
  const { refreshTenantData } = useTenant();
  const [data, setData] = useState<Empresa[]>(loadEmpresas());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const sDigits = onlyDigits(s);
    return data.filter((e) => {
      const matchesText =
        (e.RazaoSocial || '').toLowerCase().includes(s) ||
        (e.NomeFantasia || '').toLowerCase().includes(s) ||
        formatCNPJ(e.CNPJ).toLowerCase().includes(s);
      const matchesCnpj = sDigits ? onlyDigits(e.CNPJ).includes(sDigits) : false;
      return matchesText || matchesCnpj;
    });
  }, [data, search]);

  const persist = (next: Empresa[]) => {
    setData(next);
    try {
      localStorage.setItem('empresas_list', JSON.stringify(next));
    } catch {}
    refreshTenantData();
  };

  const handleNova = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleSalvar = (values: Omit<Empresa, 'IdEmpresas'> & Partial<Pick<Empresa, 'IdEmpresas'>>) => {
    const payload: Omit<Empresa, 'IdEmpresas'> = {
      CNPJ: values.CNPJ,
      RazaoSocial: values.RazaoSocial,
      NomeFantasia: values.NomeFantasia,
      Logomarca: values.Logomarca,
    };

    if (editing) {
      const next = data.map((e) => (e.IdEmpresas === editing.IdEmpresas ? { ...editing, ...payload } : e));
      persist(next);
      message.success('Empresa atualizada');
      setModalOpen(false);
      setEditing(null);
      return;
    }

    const newId = Math.max(0, ...data.map((e) => e.IdEmpresas)) + 1;
    const next = [...data, { ...payload, IdEmpresas: newId }];
    persist(next);
    message.success('Empresa criada');
    setModalOpen(false);
    setEditing(null);
  };

  const handleEditar = (record: Empresa) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleExcluir = (record: Empresa) => {
    Modal.confirm({
      title: 'Excluir Empresa',
      content: `Deseja excluir a empresa "${record.RazaoSocial}"?`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        const next = data.filter((e) => e.IdEmpresas !== record.IdEmpresas);
        persist(next);
        message.success('Empresa excluída');
      },
    });
  };

  const handleVisualizar = (record: Empresa) => {
    Modal.info({
      title: 'Detalhes da Empresa',
      width: 720,
      content: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="CNPJ">{formatCNPJ(record.CNPJ)}</Descriptions.Item>
            <Descriptions.Item label="Razão Social">{record.RazaoSocial}</Descriptions.Item>
            <Descriptions.Item label="Nome Fantasia">{record.NomeFantasia}</Descriptions.Item>
          </Descriptions>
          {record.Logomarca ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontWeight: 500 }}>Logomarca</div>
              <img
                src={record.Logomarca}
                alt="Logomarca"
                style={{ maxWidth: 320, maxHeight: 200, objectFit: 'contain', border: '1px solid #f0f0f0', borderRadius: 8 }}
              />
            </div>
          ) : null}
        </Space>
      ),
      okText: 'Fechar',
    });
  };

  const handleImprimir = (record: Empresa) => {
    const html = `
      <html>
        <head>
          <title>Empresa</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            h1 { margin: 0 0 16px 0; font-size: 18px; }
            .row { margin: 8px 0; }
            .label { display: inline-block; width: 140px; font-weight: bold; }
            img { margin-top: 12px; max-width: 320px; max-height: 200px; object-fit: contain; border: 1px solid #eee; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>EMPRESA</h1>
          <div class="row"><span class="label">CNPJ:</span> ${formatCNPJ(record.CNPJ)}</div>
          <div class="row"><span class="label">Razão Social:</span> ${record.RazaoSocial}</div>
          <div class="row"><span class="label">Nome Fantasia:</span> ${record.NomeFantasia}</div>
          ${record.Logomarca ? `<div class="row"><span class="label">Logomarca:</span><br /><img src="${record.Logomarca}" /></div>` : ''}
        </body>
      </html>
    `;

    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!w) {
      message.error('Não foi possível abrir a janela de impressão');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 250);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <h2>EMPRESAS</h2>
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por CNPJ, Razão Social ou Nome Fantasia"
            style={{ width: 420 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNova}>
            Nova Empresa
          </Button>
        </Space>
      </Space>

      <Card variant="borderless">
        <Table<Empresa>
          rowKey="IdEmpresas"
          dataSource={filtered}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'CNPJ', dataIndex: 'CNPJ', key: 'CNPJ', render: (cnpj: string) => formatCNPJ(cnpj) },
            { title: 'Razão Social', dataIndex: 'RazaoSocial', key: 'RazaoSocial' },
            { title: 'Nome Fantasia', dataIndex: 'NomeFantasia', key: 'NomeFantasia' },
            {
              title: 'Ações',
              key: 'acoes',
              render: (_, record) => (
                <Space>
                  <Tooltip title="Editar">
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEditar(record)} />
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleExcluir(record)} />
                  </Tooltip>
                  <Tooltip title="Visualizar">
                    <Button type="text" icon={<EyeOutlined />} onClick={() => handleVisualizar(record)} />
                  </Tooltip>
                  <Tooltip title="Imprimir">
                    <Button type="text" icon={<PrinterOutlined />} onClick={() => handleImprimir(record)} />
                  </Tooltip>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <EmpresasModal
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

export default Empresas;
