import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120; 
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

interface BackendPoint {
  x: number;
  y: number;
}

interface BackendRoom {
  id: string;
  n?: string; // name
  pts?: any[]; // points [x, y] or {x, y}
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forward request to Go Backend (Multi-Agent Pipeline)
    console.log(`Forwarding request to Go Backend: ${BACKEND_URL}/api/v1/vision/map-floorplan`);
    
    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const response = await fetch(`${BACKEND_URL}/api/v1/vision/map-floorplan-async`, {
      method: "POST",
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Go Backend error:", errorData);
      return NextResponse.json(
        { error: errorData.error || "Go Backend failed to process the image" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error("BFF Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Connection to Go Backend failed: ${message}` }, { status: 500 });
  }
}
