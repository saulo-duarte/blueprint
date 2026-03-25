import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

interface BackendPoint {
  x: number;
  y: number;
}

interface BackendRoom {
  id: string;
  n?: string; // name
  pts?: (number[] | BackendPoint)[]; // points [x, y] or {x, y}
  vertices?: BackendPoint[];
  c?: string; // color_hint
}

interface BackendDoor {
  id: string;
  p?: number[]; // [x, y]
  x?: number;
  y?: number;
  rot?: number; // rotation
}

interface BackendStair {
  id: string;
  p?: number[];
  x?: number;
  y?: number;
  w?: number;
  l?: number;
  t?: string;
  s?: number;
  rot?: number;
}

interface BackendResponse {
  n?: string; // project_name
  rooms?: BackendRoom[];
  doors?: BackendDoor[];
  stairs?: BackendStair[];
}

interface TaskResponse {
    id: string;
    status: string;
    result?: BackendResponse;
    error?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/vision/tasks/${id}`, {
        cache: 'no-store'
    });
    
    if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch task status" }, { status: response.status });
    }

    const task: TaskResponse = await response.json();

    if (task.status === "completed" && task.result) {
        const data = task.result;
        const mappedData = {
            project_name: data.n || "New Project",
            polygons: (data.rooms || []).map((room: BackendRoom) => ({
              id: room.id || `poly-${Math.random().toString(36).substr(2, 9)}`,
              name: room.n || "Ambiente",
              points: (room.pts || room.vertices || []).map((v: number[] | BackendPoint) => ({
                x: Array.isArray(v) ? v[0] : (v as BackendPoint).x,
                y: Array.isArray(v) ? v[1] : (v as BackendPoint).y
              })),
              color: room.c || "lavender",
            })),
            doors: (data.doors || []).map((door: BackendDoor) => ({
              id: door.id || `door-${Math.random().toString(36).substr(2, 9)}`,
              x_norm: Array.isArray(door.p) ? door.p[0] : door.x,
              y_norm: Array.isArray(door.p) ? door.p[1] : door.y,
              rotation: door.rot,
            })),
            stairs: (data.stairs || []).map((stair: BackendStair) => ({
              id: stair.id || `stair-${Math.random().toString(36).substr(2, 9)}`,
              x_norm: Array.isArray(stair.p) ? stair.p[0] : stair.x,
              y_norm: Array.isArray(stair.p) ? stair.p[1] : stair.y,
              width_norm: stair.w,
              length_norm: stair.l,
              type: stair.t,
              steps: stair.s,
              rotation: stair.rot,
            })),
          };
          return NextResponse.json({ status: task.status, result: mappedData });
    }

    return NextResponse.json(task);
  } catch (error: unknown) {
    console.error("BFF Task Status Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Connection to Go Backend failed: ${message}` }, { status: 500 });
  }
}
