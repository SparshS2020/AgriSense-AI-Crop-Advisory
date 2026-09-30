import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, BookOpen, Check, ChevronDown, CircleAlert,
  CloudRain, CloudSun, Droplets, FileText, Leaf, LogOut, MapPin, Menu, MoreHorizontal,
  Pencil, Plus, RefreshCw, Search, Settings as SettingsIcon, ShieldCheck, Sprout, Sun,
  Trash2, TrendingUp, X, Wind, Zap,
} from 'lucide-react';
import {
  getGetAdvisoryQueryKey, getGetDashboardQueryKey, getGetFarmQueryKey, getGetSessionQueryKey,
  getListAdvisoriesQueryKey, getListFarmsQueryKey, useCreateAdvisory, useCreateFarm,
  useDeleteFarm, useGetAdvisory, useGetDashboard, useGetFarm, useGetSession, useListAdvisories,
  useListFarms, useLogin, useLogout, useRegenerateAdvisory, useRegister, useUpdateFarm,
} from '@workspace/api-client-react';
import type { Advisory, AdvisoryInput, Farm, FarmInput } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();

const cn = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');
const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
const initials = (name?: string | null) => (name || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className={cn('brand-mark', compact && 'brand-mark-compact')} data-testid="link-logo">
    <span className="brand-glyph"><Sprout size={compact ? 15 : 18} strokeWidth={2.2} /></span>
    {!compact && <span>Agri<span>Sense</span></span>}
  </Link>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

function LoadingPage() {
  return <div className="loading-page"><Skeleton className="skeleton-kicker" /><Skeleton className="skeleton-title" /><div className="skeleton-grid"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div></div>;
}

function EmptyState({ icon: Icon = FileText, title, detail, action }: { icon?: typeof FileText; title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state" data-testid="state-empty"><span className="empty-icon"><Icon size={22} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

function ErrorState({ retry, detail = 'We could not load this view right now.' }: { retry?: () => void; detail?: string }) {
  return <div className="error-state" data-testid="state-error"><CircleAlert size={22} /><div><strong>Something went off course</strong><p>{detail}</p></div>{retry && <button className="button button-quiet" onClick={retry} data-testid="button-retry">Try again</button>}</div>;
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'positive' | 'caution' | 'critical' }) {
  return <span className={cn('badge', `badge-${tone}`)}>{children}</span>;
}

function Sidebar({ user }: { user: { name: string; email: string } }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = useLogout();
  const queryClientInstance = useQueryClient();
  const navItems = [
    { href: '/', label: 'Today', icon: BarChart3 },
    { href: '/farms', label: 'My farms', icon: MapPin },
    { href: '/advisories', label: 'Advisories', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];
  const signOut = () => logout.mutate(undefined, { onSuccess: () => { queryClientInstance.clear(); setLocation('/login'); } });
  return <>
    <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation" data-testid="button-menu"><Menu size={20} /></button>
    <aside className={cn('sidebar', mobileOpen && 'sidebar-open')}>
      <div className="sidebar-top"><Logo /><button className="mobile-close" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={18} /></button></div>
      <div className="farm-switcher"><span className="switcher-label">ACTIVE FARM</span><div className="switcher-value"><span className="farm-dot" /><span>Willow Creek</span><ChevronDown size={15} /></div><span className="switcher-place">Central Valley, CA</span></div>
      <nav className="nav-list" aria-label="Primary navigation">
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn('nav-item', location === href && 'nav-item-active')} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}><Icon size={18} /><span>{label}</span>{label === 'Advisories' && <span className="nav-count">12</span>}</Link>)}
      </nav>
      <div className="sidebar-signal"><div className="signal-orbit"><CloudSun size={20} /></div><div><strong>Field conditions</strong><span>Looks favorable today</span></div></div>
      <div className="sidebar-bottom"><div className="user-row"><span className="avatar">{initials(user.name)}</span><div className="user-meta"><strong data-testid="text-user-name">{user.name}</strong><span>{user.email}</span></div><button className="icon-button" onClick={signOut} title="Sign out" data-testid="button-logout"><LogOut size={16} /></button></div></div>
    </aside>
  </>;
}

function Shell({ children, user }: { children: ReactNode; user: { name: string; email: string } }) {
  return <div className="app-shell"><Sidebar user={user} /><main className="main-content">{children}</main></div>;
}

function Topbar({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <header className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action}</header>;
}

