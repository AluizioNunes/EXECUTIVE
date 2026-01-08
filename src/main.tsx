import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import AppRoutes from './routes.tsx'
import { TenantProvider } from './contexts/TenantContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#00b96b',
        },
      }}
    >
      <AntdApp>
        <TenantProvider>
          <AppRoutes />
        </TenantProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
)
