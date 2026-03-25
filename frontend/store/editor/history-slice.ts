import { StateCreator } from "zustand";
import type { EditorState, HistorySlice, HistoryState } from "./types";

export const createHistorySlice: StateCreator<EditorState, [], [], HistorySlice> = (set) => ({
  history: [],
  future: [],

  pushHistory: (state: EditorState) => ({
    history: [...state.history, { 
      polygons: [...state.polygons], 
      doors: [...state.doors], 
      pins: [...state.pins], 
      stairs: [...state.stairs] 
    }].slice(-50),
    future: [] 
  }),

  commitHistory: () => set((state: EditorState) => ({
    history: [...state.history, { 
      polygons: [...state.polygons], 
      doors: [...state.doors], 
      pins: [...state.pins], 
      stairs: [...state.stairs] 
    }].slice(-50),
    future: []
  })),

  undo: () => set((state: EditorState) => {
    // If we're drawing, undo the last point first
    if (state.drawingPathPoints.length > 0) {
      return {
        drawingPathPoints: state.drawingPathPoints.slice(0, -1)
      };
    }

    if (state.history.length === 0) return state;
    const past = state.history[state.history.length - 1];
    const current = { 
      polygons: [...state.polygons], 
      doors: [...state.doors], 
      pins: [...state.pins], 
      stairs: [...state.stairs] 
    };
    
    return {
      polygons: past.polygons,
      doors: past.doors,
      pins: past.pins,
      stairs: past.stairs,
      history: state.history.slice(0, -1),
      future: [current, ...state.future].slice(0, 50),
      selectedObjectIds: []
    };
  }),

  redo: () => set((state: EditorState) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const current = { 
      polygons: [...state.polygons], 
      doors: [...state.doors], 
      pins: [...state.pins], 
      stairs: [...state.stairs] 
    };
    
    return {
      polygons: next.polygons,
      doors: next.doors,
      pins: next.pins,
      stairs: next.stairs,
      history: [...state.history, current].slice(-50),
      future: state.future.slice(1),
      selectedObjectIds: []
    };
  }),
});
