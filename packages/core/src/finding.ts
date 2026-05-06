export type FindingCategory = 'direct_impact' | 'theoretical_debt';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingConfidence = 'high' | 'medium' | 'low';

export type FindingType =
  | 'long_task'
  | 'long_animation_frame'
  | 'bad_inp'
  | 'bad_lcp'
  | 'bad_cls'
  | 'high_tbt'
  | 'forced_reflow'
  | 'heap_leak'
  | 'detached_dom'
  | 'listener_growth'
  | 'n_plus_one'
  | 'waterfall'
  | 'overfetch'
  | 'under_paginate'
  | 'duplicate_fetch'
  | 'cross_component_dup'
  | 'no_compression'
  | 'no_cache_headers'
  | 'http_version'
  | 'excessive_origins'
  | 'missing_preconnect'
  | 'high_db_time'
  | 'ttfb_anomaly'
  | 'offset_pagination'
  | 'wide_response'
  | 'computed_fields'
  | 'auth_penalty'
  | 'cold_warm_gap'
  | 'oversized_image'
  | 'wrong_format'
  | 'no_lazy'
  | 'bad_lcp_priority'
  | 'img_cls'
  | 'layout_animation'
  | 'will_change_spam'
  | 'blocking_css'
  | 'unused_css'
  | 'sync_script'
  | 'oversized_bundle'
  | 'duplicate_lib'
  | 'tree_shaking_fail'
  | 'no_code_splitting'
  | 'heavy_third_party'
  | 'excessive_dom_size'
  | 'unvirtualized_list'
  | 'wasted_mutation'
  | 'hydration_cost'
  | 'hydration_mismatch'
  | 'render_storm'
  | 'memoization_gap'
  | 'inline_allocations'
  | 'leaked_interval'
  | 'leaked_listener'
  | 'unbounded_state'
  | 'recursive_handler'
  | 'stale_closure'
  | 'infinite_refetch';

export interface EvidenceRef {
  kind: 'cdp_trace' | 'har_entry' | 'heap_snapshot' | 'screenshot' | 'console_log' | 'mutation_log';
  path: string;
  range?: { start: number; end: number };
  selector?: string;
  description: string;
}

export interface Finding {
  id: string;
  module: string;
  type: FindingType;
  category: FindingCategory;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  title: string;
  description: string;
  observedIn: string;
  evidence: EvidenceRef[];
  metrics: Record<string, number | string>;
  recommendation: string;
  scoreImpact: number;
}
