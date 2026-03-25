import { StateCreator } from "zustand";
import type { 
  EditorState, ElementsSlice,
  PolygonShape, DoorShape, StairShape, PinShape, 
  Point, StairType, ClipboardEntry 
} from "./types";

export const createElementsSlice: StateCreator<EditorState, [], [], ElementsSlice> = (set) => ({
  polygons: [],
  doors: [],
  pins: [],
  stairs: [],
  stairType: "straight",
  clipboard: null,

  setStairType: (type) => set({ stairType: type }),

  updatePolygonProperty: (id, property, value) => set((state: EditorState) => {
    const historyUpdate = state.pushHistory(state);
    const updates: Partial<PolygonShape> = { [property]: value };
    if (property === 'isConforme' && value === true) {
      updates.isLocked = true;
    }
    return {
      ...historyUpdate,
      polygons: state.polygons.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    };
  }),

  updateDoorProperty: (id, property, value) => set((state: EditorState) => {
    const historyUpdate = state.pushHistory(state);
    const updates: Partial<DoorShape> = { [property]: value };
    if (property === 'isConforme' && value === true) {
      updates.isLocked = true;
    }
    return {
      ...historyUpdate,
      doors: state.doors.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    };
  }),

  updateStairProperty: (id, property, value) => set((state: EditorState) => {
    const historyUpdate = state.pushHistory(state);
    const updates: Partial<StairShape> = { [property]: value };
    if (property === 'isConforme' && value === true) {
      updates.isLocked = true;
    }
    return {
      ...historyUpdate,
      stairs: state.stairs.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    };
  }),

  finishDrawingPath: () => set((state: EditorState) => {
    if (state.drawingPathPoints.length < 3) return state;
    
    const newPolygon: PolygonShape = {
      id: `poly-${Date.now()}`,
      name: "Novo Ambiente",
      points: state.drawingPathPoints,
      color: "lavender",
      fillEnabled: false,
      showLabels: true,
      isLocked: false,
    };
    
    return {
      ...state.pushHistory(state),
      polygons: [...state.polygons, newPolygon],
      drawingPathPoints: [],
      selectedObjectIds: [newPolygon.id],
    };
  }),

  addPolygon: (poly) => set((state: EditorState) => ({
    ...state.pushHistory(state), polygons: [...state.polygons, poly] 
  })),
  addDoor: (door) => set((state: EditorState) => ({
    ...state.pushHistory(state), doors: [...state.doors, door] 
  })),
  addPin: (pin) => set((state: EditorState) => ({
    ...state.pushHistory(state), pins: [...state.pins, pin] 
  })),
  addStair: (stair) => set((state: EditorState) => ({
    ...state.pushHistory(state), stairs: [...state.stairs, stair]
  })),
  
  updatePolygonPoints: (id, points) => set((state: EditorState) => ({
    ...state.pushHistory(state),
    polygons: state.polygons.map((p: PolygonShape) => p.id === id ? { ...p, points } : p)
  })),
  updatePolygonPointsTransient: (id, points) => set((state: EditorState) => ({
    polygons: state.polygons.map((p: PolygonShape) => p.id === id ? { ...p, points } : p)
  })),
  updateStair: (id, updates) => set((state: EditorState) => ({
    ...state.pushHistory(state),
    stairs: state.stairs.map((s: StairShape) => s.id === id ? { ...s, ...updates } : s)
  })),

  updateObjectTransform: (id, type, updates) => set((state: EditorState) => {
    const historyUpdate = state.pushHistory(state);
    if (type === 'polygon') return { ...historyUpdate, polygons: state.polygons.map((p: PolygonShape) => p.id === id ? { ...p, ...updates } : p) };
    if (type === 'door') return { ...historyUpdate, doors: state.doors.map((p: DoorShape) => p.id === id ? { ...p, ...updates } : p) };
    if (type === 'stair') return { ...historyUpdate, stairs: state.stairs.map((p: StairShape) => p.id === id ? { ...p, ...updates } : p) };
    if (type === 'pin') return { ...historyUpdate, pins: state.pins.map((p: PinShape) => p.id === id ? { ...p, ...updates } : p) };
    return state;
  }),

  removeObject: () => set((state: EditorState) => ({
    ...state.pushHistory(state),
    polygons: state.polygons.filter((p: PolygonShape) => !state.selectedObjectIds.includes(p.id)),
    doors: state.doors.filter((d: DoorShape) => !state.selectedObjectIds.includes(d.id)),
    pins: state.pins.filter((p: PinShape) => !state.selectedObjectIds.includes(p.id)),
    stairs: state.stairs.filter((s: StairShape) => !state.selectedObjectIds.includes(s.id)),
    selectedObjectIds: [],
  })),

  copySelectedObject: () => set((state) => {
    const { selectedObjectIds, polygons, doors, pins, stairs } = state;
    if (selectedObjectIds.length === 0) return state;

    const id = selectedObjectIds[0];
    const poly = polygons.find((p: PolygonShape) => p.id === id);
    if (poly) return { clipboard: { type: 'polygon', data: { ...poly, points: poly.points.map((pt: Point) => ({ ...pt })) } } };

    const door = doors.find((d: DoorShape) => d.id === id);
    if (door) return { clipboard: { type: 'door', data: { ...door } } };

    const pin = pins.find((p: PinShape) => p.id === id);
    if (pin) return { clipboard: { type: 'pin', data: { ...pin } } };

    const stair = stairs.find((s: StairShape) => s.id === id);
    if (stair) return { clipboard: { type: 'stair', data: { ...stair } } };

    return state;
  }),

  pasteFromClipboard: () => set((state) => {
    if (!state.clipboard) return state;
    const historyUpdate = state.pushHistory(state);
    const offset = 0.02;
    const { type, data } = state.clipboard;

    if (type === 'polygon') {
      const newId = `poly-${Date.now()}`;
      const newPoly: PolygonShape = { ...data, id: newId, isConforme: false, isLocked: false, isAiGenerated: false, points: data.points.map((pt: Point) => ({ x: pt.x + offset, y: pt.y + offset })) };
      return { ...historyUpdate, polygons: [...state.polygons, newPoly], selectedObjectIds: [newId] };
    }
    if (type === 'door') {
      const newId = `door-${Date.now()}`;
      const newDoor: DoorShape = { ...data, id: newId, isConforme: false, isLocked: false, isAiGenerated: false, x_norm: data.x_norm + offset, y_norm: data.y_norm + offset };
      return { ...historyUpdate, doors: [...state.doors, newDoor], selectedObjectIds: [newId] };
    }
    if (type === 'pin') {
      const newId = `pin-${Date.now()}`;
      const newPin: PinShape = { ...data, id: newId, isLocked: false, x_norm: data.x_norm + offset, y_norm: data.y_norm + offset };
      return { ...historyUpdate, pins: [...state.pins, newPin], selectedObjectIds: [newId] };
    }
    if (type === 'stair') {
      const newId = `stair-${Date.now()}`;
      const newStair: StairShape = { ...data, id: newId, isConforme: false, isLocked: false, isAiGenerated: false, x_norm: data.x_norm + offset, y_norm: data.y_norm + offset };
      return { ...historyUpdate, stairs: [...state.stairs, newStair], selectedObjectIds: [newId] };
    }
    return state;
  }),

  mirrorSelectedObjects: (axis) => set((state) => {
    const { selectedObjectIds, polygons, doors, pins, stairs } = state;
    if (selectedObjectIds.length === 0) return state;
    const historyUpdate = state.pushHistory(state);
    
    const newPolygons = polygons.map((p: PolygonShape) => {
      if (!selectedObjectIds.includes(p.id)) return p;
      const minX = Math.min(...p.points.map((pt: Point) => pt.x));
      const maxX = Math.max(...p.points.map((pt: Point) => pt.x));
      const minY = Math.min(...p.points.map((pt: Point) => pt.y));
      const maxY = Math.max(...p.points.map((pt: Point) => pt.y));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      return { ...p, points: p.points.map((pt: Point) => ({ x: axis === 'x' ? 2 * centerX - pt.x : pt.x, y: axis === 'y' ? 2 * centerY - pt.y : pt.y })) };
    });

    const mirrorTransform = <T extends DoorShape | PinShape | StairShape>(obj: T): T => {
      if (!selectedObjectIds.includes(obj.id)) return obj;
      return { ...obj, scaleX: axis === 'x' ? (obj.scaleX ?? 1) * -1 : (obj.scaleX ?? 1), scaleY: axis === 'y' ? (obj.scaleY ?? 1) * -1 : (obj.scaleY ?? 1) };
    };

    return { ...historyUpdate, polygons: newPolygons, doors: doors.map(mirrorTransform), pins: pins.map(mirrorTransform), stairs: stairs.map(mirrorTransform) };
  }),

  alignAndLinkPolygons: () => set((state: EditorState) => {
    const selectedPolys = state.polygons.filter((p: PolygonShape) => state.selectedObjectIds.includes(p.id));
    if (selectedPolys.length < 2) return state;
    const historyUpdate = state.pushHistory(state);
    const p1 = selectedPolys[0];
    const p2 = selectedPolys[1];

    const getBBox = (pts: Point[]) => ({
      minX: Math.min(...pts.map((p: Point) => p.x)), maxX: Math.max(...pts.map((p: Point) => p.x)),
      minY: Math.min(...pts.map((p: Point) => p.y)), maxY: Math.max(...pts.map((p: Point) => p.y)),
    });

    const b1 = getBBox(p1.points);
    const b2 = getBBox(p2.points);
    const offset = { x: 0, y: 0 };
    const thresh = 0.05;

    if (Math.abs(b2.minX - b1.maxX) < thresh) offset.x = b1.maxX - b2.minX;
    else if (Math.abs(b1.minX - b2.maxX) < thresh) offset.x = b1.minX - b2.maxX;
    else if (Math.abs(b2.minY - b1.maxY) < thresh) offset.y = b1.maxY - b2.minY;
    else if (Math.abs(b1.minY - b2.maxY) < thresh) offset.y = b1.minY - b2.maxY;

    return { ...historyUpdate, polygons: state.polygons.map((p: PolygonShape) => {
      if (p.id === p1.id) return { ...p, fillEnabled: false };
      if (p.id === p2.id) return { ...p, points: p.points.map((pt: Point) => ({ x: pt.x + offset.x, y: pt.y + offset.y })), fillEnabled: false };
      return p;
    })};
  }),

  alignSelectedPolygons: (mode) => set((state: EditorState) => {
    const selectedPolys = state.polygons.filter((p: PolygonShape) => state.selectedObjectIds.includes(p.id));
    if (selectedPolys.length < 2) return state;
    const historyUpdate = state.pushHistory(state);
    const p1 = selectedPolys[0];
    const getBBox = (pts: Point[]) => ({
      minX: Math.min(...pts.map((p: Point) => p.x)), maxX: Math.max(...pts.map((p: Point) => p.x)),
      minY: Math.min(...pts.map((p: Point) => p.y)), maxY: Math.max(...pts.map((p: Point) => p.y)),
    });
    const b1 = getBBox(p1.points);

    return { ...historyUpdate, polygons: state.polygons.map((p: PolygonShape) => {
      if (p.id === p1.id || !state.selectedObjectIds.includes(p.id)) return p;
      const b = getBBox(p.points);
      const shift = { x: 0, y: 0 };
      if (mode === 'top') shift.y = b1.minY - b.minY;
      if (mode === 'bottom') shift.y = b1.maxY - b.maxY;
      if (mode === 'left') shift.x = b1.minX - b.minX;
      if (mode === 'right') shift.x = b1.maxX - b.maxX;
      
      if (mode === 'height' || mode === 'width') {
         const newPoints = p.points.map((pt: Point) => {
            const newPt = { ...pt };
            if (mode === 'height') {
               if (Math.abs(pt.y - b.minY) < 0.01) newPt.y = b1.minY;
               if (Math.abs(pt.y - b.maxY) < 0.01) newPt.y = b1.maxY;
            }
            if (mode === 'width') {
               if (Math.abs(pt.x - b.minX) < 0.01) newPt.x = b1.minX;
               if (Math.abs(pt.x - b.maxX) < 0.01) newPt.x = b1.maxX;
            }
            return newPt;
         });
         return { ...p, points: newPoints };
      }
      return { ...p, points: p.points.map((pt: Point) => ({ x: pt.x + shift.x, y: pt.y + shift.y })) };
    })};
  }),

  clearLinks: () => set((state: EditorState) => ({
    ...state.pushHistory(state),
    polygons: state.polygons.map((p: PolygonShape) => ({ ...p, invisibleEdges: [] }))
  })),

  importDetailedJSON: (data: Record<string, any>) => set((state: EditorState) => {
    const historyUpdate = state.pushHistory(state);
    
    // Project Name
    const newProjectName = (data.project_name as string) || (data.n as string) || state.projectName;

    // Map Rooms/Polygons
    const newPolygons: PolygonShape[] = ((data.rooms as Record<string, any>[]) || []).map((r) => ({
      id: (r.id as string) || `poly-${Date.now()}-${Math.random()}`,
      name: (r.name as string) || (r.n as string) || "Novo Ambiente",
      points: ((r.vertices || r.pts || r.points) as any[] || []).map((v) => ({
        x: Array.isArray(v) ? (v[0] as number) : (v.x as number),
        y: Array.isArray(v) ? (v[1] as number) : (v.y as number)
      })),
      color: (r.color_hint as string) || "lavender",
      fillEnabled: false,
      showLabels: true,
      isLocked: false,
      isAiGenerated: false
    }));

    // Map Doors
    const newDoors: DoorShape[] = ((data.doors as Record<string, any>[]) || []).map((d) => ({
      id: (d.id as string) || `door-${Date.now()}-${Math.random()}`,
      x_norm: (d.x_norm as number) ?? (Array.isArray(d.p) ? (d.p[0] as number) : ((d.x as number) ?? 0.5)),
      y_norm: (d.y_norm as number) ?? (Array.isArray(d.p) ? (d.p[1] as number) : ((d.y as number) ?? 0.5)),
      width_norm: (d.width_norm as number) ?? 0.05,
      rotation: (d.rotation as number) ?? (d.rot as number) ?? 0,
      isLocked: false,
      isAiGenerated: false
    }));

    // Map Stairs
    const newStairs: StairShape[] = ((data.stairs as Record<string, any>[]) || []).map((s) => ({
      id: (s.id as string) || `stair-${Date.now()}-${Math.random()}`,
      x_norm: (s.x_norm as number) ?? (Array.isArray(s.p) ? (s.p[0] as number) : ((s.x as number) ?? 0.5)),
      y_norm: (s.y_norm as number) ?? (Array.isArray(s.p) ? (s.p[1] as number) : ((s.y as number) ?? 0.5)),
      width_norm: (s.width_norm as number) ?? 0.1,
      length_norm: (s.length_norm as number) ?? 0.1,
      type: (s.type as any) || "straight",
      steps: (s.steps as number) || 10,
      rotation: (s.rotation as number) ?? (s.rot as number) ?? 0,
      isLocked: false,
      isAiGenerated: false
    }));

    return {
      ...historyUpdate,
      projectName: newProjectName,
      polygons: newPolygons,
      doors: newDoors,
      stairs: newStairs,
      pins: [], // Limpa pinos na importação completa por enquanto
      selectedObjectIds: []
    };
  }),
});
