export interface Point {
  x: number;
  y: number;
}

export interface PolygonShape {
  id: string;
  name: string;
  points: Point[]; // Coordenadas Normalizadas (0-1)
  x_norm?: number;
  y_norm?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  color: string;
  fillEnabled?: boolean;
  showLabels?: boolean;
  isLocked?: boolean;
  isAiGenerated?: boolean;
  isConforme?: boolean;
  invisibleEdges?: number[];
}

export interface DoorShape {
  id: string;
  x_norm: number;
  y_norm: number;
  width_norm: number;
  scaleX?: number;
  scaleY?: number;
  rotation: number;
  isLocked?: boolean;
  isAiGenerated?: boolean;
  isConforme?: boolean;
}

export type StairType = "straight" | "l-shape" | "u-shape" | "circular" | "arched";

export interface StairShape {
  id: string;
  x_norm: number;
  y_norm: number;
  width_norm: number;
  length_norm: number;
  type: StairType;
  steps: number;
  scaleX?: number;
  scaleY?: number;
  rotation: number;
  isLocked?: boolean;
  isAiGenerated?: boolean;
  isConforme?: boolean;
}

export interface PinShape {
  id: string;
  x_norm: number;
  y_norm: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  description: string;
  isLocked?: boolean;
}

export type ToolType = "select" | "draw_path" | "rectangle" | "door" | "pin" | "pan" | "stair";

export type ClipboardEntry =
  | { type: 'polygon'; data: PolygonShape }
  | { type: 'door'; data: DoorShape }
  | { type: 'pin'; data: PinShape }
  | { type: 'stair'; data: StairShape };

export interface HistoryState {
  polygons: PolygonShape[];
  doors: DoorShape[];
  pins: PinShape[];
  stairs: StairShape[];
}

// Slice Interfaces
export interface CanvasSlice {
  projectName: string;
  currentTool: ToolType;
  selectedObjectIds: string[];
  scale: number;
  stagePos: { x: number; y: number };
  workArea: { x: number; y: number; width: number; height: number };
  drawingPathPoints: Point[];
  
  setCurrentTool: (tool: ToolType) => void;
  setSelectedObjectIds: (ids: string[]) => void;
  toggleSelection: (id: string, isMulti: boolean) => void;
  setScale: (scale: number) => void;
  setStagePos: (pos: { x: number; y: number }) => void;
  setWorkArea: (wa: { x: number; y: number; width: number; height: number }) => void;
  addPointToPath: (p: Point) => void;
  undoLastPathPoint: () => void;
  setProjectName: (name: string) => void;
}

export interface ImageSlice {
  backgroundImage: string | null;
  showBackgroundImage: boolean;
  isUploading: boolean;
  
  setIsUploading: (uploading: boolean) => void;
  setBackgroundImage: (dataUrl: string | null) => void;
  setShowBackgroundImage: (show: boolean) => void;
  clearBackgroundImage: () => void;
  toggleBackgroundImage: () => void;
}

export interface HistorySlice {
  history: HistoryState[];
  future: HistoryState[];
  
  pushHistory: (state: EditorState) => Partial<EditorState>;
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export interface ElementsSlice {
  polygons: PolygonShape[];
  doors: DoorShape[];
  pins: PinShape[];
  stairs: StairShape[];
  stairType: StairType;
  clipboard: ClipboardEntry | null;

  setStairType: (type: StairType) => void;
  updatePolygonProperty: <K extends keyof PolygonShape>(id: string, property: K, value: PolygonShape[K]) => void;
  updateDoorProperty: <K extends keyof DoorShape>(id: string, property: K, value: DoorShape[K]) => void;
  updateStairProperty: <K extends keyof StairShape>(id: string, property: K, value: StairShape[K]) => void;
  
  finishDrawingPath: () => void;
  addPolygon: (polygon: PolygonShape) => void;
  addDoor: (door: DoorShape) => void;
  addPin: (pin: PinShape) => void;
  addStair: (stair: StairShape) => void;
  
  updatePolygonPoints: (id: string, points: Point[]) => void;
  updatePolygonPointsTransient: (id: string, points: Point[]) => void;
  updateStair: (id: string, updates: Partial<StairShape>) => void;
  removeObject: () => void;
  
  updateObjectTransform: (
    id: string,
    type: 'polygon' | 'door' | 'stair' | 'pin',
    updates: { x_norm?: number; y_norm?: number; scaleX?: number; scaleY?: number; rotation?: number }
  ) => void;
  
  mirrorSelectedObjects: (axis: 'x' | 'y') => void;
  alignAndLinkPolygons: () => void;
  alignSelectedPolygons: (mode: 'top' | 'bottom' | 'left' | 'right' | 'height' | 'width') => void;
  clearLinks: () => void;
  
  copySelectedObject: () => void;
  pasteFromClipboard: () => void;
  importDetailedJSON: (data: Record<string, any>) => void;
}

export interface AISlice {
  isProcessingAI: boolean;
  pendingAIChanges: {
    polygons: PolygonShape[];
    doors: DoorShape[];
    stairs: StairShape[];
  } | null;

  setIsProcessingAI: (processing: boolean) => void;
  setPendingAIChanges: (changes: { polygons: PolygonShape[], doors: DoorShape[], stairs: StairShape[] } | null) => void;
  applyAIChanges: () => void;
  rejectAIChanges: () => void;
  loadAIStageConfig: (data: { polygons: PolygonShape[], doors: DoorShape[], stairs: StairShape[] }) => void;
}

export type EditorState = CanvasSlice & HistorySlice & ElementsSlice & AISlice & ImageSlice;
