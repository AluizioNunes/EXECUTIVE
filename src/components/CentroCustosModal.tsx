import React, { useEffect, useMemo } from 'react';
import { Form, Input, Modal, Select, Space } from 'antd';
import { useTenant } from '../contexts/TenantContext';
import type { CentroCusto } from '../pages/CentroCustos.tsx';

interface CentroCustosModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<CentroCusto>;
  onCancel: () => void;
  onSave: (data: Omit<CentroCusto, 'IdCustos'> & Partial<Pick<CentroCusto, 'IdCustos'>>) => void;
}

const CentroCustosModal: React.FC<CentroCustosModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
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
      IdCustos: initialData?.IdCustos,
      Empresa: initialData?.Empresa ?? (mode === 'create' ? (currentTenant?.id === 0 ? '' : currentTenant?.name ?? '') : ''),
      Nome: initialData?.Nome ?? '',
      CodigoInterno: initialData?.CodigoInterno ?? undefined,
      Classe: initialData?.Classe ?? undefined,
      Cidade: initialData?.Cidade ?? undefined,
      UF: initialData?.UF ?? undefined,
      Departamento: initialData?.Departamento ?? undefined,
      Responsavel: initialData?.Responsavel ?? undefined,
    });
  }, [open, initialData, form, currentTenant?.id, currentTenant?.name, mode]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        IdCustos: values.IdCustos ? Number(values.IdCustos) : undefined,
        Empresa: String(values.Empresa ?? ''),
        Nome: String(values.Nome ?? ''),
        CodigoInterno: values.CodigoInterno ? String(values.CodigoInterno) : undefined,
        Classe: values.Classe ? String(values.Classe) : undefined,
        Cidade: values.Cidade ? String(values.Cidade) : undefined,
        UF: values.UF ? String(values.UF) : undefined,
        Departamento: values.Departamento ? String(values.Departamento) : undefined,
        Responsavel: values.Responsavel ? String(values.Responsavel) : undefined,
      });
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Novo Centro de Custos' : 'Editar Centro de Custos'}
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
          <Form.Item name="IdCustos" label="IdCustos">
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

        <Form.Item name="Nome" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
          <Input placeholder="Ex.: Financeiro, Jurídico, TI..." />
        </Form.Item>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="CodigoInterno" label="Código Interno" style={{ flex: 1 }}>
            <Input placeholder="Ex.: CC-0001" />
          </Form.Item>
          <Form.Item name="Classe" label="Classe" style={{ flex: 1 }}>
            <Input placeholder="Ex.: Administrativo" />
          </Form.Item>
          <Form.Item name="UF" label="UF" style={{ flex: 0.4 }}>
            <Input maxLength={2} placeholder="Ex.: SP" />
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="Cidade" label="Cidade" style={{ flex: 1 }}>
            <Input placeholder="Ex.: São Paulo" />
          </Form.Item>
          <Form.Item name="Departamento" label="Departamento" style={{ flex: 1 }}>
            <Input placeholder="Ex.: Operações" />
          </Form.Item>
        </Space>

        <Form.Item name="Responsavel" label="Responsável">
          <Input placeholder="Ex.: Maria Silva" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CentroCustosModal;
