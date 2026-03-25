import { StateCreator } from "zustand";
import type { EditorState, AISlice, PolygonShape, DoorShape, StairShape } from "./types";

export const createAISlice: StateCreator<EditorState, [], [], AISlice> = (set) => ({
  isProcessingAI: false,
  pendingAIChanges: null,

  setIsProcessingAI: (p) => set({ isProcessingAI: p }),
  
  setPendingAIChanges: (changes) => set({ pendingAIChanges: changes }),

  applyAIChanges: () => set((state: EditorState) => {
    if (!state.pendingAIChanges) return state;

    const historyUpdate = state.pushHistory(state);
    
    // Simple replacement for now, as AI is expected to return the full set.
    // However, we could do more complex merging here if needed (preserving IDs).
    const newPolygons = state.pendingAIChanges.polygons.map((p: PolygonShape) => ({ ...p, isAiGenerated: true }));
    const newDoors = state.pendingAIChanges.doors.map((d: DoorShape) => ({ ...d, isAiGenerated: true }));
    const newStairs = state.pendingAIChanges.stairs.map((s: StairShape) => ({ ...s, isAiGenerated: true }));

    return {
      ...historyUpdate,
      polygons: newPolygons,
      doors: newDoors,
      stairs: newStairs,
      pendingAIChanges: null,
      selectedObjectIds: []
    };
  }),

  rejectAIChanges: () => set({ pendingAIChanges: null }),

  loadAIStageConfig: (data) => set(() => {
    // This now puts them into pending instead of immediate application
    return {
      pendingAIChanges: {
        polygons: data.polygons || [],
        doors: data.doors || [],
        stairs: data.stairs || []
      }
    };
  }),
});
