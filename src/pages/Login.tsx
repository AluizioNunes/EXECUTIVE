import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Form, Input, Modal, Typography } from 'antd';

type LoginResponse = {
  token: string;
  usuario: string;
  role: string;
  nome?: string | null;
  perfil?: string | null;
  superadmin: boolean;
  tenant: {
    IdTenant: number;
    Tenant: string;
    Slug: string;
    DataCriacao: string;
    DataUpdate: string;
    Cadastrante?: string;
  };
};

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

type LoginProps = {
  open: boolean;
  onLoggedIn: (token: string) => void;
};

const Login: React.FC<LoginProps> = ({ open, onLoggedIn }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = AntdApp.useApp();

  const initialValues = useMemo(
    () => ({
      Usuario: 'ADMINISTRADOR',
      Senha: '',
    }),
    []
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(initialValues);
  }, [open, form, initialValues]);

  const doLogin = useCallback(async (values: { Usuario: string; Senha: string }) => {
    try {
      setLoading(true);

      const res = await fetch(`${apiBaseUrl()}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Usuario: String(values.Usuario || ''),
          Senha: String(values.Senha || ''),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        try {
          const parsed = JSON.parse(body || '{}') as { detail?: unknown };
          const detail = typeof parsed?.detail === 'string' ? parsed.detail : '';
          throw new Error(detail || body || 'Falha ao autenticar');
        } catch {
          throw new Error(body || 'Falha ao autenticar');
        }
      }

      const json = (await res.json()) as LoginResponse;
      if (!json?.token) throw new Error('Resposta inválida do servidor');

      localStorage.setItem('auth_token', String(json.token));
      localStorage.setItem('auth_usuario', String(json.usuario || ''));
      localStorage.setItem('auth_role', String(json.role || ''));
      localStorage.setItem('auth_nome', String(json.nome || ''));
      localStorage.setItem('auth_perfil', String(json.perfil || ''));
      localStorage.setItem('auth_tenant_slug', String(json.tenant?.Slug || ''));
      localStorage.setItem('auth_login_at', String(Date.now()));

      message.success('Login efetuado');
      onLoggedIn(String(json.token));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao autenticar';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [onLoggedIn, message]);

  return (
    <Modal
      open={open}
      title={null}
      footer={null}
      closable={false}
      maskClosable={false}
      keyboard={false}
      destroyOnHidden
      width={980}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', minHeight: 520 }}>
        <div
          style={{
            width: '50%',
            backgroundImage:
              "linear-gradient(135deg, rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <Typography.Title level={3} style={{ color: '#fff', margin: 0 }}>
            Executive
          </Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.85)' }}>
            Business Office
          </Typography.Text>
        </div>

        <div style={{ width: '50%', padding: 32, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%' }}>
            <Typography.Title level={3} style={{ marginTop: 0 }}>
              Entrar
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 24 }}>
              Informe seu usuário e senha para entrar.
            </Typography.Paragraph>

            <Form
              form={form}
              layout="vertical"
              initialValues={initialValues}
              onFinish={doLogin}
              onFinishFailed={() => message.error('Verifique os campos')}
              requiredMark={false}
            >
              <Form.Item name="Usuario" label="Usuário" rules={[{ required: true, message: 'Informe o usuário' }]}>
                <Input autoComplete="username" disabled={loading} onPressEnter={() => form.submit()} />
              </Form.Item>

              <Form.Item name="Senha" label="Senha" rules={[{ required: true, message: 'Informe a senha' }]}>
                <Input.Password autoComplete="current-password" disabled={loading} onPressEnter={() => form.submit()} />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Entrar
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default Login;
