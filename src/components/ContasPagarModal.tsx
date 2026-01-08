import React, { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Upload } from 'antd';
import dayjs from 'dayjs';
import { useTenant } from '../contexts/TenantContext';
import type { ContaPagar } from '../pages/ContasPagar';

interface ContasPagarModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<ContaPagar>;
  onCancel: () => void;
  onSave: (data: Omit<ContaPagar, 'IdContasPagar'> & Partial<Pick<ContaPagar, 'IdContasPagar'>> & { documentoFile?: File | null }) => void;
}

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

type ExecOption = { value: number; label: string };
const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const parseBrazilianMoney = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  const str = String(value);
  const normalized = str.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const ContasPagarModal: React.FC<ContasPagarModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const { currentTenant, tenants } = useTenant();
  const isAll = currentTenant?.id === 0;
  const empresaNome = currentTenant?.id === 0 ? '' : currentTenant?.name || '';
  const [executivos, setExecutivos] = useState<ExecOption[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const handleBaixarDocumento = async (id: number) => {
    try {
      const url = `${apiBaseUrl()}/api/contas-pagar/${id}/documento`;
      const authorization = authHeaders().Authorization;
      const res = await fetch(url, { headers: authorization ? { Authorization: authorization } : undefined });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      message.error('Falha ao baixar documento');
    }
  };

  const tipoPagamento = Form.useWatch('TipoPagamento', form);
  const valorOriginal = Form.useWatch('ValorOriginal', form);
  const parcelas = Form.useWatch('Parcelas', form);
  const desconto = Form.useWatch('Desconto', form);
  const acrescimo = Form.useWatch('Acrescimo', form);
  const empresaFormValue = Form.useWatch('Empresa', form);

  const empresaOptions = useMemo(
    () => tenants.filter((t) => t.id !== 0).map((t) => ({ value: t.name, label: t.name })),
    [tenants]
  );

  useEffect(() => {
    if (!open) return;
    setUploadFile(null);
    form.setFieldsValue({
      Empresa: initialData?.Empresa ?? empresaNome,
      Descricao: initialData?.Descricao ?? '',
      TipoCobranca: initialData?.TipoCobranca ?? undefined,
      IdCobranca: initialData?.IdCobranca ?? undefined,
      TagCobranca: initialData?.TagCobranca ?? undefined,
      Credor: initialData?.Credor ?? undefined,
      TipoCredor: initialData?.TipoCredor ?? undefined,
      ValorOriginal: typeof initialData?.ValorOriginal === 'number' ? initialData.ValorOriginal : undefined,
      TipoPagamento: initialData?.TipoPagamento ?? 'COTA_UNICA',
      Parcelas: typeof initialData?.Parcelas === 'number' ? initialData.Parcelas : 1,
      Desconto: typeof initialData?.Desconto === 'number' ? initialData.Desconto : 0,
      Acrescimo: typeof initialData?.Acrescimo === 'number' ? initialData.Acrescimo : 0,
      ValorFinal: typeof initialData?.ValorFinal === 'number' ? initialData.ValorFinal : undefined,
      DevedorIdExecutivo: typeof initialData?.DevedorIdExecutivo === 'number' ? initialData.DevedorIdExecutivo : undefined,
      StatusPagamento: initialData?.StatusPagamento ?? 'ABERTO',
      StatusCobranca: initialData?.StatusCobranca ?? undefined,
      Vencimento: initialData?.Vencimento ? dayjs(initialData.Vencimento) : undefined,
      URLCobranca: initialData?.URLCobranca ?? undefined,
      Usuario: initialData?.Usuario ?? undefined,
      Senha: initialData?.Senha ?? undefined,
    });
  }, [open, initialData, form, empresaNome]);

  useEffect(() => {
    if (!open) return;
    const empresa = String(empresaFormValue ?? '').trim();
    if (!empresa) {
      setExecutivos([]);
      return;
    }
    (async () => {
      try {
        const url = `${apiBaseUrl()}/api/executivos?empresa=${encodeURIComponent(empresa)}`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as any[];
        const options = Array.isArray(json)
          ? json
              .filter((e) => e && Number.isFinite(Number(e.IdExecutivo)))
              .map((e) => ({ value: Number(e.IdExecutivo), label: String(e.Executivo ?? e.IdExecutivo) }))
          : [];
        setExecutivos(options);
      } catch {
        setExecutivos([]);
      }
    })();
  }, [open, empresaFormValue]);

  useEffect(() => {
    if (!open) return;
    const tipo = String(tipoPagamento || '');
    if (tipo === 'COTA_UNICA') {
      form.setFieldValue('Parcelas', 1);
    }
  }, [tipoPagamento, form, open]);

  useEffect(() => {
    if (!open) return;
    const v = typeof valorOriginal === 'number' ? valorOriginal : Number(valorOriginal);
    if (!Number.isFinite(v)) {
      form.setFieldValue('ValorFinal', undefined);
      return;
    }
    const pRaw = tipoPagamento === 'PARCELAS' ? Number(parcelas || 1) : 1;
    const p = Number.isFinite(pRaw) && pRaw >= 1 ? pRaw : 1;
    const d = Number.isFinite(Number(desconto)) ? Number(desconto) : 0;
    const a = Number.isFinite(Number(acrescimo)) ? Number(acrescimo) : 0;
    const total = Math.max(0, v - d + a);
    const finalValue = p > 1 ? total / p : total;
    form.setFieldValue('ValorFinal', Number.isFinite(finalValue) ? Number(finalValue.toFixed(2)) : undefined);
  }, [valorOriginal, parcelas, desconto, acrescimo, tipoPagamento, form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        Empresa: String(values.Empresa ?? empresaNome ?? ''),
        Descricao: String(values.Descricao ?? ''),
        TipoCobranca: values.TipoCobranca ? String(values.TipoCobranca) : undefined,
        IdCobranca: values.IdCobranca ? String(values.IdCobranca) : undefined,
        TagCobranca: values.TagCobranca ? String(values.TagCobranca) : undefined,
        Credor: values.Credor ? String(values.Credor) : undefined,
        TipoCredor: values.TipoCredor ? String(values.TipoCredor) : undefined,
        ValorOriginal: typeof values.ValorOriginal === 'number' ? values.ValorOriginal : Number(values.ValorOriginal),
        TipoPagamento: String(values.TipoPagamento ?? 'COTA_UNICA'),
        Parcelas: typeof values.Parcelas === 'number' ? values.Parcelas : Number(values.Parcelas),
        Desconto: typeof values.Desconto === 'number' ? values.Desconto : Number(values.Desconto),
        Acrescimo: typeof values.Acrescimo === 'number' ? values.Acrescimo : Number(values.Acrescimo),
        ValorFinal: typeof values.ValorFinal === 'number' ? values.ValorFinal : Number(values.ValorFinal),
        DevedorIdExecutivo: values.DevedorIdExecutivo ? Number(values.DevedorIdExecutivo) : undefined,
        StatusPagamento: values.StatusPagamento ? String(values.StatusPagamento) : undefined,
        StatusCobranca: values.StatusCobranca ? String(values.StatusCobranca) : undefined,
        Vencimento: values.Vencimento ? dayjs(values.Vencimento).format('YYYY-MM-DD') : undefined,
        URLCobranca: values.URLCobranca ? String(values.URLCobranca) : undefined,
        Usuario: values.Usuario ? String(values.Usuario) : undefined,
        Senha: values.Senha ? String(values.Senha) : undefined,
        documentoFile: uploadFile,
      });
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Nova Conta a Pagar' : 'Editar Conta a Pagar'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={() => {
        setUploadFile(null);
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      destroyOnHidden
      width={780}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="Empresa" label="Empresa" rules={[{ required: true, message: 'Informe a empresa' }]}>
          {isAll ? (
            <Select
              showSearch
              placeholder="Selecione a empresa"
              options={empresaOptions}
              filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          ) : (
            <Input disabled />
          )}
        </Form.Item>

        <Form.Item name="Descricao" label="Descrição" rules={[{ required: true, message: 'Informe a descrição' }]}>
          <Input placeholder="Ex.: IPVA - MANAUS" />
        </Form.Item>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="TipoCobranca" label="Tipo de Cobrança" style={{ flex: 1 }}>
            <Input placeholder="Ex.: IPTU" />
          </Form.Item>
          <Form.Item name="IdCobranca" label="Id Cobrança" style={{ flex: 1 }}>
            <Input placeholder="Ex.: 89876" />
          </Form.Item>
          <Form.Item name="TagCobranca" label="Tag Cobrança" style={{ flex: 1 }}>
            <Input placeholder="Ex.: URGENTE" />
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="Credor" label="Credor" style={{ flex: 1 }}>
            <Input placeholder="Ex.: DETRAN-AM" />
          </Form.Item>
          <Form.Item name="TipoCredor" label="Tipo do Credor" style={{ flex: 1 }}>
            <Input placeholder="Ex.: Órgão público" />
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="ValorOriginal" label="Valor Original (R$)" rules={[{ required: true, message: 'Informe o valor original' }]} style={{ flex: 1 }}>
            <InputNumber<number>
              style={{ width: '100%' }}
              min={0}
              precision={2}
              formatter={(v) => {
                if (v === null || v === undefined) return '';
                const n = parseBrazilianMoney(v);
                return brlFormatter.format(n);
              }}
              parser={(v) => parseBrazilianMoney(v)}
            />
          </Form.Item>

          <Form.Item name="TipoPagamento" label="Tipo de Pagamento" rules={[{ required: true, message: 'Informe o tipo de pagamento' }]} style={{ flex: 1 }}>
            <Select
              options={[
                { value: 'COTA_UNICA', label: 'COTA ÚNICA' },
                { value: 'PARCELAS', label: 'PARCELAS' },
              ]}
            />
          </Form.Item>

          <Form.Item name="Parcelas" label="Parcelas" rules={[{ required: true, message: 'Informe as parcelas' }]} style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} min={1} max={360} disabled={tipoPagamento !== 'PARCELAS'} />
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="Desconto" label="Desconto (R$)" style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="Acrescimo" label="Acréscimo (R$)" style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="ValorFinal" label="Valor Final (R$)" style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} disabled />
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="Vencimento" label="Vencimento" rules={[{ required: true, message: 'Informe o vencimento' }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="StatusPagamento" label="Status de Pagamento" rules={[{ required: true, message: 'Informe o status de pagamento' }]} style={{ flex: 1 }}>
            <Select
              options={[
                { value: 'ABERTO', label: 'ABERTO' },
                { value: 'PAGO PARCIALMENTE', label: 'PAGO PARCIALMENTE' },
                { value: 'PAGO', label: 'PAGO' },
              ]}
            />
          </Form.Item>

          <Form.Item name="StatusCobranca" label="Status de Cobrança" style={{ flex: 1 }}>
            <Input placeholder="Ex.: EM ANDAMENTO" />
          </Form.Item>
        </Space>

        <Form.Item name="DevedorIdExecutivo" label="Devedor (Executivos da Empresa)">
          <Select allowClear placeholder="Selecione o executivo" options={executivos} showSearch optionFilterProp="label" />
        </Form.Item>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="URLCobranca" label="URL Cobrança" style={{ flex: 1 }}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item label="Documento" style={{ flex: 1 }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Upload
                maxCount={1}
                beforeUpload={(f) => {
                  setUploadFile(f);
                  return false;
                }}
                onRemove={() => {
                  setUploadFile(null);
                }}
                fileList={uploadFile ? [{ uid: '1', name: uploadFile.name } as any] : []}
              >
                <Button>Selecionar arquivo</Button>
              </Upload>
              {initialData?.IdContasPagar && initialData?.DocumentoPath ? (
                <Space>
                  <Button
                    onClick={() => handleBaixarDocumento(initialData.IdContasPagar!)}
                  >
                    Baixar documento atual
                  </Button>
                </Space>
              ) : null}
              {initialData?.IdContasPagar ? (
                <Button
                  disabled={!String(form.getFieldValue('URLCobranca') || '').trim()}
                  onClick={async () => {
                    try {
                      const id = initialData.IdContasPagar!;
                      const res = await fetch(`${apiBaseUrl()}/api/contas-pagar/${id}/documento/baixar-url`, {
                        method: 'POST',
                        headers: authHeaders(),
                      });
                      if (!res.ok) throw new Error(await res.text());
                      message.success('Documento baixado do URL Cobrança');
                    } catch {
                      message.error('Falha ao baixar documento do URL Cobrança');
                    }
                  }}
                >
                  Baixar documento do URL
                </Button>
              ) : null}
            </Space>
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="Usuario" label="Usuário" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="Senha" label="Senha" style={{ flex: 1 }}>
            <Input.Password />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};

export default ContasPagarModal;
