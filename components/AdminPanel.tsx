import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase'; 
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Users, Filter, Download, Activity, CreditCard, Search, MapPin } from 'lucide-react';

const AdminPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const userList = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setUsers(userList);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const isUserActive = (lastActive: any) => {
    if (!lastActive) return false;
    try {
      const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      return date.getTime() > threeDaysAgo;
    } catch { return false; }
  };

  // Lógica de Filtro Profissional
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           u.profession?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPlan = filterPlan === "all" || u.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  if (loading) return <div className="p-10 text-center text-gray-500">Carregando base de dados...</div>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Admin LYVO™</h1>
            <p className="text-gray-500 text-sm">Inteligência e Gestão de Growth</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition">
              <Download size={16} /> Exportar Base
            </button>
          </div>
        </header>

        {/* MÉTRICAS EM CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-blue-500 bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center mb-3"><Users size={20}/></div>
            <div className="text-2xl font-black text-gray-800">{users.length}</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Leads</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-green-500 bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center mb-3"><Activity size={20}/></div>
            <div className="text-2xl font-black text-gray-800">{users.filter(u => isUserActive(u.lastActiveAt)).length}</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ativos (3D)</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-purple-500 bg-purple-50 w-10 h-10 rounded-lg flex items-center justify-center mb-3"><CreditCard size={20}/></div>
            <div className="text-2xl font-black text-gray-800">{users.filter(u => u.plan === 'annual').length}</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Planos Anuais</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-orange-500 bg-orange-50 w-10 h-10 rounded-lg flex items-center justify-center mb-3"><CreditCard size={20}/></div>
            <div className="text-2xl font-black text-gray-800">{users.filter(u => u.plan === 'monthly').length}</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Planos Mensais</div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-white p-4 rounded-2xl mb-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, e-mail ou profissão..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
          >
            <option value="all">Todos os Planos</option>
            <option value="annual">Somente Anual</option>
            <option value="monthly">Somente Mensal</option>
            <option value="trial">Somente Trial</option>
          </select>
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest">Identificação</th>
                  <th className="p-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest">Perfil Socioeconômico</th>
                  <th className="p-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest">Localização</th>
                  <th className="p-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest">Plano / Status</th>
                  <th className="p-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest">Engajamento</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{user.name || 'Sem Nome'}</div>
                      <div className="text-[11px] text-gray-400 mb-1">{user.email}</div>
                      <div className="text-[11px] text-blue-600 font-bold">{user.phone || '(s/ telefone)'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-700">{user.profession || 'Não informado'}</div>
                      <div className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded mt-1 uppercase">
                        {user.income || 'Renda n/d'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600 font-medium">
                        <MapPin size={12} className="text-gray-400" />
                        {user.city ? `${user.city} - ${user.state}` : 'Não mapeado'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full w-fit border ${
                          user.plan === 'annual' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                          user.plan === 'monthly' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                          {user.plan?.toUpperCase() || 'TRIAL'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-[12px]">
                      <div className="font-bold text-gray-700">
                        {user.lastActiveAt ? (user.lastActiveAt.toDate ? user.lastActiveAt.toDate().toLocaleDateString('pt-BR') : new Date(user.lastActiveAt).toLocaleDateString('pt-BR')) : 'Nunca'}
                      </div>
                      <div className={`text-[10px] font-bold ${isUserActive(user.lastActiveAt) ? 'text-green-500' : 'text-gray-300'}`}>
                        {isUserActive(user.lastActiveAt) ? 'ON-LINE AGORA' : 'OFF-LINE'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-20 text-center text-gray-400 text-sm">Nenhum usuário encontrado com esses filtros.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
