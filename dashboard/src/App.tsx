import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Brain, 
  Clock, 
  Activity, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  Plus, 
  Play, 
  Flame, 
  Layers,
  Copy,
  Check,
  Server,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';

// Type definitions
interface Stats {
  totalWrites: number;
  totalLoads: number;
  totalSessions: number;
  avgLatency: number;
  successRate: number;
  tokenCount: number;
  providersUsage: Array<{ provider: string; count: number }>;
  providerStatuses: Record<string, boolean>;
}

interface LogEntry {
  id: number;
  timestamp: string;
  action: 'write' | 'load';
  session_id: string;
  provider: string;
  payload_size: number;
  latency_ms: number;
  success: number;
  error_message: string | null;
}

interface SessionEntry {
  sessionId: string;
  memoryCount: number;
  lastActive: string;
}

interface MemorySearchResult {
  id: string;
  sessionId: string;
  content: string;
  metadata?: Record<string, any>;
  score: number;
  timestamp: string;
}

const Logo = ({ className = "h-6 w-6", useGradient = true }: { className?: string; useGradient?: boolean }) => (
  <svg 
    className={className} 
    viewBox="0 0 482 434" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {useGradient && (
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#90a0c8" />
          <stop offset="35%" stopColor="#c090b0" />
          <stop offset="70%" stopColor="#e898a0" />
          <stop offset="100%" stopColor="#f0c0b0" />
        </linearGradient>
      </defs>
    )}
    <path 
      fill={useGradient ? "url(#logo-grad)" : "currentColor"} 
      d="M120.616997,56.645466 C125.766205,53.629444 130.607178,50.810902 136.194901,47.557587 C136.194901,50.260227 136.194397,52.034187 136.194977,53.808147 C136.211151,102.967300 136.369705,152.127274 136.087112,201.284698 C136.045715,208.485321 138.157288,213.239304 144.339508,216.804565 C150.336395,220.262909 155.958832,224.370575 162.565186,228.734390 C162.565186,184.262466 162.565186,140.708893 162.565186,96.133888 C169.123718,99.918182 174.847290,103.157661 180.510269,106.499817 C199.145767,117.498070 217.836395,128.406876 236.320786,139.654144 C240.354034,142.108276 243.290726,141.768204 247.130661,139.456833 C270.090088,125.637001 293.183594,112.039841 316.239685,98.380798 C317.178101,97.824875 318.192657,97.397461 319.773376,96.610725 C319.773376,140.820389 319.773376,184.383392 319.773376,229.486023 C328.696625,223.272354 336.790283,217.950562 344.430878,212.042831 C345.906403,210.901947 346.052399,207.470169 346.062347,205.092041 C346.186462,175.430420 346.178253,145.768234 346.191467,116.106186 C346.200867,94.942734 346.191315,73.779282 346.190277,52.615829 C346.190186,51.179771 346.190247,49.743713 346.190247,47.428768 C348.707642,48.811840 350.564392,49.770630 352.362427,50.829109 C374.739105,64.001801 397.026276,77.329796 419.532928,90.276253 C425.366791,93.632057 427.471527,97.576416 427.411133,104.484085 C427.033661,147.640900 427.162323,190.802811 427.304962,233.962448 C427.319000,238.214752 425.976593,241.028793 422.767273,243.761353 C397.654907,265.143341 372.680084,286.686890 347.669800,308.188721 C346.036011,309.593323 344.460266,311.065430 342.269592,313.034637 C370.230469,340.208893 398.002808,367.199951 426.350861,394.750519 C424.558685,394.975708 423.377197,395.251709 422.195160,395.254211 C381.701538,395.339600 341.207489,395.330505 300.714630,395.543457 C295.258179,395.572144 291.666016,393.046875 288.289612,389.341766 C273.814819,373.457672 259.279846,357.628448 244.764709,341.781128 C243.756821,340.680725 242.732025,339.595825 241.350555,338.112213 C233.327332,346.983795 225.469788,355.741272 217.534348,364.427582 C209.332886,373.405151 201.266708,382.524750 192.671585,391.111969 C190.364380,393.417084 186.354141,395.184875 183.111023,395.208771 C141.952698,395.512115 100.791695,395.452972 59.631371,395.474426 C58.850651,395.474854 58.069855,395.331848 56.336903,395.162933 C84.639114,367.526855 112.332680,340.485107 140.510666,312.970306 C132.165939,305.772797 124.273338,298.940887 116.354256,292.139771 C97.652779,276.078491 79.003189,259.955566 60.173672,244.045654 C56.539413,240.974915 55.025597,237.739090 55.043861,232.933929 C55.043861,232.933929 C55.211716,188.774582 55.193592,144.614227 55.065681,100.454636 C55.055191,96.831940 56.128471,94.695618 59.242100,92.876274 C79.648651,80.952431 99.963783,68.872139 120.616997,56.645466 M80.925140,138.499985 C80.923866,166.492844 80.991760,194.486084 80.840538,222.478134 C80.819824,226.312469 81.859543,229.043167 84.786247,231.539642 C101.385231,245.698639 117.883415,259.976074 134.384506,274.249512 C148.604385,286.549683 162.782272,298.898438 177.233093,311.446594 C157.892120,331.189911 138.856445,350.621552 119.894035,369.978424 C119.831932,369.947083 120.100533,370.201355 120.369102,370.201324 C138.696838,370.198486 157.025040,370.226471 175.351547,370.065460 C176.982819,370.051117 179.071793,369.229095 180.157883,368.052643 C194.946915,352.032684 209.596375,335.883911 224.947601,319.034393 C209.629807,302.838989 194.575775,286.869019 179.429047,270.987427 C177.846375,269.327972 175.747421,268.145203 173.833878,266.819397 C154.129379,253.166977 134.441223,239.490524 114.670403,225.934708 C111.824585,223.983505 110.486473,221.939407 110.501869,218.262894 C110.671448,177.774139 110.634804,137.284500 110.639244,96.795097 C110.639420,95.228981 110.490150,93.662842 110.369164,91.283470 C100.614525,96.822746 91.487556,101.893700 82.529167,107.246758 C81.510185,107.855652 81.018784,110.041634 80.995102,111.507851 C80.855125,120.170006 80.925819,128.835556 80.925140,138.499985 M285.964752,288.466583 C276.799652,298.739594 267.634552,309.012604 258.399445,319.364105 C272.496216,334.980591 286.258301,350.137939 299.898804,365.403992 C303.025543,368.903381 306.558289,370.313293 311.296051,370.244080 C326.951324,370.015381 342.612213,370.177429 358.270935,370.166626 C359.830994,370.165527 361.390930,370.007965 362.391022,369.953491 C343.724243,350.438812 325.037018,330.902771 306.185547,311.195038 C307.046570,310.382202 308.307465,309.092438 309.670044,307.920929 C321.916199,297.391968 334.202271,286.909393 346.433746,276.363434 C363.836212,261.359039 381.243744,246.359711 398.513092,231.203247 C400.055206,229.849823 401.468353,227.364883 401.479462,225.397232 C401.693146,187.417480 401.702515,149.436478 401.669647,111.455811 C401.668488,110.128265 401.201111,108.150955 400.270874,107.575119 C391.141052,101.923409 381.866730,96.505066 371.850281,90.555229 C371.850281,94.976364 371.849915,98.274231 371.850342,101.572098 C371.855499,140.385834 371.794189,179.199890 371.969543,218.012848 C371.986969,221.871887 370.654663,224.013214 367.625305,226.083710 C354.293030,235.195953 341.117493,244.537247 327.867981,253.770920 C313.132568,264.040100 297.753235,273.525146 285.964752,288.466583 M188.020432,190.500000 C188.029099,207.832596 187.973511,225.165802 188.138138,242.496918 C188.156143,244.391907 188.928772,246.785049 190.220032,248.082993 C200.890060,258.808228 211.885910,269.209869 222.533218,279.957031 C229.043640,286.528534 235.113983,293.536041 241.496414,300.472107 C249.098267,292.144257 256.185699,283.951996 263.740417,276.216125 C272.450897,267.296814 281.412231,258.602997 290.625916,250.207748 C293.077393,247.974045 294.266327,246.116089 294.256744,242.805664 C294.162354,210.140274 294.229919,177.474411 294.239838,144.808685 C294.240204,143.531906 294.122375,142.255081 294.028931,140.352875 C292.019653,141.391190 290.407135,142.116516 288.901459,143.019943 C278.481506,149.272110 268.154755,155.684235 257.632507,161.758163 C254.758453,163.417191 253.886765,165.248505 253.908112,168.477982 C254.064545,192.143021 254.008804,215.809448 254.019806,239.475449 C254.020554,241.091919 254.019913,242.708389 254.019913,244.525391 C245.296494,244.525391 237.097702,244.525391 228.500473,244.525391 C228.500473,242.526398 228.499191,240.880859 228.500656,239.235336 C228.521759,215.569458 228.474411,191.903091 228.648590,168.238342 C228.671265,165.158127 227.787247,163.490326 225.131927,161.940414 C214.063782,155.479965 203.150558,148.754364 192.160934,142.158676 C191.000839,141.462418 189.711929,140.980774 188.018982,140.180267 C188.018982,157.175903 188.018982,173.337952 188.020432,190.500000 z"
    />
    <path 
      fill={useGradient ? "url(#logo-grad)" : "currentColor"} 
      d="M319.871368,61.681137 C320.474060,65.545189 318.952698,67.544815 316.021240,69.296074 C292.314697,83.458351 268.664825,97.716621 245.089310,112.095802 C242.263321,113.819435 240.200180,113.681496 237.476120,112.020050 C213.900558,97.640938 190.271072,83.349693 166.592010,69.141655 C163.727905,67.423119 162.456223,65.524254 162.596329,62.034016 C162.901489,54.432674 162.690598,46.810619 162.690598,38.244038 C166.131104,40.176174 168.864334,41.622261 171.511475,43.211712 C193.187973,56.227158 214.921936,69.150032 236.445923,82.413483 C240.314560,84.797409 243.040298,84.510170 246.667267,82.302254 C269.400818,68.463264 292.245270,54.806458 315.060486,41.101826 C316.322418,40.343826 317.651123,39.697006 319.872375,38.501209 C319.872375,46.516209 319.872375,53.868885 319.871368,61.681137 z"
    />
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'connectors' | 'integrations' | 'logs' | 'playground'>('overview');
  
  // Dashboard data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Connectors Forms states
  const [pgConn, setPgConn] = useState('');
  const [pgTable, setPgTable] = useState('');
  const [pgDim, setPgDim] = useState('1536');
  const [redisUrl, setRedisUrl] = useState('');
  const [redisIndex, setRedisIndex] = useState('');
  const [redisDim, setRedisDim] = useState('1536');
  const [mem0Key, setMem0Key] = useState('');
  const [zepKey, setZepKey] = useState('');
  const [zepUrl, setZepUrl] = useState('');
  
  const [connectorStatusMsg, setConnectorStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Playground states
  const [testSessionId, setTestSessionId] = useState('agent-session-1');
  const [testContent, setTestContent] = useState('OpenAI key is sk-proj-1234567890abcdef1234567890abcdef and User SSN is 000-12-3456');
  const [testTtl, setTestTtl] = useState('');
  const [testWriteStatus, setTestWriteStatus] = useState<string | null>(null);
  
  // Session explorer states
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMemories, setSessionMemories] = useState<MemorySearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMemories, setLoadingMemories] = useState(false);

  // Copied helper state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Integration tab state
  const [activeIntegration, setActiveIntegration] = useState<'mcp' | 'api' | 'python' | 'node'>('mcp');

  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const baseUrl = window.location.origin;
      const host = baseUrl.includes('localhost:5173') ? 'http://localhost:16369' : baseUrl;

      const [statsRes, logsRes, sessionsRes, configRes] = await Promise.all([
        fetch(`${host}/api/dashboard/stats`).then(r => r.json()),
        fetch(`${host}/api/dashboard/history`).then(r => r.json()),
        fetch(`${host}/api/dashboard/sessions`).then(r => r.json()),
        fetch(`${host}/api/dashboard/config`).then(r => r.json())
      ]);

      setStats(statsRes);
      setLogs(logsRes);
      setSessions(sessionsRes);
      setConfig(configRes);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Connection to memox instance failed. Retrying...');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConnector = async (provider: 'postgres' | 'redis' | 'mem0' | 'zep', payload: any) => {
    setConnectorStatusMsg(null);
    try {
      const baseUrl = window.location.origin;
      const host = baseUrl.includes('localhost:5173') ? 'http://localhost:16369' : baseUrl;

      let body: any = {};
      if (provider === 'postgres') {
        body = { databases: { postgres: payload } };
      } else if (provider === 'redis') {
        body = { databases: { redis: payload } };
      } else if (provider === 'mem0') {
        body = { external: { mem0: payload } };
      } else if (provider === 'zep') {
        body = { external: { zep: payload } };
      }

      const res = await fetch(`${host}/api/dashboard/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        setConnectorStatusMsg({ type: 'success', text: `${provider.toUpperCase()} connector updated and reloaded!` });
        fetchDashboardData();
      } else {
        setConnectorStatusMsg({ type: 'error', text: data.error || 'Failed to update connector' });
      }
    } catch (err: any) {
      setConnectorStatusMsg({ type: 'error', text: err.message || String(err) });
    }
  };

  const executeWriteTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestWriteStatus('Processing payload...');
    try {
      const baseUrl = window.location.origin;
      const host = baseUrl.includes('localhost:5173') ? 'http://localhost:16369' : baseUrl;

      const res = await fetch(`${host}/v1/memory/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: testSessionId,
          content: testContent,
          ttl_seconds: testTtl ? parseInt(testTtl, 10) : undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestWriteStatus('Success: Memory scrubbed for PII and saved successfully!');
        setTestContent('');
        fetchDashboardData();
      } else {
        setTestWriteStatus(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setTestWriteStatus(`Error: ${err.message || err}`);
    }
  };

  const loadSessionMemories = async (sessionId: string, query = '') => {
    setSelectedSession(sessionId);
    setLoadingMemories(true);
    try {
      const baseUrl = window.location.origin;
      const host = baseUrl.includes('localhost:5173') ? 'http://localhost:16369' : baseUrl;

      const res = await fetch(`${host}/v1/memory/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          query,
          limit: 20
        })
      });
      const data = await res.json();
      setSessionMemories(data.memories || []);
    } catch (err) {
      console.error('Error loading memories for session:', err);
    } finally {
      setLoadingMemories(false);
    }
  };

  const chartData = stats?.providersUsage.map(p => ({
    name: p.provider.toUpperCase(),
    Requests: p.count
  })) || [];

  const latencyHistory = [...logs]
    .reverse()
    .slice(-12)
    .map((l, i) => ({
      idx: i + 1,
      Latency: l.latency_ms,
      Provider: l.provider
    }));

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans antialiased">
      {/* Shadcn Header */}
      <header className="border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Logo className="h-6 w-6 text-[#fafafa]" />
              <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#90a0c8] via-[#e898a0] to-[#f0c0b0] bg-clip-text text-transparent">memox portal</span>
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              <button 
                onClick={() => setActiveTab('overview')} 
                className={`text-xs font-medium transition-colors ${activeTab === 'overview' ? 'text-[#fafafa]' : 'text-[#a1a1aa] hover:text-[#fafafa]'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('connectors')} 
                className={`text-xs font-medium transition-colors ${activeTab === 'connectors' ? 'text-[#fafafa]' : 'text-[#a1a1aa] hover:text-[#fafafa]'}`}
              >
                Connectors
              </button>
              <button 
                onClick={() => setActiveTab('integrations')} 
                className={`text-xs font-medium transition-colors ${activeTab === 'integrations' ? 'text-[#fafafa]' : 'text-[#a1a1aa] hover:text-[#fafafa]'}`}
              >
                Integrations
              </button>
              <button 
                onClick={() => setActiveTab('logs')} 
                className={`text-xs font-medium transition-colors ${activeTab === 'logs' ? 'text-[#fafafa]' : 'text-[#a1a1aa] hover:text-[#fafafa]'}`}
              >
                Logs
              </button>
              <button 
                onClick={() => setActiveTab('playground')} 
                className={`text-xs font-medium transition-colors ${activeTab === 'playground' ? 'text-[#fafafa]' : 'text-[#a1a1aa] hover:text-[#fafafa]'}`}
              >
                Playground
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-[10px] font-mono text-[#a1a1aa] border border-[#27272a] rounded py-0.5 px-1.5 bg-[#18181b]">
              Local Instance
            </span>
            <div className={`h-2 w-2 rounded-full ${error ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <button 
              onClick={fetchDashboardData}
              className="p-1.5 hover:bg-[#18181b] rounded border border-[#27272a] transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#a1a1aa]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-8 flex flex-col gap-6">
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs py-3 px-4 rounded-lg flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !stats ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Logo className="h-12 w-12 text-[#fafafa] animate-pulse" />
              <RefreshCw className="h-4 w-4 animate-spin text-[#a1a1aa] absolute -bottom-1 -right-1 bg-[#09090b] rounded-full p-0.5" />
            </div>
            <span className="text-xs text-[#a1a1aa]">Reading memox instance logs...</span>
          </div>
        ) : (
          stats && (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Overview Dashboard</h2>
                    <p className="text-xs text-[#a1a1aa]">Real-time operational audit and memory routing latency metrics.</p>
                  </div>

                  {/* Shadcn KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#09090b] border border-[#90a0c8]/20 hover:border-[#90a0c8]/40 transition-colors rounded-lg p-6">
                      <div className="flex items-center justify-between space-y-0 pb-2">
                        <span className="text-xs font-medium text-[#a1a1aa]">Total Memory Writes</span>
                        <Plus className="h-4 w-4 text-[#90a0c8]" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-100">{stats.totalWrites}</div>
                      <p className="text-[10px] text-[#a1a1aa] mt-1">Stored payloads</p>
                    </div>

                    <div className="bg-[#09090b] border border-[#c090b0]/20 hover:border-[#c090b0]/40 transition-colors rounded-lg p-6">
                      <div className="flex items-center justify-between space-y-0 pb-2">
                        <span className="text-xs font-medium text-[#a1a1aa]">Memory Reads</span>
                        <Search className="h-4 w-4 text-[#c090b0]" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-100">{stats.totalLoads}</div>
                      <p className="text-[10px] text-[#a1a1aa] mt-1">Semantic vector lookups</p>
                    </div>

                    <div className="bg-[#09090b] border border-[#e898a0]/20 hover:border-[#e898a0]/40 transition-colors rounded-lg p-6">
                      <div className="flex items-center justify-between space-y-0 pb-2">
                        <span className="text-xs font-medium text-[#a1a1aa]">Subscription Sessions</span>
                        <Brain className="h-4 w-4 text-[#e898a0]" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-100">{stats.totalSessions}</div>
                      <p className="text-[10px] text-[#a1a1aa] mt-1">Active context channels</p>
                    </div>

                    <div className="bg-[#09090b] border border-[#f0c0b0]/20 hover:border-[#f0c0b0]/40 transition-colors rounded-lg p-6">
                      <div className="flex items-center justify-between space-y-0 pb-2">
                        <span className="text-xs font-medium text-[#a1a1aa]">Scrubbed Tokens</span>
                        <Flame className="h-4 w-4 text-[#f0c0b0]" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-[#f0c0b0]">{stats.tokenCount}</div>
                      <p className="text-[10px] text-[#a1a1aa] mt-1">Estimated compliance savings</p>
                    </div>
                  </div>

                  {/* Secondary stats row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Clock className="h-5 w-5 text-[#90a0c8]" />
                        <div>
                          <p className="text-xs font-medium text-[#a1a1aa]">Average Execution Latency</p>
                          <p className="text-lg font-bold font-mono">{stats.avgLatency} ms</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Activity className="h-5 w-5 text-[#e898a0]" />
                        <div>
                          <p className="text-xs font-medium text-[#a1a1aa]">Audit Routing Success Rate</p>
                          <p className="text-lg font-bold text-slate-100 font-mono">{stats.successRate}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recharts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
                      <h3 className="text-sm font-semibold mb-4">Operations Per Connector</h3>
                      {chartData.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-[#a1a1aa] text-xs">No logs compiled yet.</div>
                      ) : (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                              <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                              <YAxis stroke="#71717a" fontSize={11} />
                              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fafafa' }} />
                              <Bar dataKey="Requests" fill="#c090b0" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
                      <h3 className="text-sm font-semibold mb-4">Recent Latency Trend (ms)</h3>
                      {latencyHistory.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-[#a1a1aa] text-xs">No logs compiled yet.</div>
                      ) : (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={latencyHistory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                              <XAxis dataKey="idx" stroke="#71717a" fontSize={10} />
                              <YAxis stroke="#71717a" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fafafa' }} />
                              <Area type="monotone" dataKey="Latency" stroke="#e898a0" fillOpacity={0.15} fill="#90a0c8" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CONNECTORS TAB */}
              {activeTab === 'connectors' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Memory Connector Integrations</h2>
                    <p className="text-xs text-[#a1a1aa]">Setup database providers (pgvector, Redis) or external MaaS vendors (Mem0, Zep).</p>
                  </div>

                  {connectorStatusMsg && (
                    <div className={`text-xs py-2 px-4 rounded border ${
                      connectorStatusMsg.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {connectorStatusMsg.text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Postgres Vector */}
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Database className="h-5 w-5 text-blue-400" />
                            <span className="font-semibold text-sm">Postgres (pgvector)</span>
                          </div>
                          <span className={`text-[10px] py-0.5 px-2 rounded-full font-semibold ${
                            stats.providerStatuses['postgres'] 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-zinc-500/10 text-[#a1a1aa] border border-zinc-500/20'
                          }`}>
                            {stats.providerStatuses['postgres'] ? 'Active (Live)' : 'Mock Fallback'}
                          </span>
                        </div>
                        <p className="text-xs text-[#a1a1aa] mb-4">Store memory vectors natively in a Postgres database table using vector cosine similarity.</p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Connection URI</label>
                            <input 
                              type="password" 
                              placeholder={config?.databases?.postgres?.connectionString || "postgresql://user:pass@host:5432/db"} 
                              value={pgConn}
                              onChange={(e) => setPgConn(e.target.value)}
                              className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Table Name</label>
                              <input 
                                type="text" 
                                placeholder={config?.databases?.postgres?.tableName || "memox_memories"} 
                                value={pgTable}
                                onChange={(e) => setPgTable(e.target.value)}
                                className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Dimension</label>
                              <input 
                                type="number" 
                                placeholder={config?.databases?.postgres?.vectorDimension?.toString() || "1536"} 
                                value={pgDim}
                                onChange={(e) => setPgDim(e.target.value)}
                                className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleSaveConnector('postgres', { connectionString: pgConn, tableName: pgTable, vectorDimension: parseInt(pgDim, 10) })}
                        className="mt-6 bg-[#fafafa] text-[#09090b] font-medium text-xs py-2 px-4 rounded hover:bg-slate-200 transition-colors"
                      >
                        Save & Apply Postgres
                      </button>
                    </div>

                    {/* Redis Vector */}
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Server className="h-5 w-5 text-red-500" />
                            <span className="font-semibold text-sm">Redis (Vector Index)</span>
                          </div>
                          <span className={`text-[10px] py-0.5 px-2 rounded-full font-semibold ${
                            stats.providerStatuses['redis'] 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-zinc-500/10 text-[#a1a1aa] border border-zinc-500/20'
                          }`}>
                            {stats.providerStatuses['redis'] ? 'Active (Live)' : 'Mock Fallback'}
                          </span>
                        </div>
                        <p className="text-xs text-[#a1a1aa] mb-4">Store memory records in Redis using RediSearch Flat vector index distances.</p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Redis URL</label>
                            <input 
                              type="password" 
                              placeholder={config?.databases?.redis?.url || "redis://localhost:6379"} 
                              value={redisUrl}
                              onChange={(e) => setRedisUrl(e.target.value)}
                              className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Index Name</label>
                              <input 
                                type="text" 
                                placeholder={config?.databases?.redis?.indexName || "memox_idx"} 
                                value={redisIndex}
                                onChange={(e) => setRedisIndex(e.target.value)}
                                className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Dimension</label>
                              <input 
                                type="number" 
                                placeholder={config?.databases?.redis?.vectorDimension?.toString() || "1536"} 
                                value={redisDim}
                                onChange={(e) => setRedisDim(e.target.value)}
                                className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleSaveConnector('redis', { url: redisUrl, indexName: redisIndex, vectorDimension: parseInt(redisDim, 10) })}
                        className="mt-6 bg-[#fafafa] text-[#09090b] font-medium text-xs py-2 px-4 rounded hover:bg-slate-200 transition-colors"
                      >
                        Save & Apply Redis
                      </button>
                    </div>

                    {/* Mem0 */}
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Brain className="h-5 w-5 text-indigo-400" />
                            <span className="font-semibold text-sm">Mem0 (MaaS Vector Bridge)</span>
                          </div>
                          <span className={`text-[10px] py-0.5 px-2 rounded-full font-semibold ${
                            stats.providerStatuses['mem0'] 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-zinc-500/10 text-[#a1a1aa] border border-zinc-500/20'
                          }`}>
                            {stats.providerStatuses['mem0'] ? 'Active (Live)' : 'Mock Fallback'}
                          </span>
                        </div>
                        <p className="text-xs text-[#a1a1aa] mb-4">Delegate routing to Mem0 AI external memory service platforms.</p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Mem0 Token / API Key</label>
                            <input 
                              type="password" 
                              placeholder={config?.external?.mem0?.apiKey || "sk-mem0-..."} 
                              value={mem0Key}
                              onChange={(e) => setMem0Key(e.target.value)}
                              className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleSaveConnector('mem0', { apiKey: mem0Key })}
                        className="mt-6 bg-[#fafafa] text-[#09090b] font-medium text-xs py-2 px-4 rounded hover:bg-slate-200 transition-colors"
                      >
                        Save & Apply Mem0
                      </button>
                    </div>

                    {/* Zep */}
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Layers className="h-5 w-5 text-teal-400" />
                            <span className="font-semibold text-sm">Zep (Graphiti AI Memory Graph)</span>
                          </div>
                          <span className={`text-[10px] py-0.5 px-2 rounded-full font-semibold ${
                            stats.providerStatuses['zep'] 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-zinc-500/10 text-[#a1a1aa] border border-zinc-500/20'
                          }`}>
                            {stats.providerStatuses['zep'] ? 'Active (Live)' : 'Mock Fallback'}
                          </span>
                        </div>
                        <p className="text-xs text-[#a1a1aa] mb-4">Route memories directly to Zep Server instances supporting Graphiti extraction models.</p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Zep API URL</label>
                            <input 
                              type="text" 
                              placeholder={config?.external?.zep?.apiUrl || "https://api.getzep.com"} 
                              value={zepUrl}
                              onChange={(e) => setZepUrl(e.target.value)}
                              className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Zep API Key</label>
                            <input 
                              type="password" 
                              placeholder={config?.external?.zep?.apiKey || "Bearer token"} 
                              value={zepKey}
                              onChange={(e) => setZepKey(e.target.value)}
                              className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleSaveConnector('zep', { apiKey: zepKey, apiUrl: zepUrl })}
                        className="mt-6 bg-[#fafafa] text-[#09090b] font-medium text-xs py-2 px-4 rounded hover:bg-slate-200 transition-colors"
                      >
                        Save & Apply Zep
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* INTEGRATIONS TAB */}
              {activeTab === 'integrations' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Client Integration Guide</h2>
                    <p className="text-xs text-[#a1a1aa]">How to connect MCP host platforms, REST clients, and SDKs (Node/Python) to this running instance.</p>
                  </div>

                  <div className="bg-[#09090b] border border-[#27272a] rounded-lg overflow-hidden flex flex-col md:flex-row">
                    {/* Inner Sidebar */}
                    <div className="w-full md:w-48 bg-[#18181b]/30 border-r border-[#27272a] p-3 flex flex-row md:flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => setActiveIntegration('mcp')}
                        className={`text-left text-xs font-semibold px-3 py-2 rounded transition-all ${
                          activeIntegration === 'mcp' ? 'bg-[#18181b] text-white' : 'text-[#a1a1aa] hover:bg-[#18181b]/50 hover:text-white'
                        }`}
                      >
                        Model Context Protocol
                      </button>
                      <button
                        onClick={() => setActiveIntegration('api')}
                        className={`text-left text-xs font-semibold px-3 py-2 rounded transition-all ${
                          activeIntegration === 'api' ? 'bg-[#18181b] text-white' : 'text-[#a1a1aa] hover:bg-[#18181b]/50 hover:text-white'
                        }`}
                      >
                        REST API Interface
                      </button>
                      <button
                        onClick={() => setActiveIntegration('python')}
                        className={`text-left text-xs font-semibold px-3 py-2 rounded transition-all ${
                          activeIntegration === 'python' ? 'bg-[#18181b] text-white' : 'text-[#a1a1aa] hover:bg-[#18181b]/50 hover:text-white'
                        }`}
                      >
                        Python (LangChain)
                      </button>
                      <button
                        onClick={() => setActiveIntegration('node')}
                        className={`text-left text-xs font-semibold px-3 py-2 rounded transition-all ${
                          activeIntegration === 'node' ? 'bg-[#18181b] text-white' : 'text-[#a1a1aa] hover:bg-[#18181b]/50 hover:text-white'
                        }`}
                      >
                        Node.js (LangGraph)
                      </button>
                    </div>

                    {/* Inner Panel */}
                    <div className="flex-1 p-6 bg-[#09090b]">
                      {activeIntegration === 'mcp' && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold">MCP Server Configuration</h3>
                          <p className="text-xs text-[#a1a1aa]">Configure your Claude Desktop app or Cursor settings file by registering the `memox` server as an MCP extension over standard I/O (stdio):</p>
                          
                          <div className="relative">
                            <pre className="bg-[#18181b] text-zinc-300 font-mono text-[10px] p-4 rounded border border-[#27272a] overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "memox": {
      "command": "memox",
      "args": ["mcp"]
    }
  }
}`}
                            </pre>
                            <button 
                              onClick={() => triggerCopy(`{\n  "mcpServers": {\n    "memox": {\n      "command": "memox",\n      "args": ["mcp"]\n    }\n  }\n}`, 'mcp-json')}
                              className="absolute right-3 top-3 p-1.5 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
                            >
                              {copiedId === 'mcp-json' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          <div className="text-[10px] text-[#a1a1aa] flex items-center space-x-2">
                            <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span>This runs the MCP stdio wrapper exposing tools <strong>write_memory</strong> and <strong>load_memory</strong> directly to Claude or Cursor models.</span>
                          </div>
                        </div>
                      )}

                      {activeIntegration === 'api' && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold">REST API Endpoints</h3>
                          <p className="text-xs text-[#a1a1aa]">Hit standard high-throughput endpoints to read or write memories from any developer language runtime environment:</p>
                          
                          {/* Write Memory */}
                          <div>
                            <span className="text-[10px] font-bold bg-[#18181b] text-emerald-400 px-1.5 py-0.5 rounded mr-2 font-mono">POST</span>
                            <span className="text-xs font-mono text-white">/v1/memory/write</span>
                            <div className="relative mt-2">
                              <pre className="bg-[#18181b] text-zinc-300 font-mono text-[10px] p-4 rounded border border-[#27272a] overflow-x-auto">
{`curl -X POST http://localhost:3000/v1/memory/write \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "agent-session-123",
    "content": "User prefer dark theme interfaces",
    "metadata": { "topic": "preferences" }
  }'`}
                              </pre>
                              <button 
                                onClick={() => triggerCopy(`curl -X POST http://localhost:16369/v1/memory/write \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "sessionId": "agent-session-123",\n    "content": "User prefer dark theme interfaces",\n    "metadata": { "topic": "preferences" }\n  }'`, 'api-write')}
                                className="absolute right-3 top-3 p-1.5 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
                              >
                                {copiedId === 'api-write' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Load Memory */}
                          <div>
                            <span className="text-[10px] font-bold bg-[#18181b] text-blue-400 px-1.5 py-0.5 rounded mr-2 font-mono">POST</span>
                            <span className="text-xs font-mono text-white">/v1/memory/load</span>
                            <div className="relative mt-2">
                              <pre className="bg-[#18181b] text-zinc-300 font-mono text-[10px] p-4 rounded border border-[#27272a] overflow-x-auto">
{`curl -X POST http://localhost:16369/v1/memory/load \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "agent-session-123",
    "query": "what theme does user like?"
  }'`}
                              </pre>
                              <button 
                                onClick={() => triggerCopy(`curl -X POST http://localhost:16369/v1/memory/load \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "sessionId": "agent-session-123",\n    "query": "what theme does user like?"\n  }'`, 'api-load')}
                                className="absolute right-3 top-3 p-1.5 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
                              >
                                {copiedId === 'api-load' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeIntegration === 'python' && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold">Python SDK (LangChain Integrations)</h3>
                          <p className="text-xs text-[#a1a1aa]">Drop the `MemoxRunnable` directly inside LangChain Runnable sequences to trigger compliance validation and memory logging:</p>
                          
                          <div className="relative">
                            <pre className="bg-[#18181b] text-zinc-300 font-mono text-[10px] p-4 rounded border border-[#27272a] overflow-x-auto leading-relaxed">
{`# 1. Install using pip
# pip install memox-sdk

from memox import MemoxClient, MemoxRunnable
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

# Initialize memox Client
client = MemoxClient(base_url="http://localhost:16369")

# Setup memory recorder runnable
memox_saver = MemoxRunnable(client, session_id="user_channel_1", action="write")

# Wire into a chain
prompt = ChatPromptTemplate.from_template("What is {input}?")
model = ChatOpenAI()

chain = prompt | model | memox_saver`}
                            </pre>
                            <button 
                              onClick={() => triggerCopy(`from memox import MemoxClient, MemoxRunnable\nfrom langchain_core.prompts import ChatPromptTemplate\nfrom langchain_openai import ChatOpenAI\n\nclient = MemoxClient(base_url="http://localhost:16369")\nmemox_saver = MemoxRunnable(client, session_id="user_channel_1", action="write")\n\nprompt = ChatPromptTemplate.from_template("What is {input}?")\nmodel = ChatOpenAI()\nchain = prompt | model | memox_saver`, 'py-code')}
                              className="absolute right-3 top-3 p-1.5 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
                            >
                              {copiedId === 'py-code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {activeIntegration === 'node' && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold">Node.js SDK (LangGraph State Savers)</h3>
                          <p className="text-xs text-[#a1a1aa]">Trigger states updates from nodes within LangGraph configurations:</p>
                          
                          <div className="relative">
                            <pre className="bg-[#18181b] text-zinc-300 font-mono text-[10px] p-4 rounded border border-[#27272a] overflow-x-auto leading-relaxed">
{`// 1. Install using npm
// npm install memox-sdk

import { MemoxClient } from 'memox-sdk';

const memox = new MemoxClient("http://localhost:16369");

// Generate standard node helper
const memoxNode = memox.getLangGraphNode("session-agent-999");

// Register as node in your Graph builder
const graph = new StateGraph()
  .addNode("agent", agentNode)
  .addNode("memox_saver", memoxNode)
  .addEdge("agent", "memox_saver");`}
                            </pre>
                            <button 
                              onClick={() => triggerCopy(`import { MemoxClient } from 'memox-sdk';\n\nconst memox = new MemoxClient("http://localhost:16369");\nconst memoxNode = memox.getLangGraphNode("session-agent-999");\n\nconst graph = new StateGraph()\n  .addNode("agent", agentNode)\n  .addNode("memox_saver", memoxNode)\n  .addEdge("agent", "memox_saver");`, 'node-code')}
                              className="absolute right-3 top-3 p-1.5 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
                            >
                              {copiedId === 'node-code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AUDIT LOGS TAB */}
              {activeTab === 'logs' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                  {/* Sessions explorer */}
                  <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-5 lg:col-span-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#a1a1aa] uppercase tracking-wider mb-4">Memory Subscription Sessions</h3>
                      {sessions.length === 0 ? (
                        <p className="text-xs text-[#a1a1aa]">No sessions recorded yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                          {sessions.map(s => (
                            <button
                              key={s.sessionId}
                              onClick={() => loadSessionMemories(s.sessionId)}
                              className={`w-full text-left p-3 rounded border text-xs transition-all ${
                                selectedSession === s.sessionId
                                  ? 'bg-[#18181b] border-[#52525b] text-white font-medium'
                                  : 'bg-[#09090b]/50 border-[#27272a] hover:border-zinc-700 text-[#a1a1aa]'
                              }`}
                            >
                              <div className="truncate font-mono font-semibold">{s.sessionId}</div>
                              <div className="flex items-center justify-between text-[10px] text-[#71717a] mt-1.5">
                                <span>{s.memoryCount} memory files</span>
                                <span>{new Date(s.lastActive).toLocaleTimeString()}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Memories exploration */}
                  <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-5 lg:col-span-2 flex flex-col min-h-[450px]">
                    {selectedSession ? (
                      <>
                        <div className="flex items-center justify-between border-b border-[#27272a] pb-4 mb-4">
                          <div>
                            <span className="text-[10px] text-[#a1a1aa] font-mono">EXPLORING CHANNEL</span>
                            <h2 className="text-sm font-bold text-white font-mono mt-0.5">{selectedSession}</h2>
                          </div>
                          
                          {/* Search bar */}
                          <div className="relative w-48 md:w-64">
                            <input
                              type="text"
                              placeholder="Semantic query..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  loadSessionMemories(selectedSession, searchQuery);
                                }
                              }}
                              className="w-full bg-[#18181b] border border-[#27272a] focus:border-zinc-500 focus:outline-none rounded text-xs py-1.5 pl-8 pr-3 text-slate-300 transition-colors font-mono"
                            />
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                          </div>
                        </div>

                        {loadingMemories ? (
                          <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-[#a1a1aa]">
                            <RefreshCw className="h-6 w-6 animate-spin" />
                            <span className="text-xs">Searching vectors...</span>
                          </div>
                        ) : sessionMemories.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-[#a1a1aa] text-xs">
                            No records matching query.
                          </div>
                        ) : (
                          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
                            {sessionMemories.map(m => (
                              <div key={m.id} className="bg-[#18181b]/30 border border-[#27272a] rounded p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-[9px] py-0.5 px-1.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10 font-mono">
                                    Sim: {(m.score * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-[10px] text-[#71717a] font-mono">
                                    {new Date(m.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-300 font-mono leading-relaxed bg-[#09090b]/40 p-2 border border-[#27272a]/55 rounded">
                                  {m.content}
                                </p>
                                {m.metadata && Object.keys(m.metadata).length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-[#27272a]/40 flex flex-wrap gap-1">
                                    {Object.entries(m.metadata).map(([key, val]) => (
                                      <span key={key} className="text-[9px] bg-[#18181b] px-2 py-0.5 rounded text-[#71717a] border border-[#27272a]/40 font-mono">
                                        <strong className="text-[#a1a1aa]">{key}:</strong> {String(val)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-[#a1a1aa] text-xs">
                        <Database className="h-8 w-8 text-[#27272a] mb-2" />
                        <span>Select a memory channel session on the left to inspect vectors.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PLAYGROUND TAB */}
              {activeTab === 'playground' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                  {/* Test tool form */}
                  <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 lg:col-span-1 flex flex-col justify-between">
                    <form onSubmit={executeWriteTest} className="space-y-4">
                      <h3 className="text-sm font-semibold">Test Sandbox</h3>
                      <p className="text-xs text-[#a1a1aa] mb-4">Submit memory payloads directly to the routing engine. Sensitive PII details will be scrubbed automatically.</p>
                      
                      <div>
                        <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Session ID</label>
                        <input 
                          type="text" 
                          value={testSessionId}
                          onChange={(e) => setTestSessionId(e.target.value)}
                          required
                          className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Custom TTL (Seconds - Optional)</label>
                        <input 
                          type="number" 
                          placeholder="use system default"
                          value={testTtl}
                          onChange={(e) => setTestTtl(e.target.value)}
                          className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mb-1">Payload Content</label>
                        <textarea 
                          rows={4}
                          value={testContent}
                          onChange={(e) => setTestContent(e.target.value)}
                          required
                          className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 text-slate-300 font-mono leading-relaxed"
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="w-full bg-[#fafafa] text-[#09090b] font-medium text-xs py-2 px-4 rounded hover:bg-slate-200 transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <Play className="h-3.5 w-3.5 fill-[#09090b]" />
                        <span>Trigger Router Write</span>
                      </button>

                      {testWriteStatus && (
                        <div className={`text-[10px] py-1.5 px-3 rounded border mt-2 font-mono ${
                          testWriteStatus.includes('Success') 
                            ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' 
                            : 'bg-zinc-500/10 border-[#27272a] text-[#a1a1aa]'
                        }`}>
                          {testWriteStatus}
                        </div>
                      )}
                    </form>
                  </div>

                  {/* SQL history viewer */}
                  <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-5 lg:col-span-2 flex flex-col min-h-[450px]">
                    <div className="flex items-center justify-between border-b border-[#27272a] pb-4 mb-4">
                      <div>
                        <span className="text-[10px] text-[#a1a1aa] font-mono">HISTORY TRACKER</span>
                        <h2 className="text-sm font-bold text-white mt-0.5">Real-time SQLite Audit Traces</h2>
                      </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-xs text-[#a1a1aa] border-collapse">
                        <thead>
                          <tr className="border-b border-[#27272a] text-[#a1a1aa] bg-[#18181b]/20">
                            <th className="py-2.5 px-3 font-semibold font-mono text-[10px]">Time</th>
                            <th className="py-2.5 px-3 font-semibold font-mono text-[10px]">Action</th>
                            <th className="py-2.5 px-3 font-semibold font-mono text-[10px]">Session</th>
                            <th className="py-2.5 px-3 font-semibold font-mono text-[10px]">Provider</th>
                            <th className="py-2.5 px-3 font-semibold font-mono text-[10px]">Latency</th>
                            <th className="py-2.5 px-3 font-semibold font-mono text-[10px]">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a]">
                          {logs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-[#71717a]">No audit traces registered.</td>
                            </tr>
                          ) : (
                            logs.slice(0, 10).map(log => (
                              <tr key={log.id} className="hover:bg-[#18181b]/10 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[10px] text-[#71717a]">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`py-0.5 px-1.5 rounded text-[8px] font-bold ${
                                    log.action === 'write' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                                  }`}>
                                    {log.action.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[10px] truncate max-w-[120px]" title={log.session_id}>
                                  {log.session_id}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 font-mono text-[10px]">{log.provider}</td>
                                <td className="py-2.5 px-3 font-mono text-[10px]">{log.latency_ms} ms</td>
                                <td className="py-2.5 px-3">
                                  {log.success === 1 ? (
                                    <span className="text-emerald-400 text-[10px]">Success</span>
                                  ) : (
                                    <span className="text-red-400 text-[10px]">Failed</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] py-6 flex flex-row items-center justify-center gap-2 text-[10px] text-[#71717a] mt-auto">
        <Logo className="h-4 w-4 text-[#71717a]" />
        <p>memox memory bridge • built with shadcn aesthetics</p>
      </footer>
    </div>
  );
}
