// src/utils/constants.js

export const SVG_ICONS = {
  furniture: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M216,88.8V72a40,40,0,0,0-40-40H80A40,40,0,0,0,40,72V88.8a40,40,0,0,0,0,78.4V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V167.2a40,40,0,0,0,0-78.4ZM80,48h96a24,24,0,0,1,24,24V88.8A40.07,40.07,0,0,0,168,128H88A40.07,40.07,0,0,0,56,88.8V72A24,24,0,0,1,80,48ZM208.39,152H208a8,8,0,0,0-8,8v40H56V160a8,8,0,0,0-8-8h-.39A24,24,0,1,1,72,128v40a8,8,0,0,0,16,0V144h80v24a8,8,0,0,0,16,0V128a24,24,0,1,1,24.39,24Z"></path></svg>`,
  electronics: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-tv-icon lucide-tv"><path d="m17 2-5 5-5-5"/><rect width="20" height="15" x="2" y="7" rx="2"/></svg>`,
  tool: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-drill-icon lucide-drill"><path d="M10 18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a3 3 0 0 1-3-3 1 1 0 0 1 1-1z"/><path d="M13 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1l-.81 3.242a1 1 0 0 1-.97.758H8"/><path d="M14 4h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3"/><path d="M18 6h4"/><path d="m5 10-2 8"/><path d="m7 18 2-8"/></svg>`,
  appliance: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-microwave-icon lucide-microwave"><rect width="20" height="15" x="2" y="4" rx="2"/><rect width="8" height="7" x="6" y="8" rx="1"/><path d="M18 8v7"/><path d="M6 19v2"/><path d="M18 19v2"/></svg>`,
  mobile: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M152,208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16ZM192,16H64A24,24,0,0,0,40,40V216a24,24,0,0,0,24,24H192a24,24,0,0,0,24-24V40A24,24,0,0,0,192,16Zm8,176a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8H192a8,8,0,0,1,8,8Z"></path></svg>`,
  computer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M224,56H32A16,16,0,0,0,16,72V176a16,16,0,0,0,16,16H108.8l-10.67,16H80a8,8,0,0,0,0,16h96a8,8,0,0,0,0-16H157.87l-10.67-16H224a16,16,0,0,0,16-16V72A16,16,0,0,0,224,56ZM32,72H224V176H32Z"></path></svg>`,
  clothing: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M223.62,66.12,179.09,44.83A16,16,0,0,0,160,56.84V64a8,8,0,0,1-8,8H104a8,8,0,0,1-8-8V56.84a16,16,0,0,0-19.09-12L32.38,66.12A16,16,0,0,0,21,82.62L24.58,191a16,16,0,0,0,16,15.36h175a16,16,0,0,0,16-15.36L235,82.62A16,16,0,0,0,223.62,66.12ZM216,191a.22.22,0,0,1,0,0H40a.22.22,0,0,1,0,0L36.42,83.09,78.55,65.28A32,32,0,0,0,88,81.45V72a24,24,0,0,0,24,24h32a24,24,0,0,0,24-24V81.45a32,32,0,0,0,9.45-16.17l42.13,17.81Z"></path></svg>`,
  game: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-gamepad-directional-icon lucide-gamepad-directional"><path d="M11.146 15.854a1.207 1.207 0 0 1 1.708 0l1.56 1.56A2 2 0 0 1 15 18.828V21a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2.172a2 2 0 0 1 .586-1.414z"/><path d="M18.828 15a2 2 0 0 1-1.414-.586l-1.56-1.56a1.207 1.207 0 0 1 0-1.708l1.56-1.56A2 2 0 0 1 18.828 9H21a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1z"/><path d="M6.586 14.414A2 2 0 0 1 5.172 15H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2.172a2 2 0 0 1 1.414.586l1.56 1.56a1.207 1.207 0 0 1 0 1.708z"/><path d="M9 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.172a2 2 0 0 1-.586 1.414l-1.56 1.56a1.207 1.207 0 0 1-1.708 0l-1.56-1.56A2 2 0 0 1 9 5.172z"/></svg>`,
  books: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M208,24H72A32,32,0,0,0,40,56V224a8,8,0,0,0,8,8H192a8,8,0,0,0,0-16H56a16,16,0,0,1,16-16H208a8,8,0,0,0,8-8V32A8,8,0,0,0,208,24Zm-8,160H72a31.82,31.82,0,0,0-16,4.29V56A16,16,0,0,1,72,40H200Z"></path></svg>`,
  vehicles: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M240,104H229.2L201.42,41.5A16,16,0,0,0,186.8,32H69.2a16,16,0,0,0-14.62,9.5L26.8,104H16a8,8,0,0,0,0,16h8v80a16,16,0,0,0,16,16H64a16,16,0,0,0,16-16V184h96v16a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16V120h8a8,8,0,0,0,0-16ZM69.2,48H186.8l24.89,56H44.31ZM64,200H40V184H64Zm128,0V184h24v16Zm24-32H40V120H216ZM56,144a8,8,0,0,1,8-8H80a8,8,0,0,1,0,16H64A8,8,0,0,1,56,144Zm112,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H176A8,8,0,0,1,168,144Z"></path></svg>`,
  baby: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M92,140a12,12,0,1,1,12-12A12,12,0,0,1,92,140Zm72-24a12,12,0,1,0,12,12A12,12,0,0,0,164,116Zm-12.27,45.23a45,45,0,0,1-47.46,0,8,8,0,0,0-8.54,13.54,61,61,0,0,0,64.54,0,8,8,0,0,0-8.54-13.54ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88.11,88.11,0,0,0-84.09-87.91C120.32,56.38,120,71.88,120,72a8,8,0,0,0,16,0,8,8,0,0,1,16,0,24,24,0,0,1-48,0c0-.73.13-14.3,8.46-30.63A88,88,0,1,0,216,128Z"></path></svg>`,
  sports: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M152,88a32,32,0,1,0-32-32A32,32,0,0,0,152,88Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,40Zm67.31,100.68c-.61.28-7.49,3.28-19.67,3.28-13.85,0-34.55-3.88-60.69-20a169.31,169.31,0,0,1-15.41,32.34,104.29,104.29,0,0,1,31.31,15.81C173.92,186.65,184,207.35,184,232a8,8,0,0,1-16,0c0-41.7-34.69-56.71-54.14-61.85-.55.7-1.12,1.41-1.69,2.1-19.64,23.8-44.25,36.18-71.63,36.18A92.29,92.29,0,0,1,31.2,208,8,8,0,0,1,32.8,192c25.92,2.58,48.47-7.49,67-30,12.49-15.14,21-33.61,25.25-47C86.13,92.35,61.27,111.63,61,111.84A8,8,0,1,1,51,99.36c1.5-1.2,37.22-29,89.51,6.57,45.47,30.91,71.93,20.31,72.18,20.19a8,8,0,1,1,6.63,14.56Z"></path></svg>`,
  health: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M72,144H32a8,8,0,0,1,0-16H67.72l13.62-20.44a8,8,0,0,1,13.32,0l25.34,38,9.34-14A8,8,0,0,1,136,128h24a8,8,0,0,1,0,16H140.28l-13.62,20.44a8,8,0,0,1-13.32,0L88,126.42l-9.34,14A8,8,0,0,1,72,144ZM178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,.75,0,1.5,0,2.25a8,8,0,1,0,16-.5c0-.58,0-1.17,0-1.75A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46c0,53.61-77.76,102.15-96,112.8-10.83-6.31-42.63-26-66.68-52.21a8,8,0,1,0-11.8,10.82c31.17,34,72.93,56.68,74.69,57.63a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40Z"></path></svg>`,
  other: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-tags-icon lucide-tags"><path d="M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z"/><path d="M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193"/><circle cx="10.5" cy="6.5" r=".5" fill="currentColor"/></svg>`,
};


