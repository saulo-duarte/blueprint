---
name: dataset-compactor-logic
description: Regras para converter o estado do Canvas (Konva) em um JSON minimalista (SDR) para o Golden Dataset. Foco em redução de tokens e precisão geométrica.
---

# Logic: High-Performance JSON Compactor

Esta regra define como transformar o estado interno do `useEditorStore` em um formato otimizado para o Claude 4.6, removendo ruídos de UI e encurtando a estrutura de dados.

## 1. Regras de Transformação (Mapping)

### 1.1 Coordenadas e Escala
- **Precisão:** Use `toFixed(4)` para todas as coordenadas `x` e `y`. Converta de volta para `Number` para evitar aspas no JSON.
- **Rotação:** Use `toFixed(1)` para o campo `rotation`.
- **Formato:** Transforme objetos `{x, y}` em arrays simples `[x, y]`.

### 1.2 Simplificação de Nomenclatura (Minificação Semântica)
Para economizar tokens, use chaves curtas que mantêm o sentido:
- `name` -> `n`
- `vertices` ou `points` -> `pts`
- `position` (x, y) -> `p`
- `rotation` (ou `rot`) -> `rot`

### 1.3 Limpeza de Metadados
**Remova obrigatoriamente:** `id`, `type`, `color_hint`, `isDraggable`, `opacity`, `stroke`, `strokeWidth`. A IA deve focar apenas na **geometria e rótulo**.

## 2. Snippet de Referência (TypeScript)

O Agente deve implementar a função de exportação seguindo este padrão:

```typescript
const compactDataset = (state: EditorStore) => {
  return {
    n: state.projectName || "Export", // Nota: Verifique se projectName existe ou use um fallback
    rooms: state.polygons.map(room => ({
      n: room.name,
      pts: room.points.map(v => [
        Number(v.x.toFixed(4)), 
        Number(v.y.toFixed(4))
      ])
    })),
    doors: state.doors.map(door => ({
      p: [Number(door.x_norm.toFixed(4)), Number(door.y_norm.toFixed(4))],
      rot: Number(door.rotation.toFixed(1))
    }))
  };
};
```
