/**
 * Hardware Lab Stage 2 S2-1 — ComponentPin ↔ Node 连接服务（纯 TS）
 *
 * 职责：管理 ComponentPin 与电气 Node 之间的连接关系。
 * 核心原则：
 *   - ComponentPin 连接的是 Node（pin.nodeId），不是 Hole，也不是 Wire。
 *   - 一个 Pin 最多连接一个 Node；一个 Node 可连接多个 Pin / Hole / Wire。
 *   - 不复制 Node：Pin 直接引用已有 nodeId，绝不创建 "Pin 专属 Node"。
 *   - 移动元件默认不改变 nodeId（视觉位置与电气连接分离）。
 *   - 删除 Component 时删除其 Pins，Pin-Node 关系自然解除，但不删 Node / Hole / Wire。
 *
 * 纯函数约束：
 *   - 不依赖 React / DOM / SVG / Zustand / Store / UI。
 *   - 不修改输入对象（不可变更新，返回新数组/新对象）。
 *   - 相同输入得到相同输出。
 *   - Node 存在性校验由调用方传入 validNodeIds（通常来自面包板索引），
 *     本模块不持有面包板，避免与 Stage 1 基础设施耦合。
 */
import type { Component, ComponentConfig, ComponentPin } from '../types/componentTypes';

/** 连接操作的结果状态 */
export type ConnectStatus =
  | 'ok'
  | 'pin-not-found'
  | 'node-not-found'
  | 'already-same';

/** 删除元件的结果状态 */
export type RemoveComponentStatus = 'ok' | 'component-not-found';

/** connectPinToNode / disconnectPin 的返回值 */
export interface ConnectResult {
  /** 更新后的 components 数组（不可变） */
  components: Component[];
  status: ConnectStatus;
  /** 操作目标 Pin（更新后）；仅在找到 Pin 时存在 */
  pin?: ComponentPin;
}

/** removeComponent 的返回值 */
export interface RemoveComponentResult {
  components: Component[];
  status: RemoveComponentStatus;
}

/** 在 components 数组中查找指定 Pin，返回其所属 Component 与 Pin 本身 */
function findPin(
  components: readonly Component[],
  pinId: string,
): { component: Component; pin: ComponentPin } | null {
  for (const comp of components) {
    const pin = comp.pins.find((p) => p.id === pinId);
    if (pin) return { component: comp, pin };
  }
  return null;
}

/**
 * 将指定 Pin 连接到 Node。
 *
 * 行为：
 * - Node 不在 validNodeIds 中 → node-not-found（拒绝）
 * - Pin 不存在 → pin-not-found（拒绝）
 * - Pin 已连接同一 Node → already-same（无变化，幂等）
 * - Pin 未连接或已连接其他 Node → 绑定/重新绑定为 nodeId（ok）
 *   重新绑定后 Pin 只属于新 Node，不能同时属于两个 Node。
 *
 * 不可变：不修改输入 components 数组及其元素。
 */
export function connectPinToNode(
  components: readonly Component[],
  pinId: string,
  nodeId: string,
  validNodeIds: ReadonlySet<string>,
): ConnectResult {
  if (!validNodeIds.has(nodeId)) {
    return { components: [...components], status: 'node-not-found' };
  }

  const found = findPin(components, pinId);
  if (!found) {
    return { components: [...components], status: 'pin-not-found' };
  }

  if (found.pin.nodeId === nodeId) {
    return {
      components: [...components],
      status: 'already-same',
      pin: found.pin,
    };
  }

  // 不可变更新：仅重建包含目标 Pin 的那个 Component，其余保持原引用
  const nextComponents = components.map((comp) => {
    if (!comp.pins.some((p) => p.id === pinId)) return comp;
    return {
      ...comp,
      pins: comp.pins.map((p) =>
        p.id === pinId ? { ...p, nodeId } : p,
      ),
    };
  });

  const updatedPin = findPin(nextComponents, pinId)!.pin;
  return { components: nextComponents, status: 'ok', pin: updatedPin };
}

/**
 * 断开指定 Pin 与其 Node 的连接（pin.nodeId 重置为 null）。
 *
 * 行为：
 * - Pin 不存在 → pin-not-found
 * - Pin 本就未连接 → already-same（幂等）
 * - 已连接 → 断开（ok）
 *
 * 不可变：不修改输入。
 */
