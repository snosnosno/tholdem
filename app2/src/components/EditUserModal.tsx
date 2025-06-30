import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useTranslation } from 'react-i18next';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  experience?: string;
  notes?: string;
  nationality?: string;
  bankName?: string;
  bankAccount?: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Staff | null;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    experience: '',
    notes: '',
    nationality: '',
    bankName: '',
    bankAccount: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        role: user.role || '',
        experience: user.experience || '',
        notes: user.notes || '',
        nationality: user.nationality || '',
        bankName: user.bankName || '',
        bankAccount: user.bankAccount || '',
      });
    }
  }, [user]);

  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updateUser = httpsCallable(functions, 'updateUser');
      await updateUser({ uid: user.id, ...formData });
      alert(t('editUserModal.updateSuccess'));
      onClose();
    } catch (err: any) {
      console.error("Error updating user:", err);
      setError(err.message || t('editUserModal.updateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('editUserModal.title')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('editUserModal.labelName')}</label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('editUserModal.labelEmail')}</label>
            <input
              type="email"
              name="email"
              id="email"
              value={user.email}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              disabled
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">{t('editUserModal.labelRole')}</label>
            <select
              name="role"
              id="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md"
            >
              <option value="dealer">{t('roles.dealer')}</option>
              <option value="manager">{t('roles.manager')}</option>
              <option value="admin">{t('roles.admin')}</option>
              <option value="pending_manager">{t('roles.pending_manager')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">{t('profilePage.nationality', '국적')}</label>
            <input
              type="text"
              name="nationality"
              id="nationality"
              value={formData.nationality}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">{t('profilePage.bankName', '은행명')}</label>
            <input
              type="text"
              name="bankName"
              id="bankName"
              value={formData.bankName}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">{t('profilePage.bankAccount', '계좌번호')}</label>
            <input
              type="text"
              name="bankAccount"
              id="bankAccount"
              value={formData.bankAccount}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="experience" className="block text-sm font-medium text-gray-700">{t('profilePage.experience', '경력')}</label>
            <textarea
              name="experience"
              id="experience"
              value={formData.experience}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">{t('profilePage.notes', '기타 사항')}</label>
            <textarea
              name="notes"
              id="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;
