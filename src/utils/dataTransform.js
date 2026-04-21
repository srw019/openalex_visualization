export function buildHierarchy(domains) {
  // Convert OpenAlex domain, field, and subfield records into the tree used by CirclePack.
  const children = domains
    .filter((domain) => domain.fields && domain.fields.length > 0)
    .map((domain) => {
      const fieldChildren = domain.fields
        .filter((field) => field && field.display_name)
        .map((field) => {
          // Subfields become leaf nodes; empty fields stay as direct nodes.
          const subChildren = (field.subfields ?? [])
            .filter((sub) => sub && sub.display_name)
            .map((sub) => ({
              name: sub.display_name,
              id: sub.id,
              works_count: sub.works_count ?? 0,
              value: Math.max(sub.works_count ?? 1, 1),
            }))

          if (subChildren.length === 0) {
            return {
              name: field.display_name,
              id: field.id,
              works_count: field.works_count ?? 0,
              value: Math.max(field.works_count ?? 1, 1),
            }
          }

          return {
            name: field.display_name,
            id: field.id,
            works_count: field.works_count ?? 0,
            children: subChildren,
          }
        })

      return {
        name: domain.display_name,
        id: domain.id,
        works_count: domain.works_count ?? 0,
        children: fieldChildren,
      }
    })

  return { name: "root", children }
}
