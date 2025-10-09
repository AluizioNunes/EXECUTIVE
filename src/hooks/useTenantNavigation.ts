import { useNavigate } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';

export const useTenantNavigation = () => {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();

  const navigateTo = (path: string) => {
    if (currentTenant) {
      // Navegar para uma rota específica do tenant
      navigate(`/${currentTenant.id}${path}`);
    } else {
      // Navegar para a rota padrão
      navigate(path);
    }
  };

  const getTenantPath = (path: string) => {
    if (currentTenant) {
      return `/${currentTenant.id}${path}`;
    }
    return path;
  };

  return {
    navigateTo,
    getTenantPath,
    currentTenantId: currentTenant?.id,
  };
};