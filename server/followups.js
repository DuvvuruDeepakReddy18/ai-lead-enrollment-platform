const FOLLOW_UP_STEPS = [
  { day: 1, label: 'Welcome Message', channel: 'WhatsApp' },
  { day: 3, label: 'Program Details & Benefits', channel: 'Email' },
  { day: 5, label: 'Success Stories', channel: 'WhatsApp' },
  { day: 7, label: 'Reminder', channel: 'SMS' },
  { day: 10, label: 'Final Follow-Up', channel: 'Phone' }
];

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function createFollowUpPlan(lead, startDate = new Date()) {
  const name = lead.name || 'the student';
  const course = lead.courseInterest || lead.course_interest || 'the selected program';
  const temperature = lead.temperature || 'Warm';

  return FOLLOW_UP_STEPS.map((step) => ({
    ...step,
    dueDate: addDays(startDate, step.day).toISOString(),
    status: 'scheduled',
    message: `${step.label} for ${name}: continue nurturing the ${temperature.toLowerCase()} ${course} lead.`
  }));
}

export function getFollowUpSteps() {
  return FOLLOW_UP_STEPS.map((step) => ({ ...step }));
}

