import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Users, Target, Activity, Settings, AlertTriangle, CheckCircle, Save, ArrowLeft, RefreshCw, Copy, Image as ImageIcon } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/events';

function App() {
  const [currentView, setCurrentView] = useState('LIST'); // LIST, CREATE, DASHBOARD
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingPoster, setLoadingPoster] = useState(false);
  
  // Validation State
  const [consistencyResult, setConsistencyResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    event_name: '', event_type: '', date: '', time: '', venue: '',
    target_audience: '', theme: '', objectives: '', registration_link: '',
    speakers: '', activities: '', important_instructions: ''
  });

  useEffect(() => {
    if (currentView === 'LIST') {
      fetchEvents();
    }
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
    try {
      const res = await fetch(`${API_BASE}/check-consistency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_brief: brief, generated_package: packageData })
      });
      const data = await res.json();
      setConsistencyResult(data);
    } catch (e) {
      console.error('Consistency check failed', e);
    }
  };

  const handleGeneratePackage = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Generate package
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_brief: formData })
      });
      
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const generatedPackage = data.package;
      
      // 2. Consistency check
      await runConsistencyCheck(formData, generatedPackage);

      // 3. Save to database
      const saveRes = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_brief: formData, generated_package: generatedPackage, poster_reference: null })
      });
      
      const savedEvent = await saveRes.json();
      setCurrentEvent(savedEvent);
      setCurrentView('DASHBOARD');
    } catch (e) {
      alert(`Error generating package: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegeneratePackage = async () => {
    setLoading(true);
    try {
      // 1. Generate package using updated form data
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_brief: formData })
      });
      
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const generatedPackage = data.package;
      
      // 2. Consistency check
      await runConsistencyCheck(formData, generatedPackage);

      // 3. Update in database
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
    } catch (e) {
      alert(`Error regenerating package: ${e.message}`);
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
        // Update database
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
    // Save current changes to DB (just the brief)
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
      alert("Event Brief saved! (Package not regenerated until you click Regenerate)");
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
    setConsistencyResult(null); // Reset until re-run or we could store it in DB, but DB schema doesn't have it
    setCurrentView('DASHBOARD');
  };

  const handleDelete = async (id) => {
    if(confirm("Delete this event?")) {
      await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      fetchEvents();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Calendar size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AI Event Studio</h1>
          </div>
          <nav className="flex space-x-4">
            <button 
              onClick={() => setCurrentView('LIST')}
              className={`px-4 py-2 rounded-md font-medium transition ${currentView === 'LIST' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              My Events
            </button>
            <button 
              onClick={() => {
                setFormData({
                  event_name: '', event_type: '', date: '', time: '', venue: '',
                  target_audience: '', theme: '', objectives: '', registration_link: '',
                  speakers: '', activities: '', important_instructions: ''
                });
                setCurrentView('CREATE');
              }}
              className={`px-4 py-2 rounded-md font-medium transition ${currentView === 'CREATE' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              + Create Event
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW: MY EVENTS */}
        {currentView === 'LIST' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">My Events</h2>
            {events.length === 0 ? (
              <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200">
                <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No events yet</h3>
                <p className="text-gray-500 mb-6">Create your first event to generate AI planning and promotion materials.</p>
                <button 
                  onClick={() => setCurrentView('CREATE')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Create Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(ev => (
                  <div key={ev.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition flex flex-col">
                    <div className="p-6 flex-grow">
                      <div className="uppercase tracking-wide text-xs text-blue-600 font-semibold mb-1">{ev.event_type}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{ev.event_name}</h3>
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <Calendar size={16} className="mr-2" /> {ev.date} at {ev.time}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin size={16} className="mr-2" /> {ev.venue}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between">
                      <button 
                        onClick={() => openEvent(ev)}
                        className="text-blue-600 font-medium hover:text-blue-800"
                      >
                        Open Dashboard
                      </button>
                      <button 
                        onClick={() => handleDelete(ev.id)}
                        className="text-red-600 font-medium hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: CREATE EVENT */}
        {currentView === 'CREATE' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Create New Event</h2>
            <form onSubmit={handleGeneratePackage} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                  <Calendar className="mr-2 text-blue-600" size={20}/> Event Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                    <input required name="event_name" value={formData.event_name} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. AgenticTHON 2026"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
                    <input required name="event_type" value={formData.event_type} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. AI Hackathon"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
                    <input required name="venue" value={formData.venue} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. GNA University"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input required name="date" value={formData.date} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. 15 October 2026"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                    <input required name="time" value={formData.time} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. 9:00 AM - 6:00 PM"/>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                  <Target className="mr-2 text-blue-600" size={20}/> Audience & Purpose
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience *</label>
                      <input required name="target_audience" value={formData.target_audience} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. College Students"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Theme *</label>
                      <input required name="theme" value={formData.theme} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. Agentic AI"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Objectives *</label>
                    <textarea required name="objectives" value={formData.objectives} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 h-24" placeholder="What is the goal of this event?"></textarea>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                  <Activity className="mr-2 text-blue-600" size={20}/> Additional Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Link *</label>
                    <input required name="registration_link" type="url" value={formData.registration_link} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2" placeholder="https://example.com/register"/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Speakers (Optional)</label>
                      <input name="speakers" value={formData.speakers} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. AI industry experts"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Activities (Optional)</label>
                      <input name="activities" value={formData.activities} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. Workshop, hackathon"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Important Instructions (Optional)</label>
                    <textarea name="important_instructions" value={formData.important_instructions} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 h-20" placeholder="e.g. Participants must bring laptops."></textarea>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <><RefreshCw className="animate-spin mr-2" size={20} /> AI is planning your event...</>
                  ) : (
                    'Generate Event Package'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW: DASHBOARD */}
        {currentView === 'DASHBOARD' && currentEvent && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Event Brief (Edit Mode) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
                  Event Brief
                  <button onClick={handleEditEvent} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                    <Save size={16} className="mr-1"/> Save Draft
                  </button>
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Event Name</label>
                    <input name="event_name" value={formData.event_name} onChange={handleInputChange} className="w-full border-b border-gray-300 py-1 focus:outline-none focus:border-blue-500 bg-transparent font-medium text-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date & Time</label>
                    <div className="flex gap-2">
                      <input name="date" value={formData.date} onChange={handleInputChange} className="w-1/2 border-b border-gray-300 py-1 focus:outline-none focus:border-blue-500 bg-transparent"/>
                      <input name="time" value={formData.time} onChange={handleInputChange} className="w-1/2 border-b border-gray-300 py-1 focus:outline-none focus:border-blue-500 bg-transparent"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Venue</label>
                    <input name="venue" value={formData.venue} onChange={handleInputChange} className="w-full border-b border-gray-300 py-1 focus:outline-none focus:border-blue-500 bg-transparent"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Registration Link</label>
                    <input name="registration_link" value={formData.registration_link} onChange={handleInputChange} className="w-full border-b border-gray-300 py-1 focus:outline-none focus:border-blue-500 bg-transparent"/>
                  </div>
                  
                  {/* More fields hidden behind a summary for space, or just scrollable */}
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <button 
                      onClick={handleRegeneratePackage}
                      disabled={loading}
                      className="w-full bg-indigo-50 text-indigo-700 py-2 rounded-md font-semibold hover:bg-indigo-100 transition flex items-center justify-center disabled:opacity-50"
                    >
                      {loading ? <><RefreshCw className="animate-spin mr-2" size={16}/> Regenerating...</> : <><RefreshCw className="mr-2" size={16}/> Regenerate Package</>}
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">Update fields above and regenerate</p>
                  </div>
                </div>
              </div>
              
              {/* Consistency Status Card */}
              {consistencyResult && (
                <div className={`rounded-xl p-5 border ${consistencyResult.status === 'pass' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <h3 className={`text-lg font-bold flex items-center mb-3 ${consistencyResult.status === 'pass' ? 'text-green-800' : 'text-amber-800'}`}>
                    {consistencyResult.status === 'pass' ? <CheckCircle className="mr-2"/> : <AlertTriangle className="mr-2"/>}
                    Consistency Check
                  </h3>
                  
                  {consistencyResult.status === 'pass' ? (
                    <p className="text-sm text-green-700">All critical event details match across the generated package!</p>
                  ) : (
                    <div>
                      <p className="text-sm text-amber-700 mb-3 font-medium">Mismatches detected in AI content:</p>
                      <ul className="space-y-2">
                        {consistencyResult.mismatches?.map((m, i) => (
                          <li key={i} className="text-xs bg-white p-2 rounded border border-amber-100 text-gray-800">
                            <strong>{m.field}</strong> in <em>{m.section}</em><br/>
                            <span className="text-red-600 line-through">Found: {m.found}</span><br/>
                            <span className="text-green-600">Expected: {m.expected}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: AI Generated Package */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Event Concept */}
              {currentEvent.generated_package?.event_concept && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Event Concept</h2>
                  </div>
                  <div className="space-y-4 text-gray-700">
                    <div><strong className="text-gray-900 block mb-1">Summary</strong>{currentEvent.generated_package.event_concept.summary}</div>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div><strong className="text-gray-900 block mb-1">Purpose</strong>{currentEvent.generated_package.event_concept.purpose}</div>
                      <div><strong className="text-gray-900 block mb-1">Audience</strong>{currentEvent.generated_package.event_concept.audience}</div>
                    </div>
                    <div><strong className="text-gray-900 block mb-1 text-blue-700">Value Proposition</strong>{currentEvent.generated_package.event_concept.value_proposition}</div>
                  </div>
                </div>
              )}

              {/* Agenda */}
              {currentEvent.generated_package?.agenda && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Agenda</h2>
                  <div className="space-y-3">
                    {currentEvent.generated_package.agenda.map((item, i) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-4 border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                        <div className="sm:w-1/4 font-semibold text-blue-600 shrink-0">{item.time}</div>
                        <div className="sm:w-3/4">
                          <strong className="text-gray-900 block">{item.activity}</strong>
                          <span className="text-sm text-gray-600">{item.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Checklist & Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentEvent.generated_package?.organizer_checklist && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Organizer Checklist</h2>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                      {currentEvent.generated_package.organizer_checklist.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {currentEvent.generated_package?.participant_instructions && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Participant Instructions</h2>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                      {currentEvent.generated_package.participant_instructions.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Communication */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Communication Assets</h2>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-lg text-gray-800">Email Announcement</h3>
                      <button onClick={() => copyToClipboard(currentEvent.generated_package?.email)} className="text-gray-500 hover:text-blue-600 text-sm flex items-center"><Copy size={14} className="mr-1"/> Copy</button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm text-gray-700 border border-gray-100">
                      {currentEvent.generated_package?.email || 'N/A'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-lg text-gray-800">Short Invitation</h3>
                      <button onClick={() => copyToClipboard(currentEvent.generated_package?.invitation)} className="text-gray-500 hover:text-blue-600 text-sm flex items-center"><Copy size={14} className="mr-1"/> Copy</button>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg whitespace-pre-wrap text-sm text-blue-900 border border-blue-100">
                      {currentEvent.generated_package?.invitation || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media & Promotion */}
              {currentEvent.generated_package?.social_media && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Social Media</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-bold text-pink-600 mb-2 flex justify-between">Instagram <button onClick={() => copyToClipboard(currentEvent.generated_package.social_media.instagram)} className="text-gray-400 hover:text-pink-600"><Copy size={14}/></button></h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentEvent.generated_package.social_media.instagram}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-bold text-blue-700 mb-2 flex justify-between">LinkedIn <button onClick={() => copyToClipboard(currentEvent.generated_package.social_media.linkedin)} className="text-gray-400 hover:text-blue-700"><Copy size={14}/></button></h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentEvent.generated_package.social_media.linkedin}</p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-2">Hashtags</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentEvent.generated_package.social_media.hashtags?.map((tag, i) => (
                        <span key={i} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">{tag.startsWith('#') ? tag : `#${tag}`}</span>
                      ))}
                    </div>
                  </div>
                  
                  {currentEvent.generated_package?.promotion_campaign && (
                    <div className="mt-6 border-t pt-6">
                      <h3 className="font-semibold text-lg text-gray-800 mb-4">Promotion Campaign Timeline</h3>
                      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                        {currentEvent.generated_package.promotion_campaign.map((step, i) => (
                          <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-100 text-blue-600 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-xs">
                              {i+1}
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                              <div className="font-bold text-gray-900 mb-1">{step.day}</div>
                              <div className="text-sm text-gray-600 font-medium mb-1">Goal: {step.purpose}</div>
                              <div className="text-xs text-gray-500">{step.content}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Poster Generation */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Promotional Poster</h2>
                <p className="text-gray-500 mb-6 text-sm">Generate an AI image based on your event brief</p>
                
                {currentEvent.poster_reference ? (
                  <div className="mb-6">
                    <img src={currentEvent.poster_reference} alt="Event Poster" className="max-h-96 mx-auto rounded-lg shadow-md border border-gray-200 object-contain" />
                    <div className="mt-4 flex justify-center gap-4">
                      <a href={currentEvent.poster_reference} download={`${currentEvent.event_name.replace(/\s+/g, '_')}_poster.jpg`} className="text-blue-600 hover:underline text-sm font-medium">Download</a>
                      <button onClick={handleGeneratePoster} disabled={loadingPoster} className="text-gray-500 hover:text-gray-800 text-sm font-medium disabled:opacity-50">Regenerate</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleGeneratePoster}
                    disabled={loadingPoster}
                    className="mx-auto bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition flex items-center disabled:opacity-50"
                  >
                    {loadingPoster ? <><RefreshCw className="animate-spin mr-2" size={20}/> Generating AI Poster...</> : <><ImageIcon className="mr-2" size={20}/> Generate AI Poster</>}
                  </button>
                )}
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
