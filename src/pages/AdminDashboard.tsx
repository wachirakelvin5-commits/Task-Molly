import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Users, 
  Briefcase, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  DollarSign,
  Clock,
  Layers,
  ChevronRight,
  Filter,
  Download,
  Calendar,
  X,
  FileText,
  Table,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
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
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, subDays, isWithinInterval } from 'date-fns';
import { useDeviceType } from '../hooks/useDeviceType';

// Superset-inspired color palette
const COLORS = ['#FFC700', '#2D3142', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6'];

const REVENUE_DATA = [
  { name: 'Mon', revenue: 4000, tasks: 24 },
  { name: 'Tue', revenue: 3000, tasks: 18 },
  { name: 'Wed', revenue: 2000, tasks: 22 },
  { name: 'Thu', revenue: 2780, tasks: 30 },
  { name: 'Fri', revenue: 1890, tasks: 42 },
  { name: 'Sat', revenue: 2390, tasks: 35 },
  { name: 'Sun', revenue: 3490, tasks: 48 },
];

const CATEGORY_DATA = [
  { name: 'Cleaning', value: 400 },
  { name: 'Electrical', value: 300 },
  { name: 'Plumbing', value: 300 },
  { name: 'Moving', value: 200 },
  { name: 'Laundry', value: 150 },
];

export default function AdminDashboard() {
  const { isPhone } = useDeviceType();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [showExportModal, setShowExportModal] = useState(false);
  const [stats, setStats] = useState({
    liveTasks: 0,
    requestedUnassigned: 0,
    completedValue: 0,
    onlineProviders: 14,
    complaintsCount: 0
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Listen for complaints
    const qComplaints = query(collection(db, 'complaints'), where('status', '==', 'new'));
    const unsubComplaints = onSnapshot(qComplaints, (snap) => {
      setStats(prev => ({ ...prev, complaintsCount: snap.size }));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'complaints');
    });

    // Listen for service requests (KPIs)
    const qRequests = query(collection(db, 'serviceRequests'));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      const all = snap.docs.map(doc => doc.data());
      const live = all.filter(r => r.status === 'assigned' || r.status === 'in-progress').length;
      const pending = all.filter(r => r.status === 'pending').length;
      const completedValue = all.filter(r => r.status === 'completed')
                               .reduce((sum, r) => sum + (r.clientPrice || 0), 0);
      
      setStats(prev => ({
        ...prev,
        liveTasks: live,
        requestedUnassigned: pending,
        completedValue: completedValue
      }));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'serviceRequests');
    });

    return () => {
      unsubComplaints();
      unsubRequests();
    };
  }, []);

  const handleClearFilters = () => {
    setStartDate(subDays(new Date(), 7));
    setEndDate(new Date());
  };

  const exportData = (formatType: 'csv' | 'xlsx' | 'pdf') => {
    const dataToExport = [
      ...METRICS.map(m => ({ Metric: m.label, Value: m.value, Change: m.change })),
      ...CATEGORY_DATA.map(c => ({ Category: c.name, Value: c.value }))
    ];

    const fileName = `Dashboard_Report_${format(new Date(), 'yyyy-MM-dd')}`;

    if (formatType === 'csv') {
      const headers = Object.keys(dataToExport[0]).join(',');
      const rows = dataToExport.map(obj => Object.values(obj).join(',')).join('\n');
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (formatType === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dashboard Data");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else if (formatType === 'pdf') {
      const doc = new jsPDF() as any;
      doc.setFontSize(20);
      doc.text("Executive Dashboard Report", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 30);
      doc.text(`Period: ${format(startDate!, 'PP')} - ${format(endDate!, 'PP')}`, 14, 37);

      (doc as any).autoTable({
        startY: 45,
        head: [['Label', 'Value', 'Trend']],
        body: METRICS.map(m => [m.label, m.value, m.change]),
        theme: 'striped',
        headStyles: { fillStyle: '#2D3142' }
      });

      doc.save(`${fileName}.pdf`);
    }
    setShowExportModal(false);
  };

  const METRICS = [
    { 
      label: 'Gross Volume', 
      value: `KES ${stats.completedValue.toLocaleString()}`, 
      change: '+18.2%',
      isPositive: true,
      icon: DollarSign, 
      color: 'text-green-600', 
      bg: 'bg-green-50/50',
    },
    { 
      label: 'Live Operations', 
      value: stats.liveTasks, 
      change: 'Active Now',
      isPositive: true,
      icon: Briefcase, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50/50',
    },
    { 
      label: 'Unassigned Tasks', 
      value: stats.requestedUnassigned, 
      change: stats.requestedUnassigned > 0 ? 'Action Needed' : 'Normal',
      isPositive: false,
      icon: Activity, 
      color: 'text-accent-gold', 
      bg: 'bg-accent-gold/5',
    },
    { 
      label: 'Pending Cases', 
      value: stats.complaintsCount, 
      change: stats.complaintsCount > 0 ? 'Resolution Req.' : 'All clear',
      isPositive: false,
      icon: AlertTriangle, 
      color: 'text-red-600', 
      bg: 'bg-red-50/50',
      link: '/admin-complaints'
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F0F2F5] pt-24 pb-20">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10">
          <div>
            <div className="flex items-center gap-2 text-rich-black/40 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 md:mb-2">
              <ShieldCheck size={isPhone ? 10 : 12} className="text-accent-gold" />
              Monitoring
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-rich-black tracking-tighter">
              Admin <span className="text-accent-gold">Dashboard</span>
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="relative z-20 flex-1 sm:flex-initial">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  const [start, end] = update;
                  setStartDate(start);
                  setEndDate(end);
                }}
                customInput={
                  <button className="w-full flex items-center justify-center gap-2 bg-white border border-warm-gray px-3 md:px-4 py-2 md:py-2.5 rounded-xl hover:border-accent-gold transition-all font-bold text-[9px] md:text-[10px] uppercase tracking-widest text-rich-black shadow-sm group">
                    <Calendar size={14} className="text-accent-gold group-hover:scale-110 transition-transform" /> 
                    {startDate && endDate 
                      ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}` 
                      : 'Date Range'}
                  </button>
                }
                shouldCloseOnSelect={true}
                popperPlacement="bottom-end"
                popperClassName="custom-datepicker-popper"
              />
            </div>
            
            <button 
              onClick={handleClearFilters}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white border border-warm-gray px-3 md:px-4 py-2 md:py-2.5 rounded-xl hover:bg-primary-bg transition-all font-bold text-[9px] md:text-[10px] uppercase tracking-widest text-rich-black shadow-sm"
            >
              <X size={14} className="text-red-500" />
              <span className="hidden sm:inline">Clear Filters</span>
              <span className="sm:hidden">Reset</span>
            </button>
            
            <button 
              onClick={() => setShowExportModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rich-black text-white px-4 md:px-5 py-2.5 rounded-xl hover:bg-rich-black/90 transition-all font-bold text-[9px] md:text-[10px] uppercase tracking-widest shadow-lg shadow-rich-black/20"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showExportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-rich-black/40 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-primary-bg rounded-full transition-colors"
                >
                  <X size={20} className="text-rich-black/40" />
                </button>

                <div className="mb-8 text-center sm:text-left">
                  <h3 className="text-xl font-black text-rich-black">Export Analytics</h3>
                  <p className="text-xs text-rich-black/40 font-medium mt-1">Select your preferred document format</p>
                </div>

                <div className="grid gap-4">
                  {[
                    { id: 'csv', label: 'CSV Spreadsheet', desc: 'Raw data for Excel/Numbers', icon: Table, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { id: 'xlsx', label: 'Microsoft Excel', desc: 'Formatted XLSX workbook', icon: Layers, color: 'text-green-600', bg: 'bg-green-50' },
                    { id: 'pdf', label: 'PDF Report', desc: 'Printable executive summary', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' }
                  ].map((format) => (
                    <button
                      key={format.id}
                      onClick={() => exportData(format.id as any)}
                      className="flex items-center gap-4 p-5 border border-warm-gray rounded-2xl hover:border-accent-gold hover:bg-primary-bg transition-all group text-left"
                    >
                      <div className={`w-12 h-12 rounded-xl ${format.bg} ${format.color} flex items-center justify-center shrink-0`}>
                        <format.icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-rich-black">{format.label}</p>
                        <p className="text-[10px] text-rich-black/40 font-medium">{format.desc}</p>
                      </div>
                      <Download size={16} className="text-rich-black/20 group-hover:text-accent-gold transition-colors" />
                    </button>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-warm-gray/50 flex items-center gap-3 text-[10px] text-rich-black/30 font-bold uppercase tracking-widest justify-center">
                  <ShieldCheck size={14} className="text-green-500" /> Secure Data Transmission Verified
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => m.link && navigate(m.link)}
              className={`bg-white border border-warm-gray/60 rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-sm hover:shadow-xl hover:shadow-rich-black/5 transition-all cursor-pointer relative overflow-hidden group`}
            >
              <div className="flex flex-col-reverse sm:flex-row items-start justify-between relative z-10 gap-3">
                <div className="min-w-0">
                  <p className="text-rich-black/40 text-[8px] md:text-[10px] uppercase font-bold tracking-widest mb-0.5 md:mb-1 truncate">{m.label}</p>
                  <h3 className="text-lg md:text-2xl font-black text-rich-black truncate">{m.value}</h3>
                  <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
                    <span className={`text-[9px] md:text-[10px] font-bold ${m.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {m.change}
                    </span>
                    <span className="text-[9px] md:text-[10px] text-rich-black/20 font-medium">vs week</span>
                  </div>
                </div>
                <div className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl ${m.bg} ${m.color} transition-transform group-hover:scale-110 shrink-0`}>
                  <m.icon size={isPhone ? 18 : 24} />
                </div>
              </div>
              
              {/* Subtle sparkline-like background */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-warm-gray/10">
                <div className={`h-full ${m.isPositive ? 'bg-green-500' : 'bg-red-500'} opacity-20`} style={{ width: i === 0 ? '70%' : i === 1 ? '40%' : i === 2 ? '85%' : '20%' }} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Revenue Chart - Inspired by Superset's clean area charts */}
          <div className="lg:col-span-2 bg-white border border-warm-gray/60 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-rich-black">System Throughput</h3>
                <p className="text-[10px] text-rich-black/40 font-bold uppercase tracking-widest uppercase">Revenue & Task Volume (Daily)</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent-gold" />
                  <span className="text-[10px] font-bold text-rich-black/60">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rich-black" />
                  <span className="text-[10px] font-bold text-rich-black/60">Tasks</span>
                </div>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFC700" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FFC700" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#A0A0A0' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#A0A0A0' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#FFC700" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tasks" 
                    stroke="#2D3142" 
                    strokeWidth={4}
                    fill="none" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white border border-warm-gray/60 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-rich-black mb-1">Market Share</h3>
            <p className="text-[10px] text-rich-black/40 font-bold uppercase tracking-widest mb-8">By Service Category</p>
            
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CATEGORY_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {CATEGORY_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 mt-4">
              {CATEGORY_DATA.map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[11px] font-medium text-rich-black/60">{cat.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-rich-black">{Math.round((cat.value / 1350) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Operations Center */}
          <div className="bg-white border border-warm-gray/60 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-rich-black flex items-center gap-3">
                <Zap size={24} className="text-accent-gold" />
                Operations
              </h2>
              <button className="text-[10px] font-bold uppercase tracking-widest text-accent-gold hover:underline">Manage All</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Background Checks', count: 8, icon: ShieldCheck, color: 'text-green-600', sub: 'Pending approval' },
                { label: 'Dispute Resolution', count: 3, icon: AlertTriangle, color: 'text-amber-600', sub: 'High risk cases' },
                { label: 'Active Sessions', count: 142, icon: Activity, color: 'text-blue-600', sub: 'Concurrent users' },
                { label: 'Latency', count: '12ms', icon: Clock, color: 'text-purple-600', sub: 'System peak health' },
              ].map((op, i) => (
                <div key={i} className="p-5 border border-warm-gray rounded-2xl flex flex-col gap-3 group hover:border-accent-gold/50 transition-all cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl bg-primary-bg ${op.color} flex items-center justify-center`}>
                    <op.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rich-black">{op.label}</h4>
                    <p className="text-xl font-black text-rich-black my-1">{op.count}</p>
                    <p className="text-[9px] text-rich-black/30 uppercase font-bold tracking-wider">{op.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High Priority Alerts (Complaints) */}
          <div className="bg-white border border-warm-gray/60 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-rich-black">High Priority Alerts</h2>
              <Link to="/admin-complaints" className="text-[10px] font-bold uppercase tracking-widest text-accent-gold flex items-center gap-1 group">
                Resolution Center <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="space-y-4 flex-1">
              {[
                { title: 'Payment Dispute on Task #8292', reporter: 'Kevin W.', time: '22m ago', type: 'critical' },
                { title: 'Provider Late Cancellation', reporter: 'Sarah O.', time: '1h ago', type: 'warning' },
                { title: 'Verification Request - Pro Plumber', reporter: 'John D.', time: '3h ago', type: 'info' }
              ].map((alert, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-transparent hover:border-warm-gray hover:bg-primary-bg transition-all cursor-pointer group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    alert.type === 'critical' ? 'bg-red-50 text-red-500' : 
                    alert.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-rich-black truncate">{alert.title}</h4>
                    <p className="text-[10px] text-rich-black/40 font-medium">Reported by {alert.reporter} • {alert.time}</p>
                  </div>
                  <ChevronRight size={16} className="text-rich-black/20 group-hover:text-accent-gold transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Global Navigation Shortcut */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <Link to="/admin-analytics" className="px-8 py-4 bg-white border border-warm-gray rounded-2xl font-bold text-xs uppercase tracking-widest text-rich-black hover:border-accent-gold transition-all shadow-sm flex items-center gap-2">
            <Layers size={16} className="text-accent-gold" /> Explore Deep Analytics
          </Link>
          <Link to="/admin-complaints" className="px-8 py-4 bg-white border border-warm-gray rounded-2xl font-bold text-xs uppercase tracking-widest text-rich-black hover:border-accent-gold transition-all shadow-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Resolution Workflow
          </Link>
        </div>
      </div>
    </div>
  );
}
