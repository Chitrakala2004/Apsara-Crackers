import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Grid,
  Divider,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import RotateLeftRoundedIcon from '@mui/icons-material/RotateLeftRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';

import {
  CustomersApi,
  ProductsApi,
  PriceListsApi,
  ParticularsApi,
} from '../services/api';
import { getStoredSettings } from './SettingsPage';
import { GstBillPrintModal } from './GstBillPrintModal';
import type { GstBillPrintData, GstProductItem } from './GstBillPrintTemplate';
import { numberToIndianWords } from '../utils/numberToWords';

export const INDIAN_STATES = [
  { code: '33', name: 'Tamil Nadu' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '27', name: 'Maharashtra' },
  { code: '07', name: 'Delhi' },
  { code: '24', name: 'Gujarat' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '19', name: 'West Bengal' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '08', name: 'Rajasthan' },
  { code: '03', name: 'Punjab' },
  { code: '06', name: 'Haryana' },
  { code: '21', name: 'Odisha' },
  { code: '10', name: 'Bihar' },
  { code: '34', name: 'Puducherry' },
];

const GST_LOCAL_HISTORY_KEY = 'apsara_gst_bills_history';

export const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }
  return dateStr;
};

export const GstBillPage: FC = () => {
  const [storeSettings, setStoreSettings] = useState(() => getStoredSettings());
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history'>('create');

  // Dropdown options
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);

  // Invoice Form State
  const [billNo, setBillNo] = useState<string>('0001');
  const [billDate, setBillDate] = useState<string>(() => getTodayDateString());
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerGst, setCustomerGst] = useState<string>('');
  const [customerAadhar, setCustomerAadhar] = useState<string>('');
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('Tamil Nadu (33)');
  const [overallDiscount, setOverallDiscount] = useState<string>('0');
  const [overallGstRate, setOverallGstRate] = useState<string>('18');

  // Product Row Input State
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [hsnCode, setHsnCode] = useState<string>('3604');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<string>('Box');
  const [rate, setRate] = useState<string>('0');

  // Line items list
  const [productRows, setProductRows] = useState<GstProductItem[]>([]);
  const [savingBill, setSavingBill] = useState<boolean>(false);

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<GstBillPrintData | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Inter-state check (Tamil Nadu vs Destination)
  const isInterState = useMemo(() => {
    const suppState = (storeSettings.state || 'Tamil Nadu').toLowerCase();
    const pos = placeOfSupply.toLowerCase();
    return !pos.includes(suppState) && !pos.includes('33');
  }, [placeOfSupply, storeSettings.state]);

  // Calculations for all rows & whole bill GST calculation
  const lineCalculations = useMemo(() => {
    let taxableTotal = 0;

    const computedRows = productRows.map((item) => {
      const q = parseFloat(String(item.quantity)) || 0;
      const r = parseFloat(String(item.rate)) || 0;
      const rowAmt = q * r;
      taxableTotal += rowAmt;

      return {
        ...item,
        quantity: q,
        rate: r,
        amount: rowAmt.toFixed(2),
        taxableAmount: rowAmt.toFixed(2),
      };
    });

    const gRate = parseFloat(overallGstRate) || 0;
    const totalGstAmount = (taxableTotal * gRate) / 100;

    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    if (!isInterState) {
      cgstTotal = totalGstAmount / 2;
      sgstTotal = totalGstAmount / 2;
    } else {
      igstTotal = totalGstAmount;
    }

    const discOverall = parseFloat(overallDiscount) || 0;

    const unroundedGrand = Math.max(0, taxableTotal + totalGstAmount - discOverall);
    const roundedGrand = Math.round(unroundedGrand);
    const roundOffDiff = (roundedGrand - unroundedGrand).toFixed(2);

    return {
      computedRows,
      taxableTotal: taxableTotal.toFixed(2),
      cgstTotal: cgstTotal.toFixed(2),
      sgstTotal: sgstTotal.toFixed(2),
      igstTotal: igstTotal.toFixed(2),
      totalGstAmount: totalGstAmount.toFixed(2),
      subtotal: taxableTotal.toFixed(2),
      roundOff: roundOffDiff,
      grandTotal: roundedGrand.toFixed(2),
      grandTotalNum: roundedGrand,
    };
  }, [productRows, overallGstRate, isInterState, overallDiscount]);

  // Load Dropdown Options
  const loadOptions = async () => {
    try {
      const [custRes, prodRes, priceRes] = await Promise.all([
        CustomersApi.getAll().catch(() => []),
        ProductsApi.getAll().catch(() => []),
        PriceListsApi.getAll().catch(() => []),
      ]);

      if (Array.isArray(custRes)) {
        setCustomerOptions(
          custRes.map((c: any) => ({
            id: c._id || c.id,
            name: c.name,
            mobile: c.mobile && c.mobile !== '-' ? c.mobile : '',
            address: c.address && c.address !== '-' ? c.address : '',
            gst: c.gst && c.gst !== 'N/A' ? c.gst : '',
            aadhar: c.aadhar || '',
          }))
        );
      }

      const pMap = new Map<string, any>();
      if (Array.isArray(prodRes)) {
        prodRes.forEach((p: any) => {
          if (p.name) {
            pMap.set(p.name.toLowerCase().trim(), {
              name: p.name.trim(),
              rate: p.rate || 0,
              unit: p.unit || 'Box',
              hsn: p.hsn || '3604',
            });
          }
        });
      }
      if (Array.isArray(priceRes)) {
        priceRes.forEach((item: any) => {
          if (item.itemName) {
            const key = item.itemName.toLowerCase().trim();
            const existing = pMap.get(key);
            pMap.set(key, {
              name: item.itemName.trim(),
              rate: item.rate && item.rate > 0 ? item.rate : (existing?.rate || 0),
              unit: item.unit || existing?.unit || 'Box',
              hsn: item.hsn || existing?.hsn || '3604',
            });
          }
        });
      }
      setProductOptions(Array.from(pMap.values()));
    } catch (e) {
      console.warn('Failed to load GST billing options', e);
    }
  };

  // Reset form to fresh blank invoice
  const handleResetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGst('');
    setCustomerAadhar('');
    setPlaceOfSupply('Tamil Nadu (33)');
    setOverallDiscount('0');
    setOverallGstRate('18');
    setSelectedProduct('');
    setHsnCode('3604');
    setQuantity('1');
    setUnit('Box');
    setRate('0');
    setProductRows([]);
    setBillDate(getTodayDateString());
    fetchNextGstBillNo();
  };

  // Fetch Next GST Bill No
  const fetchNextGstBillNo = async () => {
    try {
      const res = await ParticularsApi.getNextBillNo('GST');
      const rawNo = (res && typeof res === 'object' && 'nextBillNo' in res) ? res.nextBillNo : res;
      if (typeof rawNo === 'string' && rawNo.trim()) {
        const cleanNo = rawNo.replace(/^GST[-_ ]*/i, '');
        setBillNo(cleanNo || '0001');
      } else {
        setBillNo('0001');
      }
    } catch {
      setBillNo('0001');
    }
  };

  // Fetch GST History (Directly from MongoDB database)
  const fetchGstHistory = async () => {
    setLoadingHistory(true);
    try {
      // Clear legacy stale caches
      ['varun_gst_bills_history', 'dheeksha_gst_bills_history'].forEach(k => localStorage.removeItem(k));

      let remoteBills: any[] = [];
      try {
        const res = await ParticularsApi.getAll();
        if (Array.isArray(res)) {
          remoteBills = res.filter((b: any) => b.billType === 'GST' || (b.billNo && b.billNo.startsWith('GST')));
        }
      } catch (err) {
        console.warn('Could not fetch GST bills from API', err);
      }

      setHistoryList(remoteBills);
      localStorage.setItem(GST_LOCAL_HISTORY_KEY, JSON.stringify(remoteBills));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadOptions();
    fetchNextGstBillNo();
    fetchGstHistory();
  }, []);

  // Listen for settings update
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
  }, []);

  // Auto-sync customer details on selection
  const handleCustomerChange = (_: any, value: any) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      setCustomerName(value);
      const matched = customerOptions.find(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (matched) {
        setCustomerPhone(matched.mobile || '');
        setCustomerAddress(matched.address || '');
        setCustomerAadhar(matched.aadhar || '');
        if (matched.gst) {
          setCustomerGst(matched.gst);
          const stateCode = matched.gst.slice(0, 2);
          const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);
          if (matchedState) {
            setPlaceOfSupply(`${matchedState.name} (${matchedState.code})`);
          }
        } else {
          setCustomerGst('');
        }
      } else {
        setCustomerPhone('');
        setCustomerAddress('');
        setCustomerGst('');
        setCustomerAadhar('');
      }
    } else if (value && value.name) {
      setCustomerName(value.name);
      setCustomerPhone(value.mobile || '');
      setCustomerAddress(value.address || '');
      setCustomerAadhar(value.aadhar || '');
      if (value.gst) {
        setCustomerGst(value.gst);
        const stateCode = value.gst.slice(0, 2);
        const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);
        if (matchedState) {
          setPlaceOfSupply(`${matchedState.name} (${matchedState.code})`);
        }
      } else {
        setCustomerGst('');
      }
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerGst('');
      setCustomerAadhar('');
      setPlaceOfSupply('Tamil Nadu (33)');
    }
  };

  // Auto-fill product rate and HSN
  const handleProductChange = (_: any, value: any) => {
    if (typeof value === 'string') {
      setSelectedProduct(value);
    } else if (value && value.name) {
      setSelectedProduct(value.name);
      if (value.rate) setRate(String(value.rate));
      if (value.unit) setUnit(value.unit);
      if (value.hsn) setHsnCode(value.hsn);
    } else {
      setSelectedProduct('');
    }
  };

  // Add Item to Rows
  const handleAddItem = () => {
    if (!selectedProduct.trim()) {
      alert('Please enter or select a product');
      return;
    }
    const qNum = parseFloat(quantity) || 1;
    const rNum = parseFloat(rate) || 0;

    const newItem: GstProductItem = {
      particular: selectedProduct.trim(),
      hsnCode: hsnCode || '3604',
      quantity: qNum,
      unit: unit || 'Box',
      rate: rNum,
      gstRate: parseFloat(overallGstRate) || 18,
      taxableAmount: (qNum * rNum).toFixed(2),
      amount: (qNum * rNum).toFixed(2),
    };

    setProductRows((prev) => [...prev, newItem]);
    setSelectedProduct('');
    setQuantity('1');
    setRate('0');
  };

  const handleRemoveRow = (idx: number) => {
    setProductRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Prepare Bill Object for print and save
  const buildCurrentGstBillData = (): GstBillPrintData => {
    return {
      billNo,
      date: formatDisplayDate(billDate),
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      customerAddress,
      customerGst: customerGst || 'Unregistered',
      customerAadhar,
      placeOfSupply,
      reverseCharge: 'No',
      vehicleNo: '',
      ewayBillNo: '',
      transport: '-',
      caseCount: '0',
      companyName: storeSettings.companyName || 'Apsara Crackers',
      products: lineCalculations.computedRows,
      subtotal: lineCalculations.taxableTotal,
      gstRate: overallGstRate,
      discount: overallDiscount,
      transportCharges: '0',
      packingCharges: '0',
      cgstTotal: lineCalculations.cgstTotal,
      sgstTotal: lineCalculations.sgstTotal,
      igstTotal: lineCalculations.igstTotal,
      roundOff: lineCalculations.roundOff,
      total: lineCalculations.grandTotal,
      paymentStatus: 'UNPAID',
    };
  };

  // Save GST Bill
  const handleSaveGstBill = async (andPrint = false) => {
    if (!customerName.trim()) {
      alert('Please specify a customer name');
      return;
    }
    if (productRows.length === 0) {
      alert('Please add at least one product item to the invoice');
      return;
    }

    setSavingBill(true);
    const billData = buildCurrentGstBillData();

    try {
      // 1. Save to MongoDB
      const payload = {
        billNo: billData.billNo,
        date: billData.date,
        customerName: billData.customerName,
        customerPhone: billData.customerPhone,
        customerAddress: billData.customerAddress,
        customerGst: billData.customerGst,
        customerAadhar: billData.customerAadhar,
        placeOfSupply: billData.placeOfSupply,
        reverseCharge: billData.reverseCharge,
        vehicleNo: billData.vehicleNo,
        ewayBillNo: billData.ewayBillNo,
        transport: billData.transport,
        caseCount: String(billData.caseCount),
        companyName: billData.companyName,
        discount: String(billData.discount),
        packing: String(billData.packingCharges),
        amount: String(billData.subtotal),
        tax: String(parseFloat(billData.cgstTotal as string || '0') + parseFloat(billData.sgstTotal as string || '0') + parseFloat(billData.igstTotal as string || '0')),
        total: String(billData.total),
        billType: 'GST',
        gstRate: String(billData.gstRate || overallGstRate),
        cgstTotal: String(billData.cgstTotal),
        sgstTotal: String(billData.sgstTotal),
        igstTotal: String(billData.igstTotal),
        roundOff: String(billData.roundOff),
        products: billData.products.map((p) => ({
          particular: p.particular,
          quantity: String(p.quantity),
          rate: String(p.rate),
          pktUnit: String(p.unit || 'Box'),
          amount: String(p.amount),
          hsnCode: String(p.hsnCode || '3604'),
          gstRate: String(p.gstRate || overallGstRate),
          taxableAmount: String(p.taxableAmount || p.amount),
          cgst: String(p.cgst || '0'),
          sgst: String(p.sgst || '0'),
          igst: String(p.igst || '0'),
        })),
      };

      try {
        await ParticularsApi.create(payload);
      } catch (backendErr) {
        console.warn('Backend API save failed, saved locally', backendErr);
      }

      // 2. Save to Local Storage History
      const existingHistoryRaw = localStorage.getItem(GST_LOCAL_HISTORY_KEY);
      const existingHistory: any[] = existingHistoryRaw ? JSON.parse(existingHistoryRaw) : [];
      const updatedHistory = [billData, ...existingHistory.filter((b) => b.billNo !== billData.billNo)];
      localStorage.setItem(GST_LOCAL_HISTORY_KEY, JSON.stringify(updatedHistory));
      setHistoryList(updatedHistory);

      alert(`GST Invoice #${billData.billNo} saved successfully!`);

      // Reset form immediately for fresh new bill entry (zero old customer data / products)
      handleResetForm();

      if (andPrint) {
        setSelectedBillForPrint(billData);
        setPrintModalOpen(true);
      }
    } catch (e) {
      console.error('Error saving GST Bill:', e);
      alert('Failed to save GST Bill. Please try again.');
    } finally {
      setSavingBill(false);
    }
  };

  // Delete from History
  const handleDeleteHistory = async (bill: any) => {
    if (!confirm(`Delete GST Invoice #${bill.billNo}?`)) return;
    try {
      if (bill._id || bill.id) {
        await ParticularsApi.delete(bill._id || bill.id).catch(() => {});
      }
    } catch (err) {
      console.warn(err);
    }

    const updated = historyList.filter((b) => b.billNo !== bill.billNo);
    setHistoryList(updated);
    localStorage.setItem(GST_LOCAL_HISTORY_KEY, JSON.stringify(updated));
  };

  // Export GST Bills to CSV
  const handleExportCsv = () => {
    if (historyList.length === 0) {
      alert('No GST bills available to export');
      return;
    }

    const headers = [
      'Invoice No',
      'Date',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total Amount (INR)',
    ];

    const rows = historyList.map((b) => [
      `"${b.billNo || ''}"`,
      `"${b.date || ''}"`,
      `"${(b.customerName || '').replace(/"/g, '""')}"`,
      `"${b.customerGst || 'Unregistered'}"`,
      `"${b.placeOfSupply || 'Tamil Nadu'}"`,
      parseFloat(String(b.subtotal || b.amount || 0)).toFixed(2),
      parseFloat(String(b.cgstTotal || 0)).toFixed(2),
      parseFloat(String(b.sgstTotal || 0)).toFixed(2),
      parseFloat(String(b.igstTotal || 0)).toFixed(2),
      parseFloat(String(b.total || 0)).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GST_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    const term = historySearchTerm.toLowerCase().trim();
    if (!term) return historyList;
    return historyList.filter((b) => {
      const bNo = (b.billNo || '').toLowerCase();
      const cName = (b.customerName || '').toLowerCase();
      const gst = (b.customerGst || '').toLowerCase();
      return bNo.includes(term) || cName.includes(term) || gst.includes(term);
    });
  }, [historyList, historySearchTerm]);

  // Aggregate stats
  const totalTaxableSum = useMemo(() => {
    return historyList.reduce((acc, b) => acc + (parseFloat(String(b.subtotal || b.amount || 0)) || 0), 0);
  }, [historyList]);

  const totalGstSum = useMemo(() => {
    return historyList.reduce(
      (acc, b) =>
        acc +
        (parseFloat(String(b.cgstTotal || 0)) || 0) +
        (parseFloat(String(b.sgstTotal || 0)) || 0) +
        (parseFloat(String(b.igstTotal || 0)) || 0),
      0
    );
  }, [historyList]);

  const totalGrandSum = useMemo(() => {
    return historyList.reduce((acc, b) => acc + (parseFloat(String(b.total || 0)) || 0), 0);
  }, [historyList]);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', backgroundColor: '#FFFFFF', p: { xs: 1.5, sm: 3 } }}>
      {/* Top Header Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ReceiptLongRoundedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                GST Tax Invoicing
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                Generate official GST-compliant tax invoices with HSN codes, CGST/SGST/IGST breakdown, and print copies
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Top Header Card Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              handleResetForm();
              setActiveSubTab('create');
            }}
            sx={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13px',
              borderRadius: '8px',
              px: 2.2,
              py: 0.9,
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
              '&:hover': { backgroundColor: '#B91C1C' },
            }}
          >
            + New Bill
          </Button>

          {/* View Switcher Tabs */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F1F5F9',
              p: 0.5,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
            }}
          >
            <Button
              onClick={() => setActiveSubTab('create')}
              variant={activeSubTab === 'create' ? 'contained' : 'text'}
              sx={{
                backgroundColor: activeSubTab === 'create' ? '#0F172A' : 'transparent',
                color: activeSubTab === 'create' ? '#FFFFFF' : '#475569',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                px: 2,
                py: 0.8,
                '&:hover': {
                  backgroundColor: activeSubTab === 'create' ? '#1E293B' : '#E2E8F0',
                },
              }}
            >
              Create GST Invoice
            </Button>
            <Button
              onClick={() => {
                setActiveSubTab('history');
                fetchGstHistory();
              }}
              variant={activeSubTab === 'history' ? 'contained' : 'text'}
              sx={{
                backgroundColor: activeSubTab === 'history' ? '#0F172A' : 'transparent',
                color: activeSubTab === 'history' ? '#FFFFFF' : '#475569',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                px: 2,
                py: 0.8,
                '&:hover': {
                  backgroundColor: activeSubTab === 'history' ? '#1E293B' : '#E2E8F0',
                },
              }}
            >
              GST Invoices History ({historyList.length})
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* KPI Stats Bar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total GST Bills
            </Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
              {historyList.length}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Taxable Value
            </Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#1E40AF', mt: 0.5 }}>
              ₹{totalTaxableSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total GST Tax Collected
            </Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#D97706', mt: 0.5 }}>
              ₹{totalGstSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Grand Total Invoiced
            </Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', mt: 0.5 }}>
              ₹{totalGrandSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* CREATE GST INVOICE TAB */}
      {activeSubTab === 'create' && (
        <Grid container spacing={3}>
          {/* Main Left Form: Customer & Line Items */}
          <Grid size={{ xs: 12, lg: 8 }}>
            {/* Invoice Meta Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 4,
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <AccountBalanceOutlinedIcon sx={{ fontSize: 20, color: '#DC2626' }} />
                  Invoice & Place of Supply Details
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
                  onClick={handleResetForm}
                  sx={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'none',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    borderRadius: '7px',
                    px: 1.8,
                    '&:hover': { backgroundColor: '#B91C1C' },
                  }}
                >
                  + New Bill
                </Button>
              </Box>

              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="GST Invoice No"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Invoice Date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      '& input': { cursor: 'pointer' },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Place of Supply</InputLabel>
                    <Select
                      value={placeOfSupply}
                      label="Place of Supply"
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                    >
                      {INDIAN_STATES.map((st) => (
                        <MenuItem key={st.code} value={`${st.name} (${st.code})`}>
                          {st.name} ({st.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Tax Type Alert Badge */}
              <Box
                sx={{
                  mt: 3,
                  p: 1.8,
                  borderRadius: '10px',
                  backgroundColor: isInterState ? '#EFF6FF' : '#ECFDF5',
                  border: isInterState ? '1px solid #BFDBFE' : '1px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                }}
              >
                <CheckCircleOutlineRoundedIcon sx={{ fontSize: 20, color: isInterState ? '#1D4ED8' : '#047857' }} />
                <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: isInterState ? '#1E40AF' : '#065F46' }}>
                  {isInterState
                    ? `Inter-State Supply: IGST (${overallGstRate}%) applies (${placeOfSupply} differs from supplier state)`
                    : `Intra-State Supply: CGST (${(parseFloat(overallGstRate) / 2).toFixed(1)}%) + SGST (${(parseFloat(overallGstRate) / 2).toFixed(1)}%) applies (${placeOfSupply})`}
                </Typography>
              </Box>
            </Paper>

            {/* Customer Details Card (Inline Side-by-Side Value & Input Layout) */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 4,
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 3 }}>
                Customer (Receiver / Buyer) Information
              </Typography>

              <Grid container spacing={{ xs: 2.5, sm: 3 }}>
                {/* Customer Name */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.8, sm: 2 } }}>
                    <Typography sx={{ width: { xs: '100%', sm: '140px' }, minWidth: { xs: 'auto', sm: '140px' }, flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Customer Name <span style={{ color: '#DC2626' }}>*</span> :
                    </Typography>
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <Autocomplete
                        freeSolo
                        options={customerOptions}
                        getOptionLabel={(option: any) => (typeof option === 'string' ? option : option.name || '')}
                        value={customerName}
                        onInputChange={(_, newInputValue, reason) => {
                          setCustomerName(newInputValue);
                          if (reason === 'clear') {
                            setCustomerPhone('');
                            setCustomerAddress('');
                            setCustomerGst('');
                            setCustomerAadhar('');
                          }
                        }}
                        onChange={handleCustomerChange}
                        renderInput={(params) => (
                          <TextField {...params} size="small" placeholder="Type or select customer" />
                        )}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Customer GSTIN */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.8, sm: 2 } }}>
                    <Typography sx={{ width: { xs: '100%', sm: '140px' }, minWidth: { xs: 'auto', sm: '140px' }, flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Customer GSTIN :
                    </Typography>
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="15-digit GSTIN (e.g. 33AABCU9603R1ZM)"
                        value={customerGst}
                        onChange={(e) => setCustomerGst(e.target.value.toUpperCase())}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Mobile / Phone */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.8, sm: 2 } }}>
                    <Typography sx={{ width: { xs: '100%', sm: '140px' }, minWidth: { xs: 'auto', sm: '140px' }, flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Mobile / Phone :
                    </Typography>
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="10-digit mobile number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Aadhar Number */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.8, sm: 2 } }}>
                    <Typography sx={{ width: { xs: '100%', sm: '140px' }, minWidth: { xs: 'auto', sm: '140px' }, flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Aadhar Number :
                    </Typography>
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="12-digit Aadhaar number"
                        value={customerAadhar}
                        onChange={(e) => setCustomerAadhar(e.target.value)}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Customer Address */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.8, sm: 2 } }}>
                    <Typography sx={{ width: { xs: '100%', sm: '140px' }, minWidth: { xs: 'auto', sm: '140px' }, flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Address / City :
                    </Typography>
                    <Box sx={{ flex: 1, width: '100%' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Billing & Shipping Address"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                      />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Line Items Entry & Table Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 4,
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Add Goods & Product Items
                </Typography>
                {productRows.length > 0 && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setProductRows([])}
                    startIcon={<ClearRoundedIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'none',
                      color: '#EF4444',
                      '&:hover': { backgroundColor: '#FEF2F2' },
                    }}
                  >
                    Clear All Products
                  </Button>
                )}
              </Box>

              {/* Product Entry Row (No HSN input, No item-level GST input) */}
              <Grid container spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Autocomplete
                    freeSolo
                    options={productOptions}
                    getOptionLabel={(opt: any) => (typeof opt === 'string' ? opt : opt.name || '')}
                    value={selectedProduct}
                    onInputChange={(_, newVal) => setSelectedProduct(newVal)}
                    onChange={handleProductChange}
                    renderInput={(params) => (
                      <TextField {...params} size="small" label="Product Name *" placeholder="Type or select product item" />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Qty"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Rate (₹)"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleAddItem}
                    startIcon={<AddRoundedIcon />}
                    sx={{
                      backgroundColor: '#DC2626',
                      fontWeight: 700,
                      py: 0.9,
                      '&:hover': { backgroundColor: '#B91C1C' },
                    }}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>

              {/* Items Table (Clean: No per-item GST columns) */}
              <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', width: '35px', textAlign: 'center' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Particulars / Product Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'center', width: '70px' }}>HSN</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'center', width: '60px' }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'center', width: '60px' }}>Unit</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right', width: '90px' }}>Rate (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right', width: '105px' }}>Amount (₹)</TableCell>
                      <TableCell sx={{ width: '40px', textAlign: 'center' }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineCalculations.computedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: '#64748B' }}>
                          No product items added yet. Fill the row above and click "Add".
                        </TableCell>
                      </TableRow>
                    ) : (
                      lineCalculations.computedRows.map((row, idx) => (
                        <TableRow key={idx} sx={{ '&:hover': { backgroundColor: '#F8FAFC' } }}>
                          <TableCell sx={{ textAlign: 'center' }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.particular}</TableCell>
                          <TableCell sx={{ textAlign: 'center', color: '#64748B' }}>{row.hsnCode || '3604'}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{row.quantity}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{row.unit}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{parseFloat(String(row.rate)).toFixed(2)}</TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>₹{row.amount}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton size="small" onClick={() => handleRemoveRow(idx)} sx={{ color: '#EF4444' }}>
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Right Sidebar: Tax Summary & Actions */}
          <Grid size={{ xs: 12, lg: 4 }}>

            {/* GST Tax Summary Card with Whole Bill GST % Selector */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 4,
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 2.5 }}>
                Invoice Total & Tax Summary
              </Typography>

              {/* Overall GST Rate Input on the whole bill (Direct Typing) */}
              <Box sx={{ p: 2, backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', mb: 2.5 }}>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', mb: 1 }}>
                  Overall GST Rate (%) on Goods:
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  placeholder="Type GST % (e.g. 18)"
                  value={overallGstRate}
                  onChange={(e) => setOverallGstRate(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: <InputAdornment position="end" sx={{ fontWeight: 700 }}>%</InputAdornment>,
                    },
                  }}
                  sx={{ backgroundColor: '#FFFFFF', '& input': { fontWeight: 700 } }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '13px', color: '#64748B' }}>Taxable Goods Value:</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ₹{lineCalculations.taxableTotal}
                  </Typography>
                </Box>

                {!isInterState ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
                        CGST ({((parseFloat(overallGstRate) || 0) / 2).toFixed(1)}%):
                      </Typography>
                      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        ₹{lineCalculations.cgstTotal}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
                        SGST ({((parseFloat(overallGstRate) || 0) / 2).toFixed(1)}%):
                      </Typography>
                      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        ₹{lineCalculations.sgstTotal}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '13px', color: '#64748B' }}>
                      IGST ({parseFloat(overallGstRate) || 0}%):
                    </Typography>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      ₹{lineCalculations.igstTotal}
                    </Typography>
                  </Box>
                )}

                {parseFloat(overallDiscount) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '13px', color: '#64748B' }}>Bill Discount:</Typography>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>-₹{overallDiscount}</Typography>
                  </Box>
                )}

                {lineCalculations.roundOff !== '0.00' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '13px', color: '#64748B' }}>Round Off:</Typography>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>₹{lineCalculations.roundOff}</Typography>
                  </Box>
                )}

                <Divider sx={{ my: 1, borderColor: '#E2E8F0' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Grand Total:</Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#DC2626' }}>
                    ₹{lineCalculations.grandTotal}
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, backgroundColor: '#F8FAFC', borderRadius: '8px', mt: 0.5 }}>
                  <Typography sx={{ fontSize: '11.5px', color: '#475569', fontStyle: 'italic', lineHeight: 1.4 }}>
                    In Words: {numberToIndianWords(lineCalculations.grandTotalNum)}
                  </Typography>
                </Box>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3.5 }}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={savingBill}
                  onClick={() => handleSaveGstBill(true)}
                  startIcon={savingBill ? <CircularProgress size={18} color="inherit" /> : <PrintOutlinedIcon />}
                  sx={{
                    backgroundColor: '#DC2626',
                    py: 1.2,
                    fontWeight: 800,
                    fontSize: '14px',
                    '&:hover': { backgroundColor: '#B91C1C' },
                  }}
                >
                  Save & Print Tax Invoice
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  disabled={savingBill}
                  onClick={() => handleSaveGstBill(false)}
                  sx={{
                    color: '#0F172A',
                    borderColor: '#CBD5E1',
                    fontWeight: 700,
                    py: 1,
                    '&:hover': { borderColor: '#94A3B8', backgroundColor: '#F8FAFC' },
                  }}
                >
                  Save Only
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleResetForm}
                  startIcon={<RotateLeftRoundedIcon />}
                  sx={{
                    color: '#DC2626',
                    borderColor: '#FECACA',
                    fontWeight: 700,
                    py: 0.9,
                    '&:hover': { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
                  }}
                >
                  + New Bill / Reset Form
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* GST INVOICES HISTORY TAB */}
      {activeSubTab === 'history' && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Search & Actions Bar */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <TextField
              size="small"
              placeholder="Search by Bill No, Customer, or GSTIN..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ color: '#94A3B8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: historySearchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setHistorySearchTerm('')}>
                        <ClearRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
              sx={{ width: { xs: '100%', sm: '360px' } }}
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportCsv}
                sx={{
                  color: '#1E40AF',
                  borderColor: '#BFDBFE',
                  fontWeight: 700,
                  fontSize: '12px',
                  '&:hover': { backgroundColor: '#EFF6FF' },
                }}
              >
                Export GSTR-1 CSV
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleResetForm();
                  setActiveSubTab('create');
                }}
                startIcon={<AddRoundedIcon />}
                sx={{
                  backgroundColor: '#DC2626',
                  fontWeight: 700,
                  fontSize: '12px',
                  '&:hover': { backgroundColor: '#B91C1C' },
                }}
              >
                + New Bill
              </Button>
            </Box>
          </Box>

          {/* Table */}
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#DC2626' }} />
            </Box>
          ) : (
            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Invoice No</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>GSTIN</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>Place of Supply</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>Taxable Val</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>CGST+SGST / IGST</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>Total (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B', textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5, color: '#64748B' }}>
                        No GST invoices found. Create your first GST Bill from the "Create GST Invoice" tab.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((bill, index) => {
                      const totalNum = parseFloat(String(bill.total || 0));
                      const taxableNum = parseFloat(String(bill.subtotal || bill.amount || 0));
                      const taxTotalNum =
                        (parseFloat(String(bill.cgstTotal || 0)) || 0) +
                        (parseFloat(String(bill.sgstTotal || 0)) || 0) +
                        (parseFloat(String(bill.igstTotal || 0)) || 0);

                      return (
                        <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#F8FAFC' } }}>
                          <TableCell sx={{ fontWeight: 800, color: '#B91C1C' }}>{bill.billNo}</TableCell>
                          <TableCell>{bill.date}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{bill.customerName}</TableCell>
                          <TableCell>
                            {bill.customerGst && bill.customerGst !== 'Unregistered' && bill.customerGst !== 'N/A' ? (
                              <Chip size="small" label={bill.customerGst} sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#EFF6FF', color: '#1E40AF' }} />
                            ) : (
                              <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>Unregistered</Typography>
                            )}
                          </TableCell>
                          <TableCell>{bill.placeOfSupply || 'Tamil Nadu (33)'}</TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                            ₹{taxableNum.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right', color: '#D97706', fontWeight: 600 }}>
                            ₹{taxTotalNum.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                            ₹{totalNum.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Tooltip title="Print Tax Invoice">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedBillForPrint(bill);
                                    setPrintModalOpen(true);
                                  }}
                                  sx={{ color: '#1E40AF' }}
                                >
                                  <PrintOutlinedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Invoice">
                                <IconButton size="small" onClick={() => handleDeleteHistory(bill)} sx={{ color: '#EF4444' }}>
                                  <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* GST Bill Print Modal */}
      <GstBillPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        bill={selectedBillForPrint}
      />
    </Box>
  );
};
