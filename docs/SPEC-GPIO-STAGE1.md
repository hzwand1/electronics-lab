# Electronics Lab — GPIO 入门实验模块 Stage 1 技术规格

- 版本：v1.0（待确认）
- 状态：规格确认后进入 G0 开发
- 适用范围：Electronics Lab 项目内新增的独立学习模块「GPIO 入门」
- 关联文档：Electronics Lab V0.1 Development Specification（数字逻辑实验台，已冻结）

---

## 1. 产品目标与范围

GPIO 入门实验模块是一个面向 STM32 / 单片机初学者的**交互式 GPIO 位单元解剖台**。

它的目标不是精确仿真一颗真实 STM32 芯片的电气行为，而是帮助学习者建立以下直觉：

1. **一个 GPIO 引脚是一个可配置的双向节点**，其电平由"谁在驱动、驱动有多强"决定。
2. **输入路径**：外部电平 → 引脚 → 上拉/下拉 → 施密特触发器整形 → MCU 读到的数字值（IDR）。
3. **输出路径**：MCU 输出数据（ODR）→ 输出控制 → P-MOS / N-MOS 驱动器 → 引脚 → 外部。
4. **浮空输入是不确定的（X）**，不是默认 0。
5. **强驱动胜过弱驱动**（外部强驱可以盖过内部上下拉）。
6. **推挽输出不能与外部强驱对拉**（驱动冲突，教学模型中表现为 contention 警告）。
7. **开漏输出只能拉低或释放**，输出高电平必须依赖上拉电阻。

### 1.1 核心体验闭环

学习者通过点击开关改变配置，实时观察两条信号通路的电平流动与导通状态，配合每个模块旁的"它为什么存在"短注释，以及真实 STM32 GPIO 位结构图的位置对照，建立对 GPIO 内部结构的整体认知。

### 1.2 与 V0.1 的关系

- 数字逻辑实验台（V0.1）已冻结，本模块**不修改、不扩展** V0.1 的任何功能。
- GPIO 入门作为**并列模块**存在，通过顶栏切换进入，默认进入数字逻辑 V0.1。
- 两者共享项目外壳与视觉约定，但**引擎、数据模型、Store 完全独立**。

---

## 2. 非目标（Stage 1 明确不做）

以下内容**不属于** GPIO Stage 1，禁止在本阶段实现或预留可运行代码（可在文档中注明"后续阶段"）：

| 类别 | 不做的内容 |
|---|---|
| 电气仿真 | 真实电压计算、真实电流计算、短路电流仿真、MOSFET 参数（Rds(on)、Vth 等）、电阻具体阻值、寄生电容、RC 时序 |
| 外设 | ADC、EXTI / 中断、复用功能（AF mux）、时钟、PWM、Timer、UART、Encoder、Motor、PID |
| 寄存器 | 真实寄存器地址、位带操作、多 GPIO 端口（GPIOA/GPIOB…）、LOCK、复位默认态 |
| 高级配置 | 输出速度/斜率档位、驱动强度档位、5V 容忍（FT）、可关断 VDD、TTL 输入选择、模拟模式 |
| 系统 | 多引脚、用户系统、云端同步、AI 聊天导师、积分/排行榜 |
| 时序 | 抖动时序、亚稳态、施密特具体阈值电压与迟滞数值 |

> 真实 STM32 位结构图中出现但本阶段不模拟的模块（如模拟开关、AF mux、FT 可关断 VDD、TTL 选择等），在对照视图中**置灰并标注"后续阶段"**，避免学习者误以为被忽略。

---

## 3. 与 V0.1 的隔离规则（硬约束）

以下规则为强制约束，任何 Slice 都不得违反：

1. **独立目录**：GPIO 模块所有代码位于 `src/modules/gpio/` 下，子目录结构自行组织（如 `engine/`、`store/`、`components/`、`view/`）。
2. **独立 Engine**：GPIO 引擎位于 `src/modules/gpio/engine/`，**不得 import** `src/engine/` 下的任何文件（包括 `types.ts`、`SimulationEngine.ts`、`logic.ts` 等）。
3. **不修改 V0.1 数据模型**：不得修改 `Circuit`、`Device`、`Wire`、`Port`、`Signal` 等 V0.1 类型定义。GPIO 使用自己的类型。
4. **Engine 纯 TS**：GPIO Engine 不得 import React、Zustand、DOM API、SVG API、Toast、Store 或任何界面层模块；不得在 Engine 内调用任何 Store 方法。
5. **独立 Store**：GPIO 使用自己的 Zustand store（`src/modules/gpio/store/`），不与 `circuitStore` / `uiStore` 共享状态。
6. **唯一允许的现有代码触碰**：在 App 层（`src/App.tsx` 或同级外壳）增加**模块切换入口**（顶栏"数字逻辑 V0.1 / GPIO 入门"），将数字逻辑台与 GPIO 视图作为两个并列模块挂载。数字逻辑台的内部组件、引擎、Store、样式**一律不动**。
7. **V0.1 冻结**：不得以"重构""优化""统一"等理由修改 V0.1 的任何业务代码。若发现 V0.1 bug，记录但不在本阶段修复。

