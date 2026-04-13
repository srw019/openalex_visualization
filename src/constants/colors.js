export const DOMAIN_COLORS = {
  "Physical Sciences":     "#4e91d9",
  "Life Sciences":         "#5cb85c",
  "Social Sciences":       "#d9534f",
  "Health Sciences":       "#9b59b6",
  default:                 "#7f8c8d",
}

export const getColor = (domainName) =>
  DOMAIN_COLORS[domainName] ?? DOMAIN_COLORS.default