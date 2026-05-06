export type FlowAction = 'goto' | 'click' | 'type' | 'wait' | 'scroll' | 'scroll_bottom' | 'screenshot';

export interface FlowStep {
  action: FlowAction;
  selector?: string;
  url?: string;
  text?: string;
  ms?: number;
  to?: string;
  speed?: string;
  for?: string;
}

export interface FlowScript {
  name: string;
  steps: FlowStep[];
}