---

## 4. 术语与标签约定

### 4.1 IDR / ODR 标签

- **主要标签**：`IDR（输入寄存器）`、`ODR（输出寄存器）`。
- **中文解释**：在标签旁或读数面板中用一句话解释其在当前教学模型中的含义：
  - IDR："MCU 从引脚读到的数字值（0 / 1 / 未定义 X）"
  - ODR："MCU 想要输出到引脚的数字值（0 / 1）"
- **概念模型声明**：在 GPIO 视图的显著位置（如读数面板底部或页脚）常驻一行说明：
  > "IDR / ODR 在此为教学概念模型，不模拟真实 STM32 寄存器地址与位映射。"
- 禁止出现真实寄存器地址（如 `0x40020000`）、位偏移、端口号（GPIOA 等）。

### 4.2 "教学简化"标注规范

所有简化模型的视觉块必须带有明确的"教学简化"标识，形式可为：

- 块标题旁加小字标签 `教学简化`；
- 或块的 tooltip / "为什么存在"注释首句写明"这是教学简化模型，用于理解 XX，不代表精确电气仿真"。

必须标注"教学简化"的模块：P-MOS、N-MOS、施密特触发器、上拉/下拉电阻、保护二极管、输出控制逻辑。

### 4.3 推挽冲突的表述

当推挽输出与外部强驱发生对拉时：

- 视觉表现：引脚节点显示 `X`（灰半透明）+ 红色 `contention` 警告标识 + 导通路径红色闪烁。
- 警告文案（必须严格使用，不得暗示精确电气仿真）：
  > "驱动冲突：推挽输出与外部强驱对拉。此为教学模型中的驱动关系冲突，**不代表实际短路电流仿真**。真实硬件中可能产生大电流，请勿这样连接。"
- 禁止出现具体电流数值、"短路电流 = X A"、"功耗 = X W"等表述。

---

## 5. 数据模型

所有类型定义位于 `src/modules/gpio/engine/gpioTypes.ts`，纯 TS，无 UI 依赖。

```typescript
/** 逻辑电平（教学模型三值） */
type Level = 0 | 1 | 'X';

/** 外部激励状态 */
type External = 'high' | 'low' | 'floating';

/** 内部上下拉配置（输入模式下三选一） */
type Pull = 'none' | 'up' | 'down';

/** 输出类型 */
type OutType = 'push-pull' | 'open-drain';

/** GPIO 方向 */
type Direction = 'in' | 'out';

/**
 * GPIO 配置（用户可操作的全部输入）。
 * 这是 Store 中持久化的唯一状态；其余均为派生。
 */
interface GpioConfig {
  direction: Direction;
  pull: Pull;
  outType: OutType;
  odr: 0 | 1;          // 输出数据寄存器（概念模型，非真实寄存器）
  external: External;   // 外部激励
}

/**
 * 驱动强度（教学模型）。
 * strong：外部源、推挽 P/N 管、开漏 N 管导通时
 * weak：内部上拉/下拉电阻接入时
 * z：高阻（无驱动）
 */
type DriveStrength = 'strong-h' | 'strong-l' | 'weak-h' | 'weak-l' | 'z';

/** 警告类型 */
type GpioWarning = 'floating' | 'contention' | 'open-drain-needs-pull';

/**
 * GPIO 派生状态（全部由 Engine 计算产生，UI 只读）。
 * 不属于需要持久化的配置数据。
 */
interface GpioDerived {
  pinLevel: Level;          // 引脚节点最终电平
  contention: boolean;      // 是否存在强驱对拉冲突
  pmosOn: boolean;          // P-MOS 是否导通（教学简化）
  nmosOn: boolean;          // N-MOS 是否导通（教学简化）
  pullActive: boolean;      // 内部上下拉是否当前接入并起作用
  idr: Level;               // 经施密特整形后的 MCU 读值
  activePath: string[];     // 当前导通的信号路径标识（用于 UI 流光）
  warnings: GpioWarning[];  // 当前警告列表
}
```

### 5.1 配置默认值

```typescript
const DEFAULT_CONFIG: GpioConfig = {
  direction: 'in',
  pull: 'none',
  outType: 'push-pull',
  odr: 0,
  external: 'floating',
};
```

默认进入"输入 + 浮空 + 外部断开"，学习者第一眼看到 IDR = X，直接建立"浮空是不确定"的认知。

---

## 6. 驱动强度模型

GPIO 引脚节点上可能同时存在多个驱动源。教学模型用**驱动强度**来决定最终电平，不计算真实电压电流。

### 6.1 各配置下的驱动源

