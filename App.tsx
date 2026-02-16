import React, { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar
} from 'recharts';
import { 
  LayoutDashboard, ListPlus, Trophy, TrendingUp, 
  Trash2, CheckCircle2, XCircle, Banknote,
  Sun, Moon, Cloud, Loader2, Edit3, Target, Search,
  Wallet, Menu, X, PlusCircle, MinusCircle, Lock, User, LogOut,
  ShieldCheck, Eye, EyeOff, FileText, Bot, Bell, Zap, Calculator
} from 'lucide-react';

import { Bet, Deposit, Notification, BetResult } from './types';
import { analyzeMatch } from './services/geminiService';

// --- CONSTANTES ---
const MONEDA = 'S/';
const APP_VERSION = 'v6.7 Calc';
// REEMPLAZAR CON LA URL/RUTA REAL DE TU IMAGEN
const LOGO_URL = "/logo.png"; 

const TIPOS_APUESTA = [
  "1X2 (Resultado Final)", "Doble Oportunidad", "Ambos Anotan (BTTS)",
  "Over/Under Goles", "Hándicap Asiático", "Hándicap Europeo",
  "Apuesta sin Empate (DNB)", "Resultado Exacto", "Descanso / Final",
  "Córners (O/U)", "Tarjetas (O/U)", "Jugador Anotará", "Personalizado (Escribir...)"
];

const MODALIDADES = ["Simple", "Combinada", "Sistema"];
const CASAS = ["Betano", "Apuesta Total", "Doradobet", "Bet365", "1xBet", "Coolbet"];
const NIVELES_RIESGO = [
  { label: 'Conservador', val: 0.02 },
  { label: 'Medio', val: 0.035 },
  { label: 'Agresivo', val: 0.05 }
];

