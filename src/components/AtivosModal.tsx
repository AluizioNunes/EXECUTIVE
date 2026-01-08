import React, { useEffect, useMemo } from 'react';
import { Form, Input, Modal, Select, Space } from 'antd';
import { useTenant } from '../contexts/TenantContext';
import type { Ativo } from '../pages/Ativos.tsx';

interface AtivosModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<Ativo>;
  onCancel: () => void;
  onSave: (data: Omit<Ativo, 'IdAtivo'> & Partial<Pick<Ativo, 'IdAtivo'>>) => void;
}

const AtivosModal: React.FC<AtivosModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const { currentTenant, tenants } = useTenant();

  const empresaOptions = useMemo(() => {
    const base = tenants.filter((t) => t.id !== 0).map((t) => ({ value: t.name, label: t.name }));
    const currentValue = currentTenant?.id === 0 ? '' : currentTenant?.name ? String(currentTenant.name) : '';
    const selectedValue = String(initialData?.Empresa ?? '').trim() || (mode === 'create' ? currentValue : '');
    if (selectedValue && !base.some((o) => o.value === selectedValue)) {
      return [{ value: selectedValue, label: selectedValue }, ...base];
    }
    return base;
  }, [tenants, currentTenant?.id, currentTenant?.name, initialData?.Empresa, mode]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      IdAtivo: initialData?.IdAtivo,
      Empresa: initialData?.Empresa ?? (mode === 'create' ? (currentTenant?.id === 0 ? '' : currentTenant?.name ?? '') : ''),
      Ativo: initialData?.Ativo ?? '',
      CodigoInternoAtivo: initialData?.CodigoInternoAtivo ?? undefined,
      Placa: initialData?.Placa ?? undefined,
      Cidade: initialData?.Cidade ?? undefined,
      UF: initialData?.UF ?? undefined,
      CentroCusto: initialData?.CentroCusto ?? undefined,
      Proprietario: initialData?.Proprietario ?? undefined,
      Responsavel: initialData?.Responsavel ?? undefined,
      Atribuido: initialData?.Atribuido ?? undefined,
    });
  }, [open, initialData, form, currentTenant?.id, currentTenant?.name, mode]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        IdAtivo: values.IdAtivo ? Number(values.IdAtivo) : undefined,
        Empresa: String(values.Empresa ?? ''),
        Ativo: String(values.Ativo ?? ''),
        CodigoInternoAtivo: values.CodigoInternoAtivo ? String(values.CodigoInternoAtivo) : undefined,
        Placa: values.Placa ? String(values.Placa) : undefined,
        Cidade: values.Cidade ? String(values.Cidade) : undefined,
        UF: values.UF ? String(values.UF) : undefined,
        CentroCusto: values.CentroCusto ? String(values.CentroCusto) : undefined,
        Proprietario: values.Proprietario ? String(values.Proprietario) : undefined,
        Responsavel: values.Responsavel ? String(values.Responsavel) : undefined,
        Atribuido: values.Atribuido ? String(values.Atribuido) : undefined,
      });
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Novo Ativo' : 'Editar Ativo'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      afterClose={() => form.resetFields()}
      width={820}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {mode === 'edit' ? (
          <Form.Item name="IdAtivo" label="IdAtivo">
            <Input disabled />
          </Form.Item>
        ) : null}

        <Form.Item name="Empresa" label="Empresa" rules={[{ required: true, message: 'Informe a empresa' }]}>
          <Select
            showSearch
            placeholder="Selecione a empresa"
            options={empresaOptions}
            filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>

        <Form.Item name="Ativo" label="Ativo" rules={[{ required: true, message: 'Informe o ativo' }]}>
          <Input placeholder="Ex.: Veículo, Imóvel, Notebook..." />
        </Form.Item>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="CodigoInternoAtivo" label="Código Interno" style={{ flex: 1 }}>
            <Input placeholder="Ex.: AT-0001" />
          </Form.Item>
          <Form.Item name="Placa" label="Placa" style={{ flex: 1 }}>
            <Input placeholder="Ex.: ABC-1D23" />
          </Form.Item>
          <Form.Item name="UF" label="UF" style={{ flex: 0.4 }}>
            <Input maxLength={2} placeholder="Ex.: SP" />
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="Cidade" label="Cidade" style={{ flex: 1 }}>
            <Input placeholder="Ex.: São Paulo" />
          </Form.Item>
          <Form.Item name="CentroCusto" label="Centro de Custo" style={{ flex: 1 }}>
            <Input placeholder="Ex.: Financeiro" />
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="Proprietario" label="Proprietário" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="Responsavel" label="Responsável" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="Atribuido" label="Atribuído" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};

export default AtivosModal;
