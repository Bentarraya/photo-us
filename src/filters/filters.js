// iPhone Camera-style Filters for Photobooth
// Replaces the old 14-filter set with: Original, Vivid, Vivid Warm, Vivid Cool, Dramatic, Dramatic Warm, Dramatic Cool, Mono, Silvertone, Noir

import { getAllIphoneFilters, getIphoneFilterById, IPHONE_FILTERS_ORDER } from './iphonePresets';

// Export the new iPhone filter registry
export const FILTERS_REGISTRY = getAllIphoneFilters();

// Keep the old getFilterById for compatibility, but use the new preset system
export function getFilterById(id) {
  return getIphoneFilterById(id);
}

export { IPHONE_FILTERS_ORDER, IPHONE_FILTER_PRESETS } from './iphonePresets';