import { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clipboard,
  Cloud,
  Code2,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Mail,
  MessageSquareText,
  Phone,
  Plug,
  Send,
  Webhook
} from 'lucide-react';
import { FilterField, StatusBadge, channelLabel, formatFullDate, initials } from './dashboard-ui.jsx';

const channelOptions = ['All', 'email', 'whatsapp', 'sms', 'webhook'];
const deliveryOptions = ['All', 'sent', 'queued', 'delivered', 'failed', 'not_configured'];

export function MessagesHubView({ leads, deliveries, onOpenLead }) {
  const [channelFilter, setChannelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
  const filtered = deliveries.filter((delivery) => (
    (channelFilter === 'All' || delivery.channel === channelFilter) &&
    (statusFilter === 'All' || delivery.status === statusFilter)
  ));
  const contactedIds = new Set(deliveries.map((delivery) => delivery.leadId));
  const awaiting = leads.filter((lead) => !contactedIds.has(lead.id) && !['Enrolled', 'Rejected'].includes(lead.status)).slice(0, 5);

  return (
    <section className="view-shell messages-hub-view" aria-label="Communications hub">
      <div className="message-hub-summary">
        <MessageHubStat label="All attempts" value={deliveries.length} icon={<Send />} />
        <MessageHubStat label="Successful" value={deliveries.filter((item) => ['sent', 'queued', 'delivered'].includes(item.status)).length} icon={<CheckCircle2 />} tone="good" />
        <MessageHubStat label="Needs setup" value={deliveries.filter((item) => item.status === 'not_configured').length} icon={<Plug />} tone="warn" />
        <MessageHubStat label="Awaiting outreach" value={awaiting.length} icon={<Bot />} tone="blue" />
      </div>

      <div className="messages-hub-grid">
        <article className="panel delivery-hub-panel">
          <div className="panel-header"><div><p className="section-kicker">Communication history</p><h2>Delivery Activity</h2></div><span className="result-count">{filtered.length} attempts</span></div>
          <div className="delivery-hub-filters">
            <FilterField label="Channel" value={channelFilter} options={channelOptions.map((value) => ({ value, label: value === 'All' ? 'All channels' : channelLabel(value) }))} onChange={setChannelFilter} />
            <FilterField label="Result" value={statusFilter} options={deliveryOptions.map((value) => ({ value, label: value === 'All' ? 'All results' : value.replace(/_/g, ' ') }))} onChange={setStatusFilter} />
          </div>
          <div className="delivery-hub-list">
            {filtered.map((delivery) => {
              const lead = leadMap.get(delivery.leadId);
              return (
                <button type="button" key={delivery.id} onClick={() => lead && onOpenLead(lead.id, 'intelligence')}>
                  <span className={'delivery-channel-icon ' + delivery.channel}>{channelIcon(delivery.channel)}</span>
                  <span className="delivery-hub-person"><i>{initials(lead?.name || 'Lead')}</i><span><strong>{lead?.name || 'Unknown lead'}</strong><small>{lead?.email || delivery.recipient || 'No recipient'}</small></span></span>
                  <span className="delivery-preview"><strong>{channelLabel(delivery.channel)}</strong><small>{delivery.messagePreview || delivery.detail || 'Delivery attempt recorded'}</small></span>
                  <span className={'delivery-result ' + delivery.status}>{delivery.status.replace(/_/g, ' ')}</span>
                  <span className="delivery-time">{formatFullDate(delivery.createdAt)}</span>
                  <ArrowRight size={15} />
                </button>
              );
            })}
            {!filtered.length ? <div className="delivery-hub-empty"><MessageSquareText size={25} /><strong>No matching delivery activity</strong><span>Generate a message or change the filters.</span></div> : null}
          </div>
        </article>

        <aside className="panel outreach-waiting-panel">
          <div className="panel-header"><div><p className="section-kicker">Uncontacted profiles</p><h2>Draft Queue</h2></div><Bot size={18} /></div>
          <div className="outreach-waiting-list">
            {awaiting.map((lead) => (
              <button type="button" key={lead.id} onClick={() => onOpenLead(lead.id, 'intelligence')}>
                <i>{initials(lead.name)}</i>
                <span><strong>{lead.name}</strong><small>{lead.courseInterest} · score {lead.score}</small></span>
                <StatusBadge status={lead.status} />
                <ArrowRight size={15} />
              </button>
            ))}
            {!awaiting.length ? <div className="outreach-waiting-empty"><Check size={22} /><strong>Every active lead has activity</strong></div> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function IntegrationsView({ integrations, onCopy, onOpenApply }) {
  const origin = window.location.origin;
  const applicationUrl = origin + '/#apply';
  const webhookUrl = origin + '/api/webhooks/leads/google-forms';

  return (
    <section className="view-shell integrations-view" aria-label="Integration workspace">
      <div className="integration-grid">
        <IntegrationCard icon={<Bot />} label="OpenRouter AI" ready={integrations?.openrouter?.configured && integrations?.openrouter?.modelAllowed} detail={integrations?.openrouter?.model || 'Free-model routing'} />
        <IntegrationCard icon={<Database />} label="Supabase" ready={integrations?.supabase?.configured} detail={integrations?.supabase?.configured ? 'Cloud lead storage' : 'SQLite fallback active'} />
        <IntegrationCard icon={<Mail />} label="Email delivery" ready={integrations?.smtp?.configured} detail={integrations?.smtp?.configured ? 'SMTP connected' : 'Manual email handoff'} />
        <IntegrationCard icon={<MessageSquareText />} label="WhatsApp" ready={integrations?.whatsapp?.configured} detail={integrations?.whatsapp?.configured ? 'Twilio connected' : 'Prefilled WhatsApp handoff'} />
        <IntegrationCard icon={<Phone />} label="SMS" ready={integrations?.sms?.configured} detail={integrations?.sms?.configured ? 'Twilio connected' : 'Device SMS handoff'} />
        <IntegrationCard icon={<Webhook />} label="Automation webhook" ready={integrations?.webhook?.configured} detail={integrations?.webhook?.configured ? 'Outbound automation connected' : 'Optional n8n / Zapier target'} />
      </div>

      <div className="integration-workspace-grid">
        <article className="panel intake-connection-panel">
          <div className="panel-header"><div><p className="section-kicker">Public intake</p><h2>Website Application Form</h2></div><ExternalLink size={18} /></div>
          <div className="connection-body">
            <p>Share this URL with students or place it behind an Apply button. Successful submissions enter the same scored Pipeline view.</p>
            <EndpointBox label="Application URL" value={applicationUrl} onCopy={onCopy} />
            <button className="primary-button" type="button" onClick={onOpenApply}>Open public form <ExternalLink size={16} /></button>
          </div>
        </article>

        <article className="panel sheets-connection-panel">
          <div className="panel-header"><div><p className="section-kicker">External lead capture</p><h2>Google Forms & Sheets</h2></div><FileSpreadsheet size={19} /></div>
          <div className="connection-body">
            <p>Use Apps Script, n8n, Zapier, or Make to POST each form response to this ingestion endpoint.</p>
            <EndpointBox label="Lead webhook" value={webhookUrl} onCopy={onCopy} />
            <div className="field-contract">
              <small>Accepted fields</small>
              <code>name, email, phone, city, qualification, courseInterest, age</code>
            </div>
          </div>
        </article>
      </div>

      <article className="panel integration-flow-panel">
        <div className="panel-header"><div><p className="section-kicker">Data flow</p><h2>One Connected Admissions Pipeline</h2></div><Cloud size={19} /></div>
        <div className="integration-flow">
          <FlowStep icon={<Clipboard />} label="Capture" detail="Website form, Google Forms, ads, or staff entry" />
          <ArrowRight size={17} />
          <FlowStep icon={<Code2 />} label="Qualify" detail="Score, category, and counselor assignment" />
          <ArrowRight size={17} />
          <FlowStep icon={<Bot />} label="Personalize" detail="AI outreach and recommended next action" />
          <ArrowRight size={17} />
          <FlowStep icon={<Send />} label="Convert" detail="Follow-ups, status tracking, and enrollment" />
        </div>
      </article>
    </section>
  );
}

function MessageHubStat({ label, value, icon, tone = '' }) {
  return <div className={'message-hub-stat ' + tone}><span>{icon}</span><div><p>{label}</p><strong>{value}</strong></div></div>;
}

function IntegrationCard({ icon, label, ready, detail }) {
  return <div className={'integration-card ' + (ready ? 'connected' : 'available')}><span>{icon}</span><div><p>{label}</p><strong>{ready ? 'Connected' : 'Available'}</strong><small>{detail}</small></div><i /></div>;
}

function EndpointBox({ label, value, onCopy }) {
  return <div className="endpoint-box"><span><small>{label}</small><code>{value}</code></span><button type="button" onClick={() => onCopy(value, label)} title={'Copy ' + label} aria-label={'Copy ' + label}><Clipboard size={16} /></button></div>;
}

function FlowStep({ icon, label, detail }) {
  return <div className="integration-flow-step"><span>{icon}</span><div><strong>{label}</strong><small>{detail}</small></div></div>;
}

function channelIcon(channel) {
  if (channel === 'email') return <Mail size={16} />;
  if (channel === 'sms') return <Phone size={16} />;
  if (channel === 'webhook') return <Webhook size={16} />;
  return <MessageSquareText size={16} />;
}