export const ITEM_CONDITIONS = [
  { value: 'New', label: 'New', icon: 'bi-star-fill', color: 'green' },
  { value: 'Like New', label: 'Like New', icon: 'bi-star', color: 'blue' },
  { value: 'Good', label: 'Good', icon: 'bi-hand-thumbs-up', color: 'teal' },
  { value: 'Fair', label: 'Fair', icon: 'bi-hand-thumbs-down', color: 'yellow' },
  { value: 'Poor', label: 'Poor', icon: 'bi-exclamation-triangle', color: 'red' }
];

export const ITEM_CATEGORIES = [
  { value: 'Electronics', label: 'Electronics', icon: SVG_ICONS.electronics, color: 'blue' },
  { value: 'Appliances', label: 'Appliances', icon: SVG_ICONS.appliance, color: 'cyan' }, // Add here!
  { value: 'Mobile Phones', label: 'Mobile Phones', icon: SVG_ICONS.mobile, color: 'purple' },
  { value: 'Computers', label: 'Computers', icon: SVG_ICONS.computer, color: 'indigo' },
  { value: 'Furniture', label: 'Furniture', icon: SVG_ICONS.amber, color: 'amber' },
  { value: 'Gaming', label: 'Gaming', icon: SVG_ICONS.game, color: 'emerald' }, // Changed color
  { value: 'Clothing', label: 'Clothing', icon: SVG_ICONS.clothing, color: 'pink' },
  { value: 'Books', label: 'Books', icon: SVG_ICONS.books, color: 'orange' },
  { value: 'Vehicles', label: 'Vehicles', icon: SVG_ICONS.vehicles, color: 'teal' },
  { value: 'Baby & Kids', label: 'Baby & Kids', icon: SVG_ICONS.baby, color: 'green' },
  { value: 'Sports & Outdoors', label: 'Sports & Outdoors', icon: SVG_ICONS.sports, color: 'violet' }, // Changed color
  { value: 'Health & Beauty', label: 'Health & Beauty', icon: SVG_ICONS.health, color: 'rose' },
  { value: 'Other', label: 'Other', icon: SVG_ICONS.other, color: 'slate' } // Changed color
];

