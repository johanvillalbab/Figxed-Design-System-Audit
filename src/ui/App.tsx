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
import { LibrariesTab } from './tabs/LibrariesTab';
import { SettingsTab } from './tabs/SettingsTab';
import { useStore } from './hooks/useStore';
import { usePluginMessages, postToPlugin } from './hooks/usePluginMessages';

const pageVariants = {
  initial: { opacity: 0, y: 8, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -4, filter: 'blur(2px)' },
};

const pageTransition = {
  duration: 0.3,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
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
              {activeTab === 'libraries' && <LibrariesTab />}
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