| 驱动源 | 接入条件 | 强度 | 方向 |
|---|---|---|---|
| 外部源 | `external = 'high'` | strong-h | 高 |
| 外部源 | `external = 'low'` | strong-l | 低 |
| 外部源 | `external = 'floating'` | z | 无 |
| 推挽 P-MOS | `direction='out'` + `outType='push-pull'` + `odr=1` | strong-h | 高 |
| 推挽 N-MOS | `direction='out'` + `outType='push-pull'` + `odr=0` | strong-l | 低 |
| 开漏 N-MOS | `direction='out'` + `outType='open-drain'` + `odr=0` | strong-l | 低 |
| 开漏（两管都断） | `direction='out'` + `outType='open-drain'` + `odr=1` | z | 无 |
| 内部上拉 | `direction='in'` + `pull='up'` | weak-h | 高 |
| 内部下拉 | `direction='in'` + `pull='down'` | weak-l | 低 |

> **规则**：输入模式下，输出驱动器（P/N-MOS）强制为高阻 z（输出使能关闭）；输出模式下，内部上下拉默认不接入（`pull` 配置在输出模式下被忽略，UI 可置灰提示）。这与真实 STM32 使用直觉一致。

### 6.2 解析优先级

收集引脚节点上所有非 z 的驱动源后，按以下规则解析：

1. **冲突检测**：若同时存在 `strong-h` 和 `strong-l` → `contention = true`，`pinLevel = 'X'`，warnings 加入 `'contention'`。
2. **强驱动优先**：若无冲突，存在任一 `strong-*` → `pinLevel` 取强驱动电平（strong 覆盖 weak，不报警）。
3. **弱驱动**：无 strong，存在 `weak-h` 或 `weak-l` → `pinLevel` 取弱驱动电平。
4. **全高阻**：所有驱动源均为 z → `pinLevel = 'X'`，warnings 加入 `'floating'`。

### 6.3 施密特触发器（教学简化）

施密特触发器在模型中是一个**整形缓冲**，将引脚电平转换为 MCU 可读的数字值：

| 引脚电平 | IDR（施密特输出） |
|---|---|
| 1（高） | 1 |
| 0（低） | 0 |
| 'X'（浮空 / 冲突） | 'X' |

不模拟具体阈值电压、迟滞窗口、输入电容。"为什么存在"注释："把抖动或缓慢变化的电压整形成干净的 0 / 1，防止 MCU 读到中间态。"

### 6.4 概念边界澄清（Stage 1 强制约定）

以下三条为 Stage 1 的概念边界，用于消除歧义，**不改变第 7 节已有解析规则**：

1. **开漏输出模式下不模拟内部上拉**：Stage 1 暂不模拟"开漏输出模式下启用内部上拉"的真实硬件配置。本阶段开漏输出释放（ODR=1）后的高电平，**只通过外部激励（external='high'）来体现**，不通过内部上下拉体现。
2. **开漏不能主动输出高电平**："开漏需要上拉"的教学表述统一理解为——"开漏不能主动输出高电平；释放后，引脚电平需要由其他上拉来源决定。"所有文案不得暗示开漏本身能够主动输出高电平。
3. **浮空输入固定表现为 X**：Stage 1 中浮空输入（全高阻）固定表现为 `X`，**不模拟**真实硬件中可能出现的随机翻转、噪声变化或其他时序行为。`X` 是一个稳定的教学模型状态，不是随时间变化的随机值。

---

## 7. 状态转换规则（完整解析表）

以下表格覆盖 Stage 1 所有有意义的配置组合。Engine 的行为必须与此表完全一致，单元测试逐项验证。

### 7.1 输入模式（direction = 'in'）

输出驱动器强制高阻，引脚由外部源 + 内部上下拉决定。

| external | pull | 驱动源 | pinLevel | IDR | warnings |
|---|---|---|---|---|---|
| floating | none | 全 z | X | X | floating |
| floating | up | weak-h | 1 | 1 | — |
| floating | down | weak-l | 0 | 0 | — |
| high | none | strong-h | 1 | 1 | — |
| high | up | strong-h + weak-h（同向） | 1 | 1 | — |
| high | down | strong-h + weak-l（强胜弱） | 1 | 1 | — |
| low | none | strong-l | 0 | 0 | — |
| low | up | strong-l + weak-h（强胜弱） | 0 | 0 | — |
| low | down | strong-l + weak-l（同向） | 0 | 0 | — |

> 教学要点：外部强驱与内部弱上下拉相反时，**强胜弱**，不报警——这是正常使用场景（如上拉电阻也能被外部低拉成 0）。

### 7.2 输出模式 · 推挽（direction='out', outType='push-pull'）

| odr | external | 驱动源 | pinLevel | IDR | warnings |
|---|---|---|---|---|---|
| 1 | floating | strong-h（P 通） | 1 | 1 | — |
| 1 | high | strong-h + strong-h（同向） | 1 | 1 | — |
| 1 | low | strong-h + strong-l（对拉） | X | X | **contention** |
| 0 | floating | strong-l（N 通） | 0 | 0 | — |
| 0 | high | strong-l + strong-h（对拉） | X | X | **contention** |
| 0 | low | strong-l + strong-l（同向） | 0 | 0 | — |

> 教学要点：推挽 ODR=1 且外部强低（或 ODR=0 且外部强高）时，两个强驱动对拉 → contention。这是**驱动冲突关系**的教学演示，**不是实际短路电流仿真**。

### 7.3 输出模式 · 开漏（direction='out', outType='open-drain'）

