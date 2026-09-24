import React from 'react';
import defaultApsaraLogo from '../assets/logo.png';
import { getStoredSettings } from './SettingsPage';
import { numberToIndianWords } from '../utils/numberToWords';

export interface GstProductItem {
  particular: string;
  hsnCode?: string;
  quantity: string | number;
  unit?: string;
  rate: string | number;
  discount?: string | number;
  taxableAmount?: string | number;
  gstRate: string | number; // e.g. 18
  cgst?: string | number;
  sgst?: string | number;
  igst?: string | number;
  amount: string | number;
}

export interface GstBillPrintData {
  billNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  customerAadhar?: string;
  customerState?: string;
  customerStateCode?: string;
  placeOfSupply?: string;
  reverseCharge?: string;
  vehicleNo?: string;
  ewayBillNo?: string;
  transport?: string;
  caseCount?: string | number;
  companyName?: string;
  products: GstProductItem[];
  subtotal?: string | number;
  gstRate?: string | number;
  discount?: string | number;
  transportCharges?: string | number;
  packingCharges?: string | number;
  cgstTotal?: string | number;
  sgstTotal?: string | number;
  igstTotal?: string | number;
  roundOff?: string | number;
  total: string | number;
  paymentStatus?: string;
  paymentMode?: string;
  paidAmount?: string | number;
  invoiceCopy?: string;
}

interface GstBillPrintTemplateProps {
  bill: GstBillPrintData;
}

