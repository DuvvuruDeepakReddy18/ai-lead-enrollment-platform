import { Send, X } from 'lucide-react';
import { Field, SelectField, sources } from './dashboard-ui.jsx';

export default function LeadModal({ form, setForm, isSubmitting, onClose, onSubmit }) {
  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="lead-modal" role="dialog" aria-modal="true" aria-labelledby="new-lead-title">
        <header className="modal-header">
          <div>
            <p className="section-kicker">New pipeline entry</p>
            <h2 id="new-lead-title">Lead Registration Form</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close lead form" title="Close">
            <X size={19} />
          </button>
        </header>

        <form className="lead-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required autoFocus />
            <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
            <Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} required inputMode="tel" />
            <Field label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} required />
            <SelectField label="Qualification" value={form.qualification} options={['12th Completed Student', '12th Studying', 'Diploma Student', 'Graduate']} onChange={(value) => setForm({ ...form, qualification: value })} />
            <SelectField label="Source" value={form.source} options={sources.filter((source) => source !== 'All')} onChange={(value) => setForm({ ...form, source: value })} />
            <SelectField label="Course Interest" value={form.courseInterest} options={['BTech', 'Data Science', 'AI Automation', 'Full Stack Development']} onChange={(value) => setForm({ ...form, courseInterest: value })} />
            <Field label="Age" type="number" min="14" max="35" value={form.age} onChange={(value) => setForm({ ...form, age: value })} />
            <Field label="Website Visits" type="number" min="0" value={form.websiteVisits} onChange={(value) => setForm({ ...form, websiteVisits: value })} />
            <label className="check-field">
              <input type="checkbox" checked={form.downloadedBrochure} onChange={(event) => setForm({ ...form, downloadedBrochure: event.target.checked })} />
              <strong>Downloaded brochure</strong>
            </label>
          </div>

          <footer className="modal-footer">
            <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              <Send size={17} /> {isSubmitting ? 'Scoring lead...' : 'Collect & Score Lead'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
