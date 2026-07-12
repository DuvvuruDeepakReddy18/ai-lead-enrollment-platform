import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  BellRing,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Plug,
  Plus,
  X
} from 'lucide-react';
import {
  createLead,
  getAllFollowUps,
  getAnalytics,
  getDeliveries,
  getFollowUps,
  getIntegrations,
  getLeads,
  getMessages,
  sendLeadMessage,
  updateLeadStatus
} from './api.js';
import LeadModal from './LeadModal.jsx';
import { PipelineView, IntelligenceView } from './PipelineViews.jsx';
import { AnalyticsView, FollowupsView } from './OperationsViews.jsx';
import { EnrollmentView, OverviewView, PriorityView } from './CommandViews.jsx';
import { IntegrationsView, MessagesHubView } from './CommunicationViews.jsx';
import PublicApplication from './PublicApplication.jsx';
import { SystemStatus, channelLabel, initialFilters, initialForm } from './dashboard-ui.jsx';

const views = {
  overview: { label: 'Overview', kicker: 'Admissions command center', title: 'Admissions overview', icon: LayoutDashboard },
  pipeline: { label: 'Pipeline', kicker: 'Admissions operations', title: 'Lead pipeline', icon: ClipboardList },
  priority: { label: 'Priority Desk', kicker: 'High-intent candidates', title: 'Priority leads', icon: Flame },
  intelligence: { label: 'AI Studio', kicker: 'AI enrollment desk', title: 'Lead intelligence', icon: Bot },
  messages: { label: 'Messages', kicker: 'Communication operations', title: 'Messages hub', icon: Mail },
  followups: { label: 'Follow-Ups', kicker: 'Cadence operations', title: 'Follow-up queue', icon: BellRing },
  enrollment: { label: 'Enrollment', kicker: 'Student lifecycle', title: 'Enrollment journey', icon: GraduationCap },
  analytics: { label: 'Analytics', kicker: 'Performance overview', title: 'Enrollment analytics', icon: BarChart3 },
  integrations: { label: 'Integrations', kicker: 'Connected systems', title: 'Integration center', icon: Plug }
};

const hashAliases = {
  overview: 'overview',
  dashboard: 'overview',
  pipeline: 'pipeline',
  'lead-inbox': 'pipeline',
  priority: 'priority',
  intelligence: 'intelligence',
  scoring: 'intelligence',
  messages: 'messages',
  followups: 'followups',
  enrollment: 'enrollment',
  analytics: 'analytics',
  integrations: 'integrations',
  apply: 'apply'
};

function readViewFromHash() {
  return hashAliases[window.location.hash.slice(1).toLowerCase()] || 'overview';
}

