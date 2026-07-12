export function getLeadTemperature(score) {
  if (score <= 40) return 'Cold';
  if (score <= 70) return 'Warm';
  return 'Hot';
}

export function calculateLeadScore(lead) {
  const courseInterest = String(lead.courseInterest ?? lead.interest ?? '').toLowerCase();
  const qualification = String(lead.qualification ?? '').toLowerCase();
  const age = Number(lead.age ?? 0);
  const websiteVisits = Number(lead.websiteVisits ?? lead.website_visits ?? 0);
  const downloadedBrochure = Boolean(lead.downloadedBrochure ?? lead.downloaded_brochure);

  const interest = courseInterest.includes('btech') ? 20 : courseInterest ? 15 : 0;
  const education = qualification.includes('12th completed') ? 20 : qualification.includes('12th') ? 15 : 0;
  const engagement = downloadedBrochure ? 15 : 0;
  const ageScore = age >= 16 && age <= 18 ? 25 : 0;
  const visits = websiteVisits > 3 ? 20 : 0;

  const breakdown = {
    interest,
    education,
    engagement,
    age: ageScore,
    visits
  };

  const total = Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0));

  return {
    total,
    temperature: getLeadTemperature(total),
    breakdown
  };
}

