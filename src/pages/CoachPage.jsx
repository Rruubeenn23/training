import React from 'react';
import { useLocation } from 'react-router-dom';
import AICoach from '../components/AICoach';

export default function CoachPage() {
  const location = useLocation();
  const prefill = location.state?.prefill || '';
  return <AICoach preloadedMessage={prefill} />;
}
