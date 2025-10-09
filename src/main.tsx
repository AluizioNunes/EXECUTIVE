import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
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
      <TenantProvider>
        <AppRoutes />
      </TenantProvider>
    </ConfigProvider>
  </React.StrictMode>,
)