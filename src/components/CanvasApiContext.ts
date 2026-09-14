import { createContext } from 'react';

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasApi {
  /** 屏幕坐标（相对 SVG 元素左上角）→ 逻辑画布坐标（px） */
  getCanvasPoint: (clientX: number, clientY: number) => CanvasPoint;
}

export const CanvasApiContext = createContext<CanvasApi>({
  getCanvasPoint: () => ({ x: 0, y: 0 }),
});
