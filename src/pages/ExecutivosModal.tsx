import React, { useEffect, useMemo } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import { useTenant } from '../contexts/TenantContext';
import type { Executivo } from './Executivos';

interface ExecutivosModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<Executivo>;
  onCancel: () => void;
  onSave: (data: Omit<Executivo, 'IdExecutivo'> & Partial<Pick<Executivo, 'IdExecutivo'>>) => void;
}

const ExecutivosModal: React.FC<ExecutivosModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const { currentTenant, tenants } = useTenant();

  const empresaOptions = useMemo(() => {
    const base = tenants.map((t) => ({ value: t.name, label: t.name }));
    const currentValue = currentTenant?.name ? String(currentTenant.name) : '';
    const selectedValue = String(initialData?.Empresa ?? '').trim() || (mode === 'create' ? currentValue : '');
    if (selectedValue && !base.some((o) => o.value === selectedValue)) {
      return [{ value: selectedValue, label: selectedValue }, ...base];
    }
    return base;
  }, [tenants, currentTenant?.name, initialData?.Empresa, mode]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      IdExecutivo: initialData?.IdExecutivo,
      Executivo: initialData?.Executivo ?? '',
      Funcao: initialData?.Funcao ?? '',
      Perfil: initialData?.Perfil ?? '',
      Empresa: initialData?.Empresa ?? (mode === 'create' ? currentTenant?.name ?? '' : ''),
    });
  }, [open, initialData, form, currentTenant?.name, mode]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Novo Executivo' : 'Editar Executivo'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      afterClose={() => form.resetFields()}
    >
      <Form form={form} layout="vertical">
        {mode === 'edit' ? (
          <Form.Item name="IdExecutivo" label="IdExecutivo">
            <Input disabled />
          </Form.Item>
        ) : null}

        <Form.Item name="Executivo" label="Executivo" rules={[{ required: true, message: 'Informe o nome do executivo' }]}>
          <Input placeholder="Ex.: João Silva" />
        </Form.Item>

        <Form.Item name="Funcao" label="Funcao" rules={[{ required: true, message: 'Informe a função' }]}>
          <Input placeholder="Ex.: CEO" />
        </Form.Item>

        <Form.Item name="Perfil" label="Perfil" rules={[{ required: true, message: 'Informe o perfil' }]}>
          <Input placeholder="Ex.: Executivo" />
        </Form.Item>

        <Form.Item name="Empresa" label="Empresa" rules={[{ required: true, message: 'Informe a empresa' }]}>
          <Select
            showSearch
            placeholder="Selecione a empresa"
            options={empresaOptions}
            filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExecutivosModal;
