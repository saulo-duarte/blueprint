"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Konva from "konva";
import { useEditorStore, ToolType } from "@/store/useEditorStore";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/ModeToggle";

// Modular Components
import { SidebarAI } from "./SidebarAI";
import { SidebarProperties } from "./SidebarProperties";
import { EditorToolbar, TOOLS } from "./EditorToolbar";
import { EditorDialogs } from "./EditorDialogs";

const FloorPlanCanvas = dynamic(
  () => import("@/components/canvas/FloorPlanCanvas"),
  {
    ssr: false,
  },
);

export default function EditorLayout() {
  const [mounted, setMounted] = useState(false);
  const [isStairDialogOpen, setIsStairDialogOpen] = useState(false);
  const [isRefineDialogOpen, setIsRefineDialogOpen] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isConfirmAIOpen, setIsConfirmAIOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const currentTool = useEditorStore((state) => state.currentTool);
  const setCurrentTool = useEditorStore((state) => state.setCurrentTool);

  const setBackgroundImage = useEditorStore((state) => state.setBackgroundImage);
  const setShowBackgroundImage = useEditorStore((state) => state.setShowBackgroundImage);
  const loadAIStageConfig = useEditorStore((state) => state.loadAIStageConfig);
  const setIsUploading = useEditorStore((state) => state.setIsUploading);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setBackgroundImage(objectUrl);
    setShowBackgroundImage(true);
    
    setPendingFile(file);
    setIsConfirmAIOpen(true);
  };

  const pollTaskStatus = async (taskId: string) => {
    // Initial wait of 40 seconds as requested by the user
    console.log(`Waiting 40 seconds before first poll for task ${taskId}...`);
    await new Promise(resolve => setTimeout(resolve, 40000));

    let attempts = 0;
    const maxAttempts = 30; // 30 * 10s = 300s (5 minutes) limit

    while (attempts < maxAttempts) {
      console.log(`Polling task ${taskId} (Attempt ${attempts + 1})...`);
      const res = await fetch(`/api/vision/tasks/${taskId}`);
      if (!res.ok) {
        throw new Error("Erro ao verificar status do processamento");
      }

      const data = await res.json();
      if (data.status === "completed" && data.result) {
        return data.result;
      }

      if (data.status === "failed") {
        throw new Error(data.error || "O processamento da IA falhou");
      }

      // If status is "awaiting" or "processing", wait 10 seconds and poll again
      console.log(`Task status: ${data.status}. Waiting 10 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    }

    throw new Error("Tempo limite de processamento excedido (Timeout)");
  };

  const handleConfirmAI = async () => {
    if (!pendingFile) return;
    setIsConfirmAIOpen(false);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", pendingFile);

    try {
      const res = await fetch("/api/vision/map-floorplan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to start image processing");
      }
      
      const { task_id } = await res.json();
      if (!task_id) throw new Error("Não foi possível iniciar a tarefa de processamento");

      const result = await pollTaskStatus(task_id);
      loadAIStageConfig(result);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Erro ao processar imagem pela IA";
      alert(message);
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  const handleRefineWithAI = async () => {
    setIsRefineDialogOpen(false);
    
    // Find the Konva Stage and Layer
    const stage = Konva.stages.find(s => s.attrs.id === "main-stage");
    const layer = stage?.findOne("#main-layer") as Konva.Layer | undefined;
    
    if (!layer) {
      console.error("Could not find main-layer for cropping");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const { workArea } = useEditorStore.getState();
      
      // Capture only the workArea (the floorplan) regardless of zoom/pan
      const dataUrl = layer.toDataURL({
        x: workArea.x,
        y: workArea.y,
        width: workArea.width,
        height: workArea.height,
        pixelRatio: 2,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      const formData = new FormData();
      formData.append("file", blob, "canvas_state_refined.png");
      if (refinePrompt.trim() !== "") {
        formData.append("refinement_prompt", refinePrompt);
      }
      
      const response = await fetch("/api/vision/map-floorplan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start refined image processing");
      }
      
      const { task_id } = await response.json();
      if (!task_id) throw new Error("Não foi possível iniciar a tarefa de refinamento");

      const result = await pollTaskStatus(task_id);
      loadAIStageConfig(result);
    } catch (err: unknown) {
      console.error("Refinement error:", err);
      const message = err instanceof Error ? err.message : "Erro no refinamento da IA";
      alert(message);
    } finally {
      setIsUploading(false);
      setRefinePrompt("");
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToolSelect = useCallback((tool: ToolType) => {
    if (tool === "stair") {
      setIsStairDialogOpen(true);
    } else {
      setCurrentTool(tool);
    }
  }, [setCurrentTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      
      const toolIndex = parseInt(e.key) - 1;
      if (toolIndex >= 0 && toolIndex < TOOLS.length) {
        handleToolSelect(TOOLS[toolIndex].tool);
      }
      if (e.key === "h" || e.key === "H") {
        handleToolSelect("pan");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleToolSelect, undo, redo]);

  if (!mounted) return null;



  return (
    <div className="relative flex h-screen w-full bg-background overflow-hidden antialiased">
      <main className="absolute inset-0 z-0 bg-background">
        <FloorPlanCanvas />
      </main>

      <div className="absolute top-4 right-4 z-20">
        <div className="p-1 rounded-xl bg-card border border-border shadow-lg backdrop-blur-md opacity-90 hover:opacity-100 transition-opacity">
          <ModeToggle />
        </div>
      </div>

      <aside 
        className={cn(
          "absolute top-16 right-4 z-20 w-72 rounded-xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl p-4 transition-all duration-300 transform",
          "translate-x-0 opacity-100"
        )}
      >
        <SidebarAI 
          onFileUpload={handleFileUpload} 
          onOpenRefine={() => setIsRefineDialogOpen(true)} 
        />
        <SidebarProperties />
      </aside>

      <EditorToolbar currentTool={currentTool} onToolSelect={handleToolSelect} />

      <EditorDialogs 
        isStairDialogOpen={isStairDialogOpen}
        setIsStairDialogOpen={setIsStairDialogOpen}
        isRefineDialogOpen={isRefineDialogOpen}
        setIsRefineDialogOpen={setIsRefineDialogOpen}
        isConfirmAIOpen={isConfirmAIOpen}
        setIsConfirmAIOpen={setIsConfirmAIOpen}
        refinePrompt={refinePrompt}
        setRefinePrompt={setRefinePrompt}
        onRefine={handleRefineWithAI}
        onConfirmAI={handleConfirmAI}
        onCancelAI={() => {
          setIsConfirmAIOpen(false);
          setPendingFile(null);
        }}
      />
    </div>
  );
}
