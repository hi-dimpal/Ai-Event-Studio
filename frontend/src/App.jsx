import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, Clock, Users, Target, Activity, Settings, 
  AlertTriangle, CheckCircle, Save, ArrowLeft, RefreshCw, Copy, 
  Image as ImageIcon, LayoutDashboard, ListTodo, MessageSquare, 
  Share2, ChevronRight, Sparkles, Plus, Edit3, Trash2, Check, ArrowRight
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/events';

function App() {
  const [currentView, setCurrentView] = useState('LIST'); // LIST, CREATE, DASHBOARD
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  
  // Loading & Sync states
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); 
  const [loadingPoster, setLoadingPoster] = useState(false);
  
  // UI States
  const [activeTab, setActiveTab] = useState('overview');
  const [consistencyResult, setConsistencyResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    event_name: '', event_type: '', date: '', time: '', venue: '',
    target_audience: '', theme: '', objectives: '', registration_link: '',
    speakers: '', activities: '', important_instructions: ''
  });

  useEffect(() => {
    if (currentView === 'LIST') fetchEvents();
  }, [currentView]);

  const fetchEvents = async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      setEvents(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const runConsistencyCheck = async (brief, packageData) => {
    const res = await fetch(`${API_BASE}/check-consistency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_brief: brief, generated_package: packageData })
    });
    const data = await res.json();
    setConsistencyResult(data);
    return data;
  };

  const handleGeneratePackage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSyncStatus('regenerating');
    
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_brief: formData })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const generatedPackage = data.package;
      
      setSyncStatus('checking');
      await runConsistencyCheck(formData, generatedPackage);

      setSyncStatus('updating');
      const saveRes = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_brief: formData, generated_package: generatedPackage, poster_reference: null })
      });
      const savedEvent = await saveRes.json();
      
      setCurrentEvent(savedEvent);
      setSyncStatus('synchronized');
      setTimeout(() => setSyncStatus('idle'), 3000);
      setActiveTab('overview');
      setCurrentView('DASHBOARD');
    } catch (e) {
      alert(`Error generating package: ${e.message}`);
      setSyncStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleRegeneratePackage = async () => {
    setLoading(true);
    setSyncStatus('regenerating');
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_brief: formData })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const generatedPackage = data.package;
      
      setSyncStatus('checking');
      await runConsistencyCheck(formData, generatedPackage);

      setSyncStatus('updating');
      const updateRes = await fetch(`${API_BASE}/${currentEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          event_brief: formData, 
          generated_package: generatedPackage, 
          poster_reference: currentEvent.poster_reference 
        })
      });
      const updatedEvent = await updateRes.json();
      setCurrentEvent(updatedEvent);
      setSyncStatus('synchronized');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      alert(`Error regenerating package: ${e.message}`);
      setSyncStatus('idle');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGeneratePoster = async () => {
    setLoadingPoster(true);
    try {
      const res = await fetch(`${API_BASE}/generate-poster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_brief: formData })
      });
      const data = await res.json();
      if (data.poster) {
        const updateRes = await fetch(`${API_BASE}/${currentEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            event_brief: formData, 
            generated_package: currentEvent.generated_package, 
            poster_reference: data.poster 
          })
        });
        const updatedEvent = await updateRes.json();
        setCurrentEvent(updatedEvent);
      } else {
        alert(data.message || "Poster generation unavailable.");
      }
    } catch(e) {
      alert(`Error generating poster: ${e.message}`);
    } finally {
      setLoadingPoster(false);
    }
  };

  const handleEditEvent = () => {
    fetch(`${API_BASE}/${currentEvent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        event_brief: formData, 
        generated_package: currentEvent.generated_package, 
        poster_reference: currentEvent.poster_reference 
      })
    }).then(res => res.json()).then(updated => {
      setCurrentEvent(updated);
    });
  };

  const openEvent = (event) => {
    setCurrentEvent(event);
    setFormData({
      event_name: event.event_name, event_type: event.event_type, date: event.date,
      time: event.time, venue: event.venue, target_audience: event.target_audience,
      theme: event.theme, objectives: event.objectives, registration_link: event.registration_link,
      speakers: event.speakers || '', activities: event.activities || '', important_instructions: event.important_instructions || ''
    });
    setConsistencyResult(null); 
    setActiveTab('overview');
    setCurrentView('DASHBOARD');
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if(confirm("Delete this event?")) {
      await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      fetchEvents();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const SyncStatusBadge = () => {
    if (syncStatus === 'idle') return null;
    return (
      <div className="fixed bottom-8 right-8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl border border-slate-100 px-6 py-4 flex items-center space-x-3 text-sm font-medium text-slate-800 z-50 animate-fade-in">
        {syncStatus === 'regenerating' && <><RefreshCw className="animate-spin text-indigo-600" size={18}/> <span>Regenerating Content...</span></>}
        {syncStatus === 'checking' && <><RefreshCw className="animate-spin text-slate-800" size={18}/> <span>Checking Consistency...</span></>}
        {syncStatus === 'updating' && <><RefreshCw className="animate-spin text-indigo-600" size={18}/> <span>Saving to Database...</span></>}
        {syncStatus === 'synchronized' && <><CheckCircle className="text-green-600" size={18}/> <span>Synchronized</span></>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Header */}
      <header className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex justify-between items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setCurrentView('LIST')}
          >
            <div className="bg-slate-900 text-white p-2 rounded-lg shadow-sm transition-transform group-hover:scale-105">
              <Activity size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              AI Event Studio
            </h1>
          </div>
          <nav className="flex items-center space-x-4">
            {currentView !== 'LIST' && (
              <button 
                onClick={() => setCurrentView('LIST')}
                className="text-slate-500 hover:text-slate-900 px-3 py-2 text-sm font-semibold transition flex items-center"
              >
                <LayoutDashboard size={16} className="mr-2"/> Dashboard
              </button>
            )}
            <button 
              onClick={() => {
                setFormData({
                  event_name: '', event_type: '', date: '', time: '', venue: '',
                  target_audience: '', theme: '', objectives: '', registration_link: '',
                  speakers: '', activities: '', important_instructions: ''
                });
                setCurrentView('CREATE');
              }}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center"
            >
              <Plus size={16} className="mr-1.5"/> Create New Event
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow w-full">
        
        {/* VIEW: MY EVENTS (DASHBOARD LIST) */}
        {currentView === 'LIST' && (
          <div className="animate-fade-in">
            {/* Hero Section */}
            <div className="bg-slate-900 text-white border-b border-slate-800 py-24 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-400 via-slate-900 to-slate-900"></div>
              <div className="max-w-[1400px] mx-auto px-6 relative z-10 text-center">
                <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
                  Plan. Promote. Launch.
                </h1>
                <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-medium">
                  The unified platform for generating complete event packages, agendas, and marketing campaigns in seconds.
                </p>
                <button 
                  onClick={() => setCurrentView('CREATE')}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/50 flex items-center mx-auto text-base"
                >
                  <Sparkles size={18} className="mr-2"/> Start Planning
                </button>
              </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 py-16">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Your Events</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Manage and monitor your upcoming initiatives</p>
                </div>
              </div>

              {events.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar className="text-slate-400" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No active events</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mb-8">Start by defining your first event brief.</p>
                  <button 
                    onClick={() => setCurrentView('CREATE')}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition"
                  >
                    Create Event
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {events.map(ev => (
                    <div 
                      key={ev.id} 
                      onClick={() => openEvent(ev)}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col h-full"
                    >
                      <div className="p-6 flex-grow">
                        <div className="flex justify-between items-start mb-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 tracking-wide uppercase">
                            {ev.event_type}
                          </span>
                          <button onClick={(e) => handleDelete(ev.id, e)} className="text-slate-300 hover:text-red-600 transition">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2">{ev.event_name}</h3>
                        <div className="space-y-2 mt-auto text-sm text-slate-500 font-medium">
                          <div className="flex items-center">
                            <Clock size={15} className="mr-2 text-slate-400" /> {ev.date}
                          </div>
                          <div className="flex items-center">
                            <MapPin size={15} className="mr-2 text-slate-400" /> <span className="truncate">{ev.venue}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">
                        Manage Event
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: CREATE EVENT */}
        {currentView === 'CREATE' && (
          <div className="max-w-3xl mx-auto px-6 py-16 animate-fade-in">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create New Event</h2>
              <p className="text-slate-500 mt-3 text-base">Provide the core details and AI will generate the entire campaign.</p>
            </div>

            <datalist id="event-types">
              <option value="Conference"/><option value="Workshop"/><option value="Webinar"/>
              <option value="Meetup"/><option value="Product Launch"/><option value="Corporate Event"/>
              <option value="Networking Event"/><option value="Fundraiser"/><option value="Exhibition"/>
              <option value="Sports Event"/><option value="Hackathon"/><option value="Private Event"/>
            </datalist>
            
            <datalist id="target-audiences">
              <option value="Professionals"/><option value="Customers"/><option value="Employees"/>
              <option value="Students"/><option value="General Public"/><option value="Investors"/>
              <option value="Developers"/><option value="Entrepreneurs"/><option value="Community"/>
            </datalist>

            <form onSubmit={handleGeneratePackage} className="space-y-6">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center pb-4 border-b border-slate-100">
                  <Calendar className="mr-2.5 text-indigo-600" size={20}/> 
                  Event Basics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Name *</label>
                    <input required name="event_name" value={formData.event_name} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="e.g. Global Tech Summit 2026"/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Type *</label>
                    <input required list="event-types" name="event_type" value={formData.event_type} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="Select or type custom type"/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Venue *</label>
                    <input required name="venue" value={formData.venue} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="e.g. Grand Convention Center or Online/Zoom"/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
                    <input required name="date" value={formData.date} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="e.g. November 12, 2026"/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time *</label>
                    <input required name="time" value={formData.time} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="e.g. 9:00 AM - 5:00 PM EST"/>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center pb-4 border-b border-slate-100">
                  <Target className="mr-2.5 text-indigo-600" size={20}/> 
                  Audience & Theme
                </h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Audience *</label>
                      <input required list="target-audiences" name="target_audience" value={formData.target_audience} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="Select or type custom audience"/>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Theme / Topic *</label>
                      <input required name="theme" value={formData.theme} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="e.g. The Future of AI in Enterprise"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Key Objectives *</label>
                    <textarea required name="objectives" value={formData.objectives} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors h-24 resize-none" placeholder="What are the main goals?"></textarea>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center pb-4 border-b border-slate-100">
                  <ListTodo className="mr-2.5 text-indigo-600" size={20}/> 
                  Registration & Details
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Registration Link *</label>
                    <input required name="registration_link" type="url" value={formData.registration_link} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="https://example.com/register"/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Speakers / Guests (Optional)</label>
                      <input name="speakers" value={formData.speakers} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-colors" placeholder="e.g. Jane Doe (CEO), John Smith"/>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Core Activities (Optional)</label>
                      <input name="activities" value={formData.activities} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-colors" placeholder="e.g. Keynotes, Panel Discussions"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Important Instructions (Optional)</label>
                    <textarea name="important_instructions" value={formData.important_instructions} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-colors h-20 resize-none" placeholder="e.g. Business casual attire. Valid ID required for entry."></textarea>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 pb-12">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg disabled:opacity-70 flex items-center text-base"
                >
                  {loading ? (
                    <><RefreshCw className="animate-spin mr-3" size={20} /> Generating Complete Package...</>
                  ) : (
                    <><Sparkles className="mr-3" size={20}/> Generate Event Package</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW: DASHBOARD (GENERATED PACKAGE) */}
        {currentView === 'DASHBOARD' && currentEvent && (
          <div className="max-w-[1400px] mx-auto px-6 py-12 animate-fade-in">
            <div className="flex flex-col lg:flex-row gap-10">
              
              {/* Left Column: Event Brief Editor */}
              <div className="w-full lg:w-1/3 xl:w-1/4 shrink-0">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                  <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center justify-between pb-4 border-b border-slate-100">
                    Source Brief
                  </h3>
                  
                  <div className="space-y-5 text-sm">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Event Name</label>
                      <input name="event_name" value={formData.event_name} onChange={handleInputChange} onBlur={handleEditEvent} className="w-full border-b border-slate-200 py-1.5 focus:outline-none focus:border-indigo-500 bg-transparent font-bold text-slate-900"/>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-1/2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                        <input name="date" value={formData.date} onChange={handleInputChange} onBlur={handleEditEvent} className="w-full border-b border-slate-200 py-1.5 focus:outline-none focus:border-indigo-500 bg-transparent font-medium text-slate-800"/>
                      </div>
                      <div className="w-1/2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Time</label>
                        <input name="time" value={formData.time} onChange={handleInputChange} onBlur={handleEditEvent} className="w-full border-b border-slate-200 py-1.5 focus:outline-none focus:border-indigo-500 bg-transparent font-medium text-slate-800"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Venue</label>
                      <input name="venue" value={formData.venue} onChange={handleInputChange} onBlur={handleEditEvent} className="w-full border-b border-slate-200 py-1.5 focus:outline-none focus:border-indigo-500 bg-transparent font-medium text-slate-800"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Registration Link</label>
                      <input name="registration_link" value={formData.registration_link} onChange={handleInputChange} onBlur={handleEditEvent} className="w-full border-b border-slate-200 py-1.5 focus:outline-none focus:border-indigo-500 bg-transparent font-medium text-indigo-600"/>
                    </div>
                    
                    <div className="pt-6 mt-2 border-t border-slate-100">
                      <button 
                        onClick={handleRegeneratePackage}
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center disabled:opacity-70 shadow-sm"
                      >
                        {loading ? <><RefreshCw className="animate-spin mr-2" size={16}/> Updating...</> : <><RefreshCw className="mr-2" size={16}/> Regenerate Package</>}
                      </button>
                      <p className="text-[10px] text-slate-400 mt-3 text-center uppercase tracking-wide font-bold">Workflow Synchronization</p>
                      <div className="flex items-center justify-center text-[11px] font-medium text-slate-500 mt-1 gap-1">
                        Edit <ArrowRight size={10}/> Regenerate <ArrowRight size={10}/> Validate
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Consistency Status Card */}
                {consistencyResult && (
                  <div className={`mt-6 rounded-2xl p-5 border shadow-sm ${consistencyResult.status === 'pass' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <h3 className={`text-xs font-bold flex items-center mb-2 uppercase tracking-wider ${consistencyResult.status === 'pass' ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {consistencyResult.status === 'pass' ? <CheckCircle className="mr-2" size={16}/> : <AlertTriangle className="mr-2" size={16}/>}
                      Validation Status
                    </h3>
                    
                    {consistencyResult.status === 'pass' ? (
                      <p className="text-sm text-emerald-700 font-medium leading-relaxed">Content is perfectly consistent with your source brief.</p>
                    ) : (
                      <div>
                        <p className="text-sm text-rose-700 mb-3 font-medium">Mismatches detected:</p>
                        <ul className="space-y-3">
                          {consistencyResult.mismatches?.map((m, i) => (
                            <li key={i} className="text-xs bg-white p-3 rounded-xl border border-rose-100 text-slate-800 shadow-sm">
                              <span className="font-bold text-slate-900 block mb-1">{m.field} <span className="text-slate-400 font-normal">in {m.section}</span></span>
                              <span className="text-rose-600 line-through block">Found: {m.found}</span>
                              <span className="text-emerald-600 block mt-0.5 font-medium">Expected: {m.expected}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: AI Generated Package Tabs */}
              <div className="w-full lg:w-2/3 xl:w-3/4">
                
                {/* Custom Tab Navigation */}
                <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-200 mb-8 bg-slate-50 sticky top-24 z-30 pt-2 rounded-t-2xl">
                  {[
                    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                    { id: 'agenda', label: 'Agenda', icon: Clock },
                    { id: 'checklist', label: 'Logistics', icon: ListTodo },
                    { id: 'communications', label: 'Comms', icon: MessageSquare },
                    { id: 'marketing', label: 'Marketing', icon: Share2 },
                    { id: 'poster', label: 'Creative', icon: ImageIcon }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center whitespace-nowrap px-6 py-4 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === tab.id 
                          ? 'border-slate-900 text-slate-900' 
                          : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <tab.icon size={16} className="mr-2" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="pb-12 min-h-[500px]">
                  {/* TAB: OVERVIEW */}
                  {activeTab === 'overview' && currentEvent.generated_package?.event_concept && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-8">Event Concept</h2>
                        <div className="space-y-8">
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Executive Summary</h4>
                            <p className="text-slate-800 text-[15px] leading-relaxed">{currentEvent.generated_package.event_concept.summary}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                            <div>
                              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Primary Purpose</h4>
                              <p className="text-slate-800 text-sm font-medium">{currentEvent.generated_package.event_concept.purpose}</p>
                            </div>
                            <div>
                              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Persona</h4>
                              <p className="text-slate-800 text-sm font-medium">{currentEvent.generated_package.event_concept.audience}</p>
                            </div>
                          </div>
                          <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                            <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Value Proposition</h4>
                            <p className="text-indigo-950 font-medium text-[15px]">{currentEvent.generated_package.event_concept.value_proposition}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: AGENDA */}
                  {activeTab === 'agenda' && currentEvent.generated_package?.agenda && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10 animate-fade-in">
                      <h2 className="text-2xl font-bold text-slate-900 mb-10">Event Schedule</h2>
                      <div className="relative border-l border-slate-200 ml-4 space-y-10 pl-8">
                        {currentEvent.generated_package.agenda.map((item, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[37px] top-1 bg-white border-2 border-slate-900 w-3.5 h-3.5 rounded-full"></div>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
                              <div className="font-bold text-slate-900 shrink-0 mt-0.5 whitespace-nowrap text-sm bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{item.time}</div>
                              <div>
                                <h4 className="text-lg font-bold text-slate-900">{item.activity}</h4>
                                <p className="text-slate-600 mt-2 text-[15px] leading-relaxed">{item.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* TAB: CHECKLIST & LOGISTICS */}
                  {activeTab === 'checklist' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                      {currentEvent.generated_package?.organizer_checklist && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center"><ListTodo className="mr-3 text-slate-400"/> Organizer Tasks</h2>
                          <ul className="space-y-4">
                            {currentEvent.generated_package.organizer_checklist.map((item, i) => (
                              <li key={i} className="flex items-start">
                                <div className="bg-slate-100 rounded text-transparent mt-1 mr-3 shrink-0"><Check size={16}/></div>
                                <span className="text-slate-700 font-medium text-sm leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {currentEvent.generated_package?.participant_instructions && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center"><Users className="mr-3 text-slate-400"/> Attendee Guide</h2>
                          <ul className="space-y-4">
                            {currentEvent.generated_package.participant_instructions.map((item, i) => (
                              <li key={i} className="flex items-start">
                                <div className="bg-indigo-50 text-indigo-600 rounded-full mt-1 mr-3 shrink-0 p-0.5"><ChevronRight size={14}/></div>
                                <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* TAB: COMMUNICATIONS */}
                  {activeTab === 'communications' && (
                    <div className="space-y-8 animate-fade-in">
                      {currentEvent.generated_package?.email && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 flex items-center"><MessageSquare className="mr-2 text-slate-400" size={18}/> Official Announcement Email</h3>
                            <button onClick={() => copyToClipboard(currentEvent.generated_package.email)} className="bg-white border border-slate-200 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition flex items-center shadow-sm"><Copy size={14} className="mr-2"/> Copy Text</button>
                          </div>
                          <div className="p-8">
                            <div className="bg-slate-50 p-6 rounded-xl whitespace-pre-wrap text-slate-700 font-serif leading-relaxed border border-slate-100 text-[15px]">
                              {currentEvent.generated_package.email}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {currentEvent.generated_package?.invitation && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 flex items-center"><MessageSquare className="mr-2 text-slate-400" size={18}/> Short Invite Message (SMS/Chat)</h3>
                            <button onClick={() => copyToClipboard(currentEvent.generated_package.invitation)} className="bg-white border border-slate-200 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition flex items-center shadow-sm"><Copy size={14} className="mr-2"/> Copy Text</button>
                          </div>
                          <div className="p-8">
                            <div className="bg-slate-50 p-6 rounded-xl whitespace-pre-wrap text-slate-800 font-medium border border-slate-100 text-[15px] leading-relaxed">
                              {currentEvent.generated_package.invitation}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: MARKETING */}
                  {activeTab === 'marketing' && currentEvent.generated_package?.social_media && (
                    <div className="space-y-8 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                            <h4 className="font-bold text-slate-900">LinkedIn Post</h4>
                            <button onClick={() => copyToClipboard(currentEvent.generated_package.social_media.linkedin)} className="text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">Copy</button>
                          </div>
                          <div className="p-6 text-[15px] text-slate-700 whitespace-pre-wrap leading-relaxed flex-grow">
                            {currentEvent.generated_package.social_media.linkedin}
                          </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                            <h4 className="font-bold text-slate-900">Instagram Caption</h4>
                            <button onClick={() => copyToClipboard(currentEvent.generated_package.social_media.instagram)} className="text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">Copy</button>
                          </div>
                          <div className="p-6 text-[15px] text-slate-700 whitespace-pre-wrap leading-relaxed flex-grow">
                            {currentEvent.generated_package.social_media.instagram}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Recommended Hashtags</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentEvent.generated_package.social_media.hashtags?.map((tag, i) => (
                            <span key={i} className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-semibold">{tag.startsWith('#') ? tag : `#${tag}`}</span>
                          ))}
                        </div>
                      </div>
                      
                      {currentEvent.generated_package?.promotion_campaign && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                          <h3 className="font-bold text-xl text-slate-900 mb-8 flex items-center"><Share2 className="mr-3 text-slate-400"/> Campaign Timeline</h3>
                          <div className="space-y-6">
                            {currentEvent.generated_package.promotion_campaign.map((step, i) => (
                              <div key={i} className="flex gap-6 items-start">
                                <div className="bg-slate-900 text-white font-bold text-xs py-1.5 px-4 rounded-full whitespace-nowrap shadow-sm mt-1">
                                  {step.day}
                                </div>
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 w-full">
                                  <div className="font-bold text-slate-900 mb-1">{step.purpose}</div>
                                  <div className="text-slate-600 text-[15px] leading-relaxed">{step.content}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: POSTER */}
                  {activeTab === 'poster' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center animate-fade-in mx-auto">
                      <div className="bg-slate-50 border border-slate-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <ImageIcon size={32} className="text-slate-900" />
                      </div>
                      <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Creative Assets</h2>
                      <p className="text-slate-500 mb-10 text-lg max-w-lg mx-auto leading-relaxed">Generate high-quality promotional imagery utilizing Imagen 3, tailored to your exact event specifications.</p>
                      
                      {currentEvent.poster_reference ? (
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 inline-block w-full">
                          <img src={currentEvent.poster_reference} alt="Event Poster" className="mx-auto rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 max-h-[600px] object-contain w-auto bg-white" />
                          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                            <a href={currentEvent.poster_reference} download={`${currentEvent.event_name.replace(/\s+/g, '_')}_poster.jpg`} className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow-sm inline-flex items-center justify-center">
                              Download Poster
                            </a>
                            <button onClick={handleGeneratePoster} disabled={loadingPoster} className="bg-white border border-slate-300 text-slate-700 px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition shadow-sm disabled:opacity-50 inline-flex items-center justify-center">
                              {loadingPoster ? <RefreshCw className="animate-spin mr-2" size={16}/> : null}
                              Regenerate Asset
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={handleGeneratePoster}
                          disabled={loadingPoster}
                          className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 flex items-center mx-auto text-base disabled:opacity-70"
                        >
                          {loadingPoster ? <><RefreshCw className="animate-spin mr-3" size={20}/> Rendering Image...</> : <><Sparkles className="mr-3" size={20}/> Generate AI Poster</>}
                        </button>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Sync Status Visualization */}
      <SyncStatusBadge />
      
    </div>
  );
}

export default App;
