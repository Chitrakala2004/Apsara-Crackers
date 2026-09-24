import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { GstBillPrintTemplate, type GstBillPrintData } from './GstBillPrintTemplate';
import { printGstBillDirectly } from '../utils/printUtils';

interface GstBillPrintModalProps {
  open: boolean;
  onClose: () => void;
  bill: GstBillPrintData | null;
}

export const GstBillPrintModal: React.FC<GstBillPrintModalProps> = ({ open, onClose, bill }) => {
  if (!bill) return null;

  const handlePrint = () => {
    printGstBillDirectly(bill);
  };

  return (
    <>
      {/* Hidden print styling for A4 GST invoice fallback */}
      <style>
        {`
          @media print {
            body {
              visibility: hidden !important;
              background-color: #FFFFFF !important;
            }
            .gst-printable-area,
            .gst-printable-area * {
              visibility: visible !important;
            }
            .MuiDialog-root,
            .MuiDialog-container,
            .MuiDialog-paper,
            .MuiDialogContent-root {
              visibility: visible !important;
              position: static !important;
              display: block !important;
              max-height: none !important;
              height: auto !important;
              overflow: visible !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
            }
            .MuiBackdrop-root,
            .gst-no-print {
              display: none !important;
            }
            .gst-printable-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #FFFFFF !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .gst-print-copy {
              page-break-after: always !important;
              break-after: page !important;
              width: 100% !important;
            }
            .gst-print-copy:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
          }
        `}
      </style>

      {/* Screen Dialog */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        {/* Modal Top Bar */}
        <Box
          className="gst-no-print"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 1.8,
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            color: '#FFFFFF',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              GST Tax Invoice - #{bill.billNo || 'New'}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#FEE2E2', fontWeight: 500 }}>
              Customer: {bill.customerName || 'Walk-in'} | Date: {bill.date}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              disableElevation
              onClick={handlePrint}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: '18px !important', color: '#DC2626' }} />}
              sx={{
                backgroundColor: '#FFFFFF',
                color: '#DC2626',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                py: 0.6,
                borderRadius: '6px',
                '&:hover': {
                  backgroundColor: '#F8FAFC',
                },
              }}
            >
              Print 4 Copies
            </Button>
            <IconButton onClick={onClose} sx={{ color: '#FFFFFF', p: 0.5 }}>
              <CloseRoundedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Box>
        </Box>

        {/* 4 Copies Indicator Bar */}
        <Box
          className="gst-no-print"
          sx={{
            px: 3,
            py: 1.2,
            backgroundColor: '#FEF2F2',
            borderBottom: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LayersOutlinedIcon sx={{ fontSize: 18, color: '#B91C1C' }} />
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#991B1B' }}>
              Print Output:
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#7F1D1D', fontWeight: 500 }}>
              Single standard invoice — Automatically prints 4 identical copies (1 Page per Copy)
            </Typography>
          </Box>
          <Chip
            size="small"
            label="4 Copies Auto-Print"
            sx={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '11px',
            }}
          />
        </Box>

        {/* Print Preview Content */}
        <DialogContent
          sx={{
            p: { xs: 1.5, sm: 3 },
            backgroundColor: '#F1F5F9',
            maxHeight: '72vh',
            overflowY: 'auto',
          }}
        >
          <Box className="gst-printable-area">
            {/* Screen Preview (single copy for preview) */}
            <Box sx={{ '@media print': { display: 'none' } }}>
              <GstBillPrintTemplate bill={bill} />
            </Box>

            {/* Print Area for native Ctrl+P (4 identical copies) */}
            <Box sx={{ display: 'none', '@media print': { display: 'block' } }}>
              {[1, 2, 3, 4].map((copyNum) => (
                <Box
                  key={copyNum}
                  className="gst-print-copy"
                >
                  <GstBillPrintTemplate bill={bill} />
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>

        {/* Modal Action Bar */}
        <DialogActions
          className="gst-no-print"
          sx={{
            px: 3,
            py: 2,
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              color: '#475569',
              borderColor: '#CBD5E1',
              '&:hover': { borderColor: '#94A3B8', backgroundColor: '#F8FAFC' },
            }}
          >
            Close Preview
          </Button>

          <Button
            onClick={handlePrint}
            variant="contained"
            startIcon={<PrintOutlinedIcon />}
            sx={{
              backgroundColor: '#DC2626',
              px: 3,
              py: 1,
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              '&:hover': { backgroundColor: '#B91C1C' },
            }}
          >
            Print Tax Invoice (4 Copies)
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
