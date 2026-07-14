import { create } from 'zustand';

interface UiStore {
  selectedNodeId: string | null;
  isSidePanelOpen: boolean;
  selectNode: (nodeId: string | null) => void;
  openSidePanel: (nodeId: string) => void;
  closeSidePanel: () => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  selectedNodeId: null,
  isSidePanelOpen: false,

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  openSidePanel: (nodeId) => {
    set({ selectedNodeId: nodeId, isSidePanelOpen: true });
  },

  closeSidePanel: () => {
    set({ isSidePanelOpen: false });
  },
}));