const App = () => {
  // --- ESTADOS DE CONTROL ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [bets, setBets] = useState<Bet[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingBet, setViewingBet] = useState<Bet | null>(null);
  const [riskLevel, setRiskLevel] = useState(NIVELES_RIESGO[0]);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados de Notificación en Vivo
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [liveSimulationEnabled, setLiveSimulationEnabled] = useState(true);

  // Estados de IA
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutResponse, setScoutResponse] = useState<string | null>(null);

  // Estados Calculadora
  const [calcStake, setCalcStake] = useState<number | string>(100);
  const [calcOddsList, setCalcOddsList] = useState<{id: string, value: number | string}[]>([{id: '1', value: 1.90}]);

  // Estados de Formulario
  const [newBet, setNewBet] = useState<Bet>({
    date: new Date().toISOString().split('T')[0],
    modality: 'Simple',
    selections: [{ match: '', competition: '', type: '1X2 (Resultado Final)', customType: '', odds: 1.90, time: '12:00', date: new Date().toISOString().split('T')[0] }],
    totalOdds: 1.90,
    amount: "",
    stake: 2,
    bookmaker: 'Betano',
    result: 'Pendiente',
    notes: '',
    cashOutValue: 0
  });

  const [newDeposit, setNewDeposit] = useState<Deposit>({ amount: '', date: new Date().toISOString().split('T')[0], note: 'Presupuesto Mensual' });

  // --- INIT LOCALSTORAGE (CARGA INMEDIATA) ---
  useEffect(() => {
    const storedAuth = localStorage.getItem('gotia_auth');
    if (storedAuth === 'true') setIsAuthenticated(true);

    const storedBets = localStorage.getItem('gotia_bets');
    if (storedBets) {
      try {
        const parsedBets = JSON.parse(storedBets);
        // Reparación automática de IDs si faltan
        const patchedBets = parsedBets.map((b: any) => ({
          ...b,
          id: b.id && b.id !== "" ? b.id : Date.now().toString() + Math.random().toString(36).substr(2, 5)
        }));
        setBets(patchedBets);
        // Guardar la versión reparada inmediatamente si hubo cambios
        if (JSON.stringify(parsedBets) !== JSON.stringify(patchedBets)) {
            localStorage.setItem('gotia_bets', JSON.stringify(patchedBets));
        }
      } catch (e) {
        setBets([]);
      }
    }

    const storedDeposits = localStorage.getItem('gotia_deposits');
    if (storedDeposits) {
      try {
        const parsedDeposits = JSON.parse(storedDeposits);
        const patchedDeposits = parsedDeposits.map((d: any) => ({
          ...d,
          id: d.id && d.id !== "" ? d.id : Date.now().toString() + Math.random().toString(36).substr(2, 5)
        }));
        setDeposits(patchedDeposits);
      } catch(e) {
        setDeposits([]);
      }
    }

    setLoading(false);
  }, []);

  // --- HANDLERS ---

  const handleAddBet = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newBet.amount as string);
    if (isNaN(amountNum) || amountNum <= 0) return;

    // Generar ID robusto
    const betToSave: Bet = {
        ...newBet,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9), 
        amount: amountNum,
        createdAt: new Date().toISOString()
    };
    
    setBets(prev => {
        const updated = [...prev, betToSave];
        localStorage.setItem('gotia_bets', JSON.stringify(updated));
        return updated;
    });

    setNewBet({ 
        date: new Date().toISOString().split('T')[0], 
        modality: 'Simple', 
        selections: [{ match: '', competition: '', type: '1X2 (Resultado Final)', customType: '', odds: 1.90, time: '12:00', date: new Date().toISOString().split('T')[0] }], 
        totalOdds: 1.90, 
        amount: "", 
        stake: 2, 
        bookmaker: 'Betano', 
        result: 'Pendiente', 
        notes: '', 
        cashOutValue: 0 
    });
    pushNotification('info', 'Operación Registrada', 'La apuesta se ha guardado localmente.');
  };

  const handleAddDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newDeposit.amount as string);
    if (isNaN(amt) || amt <= 0) return;

    const depositToSave: Deposit = {
        ...newDeposit,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        amount: amt,
        createdAt: new Date().toISOString()
    };

    setDeposits(prev => {
        const updated = [...prev, depositToSave];
        localStorage.setItem('gotia_deposits', JSON.stringify(updated));
        return updated;
    });

    setNewDeposit({ amount: '', date: new Date().toISOString().split('T')[0], note: 'Presupuesto Mensual' });
    pushNotification('info', 'Banca Actualizada', `Se han inyectado ${MONEDA}${amt}`);
  };

  const updateBetResult = (id: string | undefined, res: any, cash = 0) => {
    if(!id) return;
    setBets(prev => {
        const updated = prev.map(b => b.id === id ? { ...b, result: res, cashOutValue: parseFloat(cash as any) || 0 } : b);
        localStorage.setItem('gotia_bets', JSON.stringify(updated));
        return updated;
    });
  };

  const handleEditSave = (item: any) => {
    if(item.totalOdds !== undefined) {
        setBets(prev => {
            const updated = prev.map(b => b.id === item.id ? { ...item, amount: parseFloat(item.amount) || 0 } : b);
            localStorage.setItem('gotia_bets', JSON.stringify(updated));
            return updated;
        });
    } else {
        setDeposits(prev => {
            const updated = prev.map(d => d.id === item.id ? { ...item, amount: parseFloat(item.amount) || 0 } : d);
            localStorage.setItem('gotia_deposits', JSON.stringify(updated));
            return updated;
        });
    }
    setEditingItem(null);
  };

  // ELIMINACIÓN DIRECTA SIN CONFIRMACIÓN (PARA EVITAR PROBLEMAS)
  const handleDelete = (id: string | undefined, coll: 'bets' | 'deposits') => {
    if (!id) return;
    
    if (coll === 'bets') {
        setBets(prev => {
            const updated = prev.filter(b => b.id !== id);
            localStorage.setItem('gotia_bets', JSON.stringify(updated));
            return updated;
        });
        pushNotification('info', 'Registro Eliminado', 'Apuesta borrada correctamente.');
    } else {
        setDeposits(prev => {
            const updated = prev.filter(d => d.id !== id);
            localStorage.setItem('gotia_deposits', JSON.stringify(updated));
            return updated;
        });
        pushNotification('info', 'Registro Eliminado', 'Depósito borrado correctamente.');
    }
  };

  // --- SISTEMA DE NOTIFICACIONES ---
  const pushNotification = (type: 'win' | 'loss' | 'info', title: string, message: string, amount?: number) => {
    const newNotif: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      amount,
      timestamp: Date.now()
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 3)); 
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 6000);
  };

  // --- SIMULADOR DE WEBSOCKET (LIVE ENGINE) ---
  useEffect(() => {
    if (!isAuthenticated || !liveSimulationEnabled) return;

    const interval = setInterval(() => {
      setBets(currentBets => {
        const pendingBets = currentBets.filter(b => b.result === 'Pendiente');
        
        if (pendingBets.length === 0) return currentBets;

        if (Math.random() > 0.2) return currentBets;

        const betToResolve = pendingBets[Math.floor(Math.random() * pendingBets.length)];
        
        const impliedProb = 1 / betToResolve.totalOdds;
        const isWin = Math.random() < impliedProb;
        
        const newResult: BetResult = isWin ? 'Ganada' : 'Perdida';
        const potentialProfit = (betToResolve.totalOdds * parseFloat(betToResolve.amount as string)) - parseFloat(betToResolve.amount as string);

        if (isWin) {
          pushNotification('win', '¡APUESTA GANADA! 🤑', `${betToResolve.selections[0].match}`, potentialProfit);
        } else {
          pushNotification('loss', 'Apuesta Finalizada ❌', `${betToResolve.selections[0].match}`);
        }

        const updatedBets = currentBets.map(b => b.id === betToResolve.id ? { ...b, result: newResult } : b);
        
        localStorage.setItem('gotia_bets', JSON.stringify(updatedBets));
        
        return updatedBets;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [isAuthenticated, liveSimulationEnabled]);


  // --- LÓGICA DE MULTIPLICADOR ---
  useEffect(() => {
    const total = (newBet.selections || []).reduce((acc, sel) => {
      const val = typeof sel.odds === 'string' ? parseFloat(sel.odds) : sel.odds;
      return acc * (isNaN(val) || val <= 0 ? 1 : val);
    }, 1);
    setNewBet(prev => ({ ...prev, totalOdds: parseFloat(total.toFixed(2)) || 1 }));
  }, [newBet.selections]);

  // --- LOGICA CALCULADORA ---
  const calcResults = useMemo(() => {
    const s = parseFloat(calcStake as string) || 0;
    const totalOdds = calcOddsList.reduce((acc, item) => acc * (parseFloat(item.value as string) || 1), 1);
    const returns = s * totalOdds;
    const profit = returns - s;
    const prob = totalOdds > 0 ? (1 / totalOdds) * 100 : 0;
    return { totalOdds, returns, profit, prob };
  }, [calcStake, calcOddsList]);

  // --- LÓGICA FINANCIERA SEGURA ---
  const finance = useMemo(() => {
    const safeDeps = Array.isArray(deposits) ? deposits : [];
    const safeBets = Array.isArray(bets) ? bets : [];
    
    const totalDeposited = safeDeps.reduce((acc, curr) => acc + (parseFloat(curr.amount as string) || 0), 0);
    
    let totalPL = 0;
    let wonCount = 0;
    let runningBank = totalDeposited;
    let historyData = [{ name: 'Inicio', bank: totalDeposited }];

    const sortedForChart = [...safeBets].sort((a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime());
    
    sortedForChart.forEach((bet) => {
      if (!bet || bet.result === 'Pendiente' || bet.result === 'Nula') return;
      const odds = parseFloat(bet.totalOdds as any || 0);
      const amount = parseFloat(bet.amount as any || 0);
      
      let pl = 0;
      if (bet.result === 'Ganada') {
          pl = (odds * amount) - amount;
          wonCount++;
      } else if (bet.result === 'Perdida') {
          pl = -amount;
      } else if (bet.result === 'Cash Out') {
          const cashVal = parseFloat(bet.cashOutValue as any || 0);
          pl = cashVal - amount;
          if (pl >= 0) wonCount++;
      }

      totalPL += pl;
      runningBank += pl;
      historyData.push({ name: `Ap`, bank: Number(runningBank.toFixed(2)) || totalDeposited });
    });

    const betsDone = safeBets.filter(b => b.result !== 'Pendiente' && b.result !== 'Nula');
    const totalInvested = betsDone.reduce((a, b) => a + (parseFloat(b.amount as any) || 0), 0);
    const currentBank = totalDeposited === 0 && totalPL === 0 ? 0 : runningBank;

    return { 
      totalDeposited, 
      currentBank: currentBank, 
      totalPL, 
      wonCount, 
      historyData, 
      pendingCount: safeBets.filter(b => b.result === 'Pendiente').length,
      yieldPercent: totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0,
      roiPercent: totalDeposited > 0 ? (totalPL / totalDeposited) * 100 : 0,
      suggestedBet: currentBank * riskLevel.val
    };
  }, [bets, deposits, riskLevel]);

  const statsAvancadas = useMemo(() => {
    const monthlyGroups: Record<string, { month: string, pl: number, invested: number }> = {};
    const safeBets = Array.isArray(bets) ? bets : [];
    
    safeBets.filter(b => b.result !== 'Pendiente' && b.result !== 'Nula').forEach(b => {
      const date = new Date(b.createdAt || b.date);
      const monthKey = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      const odds = parseFloat(b.totalOdds as any || 1);
      const amount = parseFloat(b.amount as any || 0);
      
      let pl = 0;
      if (b.result === 'Ganada') pl = (odds * amount) - amount;
      else if (b.result === 'Perdida') pl = -amount;
      else if (b.result === 'Cash Out') pl = (parseFloat(b.cashOutValue as any) || 0) - amount;

      if (!monthlyGroups[monthKey]) monthlyGroups[monthKey] = { month: monthKey, pl: 0, invested: 0 };
      monthlyGroups[monthKey].pl += pl;
      monthlyGroups[monthKey].invested += amount;
    });
    return Object.values(monthlyGroups).map(m => ({ ...m, roi: m.invested > 0 ? (m.pl / m.invested) * 100 : 0 }));
  }, [bets]);

  // --- HANDLERS LOGIN ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.username === 'Gotia20' && loginData.password === 'Gotia01SportingSC') {
      setIsAuthenticated(true);
      localStorage.setItem('gotia_auth', 'true');
      setLoginError('');
      pushNotification('info', 'Sesión Iniciada', 'Bienvenido a Gotia Sports Pro');
    } else {
      setLoginError('Error de usuario o contraseña. Reintenta. ❌');
    }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('gotia_auth');
  };

  const scoutMatch = async (index: number) => {
    const s = newBet.selections[index];
    if (!s.match) return;
    setScoutLoading(true);
    const analysis = await analyzeMatch(s.match, s.competition, s.type);
    setScoutResponse(`[${s.match}]: ${analysis}`);
    setScoutLoading(false);
  };

  // --- RENDER LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center p-4 bg-[#020617] overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(14,165,233,0.1),rgba(255,255,255,0))]" />
        <div className="w-full max-w-md p-10 rounded-[50px] border border-slate-800 bg-[#0f172a] shadow-2xl text-white relative z-10">
          <div className="text-center mb-10">
            {/* LOGO EN LOGIN */}
            <div className="flex items-center justify-center mx-auto mb-8 transition-transform hover:scale-105 duration-500">
               <img src={LOGO_URL} alt="Gotia Logo" className="w-32 h-32 object-contain drop-shadow-[0_0_25px_rgba(14,165,233,0.6)]" />
            </div>
            
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">GOTIA <span className="text-sky-400">SPORTS</span></h1>
            <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.4em] mt-3">Elite Trading Terminal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase opacity-40 ml-4 tracking-[0.2em]">Identidad</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400" size={18} />
                <input type="text" placeholder="Usuario Analista" className={`w-full pl-14 pr-6 py-5 rounded-[25px] bg-slate-950 border border-slate-800 outline-none focus:border-sky-500 transition-all font-black`} value={loginData.username} onChange={e => setLoginData({...loginData, username: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase opacity-40 ml-4 tracking-[0.2em]">Passcode</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400" size={18} />
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full pl-14 pr-14 py-5 rounded-[25px] bg-slate-950 border border-slate-800 outline-none focus:border-sky-500 transition-all font-black" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors">
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-rose-500 text-xs font-black text-center animate-pulse">{loginError}</p>}
            <button type="submit" className="w-full bg-sky-600 text-white font-black py-6 rounded-[30px] uppercase shadow-lg shadow-sky-600/30 hover:scale-[1.02] active:scale-95 transition-all text-xs tracking-[0.2em]">Desbloquear Bóveda ⚽</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] text-white p-10 text-center">
      <Loader2 className="w-16 h-16 animate-spin text-sky-500 mb-8" />
      <p className="text-xs font-black uppercase tracking-[0.5em] opacity-30 animate-pulse text-center">Sincronizando Gotia Cloud...</p>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${darkMode ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* NOTIFICATION CONTAINER */}
      <div className="fixed top-24 right-6 z-[120] flex flex-col gap-4 pointer-events-none">
        {notifications.map(notif => (
          <div key={notif.id} className={`pointer-events-auto p-5 rounded-3xl shadow-2xl min-w-[300px] border animate-in slide-in-from-right fade-in duration-300 flex items-start gap-4 ${
            notif.type === 'win' ? 'bg-[#0f172a] border-emerald-500/50 shadow-emerald-500/20' : 
            notif.type === 'loss' ? 'bg-[#0f172a] border-rose-500/50 shadow-rose-500/20' :
            'bg-[#0f172a] border-sky-500/50 shadow-sky-500/20'
          }`}>
             <div className={`p-3 rounded-full ${
               notif.type === 'win' ? 'bg-emerald-500 text-white' : 
               notif.type === 'loss' ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white'
             }`}>
               {notif.type === 'win' ? <Trophy size={20}/> : notif.type === 'loss' ? <XCircle size={20}/> : <Bell size={20}/>}
             </div>
             <div>
                <h4 className={`font-black uppercase text-sm mb-1 ${
                  notif.type === 'win' ? 'text-emerald-400' : 
                  notif.type === 'loss' ? 'text-rose-500' : 'text-sky-400'
                }`}>{notif.title}</h4>
                <p className="text-xs font-bold text-slate-300">{notif.message}</p>
                {notif.amount && <p className="text-emerald-400 font-black text-lg mt-1">+{MONEDA}{notif.amount.toLocaleString()}</p>}
             </div>
          </div>
        ))}
      </div>

      {/* NAVBAR */}
      <header className={`sticky top-0 z-50 px-6 md:px-12 py-6 border-b flex items-center justify-between shadow-sm ${darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-5">
          {/* LOGO EN NAVBAR */}
          <img src={LOGO_URL} alt="Gotia Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(14,165,233,0.4)]" />
          
          <h1 className={`text-3xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>GOTIA <span className="text-sky-400">SPORTS</span></h1>
        </div>
        
        <nav className="hidden lg:flex items-center gap-2 bg-slate-800/10 p-2 rounded-[22px]">
          {['dashboard', 'registry', 'history', 'bank', 'stats', 'calculator'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-[16px] text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === tab ? 'bg-sky-600 text-white shadow-xl shadow-sky-600/30' : 'text-slate-500 hover:text-sky-400'}`}>
              {tab === 'registry' ? 'Registro' : tab === 'history' ? 'Historial' : tab === 'bank' ? 'Banca' : tab === 'stats' ? 'Estadísticas' : tab === 'calculator' ? 'Calculadora' : tab}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={() => setLiveSimulationEnabled(!liveSimulationEnabled)} className={`hidden md:flex p-3.5 rounded-[18px] transition-all items-center gap-2 ${liveSimulationEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/50 text-slate-500'}`} title="Simulación en Vivo">
             <Zap size={20} className={liveSimulationEnabled ? "fill-current" : ""} />
             <span className="text-[10px] font-black uppercase tracking-widest">{liveSimulationEnabled ? 'LIVE ON' : 'LIVE OFF'}</span>
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className={`p-3.5 rounded-[18px] transition-all ${darkMode ? 'bg-slate-800/20 hover:bg-slate-800/40' : 'bg-slate-200 hover:bg-slate-300'}`}>{darkMode ? <Sun className="text-amber-400" size={22} /> : <Moon className="text-slate-700" size={22} />}</button>
          <button onClick={handleLogout} className="p-3.5 rounded-[18px] bg-rose-500/5 text-rose-500 hover:bg-rose-500/15 transition-all"><LogOut size={22} /></button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-3.5 rounded-[18px] bg-slate-800/10"><Menu size={22} /></button>
        </div>
      </header>

      {/* MOBILE NAV */}
      {isMobileMenuOpen && (
        <div className={`lg:hidden absolute top-24 left-0 w-full z-40 p-6 space-y-3 shadow-2xl animate-in slide-in-from-top ${darkMode ? 'bg-[#0f172a] border-b border-slate-800' : 'bg-white border-b border-slate-200'}`}>
          {['dashboard', 'registry', 'history', 'bank', 'stats', 'calculator'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }} className={`w-full text-left font-black uppercase text-xs p-5 rounded-[22px] ${activeTab === tab ? 'bg-sky-600 text-white' : 'bg-slate-800/10 text-slate-500'}`}>
              {tab === 'registry' ? 'Registro' : tab === 'history' ? 'Historial' : tab === 'bank' ? 'Banca' : tab === 'stats' ? 'Estadísticas' : tab === 'calculator' ? 'Calculadora' : tab}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-auto p-4 md:p-12 scrollbar-hide">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* KPI DASHBOARD */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
             {[
               { label: 'Banca Disponible', val: `${MONEDA}${finance.currentBank.toLocaleString()}`, color: 'text-sky-400', icon: Wallet },
               { label: 'Yield Total', val: `${finance.yieldPercent.toFixed(1)}%`, color: finance.yieldPercent >= 0 ? 'text-emerald-400' : 'text-rose-500', icon: TrendingUp },
               { label: 'En Juego', val: finance.pendingCount, color: darkMode ? 'text-white' : 'text-slate-900', icon: Target },
               { label: 'Profit Neto', val: `${MONEDA}${finance.totalPL.toLocaleString()}`, color: finance.totalPL >= 0 ? 'text-emerald-400' : 'text-rose-500', icon: Banknote },
             ].map((card, i) => (
               <div key={i} className={`p-8 rounded-[42px] border flex flex-col gap-4 transition-all hover:scale-[1.03] ${darkMode ? 'bg-[#0f172a] border-slate-800 shadow-xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                 <div className="flex justify-between items-center opacity-30"><p className="text-[10px] font-black uppercase tracking-[0.2em]">{card.label}</p><card.icon size={18} /></div>
                 <h3 className={`text-xl md:text-4xl font-black tracking-tighter ${card.color}`}>{card.val}</h3>
               </div>
             ))}
          </div>

          {activeTab === 'dashboard' && (
              <div className={`p-10 rounded-[50px] border ${darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
                   <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-2 text-slate-500"><ListPlus size={20}/> Últimos Movimientos</h3>
                   {bets.length === 0 ? (
                        <div className="text-center py-10 opacity-30 text-xs font-black uppercase tracking-widest">Sin datos registrados</div>
                   ) : (
                        <div className="space-y-4">
                            {[...bets].reverse().slice(0, 5).map((b, i) => (
                                <div key={i} className={`p-4 rounded-3xl border flex flex-col md:flex-row justify-between items-center gap-4 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${b.result === 'Ganada' ? 'bg-emerald-500/20 text-emerald-400' : b.result === 'Perdida' ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-500/20 text-slate-400'}`}>
                                            {b.result === 'Ganada' ? <CheckCircle2 size={18}/> : b.result === 'Perdida' ? <XCircle size={18}/> : <Bot size={18}/>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{b.selections[0].match}</p>
                                            <p className="text-[10px] opacity-50 uppercase tracking-wider">{b.modality} • {b.date}</p>
                                        </div>
                                    </div>
                                    <div className="font-black text-sky-400">@{b.totalOdds}</div>
                                </div>
                            ))}
                        </div>
                   )}
              </div>
          )}

          {activeTab === 'calculator' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`p-10 rounded-[50px] border ${darkMode ? 'bg-[#0f172a] border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <h3 className={`text-2xl font-black mb-8 flex items-center gap-4 italic uppercase tracking-tighter ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                     <Calculator size={32}/> Calculadora 🧮
                  </h3>
                  
                  <div className="space-y-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black opacity-30 uppercase ml-2 tracking-[0.2em]">Stake / Inversión ({MONEDA})</label>
                        <input 
                           type="number" 
                           step="1" 
                           className={`w-full p-6 rounded-[28px] border outline-none text-3xl font-black tracking-tighter ${darkMode ? 'bg-slate-950 border-slate-800 focus:border-sky-500 text-white' : 'bg-slate-50 focus:border-sky-600'}`} 
                           value={calcStake} 
                           onChange={e => setCalcStake(e.target.value)} 
                        />
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                           <label className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Cuotas (Parlay / Simple)</label>
                           <button onClick={() => setCalcOddsList([...calcOddsList, {id: Date.now().toString(), value: 1.50}])} className="text-[10px] font-black uppercase text-sky-400 hover:text-sky-300 flex items-center gap-1">
                              <PlusCircle size={14}/> Añadir
                           </button>
                        </div>
                        <div className="space-y-3 max-h-60 overflow-auto pr-2 scrollbar-hide">
                           {calcOddsList.map((item, idx) => (
                              <div key={item.id} className="flex items-center gap-3">
                                 <span className="text-[10px] font-black opacity-20 w-6 text-center">{idx + 1}</span>
                                 <input 
                                    type="number" 
                                    step="0.01" 
                                    className={`flex-1 p-4 rounded-[20px] border outline-none font-black text-lg ${darkMode ? 'bg-slate-900 border-slate-800 focus:border-sky-500 text-white' : 'bg-slate-50'}`} 
                                    value={item.value} 
                                    onChange={e => {
                                       const updated = [...calcOddsList];
                                       updated[idx].value = e.target.value;
                                       setCalcOddsList(updated);
                                    }} 
                                 />
                                 {calcOddsList.length > 1 && (
                                    <button onClick={() => setCalcOddsList(calcOddsList.filter(i => i.id !== item.id))} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition-all">
                                       <MinusCircle size={20}/>
                                    </button>
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                   <div className={`p-8 rounded-[40px] border flex items-center justify-between ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div>
                         <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Cuota Total</p>
                         <h4 className="text-4xl font-black text-sky-400 tracking-tighter">@{calcResults.totalOdds.toFixed(2)}</h4>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Probabilidad Implícita</p>
                         <h4 className={`text-2xl font-black tracking-tighter ${calcResults.prob > 50 ? 'text-emerald-400' : 'text-orange-400'}`}>{calcResults.prob.toFixed(1)}%</h4>
                      </div>
                   </div>

                   <div className={`flex-1 p-10 rounded-[50px] border flex flex-col justify-center items-center gap-6 text-center ${darkMode ? 'bg-gradient-to-br from-[#0f172a] to-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
                      <div>
                         <p className="text-xs font-black opacity-40 uppercase tracking-[0.3em] mb-2">Retorno Potencial</p>
                         <h2 className="text-6xl font-black text-white tracking-tighter drop-shadow-2xl">{MONEDA}{calcResults.returns.toFixed(2)}</h2>
                      </div>
                      <div className={`px-6 py-2 rounded-full border ${calcResults.profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                         <p className="text-sm font-black uppercase tracking-widest">Beneficio Neto: {MONEDA}{calcResults.profit.toFixed(2)}</p>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'registry' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className={`lg:col-span-2 p-10 rounded-[50px] border ${darkMode ? 'bg-[#0f172a] border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-12">
                  <h3 className={`text-2xl font-black flex items-center gap-4 italic uppercase tracking-tighter ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}><ListPlus size={32}/> Registro de Operación</h3>
                  <div className="flex items-center gap-2 bg-slate-800/40 p-2 rounded-[20px] self-start shadow-inner">
                    {MODALIDADES.map(m => (
                      <button key={m} type="button" onClick={() => setNewBet({...newBet, modality: m as any, selections: m === 'Simple' ? [newBet.selections[0]] : newBet.selections})} className={`px-6 py-3 rounded-[14px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${newBet.modality === m ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' : 'text-slate-50'}`}>{m}</button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAddBet} className="space-y-10">
                  <div className="space-y-8">
                    {newBet.selections.map((sel, index) => (
                      <div key={index} className={`p-8 rounded-[40px] border relative transition-all group ${darkMode ? 'bg-slate-950 border-slate-800 shadow-inner' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-black opacity-30 uppercase ml-2 tracking-[0.2em]">Encuentro / Match</label>
                            <input type="text" required placeholder="Ej: Real Madrid vs City" className={`p-5 rounded-[20px] border outline-none font-black text-sm tracking-wide ${darkMode ? 'bg-[#0f172a] border-slate-800 focus:border-sky-500 text-white' : 'bg-white text-slate-900 focus:border-sky-600'}`} value={sel.match} onChange={e => { const updated = [...newBet.selections]; updated[index].match = e.target.value; setNewBet({...newBet, selections: updated}); }} />
                          </div>
                          <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-black opacity-30 uppercase ml-2 tracking-[0.2em]">Competencia</label>
                            <input type="text" required placeholder="Ej: Champions League" className={`p-5 rounded-[20px] border outline-none font-black text-sm tracking-wide ${darkMode ? 'bg-[#0f172a] border-slate-800 focus:border-sky-500 text-white' : 'bg-white text-slate-900 focus:border-sky-600'}`} value={sel.competition} onChange={e => { const updated = [...newBet.selections]; updated[index].competition = e.target.value; setNewBet({...newBet, selections: updated}); }} />
                          </div>
                          <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-black opacity-30 uppercase ml-2 tracking-[0.2em]">Fecha y Hora</label>
                            <div className="flex gap-4">
                              <input type="date" className={`w-1/2 p-5 rounded-[20px] border outline-none font-black text-xs ${darkMode ? 'bg-[#0f172a] border-slate-800 focus:border-sky-500' : 'bg-white'}`} value={sel.date} onChange={e => { const updated = [...newBet.selections]; updated[index].date = e.target.value; setNewBet({...newBet, selections: updated}); }} />
                              <input type="time" className={`w-1/2 p-5 rounded-[20px] border outline-none font-black text-xs ${darkMode ? 'bg-[#0f172a] border-slate-800 focus:border-sky-500' : 'bg-white'}`} value={sel.time} onChange={e => { const updated = [...newBet.selections]; updated[index].time = e.target.value; setNewBet({...newBet, selections: updated}); }} />
                            </div>
                          </div>
                          <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-black opacity-30 uppercase ml-2 tracking-[0.2em]">Pronóstico</label>
                            <select className={`p-5 rounded-[20px] border outline-none font-black text-sm ${darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white'}`} value={sel.type} onChange={e => { const updated = [...newBet.selections]; updated[index].type = e.target.value; setNewBet({...newBet, selections: updated}); }}>
                              {TIPOS_APUESTA.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          {sel.type === "Personalizado (Escribir...)" && (
                            <div className="flex flex-col gap-3 md:col-span-2">
                               <label className="text-[10px] font-black text-sky-400 uppercase ml-2 tracking-[0.2em] flex items-center gap-2">Escribe tu mercado detallado ✍️</label>
                               <input type="text" placeholder="Ej: Messi remata +1.5 veces al arco..." className={`p-5 rounded-[20px] border outline-none font-black text-sm bg-sky-500/5 border-sky-500/30 text-sky-400`} value={sel.customType} onChange={e => { const updated = [...newBet.selections]; updated[index].customType = e.target.value; setNewBet({...newBet, selections: updated}); }} />
                            </div>
                          )}
                          <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-black text-sky-400 uppercase ml-2 tracking-[0.2em]">Cuota de Selección</label>
                            <input type="number" step="0.01" className={`p-5 rounded-[20px] border outline-none font-black text-sm tracking-widest ${darkMode ? 'bg-[#0f172a] border-slate-800 focus:border-sky-500 text-white' : 'bg-white text-slate-900'}`} value={sel.odds} onChange={e => { const updated = [...newBet.selections]; updated[index].odds = parseFloat(e.target.value) || 0; setNewBet({...newBet, selections: updated}); }} />
                          </div>
                        </div>
                        {newBet.selections.length > 1 && (
                          <button type="button" onClick={() => { const updated = newBet.selections.filter((_, i) => i !== index); setNewBet({...newBet, selections: updated}); }} className="absolute -top-4 -right-4 bg-rose-500 text-white rounded-[18px] p-3 shadow-2xl hover:scale-110 active:scale-95 transition-all"><MinusCircle size={22} /></button>
                        )}
                        
                        <div className="mt-6 flex gap-4 items-center">
                            <button type="button" onClick={() => scoutMatch(index)} disabled={scoutLoading} className="text-[10px] font-black text-sky-400 uppercase flex items-center gap-3 hover:opacity-70 transition-all tracking-[0.3em]">
                                {scoutLoading ? <Loader2 size={16} className="animate-spin"/> : <Search size={16}/>} 
                                Explorar con IA Scout ✨
                            </button>
                        </div>
                        {scoutResponse && sel.match && scoutResponse.includes(sel.match) && (
                            <div className="mt-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 font-medium animate-in fade-in">
                                {scoutResponse}
                            </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {newBet.modality !== 'Simple' && (
                    <button type="button" onClick={() => setNewBet(p => ({ ...p, selections: [...p.selections, { match: '', competition: '', type: '1X2 (Resultado Final)', customType: '', odds: 1.50, time: '12:00', date: new Date().toISOString().split('T')[0] }] }))} className="w-full py-6 border-2 border-dashed border-sky-600/30 rounded-[35px] text-sky-400 font-black text-[10px] uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:bg-sky-500/5 transition-all shadow-inner"><PlusCircle size={26} /> Añadir Partido al Ticket</button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-10 border-t border-slate-800">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Cuota Final</label>
                      <input type="number" step="0.01" required className={`p-5 rounded-[22px] border outline-none font-black text-xl text-sky-400 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`} value={newBet.totalOdds} onChange={e => setNewBet({...newBet, totalOdds: parseFloat(e.target.value) || 0})} readOnly={newBet.modality !== 'Simple'} />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Importe ({MONEDA})</label>
                      <input type="number" step="1" required placeholder="0" className={`p-5 rounded-[22px] border outline-none font-black text-xl ${darkMode ? 'bg-slate-900 border-slate-800 focus:border-sky-500 text-white' : 'bg-slate-50 text-slate-900'}`} value={newBet.amount} onChange={e => setNewBet({...newBet, amount: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Casa</label>
                      <select className={`p-5 rounded-[22px] border outline-none font-black text-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 shadow-sm'}`} value={newBet.bookmaker} onChange={e => setNewBet({...newBet, bookmaker: e.target.value})}>{CASAS.map(b => <option key={b} value={b}>{b}</option>)}</select>
                    </div>
                    <div className="flex flex-col gap-3 text-center">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'opacity-30' : 'text-slate-600'}`}>Cobro Estimado: <span className="text-emerald-400 font-black">{MONEDA}{((parseFloat(newBet.amount as string) || 0) * newBet.totalOdds).toFixed(2)}</span></p>
                      <input type="range" min="1" max="10" className="w-full h-12 accent-sky-500 bg-transparent cursor-pointer" value={newBet.stake} onChange={e => setNewBet({...newBet, stake: parseInt(e.target.value)})} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-sky-600 text-white font-black py-7 rounded-[35px] uppercase shadow-2xl shadow-sky-600/30 active:scale-[0.98] transition-all tracking-[0.4em] text-sm">Guardar Jugada 🚀</button>
                </form>
              </div>

              {/* SECCIÓN DE APROBACIÓN DE JUGADAS */}
              <div className="space-y-6">
                <h3 className={`text-2xl font-black flex items-center gap-4 italic uppercase tracking-tighter ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>Aprobación ⚖️</h3>
                <div className="grid grid-cols-1 gap-6 overflow-auto max-h-[1000px] scrollbar-hide">
                  {bets.filter(b => b.result === 'Pendiente').length === 0 && <p className="text-center opacity-20 py-16 font-bold italic text-xs tracking-widest uppercase">Sin jugadas activas... 🐬</p>}
                  {bets.filter(b => b.result === 'Pendiente').reverse().map(bet => (
                    <div key={bet.id} className={`p-6 rounded-[35px] border flex flex-col justify-between transition-all hover:shadow-xl ${darkMode ? 'bg-[#0f172a] border-slate-800 shadow-xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${bet.modality === 'Combinada' ? 'bg-orange-500 text-black' : 'bg-sky-600 text-white'}`}>{bet.modality}</span>
                          <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-600'}`}>{bet.bookmaker}</span>
                        </div>
                        <div className="space-y-3 mb-4">
                          {(bet.selections || []).map((sel, i) => (
                            <div key={i} className="border-l-2 border-sky-500/20 pl-3">
                              <h4 className={`font-black text-xs uppercase leading-tight ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{sel.match}</h4>
                              <p className="font-bold opacity-30 uppercase text-[9px]">{sel.date} • {sel.type} @{parseFloat(sel.odds as any).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-6">
                         <button onClick={() => updateBetResult(bet.id, 'Ganada')} className="flex-1 bg-sky-500/10 text-sky-400 p-4 rounded-[20px] flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all shadow-sm"><CheckCircle2 size={24} /></button>
                         <button onClick={() => updateBetResult(bet.id, 'Perdida')} className="flex-1 bg-rose-500/10 text-rose-500 p-4 rounded-[20px] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"><XCircle size={24} /></button>
                         <button onClick={() => handleDelete(bet.id, 'bets')} className={`p-4 rounded-[20px] transition-all ${darkMode ? 'bg-slate-800/50 text-slate-400 hover:text-rose-500' : 'bg-slate-100 text-slate-500 hover:text-rose-600'}`}><Trash2 size={20} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className={`rounded-[50px] border overflow-hidden ${darkMode ? 'bg-[#0f172a] border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className={`p-10 border-b flex justify-between items-center ${darkMode ? 'bg-slate-950/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`font-black uppercase italic tracking-tighter ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>Log Maestro de Jugadas ✅</h3>
                <div className="relative group max-w-xs">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                   <input type="text" placeholder="Filtrar jugada..." className={`w-full pl-12 pr-4 py-3 rounded-2xl border outline-none transition-all font-bold text-xs ${darkMode ? 'bg-[#020617] border-slate-800 text-white focus:border-sky-500' : 'bg-white border-slate-200 shadow-sm'}`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1100px]">
                  <thead className={`text-[10px] uppercase font-black tracking-[0.3em] ${darkMode ? 'bg-slate-950/70' : 'bg-slate-100/50'}`}>
                    <tr><th className="px-10 py-6">Ticket / Partidos</th><th className="px-6 py-6 text-center">Cuota</th><th className="px-6 py-6 text-center">Importe</th><th className="px-6 py-6 text-center">Retorno ({MONEDA})</th><th className="px-6 py-6 text-center">Profit Neto</th><th className="px-10 py-6"></th></tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-800/30' : 'divide-slate-200'}`}>
                    {[...bets]
                      .filter(b => b.result !== 'Pendiente' && (
                          searchTerm === "" || b.selections.some(s => s.match.toLowerCase().includes(searchTerm.toLowerCase()))
                      ))
                      .reverse()
                      .map(bet => {
                      const odds = parseFloat(bet.totalOdds as any || 0);
                      const amount = parseFloat(bet.amount as any || 0);
                      const totalReturn = bet.result === 'Ganada' ? (odds * amount) : (bet.result === 'Cash Out' ? parseFloat(bet.cashOutValue as any || 0) : 0);
                      const pl = bet.result === 'Nula' ? 0 : totalReturn - amount;
                      
                      return (
                        <tr key={bet.id} className="hover:bg-sky-400/5 transition-all align-top group">
                          <td className="px-10 py-8">
                            <div className="flex items-center gap-3 mb-4">
                               <span className={`text-[8px] px-2.5 py-1 rounded-[6px] font-black uppercase ${bet.modality === 'Combinada' ? 'bg-orange-500 text-black' : 'bg-sky-600 text-white'}`}>{bet.modality}</span>
                               <span className={`text-[8px] px-2 py-1 rounded-[6px] font-black uppercase tracking-widest ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{bet.bookmaker}</span>
                               <span className={`text-[8px] px-2 py-1 rounded-[6px] font-black uppercase tracking-widest ${
                                   bet.result === 'Ganada' ? 'bg-emerald-500/20 text-emerald-500' :
                                   bet.result === 'Perdida' ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-500/20 text-slate-500'
                               }`}>{bet.result}</span>
                            </div>
                            <div className={`text-sm font-black uppercase ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{bet.selections?.[0]?.match} {bet.selections?.length > 1 && `(+${bet.selections.length - 1})`}</div>
                            <button onClick={() => setViewingBet(bet)} className="mt-2 text-[10px] font-black text-sky-400 flex items-center gap-1.5 hover:underline tracking-widest uppercase"><Eye size={12}/> Detalles</button>
                          </td>
                          <td className="px-6 py-8 text-center font-mono font-black text-sky-400 text-xl tracking-tighter">@{odds.toFixed(2)}</td>
                          <td className={`px-6 py-8 text-center font-black ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{MONEDA}{amount.toLocaleString()}</td>
                          <td className={`px-6 py-8 text-center font-black text-xl text-emerald-400`}>{MONEDA}{totalReturn.toLocaleString()}</td>
                          <td className={`px-6 py-8 text-center font-black text-xl ${pl >= 0 ? 'text-sky-400' : 'text-rose-500'}`}>{pl >= 0 ? '+' : ''}{pl.toFixed(2)}</td>
                          <td className="px-10 py-8 text-right"><div className="flex gap-4 justify-end items-center relative z-10"><button onClick={() => setEditingItem(bet)} className={`p-4 rounded-2xl transition-all cursor-pointer ${darkMode ? 'bg-slate-800/50 text-slate-400 hover:text-sky-400' : 'bg-slate-100 text-slate-500 hover:text-sky-600'}`}><Edit3 size={20} /></button><button onClick={(e) => { e.stopPropagation(); handleDelete(bet.id, 'bets'); }} className={`p-4 rounded-2xl transition-all cursor-pointer ${darkMode ? 'bg-slate-800/50 text-slate-400 hover:text-rose-500' : 'bg-slate-100 text-slate-500 hover:text-rose-600'}`}><Trash2 size={20} /></button></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className={`p-10 rounded-[50px] border h-fit ${darkMode ? 'bg-[#0f172a] border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                <h3 className={`text-2xl font-black mb-10 flex items-center gap-4 italic uppercase tracking-tighter ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}><Wallet size={32}/> Inyectar Capital 💰</h3>
                <form onSubmit={handleAddDeposit} className="space-y-8">
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black opacity-30 uppercase ml-2 tracking-[0.3em]">Monto Nominal ({MONEDA})</label>
                    <input type="number" step="0.1" required placeholder="0.00" className={`p-6 rounded-[28px] border outline-none text-4xl font-black text-sky-400 tracking-tighter ${darkMode ? 'bg-slate-950 border-slate-800 focus:border-sky-500' : 'bg-slate-50 focus:border-sky-600'}`} value={newDeposit.amount} onChange={e => setNewDeposit({...newDeposit, amount: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black opacity-30 uppercase ml-2 tracking-[0.3em]">Referencia / Concepto</label>
                    <input type="text" className={`p-5 rounded-[22px] border outline-none font-black tracking-wide ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 shadow-sm'}`} value={newDeposit.note} onChange={e => setNewDeposit({...newDeposit, note: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full bg-sky-600 text-white font-black py-7 rounded-[30px] uppercase shadow-lg shadow-sky-600/30 active:scale-[0.98] transition-all tracking-[0.4em] text-xs">Confirmar Carga de Capital 🏦</button>
                </form>
              </div>
              <div className={`rounded-[50px] border overflow-hidden ${darkMode ? 'bg-[#0f172a] border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className={`p-10 border-b flex justify-between items-center ${darkMode ? 'bg-slate-950/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}><h3 className="font-black uppercase italic tracking-tighter text-slate-500">Log de Fondos</h3></div>
                <div className="max-h-[600px] overflow-auto scrollbar-hide">
                   {[...(deposits || [])]
                     .filter(d => d && d.createdAt)
                     .sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                     .map(dep => (
                       <div key={dep.id} className={`flex items-center justify-between p-10 border-b transition-all group ${darkMode ? 'border-slate-800/50 hover:bg-sky-400/5' : 'border-slate-100 hover:bg-slate-50'}`}>
                         <div><p className="font-black text-3xl text-sky-400 tracking-tighter">{MONEDA}{parseFloat(dep.amount as any || 0).toLocaleString()}</p><p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20 mt-2">{dep.note} | {new Date(dep.createdAt || "").toLocaleDateString()}</p></div>
                         <div className="flex gap-4 items-center relative z-10"><button onClick={() => setEditingItem(dep)} className={`p-4 rounded-2xl transition-all cursor-pointer ${darkMode ? 'bg-slate-800/50 text-slate-400 hover:text-sky-400' : 'bg-slate-200/50 text-slate-500 hover:text-sky-600'}`}><Edit3 size={20} /></button><button onClick={(e) => { e.stopPropagation(); handleDelete(dep.id, 'deposits'); }} className={`p-4 rounded-2xl transition-all cursor-pointer ${darkMode ? 'bg-slate-800/50 text-slate-400 hover:text-rose-500' : 'bg-slate-200/50 text-slate-500 hover:text-rose-600'}`}><Trash2 size={20} /></button></div>
                       </div>
                     ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
             <div className="max-w-7xl mx-auto space-y-12">
                <div className={`p-12 rounded-[60px] border ${darkMode ? 'bg-[#0f172a] border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <h3 className={`text-2xl font-black mb-12 text-center uppercase italic tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>Rendimiento ROI Mensual % 📈</h3>
                    <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={statsAvancadas}>
                          <defs><linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.5}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                          <XAxis dataKey="month" tick={{fontSize: 10, fill: '#64748b', fontWeight: 900}} />
                          <YAxis tick={{fontSize: 10, fill: '#64748b'}} unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', border: 'none', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} itemStyle={{color: '#0ea5e9', fontWeight: 900}} />
                          <Area type="monotone" dataKey="roi" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorRoi)" strokeWidth={6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* MODAL DETALLES APUESTA */}
      {viewingBet && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in">
          <div className={`w-full max-w-2xl p-12 rounded-[60px] border ${darkMode ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white shadow-2xl text-slate-900'}`}>
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-sky-400 flex items-center gap-3"><FileText size={28}/> DETALLES DEL TICKET 📝</h3>
              <button onClick={() => setViewingBet(null)} className={`p-4 rounded-full transition-all ${darkMode ? 'hover:bg-slate-800/40 text-white' : 'hover:bg-slate-200 text-slate-900'}`}><X size={28}/></button>
            </div>
            <div className="space-y-6">
              <div className={`grid grid-cols-2 gap-6 p-6 rounded-[30px] border ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div><p className="text-[10px] font-black uppercase opacity-40">Modalidad</p><p className="font-black text-sky-400">{viewingBet.modality}</p></div>
                <div><p className="text-[10px] font-black uppercase opacity-40">Casa</p><p className="font-black text-sky-400">{viewingBet.bookmaker}</p></div>
                <div><p className="text-[10px] font-black uppercase opacity-40">Cuota Final</p><p className="font-mono font-black text-emerald-400">@{parseFloat(viewingBet.totalOdds as any).toFixed(2)}</p></div>
                <div><p className="text-[10px] font-black uppercase opacity-40">Importe</p><p className="font-black">{MONEDA}{viewingBet.amount}</p></div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase opacity-40 ml-2">Selecciones incluidas:</p>
                <div className="max-h-60 overflow-auto space-y-4 pr-2 scrollbar-hide">
                  {(viewingBet.selections || []).map((sel, idx) => (
                    <div key={idx} className={`p-6 rounded-[28px] border ${darkMode ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-100/50 border-slate-200'}`}>
                      <h4 className="font-black uppercase text-sm mb-1">{sel.match}</h4>
                      <div className="flex justify-between items-center">
                         <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">{sel.competition} • {sel.type} {sel.customType && `(${sel.customType})`}</p>
                         <span className="font-mono font-black text-sky-400 text-xs">@{parseFloat(sel.odds as any).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN SEGURO */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in">
          <div className={`w-full max-w-lg p-12 rounded-[60px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] border ${darkMode ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-200 shadow-2xl text-slate-900'}`}>
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-sky-400">Auditoría 📝</h3>
              <button onClick={() => setEditingItem(null)} className={`p-4 rounded-full transition-all ${darkMode ? 'hover:bg-slate-800/40 text-white' : 'hover:bg-slate-200 text-slate-900'}`}><X size={28}/></button>
            </div>
            <div className="space-y-8">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black opacity-40 uppercase ml-2 tracking-widest">Importe Real ({MONEDA})</label>
                <input type="number" step="0.1" className={`p-6 rounded-[24px] border outline-none font-black text-3xl text-sky-400 tracking-tighter ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`} value={editingItem.amount} onChange={e => setEditingItem({...editingItem, amount: e.target.value})} />
              </div>
              {editingItem.totalOdds !== undefined ? (
                <>
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black opacity-40 uppercase ml-2 tracking-widest">Cuota Final de Operación</label>
                    <input type="number" step="0.01" className={`p-6 rounded-[24px] border outline-none font-black text-3xl text-sky-400 tracking-tighter ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`} value={editingItem.totalOdds} onChange={e => setEditingItem({...editingItem, totalOdds: e.target.value})} />
                  </div>
                  {editingItem.result === 'Cash Out' && (
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black opacity-40 uppercase ml-2 tracking-widest">Monto Retirado Final</label>
                      <input type="number" step="0.1" className={`p-6 rounded-[24px] border outline-none font-black text-3xl text-sky-400 tracking-tighter ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`} value={editingItem.cashOutValue} onChange={e => setEditingItem({...editingItem, cashOutValue: e.target.value})} />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black opacity-40 uppercase ml-2 tracking-widest">Referencia / Glosa</label>
                  <input type="text" className={`p-6 rounded-[24px] border outline-none font-black tracking-wide ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`} value={editingItem.note} onChange={e => setEditingItem({...editingItem, note: e.target.value})} />
                </div>
              )}
              <button onClick={() => handleEditSave(editingItem)} className="w-full bg-sky-600 text-white font-black py-7 rounded-[30px] uppercase shadow-lg shadow-sky-600/30 transition-all tracking-[0.4em] active:scale-95 text-xs">Actualizar Gotia Cloud 💾</button>
            </div>
          </div>
        </div>
      )}

      <footer className={`px-10 py-5 flex flex-col md:flex-row justify-between items-center text-[10px] font-black uppercase tracking-[0.5em] border-t ${darkMode ? 'bg-[#0f172a] border-slate-800 text-slate-700' : 'bg-white border-slate-100 text-slate-300'}`}>
        <div className="flex gap-8"><span className="flex items-center gap-2"><Cloud size={16} className="text-sky-500" /> Gotia Intelligence {APP_VERSION}</span><span className="text-emerald-500 flex items-center gap-2"><ShieldCheck size={16} /> Final Stable Mode</span></div>
        <div className="mt-3 md:mt-0 opacity-20 italic tracking-widest text-center uppercase tracking-tighter">Elite Football Trading Intelligence Ecosystem</div>
      </footer>
    </div>
  );
};

export default App;