P-MOS 恒关，只有 N-MOS 可拉低；ODR=1 时两管都断（高阻）。

| odr | external | pull（输出模式忽略） | 驱动源 | pinLevel | IDR | warnings |
|---|---|---|---|---|---|---|
| 0 | floating | 忽略 | strong-l（N 通） | 0 | 0 | — |
| 0 | high | 忽略 | strong-l + strong-h（对拉） | X | X | **contention** |
| 0 | low | 忽略 | strong-l + strong-l（同向） | 0 | 0 | — |
| 1 | floating | 忽略 | 全 z（两管都断） | X | X | floating + **open-drain-needs-pull** |
| 1 | high | 忽略 | strong-h（外部） | 1 | 1 | — |
| 1 | low | 忽略 | strong-l（外部） | 0 | 0 | — |

> 教学要点：开漏 ODR=1 时两管都断、引脚为高阻，若外部也断开则读 X。**开漏不能主动输出高电平；释放后，引脚电平需要由其他上拉来源决定。** 本阶段开漏释放后的高电平只通过外部激励（external='high'）来体现。这是开漏最核心的直觉。

### 7.4 输出模式下的 pull 配置

输出模式下 `pull` 配置被忽略（内部上下拉不接入），UI 中将上下拉控件置灰并提示"输出模式下内部上下拉不生效"。Engine 在输出模式下不将 weak-h / weak-l 加入驱动源集合。

---

## 8. Engine API

Engine 位于 `src/modules/gpio/engine/gpioEngine.ts`，纯 TS 类或纯函数集合，零 UI 依赖。

```typescript
class GpioEngine {
  /**
   * 对给定配置执行一次完整解析，返回派生状态。
   * 纯函数：不修改输入 config，不依赖任何外部状态。
   * 相同 config 必然返回相同 derived。
   */
  evaluate(config: GpioConfig): GpioDerived;

  /**
   * 收集引脚节点上所有非 z 的驱动源（内部辅助，可导出供测试）。
   */
  collectDrives(config: GpioConfig): DriveStrength[];

  /**
   * 施密特整形（内部辅助，可导出供测试）。
   */
  schmitt(pinLevel: Level): Level;
}
```

### 8.1 不可变性

`evaluate` 不修改输入的 `config` 对象，返回一个新的 `GpioDerived`。Store 层负责用新 derived 替换旧 derived。

### 8.2 架构边界（强制）

- `GpioEngine` 只能依赖 `gpioTypes.ts` 中定义的数据结构和纯逻辑。
- 禁止 import React、Zustand、DOM API、SVG API、Toast、Store 或任何界面层模块。
- 禁止在 Engine 内部调用任何 Store 方法或 `setState`。
- 正确数据流：`用户操作 → gpioStore（调用 Engine）→ GpioEngine.evaluate(config) → 返回 GpioDerived → Store 更新 derived → React UI 重渲染`。

---

## 9. UI 与 Engine 边界

### 9.1 职责划分

| 层 | 职责 | 禁止 |
|---|---|---|
| **GpioEngine**（纯 TS） | 解析配置 → 派生电平、导通状态、警告 | 任何 UI / DOM / Store 依赖 |
| **gpioStore**（Zustand） | 持有 `config`，调用 engine 得到 `derived`，提供 setters | 直接计算电平（必须委托 engine） |
| **React / SVG 视图** | 渲染配置控件、引脚动画台、读数面板、关卡条、真实结构图对照 | 包含任何解析逻辑（必须从 store.derived 读取） |

### 9.2 数据流

```
用户点击控件
  → gpioStore.setDirection / setPull / setOutType / setOdr / setExternal
    → 更新 config
    → 调用 engine.evaluate(config) 得到新 derived
    → Store 更新 derived
  → React UI 重渲染（电平颜色、导通路径流光、警告、IDR/ODR 读数）
```

### 9.3 配置控件与派生显示的分离

- 控件（方向、上下拉、输出类型、ODR、外部激励）只写 `config`。
- 所有显示（引脚电平、IDR、P/N 管导通状态、流光路径、警告）只读 `derived`。
- 视图中**不得**出现 `if (config.odr === 1 && config.outType === 'push-pull') then 亮` 这类自行推导的逻辑——必须读 `derived.pmosOn` / `derived.pinLevel`。

---

## 10. 真实 STM32 结构图对照规则

### 10.1 用途

真实结构图仅用于**建立"实验中的模块在真实芯片框图中大概对应哪里"的位置直觉**，不代表精确电路仿真。

### 10.2 实现方式

- 将用户提供的 STM32 GPIO 位结构图作为对照教学图，存放在 `src/modules/gpio/assets/`（或项目静态资源目录）。
- 提供一个"查看真实结构图"开关，切换为**双视图对照模式**：
  - 左侧：简化教学模型（可交互）。
  - 右侧：真实 STM32 位结构图，上面用半透明高亮框标注与当前选中模块对应的区域。
