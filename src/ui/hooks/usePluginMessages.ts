import { useEffect, useRef } from 'react';
import type { ToUIMessage } from '../../types/messages';
import { DEFAULT_CONFIG } from '../../types/common';
import { useStore, deepMerge } from './useStore';
import type { PluginConfig } from '../../types/common';

export function usePluginMessages(): void {
  const {
    setAuditResult,
    setAdoptionResult,
    setProgress,
    setNotification,
    setSelection,
    setConfig,
    addFixedIssue,
    setDetectedLibraries,
    setLoadedLibrary,
    setIsLoadingLibrary,
    setLibraryScanResult,
    setIsScanningLibraries,
    setIsAuditing,
    setIsScanning,
    setFileName,
    setPageName,
    setFilePages,
  } = useStore();

  // Track notification timer to prevent memory leaks
  const notifyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function clearNotifyTimer() {
      if (notifyTimerRef.current) {
        clearTimeout(notifyTimerRef.current);
        notifyTimerRef.current = undefined;
      }
    }

    function scheduleNotifyClear(ms: number) {
      clearNotifyTimer();
      notifyTimerRef.current = setTimeout(() => setNotification(null), ms);
    }

    function handleMessage(event: MessageEvent) {
      const msg = event.data.pluginMessage as ToUIMessage | undefined;
      if (!msg) return;

      switch (msg.type) {
        case 'AUDIT_RESULTS':
          setAuditResult(msg.payload);
          setProgress(null);
          break;

        case 'ADOPTION_RESULTS':
          setAdoptionResult(msg.payload);
          setProgress(null);
          break;

        case 'PROGRESS_UPDATE':
          setProgress(msg.payload);
          break;

        case 'SELECTION_CHANGED':
          setSelection(msg.payload.count, msg.payload.nodeIds);
          break;

        case 'PAGE_CHANGED':
          setPageName(msg.payload.pageName);
          break;

        case 'FILE_INFO':
          setFileName(msg.payload.fileName);
          setPageName(msg.payload.pageName);
          break;

        case 'CONFIG_DATA': {
          const merged = deepMerge(
            DEFAULT_CONFIG as unknown as Record<string, unknown>,
            msg.payload
          ) as unknown as PluginConfig;
          setConfig(merged);
          break;
        }

        case 'USER_CONFIG_DATA': {
          // Merge user-specific preferences on top of the current config
          const currentConfig = useStore.getState().config;
          const mergedUser = deepMerge(
            currentConfig as unknown as Record<string, unknown>,
            msg.payload
          ) as unknown as PluginConfig;
          setConfig(mergedUser);
          break;
        }

        case 'NOTIFY':
          setNotification(msg.payload);
          scheduleNotifyClear(3000);
          break;

        case 'ERROR':
          setNotification({ message: msg.payload.message, type: 'error' });
          setProgress(null);
          setIsAuditing(false);
          setIsScanning(false);
          setIsLoadingLibrary(false);
          setIsScanningLibraries(false);
          scheduleNotifyClear(5000);
          break;

        case 'FIX_RESULT':
          if (msg.payload.success) {
            addFixedIssue(msg.payload.issueId);
            setNotification({ message: 'Issue fixed', type: 'success' });
          } else {
            setNotification({
              message: msg.payload.error || 'Fix failed',
              type: 'error',
            });
          }
          scheduleNotifyClear(3000);
          break;

        case 'FIX_ALL_RESULT':
          setNotification({
            message: `Fixed ${msg.payload.fixed}/${msg.payload.total} issues`,
            type: msg.payload.failed > 0 ? 'error' : 'success',
          });
          scheduleNotifyClear(3000);
          break;

        case 'LIBRARIES_DETECTED':
          setDetectedLibraries(msg.payload);
          break;

        case 'LIBRARY_SCAN_RESULTS':
          setLibraryScanResult(msg.payload);
          setProgress(null);
          break;

        case 'FILE_PAGES_LIST':
          setFilePages(msg.payload);
          break;

        case 'LIBRARY_LOADED':
          setLoadedLibrary(msg.payload);
          setProgress(null);
          setNotification({ message: `"${msg.payload.fileName}" loaded as source of truth`, type: 'success' });
          scheduleNotifyClear(3000);
          break;

        case 'LIBRARY_UNLOADED':
          setLoadedLibrary(null);
          setIsLoadingLibrary(false);
          setProgress(null);
          setNotification({ message: 'Library removed', type: 'info' });
          scheduleNotifyClear(3000);
          break;

        default:
          break;
      }
    }

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearNotifyTimer();
    };
  }, [setAuditResult, setAdoptionResult, setProgress, setNotification, setSelection, setConfig, addFixedIssue, setDetectedLibraries, setLoadedLibrary, setIsLoadingLibrary, setLibraryScanResult, setIsScanningLibraries, setIsAuditing, setIsScanning, setFileName, setPageName, setFilePages]);
}

export function postToPlugin(message: unknown): void {
  parent.postMessage({ pluginMessage: message }, '*');
}
