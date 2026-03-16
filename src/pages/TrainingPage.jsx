import React from 'react';
import { useNavigate } from 'react-router-dom';
import TrainingTab from '../components/training/TrainingTab';

export default function TrainingPage() {
  const navigate = useNavigate();
  return (
    <TrainingTab onNavigateToCoach={(prefill) => navigate('/coach', { state: { prefill } })} />
  );
}