- 点击简化模型中的某个块（如 P-MOS），真实图上对应区域高亮描边并显示名称；反之亦然。
- 高亮区域用图片百分比坐标定义（`{ x, y, width, height }`，均为 0–100 的百分比），不依赖图片像素尺寸。

### 10.3 强制声明

在真实结构图视图的显著位置常驻说明：

> "此图为 STM32 参考手册中的 GPIO 位结构示意图。高亮仅用于建立模块位置对应关系，**不代表精确电气仿真**。本实验中的所有模型均为教学简化。"

### 10.4 不模拟的模块在真实图上的处理

真实图中出现但 Stage 1 不模拟的模块（模拟开关、AF mux、FT 可关断 VDD、TTL 选择等），在对照视图中：

- 用灰色半透明框标注；
- 悬停显示"后续阶段"标签；
- 不参与任何交互或高亮联动。

---

## 11. 教学关卡

Stage 1 内置 4 个引导关卡，位于底部关卡条。点击关卡即自动配置好对应工况，并给出一句引导语和"你应该观察到什么"。

### 关卡 1：浮空输入读到的是 X

- **自动配置**：direction=in, pull=none, external=floating。
- **引导语**："引脚什么都没接，MCU 能读到确定的 0 或 1 吗？"
- **预期观察**：IDR = X（灰半透明），警告"浮空输入"。
- **教学点**：浮空不是 0，是不确定；真实硬件中浮空引脚可能因噪声随机翻转。

### 关卡 2：强驱动胜过弱驱动

- **自动配置**：direction=in, pull=up（内部上拉弱高）, external=low（外部强低）。
- **引导语**："内部上拉想把引脚拉高，但外部强行接地，谁赢？"
- **预期观察**：pinLevel = 0, IDR = 0，上拉电阻导通但被外部强低盖过。
- **教学点**：强驱动胜过弱驱动；上拉电阻可以被外部低拉成 0，这是正常的。

### 关卡 3：推挽输出与外部强驱冲突

- **自动配置**：direction=out, outType=push-pull, odr=1, external=low。
- **引导语**："MCU 想输出高，但外部强行接地，会发生什么？"
- **预期观察**：pinLevel = X, contention=true, 红色警告"驱动冲突"，P-MOS 与外部低对拉。
- **教学点**：推挽不能与外部强驱对拉；这是驱动冲突关系的教学演示，**不是实际短路电流仿真**，真实硬件中可能产生大电流。

### 关卡 4：开漏输出需要上拉

- **自动配置**：direction=out, outType=open-drain, odr=1, external=floating。
- **引导语**："开漏输出 1，引脚真的是高电平吗？"
- **预期观察**：pinLevel = X, IDR = X，警告"开漏需要上拉"，P/N 管都断开（高阻）。
- **教学点**：开漏只能拉低或释放；**开漏不能主动输出高电平，释放后引脚电平需要由其他上拉来源决定。** 本阶段开漏释放后的高电平只通过外部激励来体现。

### 关卡通用规则

- 每个关卡点击后自动设置 config，不锁定控件——学习者可以在关卡基础上继续调整。
- 关卡条不使用模态弹窗，不打断操作流程。
- 关卡不含评分、积分、排行榜。

---

## 12. 页面布局（规格级）

GPIO 视图采用三栏 + 底栏布局，所有代码位于 `src/modules/gpio/view/` 或 `components/`。

```
┌ 顶栏：Electronics Lab   [ 数字逻辑 V0.1 | GPIO 入门 ]                    ┐
├───────────────┬───────────────────────────────────┬──────────────────────┤
│ 左：配置坞      │   中：GPIO 位单元动画台（横向流向）   │ 右：读数 + Why 面板    │
│ 方向 In/Out    │  外部源 ──▶〔保护二极管〕──▶ I/O引脚  │ 引脚电平: H/L/X       │
│ 上拉/下拉/无   │            ▲上拉电阻  ▼下拉电阻      │ IDR（输入寄存器）:    │
│ 推挽/开漏      │   ODR─▶输出控制─▶ P-MOS／N-MOS ─────┤   0/1/X              │
│ ODR 1/0        │            施密特触发器 ─▶ IDR      │ ODR（输出寄存器）:    │
│ 外部高/低/断开 │                                   │   0/1                │
│               │  [教学简化] 标注在各模块旁          │ ⚠ 警告列表            │
│               │                                   │ 📖 为什么存在（当前选中）│
├───────────────┴───────────────────────────────────┴──────────────────────┤
│ 底：教学关卡条（浮空X / 强胜弱 / 推挽冲突 / 开漏需上拉）  [查看真实结构图]  │
└───────────────────────────────────────────────────────────────────────────┘
```

### 12.1 中间动画台布局规则

- 严格按真实框图相对位置摆放：保护二极管在最靠引脚处、上拉到 VDD / 下拉到 VSS、P-MOS 在上 N-MOS 在下、施密特在通往内部数据寄存器的支路上。
- 电平颜色统一：高=暖色亮、低=蓝/暗、浮空 X=灰半透明、冲突=红紫闪烁。
- 导通路径做流光动画，关断器件变灰。
- 每个模块旁有"教学简化"小字标签和"为什么存在"短注释入口。

