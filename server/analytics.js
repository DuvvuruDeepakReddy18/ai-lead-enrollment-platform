function percent(part, total) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

export function buildAnalytics(leads) {
  const totalLeads = leads.length;
  const hotLeads = leads.filter((lead) => lead.temperature === 'Hot').length;
  const qualifiedLeads = leads.filter((lead) => lead.score > 80 || lead.status === 'Qualified' || lead.status === 'Enrolled').length;
  const enrollments = leads.filter((lead) => lead.status === 'Enrolled').length;

  const bySource = new Map();
  for (const lead of leads) {
    const source = lead.source || 'Unknown';
    const current = bySource.get(source) ?? { source, leads: 0, hot: 0, enrolled: 0 };
    current.leads += 1;
    if (lead.temperature === 'Hot') current.hot += 1;
    if (lead.status === 'Enrolled') current.enrolled += 1;
    bySource.set(source, current);
  }

  const sourcePerformance = [...bySource.values()]
    .map((source) => ({
      ...source,
      hotRate: percent(source.hot, source.leads),
      enrollmentRate: percent(source.enrolled, source.leads)
    }))
    .sort((a, b) => b.leads - a.leads);

  return {
    metrics: {
      totalLeads,
      hotLeads,
      qualifiedLeads,
      enrollments,
      conversionRate: percent(enrollments, totalLeads),
      enrollmentRate: percent(enrollments, qualifiedLeads)
    },
    sourcePerformance
  };
}

