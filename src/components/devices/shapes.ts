/** 器件图形常量（ANSI 风格逻辑门符号，逻辑像素坐标，相对器件左上角） */

/** AND：D 形 */
export const AND_PATH = 'M0,0 L34,0 C48,0 54,30 34,60 L0,60 Z';

/** OR：凹背 + 凸右弧 */
export const OR_PATH = 'M4,0 C24,0 42,12 42,30 C42,48 24,60 4,60 C12,45 12,15 4,0 Z';

/** XOR：OR 主体 + 左侧附加弧 */
export const XOR_PATH = 'M0,0 C20,0 38,12 38,30 C38,48 20,60 0,60 C8,45 8,15 0,0 Z';
export const XOR_INNER = 'M0,8 C7,22 7,38 0,52';

/** NOT：三角形 + 反相气泡 */
export const NOT_PATH = 'M0,0 L26,20 L0,40 Z';
export const NOT_BUBBLE_CX = 33;
export const NOT_BUBBLE_CY = 20;
export const NOT_BUBBLE_R = 4.5;

/** Switch 滑块轨道 / 按钮圆角矩形 */
export const SWITCH_TRACK_X = 14;
export const SWITCH_TRACK_Y = 13;
export const SWITCH_TRACK_W = 34;
export const SWITCH_TRACK_H = 14;
export const SWITCH_TRACK_R = 7;
export const SWITCH_KNOB_ON_CX = 42;
export const SWITCH_KNOB_OFF_CX = 22;
export const SWITCH_KNOB_CY = 20;
export const SWITCH_KNOB_R = 7;

export const BUTTON_W = 60;
export const BUTTON_H = 40;
export const BUTTON_R = 6;

export const LED_CX = 20;
export const LED_CY = 20;
export const LED_R = 11;
export const LED_GLOW_R = 16;
export const LED_CORE_R = 5;
