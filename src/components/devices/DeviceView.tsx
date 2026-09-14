import type { ReactNode } from 'react';
import { Device } from '../../engine/types';
import { DeviceWrapper } from './DeviceWrapper';
import { AndDevice } from './AndDevice';
import { OrDevice } from './OrDevice';
import { NotDevice } from './NotDevice';
import { XorDevice } from './XorDevice';
import { ButtonDevice } from './ButtonDevice';
import { SwitchDevice } from './SwitchDevice';
import { LedDevice } from './LedDevice';

/** 按器件类型分发渲染（统一被 DeviceWrapper 包裹） */
export function DeviceView({ device }: { device: Device }) {
  let body: ReactNode = null;
  switch (device.type) {
    case 'and':
      body = <AndDevice device={device} />;
      break;
    case 'or':
      body = <OrDevice device={device} />;
      break;
    case 'not':
      body = <NotDevice device={device} />;
      break;
    case 'xor':
      body = <XorDevice device={device} />;
      break;
    case 'button':
      body = <ButtonDevice device={device} />;
      break;
    case 'switch':
      body = <SwitchDevice device={device} />;
      break;
    case 'led':
      body = <LedDevice device={device} />;
      break;
  }
  return <DeviceWrapper device={device}>{body}</DeviceWrapper>;
}
