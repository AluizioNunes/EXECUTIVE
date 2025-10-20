import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, Switch, Select } from 'antd';
import type { PessoaFisica } from '../pages/PF';

interface PFModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<PessoaFisica>;
  onCancel: () => void;
  onSave: (data: Omit<PessoaFisica, 'id'> & Partial<Pick<PessoaFisica, 'id'>>) => void;
}

const PFModal: React.FC<PFModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();

  const empresaOptions = useMemo(() => {
    try {
      const raw = localStorage.getItem('pj_list');
      const list = raw ? JSON.parse(raw) : [];
      return list.map((pj: any) => ({ label: pj.nomeFantasia || pj.razaoSocial, value: pj.id }));
    } catch {
      return [];
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        nomeCompleto: initialData?.nomeCompleto ?? '',
        cpf: initialData?.cpf ?? '',
        email: initialData?.email ?? '',
        telefone: initialData?.telefone ?? '',
        empresaIds: (initialData as any)?.empresaIds ?? [],
        ativo: initialData?.ativo ?? true,
      });
    }
  }, [open, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
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

        <Form.Item name="empresaIds" label="Empresas que representa">
          <Select
            mode="multiple"
            options={empresaOptions}
            placeholder="Selecione uma ou mais empresas"
            allowClear
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