import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Define the tenant type
export interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  logoUrl?: string;
  isActive: boolean;
}

// Define the context type
interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  switchTenant: (tenantId: number) => void;
  addTenant: (tenant: Tenant) => void;
  removeTenant: (tenantId: number) => void;
}

// Create the context
const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Mock initial tenants - in a real app this would come from an API
const mockTenants: Tenant[] = [
  { id: 1, name: 'Empresa A', subdomain: 'empresa-a', isActive: true },
  { id: 2, name: 'Empresa B', subdomain: 'empresa-b', isActive: true },
  { id: 3, name: 'Empresa C', subdomain: 'empresa-c', isActive: true },
];

// Create the provider component
export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(mockTenants[0] || null);

  // Load tenant from localStorage on initial load
  useEffect(() => {
    const savedTenantId = localStorage.getItem('currentTenantId');
    if (savedTenantId) {
      const tenantId = parseInt(savedTenantId, 10);
      const tenant = tenants.find(t => t.id === tenantId);
      if (tenant) {
        setCurrentTenant(tenant);
      }
    }
  }, []);

  // Save tenant to localStorage when it changes
  useEffect(() => {
    if (currentTenant) {
      localStorage.setItem('currentTenantId', currentTenant.id.toString());
    }
  }, [currentTenant]);

  const switchTenant = (tenantId: number) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      // In a real app, you would also refresh the data for the new tenant
      console.log(`Switched to tenant: ${tenant.name}`);
    }
  };

  const addTenant = (tenant: Tenant) => {
    setTenants(prev => [...prev, tenant]);
  };

  const removeTenant = (tenantId: number) => {
    setTenants(prev => prev.filter(t => t.id !== tenantId));
    if (currentTenant && currentTenant.id === tenantId) {
      setCurrentTenant(tenants.length > 1 ? tenants[0] : null);
    }
  };

  return (
    <TenantContext.Provider value={{ currentTenant, tenants, switchTenant, addTenant, removeTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

// Create a custom hook to use the tenant context
export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};