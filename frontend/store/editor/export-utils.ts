import type { EditorState } from "./types";

/**
 * Converte o estado do editor em um JSON minimalista formatado para LLMs.
 * Segue as regras do `dataset-compactor-logic`:
 * - n: nome do projeto
 * - rooms: array de objetos { n, pts: [ [x, y], ... ] }
 * - doors: array de objetos { p: [x, y], rot }
 * - Precisão: 4 casas decimais para coords, 1 para rotação
 */
export const compactDataset = (state: EditorState) => {
  return {
    n: state.projectName || "Export",
    rooms: state.polygons.map(room => ({
      n: room.name,
      pts: room.points.map(v => [
        Number(v.x.toFixed(4)), 
        Number(v.y.toFixed(4))
      ])
    })),
    doors: state.doors.map(door => ({
      p: [
        Number(door.x_norm.toFixed(4)), 
        Number(door.y_norm.toFixed(4))
      ],
      rot: Number(door.rotation.toFixed(1))
    })),
    // Adicionando stairs se existirem, seguindo padrão similar
    stairs: state.stairs.map(stair => ({
      p: [
        Number(stair.x_norm.toFixed(4)), 
        Number(stair.y_norm.toFixed(4))
      ],
      type: stair.type,
      rot: Number(stair.rotation.toFixed(1))
    }))
  };
};
