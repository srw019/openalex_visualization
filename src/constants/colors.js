// Maps domain display_name → color (matching your screenshots)
export const DOMAIN_COLORS = {
  "Physical Sciences":     "#4e91d9",  // blue
  "Life Sciences":         "#5cb85c",  // green
  "Social Sciences":       "#d9534f",  // red/pink
  "Health Sciences":       "#9b59b6",  // purple
  // fallback
  default:                 "#7f8c8d",
}

export const getColor = (domainName) =>
  DOMAIN_COLORS[domainName] ?? DOMAIN_COLORS.default