function DashboardPage() {
  const dashboard = useGetDashboard();
  if (dashboard.isLoading) return <LoadingPage />;
  if (dashboard.isError || !dashboard.data) return <ErrorState retry={() => dashboard.refetch()} />;
  const data = dashboard.data;
  const climateTone = data.climateSignal.tone === 'positive' ? 'positive' : data.climateSignal.tone === 'caution' ? 'caution' : 'neutral';
  return <div className="page-wrap">
    <Topbar eyebrow="Monday, October 21 · Field notebook" title="Good morning, Elena." detail="Here is what is worth noticing across your operation today." action={<Link href="/advisories/new" className="button button-primary" data-testid="link-new-advisory"><Plus size={17} /> New advisory <span className="button-shortcut">N</span></Link>} />
    <section className="hero-ribbon">
      <div className="hero-copy"><div className="hero-kicker"><span className="pulse-dot" /> FIELD NOTE · 08:40 AM</div><h2>One clear next step<br /><em>for Willow Creek.</em></h2><p>Conditions are settling after the weekend rain. Your latest advisory is ready when you are.</p><Link href="/advisories" className="text-link" data-testid="link-read-latest">Read latest advisory <ArrowRight size={15} /></Link></div>
      <div className="hero-weather"><div className="sun-disc"><Sun size={26} /></div><div className="weather-temp">74°<small>F</small></div><div className="weather-note">Mostly clear<br /><span>Wind 8 mph NW</span></div><div className="weather-lines"><span /><span /><span /><span /><span /></div></div>
    </section>
    <section className="metric-grid">
      <div className="metric-card"><div className="metric-label">Farms watched <MapPin size={15} /></div><strong data-testid="value-farm-count">{data.farmCount}</strong><span>Across your operation</span></div>
      <div className="metric-card"><div className="metric-label">Advisories <BookOpen size={15} /></div><strong data-testid="value-advisory-count">{data.advisoryCount}</strong><span>Generated this season</span></div>
      <div className="metric-card metric-highlight"><div className="metric-label">Average confidence <TrendingUp size={15} /></div><strong data-testid="value-confidence">{Math.round(data.averageConfidence)}<small>%</small></strong><span className="metric-up">↑ 4.8% from last month</span></div>
      <div className="metric-card"><div className="metric-label">Last rainfall <Droplets size={15} /></div><strong>18<span className="metric-unit">mm</span></strong><span>Measured 2 days ago</span></div>
    </section>
    <section className="dashboard-columns">
      <div className="panel activity-panel"><div className="panel-head"><div><div className="eyebrow">Recent field notes</div><h3>Advisory activity</h3></div><Link href="/advisories" className="text-link muted-link" data-testid="link-view-all-advisories">View all <ArrowRight size={14} /></Link></div>
        {data.recentAdvisories.length === 0 ? <EmptyState icon={BookOpen} title="Your notebook is quiet" detail="Create an advisory to start a record of decisions for this season." action={<Link href="/advisories/new" className="button button-secondary" data-testid="link-empty-create">Create first advisory</Link>} /> : <div className="activity-list">{data.recentAdvisories.slice(0, 4).map((advisory, index) => <AdvisoryRow key={advisory.id} advisory={advisory} index={index} />)}</div>}
      </div>
      <div className="right-rail">
        <div className="panel climate-card"><div className="panel-head"><div><div className="eyebrow">Climate signal</div><h3>What the field says</h3></div><span className="signal-mark"><Wind size={17} /></span></div><Badge tone={climateTone}>{data.climateSignal.label}</Badge><p>{data.climateSignal.detail}</p><div className="climate-rule"><span style={{ width: climateTone === 'positive' ? '72%' : climateTone === 'caution' ? '46%' : '58%' }} /></div><div className="climate-foot"><span>Next 7 days</span><span>Updated this morning</span></div></div>
        <div className="panel active-farm-card"><div className="panel-head"><div><div className="eyebrow">Active farm</div><h3>{data.activeFarm?.name || 'No farm selected'}</h3></div><span className="leaf-stamp"><Leaf size={18} /></span></div>{data.activeFarm ? <><p className="farm-place"><MapPin size={14} /> {data.activeFarm.location}</p><div className="crop-strip"><span>PRIMARY CROP</span><strong>{data.activeFarm.crop}</strong><div className="crop-glyph"><Sprout size={18} /></div></div><Link href="/farms" className="text-link muted-link" data-testid="link-manage-farm">Manage farm profile <ArrowRight size={14} /></Link></> : <EmptyState icon={MapPin} title="Add your first farm" detail="A farm profile gives every recommendation useful context." action={<Link href="/farms" className="button button-secondary" data-testid="link-add-farm">Add farm</Link>} />}</div>
      </div>
    </section>
    <div className="quiet-note"><ShieldCheck size={16} /><span>AgriSense combines your farm profile with local conditions. It is a decision aid, not a replacement for on-site judgment.</span></div>
  </div>;
}