// Now POP_CATEGORIES safely maps to values that actually exist
export const POP_CATEGORIES = [
  { value: 'Appliances', label: 'Appliances', icon: SVG_ICONS.appliance, color: 'cyan' },
  { value: 'Electronics', label: 'Electronics', icon: SVG_ICONS.electronics, color: 'blue' },
  { value: 'Mobile Phones', label: 'Mobile Phones', icon: SVG_ICONS.mobile, color: 'purple' },
  { value: 'Computers', label: 'Computers', icon: SVG_ICONS.computer, color: 'indigo' },
  { value: 'Furniture', label: 'Furniture', icon: SVG_ICONS.furniture, color: 'amber' },
  { value: 'Tools', label: 'Tools', icon: SVG_ICONS.tool, color: 'rose' }, // Note: Add Tools to master if needed
  { value: 'Vehicles', label: 'Vehicles', icon: SVG_ICONS.vehicles, color: 'teal' },
  { value: 'Other', label: 'Other', icon: SVG_ICONS.other, color: 'slate' }
];


// Add category descriptions for tooltips
export const CATEGORY_DESCRIPTIONS = {
  'Electronics': 'TVs, audio equipment, gaming consoles, etc.',
  'Mobile Phones': 'Smartphones, tablets, accessories',
  'Computers': 'Laptops, desktops, monitors, peripherals',
  'Furniture': 'Chairs, tables, beds, storage',
  'Clothing': 'Men\'s, women\'s, children\'s clothing and accessories',
  'Books': 'Fiction, non-fiction, textbooks, magazines',
  'Vehicles': 'Cars, bikes, parts and accessories',
  'Baby & Kids': 'Toys, clothing, furniture, gear',
  'Sports & Outdoors': 'Equipment, gear, athletic wear',
  'Health & Beauty': 'Personal care, wellness, beauty products',
  'Other': 'Miscellaneous items',
};

// ============================================
// ITEM STATUSES - Status of the LISTED ITEM
// ============================================
export const ITEM_STATUSES = {
  ACTIVE: 'active',       // Item is listed and accepting applications
  PENDING: 'pending',     // Item has an accepted application, waiting for completion
  COMPLETED: 'completed', // Item has been successfully given and received
  CANCELLED: 'cancelled'  // Item was removed/cancelled by donor
};

export const ITEM_STATUS_DISPLAY = {
  active: { label: 'Active', icon: 'bi-check-circle-fill', color: 'green' },
  pending: { label: 'Pending', icon: 'bi-clock-fill', color: 'yellow' },
  completed: { label: 'Completed', icon: 'bi-check-circle', color: 'blue' },
  cancelled: { label: 'Cancelled', icon: 'bi-x-circle', color: 'red' }
};


// ============================================
// APPLICATION STATUSES - Status of the APPLICATION
// ============================================
export const APPLICATION_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  NOT_SELECTED: 'not_selected',   // automatically closed when someone else wins
  REJECTED: 'rejected',           // donor manually rejects
  CANCELLED: 'cancelled'          // applicant cancels their own application
};

export const APPLICATION_STATUS_DISPLAY = {
  pending:      { label: 'Pending',   icon: 'bi-clock-fill',       color: 'yellow' },
  accepted:     { label: 'Accepted',         icon: 'bi-check-circle-fill', color: 'green' },
  not_selected: { label: 'Not selected',     icon: 'bi-dash-circle',      color: 'gray' },
  rejected:     { label: 'Rejected',         icon: 'bi-x-circle-fill',    color: 'red' },
  cancelled:    { label: 'Cancelled',        icon: 'bi-x-circle',         color: 'gray' }
};


