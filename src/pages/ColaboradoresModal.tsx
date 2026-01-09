import React, { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Form, Input, Modal, Select } from 'antd';
import type { Colaborador } from './Colaboradores.tsx';
import { useTenant } from '../contexts/TenantContext';

interface ColaboradoresModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<Colaborador>;
  onCancel: () => void;
  onSave: (data: Omit<Colaborador, 'IdColaborador'> & Partial<Pick<Colaborador, 'IdColaborador'>>) => void;
}

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const isExecutiveAuth = () => String(localStorage.getItem('auth_tenant_slug') || '').toLowerCase() === 'executive';

type FuncaoApi = {
  IdFuncao: number;
  Funcao: string;
};

const ColaboradoresModal: React.FC<ColaboradoresModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const { currentTenant } = useTenant();
  const { message } = AntdApp.useApp();
  const [funcoes, setFuncoes] = useState<FuncaoApi[]>([]);

  const tenantQuery =
    isExecutiveAuth() && currentTenant?.id && currentTenant.id !== 0 ? `?tenant_id=${currentTenant.id}` : '';

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      IdColaborador: initialData?.IdColaborador,
      Colaborador: initialData?.Colaborador ?? '',
      Funcao: initialData?.Funcao ?? undefined,
      Descricao: initialData?.Descricao ?? undefined,
    });
  }, [open, initialData, form]);

  useEffect(() => {
    if (!open) return;
    const fetchFuncoes = async () => {
      try {
        const res = await fetch(`${apiBaseUrl()}/api/funcoes${tenantQuery}`, { headers: authHeaders() });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as FuncaoApi[];
        setFuncoes(Array.isArray(json) ? json : []);
      } catch {
        setFuncoes([]);
        message.error('Falha ao carregar funções');
      }
    };
    fetchFuncoes();
  }, [open, tenantQuery, message]);

  const funcaoOptions = useMemo(() => {
    const base = funcoes
      .map((f) => String(f.Funcao || '').trim())
      .filter(Boolean)
      .map((f) => ({ value: f, label: f }));
    const current = String(initialData?.Funcao ?? '').trim();
    if (current && !base.some((o) => o.value === current)) {
      return [{ value: current, label: current }, ...base];
    }
    return base;
  }, [funcoes, initialData?.Funcao]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        IdColaborador: values.IdColaborador ? Number(values.IdColaborador) : undefined,
        Colaborador: String(values.Colaborador ?? ''),
        Funcao: String(values.Funcao ?? ''),
        Descricao: values.Descricao ? String(values.Descricao) : undefined,
      });
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Novo Colaborador' : 'Editar Colaborador'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      afterClose={() => form.resetFields()}
      destroyOnHidden
      width={820}
    >
      <Form form={form} layout="vertical">
        {mode === 'edit' ? (
          <Form.Item name="IdColaborador" label="IdColaborador">
            <Input disabled />
          </Form.Item>
        ) : null}

        <Form.Item name="Colaborador" label="Colaborador" rules={[{ required: true, message: 'Informe o colaborador' }]}>
          <Input placeholder="Ex.: João Silva" />
        </Form.Item>

        <Form.Item name="Funcao" label="Função" rules={[{ required: true, message: 'Selecione a função' }]}>
          <Select
            showSearch
            placeholder="Selecione a função"
            options={funcaoOptions}
            filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>

        <Form.Item name="Descricao" label="Descrição">
          <Input.TextArea rows={4} placeholder="Descrição do colaborador" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ColaboradoresModal;
