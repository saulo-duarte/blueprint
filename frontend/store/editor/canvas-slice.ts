import { StateCreator } from "zustand";
import type { EditorState, CanvasSlice } from "./types";

export const createCanvasSlice: StateCreator<EditorState, [], [], CanvasSlice> = (set, get) => ({
  projectName: "Novo Projeto",
  currentTool: "select",
  selectedObjectIds: [],
  scale: 1,
  stagePos: { x: 0, y: 0 },
  workArea: { x: 0, y: 0, width: 0, height: 0 },
  drawingPathPoints: [],

  setCurrentTool: (tool) => set({ currentTool: tool }),
  setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),
  toggleSelection: (id, isMulti) => {
    const { selectedObjectIds } = get();
    if (isMulti) {
      if (selectedObjectIds.includes(id)) {
        set({ selectedObjectIds: selectedObjectIds.filter((i) => i !== id) });
      } else {
        set({ selectedObjectIds: [...selectedObjectIds, id] });
      }
    } else {
      set({ selectedObjectIds: [id] });
    }
  },
  setScale: (scale) => set({ scale }),
  setStagePos: (pos) => set({ stagePos: pos }),
  setWorkArea: (wa) => set({ workArea: wa }),
  addPointToPath: (p) => set((s) => ({ drawingPathPoints: [...s.drawingPathPoints, p] })),
  undoLastPathPoint: () => set((state: EditorState) => ({
    drawingPathPoints: state.drawingPathPoints.slice(0, -1)
  })),
  setProjectName: (name) => set({ projectName: name }),
});