// ============================================
// ITEM MODERATION ACTIONS (Admin)
// ============================================
export const ITEM_MODERATION_ACTIONS = [
  { action: 'approve', label: 'Approve', icon: 'bi-check-circle', color: 'emerald' },
  { action: 'reject', label: 'Reject', icon: 'bi-x-circle', color: 'rose' },
  { action: 'feature', label: 'Feature', icon: 'bi-star', color: 'amber' },
  { action: 'unfeature', label: 'Unfeature', icon: 'bi-star', color: 'ink' },
  { action: 'flag', label: 'Flag', icon: 'bi-flag', color: 'rose' },
  { action: 'unflag', label: 'Unflag', icon: 'bi-flag', color: 'emerald' },
];

// Tailwind classes for each moderation action color
export const MODERATION_COLOR_CLASSES = {
  emerald: 'bg-emerald-50 border-emerald-500 text-emerald-700',
  rose: 'bg-rose-50 border-rose-500 text-rose-700',
  amber: 'bg-amber-50 border-amber-500 text-amber-700',
  ink: 'bg-ink-50 border-ink-500 text-ink-700',
};



// src/utils/supportConstants.js

export const SUPPORT_REASONS = [
  { value: 'winner_unresponsive', label: 'Winner is unresponsive' },
  { value: 'winner_no_show', label: "Winner didn't show up for pickup" },
  { value: 'winner_dispute', label: 'Dispute with winner over item condition' },
  { value: 'donor_unresponsive', label: 'Donor is unresponsive' },
  { value: 'donor_no_show', label: "Donor didn't show up for pickup" },
  { value: 'donor_dispute', label: 'Dispute with donor over item condition' },
  { value: 'shipping_issue', label: 'Issue with shipping/delivery' },
  { value: 'item_damaged', label: 'Item was damaged during shipping' },
  { value: 'item_not_received', label: 'Item not received' },
  { value: 'other', label: 'Other' },
];

export const TICKET_STATUS_DISPLAY = {
  open: { label: 'Open', icon: 'bi-clock-history', color: 'yellow' },
  in_progress: { label: 'In Progress', icon: 'bi-arrow-repeat', color: 'blue' },
  resolved: { label: 'Resolved', icon: 'bi-check-circle-fill', color: 'green' },
  closed: { label: 'Closed', icon: 'bi-x-circle', color: 'gray' },
};

export const STATUS_COLOR_CLASSES = {
  yellow: 'bg-yellow-100 text-yellow-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  gray: 'bg-gray-100 text-gray-700',
};



export const SHIPPING_OPTIONS = [
  {
    value: 'anywhere',
    label: 'Anywhere',
    icon: 'bi-globe',
    description: 'Worldwide shipping',
    color: 'blue'
  },
  {
    value: 'north_america',
    label: 'North America',
    icon: 'bi-flag',
    description: 'USA, Canada, Mexico, Guatemala, Costa Rica, Panama',
    color: 'red'
  },
  {
    value: 'south_america',
    label: 'South America',
    icon: 'bi-flag',
    description: 'Brazil, Argentina, Chile, Colombia, Peru, Ecuador',
    color: 'green'
  },
  {
    value: 'west_africa',
    label: 'West Africa',
    icon: 'bi-flag',
    description: 'Nigeria, Ghana, Senegal, Côte d’Ivoire, Benin, Togo',
    color: 'yellow'
  },
  {
    value: 'east_africa',
    label: 'East Africa',
    icon: 'bi-flag',
    description: 'Kenya, Tanzania, Uganda, Rwanda, Ethiopia, Somalia',
    color: 'orange'
  },
  {
    value: 'north_africa',
    label: 'North Africa',
    icon: 'bi-flag',
    description: 'Egypt, Morocco, Algeria, Tunisia, Libya, Sudan',
    color: 'red'
  },
  {
    value: 'southern_africa',
    label: 'Southern Africa',
    icon: 'bi-flag',
    description: 'South Africa, Namibia, Botswana, Zambia, Zimbabwe, Mozambique',
    color: 'purple'
  },
  {
    value: 'europe',
    label: 'Europe',
    icon: 'bi-flag',
    description: 'UK, France, Germany, Italy, Spain, Netherlands, Poland',
    color: 'blue'
  },
  {
    value: 'asia',
    label: 'Asia',
    icon: 'bi-flag',
    description: 'China, India, Japan, South Korea, Singapore, Malaysia, Indonesia',
    color: 'red'
  },
  {
    value: 'oceania',
    label: 'Oceania',
    icon: 'bi-flag',
    description: 'Australia, New Zealand, Fiji, Papua New Guinea, Samoa, Tonga',
    color: 'teal'
  }
];



