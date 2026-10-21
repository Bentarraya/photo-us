import React, { createContext, useContext, useState, useEffect } from 'react';
import { FILTERS_REGISTRY } from '../filters';
import { FRAMES_REGISTRY, getFrameById } from '../frames';
import { shotOptions, pickFrame, pickShots, randomize as randomizeLogic } from '../lib/selection';
import { playClickSound } from '../utils/sound';

const PhoContext = createContext();

export function PhoProvider({ children }) {
  const [filterId, setFilterId] = useState(() => {
    try {
      return localStorage.getItem('photobooth_filter_id') || FILTERS_REGISTRY[0].id;
    } catch {
      return FILTERS_REGISTRY[0].id;
    }
  });

  const [frameId, setFrameId] = useState(() => {
    try {
      return localStorage.getItem('photobooth_frame_id') || FRAMES_REGISTRY[0].id;
    } catch {
      return FRAMES_REGISTRY[0].id;
    }
  });

  const [shots, setShots] = useState(() => {
    try {
      const savedFrameId = localStorage.getItem('photobooth_frame_id') || FRAMES_REGISTRY[0].id;
      const initialFrame = getFrameById(savedFrameId);
      const savedShots = localStorage.getItem('photobooth_shots_per_strip');
      const parsed = savedShots ? parseInt(savedShots, 10) : null;
      if (parsed && initialFrame && initialFrame.allowedShots?.includes(parsed)) {
        return parsed;
      }
      return initialFrame?.defaultShots || 4;
    } catch {
      return 4;
    }
  });

  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const selectFilter = (id) => {
    setFilterId(id);
    try {
      localStorage.setItem('photobooth_filter_id', id);
    } catch {}
  };

  const selectFrame = (id) => {
    const { state, toast: t } = pickFrame(FRAMES_REGISTRY, { frameId, shots }, id);
    setFrameId(state.frameId);
    setShots(state.shots);
    if (t) setToast(t);
    try {
      localStorage.setItem('photobooth_frame_id', state.frameId);
      localStorage.setItem('photobooth_shots_per_strip', String(state.shots));
    } catch {}
  };

  const selectShots = (n) => {
    const { state, toast: t } = pickShots(FRAMES_REGISTRY, { frameId, shots }, n);
    setFrameId(state.frameId);
    setShots(state.shots);
    if (t) setToast(t);
    try {
      localStorage.setItem('photobooth_frame_id', state.frameId);
      localStorage.setItem('photobooth_shots_per_strip', String(state.shots));
    } catch {}
  };

  const randomize = () => {
    playClickSound();
    const { state, filterId: fId, toast: t } = randomizeLogic(FRAMES_REGISTRY, FILTERS_REGISTRY, { frameId, filterId, shots });
    setFrameId(state.frameId);
    setShots(state.shots);
    setFilterId(fId || state.filterId);
    if (t) setToast(t);
    try {
      localStorage.setItem('photobooth_frame_id', state.frameId);
      localStorage.setItem('photobooth_filter_id', fId || state.filterId);
      localStorage.setItem('photobooth_shots_per_strip', String(state.shots));
    } catch {}
  };

  const value = {
    filterId,
    frameId,
    shots,
    toast,
    selectFilter,
    selectFrame,
    selectShots,
    randomize,
    shotOptions: shotOptions(FRAMES_REGISTRY)
  };

  return <PhoContext.Provider value={value}>{children}</PhoContext.Provider>;
}

export const usePho = () => {
  const context = useContext(PhoContext);
  if (!context) throw new Error('usePho must be used within a PhoProvider');
  return context;
};
