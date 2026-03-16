import React, { useState } from 'react';
import BottomNav from '../components/shared/BottomNav';
import Dashboard from '../components/dashboard/Dashboard';
import TrainingTab from '../components/training/TrainingTab';
import AICoach from '../components/AICoach';
import ProgressCharts from '../components/ProgressCharts';
import ProfilePage from './ProfilePage';
import FeelingsLog from '../components/FeelingsLog';
import NutritionLog from '../components/NutritionLog';
import { useAppData } from '../contexts/AppDataContext';

export default function MainApp() {
  const [tab, setTab] = useState('home');
  const [coachPrefill, setCoachPrefill] = useState('');
  const { workoutLog, personalRecords, bodyMetrics, progressionTargets } = useAppData();

  const goToCoach = (prefill) => {
    setCoachPrefill(prefill || '');
    setTab('coach');
  };

  const renderTab = () => {
    switch (tab) {
      case 'home':
        return <Dashboard onNavigate={setTab} />;

      case 'training':
        return <TrainingTab onNavigateToCoach={goToCoach} />;

      case 'coach':
        return <AICoach preloadedMessage={coachPrefill} />;

      case 'progress':
        return (
          <div className="pb-24">
            <ProgressCharts
              workoutLogs={workoutLog}
              personalRecords={personalRecords}
              bodyMetrics={bodyMetrics}
              progressionTargets={progressionTargets}
            />
          </div>
        );

      case 'feelings':
        return <FeelingsLog onClose={() => setTab('home')} />;

      case 'nutrition':
        return <NutritionLog onClose={() => setTab('home')} />;

      case 'profile':
        return <ProfilePage />;

      default:
        return <Dashboard onNavigate={setTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="flex-1 overflow-y-auto">
        {renderTab()}
      </div>
      <BottomNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