### 12.2 顶栏模块切换

- 顶栏显示两个模块入口：`数字逻辑 V0.1`（默认选中）、`GPIO 入门`。
- 切换不刷新页面，仅在 App 层切换挂载的模块组件。
- 数字逻辑 V0.1 的内部状态（电路、缩放、选中）在切换时保留（由其自身 store 管理）。

---

## 13. Slice 划分与每个 Slice 的 DoD

开发严格按 G0 → G1 → G2 → G3 → G4 → G5 顺序执行，**每完成一个 Slice 停下来等待用户验收**，不一次性完成整个 Stage 1。

### G0：地基（模块切换壳 + 类型 + 纯 Engine + 单元测试）

**目标**：项目外壳支持模块切换，GPIO 纯引擎可运行且有测试，无复杂 UI。

**任务**：
- 在 App 层增加顶栏模块切换入口（数字逻辑 V0.1 / GPIO 入门），默认进入数字逻辑 V0.1。
- 创建 `src/modules/gpio/` 目录结构（`engine/`、`store/`、`view/` 占位）。
- 定义 `gpioTypes.ts`（Level、GpioConfig、GpioDerived、DriveStrength、GpioWarning 等全部类型）。
- 实现 `GpioEngine.evaluate()`（驱动强度收集、冲突检测、解析优先级、施密特整形）。
- 实现 `gpioStore`（持有 config + derived，setters，调用 engine）。
- GPIO 视图占位（仅显示"GPIO 入门模块开发中" + 当前 config 的 JSON 预览，用于验证数据流）。
- 编写纯引擎单元测试（见第 14 节测试要求）。

**DoD（验收标准）**：
- [ ] 顶栏可在"数字逻辑 V0.1"和"GPIO 入门"之间切换，默认进入数字逻辑 V0.1。
- [ ] 切换到数字逻辑 V0.1 时，原有功能完全正常（电路、拖拽、连线、仿真、真值表、Undo/Redo、保存加载均不受影响）。
- [ ] `src/modules/gpio/engine/` 下无任何 React / Zustand / DOM / SVG import。
- [ ] `GpioEngine.evaluate()` 对第 7 节所有解析表组合输出正确。
- [ ] GPIO store 的 setters 能正确更新 config 并触发 engine 重新计算 derived。
- [ ] 纯引擎单元测试全部通过（见第 14 节）。
- [ ] GPIO 占位视图能显示当前 config 和 derived 的 JSON，验证数据流闭环。
- [ ] `npm run test:run` 全部通过（V0.1 原有测试 + GPIO 新测试）。
- [ ] `npm run build` 成功。
- [ ] 未修改 `src/engine/` 下任何文件，未修改 V0.1 的 Circuit / Device / Wire 数据模型。

### G1：输入通路可视化

**目标**：完成输入路径的完整可视化，跑通"外部 → 引脚 → 上下拉 → 施密特 → IDR"。

**任务**：
- 实现 GPIO 位单元动画台的 SVG 骨架（外部源、保护二极管、引脚节点、上拉/下拉电阻、施密特触发器、IDR 读数）。
- 实现配置坞的输入模式相关控件（方向、上下拉、外部激励）。
- 实现电平颜色渲染（H/L/X）与导通路径流光。
- 实现"教学简化"标签与"为什么存在"短注释（输入路径相关模块）。
- 实现读数面板（引脚电平、IDR、警告）。
- 关卡 1（浮空输入）、关卡 2（强胜弱）可用。

**DoD**：
- [ ] 输入模式下，外部高/低/断开、上拉/下拉/无的所有组合，引脚电平和 IDR 与第 7.1 节解析表一致。
- [ ] 浮空输入时 IDR = X 并显示"浮空输入"警告。
- [ ] 外部强驱与内部上下拉相反时，强胜弱，引脚电平取强驱动值，不报警。
- [ ] 导通路径有流光动画，关断器件变灰。
- [ ] 每个输入路径模块有"教学简化"标签和"为什么存在"注释。
- [ ] 关卡 1、关卡 2 点击后自动配置正确，引导语和预期观察符合第 11 节。
- [ ] 输出模式相关控件在 G1 可暂不实现或置灰。
- [ ] 未引入 V0.1 不相关的修改。

### G2：输出通路 · 推挽

**目标**：完成输出路径的推挽模式可视化，跑通"ODR → 输出控制 → P/N-MOS → 引脚"。

**任务**：
- 实现输出控制逻辑块、P-MOS / N-MOS 简化符号（教学简化标注）。
- 实现方向切换（In/Out），输出模式下输入支路置灰、输出驱动器激活。
- 实现 ODR 控件（0/1）、输出类型控件（推挽/开漏，G2 先实现推挽，开漏可置灰）。
- 实现 P-MOS / N-MOS 导通状态的视觉反馈（根据 derived.pmosOn / nmosOn）。
- 推挽模式下引脚电平与 IDR 与第 7.2 节解析表一致。
- 输出模式下上下拉控件置灰并提示"输出模式下内部上下拉不生效"。