export function disconnectPin(
  components: readonly Component[],
  pinId: string,
): ConnectResult {
  const found = findPin(components, pinId);
  if (!found) {
    return { components: [...components], status: 'pin-not-found' };
  }
  if (found.pin.nodeId === null) {
    return {
      components: [...components],
      status: 'already-same',
      pin: found.pin,
    };
  }

  const nextComponents = components.map((comp) => {
    if (!comp.pins.some((p) => p.id === pinId)) return comp;
    return {
      ...comp,
      pins: comp.pins.map((p) =>
        p.id === pinId ? { ...p, nodeId: null } : p,
      ),
    };
  });

  const updatedPin = findPin(nextComponents, pinId)!.pin;
  return { components: nextComponents, status: 'ok', pin: updatedPin };
}

/**
 * 删除指定 Component（连同其全部 Pins）。
 *
 * 关键边界：
 * - 只从 components 数组中移除该 Component；其 Pins 随对象一同消失，
 *   Pin 与 Node 的关系自然解除（不需要也不应该去修改 Node）。
 * - 不删除 Node、Hole、Wire、其他 Component、面包板。
 * - Component 不存在 → component-not-found（幂等）。
 *
 * 不可变：返回新数组，不修改输入。
 */
export function removeComponent(
  components: readonly Component[],
  componentId: string,
): RemoveComponentResult {
  const exists = components.some((c) => c.id === componentId);
  if (!exists) {
    return { components: [...components], status: 'component-not-found' };
  }
  const next = components.filter((c) => c.id !== componentId);
  return { components: next, status: 'ok' };
}

/**
 * 从持久化原始数据安全加载 components 数组。
 * 用于 Store rehydrate：丢弃任何结构非法的条目，保证启动不崩溃。
 *
 * 校验范围（S2-1 基础校验）：
 * - 必须是数组
 * - 每个元素必须是对象且有 string id / string type
 * - pins 必须是数组，每个 pin 有 string id / componentId / name
 * - pin.nodeId 若存在必须是 string，否则置 null
 * - 不校验 ComponentType 枚举（未来扩展时旧数据不应被整体丢弃），
 *   由上层 UI / Engine 处理未知类型
 *
 * 注意：pin.nodeId 是结构连接数据，属于持久化范围（与 V0.1 port.value
 * 这种运行时派生状态不同），因此保留。
 */
export function safeLoadComponents(raw: unknown): Component[] {
  if (!Array.isArray(raw)) return [];
  const result: Component[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    if (typeof c.id !== 'string' || typeof c.type !== 'string') continue;
    if (!Array.isArray(c.pins)) continue;

    const pins: ComponentPin[] = [];
    for (const pItem of c.pins) {
      if (!pItem || typeof pItem !== 'object') continue;
      const p = pItem as Record<string, unknown>;
      if (
        typeof p.id !== 'string' ||
        typeof p.componentId !== 'string' ||
        typeof p.name !== 'string'
      ) {
        continue;
      }
      const direction =
        p.direction === 'in' ||
        p.direction === 'out' ||
        p.direction === 'passive' ||
        p.direction === 'power'
          ? p.direction
          : 'passive';
      const nodeId = typeof p.nodeId === 'string' ? p.nodeId : null;
      const pos =
        p.position &&
        typeof p.position === 'object' &&
        typeof (p.position as Record<string, unknown>).x === 'number' &&
        typeof (p.position as Record<string, unknown>).y === 'number'
          ? {
              x: (p.position as Record<string, number>).x,
              y: (p.position as Record<string, number>).y,
            }
          : { x: 0, y: 0 };
      pins.push({
        id: p.id,
        componentId: p.componentId,
        name: p.name,
        direction,
        nodeId,
        position: pos,
      });
    }

    const position =
      c.position &&
      typeof c.position === 'object' &&
      typeof (c.position as Record<string, unknown>).x === 'number' &&
      typeof (c.position as Record<string, unknown>).y === 'number'
        ? {
            x: (c.position as Record<string, number>).x,
            y: (c.position as Record<string, number>).y,
          }
        : { x: 0, y: 0 };

    const rotation =
      c.rotation === 0 ||
      c.rotation === 90 ||
      c.rotation === 180 ||
      c.rotation === 270
        ? c.rotation
        : 0;

    result.push({
      id: c.id,
      type: c.type as Component['type'],
      position,
      rotation,
      config:
        c.config && typeof c.config === 'object'
          ? (c.config as Component['config'])
          : ({ kind: c.type } as ComponentConfig),
      pins,
    });
  }
  return result;
}
