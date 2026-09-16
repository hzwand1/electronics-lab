# Electronics Lab — Hardware Lab Stage 2～Stage 4 总体实施规划

> 版本：v1.0
> 状态：已确认，作为 Hardware Lab 长期架构约束与 Slice 划分依据
> 作用：明确 Hardware Lab 最终要去哪里，但每个 Slice 严格逐步实现，禁止一次性塞入多个模块。

---

## 一、最终目标

Hardware Lab 最终不是一个"画面包板的工具"，而是一个可以逐步用于学习 STM32、电路基础和电赛控制类知识的虚拟实验环境。

目标场景包括：

```
3.3V │ 电阻 │ LED │ GND
```

以及：

```
STM32F103C8T6 │ GPIO │ Resistor │ LED │ GND
```

以及：

```
Button ───── GPIO Input
      │
STM32F103C8T6
      │
   GPIO Output
      │
    Buzzer
```

未来进一步扩展：STM32 ├─ GPIO ├─ EXTI ├─ Timer ├─ PWM ├─ ADC ├─ UART ├─ Encoder └─ Motor。

**当前阶段绝对不要一次完成这些功能，必须按照 Slice 逐步实现。**

---

## 二、总体架构原则

继续保持当前架构：

```
Component
    ↓
ComponentPin
    ↓
Node
    ↓
Wire / BreadboardHole
```

必须坚持：

- ComponentPin → Node
- 而不是 Component → Hole、ComponentPin → Wire、Wire → Pin
- Hole 只是 Node 的物理位置
- Wire 只是 Node ↔ Node 的连接
- ComponentPin 才是元件真正的电气端口

---

## 三、最终 Hardware 数据结构（四层）

### Layer 1：Physical Layer（视觉与物理位置）
Breadboard Hole、Component position、Component rotation、Pin position、Wire path。

### Layer 2：Connectivity Layer（连接关系）
Hole → Node、ComponentPin → Node、Wire → Node ↔ Node。
核心问题只有一个：**哪些 Pin 最终属于同一个电气 Node？**

### Layer 3：Electrical / Digital Layer
HIGH / LOW / X / FLOATING，以及 Power / Ground / GPIO Input / GPIO Output / Switch / Button / LED / Buzzer。

### Layer 4：MCU Peripheral Layer（以后才处理）
GPIO / EXTI / Timer / PWM / ADC / UART / Encoder / Motor / PID。

**当前 Stage 2 不允许碰 Layer 4。**

---

## 四、Stage 2：基础元件系统

目标：Hardware Lab 能真正摆放、连接并运行最基础电子元件。

最终 Stage 2 元件：Power 3.3V、Power 5V、GND、Resistor、LED、Button、Switch、Active Buzzer。
**暂时不加入 STM32。**

---

## 五、Stage 2 Slice 顺序

| Slice | 内容 | 状态 |
|---|---|---|
| S2-0 | Component / ComponentPin 数据模型 | ✅ 完成 |
| S2-1 | Pin → Node 连接系统 | 当前 |
| S2-2 | Component UI 基础 | 未开始 |
| S2-3 | Power + GND | 未开始 |
| S2-4 | Resistor | 未开始 |
| S2-5 | LED | 未开始 |
| S2-6 | 首个完整电路（3.3V→R→LED→GND） | 未开始 |
| S2-7 | Button | 未开始 |
| S2-8 | Switch | 未开始 |
| S2-9 | Active Buzzer | 未开始 |
| S2-10 | Component 属性 / 右键菜单 | 未开始 |
| S2-11 | 保存 / 导入 / 导出 | 未开始 |
| S2-12 | Stage 2 冻结 | 未开始 |

---

## 六、S2-1：ComponentPin → Node（当前唯一允许执行的 Slice）

### 目标
实现 ComponentPin ↓ nodeId ↓ Node，使 ComponentPin 可以真正连接到面包板中的 Node。
当前 pin.nodeId === null；S2-1 之后允许 pin.nodeId === "node_xxx"。

### 连接模型
必须提供纯数据操作：`connectPinToNode(pinId, nodeId)` / `disconnectPin(pinId)` 或等价 API。

### 重要规则
- 一个 ComponentPin 最多连接一个 Node
- 一个 Node 可以连接多个 ComponentPin、包含多个 Hole、连接多个 Wire
- 不得复制 Node：Pin 直接引用已有 nodeId，绝不创建 "Pin 专属 Node"

