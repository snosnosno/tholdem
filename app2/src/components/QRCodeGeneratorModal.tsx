import React, { useState } from 'react';
// import { httpsCallable } from 'firebase/functions'; // Disabled for mock implementation
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
// import { functions } from '../firebase'; // Disabled for mock implementation
import Modal from './Modal';
import { useToast } from '../hooks/useToast';

interface QRCodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  title?: string;
  description?: string;
}

const QRCodeGeneratorModal: React.FC<QRCodeGeneratorModalProps> = ({
  isOpen,
  onClose,
  eventId = 'default-event',
  title,
  description
}) => {
  const { t } = useTranslation();
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleGenerateQrCode = async () => {
    if (!eventId) {
            showError(t('attendance.messages.attendanceError'));
      return;
    }

    setIsGenerating(true);
    try {
      // TEMPORARY: Mock QR code generation to bypass CORS issue
      console.log('🚧 Using mock QR code generation due to CORS issue');
      
      // Generate a mock token for testing
      const mockToken = `mock-token-${Date.now()}`;
      const qrUrl = `${window.location.origin}/attend/${mockToken}`;
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setQrCodeValue(qrUrl);
      showSuccess(t('attendance.messages.qrCodeGenerated'));
      
      // TODO: Remove this mock implementation once CORS is fixed
      // Original code:
      // const generateTokenFunc = httpsCallable(functions, 'generateQrCodeToken');
      // const result = await generateTokenFunc({ eventId });
      // const token = (result.data as { token: string }).token;
      // if (token) { ... }
    } catch (error) {
      console.error('Error generating QR code:', error);
            showError(t('attendance.messages.attendanceError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setQrCodeValue(null);
    setIsGenerating(false);
    onClose();
  };

  const modalTitle = title || t('attendance.actions.generateQR');
  const modalDescription = description || t('eventDetail.qrModalDescription');

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={modalTitle}
    >
      <div className="p-6 flex flex-col items-center">
        <p className="mb-6 text-center text-gray-600">{modalDescription}</p>
        
        {!qrCodeValue && !isGenerating && (
          <button
            onClick={handleGenerateQrCode}
            className="mb-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            {t('attendance.actions.generateQR')}
          </button>
        )}
        
        {isGenerating && (
          <div className="mb-6 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-600">{t('eventDetail.qrGenerating')}</span>
          </div>
        )}
        
        {qrCodeValue && (
          <div className="mb-6">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
              <QRCodeSVG 
                value={qrCodeValue} 
                size={256}
                level="M"
                includeMargin
              />
            </div>
            <p className="mt-4 text-sm text-gray-500 text-center max-w-xs">
              {t('attendancePage.success')}
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3 w-full">
          {qrCodeValue && (
            <button
              onClick={() => {
                setQrCodeValue(null);
                setIsGenerating(false);
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              새로 생성
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default QRCodeGeneratorModal;