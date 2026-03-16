import React from 'react';
import { useNavigate } from 'react-router-dom';
import NutritionLog from '../components/NutritionLog';

export default function NutritionPage() {
  const navigate = useNavigate();
  return <NutritionLog onClose={() => navigate('/home')} />;
}
