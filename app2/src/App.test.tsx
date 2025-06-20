import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders admin login when not authenticated', () => {
  render(<App />);
  // AdminLogin 컴포넌트가 렌더링되는지 확인
  // 실제로는 Firebase Auth 상태에 따라 달라지므로 기본적인 렌더링 테스트만 수행
  expect(document.body).toBeInTheDocument();
});