function AdvisoryRow({ advisory, index = 0 }: { advisory: Advisory; index?: number }) {
  const statusTone = advisory.status === 'ready' ? 'positive' : advisory.status === 'needs-review' ? 'caution' : 'neutral';
  return <Link href={`/advisories/${advisory.id}`} className="activity-row" data-testid={`row-advisory-${advisory.id}`}><span className={cn('activity-index', index === 0 && 'activity-index-current')}>{String(index + 1).padStart(2, '0')}</span><div className="activity-main"><strong>{advisory.crop} · {advisory.farmName}</strong><span>{advisory.summary}</span></div><div className="activity-side"><Badge tone={statusTone}>{advisory.status.replace('-', ' ')}</Badge><time>{formatDate(advisory.createdAt)}</time></div><ArrowRight className="row-arrow" size={16} /></Link>;
}

function FarmForm({ initial, onCancel, onSaved }: { initial?: Farm; onCancel: () => void; onSaved: () => void }) {
  const create = useCreateFarm();
  const update = useUpdateFarm();
  const queryClientInstance = useQueryClient();
  const [form, setForm] = useState<FarmInput>({ name: initial?.name || '', location: initial?.location || '', areaHectares: initial?.areaHectares || 0, primaryCrop: initial?.primaryCrop || '', soilType: initial?.soilType || '', irrigation: initial?.irrigation || '' });
  const set = (key: keyof FarmInput, value: string) => setForm((current) => ({ ...current, [key]: key === 'areaHectares' ? Number(value) : value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const onSuccess = () => { queryClientInstance.invalidateQueries({ queryKey: getListFarmsQueryKey() }); queryClientInstance.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); onSaved(); };
    if (initial) update.mutate({ id: initial.id, data: form }, { onSuccess });
    else create.mutate({ data: form }, { onSuccess });
  };
  const pending = create.isPending || update.isPending;
  return <form className="farm-form" onSubmit={submit}><div className="form-grid"><Field label="Farm name" value={form.name} onChange={(v) => set('name', v)} placeholder="e.g. Willow Creek" required testId="input-farm-name" /><Field label="Location" value={form.location} onChange={(v) => set('location', v)} placeholder="Town, region" required testId="input-farm-location" /><Field label="Area" type="number" value={String(form.areaHectares || '')} onChange={(v) => set('areaHectares', v)} placeholder="0.0" suffix="ha" required testId="input-farm-area" /><Field label="Primary crop" value={form.primaryCrop} onChange={(v) => set('primaryCrop', v)} placeholder="e.g. Tomatoes" required testId="input-farm-crop" /><Field label="Soil type" value={form.soilType} onChange={(v) => set('soilType', v)} placeholder="e.g. Loam" required testId="input-farm-soil" /><Field label="Irrigation" value={form.irrigation} onChange={(v) => set('irrigation', v)} placeholder="e.g. Drip irrigation" required testId="input-farm-irrigation" /></div>{(create.isError || update.isError) && <p className="form-error">We could not save this farm. Check the details and try again.</p>}<div className="form-actions"><button type="button" className="button button-quiet" onClick={onCancel} data-testid="button-cancel-farm">Cancel</button><button type="submit" className="button button-primary" disabled={pending} data-testid="button-save-farm">{pending ? 'Saving…' : initial ? 'Save changes' : 'Add farm'}</button></div></form>;
}

function Field({ label, value, onChange, placeholder, type = 'text', suffix, required, testId }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; suffix?: string; required?: boolean; testId: string }) {
  return <label className="field"><span>{label}</span><div className="input-wrap"><input data-testid={testId} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} min={type === 'number' ? 0.1 : undefined} step={type === 'number' ? 0.1 : undefined} />{suffix && <small>{suffix}</small>}</div></label>;
}

