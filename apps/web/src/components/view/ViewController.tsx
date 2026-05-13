"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

export interface ViewRegistration {
  title: string;
  description?: string;
  content: ReactNode;
}

export interface ViewActions {
  onReset?: () => void;
  onApply?: () => void;
}

interface ViewControllerContextValue {
  registerView: (view: ViewRegistration | null) => void;
  setViewActions: (actions: ViewActions | null) => void;
  openView: () => void;
  closeView: () => void;
  toggleView: () => void;
  isViewOpen: boolean;
  view: ViewRegistration | null;
  actions: ViewActions | null;
}

const ViewControllerContext = createContext<ViewControllerContextValue | null>(null);

export function ViewControllerProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewRegistration | null>(null);
  const [actions, setActions] = useState<ViewActions | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const registerView = useCallback((nextView: ViewRegistration | null) => {
    setView(nextView);
    if (!nextView) {
      setActions(null);
      setIsViewOpen(false);
    }
  }, []);

  const setViewActions = useCallback((nextActions: ViewActions | null) => {
    setActions(nextActions);
  }, []);

  const openView = useCallback(() => {
    setIsViewOpen(true);
  }, []);

  const closeView = useCallback(() => {
    setIsViewOpen(false);
  }, []);

  const toggleView = useCallback(() => {
    setIsViewOpen((previous) => !previous);
  }, []);

  const value = useMemo(
    () => ({
      registerView,
      setViewActions,
      openView,
      closeView,
      toggleView,
      isViewOpen,
      view,
      actions
    }),
    [actions, closeView, isViewOpen, openView, registerView, setViewActions, toggleView, view]
  );

  return <ViewControllerContext.Provider value={value}>{children}</ViewControllerContext.Provider>;
}

export function useViewController() {
  const context = useContext(ViewControllerContext);
  if (!context) {
    throw new Error("useViewController must be used within a ViewControllerProvider");
  }

  return context;
}
