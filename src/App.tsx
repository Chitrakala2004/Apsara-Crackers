import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './theme/theme';
import { Navbar, type NavTab } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { CategoriesPage } from './components/CategoriesPage';
import { PriceListPage } from './components/PriceListPage';
import { ProductsPage } from './components/ProductsPage';
import { AllCustomersPage } from './components/AllCustomersPage';
import { AddCustomerPage } from './components/AddCustomerPage';
import { ParticularsPage } from './components/ParticularsPage';
import { GstBillPage } from './components/GstBillPage';
import { SettingsPage, getStoredSettings, DEFAULT_COMPANY_SETTINGS } from './components/SettingsPage';
import { SettingsApi } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('apsara_auth_token'));
  });
  const [activeTab, setActiveTab] = useState<NavTab>('All Customers');
  const [customerSubView, setCustomerSubView] = useState<'list' | 'add'>('list');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');

  useEffect(() => {
    // Clear legacy sticky customer & stale cache if present
    ['varun_active_customer', 'dheeksha_active_customer', 'varun_gst_bills_history', 
     'dheeksha_gst_bills_history', 'varun_draft_bill', 'dheeksha_draft_bill',
     'varun_app_settings', 'dheeksha_app_settings', 'varun_auth_token', 'dheeksha_auth_token',
     'varun_auth_user', 'dheeksha_auth_user'].forEach(key => localStorage.removeItem(key));

    const updateTitle = () => {
      const settings = getStoredSettings();
      const compName = settings.companyName || 'Apsara Crackers';
      document.title = `${compName} - Billing & Management`;
    };
    updateTitle();

    // Fetch settings from MongoDB database so brand identity is always live across all devices
    SettingsApi.get()
      .then((res) => {
        const data = (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
        if (data && typeof data === 'object') {
          const compName = (!data.companyName || data.companyName.toLowerCase().includes('varun') || data.companyName.toLowerCase().includes('dheeksha'))
            ? 'Apsara Crackers'
            : (data.companyName ?? DEFAULT_COMPANY_SETTINGS.companyName);

          const remoteSettings = { ...DEFAULT_COMPANY_SETTINGS, ...data, companyName: compName };
          localStorage.setItem('apsara_app_settings', JSON.stringify(remoteSettings));
          window.dispatchEvent(new Event('apsara_settings_updated'));
          updateTitle();
        }
      })
      .catch((err) => {
        console.warn('Could not connect to settings API on startup:', err);
      });

    window.addEventListener('apsara_settings_updated', updateTitle);
    return () => {
      window.removeEventListener('apsara_settings_updated', updateTitle);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    ['apsara_auth_token', 'apsara_auth_user', 'apsara_active_customer', 'apsara_draft_bill',
     'varun_auth_token', 'dheeksha_auth_token', 'varun_auth_user', 'dheeksha_auth_user',
     'varun_active_customer', 'dheeksha_active_customer'].forEach(key => localStorage.removeItem(key));
    setIsAuthenticated(false);
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'All Customers') {
      setCustomerSubView('list');
    }
    if (tab === 'Billing') {
      setSelectedCustomerName('');
    }
  };

  const handleCustomerSelectedForParticular = (customerName: string) => {
    setSelectedCustomerName(customerName);
    setActiveTab('Billing');
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <Navbar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />

        <Box component="main" sx={{ flexGrow: 1, width: '100%', py: 0.5 }}>
          {/* All Customers Tab */}
          {activeTab === 'All Customers' && (
            <>
              {customerSubView === 'add' ? (
                <AddCustomerPage
                  onCancel={() => setCustomerSubView('list')}
                  onSubmitSuccess={() => setCustomerSubView('list')}
                />
              ) : (
                <AllCustomersPage
                  onAddNewCustomer={() => setCustomerSubView('add')}
                  onSelectCustomerForParticular={handleCustomerSelectedForParticular}
                />
              )}
            </>
          )}

          {/* Billing / Particulars Tab */}
          {activeTab === 'Billing' && (
            <ParticularsPage
              initialCustomerName={selectedCustomerName}
            />
          )}

          {/* GST Bill Tab */}
          {activeTab === 'GST Bill' && <GstBillPage />}

          {/* Categories Tab */}
          {activeTab === 'Categories' && <CategoriesPage />}

          {/* Price List Tab */}
          {activeTab === 'Price List' && <PriceListPage />}

          {/* Products Tab */}
          {activeTab === 'Product' && <ProductsPage />}

          {/* Settings Tab */}
          {activeTab === 'Settings' && <SettingsPage />}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
