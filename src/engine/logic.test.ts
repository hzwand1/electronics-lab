import { describe, expect, it } from 'vitest';
import { SimulationEngine } from './SimulationEngine';
import { Signal } from './types';

const engine = new SimulationEngine();

const AND_TABLE: Record<string, Signal> = {
  '0,0': 0,
  '0,1': 0,
  '0,X': 0,
  '1,0': 0,
  '1,1': 1,
  '1,X': 'X',
  'X,0': 0,
  'X,1': 'X',
  'X,X': 'X',
};

const OR_TABLE: Record<string, Signal> = {
  '0,0': 0,
  '0,1': 1,
  '0,X': 'X',
  '1,0': 1,
  '1,1': 1,
  '1,X': 1,
  'X,0': 'X',
  'X,1': 1,
  'X,X': 'X',
};

const XOR_TABLE: Record<string, Signal> = {
  '0,0': 0,
  '0,1': 1,
  '0,X': 'X',
  '1,0': 1,
  '1,1': 0,
  '1,X': 'X',
  'X,0': 'X',
  'X,1': 'X',
  'X,X': 'X',
};

const VALUES: Signal[] = [0, 1, 'X'];

describe('三值逻辑（0 / 1 / X）', () => {
  it('AND 完整 3×3 真值表', () => {
    for (const a of VALUES) {
      for (const b of VALUES) {
        expect(engine.evaluateLogic('and', [a, b]), `AND(${a}, ${b})`).toBe(
          AND_TABLE[`${a},${b}`],
        );
      }
    }
  });

  it('OR 完整 3×3 真值表', () => {
    for (const a of VALUES) {
      for (const b of VALUES) {
        expect(engine.evaluateLogic('or', [a, b]), `OR(${a}, ${b})`).toBe(OR_TABLE[`${a},${b}`]);
      }
    }
  });

  it('NOT 完整 1×3 真值表', () => {
    expect(engine.evaluateLogic('not', [0])).toBe(1);
    expect(engine.evaluateLogic('not', [1])).toBe(0);
    expect(engine.evaluateLogic('not', ['X'])).toBe('X');
  });

  it('XOR 完整 3×3 真值表', () => {
    for (const a of VALUES) {
      for (const b of VALUES) {
        expect(engine.evaluateLogic('xor', [a, b]), `XOR(${a}, ${b})`).toBe(
          XOR_TABLE[`${a},${b}`],
        );
      }
    }
  });
});
