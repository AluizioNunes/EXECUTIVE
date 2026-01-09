import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Upload, Button, Space } from 'antd';
import type { PessoaFisica } from '../pages/PF';
import { useTenant } from '../contexts/TenantContext';

interface PFModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<PessoaFisica>;
  onCancel: () => void;
  onSave: (data: Omit<PessoaFisica, 'id'> & Partial<Pick<PessoaFisica, 'id'>>, imagemFile?: File | null) => void;
}

const PFModal: React.FC<PFModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const { currentTenant } = useTenant();
  const [tenantOptions, setTenantOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [imagemFile, setImagemFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      form.setFieldsValue({
        Nome: initialData?.Nome ?? '',
        Nascimento: initialData?.Nascimento ?? '',
        Sexo: initialData?.Sexo ?? '',
        RG: initialData?.RG ?? '',
        Expedidor: initialData?.Expedidor ?? '',
        UFexpedidor: initialData?.UFexpedidor ?? '',
        Expedicao: initialData?.Expedicao ?? '',
        CPF: initialData?.CPF ?? '',
        Celular: initialData?.Celular ?? '',
        Email: initialData?.Email ?? '',
        IdTenant: currentTenant?.id ?? initialData?.IdTenant ?? undefined,
        Tenant: currentTenant?.name ?? initialData?.Tenant ?? '',
        DataCadastro: initialData?.DataCadastro ?? today,
        Cadastrante: initialData?.Cadastrante ?? '',
        Observacoes: initialData?.Observacoes ?? '',
      });
      setImagemFile(null);
    }
  }, [open, initialData, form, currentTenant?.id, currentTenant?.name]);

  useEffect(() => {
    if (!open) return;
    if (!currentTenant) {
      setTenantOptions([]);
      return;
    }
    setTenantOptions([{ label: currentTenant.name, value: currentTenant.id }]);
    form.setFieldsValue({ IdTenant: currentTenant.id, Tenant: currentTenant.name });
  }, [open, currentTenant, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const IdTenant = currentTenant?.id ?? values.IdTenant;
      const Tenant = currentTenant?.name ?? values.Tenant;
      onSave({ ...values, IdTenant, Tenant }, imagemFile);
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
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="Nome" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
          <Input placeholder="Ex.: João Pereira" />
        </Form.Item>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="Nascimento" label="Nascimento" style={{ flex: 1 }}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="Sexo" label="Sexo" style={{ flex: 1 }}>
            <Select
              allowClear
              options={[
                { value: 'M', label: 'M' },
                { value: 'F', label: 'F' },
                { value: 'O', label: 'O' },
              ]}
            />
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="RG" label="RG" style={{ flex: 1 }}>
            <Input placeholder="Ex.: 12.345.678-9" />
          </Form.Item>
          <Form.Item name="Expedidor" label="Expedidor" style={{ flex: 1 }}>
            <Input placeholder="Ex.: SSP" />
          </Form.Item>
          <Form.Item name="UFexpedidor" label="UF Expedidor" style={{ flex: 0.6 }}>
            <Input maxLength={2} placeholder="Ex.: SP" />
          </Form.Item>
        </Space>

        <Form.Item name="Expedicao" label="Expedição">
          <Input type="date" />
        </Form.Item>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item
            name="CPF"
            label="CPF"
            style={{ flex: 1 }}
            rules={[
              { required: true, message: 'Informe o CPF' },
              { pattern: /^\d{11}$/, message: 'CPF deve conter 11 dígitos' },
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
            <Input inputMode="numeric" placeholder="000.000.000-00" maxLength={14} />
          </Form.Item>

          <Form.Item
            name="Celular"
            label="Celular"
            style={{ flex: 1 }}
            rules={[{ pattern: /^$|^\d{11}$/, message: 'Celular deve conter 11 dígitos' }]}
            getValueFromEvent={(e) => String(e.target.value).replace(/\D/g, '').slice(0, 11)}
            getValueProps={(value) => {
              const raw = String(value ?? '');
              const d = raw.replace(/\D/g, '').slice(0, 11);
              if (d.length <= 2) return { value: d };
              if (d.length <= 7) return { value: `(${d.slice(0, 2)}) ${d.slice(2)}` };
              return { value: `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}` };
            }}
          >
            <Input inputMode="numeric" placeholder="(00) 00000-0000" maxLength={15} />
          </Form.Item>
        </Space>

        <Form.Item name="Email" label="Email" rules={[{ type: 'email', message: 'E-mail inválido' }]}>
          <Input placeholder="email@dominio.com" />
        </Form.Item>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="IdTenant" label="IdTenant" style={{ flex: 1 }}>
            <Select options={tenantOptions} disabled />
          </Form.Item>
          <Form.Item name="Tenant" label="Tenant" style={{ flex: 2 }}>
            <Input disabled />
          </Form.Item>
        </Space>

        <Space size={12} style={{ width: '100%' }} align="start">
          <Form.Item name="DataCadastro" label="DataCadastro" style={{ flex: 1 }}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="Cadastrante" label="Cadastrante" style={{ flex: 1 }}>
            <Input placeholder="Ex.: ADMINISTRADOR" />
          </Form.Item>
        </Space>

        <Form.Item label="Imagem (.jpg)">
          <Upload
            accept=".jpg,.jpeg"
            maxCount={1}
            beforeUpload={(f) => {
              const isJpeg = f.type === 'image/jpeg' || /\.jpe?g$/i.test(f.name);
              if (!isJpeg) return Upload.LIST_IGNORE;
              setImagemFile(f);
              return false;
            }}
            onRemove={() => {
              setImagemFile(null);
            }}
            fileList={imagemFile ? ([{ uid: '1', name: imagemFile.name } as any]) : []}
          >
            <Button>Selecionar arquivo</Button>
          </Upload>
        </Form.Item>

        <Form.Item name="Observacoes" label="Observações">
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PFModal;