export const GstBillPrintTemplate: React.FC<GstBillPrintTemplateProps> = ({ bill }) => {
  const [storeSettings, setStoreSettings] = React.useState(() => getStoredSettings());

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    window.addEventListener('apsara_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('apsara_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const rawComp =
    bill.companyName && bill.companyName.trim() !== '' && bill.companyName !== 'General'
      ? bill.companyName
      : storeSettings.companyName || 'Apsara Crackers';
  const displayCompanyName =
    rawComp.toLowerCase().includes('varun') || rawComp.toLowerCase().includes('dheeksha')
      ? (storeSettings.companyName || 'Apsara Crackers')
      : rawComp;

  // Address
  const defaultAddress = '67 - H/E, Rajivgandhi Nagar, Near Ramji Polypack, Sivakasi Bus Stand , Sivakasi';
  const rawAddress = (storeSettings.address && storeSettings.address.trim())
    ? storeSettings.address.trim()
    : defaultAddress;
  const cleanAddress = (rawAddress.toLowerCase().includes('tirupur') || rawAddress.toLowerCase().includes('varun'))
    ? defaultAddress
    : rawAddress;
  const addressParts: string[] = [cleanAddress];
  if (storeSettings.pincode && storeSettings.pincode.trim() && !cleanAddress.includes(storeSettings.pincode.trim())) {
    addressParts.push(`PIN: ${storeSettings.pincode.trim()}`);
  }
  const fullAddressLine = addressParts.join(' - ');

  // Contact line (Phone numbers: 9843067073, 8778429299)
  const phone1 = (storeSettings.phone && !storeSettings.phone.includes('98765')) ? storeSettings.phone.trim() : '9843067073';
  const phone2 = (storeSettings.whatsapp && !storeSettings.whatsapp.includes('98765')) ? storeSettings.whatsapp.trim() : '8778429299';
  const phoneNumbersList = Array.from(new Set([phone1, phone2].filter(Boolean))).join(', ');
  const contactParts: string[] = [`Cell: ${phoneNumbersList}`];
  if (storeSettings.email && storeSettings.email.trim()) {
    contactParts.push(`Email: ${storeSettings.email.trim()}`);
  }
  const contactLine = contactParts.join(' | ');

  // Inter-state check (if IGST is present or placeOfSupply differs from supplier state)
  const isInterState = (parseFloat(String(bill.igstTotal || 0)) > 0) ||
    Boolean(bill.placeOfSupply && storeSettings.state && !bill.placeOfSupply.toLowerCase().includes(storeSettings.state.toLowerCase()));

  // Calculations
  const totalAmountNum = parseFloat(String(bill.total || '0').replace(/,/g, '')) || 0;
  const taxableSum = (bill.products || []).reduce((sum, p) => {
    const tVal = parseFloat(String(p.taxableAmount || p.amount || 0));
    return sum + (isNaN(tVal) ? 0 : tVal);
  }, 0);

  return (
    <div
      className="gst-bill-container"
      style={{
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        border: '1.5px solid #000000',
        boxSizing: 'border-box',
        fontSize: '11.5px',
      }}
    >
      {/* Top Banner: TAX INVOICE & GSTIN */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 12px',
          borderBottom: '1.5px solid #000000',
          backgroundColor: '#F8FAFC',
          fontWeight: 700,
        }}
      >
        <span style={{ fontSize: '11px', color: '#334155' }}>
          GSTIN: <strong>{storeSettings.gstin || '33ABCDE1234F1Z5'}</strong>
        </span>
        <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.08em', color: '#000000' }}>
          TAX INVOICE
        </span>
        <span style={{ fontSize: '10.5px', color: '#475569' }}>ORIGINAL FOR RECIPIENT</span>
      </div>

      {/* Header: Company Info */}
      <div
        style={{
          textAlign: 'center',
          padding: '10px 16px 8px 16px',
          borderBottom: '1.5px solid #000000',
        }}
      >
        {(storeSettings.logoUrl || defaultApsaraLogo) && (
          <div style={{ marginBottom: '3px' }}>
            <img
              src={storeSettings.logoUrl || defaultApsaraLogo}
              alt="Logo"
              style={{ maxHeight: '46px', maxWidth: '150px', objectFit: 'contain' }}
            />
          </div>
        )}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            margin: '0 0 2px 0',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: '#000000',
          }}
        >
          {displayCompanyName}
        </h1>
        {storeSettings.tagline && (
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', fontStyle: 'italic', marginBottom: '2px' }}>
            "{storeSettings.tagline}"
          </div>
        )}
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{fullAddressLine}</div>
        {contactLine && (
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
            {contactLine}
          </div>
        )}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
          State: <strong>{storeSettings.state || 'Tamil Nadu'} (State Code: 33)</strong> | PAN:{' '}
          <strong>{storeSettings.pan || '-'}</strong>
        </div>
      </div>

      {/* Bill Metadata Block with Boxed Lines */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderBottom: '1.5px solid #000000',
          fontSize: '12px',
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: '50%', border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Bill No:</span>
              <strong style={{ color: '#000000' }}>{bill.billNo || '-'}</strong>
            </td>
            <td style={{ width: '50%', border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Date:</span>
              <strong style={{ color: '#000000' }}>{bill.date || '-'}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000000', padding: '5px 10px' }}>
              <div>
                <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Customer Name:</span>
                <strong style={{ color: '#000000' }}>{bill.customerName || '-'}</strong>
              </div>
              {((bill.customerPhone && bill.customerPhone !== 'N/A' && bill.customerPhone !== '-') ||
                (bill.customerAddress && bill.customerAddress !== 'N/A' && bill.customerAddress !== '-')) && (
                <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px', fontWeight: 500 }}>
                  {[
                    bill.customerPhone && bill.customerPhone !== 'N/A' && bill.customerPhone !== '-' ? `Ph: ${bill.customerPhone}` : '',
                    bill.customerAddress && bill.customerAddress !== 'N/A' && bill.customerAddress !== '-' ? bill.customerAddress : '',
                  ]
                    .filter(Boolean)
                    .join(' | ')}
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                <span style={{ color: '#475569' }}>GSTIN:</span> <strong>{bill.customerGst || 'Unregistered'}</strong>
                {bill.customerState && (
                  <span style={{ marginLeft: '8px' }}>
                    | State: <strong>{bill.customerState} {bill.customerStateCode ? `(${bill.customerStateCode})` : '(33)'}</strong>
                  </span>
                )}
              </div>
            </td>
            <td style={{ border: '1px solid #000000', padding: '5px 10px' }}>
              <div>
                <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Company Name:</span>
                <strong style={{ color: '#000000' }}>{displayCompanyName}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                <span style={{ color: '#475569' }}>Place of Supply:</span>{' '}
                <strong>{bill.placeOfSupply || bill.customerState || storeSettings.state || 'Tamil Nadu (33)'}</strong>
              </div>
              {bill.reverseCharge && (
                <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                  <span style={{ color: '#475569' }}>Reverse Charge:</span> <strong>{bill.reverseCharge}</strong>
                </div>
              )}
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Transport:</span>
              <strong style={{ color: '#000000' }}>{bill.transport || '-'}</strong>
              {bill.vehicleNo && <span style={{ marginLeft: '8px' }}>| Veh No: <strong>{bill.vehicleNo}</strong></span>}
            </td>
            <td style={{ border: '1px solid #000000', padding: '5px 10px' }}>
              <span style={{ color: '#475569', fontWeight: 500, marginRight: '4px' }}>Total No. of Cases:</span>
              <strong style={{ color: '#000000' }}>{bill.caseCount || '1'}</strong>
              {bill.ewayBillNo && <span style={{ marginLeft: '8px' }}>| E-Way: <strong>{bill.ewayBillNo}</strong></span>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Products Table with Boxed Rows */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderBottom: '1.5px solid #000000',
          fontSize: '11.5px',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC' }}>
            <th style={{ width: '5%', border: '1px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>
              Sl.No
            </th>
            <th style={{ width: '43%', border: '1px solid #000000', padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>
              Particular
            </th>
            <th style={{ width: '10%', border: '1px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>
              HSN/SAC
            </th>
            <th style={{ width: '10%', border: '1px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>
              Quantity
            </th>
            <th style={{ width: '10%', border: '1px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>
              Pkt / Unit
            </th>
            <th style={{ width: '10%', border: '1px solid #000000', padding: '6px 6px', textAlign: 'right', fontWeight: 700 }}>
              Rate (₹)
            </th>
            <th style={{ width: '12%', border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {(bill.products || []).length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#64748B', border: '1px solid #000000' }}>
                No items added in GST Invoice
              </td>
            </tr>
          ) : (
            (bill.products || []).map((item, idx) => {
              const numRate = parseFloat(String(item.rate || 0)) || 0;
              const numTotal = parseFloat(String(item.amount || (parseFloat(String(item.quantity || 0)) * numRate))) || 0;

              return (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '5px 4px' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #000000', padding: '5px 8px', fontWeight: 600 }}>{item.particular}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '5px 4px' }}>{item.hsnCode || '3604'}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '5px 4px' }}>{item.quantity}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '5px 4px' }}>{item.unit || 'Box'}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '5px 6px' }}>{numRate.toFixed(2)}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '5px 8px', fontWeight: 700 }}>{numTotal.toFixed(2)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Footer Section: Signatory Left + GST & Amount Totals Right */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1.5px solid #000000',
        }}
      >
        {/* Left Column: Signatory & Words */}
        <div
          style={{
            flex: '1 1 50%',
            borderRight: '1.5px solid #000000',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            boxSizing: 'border-box',
            minHeight: '140px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
            Thank you for your business!
          </div>
          <div style={{ fontSize: '10.5px', color: '#1E293B', marginBottom: '22px', lineHeight: 1.35 }}>
            <span style={{ color: '#64748B' }}>Total Amount in Words:</span>{' '}
            <strong>{numberToIndianWords(totalAmountNum)}</strong>
          </div>
          <div
            style={{
              fontSize: '11.5px',
              color: '#000000',
              borderTop: '1px dashed #000000',
              display: 'inline-block',
              paddingTop: '4px',
              minWidth: '180px',
            }}
          >
            <div style={{ fontWeight: 800, color: '#000000' }}>For {displayCompanyName}</div>
            <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
              {storeSettings.ownerName ? `(${storeSettings.ownerName}) ` : ''}Authorized Signatory
            </div>
          </div>
        </div>

        {/* Right Column: Calculation Summary Table */}
        <div style={{ flex: '1 1 50%', padding: 0, boxSizing: 'border-box' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12.5px',
            }}
          >
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000000', padding: '5px 10px', fontWeight: 500, color: '#334155' }}>
                  Particular Amount
                </td>
                <td style={{ border: '1px solid #000000', padding: '5px 10px', textAlign: 'right', fontWeight: 600, color: '#000000' }}>
                  {taxableSum.toFixed(2)}
                </td>
              </tr>
              {!isInterState ? (
                <>
                  <tr>
                    <td style={{ border: '1px solid #000000', padding: '5px 10px', fontWeight: 500, color: '#334155' }}>
                      CGST {bill.gstRate ? `(${(parseFloat(String(bill.gstRate)) / 2).toFixed(1)}%)` : ''}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 10px', textAlign: 'right', fontWeight: 600, color: '#000000' }}>
                      {(parseFloat(String(bill.cgstTotal || 0)) || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000000', padding: '5px 10px', fontWeight: 500, color: '#334155' }}>
                      SGST {bill.gstRate ? `(${(parseFloat(String(bill.gstRate)) / 2).toFixed(1)}%)` : ''}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 10px', textAlign: 'right', fontWeight: 600, color: '#000000' }}>
                      {(parseFloat(String(bill.sgstTotal || 0)) || 0).toFixed(2)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '5px 10px', fontWeight: 500, color: '#334155' }}>
                    IGST {bill.gstRate ? `(${bill.gstRate}%)` : ''}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '5px 10px', textAlign: 'right', fontWeight: 600, color: '#000000' }}>
                    {(parseFloat(String(bill.igstTotal || 0)) || 0).toFixed(2)}
                  </td>
                </tr>
              )}
              {bill.roundOff && bill.roundOff !== '0' && bill.roundOff !== '0.00' && (
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '5px 10px', fontWeight: 500, color: '#334155' }}>
                    Round Off
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '5px 10px', textAlign: 'right', fontWeight: 600, color: '#000000' }}>
                    {bill.roundOff}
                  </td>
                </tr>
              )}
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <td style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '7px 10px', fontWeight: 800 }}>
                  Total Amount
                </td>
                <td style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '7px 10px', textAlign: 'right', fontSize: '13.5px', fontWeight: 800 }}>
                  ₹{totalAmountNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
