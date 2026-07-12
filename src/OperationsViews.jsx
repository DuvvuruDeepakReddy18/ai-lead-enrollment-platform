import {
  AlertCircle,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Flame,
  Search,
  UserCheck,
  UsersRound
} from 'lucide-react';
import { FilterField, Metric, QueueSkeleton, formatFullDate, initials, pipelineShare } from './dashboard-ui.jsx';

const dayOptions = [
  { value: 'All', label: 'All cadence days' },
  { value: '1', label: 'Day 1' },
  { value: '3', label: 'Day 3' },
  { value: '5', label: 'Day 5' },
  { value: '7', label: 'Day 7' },
  { value: '10', label: 'Day 10' }
];

export function FollowupsView({
  followups,
  isLoading,
  search,
  setSearch,
  day,
  setDay,
  onOpenLead
}) {
  const uniqueLeads = new Set(followups.map((step) => step.leadId)).size;
  const overdue = followups.filter((step) => new Date(step.dueDate) < new Date() && step.status !== 'completed').length;

  return (
    <section className="view-shell followups-view" aria-label="Follow-up operations workspace">
      <div className="followup-stat-grid" aria-label="Follow-up summary">
        <FollowupStat icon={<BellRing />} label="Scheduled" value={followups.length} detail="Active touchpoints" />
        <FollowupStat icon={<UsersRound />} label="Leads in queue" value={uniqueLeads} detail="Across all counselors" tone="blue" />
        <FollowupStat icon={<AlertCircle />} label="Overdue" value={overdue} detail={overdue ? 'Needs attention' : 'Queue is on track'} tone={overdue ? 'hot' : 'good'} />
      </div>

      <article className="panel queue-panel">
        <div className="panel-header">
          <div><p className="section-kicker">Enrollment cadence</p><h2>Scheduled Touchpoints</h2></div>
          <span className="result-count">{followups.length} items</span>
        </div>

        <div className="queue-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input aria-label="Search follow-ups" value={search} placeholder="Search lead or touchpoint..." onChange={(event) => setSearch(event.target.value)} />
          </label>
          <FilterField label="Cadence" value={day} onChange={setDay} options={dayOptions} />
        </div>

        <div className="queue-list">
          <div className="queue-head" aria-hidden="true"><span>Due</span><span>Lead</span><span>Touchpoint</span><span>Channel</span><span /></div>
          {isLoading ? <QueueSkeleton /> : null}
          {!isLoading && !followups.length ? (
            <div className="queue-empty"><BellRing size={24} /><strong>No follow-ups match this view</strong><span>Try a different lead name or cadence day.</span></div>
          ) : null}
          {!isLoading ? followups.map((step, index) => (
            <button className="queue-item" type="button" key={step.leadId + '-' + step.day + '-' + index} onClick={() => onOpenLead(step.leadId)}>
              <span className="due-cell"><b className="due-badge">Day {step.day}</b><small>{formatFullDate(step.dueDate)}</small></span>
              <span className="queue-lead"><i>{initials(step.leadName)}</i><span><strong>{step.leadName}</strong><small>Lead profile</small></span></span>
              <span className="touchpoint-cell"><strong>{step.label}</strong><small>{step.message}</small></span>
              <span className={'channel-chip ' + step.channel.toLowerCase()}>{step.channel}</span>
              <span className="queue-open" title="Open in AI Intelligence"><ChevronRight size={18} /></span>
            </button>
          )) : null}
        </div>
      </article>
    </section>
  );
}

export function AnalyticsView({ analytics, leads }) {
  const metrics = analytics?.metrics || emptyMetrics;
  const sourcePerformance = analytics?.sourcePerformance || [];
  const statusDistribution = getStatusDistribution(leads);

  return (
    <section className="view-shell analytics-view" aria-label="Admissions analytics workspace">
      <div className="metric-grid analytics-metrics" aria-label="Lead metrics">
        <Metric icon={<UsersRound />} label="Total Leads" value={metrics.totalLeads} caption={sourcePerformance.length + ' acquisition sources'} />
        <Metric icon={<Flame />} label="Hot Leads" value={metrics.hotLeads} caption={pipelineShare(metrics.hotLeads, metrics.totalLeads) + ' of pipeline'} tone="hot" />
        <Metric icon={<UserCheck />} label="Qualified" value={metrics.qualifiedLeads} caption="Ready for counseling" tone="good" />
        <Metric icon={<CircleDollarSign />} label="Enrolled" value={metrics.enrollments} caption="Confirmed students" tone="blue" />
        <Metric icon={<CheckCircle2 />} label="Conversion" value={metrics.conversionRate + '%'} caption="Lead to enrollment" tone="blue" />
        <Metric icon={<BarChart3 />} label="Enrollment Rate" value={metrics.enrollmentRate + '%'} caption="Qualified to enrolled" tone="good" />
      </div>

      <div className="analytics-grid">
        <article className="panel analytics-source-panel">
          <div className="panel-header">
            <div><p className="section-kicker">Acquisition quality</p><h2>Lead Source Performance</h2></div>
            <div className="chart-legend"><span><i className="hot-key" /> Hot</span><span><i className="enrolled-key" /> Enrolled</span></div>
          </div>
          <div className="source-chart">
            {sourcePerformance.map((source) => (
              <div className="source-row" key={source.source}>
                <div className="source-summary"><strong>{source.source}</strong><span>{source.leads} {source.leads === 1 ? 'lead' : 'leads'}</span></div>
                <div className="rate-bars">
                  <div className="rate-line"><span>Hot</span><div className="chart-track"><i className="hot-bar" style={{ width: source.hotRate + '%' }} /></div><strong>{source.hotRate}%</strong></div>
                  <div className="rate-line"><span>Enrolled</span><div className="chart-track"><i className="enrolled-bar" style={{ width: source.enrollmentRate + '%' }} /></div><strong>{source.enrollmentRate}%</strong></div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel status-panel">
          <div className="panel-header">
            <div><p className="section-kicker">Pipeline health</p><h2>Status Distribution</h2></div>
            <Clock3 size={19} />
          </div>
          <div className="status-chart">
            {statusDistribution.map((item) => (
              <div className="status-row" key={item.status}>
                <div><strong>{item.status}</strong><span>{item.count} {item.count === 1 ? 'lead' : 'leads'}</span></div>
                <div className="status-track"><i className={'status-fill ' + item.status.toLowerCase().replace(/[^a-z]/g, '-')} style={{ width: item.share + '%' }} /></div>
                <b>{item.share}%</b>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function FollowupStat({ icon, label, value, detail, tone = '' }) {
  return <div className={'followup-stat ' + tone}><span>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></div>;
}

function getStatusDistribution(leads) {
  const counts = new Map();
  for (const lead of leads) counts.set(lead.status, (counts.get(lead.status) || 0) + 1);
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count, share: leads.length ? Math.round((count / leads.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

const emptyMetrics = { totalLeads: 0, hotLeads: 0, qualifiedLeads: 0, enrollments: 0, conversionRate: 0, enrollmentRate: 0 };