### 移动元件行为
Component 已连接时，用户移动元件 → position 改变，**默认 nodeId 不改变**。视觉位置与电气连接是两个不同概念。S2-1 只实现数据关系。

### 删除 Component
删除 Component 时删除 Component + ComponentPin，Pin 与 Node 的关系自然解除。**禁止删除 Node / Hole / Wire / 其他 Component。**

### 非法操作（必须拒绝）
- Pin 不存在
- Node 不存在
- 已连接 Pin 再连接新 Node：允许（重新绑定），结果 pin.nodeId = 新 Node，不能同时属于两个

### 纯函数要求
连接逻辑放在 `src/modules/hardware/`（如 `engine/connectivity.ts`），不得写进 React Component / DOM / SVG event handler / Zustand UI 逻辑。

### S2-1 明确禁止
不做 Component UI、不画 LED/电阻、不加电源、不做 GPIO/STM32、不做电压/电流模拟、不做 LED 发光/蜂鸣器/Button、不改 Logic Lab、不改 GPIO Module。

---

## 七、S2-2：Component UI

S2-1 完成以后才进入。目标：让用户在 Hardware Lab 里真正看到 Component。
首先不要做真正 LED，先做一个通用的 GenericComponent，测试 Component 系统。
需要支持：放置、选择、移动、删除、Pin 显示。
重点不是漂亮，重点是验证 Component → Pin → Node 能够正确工作。

---

## 八、S2-3：Power / GND

加入第一个真正元件。Parts Library：POWER ├─ 3.3V ├─ 5V └─ GND。
其中 3.3V → HIGH，5V → HIGH，GND → LOW。
注意：当前只是数字抽象，不是模拟 3.300V / 5.000V。

---

## 九、S2-4：Resistor

加入 Resistor，视觉 Pin1 ──[ R ]── Pin2，支持 220Ω / 330Ω / 1kΩ / 10kΩ / 100kΩ，默认 1kΩ。
Stage 2 电阻仅作为连接型元件，暂时不计算电流、压降、功率。

---

## 十、S2-5：LED

加入 LED，Pins：A = Anode，K = Cathode。视觉状态：OFF / ON / UNKNOWN。
最简单规则：A = HIGH，K = LOW → LED ON；其他情况 OFF / UNKNOWN。
现阶段不计算 Vf / mA / 亮度 / 颜色波长。

---

## 十一、S2-6：第一个完整 Hardware Lab 电路

Stage 2 第一个真正 milestone。目标：用户可以手动摆 3.3V │ R │ LED │ GND，连接后 LED ON；断开任意节点 LED OFF / UNKNOWN。
这一刻 Hardware Lab 就从面包板绘图器第一次成为电路实验工具。

---

## 十二、S2-7：Button

Momentary Button，状态 released / pressed。鼠标按住 → pressed，松开 → released。
结构状态与运行状态必须分离：不要把 pressed 写进永久项目结构。

---

## 十三、S2-8：Switch

状态 open / closed，点击切换。与 Button 区别：Button → momentary，Switch → persistent toggle。

---

## 十四、S2-9：Active Buzzer

只实现 Active Buzzer，两个 Pin + / -。规则：+ = HIGH，- = LOW → ON，否则 OFF。
暂时不要真正播放声音也可以，UI 首先显示 BUZZER ON，后面再加 Web Audio。
不要做 Passive Buzzer / Frequency / Tone / PWM（这些属于 Timer / PWM）。

---

## 十五、Stage 2 最终成果

Stage 2 冻结以后，Parts Library 应至少有：

```
Basic   ├─ Resistor ├─ LED ├─ Button ├─ Switch └─ Active Buzzer
Power   ├─ 3.3V ├─ 5V └─ GND
```

用户已经能够做：电源 + 电阻 + LED、电源 + Button + LED、电源 + Switch + Buzzer。

---

## 十六、Stage 3：STM32F103C8T6 芯片层

Stage 2 完成以后才正式加入 MCU。第一颗 MCU 定为 STM32F103C8T6。
Stage 3 第一阶段仍然不要模拟 STM32，先把它作为真实的 Hardware Component 加进来。

### Stage 3 Slice
S3-0 MCU 通用数据模型 → S3-1 STM32F103C8T6 元数据 → S3-2 MCU 视觉组件 → S3-3 MCU Pin 布局 → S3-4 MCU 放置/移动/删除 → S3-5 MCU Pin → Node → S3-6 电源 Pin → S3-7 GPIO Pin 分类 → S3-8 STM32 属性面板 → S3-9 Stage 3 冻结。

