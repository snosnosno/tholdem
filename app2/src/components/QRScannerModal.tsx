import React from 'react';
import QrScanner from 'react-qr-scanner';
import Modal from './Modal'; // Assuming a generic Modal component exists

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string | null) => void;
  onError: (error: any) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScan, onError }) => {

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
    <Modal isOpen={isOpen} onClose={onClose} title="QR Code Scanner">
      {isOpen && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <QrScanner
            delay={300}
            style={previewStyle}
            onError={handleError}
            onScan={handleScan}
          />
        </div>
      )}
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        Please scan the QR code for clock-in.
      </p>
    </Modal>
  );
};

export default QRScannerModal;
