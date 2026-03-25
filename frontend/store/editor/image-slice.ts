import { StateCreator } from "zustand";
import type { EditorState, ImageSlice } from "./types";

export const createImageSlice: StateCreator<EditorState, [], [], ImageSlice> = (set) => ({
  backgroundImage: null,
  showBackgroundImage: true,
  isUploading: false,

  setIsUploading: (u) => set({ isUploading: u }),
  setBackgroundImage: (dataUrl) => set({ backgroundImage: dataUrl }),
  setShowBackgroundImage: (show) => set({ showBackgroundImage: show }),
  clearBackgroundImage: () => set({ backgroundImage: null, showBackgroundImage: false }),
  toggleBackgroundImage: () => set((state: EditorState) => ({ showBackgroundImage: !state.showBackgroundImage })),
});
