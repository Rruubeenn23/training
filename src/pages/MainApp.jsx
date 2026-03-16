import React, { useState } from 'react';
import BottomNav from '../components/shared/BottomNav';
import Dashboard from '../components/dashboard/Dashboard';
import TrainingTab from '../components/training/TrainingTab';
import AICoach from '../components/AICoach';
import ProgressCharts from '../components/ProgressCharts';
import ProfilePage from './ProfilePage';
import { useAppData } from '../contexts/AppDataContext';

export default function MainApp() {
  const [tab, setTab] = useState('home');
  const { workoutLog, personalRecords, bodyMetrics, progressionTargets } = useAppData();

  const renderTab = () => {
    switch (tab) {
      case 'home':
        return <Dashboard onNavigate={setTab} />;

      case 'training':
        return <TrainingTab onNavigateToCoach={() => setTab('coach')} />;

      case 'coach':
        return <AICoach />;

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
