// src/utils/constantHelpers.jsx
import React from 'react';

// Map of color names to their hex values
// Add all colors used in your constants (categories, conditions, etc.)
const colorMap = {
  ink: '#334155',
  slate: '#64748b',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
  amber: '#f59e0b',
  emerald: '#10b981',
  teal: '#14b89a',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  fuchsia: '#d946ef',
  rose: '#f43f5e',
  primary: '#4f46e5', // adjust to your primary
  brand: '#7c3aed',   // adjust to your brand
};

const DEFAULT_ICON_COLOR = 'ink';

/**
 * Renders an icon from a Bootstrap class or SVG string
 * @param {string} icon - Bootstrap class (e.g., 'bi-star') or SVG string
 * @param {string} className - Additional classes
 * @param {string} color - Color name (e.g., 'blue', 'red') – falls back to DEFAULT_ICON_COLOR
 * @returns {JSX.Element|null}
 */
export const renderIcon = (icon, className = 'w-5 h-5', color = DEFAULT_ICON_COLOR) => {
  if (!icon) return null;

  const effectiveColor = color || DEFAULT_ICON_COLOR;
  const hexColor = colorMap[effectiveColor] || colorMap[DEFAULT_ICON_COLOR];

  const isSvg = typeof icon === 'string' && icon.trim().startsWith('<svg');

  if (isSvg) {
    // Inject className and inline color style into SVG
    const svgWithProps = icon.replace(
      '<svg',
      `<svg class="${className}" style="color: ${hexColor}; fill: currentColor;"`
    );
    return <span dangerouslySetInnerHTML={{ __html: svgWithProps }} />;
  }

  // Bootstrap icon: apply color via inline style
  return <i className={`${icon} ${className}`} style={{ color: hexColor }} />;
};

// Helper functions 
export const renderCategoryIcon = (categoryValue, className = 'w-5 h-5') => {
  const { getCategoryByValue } = require('./constants');
  const category = getCategoryByValue(categoryValue);
  if (!category) return null;
  return renderIcon(category.icon, className, category.color);
};

export const renderPopCategoryIcon = (categoryValue, className = 'w-5 h-5') => {
  const { getPopCategoryByValue } = require('./constants');
  const category = getPopCategoryByValue(categoryValue);
  if (!category) return null;
  return renderIcon(category.icon, className, category.color);
};

export const renderConditionIcon = (conditionValue, className = 'w-5 h-5') => {
  const { getConditionByValue } = require('./constants');
  const condition = getConditionByValue(conditionValue);
  if (!condition) return null;
  return renderIcon(condition.icon, className, condition.color);
};

export const renderStatusIcon = (status, className = 'w-5 h-5') => {
  const { getStatusDisplay } = require('./constants');
  const statusDisplay = getStatusDisplay(status);
  if (!statusDisplay) return null;
  return renderIcon(statusDisplay.icon, className, statusDisplay.color);
};