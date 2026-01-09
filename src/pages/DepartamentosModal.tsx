import React, { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';
import type { Departamento } from './Departamentos.tsx';

interface DepartamentosModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<Departamento>;
  onCancel: () => void;
  onSave: (data: Omit<Departamento, 'IdDepartamento'> & Partial<Pick<Departamento, 'IdDepartamento'>>) => void;
}

const DepartamentosModal: React.FC<DepartamentosModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      IdDepartamento: initialData?.IdDepartamento,
      Departamento: initialData?.Departamento ?? '',
      Descricao: initialData?.Descricao ?? undefined,
    });
  }, [open, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        IdDepartamento: values.IdDepartamento ? Number(values.IdDepartamento) : undefined,
        Departamento: String(values.Departamento ?? ''),
        Descricao: values.Descricao ? String(values.Descricao) : undefined,
      });
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Novo Departamento' : 'Editar Departamento'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      afterClose={() => form.resetFields()}
      destroyOnHidden
      width={720}
    >
      <Form form={form} layout="vertical">
        {mode === 'edit' ? (
          <Form.Item name="IdDepartamento" label="IdDepartamento">
            <Input disabled />
          </Form.Item>
        ) : null}

        <Form.Item name="Departamento" label="Departamento" rules={[{ required: true, message: 'Informe o departamento' }]}>
          <Input placeholder="Ex.: Financeiro" />
        </Form.Item>

        <Form.Item name="Descricao" label="Descrição">
          <Input.TextArea rows={4} placeholder="Descrição do departamento" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DepartamentosModal;
