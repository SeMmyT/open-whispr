import React, { useEffect } from "react";
import "./index.css";
import { X } from "lucide-react";
import { useToast } from "./components/ui/Toast";
import { useAudioRecording } from "./hooks/useAudioRecording";

// Recording pulse animation
const RecordingDot = () => {
  return (
    <div className="relative flex items-center justify-center">
      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
      <div className="absolute w-4 h-4 bg-red-500/30 rounded-full animate-ping" />
    </div>
  );
};

// Processing spinner animation
const ProcessingSpinner = () => {
  return (
    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
  );
};

export default function App() {
  const { toast } = useToast();

  const setWindowInteractivity = React.useCallback((shouldCapture) => {
    window.electronAPI?.setMainWindowInteractivity?.(shouldCapture);
  }, []);

  // Cleanup: ensure interactivity is reset on unmount
  useEffect(() => {
    return () => setWindowInteractivity(false);
  }, [setWindowInteractivity]);

  const { isRecording, isProcessing, cancelRecording } = useAudioRecording(toast);

  // Show/hide window based on state
  useEffect(() => {
    if (isRecording || isProcessing) {
      window.electronAPI?.showRecordingIndicator?.();
      setWindowInteractivity(true);
    } else {
      window.electronAPI?.hideRecordingIndicator?.();
      setWindowInteractivity(false);
    }
  }, [isRecording, isProcessing, setWindowInteractivity]);

  // Only render when recording or processing
  if (!isRecording && !isProcessing) {
    return null;
  }

  const handleCancel = () => {
    cancelRecording();
  };

  return (
    <div className="fixed inset-0 flex items-end justify-center pb-2">
      {/* iOS-style pill indicator */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5
                   bg-black/85 backdrop-blur-md rounded-full
                   border border-white/10 shadow-2xl
                   animate-slide-up"
        style={{ minWidth: "180px" }}
      >
        {/* Left: Status indicator and text */}
        <div className="flex items-center gap-2.5">
          {isRecording ? <RecordingDot /> : <ProcessingSpinner />}
          <span className="text-white text-sm font-medium whitespace-nowrap">
            {isRecording ? "Recording..." : "Processing..."}
          </span>
        </div>

        {/* Right: Cancel button (only during recording) */}
        {isRecording && (
          <button
            onClick={handleCancel}
            className="flex items-center justify-center w-6 h-6 rounded-full
                       bg-white/10 hover:bg-red-500/80
                       transition-colors duration-150"
            aria-label="Cancel recording"
          >
            <X size={14} strokeWidth={2.5} className="text-white/70 hover:text-white" />
          </button>
        )}
      </div>

      {/* CSS for slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
