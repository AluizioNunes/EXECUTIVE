import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch } from 'antd';
import type { PessoaJuridica } from '../pages/PJ';

interface PJModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<PessoaJuridica>;
  onCancel: () => void;
  onSave: (data: Omit<PessoaJuridica, 'id'> & Partial<Pick<PessoaJuridica, 'id'>>) => void;
}

const PJModal: React.FC<PJModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        cnpj: initialData?.cnpj ?? '',
        razaoSocial: initialData?.razaoSocial ?? '',
        nomeFantasia: (initialData as any)?.nomeFantasia ?? '',
        inscricaoEstadual: initialData?.inscricaoEstadual ?? '',
        email: initialData?.email ?? '',
        telefone: initialData?.telefone ?? '',
        endereco: (initialData as any)?.endereco ?? '',
        cidade: (initialData as any)?.cidade ?? '',
        estado: (initialData as any)?.estado ?? '',
        pais: (initialData as any)?.pais ?? '',
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
      title={mode === 'create' ? 'Nova Pessoa Jurídica' : 'Editar Pessoa Jurídica'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="cnpj"
          label="CNPJ"
          rules={[{ required: true, message: 'Informe o CNPJ' }, { pattern: /^\d{14}$/, message: 'CNPJ deve conter 14 dígitos' }]}
          getValueFromEvent={(e) => String(e.target.value).replace(/\D/g, '').slice(0, 14)}
          getValueProps={(value) => {
            const raw = String(value ?? '');
            const d = raw.replace(/\D/g, '').slice(0, 14);
            if (d.length <= 2) return { value: d };
            if (d.length <= 5) return { value: `${d.slice(0, 2)}.${d.slice(2)}` };
            if (d.length <= 8) return { value: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}` };
            if (d.length <= 12) return { value: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}` };
            return { value: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}` };
          }}
        >
          <Input inputMode="numeric" placeholder="00.000.000/0000-00" />
        </Form.Item>

        <Form.Item name="razaoSocial" label="Razão Social" rules={[{ required: true, message: 'Informe a razão social' }]}>
          <Input placeholder="Ex.: Alfa Consultoria Ltda" />
        </Form.Item>

        <Form.Item name="nomeFantasia" label="Nome Fantasia">
          <Input placeholder="Ex.: Alfa" />
        </Form.Item>

        <Form.Item name="inscricaoEstadual" label="Inscrição Estadual">
          <Input placeholder="Ex.: 123.456.789.000" />
        </Form.Item>

        <Form.Item name="email" label="E-mail" rules={[{ required: true, message: 'Informe o e-mail' }, { type: 'email', message: 'E-mail inválido' }]}>
          <Input placeholder="email@dominio.com" />
        </Form.Item>

        <Form.Item name="telefone" label="Telefone">
          <Input placeholder="(11) 99999-0000" />
        </Form.Item>

        <Form.Item name="endereco" label="Endereço">
          <Input placeholder="Rua, número, complemento" />
        </Form.Item>

        <Form.Item name="cidade" label="Cidade">
          <Input placeholder="Ex.: São Paulo" />
        </Form.Item>

        <Form.Item name="estado" label="Estado">
          <Input placeholder="Ex.: SP" />
        </Form.Item>

        <Form.Item name="pais" label="País">
          <Input placeholder="Ex.: Brasil" />
        </Form.Item>

        <Form.Item name="ativo" label="Ativo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PJModal;
