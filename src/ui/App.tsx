import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { ProgressBar } from './components/ProgressBar';
import { Notification } from './components/Notification';
import { ResizeHandle } from './components/ResizeHandle';
import { AuditTab } from './tabs/AuditTab';
import { AdoptionTab } from './tabs/AdoptionTab';
import { SettingsTab } from './tabs/SettingsTab';
import { useStore } from './hooks/useStore';
import { usePluginMessages, postToPlugin } from './hooks/usePluginMessages';

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const pageTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

export function App() {
  usePluginMessages();

  const { activeTab, setActiveTab, progress, notification, setNotification } = useStore();

  useEffect(() => {
    postToPlugin({ type: 'UI_READY' });
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-figma-bg">
        <Header onTabChange={setActiveTab} />
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <AnimatePresence mode="wait">
          {progress && <ProgressBar key="progress" progress={progress} />}
        </AnimatePresence>

        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="h-full"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              {activeTab === 'audit' && <AuditTab />}
              {activeTab === 'adoption' && <AdoptionTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Notification toast — positioned per tab */}
        <AnimatePresence>
          {notification && (
            <Notification
              key="notification"
              message={notification.message}
              type={notification.type}
              position={activeTab === 'audit' ? 'top' : 'bottom'}
              onDismiss={() => setNotification(null)}
            />
          )}
        </AnimatePresence>

        <ResizeHandle />
      </div>
    </ErrorBoundary>
  );
}
