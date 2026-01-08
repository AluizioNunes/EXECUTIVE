import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch } from 'antd';
import type { Funcao } from '../pages/Perfil';
import { userData } from '../data/mockData';

interface FuncaoModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<Funcao>;
  permissionOptions?: string[];
  onCancel: () => void;
  onSave: (data: Omit<Funcao, 'id'> & Partial<Pick<Funcao, 'id'>>) => void;
}

const FuncaoModal: React.FC<FuncaoModalProps> = ({
  open,
  mode = 'create',
  initialData,
  permissionOptions,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        nome: initialData?.nome ?? '',
        descricao: initialData?.descricao ?? '',
        permissoes: initialData?.permissoes ?? [],
        ativo: initialData?.ativo ?? true,
      });
    }
  }, [open, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
    } catch (e) {
      // validation errors are handled by antd
    }
  };

  const options = (permissionOptions ?? userData.permissions).map(p => ({ label: p, value: p }));

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Nova Função' : 'Editar Função'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="nome" label="Nome da Função" rules={[{ required: true, message: 'Informe o nome da função' }]}>
          <Input placeholder="Ex.: Gestor Financeiro" />
        </Form.Item>

        <Form.Item name="descricao" label="Descrição">
          <Input.TextArea placeholder="Descrição da função" rows={3} />
        </Form.Item>

        <Form.Item name="permissoes" label="Permissões">
          <Select mode="multiple" options={options} placeholder="Selecione as permissões" />
        </Form.Item>

        <Form.Item name="ativo" label="Ativo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default FuncaoModal;
