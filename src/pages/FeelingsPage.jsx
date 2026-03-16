import React from 'react';
import { useNavigate } from 'react-router-dom';
import FeelingsLog from '../components/FeelingsLog';

export default function FeelingsPage() {
  const navigate = useNavigate();
  return <FeelingsLog onClose={() => navigate('/home')} />;
}