function FarmsPage() {
  const farms = useListFarms();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const farmDetail = useGetFarm(selectedId || '', { query: { enabled: !!selectedId, queryKey: getGetFarmQueryKey(selectedId || '') } });
  const del = useDeleteFarm();
  const queryClientInstance = useQueryClient();
  if (farms.isLoading) return <LoadingPage />;
  if (farms.isError) return <ErrorState retry={() => farms.refetch()} />;
  const list = farms.data || [];
  const editingFarm = list.find((farm) => farm.id === editingId);
  const deleteFarm = (farm: Farm) => { if (window.confirm(`Remove ${farm.name} from your farm list?`)) del.mutate({ id: farm.id }, { onSuccess: () => { queryClientInstance.invalidateQueries({ queryKey: getListFarmsQueryKey() }); queryClientInstance.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); } }); };
  return <div className="page-wrap"><Topbar eyebrow="Your operation" title="My farms" detail="Keep the context behind every recommendation in one place." action={!adding && !editingId ? <button className="button button-primary" onClick={() => setAdding(true)} data-testid="button-add-farm"><Plus size={17} /> Add farm</button> : undefined} />
    {(adding || editingId) && <div className="panel form-panel"><div className="panel-head"><div><div className="eyebrow">{editingId ? 'Edit profile' : 'New profile'}</div><h3>{editingId ? 'Tune this farm profile' : 'Add a farm to your notebook'}</h3></div><button className="icon-button" onClick={() => { setAdding(false); setEditingId(null); }} data-testid="button-close-farm-form"><X size={17} /></button></div><FarmForm initial={editingFarm} onCancel={() => { setAdding(false); setEditingId(null); }} onSaved={() => { setAdding(false); setEditingId(null); }} /></div>}
    {list.length === 0 && !adding ? <EmptyState icon={MapPin} title="No farm profiles yet" detail="Start with the place you know best. Your first profile only takes a minute." action={<button className="button button-primary" onClick={() => setAdding(true)} data-testid="button-empty-add-farm"><Plus size={16} /> Add your first farm</button>} /> : <div className="farm-grid">{list.map((farm) => <div className={cn('farm-card', selectedId === farm.id && 'farm-card-selected')} key={farm.id} data-testid={`card-farm-${farm.id}`}><div className="farm-card-top"><div className="farm-emblem"><Sprout size={20} /></div><button className="icon-button" onClick={() => setSelectedId(selectedId === farm.id ? null : farm.id)} data-testid={`button-farm-menu-${farm.id}`}><MoreHorizontal size={18} /></button></div><h3>{farm.name}</h3><p className="farm-place"><MapPin size={14} /> {farm.location}</p><div className="farm-meta"><span><strong>{farm.primaryCrop}</strong><small>Primary crop</small></span><span><strong>{farm.areaHectares} ha</strong><small>Area</small></span></div>{selectedId === farm.id && <div className="farm-detail"><div className="detail-line"><span>Soil</span><strong>{farmDetail.data?.soilType || farm.soilType}</strong></div><div className="detail-line"><span>Irrigation</span><strong>{farmDetail.data?.irrigation || farm.irrigation}</strong></div><div className="detail-actions"><button className="button button-quiet" onClick={() => { setEditingId(farm.id); setSelectedId(null); }} data-testid={`button-edit-farm-${farm.id}`}><Pencil size={14} /> Edit</button><button className="button button-danger-quiet" onClick={() => deleteFarm(farm)} disabled={del.isPending} data-testid={`button-delete-farm-${farm.id}`}><Trash2 size={14} /> Remove</button></div></div>}<div className="farm-card-foot"><span>Added {formatDate(farm.createdAt)}</span><span className="farm-status"><span /> Active</span></div></div>)}</div>}
  </div>;
}

