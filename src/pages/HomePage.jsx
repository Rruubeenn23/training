import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';

export default function HomePage() {
  const navigate = useNavigate();

  const handleNavigate = (target) => {
    const map = {
      home: '/home',
      training: '/training',
      coach: '/coach',
      progress: '/progress',
      profile: '/profile',
      feelings: '/feelings',
      nutrition: '/nutrition',
    };
    navigate(map[target] || '/home');
  };

  return <Dashboard onNavigate={handleNavigate} />;
}
