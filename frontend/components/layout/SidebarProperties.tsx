"use client";

import React from "react";
import { useEditorStore, StairType } from "@/store/useEditorStore";
import {
  Grid3X3,
  DoorOpen,
  MapPin,
  Lock,
  Unlock,
  ArrowUpToLine,
  Maximize2,
  FlipHorizontal,
  FlipVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SidebarProperties() {
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const polygons = useEditorStore((state) => state.polygons);
  const doors = useEditorStore((state) => state.doors);
  const pins = useEditorStore((state) => state.pins);
  const stairs = useEditorStore((state) => state.stairs);
  
  const updateStair = useEditorStore((state) => state.updateStair);
  const updatePolygonProperty = useEditorStore((state) => state.updatePolygonProperty);
  const updateDoorProperty = useEditorStore((state) => state.updateDoorProperty);
  const updateStairProperty = useEditorStore((state) => state.updateStairProperty);
  const mirrorSelectedObjects = useEditorStore((state) => state.mirrorSelectedObjects);
  const alignAndLinkPolygons = useEditorStore((state) => state.alignAndLinkPolygons);
  const alignSelectedPolygons = useEditorStore((state) => state.alignSelectedPolygons);
  const clearLinks = useEditorStore((state) => state.clearLinks);

  const isMulti = selectedObjectIds.length > 1;
  const firstId = selectedObjectIds[0];

  const selectedPoly = polygons.find(p => p.id === firstId);
  const selectedStair = stairs.find(s => s.id === firstId);
  const selectedDoor = doors.find(d => d.id === firstId);
  const selectedPin = pins.find(p => p.id === firstId);
  
  const hasPolygons = selectedObjectIds.some(id => polygons.some(p => p.id === id));

  return (
    <>
      <h2 className={cn(
        "text-sm font-bold mb-4 text-foreground uppercase tracking-widest opacity-60 transition-opacity",
        (!selectedPoly && !selectedStair && !selectedDoor && !selectedPin) && "opacity-20"
      )}>
        Properties {isMulti ? `(${selectedObjectIds.length})` : ""}
      </h2>

      {selectedObjectIds.length > 0 && (
        <div className="flex flex-col gap-2 mb-6 pb-6 border-b border-border/50">
          <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Transformações</label>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-[10px] h-8"
              onClick={() => mirrorSelectedObjects('x')}
            >
              <FlipHorizontal className="w-3 h-3 mr-1" />
              Espelhar H
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-[10px] h-8"
              onClick={() => mirrorSelectedObjects('y')}
            >
              <FlipVertical className="w-3 h-3 mr-1" />
              Espelhar V
            </Button>
          </div>
          {isMulti && hasPolygons && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex gap-1">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1 text-[10px] h-7 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  onClick={() => alignSelectedPolygons('top')}
                >
                  <ArrowUpToLine className="w-3 h-3 mr-1" />
                  Alinhar Topo
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1 text-[10px] h-7 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  onClick={() => alignSelectedPolygons('height')}
                >
                  <Maximize2 className="w-3 h-3 mr-1" />
                  Igualar Altura
                </Button>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full text-[10px] h-8 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                onClick={() => alignAndLinkPolygons()}
              >
                Vincular Paredes (Shared Wall)
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-[10px] h-7 text-muted-foreground hover:text-foreground"
                onClick={() => clearLinks()}
              >
                Limpar Vínculos
              </Button>
            </div>
          )}
        </div>
      )}
      
      {!isMulti && selectedPoly && (
        <div className="flex flex-col gap-5">
           <div className="space-y-1.5">
             <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Name</label>
             <Input 
               value={selectedPoly.name} 
               onChange={(e) => updatePolygonProperty(selectedPoly.id, "name", e.target.value)}
               className="h-9 text-sm bg-background/50 border-muted-foreground/20 focus:border-primary transition-all rounded-lg"
             />
           </div>
           
           <div className="flex items-center justify-between px-1">
             <span className="text-xs font-semibold text-foreground/80">Background Fill</span>
             <button 
              className={cn(
                "h-8 text-[11px] font-bold px-3 rounded-full transition-all border",
                selectedPoly.fillEnabled 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-transparent text-muted-foreground border-muted-foreground/20"
              )}
              onClick={() => updatePolygonProperty(selectedPoly.id, "fillEnabled", !selectedPoly.fillEnabled)}
             >
               {selectedPoly.fillEnabled ? "VISIBLE" : "HIDDEN"}
             </button>
           </div>

           <div className="flex items-center justify-between pt-4 border-t border-border/50">
             <span className="text-xs font-semibold text-foreground/80">Lock Hierarchy</span>
             <Button 
              variant="ghost" 
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg transition-transform hover:scale-110",
                selectedPoly.isLocked ? "text-primary bg-primary/10" : "text-muted-foreground"
              )}
              onClick={() => updatePolygonProperty(selectedPoly.id, "isLocked", !selectedPoly.isLocked)}
             >
               {selectedPoly.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
             </Button>
           </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-xs font-semibold text-foreground/80">Modo Conforme</span>
              <button 
               className={cn(
                 "h-8 text-[11px] font-bold px-3 rounded-full transition-all border shrink-0",
                 selectedPoly.isConforme 
                   ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-900/20" 
                   : "bg-transparent text-muted-foreground border-muted-foreground/20"
               )}
               onClick={() => updatePolygonProperty(selectedPoly.id, "isConforme", !selectedPoly.isConforme)}
              >
                {selectedPoly.isConforme ? "ATIVO" : "DESATIVO"}
              </button>
            </div>
           <div className="flex items-center justify-between pt-4 border-t border-border/50">
             <span className="text-xs font-semibold text-foreground/80">Show Labels</span>
             <button 
              className={cn(
                "h-8 text-[11px] font-bold px-3 rounded-full transition-all border",
                selectedPoly.showLabels 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-transparent text-muted-foreground border-muted-foreground/20"
              )}
              onClick={() => updatePolygonProperty(selectedPoly.id, "showLabels", !selectedPoly.showLabels)}
             >
               {selectedPoly.showLabels ? "ON" : "OFF"}
             </button>
           </div>
         </div>
      )}

      {!isMulti && selectedStair && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-primary" />
            Escada
          </h3>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase text-muted-foreground font-bold">Tipo</label>
            <select 
              className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-1 focus:ring-primary"
              value={selectedStair.type}
              onChange={(e) => updateStair(selectedStair.id, { type: e.target.value as StairType })}
            >
              <option value="straight">Reta</option>
              <option value="l-shape">Em L</option>
              <option value="u-shape">Em U</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase text-muted-foreground font-bold">Degraus: {selectedStair.steps}</label>
            <input 
              type="range" min="3" max="30" 
              className="w-full accent-primary"
              value={selectedStair.steps}
              onChange={(e) => updateStair(selectedStair.id, { steps: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-xs font-semibold text-foreground/80">Modo Conforme</span>
              <button 
               className={cn(
                 "h-8 text-[11px] font-bold px-3 rounded-full transition-all border shrink-0",
                 selectedStair.isConforme 
                   ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-900/20" 
                   : "bg-transparent text-muted-foreground border-muted-foreground/20"
               )}
               onClick={() => updateStairProperty(selectedStair.id, "isConforme", !selectedStair.isConforme)}
              >
                {selectedStair.isConforme ? "ATIVO" : "DESATIVO"}
              </button>
          </div>
        </div>
      )}

      {!isMulti && selectedDoor && (
         <div className="space-y-4">
           <h3 className="text-sm font-bold flex items-center gap-2">
             <DoorOpen className="w-4 h-4 text-primary" />
             Porta
           </h3>
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-xs font-semibold text-foreground/80">Modo Conforme</span>
              <button 
               className={cn(
                 "h-8 text-[11px] font-bold px-3 rounded-full transition-all border shrink-0",
                 selectedDoor.isConforme 
                   ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-900/20" 
                   : "bg-transparent text-muted-foreground border-muted-foreground/20"
               )}
               onClick={() => updateDoorProperty(selectedDoor.id, "isConforme", !selectedDoor.isConforme)}
              >
                {selectedDoor.isConforme ? "ATIVO" : "DESATIVO"}
              </button>
            </div>
           <div className="space-y-2">
              <label className="text-[10px] uppercase text-muted-foreground font-bold">Largura</label>
              <input 
                type="range" min="20" max="200" 
                className="w-full accent-primary"
                value={selectedDoor.width_norm * 400} // Approximate scale for UI
                onChange={() => {}} 
              />
            </div>
          </div>
      )}

      {!isMulti && selectedPin && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Pino / Defeito
          </h3>
          <div className="space-y-2">
            <label className="text-[10px] uppercase text-muted-foreground font-bold">Descrição</label>
            <textarea 
              className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary h-20 resize-none"
              value={selectedPin.description}
              onChange={() => {}} 
            />
          </div>
        </div>
      )}
    </>
  );
}
