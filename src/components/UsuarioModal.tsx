import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, Switch } from 'antd';
import type { PessoaFisica } from '../pages/PF';

interface UsuarioModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: any;
  onCancel: () => void;
  onSave: (data: any) => void;
}

const UsuarioModal: React.FC<UsuarioModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const [pfList, setPfList] = useState<PessoaFisica[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pf_list');
      const list = raw ? JSON.parse(raw) : [];
      setPfList(list);
    } catch {
      setPfList([]);
    }
  }, [open]);

  const pfOptions = useMemo(() => pfList.map((pf) => ({
    value: pf.id,
    label: pf.nomeCompleto,
  })), [pfList]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        pfId: (initialData as any)?.pfId ?? undefined,
        username: initialData?.username ?? '',
        email: initialData?.email ?? '',
        ativo: initialData?.ativo ?? true,
      });
    }
  }, [open, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
      form.resetFields();
    } catch {}
  };

  const handlePfChange = (pfId: number) => {
    const pf = pfList.find(p => p.id === pfId);
    if (pf) {
      const suggestedUsername = pf.email ? pf.email.split('@')[0] : (pf.nomeCompleto || '').toLowerCase().replace(/\s+/g, '.');
      form.setFieldsValue({
        username: form.getFieldValue('username') || suggestedUsername,
        email: form.getFieldValue('email') || pf.email,
      });
    }
  };

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? 'Editar Usuário' : 'Novo Usuário'}
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={handleOk}
      okText={mode === 'edit' ? 'Salvar' : 'Criar'}
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="pfId" label="Pessoa (PF)" rules={[{ required: true, message: 'Selecione a pessoa' }]}>
          <Select
            options={pfOptions}
            placeholder="Selecione a pessoa"
            showSearch
            onChange={handlePfChange}
            filterOption={(input, option) => ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>

        <Form.Item name="username" label="Usuário" rules={[{ required: true, message: 'Informe o usuário' }]}>
          <Input placeholder="ex: joao.pereira" />
        </Form.Item>

        <Form.Item name="email" label="E-mail" rules={[{ required: true, type: 'email', message: 'Informe um e-mail válido' }]}>
          <Input placeholder="email@dominio.com" />
        </Form.Item>

        <Form.Item name="ativo" label="Ativo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UsuarioModal;