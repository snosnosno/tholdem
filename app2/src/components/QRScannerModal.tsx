import React from 'react';
// @ts-ignore
import { useTranslation } from 'react-i18next';
import QrScanner from 'react-qr-scanner';

import Modal from './Modal';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string | null) => void;
  onError: (error: any) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScan, onError }) => {
  const { t } = useTranslation();

  const handleScan = (data: { text: string } | null) => {
    if (data) {
      onScan(data.text);
    }
  };

  const handleError = (err: any) => {
    onError(err);
    console.error(err);
  };

  const previewStyle = {
    height: 240,
    width: 320,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('qrScannerModal.title')}>
      {isOpen ? <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <QrScanner
            delay={300}
            style={previewStyle}
            onError={handleError}
            onScan={handleScan}
          />
        </div> : null}
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        {t('qrScannerModal.scanMessage')}
      </p>
    </Modal>
  );
};

export default QRScannerModal;