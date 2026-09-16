/**
 * Hardware Lab — Component 几何计算测试（S2-2）
 *
 * 纯 TS，无 DOM/React。验证：
 *  - rotatePoint 四个角度的旋转矩阵（SVG 坐标系，y 向下，顺时针）
 *  - getPinWorldPosition = component.position * pitch + rotate(pin.position * pitch)
 *  - 纯函数不修改输入对象
 *  - getComponentBodySize 按类型返回尺寸
 */
import { describe, expect, it } from 'vitest';
import {
  getComponentBodySize,
  getPinWorldPosition,
  rotatePoint,
  worldToGrid,
} from './componentGeometry';
import type { Component, ComponentPin } from '../types/componentTypes';

function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'CMP-1',
    type: 'generic',
    position: { x: 5, y: 3 },
    rotation: 0,
    config: { kind: 'generic' },
    pins: [],
    ...overrides,
  };
}

function makePin(overrides: Partial<ComponentPin> = {}): ComponentPin {
  return {
    id: 'CMP-1_1',
    componentId: 'CMP-1',
    name: '1',
    direction: 'passive',
    nodeId: null,
    position: { x: 0, y: 1 },
    ...overrides,
  };
}

describe('componentGeometry — rotatePoint', () => {
  it('0° 恒等', () => {
    expect(rotatePoint(10, 20, 0)).toEqual({ x: 10, y: 20 });
  });
  it('90° 顺时针：(-y, x)', () => {
    expect(rotatePoint(10, 20, 90)).toEqual({ x: -20, y: 10 });
  });
  it('180°：(-x, -y)', () => {
    expect(rotatePoint(10, 20, 180)).toEqual({ x: -10, y: -20 });
  });
  it('270° 顺时针：(y, -x)', () => {
    expect(rotatePoint(10, 20, 270)).toEqual({ x: 20, y: -10 });
  });
  it('旋转 360° 回到原点（0→90→180→270→0）', () => {
    let p = { x: 7, y: 13 };
    for (const r of [90, 180, 270, 0] as const) {
      p = rotatePoint(p.x, p.y, r);
    }
    // 0° 是恒等，所以连续 90→180→270→0 不等于 360°
    // 改为验证四次 90° 回到原点
    let q = { x: 7, y: 13 };
    for (let i = 0; i < 4; i++) q = rotatePoint(q.x, q.y, 90);
    expect(q).toEqual({ x: 7, y: 13 });
  });
});

describe('componentGeometry — getPinWorldPosition', () => {
  const pitch = 20;

  it('0° 时：世界坐标 = 元件世界坐标 + Pin 本地世界坐标', () => {
    const comp = makeComponent({ position: { x: 5, y: 3 } });
    const pin = makePin({ position: { x: 0, y: 1 } });
    // comp world = (100, 60), pin local world = (0, 20)
    expect(getPinWorldPosition(comp, pin, pitch)).toEqual({ x: 100, y: 80 });
  });

  it('90° 旋转后 Pin 位置正确（绕元件左上角）', () => {
    const comp = makeComponent({ position: { x: 5, y: 3 }, rotation: 90 });
    const pin = makePin({ position: { x: 3, y: 1 } }); // generic 的 pin2
    // comp world = (100, 60)
    // pin local world = (60, 20), rotate 90° = (-20, 60)
    // world = (80, 120)
    expect(getPinWorldPosition(comp, pin, pitch)).toEqual({ x: 80, y: 120 });
  });

  it('180° 旋转后 Pin 位置正确', () => {
    const comp = makeComponent({ position: { x: 0, y: 0 }, rotation: 180 });
    const pin = makePin({ position: { x: 3, y: 1 } });
    // pin local world = (60, 20), rotate 180° = (-60, -20)
    expect(getPinWorldPosition(comp, pin, pitch)).toEqual({ x: -60, y: -20 });
  });

  it('270° 旋转后 Pin 位置正确', () => {
    const comp = makeComponent({ position: { x: 0, y: 0 }, rotation: 270 });
    const pin = makePin({ position: { x: 3, y: 1 } });
    // pin local world = (60, 20), rotate 270° = (20, -60)
    expect(getPinWorldPosition(comp, pin, pitch)).toEqual({ x: 20, y: -60 });
  });

  it('默认 pitch=20', () => {
    const comp = makeComponent({ position: { x: 1, y: 1 } });
    const pin = makePin({ position: { x: 1, y: 0 } });
    expect(getPinWorldPosition(comp, pin)).toEqual({ x: 40, y: 20 });
  });

  it('不修改输入 component', () => {
    const comp = makeComponent({ position: { x: 5, y: 3 }, rotation: 90 });
    const pin = makePin({ position: { x: 3, y: 1 } });
    const compBefore = JSON.parse(JSON.stringify(comp));
    getPinWorldPosition(comp, pin, pitch);
    expect(comp).toEqual(compBefore);
  });

  it('不修改输入 pin', () => {
    const comp = makeComponent();
    const pin = makePin({ position: { x: 3, y: 1 } });
    const pinBefore = JSON.parse(JSON.stringify(pin));
    getPinWorldPosition(comp, pin, pitch);
    expect(pin).toEqual(pinBefore);
  });

  it('相同输入得到相同输出（确定性）', () => {
    const comp = makeComponent({ rotation: 90 });
    const pin = makePin({ position: { x: 2, y: 0 } });
    const a = getPinWorldPosition(comp, pin, pitch);
    const b = getPinWorldPosition(comp, pin, pitch);
    expect(a).toEqual(b);
  });
});

describe('componentGeometry — getComponentBodySize', () => {
  it('generic / resistor：宽 3 格 × 高 2 格', () => {
    expect(getComponentBodySize('generic', 20)).toEqual({ width: 60, height: 40 });
    expect(getComponentBodySize('resistor', 20)).toEqual({ width: 60, height: 40 });
  });
  it('led / button / switch / buzzer：宽 2 格 × 高 2 格', () => {
    for (const t of ['led', 'button', 'switch', 'buzzer'] as const) {
      expect(getComponentBodySize(t, 20)).toEqual({ width: 40, height: 40 });
    }
  });
  it('power / ground：宽 2 格 × 高 3 格', () => {
    expect(getComponentBodySize('power', 20)).toEqual({ width: 40, height: 60 });
    expect(getComponentBodySize('ground', 20)).toEqual({ width: 40, height: 60 });
  });
});

describe('componentGeometry — worldToGrid', () => {
  it('世界坐标 / pitch = 网格坐标', () => {
    expect(worldToGrid(100, 60, 20)).toEqual({ x: 5, y: 3 });
  });
  it('保留小数（不强制 snap）', () => {
    expect(worldToGrid(105, 63, 20)).toEqual({ x: 5.25, y: 3.15 });
  });
});
