import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from 'react-i18next';

const AdminLogin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signIn(email, password);
      navigate("/");
    } catch (err: any) {
      if (err.code === 'auth/user-disabled') {
        setError(t('adminLogin.approvalPending'));
      } else {
        setError(t('adminLogin.errorMessage'));
      }
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">{t('adminLogin.title')}</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => i18n.changeLanguage('ko')} 
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${i18n.language.startsWith('ko') ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              한국어
            </button>
            <button 
              onClick={() => i18n.changeLanguage('en')} 
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${i18n.language.startsWith('en') ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              English
            </button>
          </div>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field"
              placeholder={t('adminLogin.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input-field"
              placeholder={t('adminLogin.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                {t('adminLogin.forgotPassword')}
              </Link>
            </div>
          </div>
          <div>
            <button type="submit" className="w-full btn btn-primary">
              {t('adminLogin.loginButton')}
            </button>
          </div>
        </form>
        <div className="text-sm text-center">
          <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            {t('adminLogin.noAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
