import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  GraduationCap,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  UserCheck,
  UserRoundSearch
} from 'lucide-react';
import {
  DeliveryLog,
  DetailRow,
  EmptySelection,
  FilterField,
  IntegrationBadge,
  ScorePill,
  ScoreRing,
  StatusBadge,
  TableSkeleton,
  formatShortDate,
  initials,
  labelize,
  leadStatuses,
  providerLabel,
  sortOptions,
  sources,
  statuses
} from './dashboard-ui.jsx';

export function PipelineView({
  leads,
  selectedLead,
  filters,
  activeFilterCount,
  isLoading,
  statusDraft,
  setStatusDraft,
  onFilter,
  onClearFilters,
  onSelect,
  onStatusUpdate,
  onNavigate
}) {
  return (
    <section className="view-shell pipeline-grid" aria-label="Lead pipeline workspace">
      <article className="panel lead-panel">
        <div className="panel-header">
          <div><p className="section-kicker">Pipeline workspace</p><h2>Lead Inbox</h2></div>
          <span className="result-count">{leads.length} shown</span>
        </div>

        <div className="filter-row">
          <label className="search-field">
            <Search size={17} />
            <input aria-label="Search leads" value={filters.search} placeholder="Search name, city, course..." onChange={(event) => onFilter('search', event.target.value)} />
          </label>
          <FilterField label="Status" value={filters.status} onChange={(value) => onFilter('status', value)} options={statuses} />
          <FilterField label="Source" value={filters.source} onChange={(value) => onFilter('source', value)} options={sources} />
          <FilterField label="Sort" value={filters.sort} onChange={(value) => onFilter('sort', value)} options={sortOptions} />
          {activeFilterCount ? (
            <button className="icon-button reset-button" type="button" onClick={onClearFilters} title="Clear filters" aria-label="Clear filters">
              <RotateCcw size={17} /><span>{activeFilterCount}</span>
            </button>
          ) : null}
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Lead</th><th>Status</th><th>Course</th><th>Source</th><th>Score</th></tr></thead>
            <tbody>
              {isLoading ? <TableSkeleton /> : null}
              {!isLoading && !leads.length ? (
                <tr className="empty-row"><td colSpan={5}>
                  <UserRoundSearch size={24} /><strong>No leads match this view</strong><span>Clear the filters to restore the full pipeline.</span>
                </td></tr>
              ) : null}
              {!isLoading ? leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={lead.id === selectedLead?.id ? 'selected-row' : ''}
                  onClick={() => onSelect(lead.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onSelect(lead.id);
                  }}
                  tabIndex={0}
                  aria-selected={lead.id === selectedLead?.id}
                >
                  <td><div className="lead-identity"><span className="lead-avatar">{initials(lead.name)}</span><div><strong>{lead.name}</strong><span>{lead.city}</span></div></div></td>
                  <td><StatusBadge status={lead.status} /></td>
                  <td>{lead.courseInterest}</td>
                  <td><span className="source-name">{lead.source}</span></td>
                  <td><ScorePill lead={lead} /></td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </div>
      </article>

      <aside className="panel detail-panel pipeline-detail">
        {selectedLead ? (
          <>
            <div className="detail-header compact">
              <div className="lead-profile">
                <span className="profile-avatar">{initials(selectedLead.name)}</span>
                <div><p className="eyebrow">Selected lead</p><h2>{selectedLead.name}</h2><span className="contact-line"><Mail size={14} /> {selectedLead.email}</span></div>
              </div>
              <ScoreRing score={selectedLead.score} />
            </div>

            <div className="profile-status-row">
              <StatusBadge status={selectedLead.status} />
              <span className={'temperature-label ' + selectedLead.temperature.toLowerCase()}><Flame size={14} /> {selectedLead.temperature} lead</span>
            </div>

            <div className="detail-list">
              <DetailRow label="Phone" value={selectedLead.phone} icon={<Phone size={16} />} />
              <DetailRow label="Course" value={selectedLead.courseInterest} icon={<GraduationCap size={16} />} />
              <DetailRow label="City" value={selectedLead.city} icon={<MapPin size={16} />} />
              <DetailRow label="Counselor" value={selectedLead.counselor?.name || 'Unassigned'} icon={<UserCheck size={16} />} />
            </div>

            <div className="engagement-strip" aria-label="Lead engagement">
              <span><small>Qualification</small><strong>{selectedLead.qualification}</strong></span>
              <span><small>Brochure</small><strong>{selectedLead.downloadedBrochure ? 'Downloaded' : 'Not yet'}</strong></span>
              <span><small>Visits</small><strong>{selectedLead.websiteVisits}</strong></span>
            </div>

            <form className="status-control" onSubmit={onStatusUpdate}>
              <label><span>Update Status</span><select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>{leadStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <button className="secondary-button save-status" type="submit" disabled={statusDraft === selectedLead.status}><Check size={17} /> Save</button>
            </form>

            <div className="pipeline-actions">
              <button className="primary-button" type="button" onClick={() => onNavigate('intelligence')}><Sparkles size={17} /> Open AI Intelligence</button>
              <button className="secondary-button" type="button" onClick={() => onNavigate('followups')}><BellRing size={17} /> View Follow-Ups</button>
            </div>
          </>
        ) : <EmptySelection detail="Choose a row to inspect and manage that lead." />}
      </aside>
    </section>
  );
}

export function IntelligenceView({
  leads,
  selectedLead,
  selectedId,
  onSelect,
  messages,
  followups,
  integrations,
  deliveries,
  isDetailLoading,
  draftChannel,
  setDraftChannel,
  sendingChannel,
  onSend,
  onRegenerate,
  onCopy,
  onOpenChannel
}) {
  if (!selectedLead) return <section className="panel intelligence-empty"><EmptySelection title="No lead available" detail="Add a lead before opening AI Intelligence." /></section>;

  const draft = draftChannel === 'email' ? messages?.email : messages?.[draftChannel];
  const ready = channelReady(draftChannel, integrations);
  const nextFollowup = followups[0];
  const hasDraft = Boolean(draft);

  return (
    <section className="view-shell intelligence-grid" aria-label="AI intelligence workspace">
      <aside className="panel ai-score-panel">
        <div className="panel-header compact-header">
          <div><p className="section-kicker">Qualification model</p><h2>Lead Score</h2></div>
          <ScoreRing score={selectedLead.score} />
        </div>

        <label className="lead-picker-wrap">
          <span>Analyze lead</span>
          <select className="lead-picker" value={selectedId || ''} onChange={(event) => onSelect(event.target.value)}>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} - {lead.score}</option>)}
          </select>
        </label>

        <div className="intelligence-profile">
          <span className="profile-avatar">{initials(selectedLead.name)}</span>
          <div><h3>{selectedLead.name}</h3><p>{selectedLead.courseInterest} in {selectedLead.city}</p></div>
          <StatusBadge status={selectedLead.status} />
        </div>

        <div className="score-breakdown standalone-score">
          {Object.entries(selectedLead.scoreBreakdown || {}).map(([key, value]) => (
            <div className="score-bar" key={key}>
              <span>{labelize(key)}</span><div><i style={{ width: Math.min(100, (value / 25) * 100) + '%' }} /></div><strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="counselor-assignment">
          <span><UserCheck size={17} /></span>
          <div><small>Assigned counselor</small><strong>{selectedLead.counselor?.name || 'Unassigned'}</strong></div>
          <CheckCircle2 size={17} />
        </div>

        {nextFollowup ? (
          <div className="next-touchpoint">
            <span><BellRing size={17} /></span>
            <div><small>Next touchpoint</small><strong>{nextFollowup.label}</strong><p>{nextFollowup.channel} on {formatShortDate(nextFollowup.dueDate)}</p></div>
          </div>
        ) : null}
      </aside>

      <article className="panel outreach-panel">
        <div className="panel-header outreach-header">
          <div><p className="section-kicker">Personalized outreach</p><h2>AI Message Studio</h2></div>
          <div className="studio-header-actions">
            <span className="provider-label"><Sparkles size={13} /> {providerLabel(messages)}</span>
            <button className="icon-button regenerate-button" type="button" onClick={onRegenerate} disabled={isDetailLoading} aria-label="Regenerate outreach draft" title="Regenerate draft">
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        <div className="integration-status" aria-label="Integration status">
          <IntegrationBadge label="OpenRouter" ready={integrations?.openrouter?.configured && integrations?.openrouter?.modelAllowed} detail={integrations?.openrouter?.model} />
          {integrations?.openai?.configured ? <IntegrationBadge label="OpenAI" ready detail={integrations?.openai?.model} /> : null}
          <IntegrationBadge label="Email" ready={integrations?.smtp?.configured} />
          <IntegrationBadge label="SMS" ready={integrations?.sms?.configured} />
          <IntegrationBadge label="WhatsApp" ready={integrations?.whatsapp?.configured} />
        </div>

        <div className="outreach-body">
          <div className="channel-tabs" role="tablist" aria-label="Message channel">
            <ChannelTab channel="whatsapp" label="WhatsApp" icon={<MessageSquareText size={16} />} active={draftChannel === 'whatsapp'} onSelect={setDraftChannel} />
            <ChannelTab channel="email" label="Email" icon={<Mail size={16} />} active={draftChannel === 'email'} onSelect={setDraftChannel} />
            <ChannelTab channel="sms" label="SMS" icon={<Phone size={16} />} active={draftChannel === 'sms'} onSelect={setDraftChannel} />
          </div>

          {messages?.provider === 'local-fallback' ? (
            <div className="draft-fallback-note" role="status">
              OpenRouter was temporarily unavailable. This personalized fallback is ready now; use regenerate to retry AI.
            </div>
          ) : null}

          <div className={'message-preview studio-preview ' + (isDetailLoading && !messages ? 'loading' : '')} role="tabpanel">
            {isDetailLoading && !messages
              ? 'Preparing a personalized draft...'
              : <DraftContent channel={draftChannel} draft={draft} onRegenerate={onRegenerate} isLoading={isDetailLoading} />}
          </div>

          <div className="outreach-actions">
            <p><span className={ready ? 'ready-dot' : 'manual-dot'} />{ready ? 'Live delivery API connected' : 'Manual handoff available without delivery credentials'}</p>
            <div>
              <button className="secondary-button" type="button" disabled={!hasDraft} onClick={() => onCopy(draftChannel)}>
                <Copy size={16} /> Copy
              </button>
              {integrations?.webhook?.configured ? (
                <button className="secondary-button" type="button" disabled={Boolean(sendingChannel)} onClick={() => onSend('webhook')}>
                  <BellRing size={16} /> {sendingChannel === 'webhook' ? 'Sending...' : 'Webhook'}
                </button>
              ) : null}
              <button className="primary-button" type="button" disabled={!hasDraft || Boolean(sendingChannel) || isDetailLoading} onClick={() => ready ? onSend(draftChannel) : onOpenChannel(draftChannel)}>
                <Send size={16} /> {sendingChannel === draftChannel ? 'Sending...' : (ready ? 'Send ' : 'Open ') + channelName(draftChannel)}
              </button>
            </div>
          </div>
        </div>

        <DeliveryLog deliveries={deliveries} />
      </article>
    </section>
  );
}

function ChannelTab({ channel, label, icon, active, onSelect }) {
  return <button type="button" role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={() => onSelect(channel)}>{icon}{label}</button>;
}

function DraftContent({ channel, draft, onRegenerate, isLoading }) {
  if (!draft) {
    return (
      <div className="draft-empty">
        <strong>No draft loaded</strong>
        <span>Generate a personalized message for this lead.</span>
        <button className="secondary-button" type="button" onClick={onRegenerate} disabled={isLoading}><RotateCcw size={15} /> Generate draft</button>
      </div>
    );
  }
  if (channel === 'email') {
    return <div className="email-preview"><p><strong>Subject:</strong> {draft.subject}</p><div>{draft.body}</div></div>;
  }
  return <p>{draft}</p>;
}

function channelReady(channel, integrations) {
  if (channel === 'email') return Boolean(integrations?.smtp?.configured);
  if (channel === 'sms') return Boolean(integrations?.sms?.configured);
  return Boolean(integrations?.whatsapp?.configured);
}

function channelName(channel) {
  return channel === 'sms' ? 'SMS' : channel[0].toUpperCase() + channel.slice(1);
}
