import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Switch, Select } from 'antd';
import type { PessoaFisica } from '../pages/PF';
import { useTenant } from '../contexts/TenantContext';

interface PFModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<PessoaFisica>;
  onCancel: () => void;
  onSave: (data: Omit<PessoaFisica, 'id'> & Partial<Pick<PessoaFisica, 'id'>>) => void;
}

const PFModal: React.FC<PFModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const { currentTenant } = useTenant();
  const [empresaOptions, setEmpresaOptions] = useState<Array<{ label: string; value: number }>>([]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        nomeCompleto: initialData?.nomeCompleto ?? '',
        cpf: initialData?.cpf ?? '',
        email: initialData?.email ?? '',
        telefone: initialData?.telefone ?? '',
        empresaId: currentTenant?.id ?? (initialData as any)?.empresaId ?? undefined,
        ativo: initialData?.ativo ?? true,
      });
    }
  }, [open, initialData, form, currentTenant?.id]);

  useEffect(() => {
    if (!open) return;
    if (!currentTenant) {
      setEmpresaOptions([]);
      return;
    }
    setEmpresaOptions([{ label: currentTenant.name, value: currentTenant.id }]);
    form.setFieldsValue({ empresaId: currentTenant.id });
  }, [open, currentTenant, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const empresaId = currentTenant?.id ?? values.empresaId;
      onSave({ ...values, empresaId });
    } catch (e) {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Nova Pessoa Física' : 'Editar Pessoa Física'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="nomeCompleto" label="Nome Completo" rules={[{ required: true, message: 'Informe o nome completo' }]}>
          <Input placeholder="Ex.: João Pereira" />
        </Form.Item>

        <Form.Item
          name="cpf"
          label="CPF"
          rules={[
            { required: true, message: 'Informe o CPF' },
            { pattern: /^\d{11}$/, message: 'CPF deve conter 11 dígitos' }
          ]}
          getValueFromEvent={(e) => String(e.target.value).replace(/\D/g, '').slice(0, 11)}
          getValueProps={(value) => {
            const raw = String(value ?? '');
            const d = raw.replace(/\D/g, '').slice(0, 11);
            if (d.length <= 3) return { value: d };
            if (d.length <= 6) return { value: `${d.slice(0, 3)}.${d.slice(3)}` };
            if (d.length <= 9) return { value: `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}` };
            return { value: `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}` };
          }}
        >
          <Input inputMode="numeric" placeholder="000.000.000-00" />
        </Form.Item>

        <Form.Item name="email" label="E-mail" rules={[{ required: true, message: 'Informe o e-mail' }, { type: 'email', message: 'E-mail inválido' }]}>
          <Input placeholder="email@dominio.com" />
        </Form.Item>

        <Form.Item name="telefone" label="Telefone">
          <Input placeholder="(11) 99999-0000" />
        </Form.Item>

        <Form.Item name="empresaId" label="Empresa">
          <Select
            options={empresaOptions}
            placeholder="Empresa selecionada no topo"
            disabled
          />
        </Form.Item>

        <Form.Item name="ativo" label="Ativo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PFModal;