function NewAdvisoryPage() {
  const farms = useListFarms();
  const create = useCreateAdvisory();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AdvisoryInput>({ farmId: '', cropStage: 'Vegetative growth', soilMoisture: 48, recentRainfallMm: 18, temperatureC: 23, pestPressure: 'Low', budget: 'Balanced', riskTolerance: 'Moderate', notes: '' });
  const update = (key: keyof AdvisoryInput, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const submit = () => create.mutate({ data: form }, { onSuccess: (advisory) => { queryClient.invalidateQueries({ queryKey: getListAdvisoriesQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setLocation(`/advisories/${advisory.id}`); } });
  if (farms.isLoading) return <LoadingPage />;
  if (farms.isError) return <ErrorState retry={() => farms.refetch()} />;
  const farmList = farms.data || [];
  if (farmList.length === 0) return <div className="page-wrap"><Topbar eyebrow="New field note" title="Start with a farm profile" detail="AgriSense needs a little place-based context before it can make a useful recommendation." /><EmptyState icon={MapPin} title="No farms to advise on" detail="Add a farm profile first, then come back here with your growing conditions." action={<Link href="/farms" className="button button-primary" data-testid="link-new-advisory-add-farm">Go to my farms <ArrowRight size={16} /></Link>} /></div>;
  return <div className="page-wrap narrow-page"><Topbar eyebrow="New field note" title="What is happening in the field?" detail="Give AgriSense the conditions you can see today. We will do the connecting." action={<Link href="/advisories" className="button button-quiet" data-testid="link-cancel-advisory"><ArrowLeft size={16} /> Cancel</Link>} />
    <div className="stepper"><div className={cn('step', step >= 1 && 'step-current')}><span>01</span><strong>Context</strong></div><div className="step-line" /><div className={cn('step', step >= 2 && 'step-current')}><span>02</span><strong>Conditions</strong></div><div className="step-line" /><div className={cn('step', step >= 3 && 'step-current')}><span>03</span><strong>Decision lens</strong></div></div>
    <div className="panel advisory-form-panel">
      {step === 1 && <div className="form-step"><div className="step-intro"><span className="step-icon"><MapPin size={19} /></span><div><h2>Set the scene</h2><p>Which farm and crop stage are you making this decision for?</p></div></div><div className="form-grid"><label className="field"><span>Farm profile</span><select value={form.farmId} onChange={(e) => update('farmId', e.target.value)} data-testid="select-advisory-farm"><option value="">Choose a farm…</option>{farmList.map((farm) => <option value={farm.id} key={farm.id}>{farm.name} · {farm.primaryCrop}</option>)}</select></label><label className="field"><span>Crop stage</span><select value={form.cropStage} onChange={(e) => update('cropStage', e.target.value)} data-testid="select-crop-stage"><option>Establishment</option><option>Vegetative growth</option><option>Flowering</option><option>Fruit development</option><option>Harvest window</option></select></label></div><StepButtons onBack={() => setLocation('/advisories')} onNext={() => setStep(2)} nextDisabled={!form.farmId} /></div>}
      {step === 2 && <div className="form-step"><div className="step-intro"><span className="step-icon"><CloudRain size={19} /></span><div><h2>Read the conditions</h2><p>Approximate observations are fine. The pattern matters more than precision.</p></div></div><div className="range-fields"><RangeField label="Soil moisture" value={form.soilMoisture} min={0} max={100} unit="%" onChange={(v) => update('soilMoisture', v)} testId="input-soil-moisture" /><RangeField label="Rainfall in last 7 days" value={form.recentRainfallMm} min={0} max={200} unit="mm" onChange={(v) => update('recentRainfallMm', v)} testId="input-rainfall" /><RangeField label="Average temperature" value={form.temperatureC} min={-5} max={45} unit="°C" onChange={(v) => update('temperatureC', v)} testId="input-temperature" /></div><label className="field"><span>Pest pressure</span><div className="choice-row">{['Low', 'Present', 'High'].map((value) => <button type="button" key={value} className={cn('choice', form.pestPressure === value && 'choice-active')} onClick={() => update('pestPressure', value)} data-testid={`button-pest-${value.toLowerCase()}`}>{value}</button>)}</div></label><StepButtons onBack={() => setStep(1)} onNext={() => setStep(3)} /></div>}
      {step === 3 && <div className="form-step"><div className="step-intro"><span className="step-icon"><Zap size={19} /></span><div><h2>Name your decision lens</h2><p>Tell us what trade-off matters most in this recommendation.</p></div></div><label className="field"><span>Working budget</span><div className="choice-row">{['Lean', 'Balanced', 'Flexible'].map((value) => <button type="button" key={value} className={cn('choice', form.budget === value && 'choice-active')} onClick={() => update('budget', value)} data-testid={`button-budget-${value.toLowerCase()}`}>{value}</button>)}</div></label><label className="field"><span>Risk tolerance</span><div className="choice-row">{['Conservative', 'Moderate', 'Experimental'].map((value) => <button type="button" key={value} className={cn('choice', form.riskTolerance === value && 'choice-active')} onClick={() => update('riskTolerance', value)} data-testid={`button-risk-${value.toLowerCase()}`}>{value}</button>)}</div></label><label className="field"><span>Anything else worth knowing? <small>Optional</small></span><textarea value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} placeholder="A patch that looks different, a recent treatment, a hunch…" rows={4} data-testid="input-advisory-notes" /></label>{create.isError && <p className="form-error">The advisory could not be generated. Please try again.</p>}<StepButtons onBack={() => setStep(2)} onNext={submit} nextLabel={create.isPending ? 'Reading the field…' : 'Generate advisory'} nextDisabled={create.isPending} /></div>}
    </div><div className="form-footnote"><ShieldCheck size={15} /> Your notes stay attached to this advisory so you can revisit the decision later.</div>
  </div>;
}

function RangeField({ label, value, min, max, unit, onChange, testId }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void; testId: string }) {
  return <label className="range-field"><div><span>{label}</span><strong>{value}<small>{unit}</small></strong></div><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={testId} /></label>;
}

function StepButtons({ onBack, onNext, nextLabel = 'Continue', nextDisabled = false }: { onBack: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return <div className="form-actions step-buttons"><button type="button" className="button button-quiet" onClick={onBack} data-testid="button-step-back"><ArrowLeft size={15} /> Back</button><button type="button" className="button button-primary" onClick={onNext} disabled={nextDisabled} data-testid="button-step-next">{nextLabel} <ArrowRight size={15} /></button></div>;
}

function AdvisoriesPage() {
  const [farmFilter, setFarmFilter] = useState('');
  const advisories = useListAdvisories({ farmId: farmFilter || undefined, limit: 50 });
  const farms = useListFarms();
  const list = advisories.data || [];
  return <div className="page-wrap"><Topbar eyebrow="Field notebook" title="Advisories" detail="A clear record of what you saw, what AgriSense suggested, and what came next." action={<Link href="/advisories/new" className="button button-primary" data-testid="link-advisories-new"><Plus size={17} /> New advisory</Link>} />
    <div className="toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search your notebook" data-testid="input-search-advisories" /><span>⌘ K</span></div><select value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)} data-testid="select-filter-farm"><option value="">All farms</option>{(farms.data || []).map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select><span className="toolbar-count">{list.length} note{list.length === 1 ? '' : 's'}</span></div>
    {advisories.isLoading ? <div className="panel table-skeleton"><Skeleton /><Skeleton /><Skeleton /></div> : advisories.isError ? <ErrorState retry={() => advisories.refetch()} /> : list.length === 0 ? <EmptyState icon={BookOpen} title={farmFilter ? 'No notes for this farm' : 'Your notebook is waiting'} detail={farmFilter ? 'Try another farm or clear the filter.' : 'Your first advisory becomes a useful record of the season.'} action={!farmFilter && <Link href="/advisories/new" className="button button-primary" data-testid="link-advisories-empty">Write first advisory</Link>} /> : <div className="advisory-table panel"><div className="table-head"><span>Field note</span><span>Confidence</span><span>Status</span><span>Date</span><span /></div>{list.map((advisory) => <AdvisoryTableRow advisory={advisory} key={advisory.id} />)}</div>}
  </div>;
}

function AdvisoryTableRow({ advisory }: { advisory: Advisory }) {
  return <Link href={`/advisories/${advisory.id}`} className="table-row" data-testid={`row-advisory-table-${advisory.id}`}><div className="table-title"><span className="report-icon"><FileText size={17} /></span><div><strong>{advisory.crop}</strong><span>{advisory.farmName}</span></div></div><div className="confidence"><span className="confidence-bar"><i style={{ width: `${advisory.confidence}%` }} /></span><strong>{Math.round(advisory.confidence)}%</strong></div><Badge tone={advisory.status === 'ready' ? 'positive' : advisory.status === 'needs-review' ? 'caution' : 'neutral'}>{advisory.status.replace('-', ' ')}</Badge><time>{formatDate(advisory.createdAt)}</time><ArrowRight size={16} className="row-arrow" /></Link>;
}

function AdvisoryDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const advisory = useGetAdvisory(id, { query: { enabled: !!id, queryKey: getGetAdvisoryQueryKey(id) } });
  const regenerate = useRegenerateAdvisory();
  const queryClientInstance = useQueryClient();
  if (advisory.isLoading) return <LoadingPage />;
  if (advisory.isError || !advisory.data) return <div className="page-wrap"><ErrorState retry={() => advisory.refetch()} detail="This advisory may have moved, or the field notebook is temporarily unavailable." /></div>;
  const data = advisory.data;
  const regenerateReport = () => regenerate.mutate({ id }, { onSuccess: (next) => { queryClientInstance.setQueryData(getGetAdvisoryQueryKey(id), next); queryClientInstance.invalidateQueries({ queryKey: getListAdvisoriesQueryKey() }); queryClientInstance.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); } });
  return <div className="page-wrap detail-page"><div className="detail-back"><Link href="/advisories" className="text-link muted-link" data-testid="link-back-advisories"><ArrowLeft size={15} /> Back to advisories</Link><span className="report-id">FIELD NOTE #{data.id.slice(-6).toUpperCase()}</span></div><div className="detail-heading"><div><div className="eyebrow">Advisory · {formatDate(data.createdAt)}</div><h1>{data.crop} at {data.farmName}</h1><p className="detail-location"><MapPin size={15} /> Growing conditions captured for this field</p></div><div className="detail-actions-top"><Badge tone={data.status === 'ready' ? 'positive' : 'caution'}>{data.status.replace('-', ' ')}</Badge><button className="button button-secondary" onClick={regenerateReport} disabled={regenerate.isPending} data-testid="button-regenerate-advisory"><RefreshCw size={16} className={regenerate.isPending ? 'spin' : ''} /> {regenerate.isPending ? 'Refreshing…' : 'Regenerate'}</button></div></div>
    <div className="confidence-banner"><div className="confidence-ring"><strong>{Math.round(data.confidence)}<small>%</small></strong></div><div><div className="eyebrow">Recommendation confidence</div><h3>This is a considered starting point.</h3><p>Confidence reflects the quality and alignment of the conditions you entered.</p></div><div className="confidence-legend"><span><i className="legend-dot legend-green" /> Strong signal</span><span><i className="legend-dot legend-gold" /> Your observations</span></div></div>
    <div className="detail-columns"><div className="detail-main"><section className="panel summary-panel"><div className="panel-head"><div><div className="eyebrow">The read</div><h2>In plain terms</h2></div><span className="quote-mark">“</span></div><p className="summary-copy">{data.summary}</p></section><section><div className="section-heading"><div><div className="eyebrow">The playbook</div><h2>Recommended next steps</h2></div><span className="section-count">{data.recommendations.length} actions</span></div><div className="recommendation-list">{data.recommendations.map((recommendation, index) => <div className="recommendation" key={`${recommendation.title}-${index}`}><span className={cn('recommendation-number', recommendation.priority === 'high' && 'rec-high')}>{String(index + 1).padStart(2, '0')}</span><div className="recommendation-copy"><div><h3>{recommendation.title}</h3><Badge tone={recommendation.priority === 'high' ? 'critical' : recommendation.priority === 'medium' ? 'caution' : 'neutral'}>{recommendation.priority} priority</Badge></div><p>{recommendation.detail}</p><span className="timing"><Zap size={13} /> {recommendation.timing}</span></div></div>)}</div></section></div><aside className="detail-side"><div className="panel note-card weather-note-card"><span className="note-icon"><CloudSun size={18} /></span><div className="eyebrow">Weather read</div><h3>Keep an eye on the turn</h3><p>{data.weatherNote}</p></div><div className="panel note-card risk-note-card"><span className="note-icon"><ShieldCheck size={18} /></span><div className="eyebrow">Risk watch</div><h3>What could change the call</h3><p>{data.riskNote}</p></div><div className="detail-source"><ShieldCheck size={15} /><span>Generated from your farm profile and field observations.</span></div></aside></div>
  </div>;
}

