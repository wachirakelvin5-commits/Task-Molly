import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  Smartphone, 
  Globe, 
  Eye, 
  MessageSquare, 
  Users, 
  Search,
  ChevronLeft,
  Mail,
  Phone,
  Fingerprint,
  TrendingUp,
  FileText,
  MousePointer2,
  Share2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useDeviceType } from '../hooks/useDeviceType';

const VISITOR_FLOW = [
  { time: '00:00', visitors: 120, bounce: 40 },
  { time: '04:00', visitors: 80, bounce: 30 },
  { time: '08:00', visitors: 450, bounce: 120 },
  { time: '12:00', visitors: 890, bounce: 210 },
  { time: '16:00', visitors: 1200, bounce: 300 },
  { time: '20:00', visitors: 950, bounce: 250 },
  { time: '23:59', visitors: 400, bounce: 100 },
];

const DEVICE_DATA = [
  { name: 'Mobile', value: 75 },
  { name: 'Desktop', value: 20 },
  { name: 'Tablet', value: 5 },
];

const COLORS = ['#FFC700', '#2D3142', '#EF4444'];

export default function AdminAnalytics() {
  const { isPhone } = useDeviceType();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [topArticles, setTopArticles] = useState([
    { title: 'The Future of Home Maintenance', views: 1240, change: '+15%' },
    { title: 'Choosing the Right Plumber', views: 890, change: '+8%' },
    { title: 'Clean Home, Clean Mind', views: 760, change: '-2%' }
  ]);
  const [topForumTopics, setTopForumTopics] = useState([
    { topic: 'Nairobi Water Crisis', comments: 156, uniqueUsers: 42 },
    { topic: 'Budget-friendly Fundis', comments: 89, uniqueUsers: 31 },
    { topic: 'Security Tips', comments: 64, uniqueUsers: 18 }
  ]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'analytics'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'analytics');
    });
    return () => unsubscribe();
  }, []);

  const totalVisits = 4520;
  const uniqueVisitors = 1240;

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FA] pt-16 md:pt-24 px-4 md:px-8 pb-16 md:pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-12">
          <button 
            onClick={() => navigate('/admin-dashboard')} 
            className="p-3 md:p-4 bg-white border border-warm-gray rounded-2xl md:rounded-[1.5rem] hover:bg-primary-bg transition-all shadow-sm group"
          >
            <ChevronLeft size={isPhone ? 20 : 24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-rich-black tracking-tighter italic">
              System <span className="text-accent-gold">Analytics</span>
            </h1>
            <p className="text-rich-black/40 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 md:mt-1">Engagement & Behavioral insights</p>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
          {[
            { label: 'Sessions', val: totalVisits, icon: Globe, color: 'text-blue-600', trend: '+14%' },
            { label: 'Uniques', val: uniqueVisitors, icon: Users, color: 'text-purple-600', trend: '+8%' },
            { label: 'Engage', val: '84.2%', icon: MousePointer2, color: 'text-accent-gold', trend: '+2%' },
            { label: 'Attention', val: '4m 12s', icon: Clock, color: 'text-green-600', trend: '-10s' }
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-warm-gray shadow-sm group hover:shadow-xl hover:shadow-rich-black/5 transition-all"
            >
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl bg-primary-bg ${s.color}`}>
                  <s.icon size={isPhone ? 16 : 24} />
                </div>
                <span className={`text-[8px] md:text-[10px] font-black ${s.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {s.trend}
                </span>
              </div>
              <h3 className="text-rich-black/30 text-[8px] md:text-[10px] font-bold uppercase tracking-widest">{s.label}</h3>
              <p className="text-lg md:text-3xl font-black mt-0.5 md:mt-1 text-rich-black tracking-tight">{s.val}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">
          {/* Traffic Intensity Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl md:rounded-[3rem] border border-warm-gray p-6 md:p-10 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-10 gap-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-rich-black">Traffic Intensity</h3>
                <p className="text-[9px] md:text-[10px] text-rich-black/40 font-bold uppercase tracking-widest">24h Real-time User Flow</p>
              </div>
              <div className="flex items-center gap-4 md:gap-6">
                 <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-accent-gold" />
                  <span className="text-[9px] md:text-[10px] font-bold text-rich-black/60 whitespace-nowrap">Active Visitors</span>
                </div>
                 <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-rich-black/10" />
                  <span className="text-[9px] md:text-[10px] font-bold text-rich-black/60 whitespace-nowrap">Bounce</span>
                </div>
              </div>
            </div>

            <div className="h-[250px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={VISITOR_FLOW}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#A0A0A0' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#A0A0A0' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: 'none', 
                      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                      fontWeight: '800'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="visitors" 
                    stroke="#FFC700" 
                    strokeWidth={6} 
                    dot={false}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bounce" 
                    stroke="#2D3142" 
                    strokeWidth={4} 
                    strokeOpacity={0.1}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Mix */}
          <div className="bg-white rounded-[3rem] border border-warm-gray p-10 shadow-sm flex flex-col">
            <h3 className="text-xl font-black text-rich-black">Device Mix</h3>
            <p className="text-[10px] text-rich-black/40 font-bold uppercase tracking-widest mb-10">Platform Distribution</p>
            
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DEVICE_DATA}
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={10}
                    dataKey="value"
                  >
                    {DEVICE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4 mt-8">
              {DEVICE_DATA.map((dev, i) => (
                <div key={dev.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-md" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-bold text-rich-black/60 uppercase tracking-widest">{dev.name}</span>
                  </div>
                  <span className="text-sm font-black text-rich-black">{dev.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Content Ranking */}
          <div className="bg-white rounded-[3rem] border border-warm-gray p-10 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-rich-black/30 mb-8 flex items-center gap-3">
              <FileText size={20} className="text-accent-gold" /> Engagement Leaderboard
            </h3>
            <div className="space-y-8">
              {topArticles.map((a, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-rich-black truncate group-hover:text-accent-gold transition-colors">{a.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-rich-black/40 font-bold uppercase tracking-tighter bg-primary-bg px-2 py-0.5 rounded-full">{a.views} Sessions</span>
                      <span className="text-[9px] text-green-500 font-black italic">{a.change} Velocity</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-warm-gray group-hover:text-accent-gold transition-all group-hover:translate-x-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Social Sentiment (Hot Topics) */}
          <div className="bg-white rounded-[3rem] border border-warm-gray p-10 shadow-sm">
             <h3 className="text-sm font-bold uppercase tracking-widest text-rich-black/30 mb-8 flex items-center gap-3">
              <MessageSquare size={20} className="text-accent-gold" /> Sentiment Analysis
            </h3>
            <div className="space-y-8">
              {topForumTopics.map((t, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-rich-black truncate group-hover:text-accent-gold transition-colors">{t.topic}</p>
                    <p className="text-[9px] text-rich-black/40 font-bold uppercase mt-1">
                      {t.comments} Reactions • {t.uniqueUsers} Participants
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-accent-gold/5 text-accent-gold flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                    <Share2 size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LIVE RAW FEED */}
          <div className="bg-white rounded-[3rem] border border-warm-gray p-10 shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-widest text-rich-black/30 mb-8 flex items-center gap-3">
              <Smartphone size={20} className="text-accent-gold" /> Live Identity Pulse
            </h3>
            <div className="space-y-6 flex-1 overflow-y-auto pr-4 no-scrollbar">
              {events.map((e) => (
                <div key={e.id} className="border-l-4 border-accent-gold/20 pl-6 py-2 group hover:border-accent-gold transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-rich-black uppercase tracking-widest">{e.type}</p>
                    <span className="text-[9px] text-rich-black/30 font-bold">{new Date(e.timestamp?.toDate()).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[10px] text-rich-black/60 font-medium truncate italic">{e.page}</p>
                  {e.visitorInfo && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {e.visitorInfo.email && <div className="flex items-center gap-1.5 text-[8px] bg-primary-bg px-2.5 py-1 rounded-lg font-black text-rich-black tracking-widest border border-warm-gray/50 hover:bg-white transition-colors cursor-default"><Mail size={10} className="text-accent-gold" /> IDENTITY</div>}
                      <div className="flex items-center gap-1.5 text-[8px] bg-primary-bg px-2.5 py-1 rounded-lg font-black text-rich-black tracking-widest border border-warm-gray/50 hover:bg-white transition-colors cursor-default">
                        <Fingerprint size={10} className="text-accent-gold" /> {e.visitorInfo.deviceId?.slice(-6).toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-20 text-rich-black/20 italic font-bold text-xs uppercase tracking-widest">Waiting for secure event stream...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