### STM32 Component 与 McuDefinition
未来模型 Component { type: "stm32f103c8t6" }，但 MCU 特有信息不要全部塞进 Component，应该独立 McuDefinition：
```
interface McuDefinition {
  model: string
  package: string
  pins: McuPinDefinition[]
}
```

### MCU Pin 命名
MCU Pin 不应该只是 Pin1/Pin2，而应拥有真正名称：PA0/PA1/.../PB0/.../PC13、VDD/VSS/VDDA/VSSA、NRST、BOOT0。
后续还需要知道 PA0 ├─ GPIO ├─ ADC ├─ Timer └─ ...，但 Stage 3 暂时只记录 metadata，不实现外设。

### MCU 视觉
第一版做 STM32F103C8T6 最小系统板 / Blue Pill 式开发板抽象，而不是 LQFP48 裸芯片。
原因：学习 STM32 时真正接线通常接的是开发板 Pin Header，而不是直接给 LQFP48 焊线。未来再增加 Bare STM32F103C8T6。

### Stage 3 完成后的效果
元件库有 MCU（STM32F103C8T6）+ Basic + Power。用户可以搭 STM32 │ PA0 │ Resistor │ LED │ GND，但 PA0 还不会真正输出 HIGH（这属于 Stage 4）。

---

## 十七、Stage 4：GPIO 与 Hardware Lab 打通

非常关键的一层。项目现在已经有一个独立 GPIO 学习模块，Stage 4 不应该重新写 GPIO，而是建立：

```
GPIO Module
    ↓
MCU Runtime
    ↓
STM32 Pin
    ↓
ComponentPin
    ↓
Node
    ↓
LED / Button / Buzzer
```

### 第一个目标
实现 STM32 PA0 Mode = Output，Output = HIGH，然后 Hardware Lab PA0 │ R │ LED │ GND 结果 LED ON；改 PA0 = LOW 结果 LED OFF。这是整个项目非常重要的 milestone。

### 第二个 GPIO 实验（输入）
3.3V │ Button │ PA1，STM32 PA1 = Input。用户按下 Button → PA1 reads HIGH，松开 → LOW / FLOATING。以后再加入 Pull-Up / Pull-Down。

### 第三个 GPIO 实验
Button │ PA1 → STM32 → PA0 │ Buzzer │ GND。逻辑：Button pressed → PA1 HIGH → 用户程序/学习模型 → PA0 HIGH → Buzzer ON。这时就已经很接近真正 STM32 入门实验了。

---

## 十八、Stage 5：EXTI / Timer / PWM / ADC / UART

Stage 4 稳定后进入。例如 STM32 PWM │ LED 可以做 LED 亮度；STM32 PWM │ Passive Buzzer 可以做频率/音调。

---

## 十九、Stage 6：Motor / Encoder / Servo / Driver / Sensor

等前面稳定后。最终形成 Encoder ↓ STM32 ↓ PID ↓ PWM ↓ Motor Driver ↓ Motor，这才是电赛控制类真正需要的体系。

---

## 二十、Stage 7：PID / Control Experiments

最终：Electronics Competition Control Lab。

---

## 二十一、最终路线图

```
Stage 1 ✅  Breadboard / Hole / Node / Wire
    ↓
Stage 2 ← 当前  Basic Components / Power / GND / Resistor / LED / Button / Switch / Buzzer
    ↓
Stage 3  STM32F103C8T6 MCU Component / Pin Map
    ↓
Stage 4  GPIO ↔ Hardware Integration
    ↓
Stage 5  EXTI / Timer / PWM / ADC / UART
    ↓
Stage 6  Motor / Encoder / Servo / Driver / Sensor
    ↓
Stage 7  PID / Control Experiments
    ↓
Electronics Competition Control Lab
```

---

## 二十二、执行纪律

1. 每个 Slice 完成后立即停止，等待验收，不自动进入下一 Slice。
2. 看到"STM32、LED、蜂鸣器"等未来内容时，不得一口气往项目里塞十几个模块。
3. 本文件是长期架构约束，具体每个 Slice 的详细规格在执行前单独确认。
4. V0.1 Digital Logic 与 GPIO Stage 1 始终保持冻结，不得为 Hardware Lab 重构。
5. Hardware Engine 始终保持纯 TypeScript，不依赖 React / DOM / Zustand / UI。
