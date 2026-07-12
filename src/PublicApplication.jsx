import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Headphones,
  LockKeyhole,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { submitApplication } from './api.js';
import { BrandLockup } from './dashboard-ui.jsx';

const initialApplication = {
  name: '',
  email: '',
  phone: '',
  city: '',
  qualification: '12th Completed Student',
  courseInterest: 'BTech',
  age: 17,
  downloadedBrochure: false,
  consent: false
};

export default function PublicApplication({ onOpenWorkspace, onSubmitted }) {
  const [form, setForm] = useState(initialApplication);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await submitApplication({
        ...form,
        age: Number(form.age),
        websiteVisits: 1
      });
      setResult(data);
      setForm(initialApplication);
    } catch (submissionError) {
      setError(submissionError.message || 'We could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="application-page">
      <header className="application-header">
        <BrandLockup subtitle="EFOS student application" />
        <button type="button" className="application-workspace-link" onClick={onOpenWorkspace}>
          <LockKeyhole size={15} /> Staff workspace
        </button>
      </header>

      <section className="application-layout">
        <aside className="application-context">
          <p className="application-kicker"><Sparkles size={14} /> Start your EFOS journey</p>
          <h1>Tell us where you want to go next.</h1>
          <p>Share your academic profile and preferred program. The admissions team will review it and continue the conversation from one connected workspace.</p>

          <div className="application-points">
            <ApplicationPoint icon={<GraduationCap />} title="Profile-based guidance" detail="Your course interest and qualification shape the next steps." />
            <ApplicationPoint icon={<Clock3 />} title="Faster response" detail="Your application enters the live admissions priority queue immediately." />
            <ApplicationPoint icon={<Headphones />} title="Human follow-through" detail="Qualified profiles are routed to an admissions counselor." />
          </div>

          <div className="application-privacy"><ShieldCheck size={17} /><span>Your details are used only for admission guidance and follow-up.</span></div>
        </aside>

        <section className="application-form-panel" aria-live="polite">
          {result ? (
            <div className="application-success">
              <span><CheckCircle2 size={30} /></span>
              <p className="section-kicker">Application received</p>
              <h2>Thank you, {result.lead?.name || 'student'}.</h2>
              <p>Your profile is now visible in the EFOS admissions pipeline. A counselor can review your score, prepare outreach, and schedule the next follow-up.</p>
              <div><small>Application reference</small><strong>{result.applicationId || 'Received'}</strong></div>
              <button className="primary-button" type="button" onClick={() => setResult(null)}>Submit another application</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="application-form-heading">
                <p className="section-kicker">Student profile</p>
                <h2>Application form</h2>
                <span>Fields marked required help us route your enquiry correctly.</span>
              </div>

              {error ? <div className="application-error" role="alert">{error}</div> : null}

              <div className="application-form-grid">
                <ApplicationField label="Full name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
                <ApplicationField label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
                <ApplicationField label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} required inputMode="tel" />
                <ApplicationField label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} required />
                <ApplicationSelect label="Academic qualification" value={form.qualification} onChange={(value) => setForm({ ...form, qualification: value })} options={['12th Completed Student', '12th Studying', 'Diploma Student', 'Graduate']} />
                <ApplicationSelect label="Program interest" value={form.courseInterest} onChange={(value) => setForm({ ...form, courseInterest: value })} options={['BTech', 'Data Science', 'AI Automation', 'Full Stack Development']} />
                <ApplicationField label="Age" type="number" min="14" max="40" value={form.age} onChange={(value) => setForm({ ...form, age: value })} required />
                <label className="application-check">
                  <input type="checkbox" checked={form.downloadedBrochure} onChange={(event) => setForm({ ...form, downloadedBrochure: event.target.checked })} />
                  <span><strong>I have reviewed the program brochure</strong><small>This helps the team understand your current interest.</small></span>
                </label>
                <label className="application-check consent-check">
                  <input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} required />
                  <span><strong>I agree to be contacted about this application</strong><small>Email, phone, SMS, or WhatsApp may be used for admission guidance.</small></span>
                </label>
              </div>

              <button className="application-submit" type="submit" disabled={submitting}>
                {submitting ? 'Submitting application...' : 'Submit application'} <ArrowRight size={17} />
              </button>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}

function ApplicationPoint({ icon, title, detail }) {
  return <div className="application-point"><span>{icon}</span><div><strong>{title}</strong><p>{detail}</p></div></div>;
}

function ApplicationField({ label, value, onChange, type = 'text', required = false, ...props }) {
  return <label className="application-field"><span>{label}{required ? ' *' : ''}</span><input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} {...props} /></label>;
}

function ApplicationSelect({ label, value, options, onChange }) {
  return <label className="application-field"><span>{label} *</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
