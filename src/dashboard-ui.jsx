import { Bot, Database, UserRoundSearch } from 'lucide-react';

export const initialForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  qualification: '12th Completed Student',
  source: 'Website Form',
  courseInterest: 'BTech',
  age: 17,
  downloadedBrochure: true,
  websiteVisits: 4
};

export const initialFilters = { search: '', status: 'All', source: 'All', sort: 'score_desc' };
export const statuses = ['All', 'New', 'Contacted', 'Interested', 'Follow-Up', 'Qualified', 'Enrolled', 'Rejected'];
export const leadStatuses = statuses.filter((status) => status !== 'All');
export const sources = ['All', 'Website Form', 'WhatsApp', 'Google Forms', 'Meta Ads', 'Internship Registration', 'Referral Program'];
export const sortOptions = [
  { value: 'score_desc', label: 'Score: high to low' },
  { value: 'created_desc', label: 'Newest first' },
  { value: 'created_asc', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A-Z' }
];

export function SystemStatus({ type, label, value, ready }) {
  const Icon = type === 'database' ? Database : Bot;
  return (
    <div className="system-row">
      <span><Icon size={16} /></span>
      <div><strong>{label}</strong><small>{value}</small></div>
      <i className={ready ? 'ready' : 'local'} />
    </div>
  );
}

export function FilterField({ label, value, options, onChange }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select aria-label={'Filter by ' + label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const normalized = typeof option === 'string' ? { value: option, label: option } : option;
          return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>;
        })}
      </select>
    </label>
  );
}

export function IntegrationBadge({ label, ready, detail }) {
  return (
    <span className={'integration-badge ' + (ready ? 'ready' : 'missing')} title={detail || undefined}>
      <i /> {label} <small>{ready ? 'On' : 'Off'}</small>
    </span>
  );
}

export function DeliveryLog({ deliveries }) {
  if (!deliveries.length) return <p className="delivery-empty">No delivery attempts for this lead.</p>;
  return (
    <div className="delivery-log">
      <h4>Recent delivery attempts</h4>
      {deliveries.slice(0, 5).map((delivery) => (
        <div className="delivery-row" key={delivery.id}>
          <span>{channelLabel(delivery.channel)}</span>
          <strong className={'delivery-state ' + delivery.status}>{delivery.status.replace(/_/g, ' ')}</strong>
          <small>{delivery.detail || delivery.provider}</small>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr className="skeleton-row" key={index} aria-hidden="true">
      <td><i /></td><td><i /></td><td><i /></td><td><i /></td><td><i /></td>
    </tr>
  ));
}

export function QueueSkeleton() {
  return (
    <div className="queue-skeleton" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
    </div>
  );
}

export function Metric({ icon, label, value, caption, tone = '' }) {
  return (
    <div className={'metric-card ' + tone}>
      <span className="metric-icon">{icon}</span>
      <div><p>{label}</p><strong>{value}</strong><small>{caption}</small></div>
    </div>
  );
}

export function Field({ label, value, onChange, type = 'text', required = false, autoFocus = false, ...inputProps }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} required={required} autoFocus={autoFocus} onChange={(event) => onChange(event.target.value)} {...inputProps} />
    </label>
  );
}

export function SelectField({ label, value, options, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function StatusBadge({ status }) {
  return <span className={'status-badge ' + status.toLowerCase().replace(/[^a-z]/g, '-')}>{status}</span>;
}

export function ScorePill({ lead }) {
  return <span className={'score-pill ' + lead.temperature.toLowerCase()}><b>{lead.score}</b><small>{lead.temperature}</small></span>;
}

export function ScoreRing({ score }) {
  return (
    <div className="score-ring" style={{ '--score': score * 3.6 + 'deg' }}>
      <strong>{score}</strong><span>Score</span>
    </div>
  );
}

export function DetailRow({ label, value, icon }) {
  return <div className="detail-row"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

export function EmptySelection({ title = 'Select a lead', detail = 'Lead details will appear here.' }) {
  return <div className="detail-empty"><UserRoundSearch size={28} /><strong>{title}</strong><span>{detail}</span></div>;
}

export function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || '') + (words.length > 1 ? words.at(-1)[0] : '')).toUpperCase();
}

export function pipelineShare(value, total) {
  return total ? Math.round((value / total) * 100) + '%' : '0%';
}

export function providerLabel(messages) {
  if (messages?.provider === 'openrouter') return 'OpenRouter AI';
  if (messages?.provider === 'openai') return 'OpenAI';
  if (messages?.provider === 'local-fallback') return 'Smart fallback';
  return messages ? 'Smart template' : 'Waiting for draft';
}

export function channelLabel(channel) {
  const labels = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS', webhook: 'Automation webhook' };
  return labels[String(channel || '').toLowerCase()] || channel;
}

export function formatShortDate(date) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(date));
}

export function formatFullDate(date) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date));
}

export function labelize(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}