function SettingsPage({ user }: { user: { name: string; email: string } }) {
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user.name);
  return <div className="page-wrap settings-page"><Topbar eyebrow="Your workspace" title="Settings" detail="A few quiet choices that keep AgriSense useful to you." /><div className="settings-layout"><nav className="settings-nav"><a href="#profile" className="settings-nav-active">Profile</a><a href="#preferences">Preferences</a><a href="#about">About AgriSense</a></nav><div className="settings-main"><section className="settings-section" id="profile"><div className="settings-section-heading"><div><div className="eyebrow">Account</div><h2>Your profile</h2><p>This is how your name appears in your field notebook.</p></div><span className="large-avatar">{initials(user.name)}</span></div><label className="field"><span>Display name</span><input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} data-testid="input-settings-name" /></label><label className="field"><span>Email address</span><input value={user.email} disabled data-testid="input-settings-email" /></label><button className="button button-primary" onClick={() => setSaved(true)} data-testid="button-save-settings">{saved ? <><Check size={15} /> Saved</> : 'Save profile'}</button></section><section className="settings-section" id="preferences"><div className="settings-section-heading"><div><div className="eyebrow">Workspace feel</div><h2>Preferences</h2><p>Set the level of detail you want to see first.</p></div></div><PreferenceRow title="Morning field note" detail="Show a short conditions summary on your dashboard" /><PreferenceRow title="Include practical context" detail="Keep budget and risk notes visible in every advisory" /></section><section className="settings-section" id="about"><div className="eyebrow">About AgriSense</div><h2>A calmer second opinion.</h2><p className="about-copy">AgriSense is made for the moments between noticing and deciding. Your farm context stays at the center, so the next step can stay clear.</p><span className="version-tag">AGRI SENSE AI · FIELD NOTEBOOK 1.0</span></section></div></div></div>;
}

