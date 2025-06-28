import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { functions } from '../firebase'; // Assuming you export functions from firebase.ts
import { httpsCallable } from 'firebase/functions';

const SignUp = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('dealer');
    
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const requestRegistration = httpsCallable(functions, 'requestRegistration');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        if (password.length < 6) {
            setError(t('signUp.passwordLengthError'));
            setLoading(false);
            return;
        }

        try {
            await requestRegistration({ name, email, password, role });
            setMessage(t('signUp.successMessage'));
            setTimeout(() => navigate('/login'), 3000); // Redirect after 3 seconds
        } catch (err: any) {
            setError(err.message || t('signUp.errorMessage'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-xl">
                <h2 className="text-3xl font-bold text-center text-gray-800">{t('signUp.title')}</h2>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('signUp.namePlaceholder')} required className="input-field" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('signUp.emailPlaceholder')} required className="input-field" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('signUp.passwordPlaceholder')} required className="input-field" />
                    
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-medium text-gray-700">{t('signUp.roleTitle')}</legend>
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                                <input type="radio" name="role" value="dealer" checked={role === 'dealer'} onChange={(e) => setRole(e.target.value)} className="form-radio" />
                                <span className="ml-2">{t('signUp.roleDealer')}</span>
                            </label>
                            <label className="flex items-center">
                                <input type="radio" name="role" value="manager" checked={role === 'manager'} onChange={(e) => setRole(e.target.value)} className="form-radio" />
                                <span className="ml-2">{t('signUp.roleManager')}</span>
                            </label>
                        </div>
                    </fieldset>

                    {message && <p className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md">{message}</p>}
                    {error && <p className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">{error}</p>}

                    <button type="submit" className="w-full btn btn-primary" disabled={loading}>
                        {loading ? t('signUp.signingUpButton') : t('signUp.signUpButton')}
                    </button>
                </form>
                <div className="text-center">
                    <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                        {t('signUp.backToLogin')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
