export interface ImageInfo {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  transferSize: number; // bytes from network
  mimeType: string;
  hasLazy: boolean;
  hasFetchPriority: boolean;
  hasWidthHeight: boolean; // inline width/height attrs
  hasAspectRatio: boolean; // aspect-ratio CSS
  belowFold: boolean;
  isLcp: boolean;
}

export interface ScriptInfo {
  url: string;
  transferSize: number;
  isThirdParty: boolean;
  hasAsync: boolean;
  hasDefer: boolean;
  isModule: boolean;
  inHead: boolean; // true if the <script> tag is inside <head>
  body?: string; // response text (if captured)
}

export interface StylesheetInfo {
  url: string;
  transferSize: number;
  isRenderBlocking: boolean; // in head without useful media
  mediaAttr: string;
  usedBytes: number;
  totalBytes: number;
}

export interface AnimationInfo {
  selector: string;
  property: string; // animated CSS property name
  animationName: string;
}

export interface LibSignature {
  name: string;
  fingerprints: string[];
  duplicateRiskWeight: number;
}

export interface DetectedLib {
  name: string;
  urls: string[];
}

export type ThirdPartyCategory = 'analytics' | 'ads' | 'ab_testing' | 'cdn' | 'tag_manager' | 'other_third_party';

export interface ImageFormatEstimate {
  webpBytes: number;
  avifBytes: number;
  savingsPercent: number;
}