function PreferenceRow({ title, detail }: { title: string; detail: string }) {
  const [on, setOn] = useState(true);
  return <div className="preference-row"><div><strong>{title}</strong><span>{detail}</span></div><button className={cn('toggle', on && 'toggle-on')} onClick={() => setOn(!on)} aria-pressed={on} data-testid={`button-toggle-${title.toLowerCase().replaceAll(' ', '-')}`}><span /></button></div>;
}

function AuthLayout({ children, mode }: { children: ReactNode; mode: 'login' | 'register' }) {
  return <div className="auth-page"><div className="auth-visual"><Logo /><div className="auth-quote"><span className="eyebrow">A clearer view of the field</span><h1>Good decisions<br /><em>grow from context.</em></h1><p>AgriSense brings your farm, your observations, and changing conditions into the same conversation.</p><div className="auth-stats"><span><strong>12.4k</strong><small>field decisions supported</small></span><span><strong>4.8 / 5</strong><small>farmer rating</small></span></div></div><div className="auth-visual-foot"><span>Built for the in-between moments.</span><CloudSun size={17} /></div></div><div className="auth-form-side"><div className="auth-form-wrap">{children}<div className="auth-footer">{mode === 'login' ? <>New to AgriSense? <Link href="/register" data-testid="link-register">Create an account <ArrowRight size={14} /></Link></> : <>Already have an account? <Link href="/login" data-testid="link-login">Sign in <ArrowRight size={14} /></Link></>}</div></div></div></div>;
}

