"use client";

import React from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { UploadCloud, Loader2, Eye, EyeOff, RefreshCcw, Check, X, Sparkles, Download, FileJson } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { compactDataset } from "@/store/editor/export-utils";
import { toast } from "sonner";

interface SidebarAIProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenRefine: () => void;
}

export function SidebarAI({ onFileUpload, onOpenRefine }: SidebarAIProps) {
  const projectName = useEditorStore((state) => state.projectName);
  const setProjectName = useEditorStore((state) => state.setProjectName);
  const isUploading = useEditorStore((state) => state.isUploading);
  const backgroundImage = useEditorStore((state) => state.backgroundImage);
  const showBackgroundImage = useEditorStore((state) => state.showBackgroundImage);
  const setShowBackgroundImage = useEditorStore((state) => state.setShowBackgroundImage);
  const clearBackgroundImage = useEditorStore((state) => state.clearBackgroundImage);
  const polygons = useEditorStore((state) => state.polygons);
  const doors = useEditorStore((state) => state.doors);
  const stairs = useEditorStore((state) => state.stairs);
  const pendingAIChanges = useEditorStore((state) => state.pendingAIChanges);
  const applyAIChanges = useEditorStore((state) => state.applyAIChanges);
  const rejectAIChanges = useEditorStore((state) => state.rejectAIChanges);

  const handleCompactExport = () => {
    const state = useEditorStore.getState();
    const compact = compactDataset(state);
    const json = JSON.stringify(compact, null, 2);
    
    // Copy to clipboard (UX bonus)
    navigator.clipboard.writeText(json);
    
    // Trigger download
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan_sdr_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("JSON SDR exportado e copiado!");
  };

  const handleExportGoldenDataset = () => {
    const exportData = {
      project_name: "Golden Dataset Export",
      rooms: polygons.map(p => ({
        id: p.id,
        name: p.name,
        type: p.points.length === 4 ? "rect" : "polygon",
        vertices: p.points,
        color_hint: p.color
      })),
      doors: doors.map(d => ({
        id: d.id,
        x: d.x_norm,
        y: d.y_norm,
        rotation: d.rotation
      })),
      stairs: stairs.map(s => ({
        id: s.id,
        x: s.x_norm,
        y: s.y_norm,
        width: s.width_norm,
        length: s.length_norm,
        type: s.type,
        steps: s.steps,
        rotation: s.rotation
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `golden_dataset_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        useEditorStore.getState().importDetailedJSON(json);
        toast.success("Planta importada com sucesso!");
      } catch (err) {
        console.error("Erro ao importar JSON:", err);
        toast.error("Erro ao importar JSON: Formato inválido.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  };

  return (
    <div className="mb-6 space-y-3 border-b border-border/50 pb-4">
      <h2 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
        <UploadCloud size={16} className="text-primary" />
        AI Assistant
      </h2>
      
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Upload de Imagem</label>
        <Input 
          type="file" 
          accept="image/*" 
          className="text-xs file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-2 file:py-1 cursor-pointer" 
          onChange={onFileUpload}
          disabled={isUploading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Importar Dados (JSON)</label>
        <Input 
          type="file" 
          accept="application/json" 
          className="text-xs file:bg-secondary file:text-secondary-foreground file:border-0 file:rounded-md file:px-2 file:py-1 cursor-pointer" 
          onChange={handleImportJSON}
        />
      </div>
      {isUploading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" /> Processando com Claude 4.6 Sonnet...
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-2 pt-2">
        {backgroundImage && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-[10px] flex gap-2 h-8"
            onClick={() => setShowBackgroundImage(!showBackgroundImage)}
          >
            {showBackgroundImage ? <EyeOff size={12}/> : <Eye size={12}/>}
            {showBackgroundImage ? "Ocultar Planta" : "Mostrar Planta"}
          </Button>
        )}

        {/* Golden Dataset Export Button */}
        {(polygons.length > 0 || doors.length > 0) && (
          <div className="flex flex-col gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Nome do Projeto</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Apartamento 302"
                className="h-7 text-[10px] bg-background/50"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-[10px] flex gap-2 h-8 bg-ctp-green/10 text-ctp-green hover:bg-ctp-green/20 border-ctp-green/20"
                onClick={handleExportGoldenDataset}
              >
                <Download size={12}/>
                JSON Full
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-[10px] flex gap-2 h-8 bg-ctp-blue/10 text-ctp-blue hover:bg-ctp-blue/20 border-ctp-blue/20"
                onClick={handleCompactExport}
              >
                <FileJson size={12}/>
                JSON SDR
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Refinement Loop Button */}
      {polygons.length > 0 && !isUploading && (
        <Button
          variant="default"
          size="sm"
          className="w-full text-xs flex gap-2 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg shadow-indigo-900/20"
          onClick={onOpenRefine}
        >
          <RefreshCcw size={14}/>
          Enviar Tela p/ IA Refinar
        </Button>
      )}

      {backgroundImage && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-[10px] flex gap-2 text-destructive hover:bg-destructive/10 h-7"
          onClick={() => {
            if(confirm("Deseja realmente remover a imagem de fundo?")) {
               clearBackgroundImage();
            }
          }}
        >
          Remover Planta Original
        </Button>
      )}

      {/* AI Review UI (Ghost Mode Controls) */}
      {pendingAIChanges && (
        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Sparkles size={14} />
            Sugestões da IA Prontas
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            A IA mapeou {pendingAIChanges.polygons.length} ambientes e {pendingAIChanges.doors.length} portas. Revise as linhas pontilhadas no mapa.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              variant="default" 
              className="h-8 text-[10px] bg-green-600 hover:bg-green-700 text-white border-0"
              onClick={applyAIChanges}
            >
              <Check size={12} className="mr-1" /> Aceitar
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 text-[10px] border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={rejectAIChanges}
            >
              <X size={12} className="mr-1" /> Descartar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