**DoD**：
- [ ] 推挽模式下，ODR=1 时 P-MOS 导通、引脚高；ODR=0 时 N-MOS 导通、引脚低。
- [ ] 推挽 ODR=1 + 外部低（或 ODR=0 + 外部高）时，contention=true，引脚 X，红色警告，警告文案符合第 4.3 节。
- [ ] 方向切换时，输入/输出支路正确激活/置灰。
- [ ] 输出模式下上下拉控件置灰，engine 不将 weak 驱动加入集合。
- [ ] P-MOS / N-MOS 有"教学简化"标签和"为什么存在"注释。
- [ ] 未修改 V0.1 任何文件。

### G3：开漏输出 + 冲突完善

**目标**：完成开漏模式，完善冲突警告与开漏需上拉提示。

**任务**：
- 实现开漏输出类型（P-MOS 恒关，只有 N-MOS 可拉低，ODR=1 时两管都断=高阻）。
- 开漏模式下引脚电平与 IDR 与第 7.3 节解析表一致。
- 实现"开漏需要上拉"警告（开漏 ODR=1 + 外部断开时）。
- 完善推挽冲突的视觉表现（红色闪烁、导通路径红色）。
- 关卡 3（推挽冲突）、关卡 4（开漏需上拉）可用。
- 施密特触发器的"为什么存在"注释完善。

**DoD**：
- [ ] 开漏 ODR=0 时 N-MOS 导通、引脚低；ODR=1 时两管都断、引脚高阻。
- [ ] 开漏 ODR=1 + 外部断开时，引脚 X，警告"开漏需要上拉"。
- [ ] 开漏 ODR=0 + 外部高时，contention=true（N-MOS 强低 vs 外部强高）。
- [ ] 推挽冲突视觉表现完整（红色闪烁 + 警告文案符合第 4.3 节）。
- [ ] 关卡 3、关卡 4 点击后自动配置正确，引导语和预期观察符合第 11 节。
- [ ] 四个关卡全部可用。
- [ ] 未修改 V0.1 任何文件。

### G4：保护二极管 + 真实结构图对照

**目标**：完成保护二极管的教学展示，以及真实 STM32 结构图的位置对照功能。

**任务**：
- 在引脚到 VDD / VSS 处画出保护二极管（静态展示，教学简化标注）。
- 实现保护二极管的"为什么存在"注释："静电/超压时把电压钳回电源轨，保护内部电路"。
- 可选：一个纯演示的"负压脉冲 → 下二极管导通"小动画（不参与数值计算，仅视觉演示）。
- 实现"查看真实结构图"开关与双视图对照模式。
- 将用户提供的 STM32 GPIO 位结构图加入项目静态资源。
- 定义各模块在真实图上的高亮热区（百分比坐标）：外部输入/引脚、保护二极管、上拉/下拉、施密特触发器、IDR、ODR、输出控制、P-MOS、N-MOS。
- 实现简化模块与真实图热区的双向高亮联动。
- 真实图上不模拟的模块（模拟开关、AF mux、FT 可关断 VDD、TTL 选择等）置灰标注"后续阶段"。
- 真实结构图视图常驻第 10.3 节的强制声明。

**DoD**：
- [ ] 保护二极管在引脚旁正确显示，有"教学简化"标签和"为什么存在"注释。
- [ ] "查看真实结构图"开关可切换双视图对照模式。
- [ ] 点击简化模型中的模块，真实图上对应热区高亮；点击真实图热区，简化模型对应模块高亮。
- [ ] 真实图上所有 Stage 1 模拟的模块都有对应热区。
- [ ] 真实图上不模拟的模块置灰并标注"后续阶段"。
- [ ] 真实结构图视图有常驻声明："高亮仅用于建立模块位置对应关系，不代表精确电气仿真"。
- [ ] 保护二极管不参与任何电平计算（纯展示）。
- [ ] 未修改 V0.1 任何文件。

### G5：打磨 + 测试补齐 + 冻结

**目标**：补全测试，修复边界 bug，视觉细节优化，GPIO Stage 1 冻结。

**任务**：
- 补全所有 P0 单元测试（见第 14 节）。
- 边界情况手动测试：所有配置组合快速切换、方向快速切换、外部激励快速切换、关卡连续点击。
- 视觉细节：端口/引脚电平颜色与发光、导通路径流光、P/N-MOS 导通视觉、警告样式、"教学简化"标签样式、关卡条样式。
- 读数面板完善（IDR/ODR 标签符合第 4.1 节，概念模型声明常驻）。
- 响应式：在常见桌面分辨率下布局正常（Stage 1 不要求移动端适配）。
- README 中增加 GPIO 入门模块的简要说明。
- 编写 GPIO Stage 1 的交接说明。

