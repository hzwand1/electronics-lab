/**
 * Hardware Lab — Component 几何计算（S2-2）
 *
 * 纯 TypeScript：不依赖 React / DOM / SVG / Zustand / Store。
 * 职责：根据 Component.position + Component.rotation + Pin.local position 计算 Pin 世界坐标。
 *
 * 坐标约定：
 *   - Component.position 为元件左上角的逻辑网格坐标（1 格 = pitch 像素）
 *   - Pin.position 为相对元件左上角的本地逻辑网格坐标
 *   - 旋转绕元件左上角 (0,0) 进行（教学简化模型）
 *   - 世界坐标 = 元件世界坐标 + 旋转后的 Pin 本地世界坐标
 *
 * 旋转矩阵（顺时针，SVG y 轴向下）：
 *   0°:   ( x,  y)
 *   90°:  (-y,  x)
 *   180°: (-x, -y)
 *   270°: ( y, -x)
 */
import type { Component, ComponentPin, ComponentRotation } from '../types/componentTypes';
import type { GridPoint } from '../types/hardwareTypes';

/** 绕原点顺时针旋转一个点（SVG 坐标系，y 向下） */
export function rotatePoint(x: number, y: number, rotation: ComponentRotation): { x: number; y: number } {
  switch (rotation) {
    case 0:
      return { x, y };
    case 90:
      return { x: -y, y: x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: y, y: -x };
  }
}

/**
 * 计算 Pin 在面包板世界坐标系中的位置（像素）。
 *
 * 世界坐标 = component.position * pitch + rotate(pin.position * pitch, component.rotation)
 *
 * 纯函数：不修改输入对象；相同输入得到相同输出。
 *
 * @param component 所属元件
 * @param pin 目标引脚
 * @param pitch 网格间距（像素/格），默认 20
 */
export function getPinWorldPosition(
  component: Component,
  pin: ComponentPin,
  pitch = 20,
): { x: number; y: number } {
  const compWorldX = component.position.x * pitch;
  const compWorldY = component.position.y * pitch;
  const pinLocalWorldX = pin.position.x * pitch;
  const pinLocalWorldY = pin.position.y * pitch;
  const rotated = rotatePoint(pinLocalWorldX, pinLocalWorldY, component.rotation);
  return {
    x: compWorldX + rotated.x,
    y: compWorldY + rotated.y,
  };
}

/**
 * 元件主体在世界坐标系中的尺寸（像素）。
 * S2-2 仅 generic 元件使用；未来真实元件可在此扩展按类型返回尺寸。
 * generic：宽 3 格 × 高 2 格（与 PIN_LAYOUTS.generic 的 x=0,3 y=1 匹配）。
 */
export function getComponentBodySize(type: Component['type'], pitch = 20): { width: number; height: number } {
  switch (type) {
    case 'generic':
    case 'resistor':
      return { width: 3 * pitch, height: 2 * pitch };
    case 'led':
    case 'button':
    case 'switch':
    case 'buzzer':
      return { width: 2 * pitch, height: 2 * pitch };
    case 'power':
    case 'ground':
      return { width: 2 * pitch, height: 3 * pitch };
  }
}

/** 将世界坐标（像素）转换为逻辑网格坐标（格），保留小数 */
export function worldToGrid(worldX: number, worldY: number, pitch = 20): GridPoint {
  return { x: worldX / pitch, y: worldY / pitch };
}
