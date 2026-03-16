import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../components/shared/BottomNav';

const TAB_TO_PATH = {
  home: '/home',
  training: '/training',
  coach: '/coach',
  progress: '/progress',
  profile: '/profile',
};

const PATH_TO_TAB = Object.entries(TAB_TO_PATH).reduce((acc, [tab, path]) => {
  acc[path] = tab;
  return acc;
}, {});

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = PATH_TO_TAB[location.pathname] || 'home';

  const handleTabChange = (tabId) => {
    const path = TAB_TO_PATH[tabId] || '/home';
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
