# Electronics Lab V0.1 — 数字逻辑虚拟实验台

面向电子设计竞赛与数字逻辑学习的虚拟实验平台。V0.1 聚焦“数字逻辑 + 基础输入输出”：
从器件库拖入器件、连线、改变输入，立即观察数字信号沿连线实时传播到 LED。

核心体验闭环：

```
Button / Switch ──Wire──> 逻辑门(AND/OR/NOT/XOR) ──Wire──> LED
```

可逐级级联，例如构造 `(A AND B) OR C → LED`，并用自动生成的真值表验证逻辑。

## 功能一览

- **7 种器件**：Switch（拨动开关）、Button（按住按钮）、LED、AND、OR、NOT、XOR
- **三值逻辑**：`0` / `1` / `'X'`（未定义）；悬空输入为 `X`，绝不默认为 0
- **实时信号传播**：基于拓扑排序（Kahn 算法）的纯 TypeScript 仿真引擎
- **连线系统**：从输出端口拖到输入端口，Manhattan 直角折线（含反向 U 形绕线）、拖动预览、端口吸附
- **连接校验**：输出→输出、输入→输入、重复驱动、器件自连、反馈环路均被拒绝，端口变红 + toast 提示（无模态弹窗）
- **交互**：器件拖拽（吸附 20px 网格）、滚轮缩放（0.25–4.0，以鼠标为中心）、空白拖拽平移
- **删除**：右键器件 / 连线选择删除（删除器件会连带删除相关连线），或在底部“器件信息”面板点击删除按钮，也可选中后按 `Delete` / `Backspace`；所有删除均可撤销
- **Undo / Redo**：覆盖全部结构操作，一次器件拖拽只产生一条历史，上限 20 步；`Ctrl+Z` / `Ctrl+Shift+Z`
  - Button 按住/松开属于瞬时信号，不进历史；Switch 切换是持久状态，进历史
- **保存 / 加载**：localStorage 自动保存电路结构；JSON 导出 / 导入（严格校验版本、器件类型、端口方向、坐标与连线引用，非法文件被拒绝）
- **真值表**：自动识别输入（Button/Switch）与输出（LED），枚举全部 2^n 组合（≤8 输入），`X` 显示为 `—`
- **3 个预设示例**：Button→LED、Switch×AND→LED、(A AND B) OR C→LED

## 技术栈

| 类别 | 选型 |
|---|---|
| 框架 | React 18 |
| 语言 | TypeScript（strict） |
| 构建 | Vite |
| 画布 | 原生 SVG |
| 状态管理 | Zustand（circuitStore / uiStore 分离） |
| 测试 | Vitest（jsdom） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 类型检查 + 生产构建
npm run build

# 预览构建产物
npm run preview

# 单元测试（watch 模式）
npm test

# 单次运行全部测试
npm run test:run
```

## 架构

三层严格分离，数据流单向：

```
用户操作 → Zustand Store → Simulation Engine → SimulationResult → Store 更新 → React UI
```

- **Simulation Engine（纯 TypeScript）**：只接收 `Circuit`、计算并返回 `SimulationResult`。
  不依赖 React / Zustand / DOM / SVG / Store，可独立测试，未来替换 UI 框架不受影响。
- **Circuit Store**：电路结构与器件状态，是唯一调用 Engine 的地方；管理 Undo/Redo 历史。
- **UI Store**：选中、缩放、平移、临时连线、错误端口、toast 等界面状态，不持久化。

### Circuit State 与运行时状态

- **持久化（localStorage / JSON 导出）**：`version`、器件的 `id/type/position/state/config` 与端口结构信息、`wires`。
- **运行时派生（不持久化）**：`ports[].value`，由 Engine 每次 `evaluate()` 重新计算；加载 / 导入后先重置为 `X` 再重算。
- 器件 `position` 存**逻辑网格坐标**（1 格 = 20px），渲染时换算为画布像素，缩放不影响数据。

### 目录结构

```
src/
├── engine/                 # 纯 TS 仿真层（零 UI 依赖）
│   ├── types.ts            # 数据模型、器件元信息、器件工厂
│   ├── SimulationEngine.ts # 拓扑排序 / 环路检测 / 三值逻辑传播
│   └── truthTable.ts       # 真值表生成（内部全部调用 engine.evaluate）
├── store/
│   ├── circuitStore.ts     # 电路数据 + Undo/Redo + persist
│   └── uiStore.ts          # 界面临时状态
├── utils/serialize.ts      # 序列化 / 校验 / 版本迁移入口
├── presets/examples.ts     # 3 个预设示例电路
├── components/
│   ├── Canvas.tsx          # SVG 画布、坐标系、缩放平移、Manhattan 路由
│   ├── Toolbar / PartsLibrary / BottomPanel / Toasts
│   └── devices/            # DeviceWrapper、PortDot 与 7 种器件组件
└── tests/consistency.test.ts  # 实时仿真与真值表结果一致性回归
```

## 测试

85 个单元测试全部通过（7 个测试文件），重点覆盖：

- AND/OR/NOT/XOR 的完整三值真值表（含 `X`）与 `X` 传播规则
- 拓扑排序、环路检测、Wire 合法性
- 多级信号传播、悬空输入为 `X`
- 真值表生成（2/3 输入、悬空显示 `—`、>8 输入拒绝）
- 序列化 / 反序列化（导出不含 `ports[].value`、导入后重算）
- JSON 导入严格校验（未知器件类型、非法端口方向、非法坐标、悬空 / 反向连线引用、重复驱动、器件自连、重复 id 等一律拒绝）
- Undo/Redo（结构操作、一次拖拽一条历史、Button 不入历史 / Switch 入历史、20 步上限）
- **实时仿真与真值表结果一致性**回归测试

## V0.1 范围之外

模拟电路、时序电路 / 反馈环路、PWM / ADC / UART / Timer、电机 / 编码器 / PID、
STM32 模型、用户系统 / 云同步、多页电路、复制粘贴、移动端专项适配等均不在 V0.1 内，
架构已为后续“数字逻辑 → GPIO → PWM → ADC → Timer → 控制 → 电赛项目”的演进预留扩展点。
