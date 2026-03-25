"use client";

import React from "react";
import { ToolType } from "@/store/useEditorStore";
import { 
  MousePointer2, 
  PenTool, 
  Square, 
  DoorOpen, 
  MapPin, 
  Hand, 
  Grid3X3 
} from "lucide-react";
import { cn } from "@/lib/utils";

export const TOOLS: {
  tool: ToolType;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
}[] = [
  {
    tool: "select",
    label: "Selection",
    icon: <MousePointer2 size={18} />,
    shortcut: "1",
  },
  {
    tool: "draw_path",
    label: "Draw Path",
    icon: <PenTool size={18} />,
    shortcut: "2",
  },
  {
    tool: "rectangle",
    label: "Rectangle",
    icon: <Square size={18} />,
    shortcut: "3",
  },
  { tool: "door", label: "Door", icon: <DoorOpen size={18} />, shortcut: "4" },
  { tool: "pin", label: "Pin", icon: <MapPin size={18} />, shortcut: "5" },
  { tool: "pan", label: "Pan", icon: <Hand size={18} />, shortcut: "6" },
  { tool: "stair", label: "Escada", icon: <Grid3X3 size={18} />, shortcut: "7" },
];

interface EditorToolbarProps {
  currentTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
}

export function EditorToolbar({ currentTool, onToolSelect }: EditorToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
      <nav className="flex items-center gap-1.5 p-1.5 rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl ring-1 ring-white/10">
        {TOOLS.map((t) => {
          const isActive = currentTool === t.tool;
          return (
            <button
              key={t.tool}
              onClick={() => onToolSelect(t.tool)}
              title={`${t.label} (${t.shortcut})`}
              className={cn(
                "relative group flex flex-col items-center gap-1 h-12 w-14 rounded-xl transition-all duration-200 outline-none cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="mt-2.5 transition-transform group-hover:scale-110">
                {t.icon}
              </div>
              <span className={cn(
                "text-[9px] font-black leading-none mb-1 opacity-50",
                isActive && "opacity-100"
              )}>
                {t.shortcut}
              </span>
              
              {isActive && (
                <span className="absolute -bottom-1 w-6 h-1 bg-primary-foreground rounded-full opacity-40 shadow-sm" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
