import { create } from "zustand";
import { createCanvasSlice } from "./canvas-slice";
import { createHistorySlice } from "./history-slice";
import { createElementsSlice } from "./elements-slice";
import { createAISlice } from "./ai-slice";
import { createImageSlice } from "./image-slice";
import type { EditorState } from "./types";

export const useEditorStore = create<EditorState>()((...a) => ({
  ...createCanvasSlice(...a),
  ...createHistorySlice(...a),
  ...createElementsSlice(...a),
  ...createAISlice(...a),
  ...createImageSlice(...a),
}));

// Export types for easier access
export * from "./types";
