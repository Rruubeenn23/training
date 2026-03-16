import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressCharts from '../components/ProgressCharts';
import { useAppData } from '../contexts/AppDataContext';

export default function ProgressPage() {
  const navigate = useNavigate();
  const { workoutLog, personalRecords, bodyMetrics, progressionTargets } = useAppData();

  return (
    <div className="pb-24">
      <ProgressCharts
        workoutLogs={workoutLog}
        personalRecords={personalRecords}
        bodyMetrics={bodyMetrics}
        progressionTargets={progressionTargets}
        onClose={() => navigate('/home')}
      />
    </div>
  );
}
