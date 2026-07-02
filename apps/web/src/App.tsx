import React, { useState, useEffect } from 'react';
import { 
  MapPin, ShieldAlert, Award, FileText, Activity, User, 
  Heart, ChevronRight, Share2, Plus, Sparkles, MessageSquare, 
  Check, X, Camera, AlertTriangle, Play, HelpCircle, Download, CheckSquare, RefreshCw,
  Compass, Search, Bell, Layers, Briefcase, Droplet, Lock, Eye, Mic, Info, ArrowLeft, Shield, CheckCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:3000/api/v1';

export default function App() {
  // Navigation & States
  const [activeTab, setActiveTab] = useState<'map' | 'problems' | 'manifesto' | 'tracker' | 'me'>('map');
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [userRole, setUserRole] = useState<'citizen' | 'volunteer' | 'party_lead' | 'department_officer'>('citizen');
  const [userLang, setUserLang] = useState('en');
  
  // App Data
  const [issues, setIssues] = useState<any[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);
  const [manifesto, setManifesto] = useState<any>(null);
  const [partyPromises, setPartyPromises] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // Issue Creation Wizard State
  const [showPinWizard, setShowPinWizard] = useState(false);
  const [newIssue, setNewIssue] = useState({
    category: 'water',
    description: '',
    severity: 'medium',
    privacy: 'public',
    latitude: 19.0760,
    longitude: 72.8777,
    idempotency_key: ''
  });

  // Verification Form State
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyOutcome, setVerifyOutcome] = useState<'verified' | 'rejected'>('verified');
  const [verifyNotes, setVerifyNotes] = useState('');

  // Mockup Gallery Overlay State
  const [showMocksGallery, setShowMocksGallery] = useState(false);
  const [activeMockIndex, setActiveMockIndex] = useState(0);

  const mockImages = [
    { name: 'Mock 1.png', label: 'Mock 1: Issue Detail Screen (Waterlogging)', desc: 'Shows verified issue cluster #PRB-7F4A92 details, priority score of 86, affected stats, recent evidence, timeline tracking, and citizen actions (Support, Add Evidence, Suggest Fix).' },
    { name: 'Mock 2.png', label: 'Mock 2: Party Studio (Compare & Adopt)', desc: 'Shows Candidate Studio compare view showing Citizen Demand vs Party adapted promise version with differences diff checker.' },
    { name: 'Mock 3.png', label: 'Mock 3: Ward 12 Dashboard (Constituency View)', desc: 'Dashboard with stats cards, map preview with priority hotspots, and top issues trending list.' },
    { name: 'Mock 4.png', label: 'Mock 4: Onboarding Screen (Role selection)', desc: 'Launch onboarding screen showing role selections (Citizen, Volunteer, Candidate, Officer), language, and GPS locator settings.' },
    { name: 'Mock 5.png', label: 'Mock 5: Delivery Tracker (Milestones & Timeline)', desc: 'Progress tracker tracking adopted promises across milestones: demand raised, budget assigned, work started.' },
    { name: 'Mock 6.png', label: 'Mock 6: People\'s Manifesto (Priorities)', desc: 'Interactive People\'s Manifesto with categories like 100-Day, 1-Year, 3-Year, 5-Year priorities, showing department owners.' },
    { name: 'Mock 7.png', label: 'Mock 7: Pin a Problem (Reporting Wizard)', desc: 'Step-by-step wizard showing categories selection (water, roads, health, jobs), severity ratings (1-5), and media uploads.' },
    { name: 'Mock 8.png', label: 'Mock 8: Mumbai Map & Hotspots Dashboard', desc: 'Main geographic overview landing dashboard displaying live reports, cluster locations, and score indices.' }
  ];

  // Delivery Update Form State
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<any>('on_track');
  const [deliveryText, setDeliveryText] = useState('');

  // Fetch API Helper
  const fetchApi = async (path: string, options?: RequestInit) => {
    try {
      const res = await fetch(`${API_BASE}${path}`, options);
      if (res.ok) {
        setConnectionStatus('connected');
        return await res.json();
      }
    } catch (e) {
      setConnectionStatus('disconnected');
    }
    return null;
  };

  // Poll backend data
  const loadData = async () => {
    // 1. Get Issues
    const issuesData = await fetchApi('/issues');
    if (issuesData) setIssues(issuesData);

    // 2. Get Areas
    const areasData = await fetchApi('/areas');
    
    // 3. Get Party Adopted Promises
    const partyData = await fetchApi('/party/promises');
    if (partyData) setPartyPromises(partyData);

    // 4. Get Audit Logs
    const auditData = await fetchApi('/audit');
    if (auditData) setAuditLogs(auditData);

    // 5. Get manifesto if ward-12-id
    const manifestoData = await fetchApi('/manifesto/ward-12-id');
    if (manifestoData) setManifesto(manifestoData);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch issue details
  useEffect(() => {
    if (selectedIssueId) {
      fetchApi(`/issues/${selectedIssueId}`).then(data => {
        if (data) setSelectedIssue(data);
      });
    }
  }, [selectedIssueId]);

  // Actions
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = `id-${Date.now()}`;
    const res = await fetchApi('/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newIssue, idempotency_key: key })
    });
    if (res) {
      setShowPinWizard(false);
      setNewIssue({
        category: 'water',
        description: '',
        severity: 'medium',
        privacy: 'public',
        latitude: 19.0760,
        longitude: 72.8777,
        idempotency_key: ''
      });
      loadData();
    }
  };

  const handleSupportIssue = async (issueId: string) => {
    const res = await fetchApi(`/issues/${issueId}/support`, { method: 'POST' });
    if (res) {
      loadData();
      if (selectedIssueId === issueId) {
        // reload details
        const details = await fetchApi(`/issues/${issueId}`);
        if (details) setSelectedIssue(details);
      }
    }
  };

  const handleVerifyCluster = async (clusterId: string) => {
    const res = await fetchApi('/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cluster_id: clusterId,
        outcome: verifyOutcome,
        notes: verifyNotes,
        checklist: { is_duplicate: false, evidence_matches: true }
      })
    });
    if (res) {
      setShowVerifyForm(false);
      setVerifyNotes('');
      loadData();
    }
  };

  const handleGenerateManifesto = async () => {
    const res = await fetchApi('/manifesto/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaId: 'ward-12-id' })
    });
    if (res) {
      loadData();
    }
  };

  const handleAdoptPromise = async (promiseId: string, title: string, desc: string, metric: string) => {
    const res = await fetchApi('/party/promises/adopt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_promise_id: promiseId,
        adopted_title: title,
        adopted_description: desc,
        target_metric: metric,
        timeline: new Date(Date.now() + 100 * 24 * 3600 * 1000).toISOString()
      })
    });
    if (res) {
      loadData();
    }
  };

  const handleAddDeliveryUpdate = async (partyPromiseId: string) => {
    const res = await fetchApi('/tracker/updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        party_promise_id: partyPromiseId,
        status: deliveryStatus,
        update_text: deliveryText,
      })
    });
    if (res) {
      setShowDeliveryForm(false);
      setDeliveryText('');
      loadData();
    }
  };

  const handleRoleChange = async (role: any) => {
    setUserRole(role);
    await fetchApi('/auth/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'default-citizen-id', role })
    });
    loadData();
  };

  return (
    <div style={{ padding: '24px', boxSizing: 'border-box' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, fontSize: '2rem' }}>
            TGIM V1 Platform Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            High-Fidelity Simulator matching Mockups 1-8 (Mumbai Suburban District, Pincode-First)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: connectionStatus === 'connected' ? '#10b981' : '#ef4444',
            fontWeight: 600
          }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: connectionStatus === 'connected' ? '#10b981' : '#ef4444' 
            }} />
            {connectionStatus === 'connected' ? 'Fastify Server Live' : 'In-Memory Simulation Fallback'}
          </div>
          <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid rgba(15,23,42,0.1)', borderRadius: '8px', fontWeight: 600 }}>
            <RefreshCw size={16} /> Sync Data
          </button>
          <button onClick={() => { setShowMocksGallery(true); setActiveMockIndex(0); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid #ff5200', background: 'rgba(255,82,0,0.05)', color: '#ff5200', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            <Eye size={16} /> Inspect Mocks (8)
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* LEFT COLUMN: Phone Emulator */}
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <Activity size={18} style={{ color: '#ff5200' }} /> TGIM Mobile Client
          </h2>
          
          <div className="phone-emulator">
            {/* Status bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 24px', fontSize: '0.8rem', color: '#0f172a', fontWeight: 700, zIndex: 10, background: '#ffffff', borderBottom: '1px solid rgba(15, 23, 42, 0.02)' }}>
              <span>9:41</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Activity size={12} style={{ transform: 'rotate(90deg)' }} />
                <span>5G</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', border: '1px solid #0f172a', borderRadius: '3px', padding: '1px 2px', fontSize: '0.6rem', fontWeight: 800 }}>
                  100
                </div>
              </div>
            </div>

            {/* Core Simulator Screen */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              
              {!onboardingCompleted ? (
                /* Onboarding Screen (Mock 4) */
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', boxSizing: 'border-box', background: '#ffffff' }}>
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    {/* Header Logo matching Mock 4 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>TG</span>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5200', marginTop: '10px' }} />
                      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>M</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800 }}>
                      THE GREAT INDIAN MANIFESTO
                    </div>
                    
                    {/* Main Slogan */}
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '20px', lineHeight: 1.2 }}>
                      India's problems, mapped by its <span style={{ color: '#ff5200' }}>people</span>
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '8px', lineHeight: 1.4 }}>
                      Pin local issues. Build public manifestos. Track delivery.
                    </p>

                    {/* Vector illustration simulation */}
                    <div style={{ margin: '16px auto', width: '100%', height: '110px', background: '#f8fafc', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                      <svg viewBox="0 0 100 60" style={{ width: '80%', height: '80%', opacity: 0.8 }}>
                        <path d="M20,10 Q50,5 80,10 T50,50 Z" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                        <path d="M10,35 Q50,20 90,35" fill="none" stroke="#ff5200" strokeWidth="1" opacity="0.4" />
                        <circle cx="30" cy="25" r="3" fill="#2563eb" />
                        <circle cx="50" cy="18" r="4" fill="#ff5200" />
                        <circle cx="70" cy="30" r="3" fill="#10b981" />
                        <path d="M50,18 L50,32" stroke="#ff5200" strokeWidth="1" />
                      </svg>
                      <span style={{ position: 'absolute', bottom: '6px', fontSize: '0.65rem', color: '#94a3b8' }}>Mumbai Suburban District Boundary</span>
                    </div>
                  </div>

                  <div>
                    {/* Role Selector Card Grid */}
                    <h3 style={{ fontSize: '0.85rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>I am a...</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '16px' }}>
                      {[
                        { id: 'citizen', name: 'Citizen', icon: User, color: '#ff5200' },
                        { id: 'volunteer', name: 'Volunteer', icon: Heart, color: '#a855f7' },
                        { id: 'party_lead', name: 'Party', icon: Award, color: '#eab308' },
                        { id: 'department_officer', name: 'Officer', icon: Search, color: '#10b981' },
                        { id: 'explorer', name: 'Explorer', icon: Compass, color: '#3b82f6' }
                      ].map(role => {
                        const Icon = role.icon;
                        const isSelected = userRole === role.id || (role.id === 'explorer' && userRole === 'citizen'); // default explorer to citizen
                        return (
                          <div 
                            key={role.id}
                            onClick={() => handleRoleChange(role.id === 'explorer' ? 'citizen' : role.id)}
                            style={{
                              border: `1.5px solid ${isSelected ? role.color : 'rgba(15,23,42,0.08)'}`,
                              background: isSelected ? `${role.color}0a` : '#ffffff',
                              borderRadius: '10px', padding: '8px 4px', cursor: 'pointer', textAlign: 'center',
                              transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center'
                            }}
                          >
                            <Icon size={16} style={{ color: isSelected ? role.color : '#64748b' }} />
                            <div style={{ fontWeight: 700, fontSize: '0.6rem', marginTop: '4px', color: '#0f172a' }}>{role.name}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Language Pills */}
                    <h3 style={{ fontSize: '0.85rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>Choose your language</h3>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {['English', 'हिंदी', 'मराठी', 'தமிழ்', 'বাংলা'].map((lang, i) => (
                        <span 
                          key={lang} 
                          onClick={() => setUserLang(i === 0 ? 'en' : 'hi')} 
                          style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer',
                            background: i === 0 ? '#ff5200' : '#f1f5f9',
                            color: i === 0 ? '#ffffff' : '#475569', fontWeight: 700,
                            border: i === 0 ? '1px solid #ff5200' : '1px solid rgba(15,23,42,0.06)'
                          }}
                        >
                          {lang}
                        </span>
                      ))}
                    </div>

                    {/* Location Choice */}
                    <h3 style={{ fontSize: '0.85rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>Set your location</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}>
                        <Compass size={16} style={{ color: '#ff5200' }} />
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f172a' }}>Use My Location</div>
                          <div style={{ fontSize: '0.55rem', color: '#64748b' }}>GPS boundary detection</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}>
                        <MapPin size={16} style={{ color: '#ff5200' }} />
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f172a' }}>Choose a Place</div>
                          <div style={{ fontSize: '0.55rem', color: '#64748b' }}>Search Ward / Pincode</div>
                        </div>
                      </div>
                    </div>

                    {/* Start Exploring Button */}
                    <button className="primary" style={{ width: '100%', borderRadius: '12px', padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => setOnboardingCompleted(true)}>
                      Start Exploring <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Main App Interface */
                <>
                  {/* Tab Screens */}
                  {activeTab === 'map' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative' }}>
                      
                      {/* Stylized Map View (Mock 8) */}
                      <div style={{ flex: 1, minHeight: '340px', background: '#cbd5e1', position: 'relative', overflow: 'hidden' }}>
                        
                        {/* Simulated Map Rendering with Suburbs */}
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', opacity: 0.9 }}>
                          {/* Land Background */}
                          <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="#e2e8f0" />
                          {/* Coastline */}
                          <path d="M10,-10 C20,20 30,30 35,45 C40,55 35,65 28,75 C22,85 10,95 -10,100 L-10,-10 Z" fill="#93c5fd" />
                          
                          {/* Roads network */}
                          <path d="M30,10 L35,45 L38,60 L28,75 L20,95" fill="none" stroke="#ffffff" strokeWidth="2" />
                          <path d="M30,10 C50,20 60,35 70,50" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                          <path d="M35,45 L70,40" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                          <path d="M38,60 L90,65" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2,2" />

                          {/* Green spaces */}
                          <path d="M50,15 C55,10 65,12 60,20 C58,25 48,22 50,15 Z" fill="#bbf7d0" opacity="0.6" />
                          <path d="M42,50 C48,48 52,53 48,58 C44,60 40,55 42,50 Z" fill="#bbf7d0" opacity="0.6" />

                          {/* Suburb text markers */}
                          <text x="42" y="12" fill="#64748b" fontSize="3" fontWeight="bold">Dadar West</text>
                          <text x="75" y="48" fill="#64748b" fontSize="3" fontWeight="bold">Sion</text>
                          <text x="45" y="55" fill="#64748b" fontSize="3" fontWeight="bold">Matunga</text>
                          <text x="70" y="75" fill="#64748b" fontSize="3" fontWeight="bold">Wadala</text>
                        </svg>

                        {/* Interactive Markers on Map matching Mock 8 */}
                        {/* Thane Marker */}
                        <div style={{ position: 'absolute', top: '15%', left: '60%', transform: 'translate(-50%, -50%)', cursor: 'pointer' }}>
                          <div style={{ background: '#8b5cf6', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800, boxShadow: '0 4px 8px rgba(139, 92, 246, 0.3)' }}>Thane 23</div>
                        </div>

                        {/* Navi Mumbai Marker */}
                        <div style={{ position: 'absolute', top: '38%', left: '72%', transform: 'translate(-50%, -50%)', cursor: 'pointer' }}>
                          <div style={{ background: '#f97316', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800, boxShadow: '0 4px 8px rgba(249, 115, 22, 0.3)' }}>Navi Mumbai 37</div>
                        </div>

                        {/* Pune Marker */}
                        <div style={{ position: 'absolute', top: '75%', left: '78%', transform: 'translate(-50%, -50%)', cursor: 'pointer' }}>
                          <div style={{ background: '#a855f7', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800, boxShadow: '0 4px 8px rgba(168, 85, 247, 0.3)' }}>Pune 42</div>
                        </div>

                        {/* Mumbai Central Red Hotspot */}
                        <div style={{ position: 'absolute', top: '50%', left: '35%', transform: 'translate(-50%, -50%)', cursor: 'pointer' }} onClick={() => { setSelectedIssueId('ae1bcf20-1a42-4912-8824-c10df8a8470a'); setActiveTab('problems'); }}>
                          <div style={{ background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, boxShadow: '0 0 14px #ef4444' }}>
                            <MapPin size={10} color="white" /> Mumbai 128
                          </div>
                        </div>

                        {/* Floating Top Search Bar matching Mock 8 */}
                        <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', background: '#ffffff', padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                          <Search size={16} color="#64748b" />
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', flex: 1 }}>Search state, district, constituency, issue</span>
                          <div style={{ position: 'relative' }}>
                            <Bell size={16} color="#0f172a" style={{ cursor: 'pointer' }} />
                            <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '6px', height: '6px', borderRadius: '50%', background: '#ff5200' }} />
                          </div>
                        </div>

                        {/* Floating Map Controls on right */}
                        <div style={{ position: 'absolute', top: '60px', left: '12px', display: 'flex', gap: '6px' }}>
                          <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                            <Layers size={12} color="#475569" /> Layers
                          </div>
                          <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                            EN <ChevronRight size={10} style={{ transform: 'rotate(90deg)' }} />
                          </div>
                        </div>

                        {/* 2D/3D toggle */}
                        <div style={{ position: 'absolute', top: '60px', right: '12px', background: '#ffffff', borderRadius: '8px', padding: '2px', display: 'flex', border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                          <span style={{ padding: '4px 8px', fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>2D</span>
                          <span style={{ padding: '4px 8px', fontSize: '0.65rem', background: '#ff5200', color: '#ffffff', borderRadius: '6px', fontWeight: 700 }}>Map</span>
                        </div>

                        {/* Floating Orange Add Button */}
                        <button 
                          onClick={() => setShowPinWizard(true)}
                          style={{
                            position: 'absolute', bottom: '16px', right: '16px', 
                            background: 'var(--primary-gradient)', color: '#ffffff', borderRadius: '24px',
                            padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 8px 16px rgba(255, 82, 0, 0.3)', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                          }}
                        >
                          <Plus size={16} /> Pin a Problem
                        </button>
                      </div>

                      {/* Map Bottom Sheet (Mock 8 / Mock 3 Area Card) */}
                      <div style={{ background: '#ffffff', borderTop: '1px solid rgba(15,23,42,0.08)', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>Mumbai South Central</h3>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <MapPin size={10} color="#ff5200" /> Mumbai District, Maharashtra
                            </span>
                          </div>
                          <span className="glow-badge water" style={{ fontSize: '0.65rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} /> Live
                          </span>
                        </div>

                        {/* Stats Cards Row matching Mock 8 */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '16px' }}>
                          <div style={{ background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59,130,246,0.06)', padding: '8px 4px', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 600 }}>Citizen Inputs</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>4.8K</div>
                            <div style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>▲ 22%</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16,185,129,0.06)', padding: '8px 4px', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 600 }}>Verified</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>128</div>
                            <div style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>▲ 18%</div>
                          </div>
                          <div style={{ background: 'rgba(168, 85, 247, 0.03)', border: '1px solid rgba(168,85,247,0.06)', padding: '8px 4px', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 600 }}>Readiness</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>72%</div>
                            <div style={{ fontSize: '0.55rem', color: '#7c3aed', fontWeight: 700, marginTop: '2px' }}>▲ 12%</div>
                          </div>
                          <div style={{ background: 'rgba(249, 115, 22, 0.03)', border: '1px solid rgba(249,115,22,0.06)', padding: '8px 4px', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 600 }}>Priority</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ea580c', marginTop: '2px' }}>8.6<span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>/10</span></div>
                            <div style={{ fontSize: '0.55rem', color: '#ea580c', fontWeight: 700, marginTop: '2px' }}>▲ 15%</div>
                          </div>
                        </div>

                        {/* Top Issues List with sparklines */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                            <span>Top Issues in Mumbai South Central</span>
                            <span style={{ color: '#ff5200', cursor: 'pointer' }} onClick={() => setActiveTab('problems')}>View All &gt;</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {[
                              { cat: 'Drainage', count: '892 reports', trend: '▲ 34%', stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.06)', path: 'M0,15 L12,12 L24,18 L36,10 L48,8 L60,2' },
                              { cat: 'Roads', count: '1.2K reports', trend: '▲ 21%', stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.06)', path: 'M0,18 L12,14 L24,12 L36,15 L48,10 L60,4' },
                              { cat: 'Housing', count: '756 reports', trend: '▲ 18%', stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.06)', path: 'M0,10 L12,15 L24,14 L36,11 L48,8 L60,6' },
                              { cat: 'Jobs', count: '648 reports', trend: '▲ 16%', stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.06)', path: 'M0,16 L12,14 L24,10 L36,12 L48,7 L60,3' }
                            ].map(item => (
                              <div key={item.cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.stroke }} />
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{item.cat}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{item.count}</span>
                                  <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>{item.trend}</span>
                                  <svg className="sparkline-svg" viewBox="0 0 60 20">
                                    <path d={item.path} fill="none" stroke={item.stroke} strokeWidth="1.5" />
                                  </svg>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Dual Actions */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="primary" style={{ flex: 1, fontSize: '0.85rem', padding: '10px', borderRadius: '10px' }} onClick={() => setActiveTab('manifesto')}>
                            Generate Local Manifesto
                          </button>
                          <button style={{ flex: 1, fontSize: '0.85rem', padding: '10px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.1)', background: '#ffffff', color: '#334155', fontWeight: 600 }} onClick={() => { setSelectedIssueId('ae1bcf20-1a42-4912-8824-c10df8a8470a'); setActiveTab('problems'); }}>
                            View Problems
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'problems' && (
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                      {showPinWizard ? (
                        /* Pin Problem Wizard Form (Mock 7) */
                        <form onSubmit={handleCreateIssue} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Wizard Step indicator */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Step 3 of 6</span>
                              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Pin a Problem</h3>
                              <X size={18} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setShowPinWizard(false)} />
                            </div>
                            {/* Step bar */}
                            <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                              {[1, 2, 3, 4, 5, 6].map(step => (
                                <div key={step} style={{ flex: 1, height: '4px', background: step <= 3 ? '#ff5200' : 'rgba(15,23,42,0.06)', borderRadius: '2px' }} />
                              ))}
                            </div>
                          </div>

                          {/* Map preview */}
                          <div style={{ height: '70px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(15,23,42,0.08)' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                              <MapPin size={20} color="#ff5200" />
                            </div>
                            <span style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '0.55rem', background: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>New Delhi, Delhi</span>
                            <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '0.55rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}>Edit Pin</span>
                          </div>

                          {/* 1. Location selection */}
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>1. Location</span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '4px' }}>
                              <button type="button" style={{ padding: '6px 2px', fontSize: '0.6rem', background: '#ffffff', borderColor: '#ff5200', color: '#ff5200', borderRadius: '6px' }}>Current location</button>
                              <button type="button" style={{ padding: '6px 2px', fontSize: '0.6rem', background: '#ffffff', borderColor: 'rgba(0,0,0,0.08)', color: '#475569', borderRadius: '6px' }}>Drop pin manually</button>
                              <button type="button" style={{ padding: '6px 2px', fontSize: '0.6rem', background: '#ffffff', borderColor: 'rgba(0,0,0,0.08)', color: '#475569', borderRadius: '6px' }}>Blur location</button>
                            </div>
                          </div>

                          {/* 2. Category selection */}
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>2. Category</span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '4px' }}>
                              {[
                                { id: 'water', label: 'Water', icon: Droplet, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                                { id: 'roads', label: 'Roads', icon: Activity, color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
                                { id: 'garbage', label: 'Garbage', icon: CheckSquare, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                                { id: 'health', label: 'Health', icon: Heart, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                                { id: 'safety', label: 'Safety', icon: Shield, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                                { id: 'jobs', label: 'Jobs', icon: Briefcase, color: '#14b8a6', bg: 'rgba(20,184,166,0.1)' },
                                { id: 'transport', label: 'Transport', icon: Activity, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
                                { id: 'housing', label: 'Housing', icon: MapPin, color: '#f97316', bg: 'rgba(249,115,22,0.1)' }
                              ].map(cat => {
                                const Icon = cat.icon;
                                const isActive = newIssue.category === cat.id;
                                return (
                                  <div 
                                    key={cat.id} 
                                    onClick={() => setNewIssue({...newIssue, category: cat.id})}
                                    style={{
                                      padding: '6px 2px', border: `1px solid ${isActive ? '#ff5200' : 'rgba(15,23,42,0.06)'}`,
                                      background: isActive ? 'rgba(255,82,0,0.06)' : '#ffffff',
                                      borderRadius: '8px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                    }}
                                  >
                                    <Icon size={14} style={{ color: isActive ? '#ff5200' : cat.color }} />
                                    <span style={{ fontSize: '0.55rem', fontWeight: 700, marginTop: '2px', color: '#334155' }}>{cat.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 3. Describe problem */}
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>3. Describe the problem</span>
                            <div style={{ position: 'relative' }}>
                              <textarea 
                                rows={2} 
                                placeholder="Describe the issue in detail..." 
                                value={newIssue.description}
                                onChange={e => setNewIssue({...newIssue, description: e.target.value})}
                                style={{ paddingRight: '30px' }}
                                required
                              />
                              <Mic size={14} style={{ position: 'absolute', right: '10px', top: '16px', color: '#64748b', cursor: 'pointer' }} />
                            </div>
                          </div>

                          {/* 4. Add Media */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ background: '#ffffff', border: '1px dashed rgba(15,23,42,0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center', cursor: 'pointer' }}>
                              <Camera size={16} style={{ color: '#ff5200', margin: '0 auto 4px' }} />
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0f172a' }}>Photo</div>
                              <div style={{ fontSize: '0.5rem', color: '#64748b' }}>Add up to 5 photos</div>
                            </div>
                            <div style={{ background: '#ffffff', border: '1px dashed rgba(15,23,42,0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center', cursor: 'pointer' }}>
                              <Play size={16} style={{ color: '#ff5200', margin: '0 auto 4px' }} />
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0f172a' }}>Video</div>
                              <div style={{ fontSize: '0.5rem', color: '#64748b' }}>Max 60 seconds</div>
                            </div>
                          </div>

                          {/* 5. Severity selection */}
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>5. How severe is the problem?</span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginTop: '4px' }}>
                              {[
                                { val: 'low', num: 1, label: 'Very Low', color: '#10b981' },
                                { val: 'medium', num: 2, label: 'Low', color: '#84cc16' },
                                { val: 'high', num: 3, label: 'Moderate', color: '#f59e0b' },
                                { val: 'critical', num: 4, label: 'High', color: '#f97316' },
                                { val: 'critical', num: 5, label: 'Very High', color: '#ef4444' }
                              ].map(sev => {
                                const isSelected = newIssue.severity === sev.val || (sev.num === 3 && newIssue.severity === 'medium');
                                return (
                                  <div key={sev.num} onClick={() => setNewIssue({...newIssue, severity: sev.val})} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, cursor: 'pointer' }}>
                                    <div style={{
                                      width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800,
                                      background: isSelected ? sev.color : '#ffffff',
                                      color: isSelected ? '#ffffff' : sev.color,
                                      border: `1.5px solid ${sev.color}`
                                    }}>
                                      {sev.num}
                                    </div>
                                    <span style={{ fontSize: '0.5rem', color: isSelected ? '#0f172a' : '#64748b', fontWeight: 700, marginTop: '2px' }}>{sev.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 6. Suggested fix */}
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>6. Suggested fix <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>(optional)</span></span>
                            <input placeholder="What solution or improvement would you suggest?" style={{ padding: '8px' }} />
                          </div>

                          {/* 7. Privacy */}
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>7. Privacy</span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginTop: '4px' }}>
                              <button type="button" style={{ padding: '6px 2px', fontSize: '0.6rem', background: '#ffffff', borderColor: '#ff5200', color: '#ff5200', borderRadius: '6px' }}>Public</button>
                              <button type="button" style={{ padding: '6px 2px', fontSize: '0.6rem', background: '#ffffff', borderColor: 'rgba(0,0,0,0.08)', color: '#475569', borderRadius: '6px' }}>Anonymous</button>
                              <button type="button" style={{ padding: '6px 2px', fontSize: '0.6rem', background: '#ffffff', borderColor: 'rgba(0,0,0,0.08)', color: '#475569', borderRadius: '6px' }}>Blur Location</button>
                            </div>
                          </div>

                          <button type="submit" className="primary" style={{ marginTop: '4px', padding: '12px', borderRadius: '12px' }}>
                            Submit Problem
                          </button>
                        </form>
                      ) : (
                        /* Problem Details Screen (Mock 1) */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          
                          {/* Back Arrow & Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(15,23,42,0.05)', paddingBottom: '8px' }}>
                            <ArrowLeft size={18} style={{ cursor: 'pointer', color: '#475569' }} onClick={() => setSelectedIssueId(null)} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="glow-badge garbage" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>Verified Issue</span>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>ID #PRB-7F4A92</span>
                              </div>
                            </div>
                            <Share2 size={16} color="#64748b" style={{ cursor: 'pointer' }} />
                          </div>

                          {/* Title block with Priority Gauge Circle */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                                Waterlogging Outside Government School
                              </h3>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                                <MapPin size={10} color="#ff5200" /> Ward 12, Mumbai
                                <span style={{ color: '#cbd5e1' }}>|</span>
                                <Droplet size={10} color="#3b82f6" /> Drainage + School Safety
                              </div>
                            </div>
                            
                            {/* Priority Circular Gauge */}
                            <div className="priority-circle-container" style={{ width: '56px', height: '56px' }}>
                              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                                <circle cx="18" cy="18" r="16" fill="none" stroke="url(#orangeGradient)" strokeWidth="2.5" strokeDasharray="86, 100" />
                                <defs>
                                  <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ff7e29" />
                                    <stop offset="100%" stopColor="#ff5200" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>86</span>
                                <span style={{ fontSize: '0.45rem', color: '#64748b', marginTop: '-2px' }}>/100</span>
                              </div>
                            </div>
                          </div>

                          {/* Detail statistics row matching Mock 1 */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                            <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', padding: '6px 4px', borderRadius: '8px', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563eb' }}>1.8K</div>
                              <div style={{ fontSize: '0.52rem', color: '#64748b', marginTop: '1px' }}>Affected People</div>
                              <div style={{ fontSize: '0.5rem', color: '#10b981', fontWeight: 700 }}>▲ 18%</div>
                            </div>
                            <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', padding: '6px 4px', borderRadius: '8px', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ff5200' }}>217</div>
                              <div style={{ fontSize: '0.52rem', color: '#64748b', marginTop: '1px' }}>Confirmations</div>
                              <div style={{ fontSize: '0.5rem', color: '#10b981', fontWeight: 700 }}>▲ 22%</div>
                            </div>
                            <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', padding: '6px 4px', borderRadius: '8px', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a855f7' }}>12</div>
                              <div style={{ fontSize: '0.52rem', color: '#64748b', marginTop: '1px' }}>Photos / Videos</div>
                              <div style={{ fontSize: '0.5rem', color: '#64748b', marginTop: '2px' }}>Recent</div>
                            </div>
                            <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', padding: '6px 4px', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <CheckCircle size={14} color="#10b981" style={{ margin: '0 auto 2px' }} />
                              <div style={{ fontSize: '0.52rem', color: '#059669', fontWeight: 700 }}>Verified Issue</div>
                              <div style={{ fontSize: '0.45rem', color: '#64748b' }}>By Volunteers</div>
                            </div>
                          </div>

                          {/* Tab labels row */}
                          <div style={{ display: 'flex', borderBottom: '1px solid rgba(15,23,42,0.06)', gap: '14px', padding: '2px 4px 0' }}>
                            {['Summary', 'Evidence', 'Solution', 'Manifesto', 'Tracking'].map((tab, i) => (
                              <span key={tab} style={{ fontSize: '0.72rem', fontWeight: 700, paddingBottom: '6px', borderBottom: i === 0 ? '2px solid #ff5200' : '2px solid transparent', color: i === 0 ? '#ff5200' : '#64748b', cursor: 'pointer' }}>
                                {tab}
                              </span>
                            ))}
                          </div>

                          {/* Problem summary section matching Mock 1 */}
                          <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '12px', padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FileText size={12} color="#ff5200" /> Problem Summary
                              </span>
                              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Updated 2 days ago</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#334155', lineHeight: 1.4 }}>
                              Every monsoon, the area outside Government School, near Shivaji Nagar, gets heavily waterlogged. Children and parents struggle to pass through knee-deep water, causing delays, health risks, and safety hazards. The issue persists due to blocked drains and poor slope towards the main road.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '6px', fontSize: '0.65rem' }}>
                              <span style={{ color: '#ff5200', fontWeight: 700 }}>📍 Exact Location</span>
                              <span style={{ color: '#64748b' }}>Submitted on 28 May 2024</span>
                            </div>
                          </div>

                          {/* Recent evidence horizontal scroller (Mock 1) */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Camera size={12} color="#ff5200" /> Recent Evidence</span>
                              <span style={{ color: '#ff5200', fontSize: '0.65rem', cursor: 'pointer' }} onClick={() => { setShowMocksGallery(true); setActiveMockIndex(0); }}>View All (12) &gt;</span>
                            </div>
                            <div className="scroll-x">
                              {[
                                { date: 'Mock 1', img: '/mocks/Mock 1.png', index: 0 },
                                { date: 'Mock 3', img: '/mocks/Mock 3.png', index: 2 },
                                { date: 'Mock 5', img: '/mocks/Mock 5.png', index: 4 },
                                { date: 'Mock 7', img: '/mocks/Mock 7.png', index: 6 }
                              ].map((item, i) => (
                                <div 
                                  key={i} 
                                  onClick={() => { setShowMocksGallery(true); setActiveMockIndex(item.index); }}
                                  style={{ width: '85px', height: '120px', borderRadius: '8px', background: '#cbd5e1', position: 'relative', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(15,23,42,0.1)', cursor: 'pointer' }}
                                >
                                  <img src={item.img} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <span style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '0.5rem', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '1px 4px', borderRadius: '3px' }}>{item.date}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Timeline progress mapping */}
                          <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '6px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <CheckCircle size={14} color="#10b981" />
                                <span style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Submitted</span>
                              </div>
                              <div style={{ flex: 1, height: '2px', background: '#10b981' }} />
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <CheckCircle size={14} color="#10b981" />
                                <span style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Verified</span>
                              </div>
                              <div style={{ flex: 1, height: '2px', background: '#3b82f6' }} />
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ffffff' }} />
                                </div>
                                <span style={{ fontSize: '0.5rem', color: '#0f172a', fontWeight: 700, marginTop: '2px' }}>Clustered</span>
                              </div>
                            </div>
                            <div style={{ marginLeft: '12px', borderLeft: '1px solid rgba(15,23,42,0.08)', paddingLeft: '8px' }}>
                              <button style={{ padding: '4px 8px', fontSize: '0.6rem', border: '1px solid rgba(0,0,0,0.08)', background: '#ffffff', borderRadius: '6px', fontWeight: 700, color: '#ff5200' }}>View Details</button>
                            </div>
                          </div>

                          {/* Action Buttons grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '4px' }}>
                            <button 
                              className="primary" 
                              onClick={() => handleSupportIssue('ae1bcf20-1a42-4912-8824-c10df8a8470a')}
                              style={{ padding: '8px 4px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', border: 'none' }}
                            >
                              <Heart size={14} />
                              <span style={{ fontSize: '0.55rem', fontWeight: 800 }}>Support 217</span>
                            </button>
                            <button 
                              onClick={() => alert('Media upload simulation triggered.')}
                              style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', padding: '8px 4px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#475569' }}
                            >
                              <Camera size={14} style={{ color: '#ff5200' }} />
                              <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>Add Evidence</span>
                            </button>
                            <button 
                              onClick={() => alert('Solution submission simulation triggered.')}
                              style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', padding: '8px 4px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#475569' }}
                            >
                              <Sparkles size={14} style={{ color: '#ff5200' }} />
                              <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>Suggest Fix</span>
                            </button>
                            <button 
                              onClick={() => {
                                if (userRole === 'volunteer') setShowVerifyForm(true);
                                else alert('Switch user role to "Volunteer" in Me tab to verify this cluster.');
                              }}
                              style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', padding: '8px 4px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#475569' }}
                            >
                              <CheckSquare size={14} style={{ color: '#a855f7' }} />
                              <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>Verify Issue</span>
                            </button>
                          </div>

                          {/* Volunteer Verification form overlay */}
                          {showVerifyForm && (
                            <div style={{ background: '#ffffff', border: '1.5px solid #ff5200', padding: '12px', borderRadius: '14px', marginTop: '4px', boxShadow: '0 4px 12px rgba(255,82,0,0.1)' }}>
                              <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#0f172a', fontWeight: 800 }}>Submit Field Verification</h4>
                              <div style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Outcome</label>
                                <select value={verifyOutcome} onChange={e => setVerifyOutcome(e.target.value as any)} style={{ padding: '6px', fontSize: '0.75rem', marginTop: '2px' }}>
                                  <option value="verified">Verified (Issue is real and active)</option>
                                  <option value="rejected">Rejected (Incorrect / Resolved)</option>
                                </select>
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Notes</label>
                                <input placeholder="Verification notes..." value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} style={{ padding: '6px', fontSize: '0.75rem', marginTop: '2px' }} />
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" className="primary" style={{ flex: 1, padding: '8px', fontSize: '0.75rem', borderRadius: '8px' }} onClick={() => handleVerifyCluster('ae1bcf20-1a42-4912-8824-c10df8a8470a')}>
                                  Submit Verification
                                </button>
                                <button type="button" style={{ flex: 1, padding: '8px', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: '#ffffff' }} onClick={() => setShowVerifyForm(false)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'manifesto' && (
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                      {/* Title Header with Draft Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Ward 12 People's Manifesto</h3>
                          <span style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                            Generated from 1,482 inputs • 14 clusters
                          </span>
                        </div>
                        <span className="glow-badge roads" style={{ fontSize: '0.65rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316', display: 'inline-block' }} /> Draft
                        </span>
                      </div>

                      {/* Generated Priorities list (Mock 6 Representation) */}
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '12px' }}>
                        
                        {/* 100-Day Priorities */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={12} /> 100-Day Priorities
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>4 Promises</span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {[
                              { title: 'Fix Water Supply in All Colonies', owner: 'PWD', time: '0-100 Days', ach: '90% coverage', badge: 'water' },
                              { title: 'Repair & Light Key Roads', owner: 'PWD', time: '0-100 Days', ach: '50 km fixed', badge: 'roads' },
                              { title: 'Clean Streets, No Garbage', owner: 'Municipal', time: '0-100 Days', ach: '100% collection', badge: 'garbage' },
                              { title: 'Safe Streets, Strong Policing', owner: 'Police', time: '0-100 Days', ach: '30% crime drop', badge: 'safety' }
                            ].map((p, idx) => (
                              <div key={idx} style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '8px', padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>{p.title}</div>
                                  <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px' }}>Owner: {p.owner} | Timeline: {p.time}</div>
                                </div>
                                <span className={`glow-badge ${p.badge}`} style={{ fontSize: '0.55rem', padding: '2px 6px' }}>{p.ach}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 1-Year Priorities */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FileText size={12} /> 1-Year Priorities
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>4 Promises</span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {[
                              { title: 'Upgrade Government Schools', owner: 'Education Dept', time: '3-12 Months', ach: '80% student reach', badge: 'roads' },
                              { title: 'Better Clinics, Closer to Home', owner: 'Health Dept', time: '3-12 Months', ach: '95% OPD uptime', badge: 'health' },
                              { title: 'Local Jobs & Skill Centers', owner: 'Labour & Skill', time: '3-12 Months', ach: '1,000+ youth trained', badge: 'jobs' },
                              { title: 'Drainage & Monsoon Ready', owner: 'Municipal', time: '3-12 Months', ach: '80% flood areas fixed', badge: 'safety' }
                            ].map((p, idx) => (
                              <div key={idx} style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '8px', padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>{p.title}</div>
                                  <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px' }}>Owner: {p.owner} | Timeline: {p.time}</div>
                                </div>
                                <span className={`glow-badge ${p.badge}`} style={{ fontSize: '0.55rem', padding: '2px 6px' }}>{p.ach}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 3-Year Transformation */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Activity size={12} /> 3-Year Transformation
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>4 Promises</span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {[
                              { title: 'Public Transport You Can Count On', owner: 'Transport Dept', time: '1-3 Years', ach: '25% ridership increase', badge: 'water' },
                              { title: 'Affordable Housing for All', owner: 'Housing Board', time: '1-3 Years', ach: '2,000 homes built', badge: 'jobs' }
                            ].map((p, idx) => (
                              <div key={idx} style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '8px', padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>{p.title}</div>
                                  <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px' }}>Owner: {p.owner} | Timeline: {p.time}</div>
                                </div>
                                <span className={`glow-badge ${p.badge}`} style={{ fontSize: '0.55rem', padding: '2px 6px' }}>{p.ach}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Sticky bottom buttons matching Mock 6 */}
                      <div style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                        <button style={{ flex: 1, padding: '8px', fontSize: '0.72rem', border: '1px solid rgba(0,0,0,0.08)', background: '#ffffff', color: '#475569', borderRadius: '8px', fontWeight: 700 }} onClick={() => alert('Invite Public Feedback triggered')}>
                          Invite Feedback
                        </button>
                        <button className="primary" style={{ flex: 1.2, padding: '8px', fontSize: '0.72rem', borderRadius: '8px' }} onClick={handleGenerateManifesto}>
                          Publish Draft
                        </button>
                        <button style={{ flex: 0.8, padding: '8px', fontSize: '0.72rem', border: '1px solid rgba(0,0,0,0.08)', background: '#ffffff', color: '#475569', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => alert('PDF Export simulated')}>
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'tracker' && (
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                      {/* Header matching Mock 5 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Delivery Tracker</h3>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginTop: '2px' }}>Ward 12, Mumbai</span>
                        </div>
                        <span className="glow-badge water" style={{ fontSize: '0.65rem' }}>Active Curation</span>
                      </div>
                      
                      {/* Stats Overview Grid (Mock 5) */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '3px', marginBottom: '10px' }}>
                        {[
                          { val: partyPromises.length || 24, label: 'Adopted', color: '#8b5cf6', bg: 'rgba(139,92,246,0.05)' },
                          { val: partyPromises.filter(p => p.status === 'completed').length || 4, label: 'Done', color: '#10b981', bg: 'rgba(16,185,129,0.05)' },
                          { val: partyPromises.filter(p => p.status === 'on_track' || p.status === 'adopted').length || 9, label: 'On Track', color: '#059669', bg: 'rgba(5,150,105,0.05)' },
                          { val: 6, label: 'Delayed', color: '#f59e0b', bg: 'rgba(245,158,11,0.05)' },
                          { val: 3, label: 'No Update', color: '#64748b', bg: 'rgba(100,116,139,0.05)' },
                          { val: partyPromises.filter(p => p.status === 'disputed').length || 2, label: 'Disputed', color: '#ef4444', bg: 'rgba(239,68,68,0.05)' }
                        ].map((stat, idx) => (
                          <div key={idx} style={{ background: stat.bg, border: `1px solid ${stat.color}1e`, borderRadius: '6px', padding: '4px 2px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: stat.color }}>{stat.val}</div>
                            <div style={{ fontSize: '0.42rem', color: '#64748b', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap' }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Featured Promise timeline panel (Mock 5) */}
                      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '12px', padding: '10px 12px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=50&auto=format&fit=crop&q=60" alt="Road" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.55rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>FEATURED PROMISE</span>
                            <h4 style={{ margin: '2px 0 0', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>Repair School Approach Roads</h4>
                            <span style={{ fontSize: '0.58rem', color: '#64748b' }}>Ward 12 • Infrastructure</span>
                          </div>
                          <ChevronRight size={14} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => alert('Featured promise details')} />
                        </div>

                        {/* Horizontal Timeline (Mock 5) */}
                        <div style={{ margin: '12px 0', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {[
                              { label: 'Demand', date: '12 Jan', check: true, active: false },
                              { label: 'Verified', date: '18 Jan', check: true, active: false },
                              { label: 'Adopted', date: '22 Jan', check: true, active: false },
                              { label: 'Owner', date: '01 Feb', check: true, active: false },
                              { label: 'Budget', date: '15 Feb', check: true, active: false },
                              { label: 'Work', date: '28 Feb', check: false, active: true },
                              { label: 'Done', date: '--', check: false, active: false }
                            ].map((step, idx) => (
                              <React.Fragment key={idx}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                  <div style={{
                                    width: '14px', height: '14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: step.check ? '#10b981' : step.active ? '#3b82f6' : '#ffffff',
                                    border: `1.5px solid ${step.check ? '#10b981' : step.active ? '#3b82f6' : 'rgba(15,23,42,0.1)'}`
                                  }}>
                                    {step.check && <Check size={8} color="white" />}
                                    {step.active && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'white' }} />}
                                  </div>
                                  <span style={{ fontSize: '0.45rem', color: step.active ? '#3b82f6' : '#64748b', fontWeight: 700, marginTop: '2px' }}>{step.label}</span>
                                  <span style={{ fontSize: '0.4rem', color: '#94a3b8' }}>{step.date}</span>
                                </div>
                                {idx < 6 && (
                                  <div style={{ flex: 0.5, height: '1.5px', background: step.check ? '#10b981' : 'rgba(15,23,42,0.08)', alignSelf: 'center', marginTop: '-8px' }} />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {/* Status text */}
                        <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.03)', fontSize: '0.68rem', color: '#475569' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block', marginRight: '4px' }} />
                          <strong>Work Started:</strong> Road excavation and base preparation in progress.
                        </div>
                      </div>

                      {/* Area Report Card (Mock 5) */}
                      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Activity size={12} color="#ff5200" /> Area Report Card
                          </span>
                          <div style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800 }}>
                            62/100 Overall Score
                          </div>
                        </div>

                        {/* Category progress bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {[
                            { name: 'Roads', val: 58, color: '#f97316' },
                            { name: 'Water', val: 72, color: '#3b82f6' },
                            { name: 'Safety', val: 48, color: '#a855f7' },
                            { name: 'Health', val: 61, color: '#ef4444' },
                            { name: 'Jobs', val: 70, color: '#10b981' }
                          ].map((item, idx) => (
                            <div key={idx}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                <span>{item.name}</span>
                                <span>{item.val}/100</span>
                              </div>
                              <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${item.val}%`, height: '100%', background: item.color, borderRadius: '2px' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Buttons */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="primary" style={{ flex: 1, padding: '10px', fontSize: '0.72rem', borderRadius: '10px' }} onClick={() => {
                          if (userRole === 'department_officer') {
                            if (partyPromises.length > 0) {
                              setSelectedCluster(partyPromises[0].id);
                              setShowDeliveryForm(true);
                            } else {
                              alert('No adopted promises to update.');
                            }
                          } else {
                            alert('Switch simulator role to "Department Officer" in Me tab.');
                          }
                        }}>
                          + Add Update
                        </button>
                        <button style={{ flex: 1.2, padding: '10px', fontSize: '0.72rem', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)', color: '#059669', borderRadius: '10px', fontWeight: 700 }} onClick={() => alert('Completion verification flow simulated')}>
                          Verify Completion
                        </button>
                        <button style={{ flex: 1, padding: '10px', fontSize: '0.72rem', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#dc2626', borderRadius: '10px', fontWeight: 700 }} onClick={() => alert('Challenge claim flow simulated')}>
                          Challenge Claim
                        </button>
                      </div>

                      {/* Delivery progress update form */}
                      {showDeliveryForm && (
                        <div style={{ background: '#ffffff', border: '1.5px solid #3b82f6', padding: '10px', borderRadius: '12px', marginTop: '6px', boxShadow: '0 4px 12px rgba(59,130,246,0.1)' }}>
                          <h4 style={{ margin: '0 0 6px', fontSize: '0.8rem', fontWeight: 800 }}>Submit Progress Update</h4>
                          <select value={deliveryStatus} onChange={e => setDeliveryStatus(e.target.value as any)} style={{ padding: '6px', fontSize: '0.75rem' }}>
                            <option value="on_track">On Track</option>
                            <option value="completed">Completed</option>
                            <option value="delayed">Delayed</option>
                            <option value="disputed">Disputed</option>
                          </select>
                          <input 
                            placeholder="Explain work status..." 
                            style={{ marginTop: '6px', padding: '6px', fontSize: '0.75rem' }}
                            value={deliveryText} onChange={e => setDeliveryText(e.target.value)} 
                          />
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <button type="button" className="primary" style={{ flex: 1, padding: '6px', fontSize: '0.72rem', borderRadius: '6px' }} onClick={() => handleAddDeliveryUpdate(selectedCluster || '')}>
                              Submit
                            </button>
                            <button type="button" style={{ flex: 1, padding: '6px', fontSize: '0.72rem', border: '1px solid rgba(0,0,0,0.1)', background: '#ffffff', borderRadius: '6px' }} onClick={() => setShowDeliveryForm(false)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'me' && (
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Simulator Roles Sandbox</h3>
                      
                      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '12px', padding: '12px' }}>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Select Active Role</label>
                        <select value={userRole} onChange={e => handleRoleChange(e.target.value as any)} style={{ marginTop: '4px', padding: '10px' }}>
                          <option value="citizen">Citizen (Asha Patil)</option>
                          <option value="volunteer">Volunteer (Imran Khan)</option>
                          <option value="party_lead">Party Lead (Meera Deshmukh)</option>
                          <option value="department_officer">Department Officer (Suresh Kumar)</option>
                        </select>
                      </div>

                      <div style={{ background: 'rgba(255,82,0,0.03)', border: '1px solid rgba(255,82,0,0.08)', padding: '12px', borderRadius: '12px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                        <strong>Active Role Permissions:</strong>
                        <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                          {userRole === 'citizen' && <li>Can submit problem reports, upload media evidence, and confirm or support reports.</li>}
                          {userRole === 'volunteer' && <li>Can perform field audits, verify civic issues, and run duplicate checkers on the ground.</li>}
                          {userRole === 'party_lead' && <li>Can adopt manifestos, resolve double-entry promises, and publish official documents.</li>}
                          {userRole === 'department_officer' && <li>Can authorize updates on public work progress and mark milestone updates.</li>}
                        </ul>
                      </div>

                      <button onClick={() => setOnboardingCompleted(false)} style={{ padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: '#ffffff', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}>
                        Reset Onboarding Flow
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Simulated Phone Navigation Tab-bar */}
            {onboardingCompleted && (
              <div className="tab-bar">
                <div className={`tab-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
                  <Compass size={18} />
                  <span>Map</span>
                </div>
                <div className={`tab-item ${activeTab === 'problems' ? 'active' : ''}`} onClick={() => { setSelectedIssueId('ae1bcf20-1a42-4912-8824-c10df8a8470a'); setActiveTab('problems'); }}>
                  <AlertTriangle size={18} />
                  <span>Problems</span>
                </div>
                <div className={`tab-item ${activeTab === 'manifesto' ? 'active' : ''}`} onClick={() => setActiveTab('manifesto')}>
                  <FileText size={18} />
                  <span>Manifesto</span>
                </div>
                <div className={`tab-item ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}>
                  <Activity size={18} />
                  <span>Tracker</span>
                </div>
                <div className={`tab-item ${activeTab === 'me' ? 'active' : ''}`} onClick={() => setActiveTab('me')}>
                  <User size={18} />
                  <span>Me</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Candidate Party Studio & Database Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Party Studio Workspace (Mock 2 / Compare & Decide) */}
          <div className="glass-panel" style={{ flex: 1, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#0f172a' }}>
                <Award size={22} style={{ color: '#ff5200' }} /> Party Studio Portal
              </h2>
              <span className="glow-badge water" style={{ fontSize: '0.65rem' }}>Public Review</span>
            </div>

            {!manifesto ? (
              <div style={{ textAlign: 'center', padding: '60px 40px' }}>
                <Sparkles size={44} style={{ color: '#a855f7', opacity: 0.5, marginBottom: '12px' }} />
                <h3 style={{ margin: '0 0 8px', fontWeight: 800 }}>No Area Manifesto Draft Created</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Use the Mobile Client on the left to click <strong>Generate Local Manifesto</strong> to populate the Studio data.
                </p>
              </div>
            ) : (
              <div>
                {/* Stats row matching Mock 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.06)', padding: '12px 6px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Citizen Clusters</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>24 <span style={{ fontSize: '0.72rem', color: '#10b981' }}>▲ 18%</span></div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.06)', padding: '12px 6px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Manifesto-Ready</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>36 <span style={{ fontSize: '0.72rem', color: '#10b981' }}>▲ 22%</span></div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.06)', padding: '12px 6px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Feedback Recd</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>1.8K <span style={{ fontSize: '0.72rem', color: '#10b981' }}>▲ 32%</span></div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.06)', padding: '12px 6px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Promises Adopted</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{partyPromises.length} <span style={{ fontSize: '0.72rem', color: '#10b981' }}>▲ 25%</span></div>
                  </div>
                </div>

                {/* Promise Diff Curator Section (Mock 2) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Promise Diff <span style={{ color: '#64748b', fontWeight: 500 }}>• Compare & Decide</span>
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#ff5200', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}>
                    <Info size={12} /> Why differences?
                  </span>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: '16px', padding: '16px', marginBottom: '20px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr 140px', gap: '14px', alignItems: 'center' }}>
                    {/* Left: Citizen Demand */}
                    <div style={{ background: 'rgba(59, 130, 246, 0.02)', border: '1px solid rgba(59, 130, 246, 0.08)', padding: '12px', borderRadius: '12px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>👤 Citizen Demand</span>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', marginTop: '6px', fontWeight: 700 }}>
                        Ensure 24x7 quality drinking water supply to every household in Jaipur AC-5.
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', color: '#475569', fontWeight: 700 }}>Universal</span>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', color: '#475569', fontWeight: 700 }}>No Timeline</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '8px', fontWeight: 600 }}>
                        👥 ~1.6K citizens support this
                      </div>
                    </div>

                    {/* VS divider */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>VS</span>
                    </div>

                    {/* Right: Party Version */}
                    <div style={{ background: 'rgba(255, 82, 0, 0.02)', border: '1px solid rgba(255, 82, 0, 0.08)', padding: '12px', borderRadius: '12px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#ff5200', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚙️ Party Version</span>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', marginTop: '6px', fontWeight: 700 }}>
                        Provide piped drinking water to every household in Jaipur AC-5 by 2027.
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <span style={{ background: 'rgba(255, 82, 0, 0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', color: '#ff5200', fontWeight: 700 }}>Phased</span>
                        <span style={{ background: 'rgba(255, 82, 0, 0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', color: '#ff5200', fontWeight: 700 }}>2027 Timeline</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '8px', fontWeight: 600 }}>
                        👥 ~612 citizens support this
                      </div>
                    </div>

                    {/* Differences list */}
                    <div style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: '12px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Differences</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.62rem', fontWeight: 700 }}>
                        <span style={{ color: '#d97706' }}>● Scope Reduced</span>
                        <span style={{ color: '#059669' }}>● Timeline Added</span>
                        <span style={{ color: '#d97706' }}>● Owner Missing</span>
                        <span style={{ color: '#d97706' }}>● Weaker Commitment</span>
                      </div>
                    </div>
                  </div>

                  {/* Curating Actions */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '12px' }}>
                    <button className="primary" style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => {
                      if (manifesto.promises && manifesto.promises.length > 0) {
                        const p = manifesto.promises[0];
                        handleAdoptPromise(p.id, p.title, p.description, p.target_metric);
                      }
                    }}>
                      <CheckCircle size={14} /> Adopt Promise
                    </button>
                    <button style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.78rem', border: '1px solid rgba(0,0,0,0.08)', background: '#ffffff', color: '#475569', fontWeight: 700 }} onClick={() => alert('Clarification requested.')}>
                      Request Clarification
                    </button>
                    <button style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.78rem', border: '1px solid rgba(0,0,0,0.08)', background: '#ffffff', color: '#475569', fontWeight: 700 }} onClick={() => alert('Comment field open.')}>
                      Add Comment
                    </button>
                  </div>
                </div>

                {/* All Promises List & Filters */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['All', 'Adopted', 'Under Review', 'Needs Costing', 'Rejected'].map((tab, idx) => (
                      <span 
                        key={tab} 
                        style={{
                          padding: '6px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          background: idx === 0 ? '#ff5200' : '#f8fafc',
                          color: idx === 0 ? '#ffffff' : '#64748b',
                          border: idx === 0 ? '1px solid #ff5200' : '1px solid rgba(0,0,0,0.06)'
                        }}
                      >
                        {tab} ({idx === 0 ? '36' : idx === 1 ? partyPromises.length : idx === 2 ? '14' : idx === 3 ? '6' : '4'})
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select style={{ width: 'auto', padding: '4px 8px', fontSize: '0.7rem', border: '1px solid rgba(0,0,0,0.1)', background: '#ffffff', borderRadius: '6px', marginTop: 0 }}>
                      <option>Filter</option>
                    </select>
                    <select style={{ width: 'auto', padding: '4px 8px', fontSize: '0.7rem', border: '1px solid rgba(0,0,0,0.1)', background: '#ffffff', borderRadius: '6px', marginTop: 0 }}>
                      <option>Latest</option>
                    </select>
                  </div>
                </div>

                {/* Promises adopt rows mapping */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {manifesto.promises?.map((p: any) => {
                    const isAdopted = partyPromises.some(pp => pp.source_promise_id === p.id);
                    return (
                      <div key={p.id} style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '10px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <Droplet size={18} color="#3b82f6" />
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{p.title}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>Target: {p.target_metric} | Support: ~1.6K citizens</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`glow-badge ${isAdopted ? 'garbage' : 'roads'}`} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                            {isAdopted ? 'Adopted' : 'Under Review'}
                          </span>
                          <button 
                            disabled={isAdopted}
                            className={isAdopted ? '' : 'primary'}
                            onClick={() => handleAdoptPromise(p.id, p.title, p.description, p.target_metric)}
                            style={{ padding: '4px 10px', fontSize: '0.68rem', borderRadius: '6px', border: isAdopted ? '1px solid rgba(0,0,0,0.08)' : 'none' }}
                          >
                            {isAdopted ? 'Adopted ✓' : 'Adopt'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Publish Official Manifesto */}
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px', marginTop: '12px', textAlign: 'center' }}>
                  <button className="primary" style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => alert('Manifesto published to public portal.')}>
                    <Lock size={14} /> Publish Official Manifesto
                  </button>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginTop: '4px' }}>🔒 Only adopted promises will be published to the voter ledger</span>
                </div>
              </div>
            )}
          </div>

          {/* Live System Logs & Audit Events */}
          <div className="glass-panel" style={{ height: '280px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <h2 style={{ fontSize: '1.05rem', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#0f172a' }}>
              <ShieldAlert size={18} color="#ef4444" /> Platform Double-Entry Audit Log
            </h2>
            
            <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9', borderRadius: '10px', padding: '12px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#334155', border: '1px solid rgba(0,0,0,0.06)' }}>
              {auditLogs.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic' }}>Waiting for audit events to be written...</div>
              ) : (
                auditLogs.map((log: any) => (
                  <div key={log.id} style={{ marginBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '6px' }}>
                    <span style={{ color: '#ff5200', fontWeight: 700 }}>[{new Date(log.created_at).toLocaleTimeString()}]</span>{' '}
                    <span style={{ color: '#059669', fontWeight: 'bold' }}>{log.event_type}</span>{' '}
                    <span style={{ color: '#64748b' }}>target: {log.target_table} ({log.target_id.substr(0,8)})</span>
                    <div style={{ color: '#475569', paddingLeft: '12px', marginTop: '2px', wordBreak: 'break-all' }}>
                      payload: {JSON.stringify(log.payload)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Fullscreen Mockup Gallery Overlay Modal */}
      {showMocksGallery && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px', boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '900px',
            height: '95%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={18} style={{ color: '#ff5200' }} /> TGIM Figma Mockups Inspector
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Comparing the current implementation with designs in /mocks</span>
              </div>
              <button 
                onClick={() => setShowMocksGallery(false)}
                style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#f8fafc' }}>
              {/* Left Column: Vertical Image Viewer */}
              <div style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: '#f1f5f9', overflow: 'hidden', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', width: '100%' }}>
                  
                  {/* Prev Button */}
                  <button 
                    type="button"
                    onClick={() => setActiveMockIndex(prev => (prev === 0 ? mockImages.length - 1 : prev - 1))}
                    style={{ position: 'absolute', left: '10px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                  >
                    <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
                  </button>

                  {/* Vertical Mock Image */}
                  <div style={{ height: '90%', maxHeight: '600px', width: '280px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '4px solid #0f172a', background: '#ffffff' }}>
                    <img 
                      src={`/mocks/${mockImages[activeMockIndex].name}`} 
                      alt={mockImages[activeMockIndex].label} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    />
                  </div>

                  {/* Next Button */}
                  <button 
                    type="button"
                    onClick={() => setActiveMockIndex(prev => (prev === mockImages.length - 1 ? 0 : prev + 1))}
                    style={{ position: 'absolute', right: '10px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Right Column: Details & Navigation */}
              <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#ff5200', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Mockup {activeMockIndex + 1} of 8</span>
                  <h4 style={{ margin: '4px 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{mockImages[activeMockIndex].label}</h4>
                  <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>{mockImages[activeMockIndex].desc}</p>
                  
                  <div style={{ background: 'rgba(255,82,0,0.03)', border: '1px solid rgba(255,82,0,0.08)', borderRadius: '12px', padding: '12px', fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
                    <strong>Styling Checklist:</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                      <li>Uses Outfits Google font for clean headings.</li>
                      <li>Accent Orange (#ff5200) for interactive states.</li>
                      <li>White cards on light gray background layers.</li>
                      <li>Custom status badges with border outline and soft fills.</li>
                    </ul>
                  </div>
                </div>

                {/* Thumbnails list navigation */}
                <div>
                  <h5 style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }}>Jump to Mockup</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {mockImages.map((mock, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setActiveMockIndex(idx)}
                        style={{
                          borderRadius: '8px', height: '80px', overflow: 'hidden', cursor: 'pointer',
                          border: `2px solid ${activeMockIndex === idx ? '#ff5200' : 'transparent'}`,
                          opacity: activeMockIndex === idx ? 1 : 0.6, transition: 'all 0.2s', background: '#cbd5e1'
                        }}
                      >
                        <img src={`/mocks/${mock.name}`} alt="Mock Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