**DoD**：
- [ ] 所有 P0 测试通过（见第 14 节）。
- [ ] 第 7 节所有解析表组合在 UI 中表现正确。
- [ ] 四个关卡全部可用且引导正确。
- [ ] 真实结构图对照功能正常。
- [ ] IDR/ODR 标签符合第 4.1 节，概念模型声明常驻。
- [ ] 所有简化模型有"教学简化"标注。
- [ ] 推挽冲突警告文案符合第 4.3 节，不暗示精确电气仿真。
- [ ] 边界情况无崩溃、无卡死、无控制台错误。
- [ ] `npm run test:run` 全部通过（V0.1 + GPIO）。
- [ ] `npm run build` 成功。
- [ ] 未修改 V0.1 任何业务代码（仅 README 可增加 GPIO 说明）。
- [ ] GPIO Stage 1 正式冻结，不进入 Stage 2。

---

## 14. 测试要求

### 14.1 测试框架

沿用项目现有 Vitest，测试文件与源文件同目录，命名 `*.test.ts`。

### 14.2 必须覆盖的测试范围（P0）

| 模块 | 测试内容 | 优先级 |
|---|---|---|
| **驱动强度收集** | 各配置组合下 collectDrives 返回正确的驱动源集合（输入/输出、推挽/开漏、ODR、外部、上下拉） | P0 |
| **输入模式解析** | 第 7.1 节全部 9 种组合的 pinLevel / IDR / warnings 正确 | P0 |
| **推挽输出解析** | 第 7.2 节全部 6 种组合的 pinLevel / IDR / contention / warnings 正确 | P0 |
| **开漏输出解析** | 第 7.3 节全部 6 种组合的 pinLevel / IDR / contention / warnings 正确 | P0 |
| **冲突检测** | strong-h + strong-l 同时存在时 contention=true、pinLevel='X'、warnings 含 'contention' | P0 |
| **强胜弱** | strong + weak 反向时 pinLevel 取 strong 值、contention=false、无警告 | P0 |
| **浮空检测** | 全 z 时 pinLevel='X'、warnings 含 'floating' | P0 |
| **开漏需上拉** | 开漏 ODR=1 + external=floating 时 warnings 含 'open-drain-needs-pull' | P0 |
| **施密特整形** | H→1、L→0、X→X | P0 |
| **输出模式忽略 pull** | 输出模式下 pull=up/down 不产生 weak 驱动 | P0 |
| **P/N-MOS 导通状态** | 推挽 ODR=1→pmosOn=true/nmosOn=false；ODR=0→pmosOn=false/nmosOn=true；开漏 ODR=1→都 false；开漏 ODR=0→nmosOn=true | P0 |
| **不可变性** | evaluate 不修改输入 config 对象 | P0 |
| **纯函数性** | 相同 config 多次调用返回相同 derived | P0 |
| **默认配置** | DEFAULT_CONFIG 下 evaluate 返回浮空 X + floating 警告 | P0 |
| **Engine 纯 TS** | 静态检查：gpioEngine.ts 不 import React/Zustand/DOM/SVG（可在测试中用 import 路径断言或人工审查） | P0 |

### 14.3 测试文件结构

```
src/modules/gpio/
├── engine/
│   ├── gpioTypes.ts
│   ├── gpioEngine.ts
│   └── gpioEngine.test.ts       ← 引擎核心测试（驱动强度、解析表、冲突、施密特）
├── store/
│   ├── gpioStore.ts
│   └── gpioStore.test.ts        ← Store 行为测试（setters 触发 engine、derived 更新）
└── view/
    └──（G1 及以后的视图组件，Stage 1 不要求 UI 单元测试）
```

### 14.4 一致性保证

GPIO Stage 1 的"实时 UI 表现"与"Engine 解析结果"必须完全一致。测试方法：

- 对第 7 节所有解析表组合，调用 `engine.evaluate(config)`，记录 derived。
- UI 层必须只读 derived 渲染，不得自行推导（第 9.3 节强制）。
- 通过代码审查或 lint 规则确保视图中无 `if (config.xxx) then 亮` 类自行推导逻辑。

---

## 15. 修订记录

| 版本 | 日期 | 内容 |
|---|---|---|
| v1.0 | 2026-09-15 | 初版完整规格。基于用户确认的方案调整：顶栏模块切换（默认数字逻辑 V0.1）、独立目录与独立 Engine、IDR/ODR 主标签 + 中文解释 + 概念模型声明、真实结构图仅做位置对应且所有简化模型标注"教学简化"、四个教学关卡保留、推挽冲突明确为驱动冲突关系而非实际短路电流仿真、G0 仅做模块切换壳+类型+纯Engine+测试、逐 Slice 验收、完整非目标清单、与 V0.1 隔离规则。 |
| v1.1 | 2026-09-15 | G0 开工前三处概念澄清（不改变第 7 节解析规则）：① 明确 Stage 1 暂不模拟"开漏输出模式下启用内部上拉"，开漏释放后高电平只通过外部激励体现；② "开漏需要上拉"统一表述为"开漏不能主动输出高电平；释放后引脚电平需要由其他上拉来源决定"，不暗示开漏本身能主动输出高；③ 明确浮空输入固定表现为 X，不模拟随机翻转、噪声变化或其他时序行为。 |

---

> **本规格确认后进入 G0 开发。G0 完成后停下来等待验收，不继续 G1。任何对本规格的修改必须先更新本文档并经用户确认。**
