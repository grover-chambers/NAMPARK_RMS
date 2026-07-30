"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShow(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((result: any) => {
      if (result.outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    });
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 flex items-start gap-3 animate-slide-up">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-700 to-green-800 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-serif font-bold text-lg">K</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Install Nampark RMS</p>
          <p className="text-xs text-slate-500 mt-0.5">Add to home screen for quick access</p>
          <button
            onClick={handleInstall}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-white bg-teal-600 px-3 py-1.5 rounded-lg hover:bg-teal-700"
          >
            <Download size={14} />
            Install
          </button>
        </div>
        <button
          onClick={() => setShow(false)}
          className="p-1 rounded hover:bg-slate-100 text-slate-400"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