// ============================================
// NOTIFICATION METADATA – unified
// ============================================

export const NOTIFICATION_META = {
  // ─── Applications ────────────────────────────────────────
  application_received: {
    key: 'application_received',
    icon: 'bi-inbox',
    label: 'Application Received',
    color: 'text-primary-600',
  },
  application_accepted: {
    key: 'application_accepted',
    icon: 'bi-check-circle-fill',
    label: 'Application Accepted',
    color: 'text-emerald-600',
  },
  application_rejected: {
    key: 'application_rejected',
    icon: 'bi-x-circle-fill',
    label: 'Application Rejected',
    color: 'text-rose-600',
  },
  application_not_selected: {
    key: 'application_not_selected',
    icon: 'bi-dash-circle',
    label: 'Not Selected',
    color: 'text-ink-500',
  },
  winner_announced: {
    key: 'winner_announced',
    icon: 'bi-trophy-fill',
    label: 'Winner Announced',
    color: 'text-amber-600',
  },
  reinterest: {
    key: 'reinterest',
    icon: 'bi-arrow-repeat',
    label: 'Re-Interest',
    color: 'text-primary-600',
  },

  // ─── Item lifecycle ──────────────────────────────────────
  item_shipped: {
    key: 'item_shipped',
    icon: 'bi-truck',
    label: 'Item Shipped',
    color: 'text-blue-600',
  },
  item_completed: {
    key: 'item_completed',
    icon: 'bi-check-all',
    label: 'Item Completed',
    color: 'text-emerald-600',
  },

  // ─── Chat ────────────────────────────────────────────────
  chat: {
    key: 'chat',
    icon: 'bi-chat-dots-fill',
    label: 'Chat Message',
    color: 'text-purple-600',
  },
  message_received: {
    key: 'message_received',
    icon: 'bi-chat-dots-fill',
    label: 'New Message',
    color: 'text-purple-600',
  },

  // ─── Discussion ──────────────────────────────────────────
  mention: {
    key: 'mention',
    icon: 'bi-at',
    label: 'Mention',
    color: 'text-primary-600',
  },
  discussion_reply: {
    key: 'discussion_reply',
    icon: 'bi-reply-fill',
    label: 'Reply',
    color: 'text-primary-600',
  },

  // ─── Support Tickets ─────────────────────────────────────
  new_support_ticket: {
    key: 'new_support_ticket',
    icon: 'bi-ticket',
    label: 'New Support Ticket',
    color: 'text-amber-600',
  },
  support_ticket_created: {
    key: 'support_ticket_created',
    icon: 'bi-ticket-perforated',
    label: 'Support Ticket Created',
    color: 'text-amber-600',
  },
  support_reply: {
    key: 'support_reply',
    icon: 'bi-reply-all',
    label: 'Support Reply',
    color: 'text-primary-600',
  },
  support_user_reply: {
    key: 'support_user_reply',
    icon: 'bi-chat-left-quote',
    label: 'Support User Reply',
    color: 'text-primary-600',
  },
  support_status_update: {
    key: 'support_status_update',
    icon: 'bi-arrow-repeat',
    label: 'Support Status Update',
    color: 'text-ink-600',
  },
  support_ticket_deleted: {
    key: 'support_ticket_deleted',
    icon: 'bi-trash',
    label: 'Support Ticket Deleted',
    color: 'text-rose-600',
  },
};

export const getNotificationMeta = (type) => 
  NOTIFICATION_META[type] || {
    key: type || 'unknown',
    icon: 'bi-bell-fill',
    label: 'Notification',
    color: 'text-ink-500',
  };


