/**
 * Hardware Lab — 硬件引擎（阶段 1）
 *
 * 纯 TypeScript：只依赖 types / breadboardFactory 的数据结构。
 * 禁止 import React / Zustand / DOM / SVG。
 *
 * 职责：
 *  - 维护导线的 Node ↔ Node 连接语义（不是 Hole ↔ Hole）
 *  - 同节点自连接 = no-op
 *  - 重复连接不重复创建
 *  - 导线增删均为不可变更新（不修改输入 state）
 *  - 序列化 / 反序列化（仅导线结构，带节点引用校验）
 */

import {
  AddWireResult,
  BreadboardIndex,
  HardwareState,
  HardwareWire,
} from '../types/hardwareTypes';

export const HARDWARE_STATE_VERSION = '1.0';

/** 由一对节点生成确定性、与方向无关的导线 id */
function wireIdOf(nodeA: string, nodeB: string): string {
  const [a, b] = [nodeA, nodeB].sort();
  return `W::${a}::${b}`;
}

export class HardwareEngine {
  constructor(private readonly index: BreadboardIndex) {}

  /** 创建空电路状态 */
  createInitialState(): HardwareState {
    return { version: HARDWARE_STATE_VERSION, wires: [] };
  }

  /** holeId → nodeId（查表 O(1)，不做几何重算） */
  nodeOfHole(holeId: string): string | undefined {
    return this.index.holeToNode.get(holeId);
  }

  /** nodeId → 该节点下全部孔（只读） */
  holesOfNode(nodeId: string): readonly string[] {
    return this.index.nodeToHoles.get(nodeId) ?? [];
  }

  /** 两个孔是否属于同一电气节点 */
  areSameNode(holeA: string, holeB: string): boolean {
    const na = this.nodeOfHole(holeA);
    const nb = this.nodeOfHole(holeB);
    return na !== undefined && na === nb;
  }

  /** 节点是否存在 */
  hasNode(nodeId: string): boolean {
    return this.index.nodeById.has(nodeId);
  }

  /**
   * 以两个锚点孔建立一条 Node ↔ Node 导线。
   * 返回新状态；不修改输入 state。
   *  - 孔不存在          → invalid-hole
   *  - 两孔属于同一节点   → self-node（no-op）
   *  - 该节点对已连接     → duplicate（no-op）
   */
  addWire(state: HardwareState, startHoleId: string, endHoleId: string): AddWireResult {
    const startNodeId = this.nodeOfHole(startHoleId);
    const endNodeId = this.nodeOfHole(endHoleId);

    if (!startNodeId || !endNodeId) {
      return { status: 'invalid-hole', state };
    }

    // 同一电气节点：无意义的自连接
    if (startNodeId === endNodeId) {
      return { status: 'self-node', state };
    }

    const id = wireIdOf(startNodeId, endNodeId);
    if (state.wires.some((w) => w.id === id)) {
      return { status: 'duplicate', state };
    }

    // 规范导线方向（节点 id 排序），但保留用户点击的锚点孔用于渲染
    const [canonicalStart, canonicalEnd] = [startNodeId, endNodeId].sort();
    const swap = canonicalStart !== startNodeId;
    const wire: HardwareWire = {
      id,
      startNodeId: canonicalStart,
      endNodeId: canonicalEnd,
      startHoleId: swap ? endHoleId : startHoleId,
      endHoleId: swap ? startHoleId : endHoleId,
    };

    const next: HardwareState = {
      ...state,
      wires: [...state.wires, wire],
    };
    return { status: 'created', state: next, wire };
  }

  /** 删除一条导线（不可变） */
  removeWire(state: HardwareState, wireId: string): HardwareState {
    if (!state.wires.some((w) => w.id === wireId)) return state;
    return { ...state, wires: state.wires.filter((w) => w.id !== wireId) };
  }

  /** 清空全部导线 */
  clearWires(state: HardwareState): HardwareState {
    if (state.wires.length === 0) return state;
    return { ...state, wires: [] };
  }

  /** 序列化：仅保存电路结构（导线），不保存任何 UI 临时状态 */
  serialize(state: HardwareState): string {
    return JSON.stringify({ version: state.version, wires: state.wires });
  }

  /**
   * 严格反序列化：校验导线引用的节点/孔均存在且一致，自动去重。
   * 结构非法时抛出 Error，调用方负责提示且不覆盖当前电路。
   */
  deserialize(raw: string): HardwareState {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Hardware state 不是合法 JSON');
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Hardware state 结构无效：根节点必须是对象');
    }
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.wires)) {
      throw new Error('Hardware state 结构无效：wires 必须是数组');
    }

    const wires: HardwareWire[] = [];
    const seen = new Set<string>();

    obj.wires.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`第 ${index + 1} 条导线不是对象`);
      }
      const w = item as Record<string, unknown>;
      const { startNodeId, endNodeId, startHoleId, endHoleId } = w as Record<string, string>;

      if (typeof startNodeId !== 'string' || typeof endNodeId !== 'string') {
        throw new Error(`第 ${index + 1} 条导线缺少节点引用`);
      }
      if (!this.hasNode(startNodeId) || !this.hasNode(endNodeId)) {
        throw new Error(`第 ${index + 1} 条导线引用了不存在的节点`);
      }
      if (startNodeId === endNodeId) {
        throw new Error(`第 ${index + 1} 条导线不能连接同一节点`);
      }
      if (typeof startHoleId !== 'string' || typeof endHoleId !== 'string') {
        throw new Error(`第 ${index + 1} 条导线缺少锚点孔`);
      }
      // 锚点孔必须存在且确实属于其声明的节点
      if (this.nodeOfHole(startHoleId) !== startNodeId || this.nodeOfHole(endHoleId) !== endNodeId) {
        throw new Error(`第 ${index + 1} 条导线的锚点孔与节点不一致`);
      }

      const id = wireIdOf(startNodeId, endNodeId);
      if (!seen.has(id)) {
        seen.add(id);
        wires.push({ id, startNodeId, endNodeId, startHoleId, endHoleId });
      }
    });

    return {
      version: typeof obj.version === 'string' ? obj.version : HARDWARE_STATE_VERSION,
      wires,
    };
  }

  /**
   * 宽松加载（用于 localStorage rehydrate）：
   * 尽量保留合法导线，丢弃非法项，绝不抛错破坏启动。
   */
  safeLoadWires(rawWires: unknown): HardwareWire[] {
    if (!Array.isArray(rawWires)) return [];
    const valid: HardwareWire[] = [];
    const seen = new Set<string>();

    for (const item of rawWires) {
      if (typeof item !== 'object' || item === null) continue;
      const w = item as Partial<HardwareWire>;
      if (!w.startNodeId || !w.endNodeId || !w.startHoleId || !w.endHoleId) continue;
      if (!this.hasNode(w.startNodeId) || !this.hasNode(w.endNodeId)) continue;
      if (w.startNodeId === w.endNodeId) continue;
      if (this.nodeOfHole(w.startHoleId) !== w.startNodeId) continue;
      if (this.nodeOfHole(w.endHoleId) !== w.endNodeId) continue;

      const id = wireIdOf(w.startNodeId, w.endNodeId);
      if (seen.has(id)) continue;
      seen.add(id);
      valid.push({
        id,
        startNodeId: w.startNodeId,
        endNodeId: w.endNodeId,
        startHoleId: w.startHoleId,
        endHoleId: w.endHoleId,
      });
    }
    return valid;
  }
}
