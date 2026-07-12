import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Flame,
  GraduationCap,
  Mail,
  MessageSquareText,
  Phone,
  Send,
  TrendingUp,
  UserCheck,
  UsersRound
} from 'lucide-react';
import { Metric, ScorePill, StatusBadge, formatShortDate, initials, pipelineShare } from './dashboard-ui.jsx';

export function OverviewView({ leads, analytics, followups, deliveries, onOpenLead, onNavigate, onOpenApply }) {
  const metrics = analytics?.metrics || emptyMetrics;
  const priorityLeads = getPriorityLeads(leads);
  const recentLeads = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const activeFollowups = followups.slice(0, 4);
  const sentCount = deliveries.filter((item) => ['sent', 'queued', 'delivered'].includes(item.status)).length;

  return (
    <section className="view-shell overview-view" aria-label="Admissions overview">
      <div className="overview-metrics">
        <Metric icon={<UsersRound />} label="Total Leads" value={metrics.totalLeads} caption="Across every intake source" />
        <Metric icon={<Flame />} label="Priority Leads" value={priorityLeads.length} caption="Profiles needing action" tone="hot" />
        <Metric icon={<UserCheck />} label="Qualified" value={metrics.qualifiedLeads} caption="Counseling-ready profiles" tone="good" />
        <Metric icon={<CircleDollarSign />} label="Enrollments" value={metrics.enrollments} caption={metrics.conversionRate + '% overall conversion'} tone="blue" />
        <Metric icon={<Send />} label="Outreach Sent" value={sentCount} caption="Logged delivery attempts" tone="blue" />
      </div>

      {priorityLeads.length ? (
        <div className="operations-alert">
          <span><AlertTriangle size={18} /></span>
          <div><strong>{priorityLeads.length} high-intent {priorityLeads.length === 1 ? 'lead needs' : 'leads need'} attention</strong><p>Open the priority desk to contact the strongest candidates first.</p></div>
          <button type="button" onClick={() => onNavigate('priority')}>Review priority queue <ArrowRight size={15} /></button>
        </div>
      ) : null}

      <div className="overview-grid">
        <article className="panel overview-recent-panel">
          <div className="panel-header"><div><p className="section-kicker">Live intake</p><h2>Recent Applications</h2></div><button className="text-command" type="button" onClick={() => onNavigate('pipeline')}>View pipeline <ArrowRight size={14} /></button></div>
          <div className="overview-lead-list">
            {recentLeads.map((lead) => (
              <button type="button" key={lead.id} className="overview-lead-row" onClick={() => onOpenLead(lead.id, 'pipeline')}>
                <i>{initials(lead.name)}</i>
                <span><strong>{lead.name}</strong><small>{lead.courseInterest} · {lead.city}</small></span>
                <StatusBadge status={lead.status} />
                <ScorePill lead={lead} />
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </article>

        <aside className="panel overview-funnel-panel">
          <div className="panel-header"><div><p className="section-kicker">Pipeline health</p><h2>Enrollment Funnel</h2></div><TrendingUp size={18} /></div>
          <div className="compact-funnel">
            <FunnelStep label="Applications" value={metrics.totalLeads} share={100} />
            <FunnelStep label="Qualified" value={metrics.qualifiedLeads} share={share(metrics.qualifiedLeads, metrics.totalLeads)} tone="good" />
            <FunnelStep label="Enrolled" value={metrics.enrollments} share={share(metrics.enrollments, metrics.totalLeads)} tone="blue" />
          </div>
          <button className="secondary-button funnel-command" type="button" onClick={() => onNavigate('enrollment')}><GraduationCap size={16} /> Open enrollment tracker</button>
        </aside>
      </div>

      <div className="overview-grid lower-overview-grid">
        <article className="panel overview-followups-panel">
          <div className="panel-header"><div><p className="section-kicker">Next actions</p><h2>Upcoming Touchpoints</h2></div><span className="result-count">{followups.length} scheduled</span></div>
          <div className="overview-touch-list">
            {activeFollowups.map((step, index) => (
              <button type="button" key={step.leadId + '-' + step.day + '-' + index} onClick={() => onOpenLead(step.leadId, 'intelligence')}>
                <span className="touch-day">D{step.day}</span>
                <span><strong>{step.leadName}</strong><small>{step.label} · {step.channel}</small></span>
                <b>{formatShortDate(step.dueDate)}</b>
              </button>
            ))}
          </div>
        </article>

        <aside className="panel intake-link-panel">
          <span><ClipboardList size={21} /></span>
          <p className="section-kicker">Connected intake</p>
          <h2>Public student application</h2>
          <p>Share one clean form. Every successful submission enters this pipeline with scoring and counselor routing.</p>
          <button className="primary-button" type="button" onClick={onOpenApply}>Open application form <ArrowRight size={16} /></button>
        </aside>
      </div>
    </section>
  );
}

export function PriorityView({ leads, onOpenLead }) {
  const priorityLeads = getPriorityLeads(leads);
  const immediate = priorityLeads.filter((lead) => lead.score >= 90).length;
  const counselorReady = priorityLeads.filter((lead) => lead.counselor).length;

  return (
    <section className="view-shell priority-view" aria-label="Priority lead workspace">
      <div className="priority-summary">
        <PriorityStat icon={<Flame />} label="Priority queue" value={priorityLeads.length} detail="Score 80 or above" tone="hot" />
        <PriorityStat icon={<AlertTriangle />} label="Immediate" value={immediate} detail="Score 90 or above" tone="danger" />
        <PriorityStat icon={<UserCheck />} label="Counselor assigned" value={counselorReady} detail="Ready for outreach" tone="good" />
      </div>

      <article className="panel priority-panel">
        <div className="panel-header"><div><p className="section-kicker">Action desk</p><h2>High-Intent Candidates</h2></div><span className="result-count">Highest score first</span></div>
        <div className="priority-list">
          {priorityLeads.map((lead) => (
            <div className="priority-row" key={lead.id}>
              <div className="priority-person"><i>{initials(lead.name)}</i><span><strong>{lead.name}</strong><small>{lead.courseInterest} · {lead.city}</small></span></div>
              <div className="priority-score"><span>{lead.score}</span><small>{priorityLabel(lead.score)}</small></div>
              <div className="priority-recommendation"><small>Recommended action</small><strong>{recommendedAction(lead)}</strong><p>{lead.counselor?.name || 'Assign a counselor before outreach'}</p></div>
              <StatusBadge status={lead.status} />
              <div className="priority-actions">
                <a href={'tel:' + lead.phone} title="Call lead" aria-label={'Call ' + lead.name}><Phone size={16} /></a>
                <a href={'mailto:' + lead.email} title="Email lead" aria-label={'Email ' + lead.name}><Mail size={16} /></a>
                <button type="button" onClick={() => onOpenLead(lead.id, 'intelligence')}><MessageSquareText size={16} /> Open outreach</button>
              </div>
            </div>
          ))}
          {!priorityLeads.length ? <div className="priority-empty"><CheckCircle2 size={25} /><strong>Priority queue is clear</strong><span>New hot leads will appear here automatically.</span></div> : null}
        </div>
      </article>
    </section>
  );
}

export function EnrollmentView({ leads, analytics, onOpenLead }) {
  const metrics = analytics?.metrics || emptyMetrics;
  const stages = enrollmentStages.map((stage) => ({ ...stage, leads: leads.filter((lead) => stage.statuses.includes(lead.status)) }));

  return (
    <section className="view-shell enrollment-view" aria-label="Enrollment tracking workspace">
      <div className="enrollment-summary">
        <Metric icon={<UsersRound />} label="Applicants" value={metrics.totalLeads} caption="All active profiles" />
        <Metric icon={<UserCheck />} label="Qualified" value={metrics.qualifiedLeads} caption={pipelineShare(metrics.qualifiedLeads, metrics.totalLeads) + ' of pipeline'} tone="good" />
        <Metric icon={<GraduationCap />} label="Enrolled" value={metrics.enrollments} caption="Confirmed students" tone="blue" />
        <Metric icon={<TrendingUp />} label="Conversion" value={metrics.conversionRate + '%'} caption="Application to enrollment" tone="blue" />
      </div>

      <article className="panel enrollment-board-panel">
        <div className="panel-header"><div><p className="section-kicker">Lifecycle view</p><h2>Enrollment Journey</h2></div><span className="result-count">Select a student to manage</span></div>
        <div className="enrollment-board">
          {stages.map((stage) => (
            <section className="enrollment-column" key={stage.label}>
              <header><span className={stage.tone}>{stage.icon}</span><div><strong>{stage.label}</strong><small>{stage.leads.length} {stage.leads.length === 1 ? 'student' : 'students'}</small></div></header>
              <div>
                {stage.leads.map((lead) => (
                  <button type="button" key={lead.id} onClick={() => onOpenLead(lead.id, 'pipeline')}>
                    <i>{initials(lead.name)}</i><span><strong>{lead.name}</strong><small>{lead.courseInterest}</small></span><b>{lead.score}</b>
                  </button>
                ))}
                {!stage.leads.length ? <p>No students in this stage</p> : null}
              </div>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}

function FunnelStep({ label, value, share: portion, tone = '' }) {
  return <div className={'funnel-step ' + tone}><div><strong>{label}</strong><span>{value}</span></div><div><i style={{ width: portion + '%' }} /></div><small>{portion}%</small></div>;
}

function PriorityStat({ icon, label, value, detail, tone }) {
  return <div className={'priority-stat ' + tone}><span>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></div>;
}

export function getPriorityLeads(leads) {
  return leads
    .filter((lead) => lead.score >= 80 && !['Enrolled', 'Rejected'].includes(lead.status))
    .sort((a, b) => b.score - a.score);
}

function recommendedAction(lead) {
  if (lead.score >= 95) return 'Call within 30 minutes';
  if (lead.status === 'Qualified') return 'Confirm counseling slot';
  if (lead.downloadedBrochure) return 'Send program comparison';
  return 'Share brochure and schedule call';
}

function priorityLabel(score) {
  if (score >= 90) return 'Immediate';
  if (score >= 80) return 'High';
  return 'Normal';
}

function share(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

const enrollmentStages = [
  { label: 'New', statuses: ['New'], icon: '1', tone: 'new' },
  { label: 'Contacted', statuses: ['Contacted'], icon: '2', tone: 'contacted' },
  { label: 'Nurturing', statuses: ['Interested', 'Follow-Up'], icon: '3', tone: 'nurturing' },
  { label: 'Qualified', statuses: ['Qualified'], icon: '4', tone: 'qualified' },
  { label: 'Enrolled', statuses: ['Enrolled'], icon: '5', tone: 'enrolled' }
];

const emptyMetrics = { totalLeads: 0, hotLeads: 0, qualifiedLeads: 0, enrollments: 0, conversionRate: 0, enrollmentRate: 0 };