export default function DashboardApp() {
  const [activeView, setActiveView] = useState(readViewFromHash);
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [allFollowups, setAllFollowups] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [form, setForm] = useState(initialForm);
  const [messages, setMessages] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [integrations, setIntegrations] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [draftChannel, setDraftChannel] = useState('whatsapp');
  const [sendingChannel, setSendingChannel] = useState('');
  const [statusDraft, setStatusDraft] = useState('New');
  const [followupSearch, setFollowupSearch] = useState('');
  const [followupDay, setFollowupDay] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowupLoading, setIsFollowupLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  async function refresh(nextFilters = filters) {
    setIsLoading(true);
    try {
      const [leadData, analyticsData] = await Promise.all([getLeads(nextFilters), getAnalytics()]);
      setLeads(leadData.leads);
      setAnalytics(analyticsData);
      setSelectedId((current) => {
        if (current && leadData.leads.some((lead) => lead.id === current)) return current;
        return leadData.leads[0]?.id || current || null;
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAllLeads() {
    const data = await getLeads({ sort: 'score_desc' });
    setAllLeads(data.leads);
    setSelectedId((current) => data.leads.some((lead) => lead.id === current) ? current : data.leads[0]?.id || null);
  }

  async function loadAllFollowups() {
    setIsFollowupLoading(true);
    try {
      const data = await getAllFollowUps();
      setAllFollowups(data.followups);
    } finally {
      setIsFollowupLoading(false);
    }
  }

  async function loadAllDeliveries() {
    const data = await getDeliveries();
    setAllDeliveries(data.deliveries);
  }

  useEffect(() => {
    Promise.all([refresh(initialFilters), loadAllLeads(), loadAllFollowups(), loadAllDeliveries()])
      .catch((error) => setNotice(error.message));
    getIntegrations().then((data) => setIntegrations(data.integrations)).catch((error) => setNotice(error.message));
  }, []);

  useEffect(() => {
    const onHashChange = () => setActiveView(readViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (activeView !== 'intelligence' || !selectedId) return undefined;
    let active = true;
    setIsDetailLoading(true);
    setMessages(null);
    setFollowups([]);
    setDeliveries([]);

    Promise.allSettled([getMessages(selectedId), getFollowUps(selectedId), getDeliveries(selectedId)])
      .then(([messageResult, followupResult, deliveryResult]) => {
        if (!active) return;
        if (messageResult.status === 'fulfilled') setMessages(messageResult.value.messages);
        if (followupResult.status === 'fulfilled') setFollowups(followupResult.value.followups);
        if (deliveryResult.status === 'fulfilled') setDeliveries(deliveryResult.value.deliveries);
        const failed = [messageResult, followupResult, deliveryResult].find((result) => result.status === 'rejected');
        if (failed) setNotice(failed.reason?.message || 'Some lead details could not be loaded.');
      })
      .finally(() => {
        if (active) setIsDetailLoading(false);
      });

    return () => { active = false; };
  }, [activeView, selectedId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!isFormOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setIsFormOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isFormOpen]);

  const selectedLead = useMemo(
    () => allLeads.find((lead) => lead.id === selectedId) || leads.find((lead) => lead.id === selectedId) || allLeads[0] || leads[0],
    [allLeads, leads, selectedId]
  );

  useEffect(() => {
    if (selectedLead) setStatusDraft(selectedLead.status);
  }, [selectedLead?.id, selectedLead?.status]);

  const filteredFollowups = useMemo(() => {
    const query = followupSearch.trim().toLowerCase();
    return allFollowups.filter((step) => {
      const matchesDay = followupDay === 'All' || String(step.day) === followupDay;
      const text = [step.leadName, step.label, step.channel, step.message].join(' ').toLowerCase();
      return matchesDay && (!query || text.includes(query));
    });
  }, [allFollowups, followupDay, followupSearch]);

  const effectiveAnalytics = useMemo(() => buildClientAnalytics(allLeads), [allLeads]);
  const metrics = effectiveAnalytics.metrics;
  const activeFilterCount = [
    filters.search.trim(),
    filters.status !== 'All',
    filters.source !== 'All',
    filters.sort !== initialFilters.sort
  ].filter(Boolean).length;
  const aiReady = Boolean((integrations?.openrouter?.configured && integrations?.openrouter?.modelAllowed) || integrations?.openai?.configured);
  const storageReady = Boolean(integrations?.supabase?.configured);
  const todayLabel = useMemo(() => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()), []);
  const viewMeta = views[activeView];

  function navigateView(view) {
    setActiveView(view);
    window.history.replaceState(null, '', '#' + view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function updateFilters(name, value) {
    const next = { ...filters, [name]: value };
    setFilters(next);
    try { await refresh(next); } catch (error) { setNotice(error.message); }
  }

  async function clearFilters() {
    setFilters(initialFilters);
    try { await refresh(initialFilters); } catch (error) { setNotice(error.message); }
  }

  async function regenerateDraft() {
    if (!selectedLead) return;
    setIsDetailLoading(true);
    try {
      const result = await getMessages(selectedLead.id);
      setMessages(result.messages);
      setNotice(result.messages.provider === 'local-fallback'
        ? 'OpenRouter was unavailable, so a personalized fallback draft was created.'
        : 'Fresh AI outreach draft generated.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function copyDraft(channel) {
    const text = draftText(messages, channel);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setNotice(channelLabel(channel) + ' draft copied.');
    } catch {
      setNotice('Clipboard access was blocked by the browser.');
    }
  }

  function openDraftChannel(channel) {
    if (!selectedLead) return;
    const url = manualChannelUrl(selectedLead, messages, channel);
    if (!url) return;
    if (channel === 'whatsapp') window.open(url, '_blank', 'noopener,noreferrer');
    else window.location.href = url;
    setNotice(channelLabel(channel) + ' opened with the draft ready to review.');
  }

  async function sendChannel(channel) {
    if (!selectedLead) return;
    setSendingChannel(channel);
    try {
      const result = await sendLeadMessage(selectedLead.id, channel);
      setMessages(result.messages || messages);
      const deliveryData = await getDeliveries(selectedLead.id);
      setDeliveries(deliveryData.deliveries);
      await loadAllDeliveries();
      setNotice(channelLabel(channel) + ' ' + result.delivery.status.replace(/_/g, ' ') + ' via ' + result.delivery.provider + '.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSendingChannel('');
    }
  }

  async function submitStatusUpdate(event) {
    event.preventDefault();
    if (!selectedLead || statusDraft === selectedLead.status) return;
    try {
      const result = await updateLeadStatus(selectedLead.id, statusDraft);
      setNotice(result.lead.name + ' moved to ' + result.lead.status + '.');
      await Promise.all([refresh(filters), loadAllLeads(), loadAllFollowups()]);
      setSelectedId(result.lead.id);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function submitLead(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await createLead({ ...form, age: Number(form.age), websiteVisits: Number(form.websiteVisits) });
      setNotice(created.lead.name + ' added as a ' + created.lead.temperature + ' lead with score ' + created.lead.score + '.');
      setForm(initialForm);
      setIsFormOpen(false);
      setFilters(initialFilters);
      await Promise.all([refresh(initialFilters), loadAllLeads(), loadAllFollowups(), loadAllDeliveries()]);
      setSelectedId(created.lead.id);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openLead(leadId, view = 'pipeline') {
    setSelectedId(leadId);
    navigateView(view);
  }

  function openLeadInIntelligence(leadId) {
    openLead(leadId, 'intelligence');
  }

  async function copyValue(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(label + ' copied.');
    } catch {
      setNotice('Clipboard access was blocked by the browser.');
    }
  }

  function syncPublicApplication() {
    Promise.all([refresh(filters), loadAllLeads(), loadAllFollowups()])
      .catch((error) => setNotice(error.message));
  }

  function openWorkspace() {
    syncPublicApplication();
    navigateView('overview');
  }

  if (activeView === 'apply') {
    return <PublicApplication onOpenWorkspace={openWorkspace} onSubmitted={syncPublicApplication} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">LF</span><div><strong>LeadFlow</strong><span>EFOS Admissions</span></div></div>
        <nav className="nav-stack" aria-label="Main navigation">
          {Object.entries(views).map(([key, item]) => (
            <NavItem key={key} item={item} active={activeView === key} count={key === 'pipeline' ? metrics.totalLeads : null} onClick={() => navigateView(key)} />
          ))}
        </nav>
        <button className="intake-nav-button" type="button" onClick={() => navigateView('apply')}>
          <ExternalLink size={16} /><span>Public application form</span>
        </button>
        <div className="sidebar-status">
          <p className="sidebar-label">System status</p>
          <SystemStatus type="bot" label="AI drafting" value={aiReady ? 'Connected' : 'Local mode'} ready={aiReady} />
          <SystemStatus type="database" label="Lead storage" value={storageReady ? 'Supabase' : 'SQLite'} ready={storageReady} />
        </div>
        <div className="sidebar-footer"><span className="live-dot" />Admissions workspace online</div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="workspace-kicker">{viewMeta.kicker}</p><h1>{viewMeta.title}</h1>
            <div className="header-meta"><span><CalendarDays size={15} /> {todayLabel}</span><span><Activity size={15} /> Live workspace</span></div>
          </div>
          <button className="primary-button" type="button" onClick={() => setIsFormOpen(true)}><Plus size={18} /> New Lead</button>
        </header>

        {notice ? <div className="notice" role="status"><CheckCircle2 size={18} /><span>{notice}</span><button type="button" aria-label="Dismiss notification" title="Dismiss" onClick={() => setNotice('')}><X size={16} /></button></div> : null}

        {activeView === 'overview' ? <OverviewView leads={allLeads} analytics={effectiveAnalytics} followups={allFollowups} deliveries={allDeliveries} onOpenLead={openLead} onNavigate={navigateView} onOpenApply={() => navigateView('apply')} /> : null}
        {activeView === 'pipeline' ? (
          <PipelineView leads={leads} selectedLead={selectedLead} filters={filters} activeFilterCount={activeFilterCount} isLoading={isLoading} statusDraft={statusDraft} setStatusDraft={setStatusDraft} onFilter={updateFilters} onClearFilters={clearFilters} onSelect={setSelectedId} onStatusUpdate={submitStatusUpdate} onNavigate={navigateView} />
        ) : null}
        {activeView === 'priority' ? <PriorityView leads={allLeads} onOpenLead={openLead} /> : null}
        {activeView === 'intelligence' ? (
          <IntelligenceView leads={allLeads} selectedLead={selectedLead} selectedId={selectedId} onSelect={setSelectedId} messages={messages} followups={followups} integrations={integrations} deliveries={deliveries} isDetailLoading={isDetailLoading} draftChannel={draftChannel} setDraftChannel={setDraftChannel} sendingChannel={sendingChannel} onSend={sendChannel} onRegenerate={regenerateDraft} onCopy={copyDraft} onOpenChannel={openDraftChannel} />
        ) : null}
        {activeView === 'messages' ? <MessagesHubView leads={allLeads} deliveries={allDeliveries} onOpenLead={openLead} /> : null}
        {activeView === 'followups' ? (
          <FollowupsView followups={filteredFollowups} isLoading={isFollowupLoading} search={followupSearch} setSearch={setFollowupSearch} day={followupDay} setDay={setFollowupDay} onOpenLead={openLeadInIntelligence} />
        ) : null}
        {activeView === 'enrollment' ? <EnrollmentView leads={allLeads} analytics={effectiveAnalytics} onOpenLead={openLead} /> : null}
        {activeView === 'analytics' ? <AnalyticsView analytics={effectiveAnalytics} leads={allLeads} /> : null}
        {activeView === 'integrations' ? <IntegrationsView integrations={integrations} onCopy={copyValue} onOpenApply={() => navigateView('apply')} /> : null}
      </main>

      {isFormOpen ? <LeadModal form={form} setForm={setForm} isSubmitting={isSubmitting} onClose={() => setIsFormOpen(false)} onSubmit={submitLead} /> : null}
    </div>
  );
}

function NavItem({ item, active, count, onClick }) {
  const Icon = item.icon;
  return (
    <button type="button" className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={onClick}>
      <Icon size={18} /><span>{item.label}</span>{count !== null ? <b>{count}</b> : null}
    </button>
  );
}
function draftText(messages, channel) {
  if (!messages) return '';
  if (channel === 'email') {
    return messages.email ? `${messages.email.subject}\n\n${messages.email.body}` : '';
  }
  return messages[channel] || '';
}

function manualChannelUrl(lead, messages, channel) {
  const text = draftText(messages, channel);
  if (!text) return '';
  if (channel === 'whatsapp') {
    let phone = String(lead.phone || '').replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }
  if (channel === 'email') {
    return `mailto:${encodeURIComponent(lead.email || '')}?subject=${encodeURIComponent(messages.email.subject)}&body=${encodeURIComponent(messages.email.body)}`;
  }
  if (channel === 'sms') {
    return `sms:${String(lead.phone || '').replace(/[^+\d]/g, '')}?body=${encodeURIComponent(text)}`;
  }
  return '';
}
function buildClientAnalytics(leads) {
  const totalLeads = leads.length;
  const hotLeads = leads.filter((lead) => lead.temperature === 'Hot').length;
  const qualifiedLeads = leads.filter((lead) => lead.score > 80 || ['Qualified', 'Enrolled'].includes(lead.status)).length;
  const enrollments = leads.filter((lead) => lead.status === 'Enrolled').length;
  const bySource = new Map();

  for (const lead of leads) {
    const source = lead.source || 'Unknown';
    const current = bySource.get(source) || { source, leads: 0, hot: 0, enrolled: 0 };
    current.leads += 1;
    if (lead.temperature === 'Hot') current.hot += 1;
    if (lead.status === 'Enrolled') current.enrolled += 1;
    bySource.set(source, current);
  }

  const percentage = (part, total) => total ? Number(((part / total) * 100).toFixed(1)) : 0;
  return {
    metrics: {
      totalLeads,
      hotLeads,
      qualifiedLeads,
      enrollments,
      conversionRate: percentage(enrollments, totalLeads),
      enrollmentRate: percentage(enrollments, qualifiedLeads)
    },
    sourcePerformance: [...bySource.values()].map((source) => ({
      ...source,
      hotRate: percentage(source.hot, source.leads),
      enrollmentRate: percentage(source.enrolled, source.leads)
    })).sort((a, b) => b.leads - a.leads)
  };
}
