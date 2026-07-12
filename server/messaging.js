function leadName(lead) {
  return lead.name?.trim() || 'there';
}

function courseName(lead) {
  return lead.courseInterest || lead.course_interest || lead.interest || 'your selected program';
}

export function generateMessages(lead) {
  const name = leadName(lead);
  const course = courseName(lead);
  const city = lead.city || 'your city';
  const qualification = lead.qualification || 'your current qualification';
  const temperature = lead.temperature || 'Warm';

  const whatsapp = [
    `Hi ${name}, I noticed you are exploring admissions in ${course}.`,
    `Based on ${qualification}, EFOS can guide you with projects, mentorship, certification, and placement-focused support.`,
    `Would you like the program details today?`
  ].join(' ');

  return {
    whatsapp,
    email: {
      subject: `${course} admission guidance from EFOS`,
      body: [
        `Hi ${name},`,
        '',
        `Thanks for showing interest in ${course} from ${city}. Your profile currently looks like a ${temperature.toLowerCase()} lead for EFOS because your qualification is listed as ${qualification}.`,
        '',
        'We can share program structure, practical project details, mentorship options, and next admission steps.',
        '',
        'Regards,',
        'EFOS Enrollment Team'
      ].join('\n')
    },
    sms: `Hi ${name}, EFOS can help with ${course} admission guidance. Reply YES for details or a counselor call.`
  };
}

