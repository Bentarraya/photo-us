// Public entry point for the filter module.
//
// The iPhone preset grading lives in ./iphoneFilters (WebGL first, Canvas 2D
// fallback). This module only re-exports it so screens can import from
// './filters' without reaching into the implementation file.

import { FILTERS_REGISTRY, getFilterById } from './filters';

export { FILTERS_REGISTRY, getFilterById };

export {
  applyIphoneFilter,
  applyIphoneFilterWebGL,
  applyIphoneFilterCanvas2D,
  generateFilterThumbnail,
  getWhiteBalanceMatrix,
  clarityRadiusFor
} from './iphoneFilters';

export { IPHONE_FILTERS_ORDER, IPHONE_FILTER_PRESETS } from './iphonePresets';
