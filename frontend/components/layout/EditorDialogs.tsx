"use client";

import React from "react";
import { useEditorStore } from "@/store/useEditorStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorDialogsProps {
  isStairDialogOpen: boolean;
  setIsStairDialogOpen: (open: boolean) => void;
  isRefineDialogOpen: boolean;
  setIsRefineDialogOpen: (open: boolean) => void;
  isConfirmAIOpen: boolean;
  setIsConfirmAIOpen: (open: boolean) => void;
  refinePrompt: string;
  setRefinePrompt: (val: string) => void;
  onRefine: () => void;
  onConfirmAI: () => void;
  onCancelAI: () => void;
}

export function EditorDialogs({
  isStairDialogOpen,
  setIsStairDialogOpen,
  isRefineDialogOpen,
  setIsRefineDialogOpen,
  isConfirmAIOpen,
  setIsConfirmAIOpen,
  refinePrompt,
  setRefinePrompt,
  onRefine,
  onConfirmAI,
  onCancelAI,
}: EditorDialogsProps) {
  const setCurrentTool = useEditorStore((state) => state.setCurrentTool);
  const stairType = useEditorStore((state) => state.stairType);
  const setStairType = useEditorStore((state) => state.setStairType);

  return (
    <>
      <Dialog open={isStairDialogOpen} onOpenChange={setIsStairDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tipo de Escada</DialogTitle>
            <DialogDescription>
              Selecione o tipo de escada que você deseja inserir na planta.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {([
              { id: "straight", label: "Reta" },
              { id: "l-shape", label: "Em L" },
              { id: "u-shape", label: "Em U" },
              { id: "circular", label: "Circular" },
              { id: "arched", label: "Arqueada" },
            ] as const).map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setStairType(type.id);
                  setCurrentTool("stair");
                  setIsStairDialogOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                  stairType === type.id && "border-primary bg-primary/10"
                )}
              >
                <Grid3X3 className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRefineDialogOpen} onOpenChange={setIsRefineDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Refinar Mapeamento com IA</DialogTitle>
            <DialogDescription>
              A IA vai analisar o desenho atual e ajustá-lo com base nas suas diretrizes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <label className="text-sm font-medium">O que você deseja ajustar?</label>
            <textarea
              className="w-full h-24 p-2 border border-border rounded-md text-sm bg-background/50 focus:ring-1 focus:ring-primary outline-none resize-none"
              placeholder="Ex: As paredes da cozinha não foram mapeadas corretamente. Estenda a parede da direita em 2 metros."
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRefineDialogOpen(false)}>Cancelar</Button>
            <Button 
               onClick={onRefine}
               className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Enviar Instrução
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmAIOpen} onOpenChange={setIsConfirmAIOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mapear com IA?</DialogTitle>
            <DialogDescription>
              Você deseja enviar esta planta para a IA realizar o mapeamento automático dos ambientes?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancelAI}>
              Não, apenas usar planta
            </Button>
            <Button 
               onClick={onConfirmAI}
               className="bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            >
              Sim, mapear com IA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
