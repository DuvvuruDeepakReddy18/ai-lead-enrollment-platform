const COUNSELORS = [
  {
    matcher: /btech|engineering|admission/i,
    counselor: {
      name: 'Kavya Sharma',
      specialization: 'Engineering Admissions',
      channel: 'WhatsApp + Phone'
    }
  },
  {
    matcher: /data|analytics/i,
    counselor: {
      name: 'Ishan Mehta',
      specialization: 'Data Programs',
      channel: 'Email + Phone'
    }
  },
  {
    matcher: /ai|machine learning|automation/i,
    counselor: {
      name: 'Meera Nair',
      specialization: 'AI Programs',
      channel: 'WhatsApp + Email'
    }
  }
];

const DEFAULT_COUNSELOR = {
  name: 'Priya Menon',
  specialization: 'General Admissions',
  channel: 'Phone'
};

export function assignCounselor(lead) {
  if (Number(lead.score ?? 0) <= 80) {
    return null;
  }

  const courseInterest = String(lead.courseInterest ?? lead.course_interest ?? '');
  const match = COUNSELORS.find((entry) => entry.matcher.test(courseInterest));
  return match?.counselor ?? DEFAULT_COUNSELOR;
}