export const POP_NOTIFICATION_META = {
  // Purchase
  purchase_created: {
    key: "purchase_created",
    icon: "bi-bag-check-fill",
    label: "Purchase Created",
    color: "text-primary-600",
  },
  purchase_updated: {
    key: "purchase_updated",
    icon: "bi-pencil-square",
    label: "Purchase Updated",
    color: "text-primary-600",
  },
  purchase_deleted: {
    key: "purchase_deleted",
    icon: "bi-trash-fill",
    label: "Purchase Deleted",
    color: "text-rose-600",
  },
  purchase_archived: {
    key: "purchase_archived",
    icon: "bi-archive-fill",
    label: "Purchase Archived",
    color: "text-ink-500",
  },
  purchase_restored: {
    key: "purchase_restored",
    icon: "bi-arrow-counterclockwise",
    label: "Purchase Restored",
    color: "text-success-600",
  },
  purchase_gifted: {
    key: "purchase_gifted",
    icon: "bi-gift-fill",
    label: "Purchase Gifted",
    color: "text-brand-600",
  },
  purchase_transferred: {
    key: "purchase_transferred",
    icon: "bi-send-fill",
    label: "Purchase Transferred",
    color: "text-primary-600",
  },

  // Claims
  claim_created: {
    key: "claim_created",
    icon: "bi-file-earmark-plus-fill",
    label: "Claim Created",
    color: "text-primary-600",
  },
  claim_status_updated: {
    key: "claim_status_updated",
    icon: "bi-arrow-repeat",
    label: "Claim Status Updated",
    color: "text-amber-600",
  },
  claim_deleted: {
    key: "claim_deleted",
    icon: "bi-trash-fill",
    label: "Claim Deleted",
    color: "text-rose-600",
  },
  claim_forwarded: {
    key: "claim_forwarded",
    icon: "bi-send-fill",
    label: "Claim Forwarded",
    color: "text-primary-600",
  },

  // Complaints
  complaint_logged: {
    key: "complaint_logged",
    icon: "bi-exclamation-triangle-fill",
    label: "Complaint Logged",
    color: "text-warning-600",
  },
  complaint_deleted: {
    key: "complaint_deleted",
    icon: "bi-trash-fill",
    label: "Complaint Deleted",
    color: "text-rose-600",
  },
  complaint_updated: {
    key: "complaint_updated",
    icon: "bi-pencil-square",
    label: "Complaint Updated",
    color: "text-rose-600",
  },

  // Warranties
  warranty_created: {
    key: "warranty_created",
    icon: "bi-shield-plus",
    label: "Warranty Created",
    color: "text-success-600",
  },
  warranty_updated: {
    key: "warranty_updated",
    icon: "bi-shield-check",
    label: "Warranty Updated",
    color: "text-success-600",
  },
  warranty_deleted: {
    key: "warranty_deleted",
    icon: "bi-shield-minus",
    label: "Warranty Deleted",
    color: "text-rose-600",
  },

  // ============================================================
  // PHASE 1: HOUSEHOLDS
  // ============================================================
  household_created: {
    key: "household_created",
    icon: "bi-house-plus-fill",
    label: "Household Created",
    color: "text-brand-600",
  },
  household_updated: {
    key: "household_updated",
    icon: "bi-house-gear-fill",
    label: "Household Updated",
    color: "text-brand-600",
  },
  household_deleted: {
    key: "household_deleted",
    icon: "bi-house-x-fill",
    label: "Household Deleted",
    color: "text-rose-600",
  },
  household_member_added: {
    key: "household_member_added",
    icon: "bi-person-plus-fill",
    label: "Member Added",
    color: "text-success-600",
  },
  household_member_removed: {
    key: "household_member_removed",
    icon: "bi-person-x-fill",
    label: "Member Removed",
    color: "text-rose-600",
  },
  household_role_changed: {
    key: "household_role_changed",
    icon: "bi-person-gear",
    label: "Role Changed",
    color: "text-amber-600",
  },
  household_left: {
    key: "household_left",
    icon: "bi-person-walking",
    label: "Left Household",
    color: "text-ink-500",
  },

  // ============================================================
  // PHASE 1: ASSETS
  // ============================================================
  asset_created: {
    key: "asset_created",
    icon: "bi-box-seam-fill",
    label: "Asset Created",
    color: "text-brand-600",
  },
  asset_updated: {
    key: "asset_updated",
    icon: "bi-box-gear",
    label: "Asset Updated",
    color: "text-brand-600",
  },
  asset_deleted: {
    key: "asset_deleted",
    icon: "bi-box-x-fill",
    label: "Asset Deleted",
    color: "text-rose-600",
  },

  // ============================================================
  // PHASE 1: MAINTENANCE
  // ============================================================
  maintenance_created: {
    key: "maintenance_created",
    icon: "bi-wrench-adjustable",
    label: "Maintenance Scheduled",
    color: "text-warning-600",
  },
  maintenance_updated: {
    key: "maintenance_updated",
    icon: "bi-wrench",
    label: "Maintenance Updated",
    color: "text-warning-600",
  },
  maintenance_deleted: {
    key: "maintenance_deleted",
    icon: "bi-wrench-x",
    label: "Maintenance Deleted",
    color: "text-rose-600",
  },
  maintenance_completed: {
    key: "maintenance_completed",
    icon: "bi-check-circle-fill",
    label: "Maintenance Completed",
    color: "text-success-600",
  },

  // ============================================================
  // PHASE 1: TASKS
  // ============================================================
  task_created: {
    key: "task_created",
    icon: "bi-check2-square",
    label: "Task Created",
    color: "text-primary-600",
  },
  task_updated: {
    key: "task_updated",
    icon: "bi-pencil-square",
    label: "Task Updated",
    color: "text-primary-600",
  },
  task_deleted: {
    key: "task_deleted",
    icon: "bi-trash-fill",
    label: "Task Deleted",
    color: "text-rose-600",
  },
  task_completed: {
    key: "task_completed",
    icon: "bi-check2-all",
    label: "Task Completed",
    color: "text-success-600",
  },
  task_assigned: {
    key: "task_assigned",
    icon: "bi-person-plus",
    label: "Task Assigned",
    color: "text-primary-600",
  },

  // ============================================================
  // PHASE 1: DOCUMENTS
  // ============================================================
  document_created: {
    key: "document_created",
    icon: "bi-file-earmark-plus-fill",
    label: "Document Uploaded",
    color: "text-primary-600",
  },
  document_updated: {
    key: "document_updated",
    icon: "bi-file-earmark-pencil",
    label: "Document Updated",
    color: "text-primary-600",
  },
  document_deleted: {
    key: "document_deleted",
    icon: "bi-file-earmark-x-fill",
    label: "Document Deleted",
    color: "text-rose-600",
  },
};