function LoginPage() {
  const login = useLogin();
  const queryClientInstance = useQueryClient();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); login.mutate({ data: { email, password } }, { onSuccess: (session) => { queryClientInstance.setQueryData(getGetSessionQueryKey(), session); setLocation('/'); } }); };
  return <AuthLayout mode="login"><div className="auth-kicker"><Logo compact /><span>Welcome back</span></div><h2>Sign in to your<br /><em>field notebook.</em></h2><p className="auth-intro">Your farms and field notes are ready when you are.</p><form className="auth-form" onSubmit={submit}><label className="field"><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required data-testid="input-login-email" /></label><label className="field"><div className="field-label-row"><span>Password</span><span>Need a reset? Contact support.</span></div><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required data-testid="input-login-password" /></label>{login.isError && <p className="form-error">That email and password did not match. Check them and try again.</p>}<button type="submit" className="button button-primary button-wide" disabled={login.isPending} data-testid="button-login">{login.isPending ? 'Opening your notebook…' : 'Sign in'} <ArrowRight size={16} /></button></form><div className="auth-trust"><ShieldCheck size={15} /> Your farm data is private to your account.</div></AuthLayout>;
}

function RegisterPage() {
  const register = useRegister();
  const queryClientInstance = useQueryClient();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const submit = (event: FormEvent) => { event.preventDefault(); register.mutate({ data: form }, { onSuccess: (session) => { queryClientInstance.setQueryData(getGetSessionQueryKey(), session); setLocation('/'); } }); };
  return <AuthLayout mode="register"><div className="auth-kicker"><Logo compact /><span>Make room for clarity</span></div><h2>Create your<br /><em>field notebook.</em></h2><p className="auth-intro">Start with your name and email. Add farm context when you are ready.</p><form className="auth-form" onSubmit={submit}><label className="field"><span>Your name</span><input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="How should we call you?" minLength={2} required data-testid="input-register-name" /></label><label className="field"><span>Email</span><input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required data-testid="input-register-email" /></label><label className="field"><span>Password</span><input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" minLength={8} required data-testid="input-register-password" /></label>{register.isError && <p className="form-error">We could not create that account. The email may already be in use.</p>}<button type="submit" className="button button-primary button-wide" disabled={register.isPending} data-testid="button-register">{register.isPending ? 'Setting up your notebook…' : 'Create account'} <ArrowRight size={16} /></button></form><div className="auth-trust"><ShieldCheck size={15} /> No noisy setup. Just useful context.</div></AuthLayout>;
}

function NotFound() {
  return <div className="not-found"><Logo /><div className="eyebrow">404 · Outside the field lines</div><h1>That page is not in<br /><em>this notebook.</em></h1><p>Let us get you back to a useful view.</p><Link href="/" className="button button-primary" data-testid="link-not-found-home">Back to today <ArrowRight size={16} /></Link></div>;
}

function ProtectedRouter({ user }: { user: { name: string; email: string } }) {
  return <Shell user={user}><Switch><Route path="/" component={DashboardPage} /><Route path="/farms" component={FarmsPage} /><Route path="/advisories/new" component={NewAdvisoryPage} /><Route path="/advisories" component={AdvisoriesPage} /><Route path="/advisories/:id" component={AdvisoryDetailPage} /><Route path="/settings" component={() => <SettingsPage user={user} />} /><Route component={NotFound} /></Switch></Shell>;
}

function Router() {
  const [location, setLocation] = useLocation();
  const session = useGetSession();
  const publicRoute = location === '/login' || location === '/register';
  useEffect(() => { if (!session.isLoading && !session.isError && !session.data?.authenticated && !publicRoute) setLocation('/login'); }, [session.isLoading, session.isError, session.data, publicRoute, setLocation]);
  if (publicRoute) return <Switch><Route path="/login" component={LoginPage} /><Route path="/register" component={RegisterPage} /></Switch>;
  if (session.isLoading) return <LoadingPage />;
  if (session.isError) return <ErrorState retry={() => session.refetch()} detail="We could not confirm your session. Your field notes are safe; please try again." />;
  if (!session.data?.authenticated || !session.data.user) return null;
  return <ProtectedRouter user={session.data.user} />;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;