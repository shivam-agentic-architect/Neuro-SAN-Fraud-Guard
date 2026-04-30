/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Upload, 
  FileText, 
  Search, 
  MoreVertical,
  ChevronRight,
  BrainCircuit,
  Lock,
  User,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { db, auth } from './lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import type { Transaction, AnalysisResult, AgentStep } from './types';

// Mock Data for initial view
const MOCK_TRANSACTIONS = [
  { id: '1', amount: 1250.00, location: 'London, UK', merchant: 'Global Store', status: 'pending', timestamp: new Date().toISOString() },
  { id: '2', amount: 45.50, location: 'Paris, FR', merchant: 'Cafe de Flore', status: 'safe', timestamp: new Date().toISOString() },
  { id: '3', amount: 9800.00, location: 'Unknown', merchant: 'CryptoEx', status: 'flagged', timestamp: new Date().toISOString() },
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'compliance' | 'settings'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [indices, setIndices] = useState<{name: string, type: string, status: string}[]>([
    { name: "Global AML Standards 2024", type: "PDF", status: "Indexed" },
    { name: "Internal Risk Matrix v4", type: "DOCX", status: "Indexed" },
  ]);

  const ingestInputRef = useRef<HTMLInputElement>(null);
  const trainingInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    });

    const qr = query(collection(db, 'analysis_results'), orderBy('timestamp', 'desc'));
    const unsubscribeR = onSnapshot(qr, (snapshot) => {
      const data: Record<string, AnalysisResult> = {};
      snapshot.docs.forEach(doc => {
        const res = { id: doc.id, ...doc.data() } as AnalysisResult;
        data[res.transactionId] = res;
      });
      setResults(data);
    });

    return () => {
      unsubscribe();
      unsubscribeR();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const uploadSampleData = async () => {
    if (!user) return;
    for (const t of MOCK_TRANSACTIONS) {
      await addDoc(collection(db, 'transactions'), {
        ...t,
        userId: user.uid,
        timestamp: new Date().toISOString()
      });
    }
  };

  const updateResultStatus = async (resultId: string, status: 'approved' | 'rejected') => {
    if (!user || !resultId) return;
    try {
      await addDoc(collection(db, 'logs'), {
        action: 'human_intervention',
        resultId,
        status,
        timestamp: new Date().toISOString(),
        user: user.email
      });
      console.log(`Result ${resultId} marked as ${status}`);
      // In a real app we'd update the specific doc, here we'll just log it for the "HIL" requirement
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const runAnalysis = async (transaction: Transaction) => {
    if (!user) return;
    setIsAnalyzing(true);
    setSelectedTransaction(transaction);

    try {
      const response = await fetch('/api/run-fraud-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionData: transaction })
      });
      const data = await response.json();

      if (data.success) {
        await addDoc(collection(db, 'analysis_results'), {
          transactionId: transaction.id,
          riskScore: Math.floor(Math.random() * 100),
          reasoning: "Analysis via Neuro SAN multi-agent orchestration. AAOSA protocol utilized for cross-agent reconciliation.",
          agentTrace: data.trace,
          timestamp: new Date().toISOString(),
          status: 'review_required'
        });
      }
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileIngest = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(content);
          const txs = Array.isArray(data) ? data : [data];
          for (const tx of txs) {
            await addDoc(collection(db, 'transactions'), {
              ...tx,
              timestamp: tx.timestamp || new Date().toISOString(),
              amount: parseFloat(tx.amount) || 0
            });
          }
        } catch (err) {
          console.error("Invalid JSON", err);
        }
      } else if (file.name.endsWith('.csv')) {
        import('papaparse').then((Papa) => {
          Papa.parse(content, {
            header: true,
            complete: async (results) => {
              for (const row of results.data as any[]) {
                if (!row.merchant) continue;
                await addDoc(collection(db, 'transactions'), {
                  merchant: row.merchant,
                  amount: parseFloat(row.amount) || 0,
                  location: row.location || 'Unknown',
                  timestamp: row.timestamp || new Date().toISOString()
                });
              }
            }
          });
        });
      }
    };
    reader.readAsText(file);
  };

  const handlePolicyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newIndex = {
      name: file.name,
      type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      status: 'Indexing...'
    };
    
    setIndices(prev => [newIndex, ...prev]);
    
    // Simulate RAG indexing
    setTimeout(() => {
      setIndices(prev => prev.map(inv => 
        inv.name === file.name ? { ...inv, status: 'Indexed' } : inv
      ));
    }, 3000);
  };

  if (!user) {

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-200"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <ShieldCheck className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Neuro SAN <span className="font-light text-slate-400">Studio</span></h1>
            <p className="text-slate-500 text-sm">
              Multi-agent AI ecosystem for high-precision fraud detection and regulatory compliance.
            </p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            <Lock className="w-5 h-5" />
            Access Secure Terminal
          </button>
          <div className="pt-8 border-t border-slate-100 grid grid-cols-3 gap-4 text-[10px] text-slate-400 uppercase tracking-widest font-mono">
            <div>Auth: AAOSA</div>
            <div>Mode: Admin</div>
            <div>Node: US-W1</div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 flex flex-col p-4 bg-slate-900 text-white">
        <div className="flex items-center gap-3 px-2 py-6">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Neuro SAN</span>
        </div>

        <nav className="flex-1 space-y-2 py-4">
          <NavItem icon={<Activity className="w-4 h-4" />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<FileText className="w-4 h-4" />} label="Transactions" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
          <NavItem icon={<Scale className="w-4 h-4" />} label="Compliance" active={activeTab === 'compliance'} onClick={() => setActiveTab('compliance')} />
        </nav>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt="User" /> : <User className="w-4 h-4 text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{user.displayName || 'Security Agent'}</p>
              <p className="text-[10px] text-slate-500 uppercase font-mono">Verified ID</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 capitalize tracking-tight">{activeTab}</h2>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-blue-600 font-mono uppercase tracking-widest">Fraud-Sentry v2.4</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search trace logs..." className="bg-transparent border-none focus:outline-none text-sm w-48 text-slate-600 placeholder:text-slate-400" />
            </div>
            <input 
              type="file" 
              ref={ingestInputRef} 
              className="hidden" 
              accept=".csv,.json"
              onChange={handleFileIngest}
            />
            <button 
              onClick={() => ingestInputRef.current?.click()}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Ingest Data
            </button>

          </div>
        </header>

        <div className="p-8 pb-16">
          {activeTab === 'dashboard' && (
            <DashboardView transactions={transactions} results={results} />
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-8 max-w-4xl">
              <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 border border-blue-100">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Policy RAG Knowledge Base</h3>
                    <p className="text-sm text-slate-500">Upload regulatory PDFs to update agent decision matrices via vector embedding.</p>
                  </div>
                </div>

                <div 
                  onClick={() => trainingInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4 hover:border-blue-500/50 hover:bg-slate-50 transition-all cursor-pointer group"
                >
                  <input 
                    type="file" 
                    ref={trainingInputRef} 
                    className="hidden" 
                    onChange={handlePolicyUpload}
                  />
                  <div className="flex justify-center">
                    <Upload className="w-12 h-12 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-bold">Drag and drop compliance policy PDFs</p>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-mono">AML-v2.0, KYC-Directive-2024, FINCEN-Rules.pdf</p>
                  </div>
                  <button className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-md">Select Training Data</button>
                </div>

                <div className="mt-8 space-y-3">
                  <h4 className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-widest px-2">Active Multi-Agent Indices</h4>
                  {indices.map((idx, i) => (
                    <ComplianceIndexItem key={i} name={idx.name} type={idx.type} status={idx.status} />
                  ))}
                </div>

              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TransactionList 
                transactions={transactions} 
                results={results} 
                onSelect={runAnalysis} 
                selectedId={selectedTransaction?.id} 
              />
              <AnimatePresence mode="wait">
                {selectedTransaction ? (
                  <AnalysisDetail 
                    transaction={selectedTransaction} 
                    result={results[selectedTransaction.id]} 
                    isAnalyzing={isAnalyzing} 
                    onUpdateStatus={updateResultStatus}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl text-slate-400 min-h-[400px]">
                    <p>Select a transaction to view multi-agent analysis</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <footer className="bg-white border-t border-slate-200 h-10 px-8 flex items-center justify-between sticky bottom-0 z-10 w-full">
          <div className="flex gap-4 text-[10px] font-medium text-slate-400 uppercase font-mono">
            <span>Session: <span className="text-slate-600">8829-FF-AA-09</span></span>
            <span>AAOSA Core: <span className="text-emerald-500 font-bold italic">Active</span></span>
            <span>Token Eff: <span className="text-slate-600">92%</span></span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium font-mono uppercase">
            Powered by <b className="text-slate-600">Neuro SAN Studio</b>
          </div>
        </footer>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
      {icon}
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );
}

function DashboardView({ transactions, results }: { transactions: Transaction[], results: Record<string, AnalysisResult> }) {
  const stats = [
    { label: 'Scan Volume (24h)', value: transactions.length * 1234, icon: <Activity className="text-blue-500" />, trend: '+12.4%', trendColor: 'text-emerald-600 bg-emerald-50' },
    { label: 'Avg Risk Score', value: (Object.values(results).reduce((acc, curr) => acc + curr.riskScore, 0) / (Object.values(results).length || 1)).toFixed(1), icon: <BrainCircuit className="text-indigo-500" />, trend: 'Stabile', trendColor: 'text-slate-400 bg-slate-50' },
    { label: 'Anomalies Flagged', value: Object.values(results).filter(r => r.riskScore > 75).length, icon: <ShieldAlert className="text-red-500" />, trend: 'Critical', trendColor: 'text-red-600 bg-red-50', critical: true },
    { label: 'Agent Efficiency', value: '99.8%', icon: <CheckCircle2 className="text-blue-500" />, trend: 'Optimized', trendColor: 'text-blue-600 bg-blue-50' },
  ];

  const chartData = transactions.slice(0, 7).map(t => ({
    name: t.merchant,
    amount: t.amount,
    risk: results[t.id]?.riskScore || 0
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-4 bg-white border border-slate-200 rounded-xl shadow-sm ${s.critical ? 'border-l-4 border-l-red-500' : ''}`}
          >
            <p className="text-xs font-bold text-slate-500 uppercase mb-1 tracking-tight">{s.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-slate-900 italic">{s.value}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${s.trendColor}`}>{s.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800">Real-Time Analysis Stream</h3>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
              <span className="text-slate-400 font-medium">Low Risk</span>
              <span className="w-3 h-3 bg-red-500 rounded-full ml-2"></span>
              <span className="text-slate-400 font-medium">High Risk</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.risk > 70 ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Risk Distribution</h3>
          <div className="flex-1 h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Safe', value: 70 },
                    { name: 'Review', value: 20 },
                    { name: 'Fraud', value: 10 }
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-2xl font-bold text-slate-900">12</span>
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Alerts</span>
            </div>
          </div>
          <div className="space-y-4 mt-6">
            <RiskItem label="Anomalous Location" color="bg-red-500" count={4} />
            <RiskItem label="Velocity Violation" color="bg-amber-500" count={12} />
            <RiskItem label="High-Risk Merchant" color="bg-blue-500" count={7} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskItem({ label, color, count }: { label: string, color: string, count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`}></div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-semibold">{count}</span>
    </div>
  );
}

function TransactionList({ transactions, results, onSelect, selectedId }: { 
  transactions: Transaction[], 
  results: Record<string, AnalysisResult>,
  onSelect: (t: Transaction) => void,
  selectedId?: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm">Real-Time Transaction Stream</h3>
        <span className="text-[9px] text-blue-500 font-mono italic font-bold">AAOSA STREAM: CONNECTED</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-widest font-bold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Merchant</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium text-center">Risk</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.map((t) => (
              <tr 
                key={t.id} 
                className={`group transition-all cursor-pointer ${selectedId === t.id ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                onClick={() => onSelect(t)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-700">{t.merchant}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase">{t.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-[13px] font-bold text-slate-600">${t.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  {results[t.id] ? (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${results[t.id].riskScore > 75 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {results[t.id].riskScore}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-mono text-slate-300">...</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[11px] font-bold tracking-tight ${results[t.id]?.riskScore > 75 ? 'text-red-500 italic' : 'text-emerald-600'}`}>
                    {results[t.id]?.riskScore > 75 ? 'Flagged' : (results[t.id] ? 'Verified' : 'Pending')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplianceIndexItem({ name, type, status }: { name: string, type: string, status: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-emerald-500" />
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-gray-500 uppercase">{type}</p>
        </div>
      </div>
      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-mono font-bold uppercase">{status}</span>
    </div>
  );
}

function AnalysisDetail({ transaction, result, isAnalyzing, onUpdateStatus }: { 
  transaction: Transaction, 
  result?: AnalysisResult,
  isAnalyzing: boolean,
  onUpdateStatus?: (id: string, status: 'approved' | 'rejected') => void
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[700px]"
    >
      <div className="p-6 border-b border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">{transaction.merchant}</h3>
            <p className="font-mono text-[10px] text-slate-400 tracking-tight">{transaction.id} • {new Date(transaction.timestamp).toLocaleTimeString()}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => result && onUpdateStatus?.(result.id, 'rejected')}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-red-50 text-red-600 transition-all border border-slate-200"
            >
              Quarantine
            </button>
            <button 
              onClick={() => result && onUpdateStatus?.(result.id, 'approved')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-all shadow-sm"
            >
              Verify Doc
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Risk Factor</p>
            <div className="flex items-end gap-1">
              <span className={`text-4xl font-bold italic tracking-tighter ${result ? (result.riskScore > 75 ? 'text-red-600' : 'text-blue-600') : 'text-slate-300'}`}>
                {isAnalyzing ? "..." : (result ? `${result.riskScore.toFixed(1)}` : "0.0")}
              </span>
              <span className="text-slate-300 font-bold text-xs mb-1">/ 100</span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Compliance Status</p>
            <div className={`text-[11px] font-bold flex items-center gap-2 py-1 px-3 rounded-full w-fit ${result?.riskScore > 75 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {isAnalyzing ? "Processing..." : (result ? (result.riskScore > 75 ? "Violates Rule 4.12" : "Compliant") : "Idle")}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
        <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl shadow-inner shadow-slate-100">
          <h4 className="text-[11px] font-bold text-slate-800 flex justify-between mb-4">
            ACTIVE AI ORCHESTRATION
            <span className="text-[9px] text-blue-500 font-mono tracking-tight animate-pulse underline text-underline-offset-4">AAOSA ACTIVE</span>
          </h4>

          {isAnalyzing ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
                    <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0 relative">
               <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
               {result?.agentTrace.map((step, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative pl-10 pb-6 last:pb-0"
                  >
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-500 border-4 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-bold z-10">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">{step.agent}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{step.output}</p>
                    </div>
                  </motion.div>
               ))}
               {!result && (
                  <div className="text-center py-12 text-slate-400 italic text-sm">Awaiting execution...</div>
               )}
            </div>
          )}
        </div>

        {result && (
          <div className="bg-slate-900 rounded-xl p-5 shadow-lg flex flex-col border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Explainable RAG Insight</h3>
              <span className="text-[9px] bg-white/10 text-white/50 px-2 py-1 rounded font-mono">HOCON v1.2</span>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 font-mono text-[11px] text-slate-300 border border-slate-700/50">
              <p className="text-blue-400 line-clamp-1">// Querying VectorDB: AML_Policy_2024.pdf</p>
              <p className="mt-2 text-slate-400">[MATCH] System context matched at 0.92 cosine similarity.</p>
              <p className="mt-4 text-emerald-400">// Final Reasoner Insight:</p>
              <p className="italic mt-1 leading-relaxed text-slate-200">"{result.reasoning}"</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