export const getPopNotificationMeta = (type) =>
  POP_NOTIFICATION_META[type] || {
    key: type || "unknown",
    icon: "bi-bell-fill",
    label: "Notification",
    color: "text-ink-500",
  };

		
		
		// src/utils/currencies.js

export const CURRENCIES = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "JPY", label: "Japanese Yen", symbol: "¥" },
  { value: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { value: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { value: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { value: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { value: "SEK", label: "Swedish Krona", symbol: "kr" },
  { value: "NOK", label: "Norwegian Krone", symbol: "kr" },
  { value: "DKK", label: "Danish Krone", symbol: "kr" },
  { value: "NZD", label: "New Zealand Dollar", symbol: "NZ$" },
  { value: "ZAR", label: "South African Rand", symbol: "R" },
  { value: "INR", label: "Indian Rupee", symbol: "₹" },
  { value: "BRL", label: "Brazilian Real", symbol: "R$" },
  { value: "MXN", label: "Mexican Peso", symbol: "MX$" },
  { value: "RUB", label: "Russian Ruble", symbol: "₽" },
  { value: "TRY", label: "Turkish Lira", symbol: "₺" },
  { value: "KRW", label: "South Korean Won", symbol: "₩" },
  { value: "IDR", label: "Indonesian Rupiah", symbol: "Rp" },
  { value: "THB", label: "Thai Baht", symbol: "฿" },
  { value: "MYR", label: "Malaysian Ringgit", symbol: "RM" },
  { value: "PHP", label: "Philippine Peso", symbol: "₱" },
  { value: "VND", label: "Vietnamese Dong", symbol: "₫" },
  { value: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { value: "SAR", label: "Saudi Riyal", symbol: "﷼" },
  { value: "QAR", label: "Qatari Riyal", symbol: "﷼" },
  { value: "KWD", label: "Kuwaiti Dinar", symbol: "د.ك" },
  { value: "BHD", label: "Bahraini Dinar", symbol: "ب.د" },
  { value: "OMR", label: "Omani Rial", symbol: "﷼" },
  { value: "EGP", label: "Egyptian Pound", symbol: "E£" },
  { value: "NGN", label: "Nigerian Naira", symbol: "₦" },
  { value: "GHS", label: "Ghanaian Cedi", symbol: "GH₵" },
  { value: "KES", label: "Kenyan Shilling", symbol: "KSh" },
  { value: "TZS", label: "Tanzanian Shilling", symbol: "TSh" },
  { value: "UGX", label: "Ugandan Shilling", symbol: "USh" },
  { value: "RWF", label: "Rwandan Franc", symbol: "FRw" },
  { value: "XOF", label: "West African CFA Franc", symbol: "CFA" },
  { value: "XAF", label: "Central African CFA Franc", symbol: "FCFA" },
  { value: "MAD", label: "Moroccan Dirham", symbol: "د.م." },
  { value: "DZD", label: "Algerian Dinar", symbol: "د.ج" },
  { value: "TND", label: "Tunisian Dinar", symbol: "د.ت" },
  { value: "JOD", label: "Jordanian Dinar", symbol: "د.ا" },
  { value: "LBP", label: "Lebanese Pound", symbol: "ل.ل" },
  { value: "PKR", label: "Pakistani Rupee", symbol: "₨" },
  { value: "BDT", label: "Bangladeshi Taka", symbol: "৳" },
  { value: "LKR", label: "Sri Lankan Rupee", symbol: "₨" },
  { value: "NPR", label: "Nepalese Rupee", symbol: "₨" },
  { value: "MMK", label: "Myanmar Kyat", symbol: "K" },
  { value: "KHR", label: "Cambodian Riel", symbol: "៛" },
  { value: "LAK", label: "Lao Kip", symbol: "₭" },
  { value: "MNT", label: "Mongolian Tugrik", symbol: "₮" },
  { value: "UZS", label: "Uzbekistani Som", symbol: "so'm" },
  { value: "KZT", label: "Kazakhstani Tenge", symbol: "₸" },
  { value: "AZN", label: "Azerbaijani Manat", symbol: "₼" },
  { value: "GEL", label: "Georgian Lari", symbol: "₾" },
  { value: "AMD", label: "Armenian Dram", symbol: "֏" },
  { value: "BYN", label: "Belarusian Ruble", symbol: "Br" },
  { value: "UAH", label: "Ukrainian Hryvnia", symbol: "₴" },
  { value: "PLN", label: "Polish Złoty", symbol: "zł" },
  { value: "CZK", label: "Czech Koruna", symbol: "Kč" },
  { value: "HUF", label: "Hungarian Forint", symbol: "Ft" },
  { value: "RON", label: "Romanian Leu", symbol: "lei" },
  { value: "BGN", label: "Bulgarian Lev", symbol: "лв" },
  { value: "HRK", label: "Croatian Kuna", symbol: "kn" },
  { value: "RSD", label: "Serbian Dinar", symbol: "дин." },
  { value: "ISK", label: "Icelandic Króna", symbol: "kr" },
  { value: "FJD", label: "Fijian Dollar", symbol: "FJ$" },
  { value: "PGK", label: "Papua New Guinean Kina", symbol: "K" },
  { value: "SBD", label: "Solomon Islands Dollar", symbol: "SI$" },
  { value: "TOP", label: "Tongan Paʻanga", symbol: "T$" },
  { value: "WST", label: "Samoan Tālā", symbol: "WS$" },
  { value: "VUV", label: "Vanuatu Vatu", symbol: "VT" },
];
		

// ============================================
// HELPER FUNCTIONS
// ============================================

// Item helpers
export const getConditionByValue = (value) => {
  return ITEM_CONDITIONS.find(cond => cond.value === value);
};

export const getCategoryByValue = (value) => {
  return ITEM_CATEGORIES.find(cat => cat.value === value);
};

export const getPopCategoryByValue = (value) => {
  return POP_CATEGORIES.find(cat => cat.value === value);
};

export const getShippingOptionByValue = (value) => {
  return SHIPPING_OPTIONS.find(opt => opt.value === value);
};

// Item status helpers
export const getItemStatusDisplay = (status) => {
  return ITEM_STATUS_DISPLAY[status] || ITEM_STATUS_DISPLAY.active;
};

// ✅ Keep the old function name for backward compatibility
export const getStatusDisplay = (status) => {
  return ITEM_STATUS_DISPLAY[status] || ITEM_STATUS_DISPLAY.active;
};

// Application status helper
export const getApplicationStatusDisplay = (status) => {
  return APPLICATION_STATUS_DISPLAY[status] || APPLICATION_STATUS_DISPLAY.pending;
};

export const getTicketStatusDisplay = (status) =>
  TICKET_STATUS_DISPLAY[status] || TICKET_STATUS_DISPLAY.open;

export const getTicketStatusBadgeClass = (status) => {
  const display = getTicketStatusDisplay(status);
  return STATUS_COLOR_CLASSES[display.color] || STATUS_COLOR_CLASSES.gray;
};

export const getReasonLabel = (reason) => {
  const found = SUPPORT_REASONS.find((r) => r.value === reason);
  return found?.label || reason;
};

export const formatTicketDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


