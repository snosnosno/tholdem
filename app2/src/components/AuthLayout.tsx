import React from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../logo.svg'; // 로고 이미지를 import 합니다.

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, children }) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: 'ko' | 'en') => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => changeLanguage('ko')}
          className={`px-3 py-1 text-sm font-medium rounded-md mr-2 ${i18n.language.startsWith('ko') ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          한국어
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-3 py-1 text-sm font-medium rounded-md ${i18n.language.startsWith('en') ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          English
        </button>
      </div>
      <div className="w-full max-w-md space-y-8">
        <div>
          <img className="mx-auto h-12 w-auto" src={logo} alt="Workflow" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
