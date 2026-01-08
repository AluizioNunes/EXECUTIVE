import React, { useEffect, useMemo } from 'react';
import { Form, Input, Modal } from 'antd';
import type { TenantRecord } from '../pages/Tenants.tsx';

interface TenantsModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<TenantRecord>;
  onCancel: () => void;
  onSave: (data: Pick<TenantRecord, 'Tenant' | 'Slug' | 'Cadastrante'> & Partial<Pick<TenantRecord, 'IdTenant'>>) => void;
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const TenantsModal: React.FC<TenantsModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();

  const initialSlug = useMemo(() => {
    const raw = String(initialData?.Slug ?? '').trim();
    return raw;
  }, [initialData?.Slug]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      IdTenant: initialData?.IdTenant,
      Tenant: initialData?.Tenant ?? '',
      Slug: initialSlug,
      Cadastrante: initialData?.Cadastrante ?? undefined,
      DataCriacao: initialData?.DataCriacao ?? undefined,
      DataUpdate: initialData?.DataUpdate ?? undefined,
    });
  }, [open, initialData, form, initialSlug]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        IdTenant: values.IdTenant ? Number(values.IdTenant) : undefined,
        Tenant: String(values.Tenant ?? ''),
        Slug: String(values.Slug ?? ''),
        Cadastrante: values.Cadastrante ? String(values.Cadastrante) : undefined,
      });
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Novo Tenant' : 'Editar Tenant'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      afterClose={() => form.resetFields()}
      width={720}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={(changed, all) => {
          if (mode !== 'create') return;
          const changedTenant = Object.prototype.hasOwnProperty.call(changed, 'Tenant');
          if (!changedTenant) return;
          const slugCurrent = String(all?.Slug ?? '').trim();
          if (slugCurrent) return;
          const next = slugify(String(all?.Tenant ?? ''));
          if (next) form.setFieldValue('Slug', next);
        }}
      >
        {mode === 'edit' ? (
          <Form.Item name="IdTenant" label="IdTenant">
            <Input disabled />
          </Form.Item>
        ) : null}

        <Form.Item name="Tenant" label="Tenant" rules={[{ required: true, message: 'Informe o tenant' }]}>
          <Input placeholder="Ex.: Cliente A" />
        </Form.Item>

        <Form.Item name="Slug" label="Slug" rules={[{ required: true, message: 'Informe o slug' }]}>
          <Input placeholder="Ex.: cliente-a" />
        </Form.Item>

        <Form.Item name="Cadastrante" label="Cadastrante">
          <Input placeholder="Ex.: admin" />
        </Form.Item>

        {mode === 'edit' ? (
          <>
            <Form.Item name="DataCriacao" label="Data de Criação">
              <Input disabled />
            </Form.Item>
            <Form.Item name="DataUpdate" label="Data de Atualização">
              <Input disabled />
            </Form.Item>
          </>
        ) : null}
      </Form>
    </Modal>
  );
};

export default TenantsModal;
