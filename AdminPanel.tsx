import React, { useEffect, useState } from 'react';
import { db } from '../firebase'; // Ajuste o caminho conforme seu projeto
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Users, Filter, Download, Activity, CreditCard } from 'lucide-react';

const AdminPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  // Função para calcular se o usuário é "Ativo" (usou nos últimos 3 dias)
  const isUserActive = (lastActive: any) => {
    if (!lastActive) return false;
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    return lastActive.toDate().getTime() > threeDaysAgo;
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin LYVO™</h1>
            <p className="text-gray-500">Gestão de Usuários e Métricas de Público</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
            <Download size={18} /> Exportar CSV
          </button>
        </header>

        {/* CARDS DE MÉTRICAS RÁPIDAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-blue-600 mb-2"><Users size={24}/></div>
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-gray-500 text-sm">Total de Usuários</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-green-600 mb-2"><Activity size={24}/></div>
            <div className="text-2xl font-bold">{users.filter(u => isUserActive(u.lastActiveAt)).length}</div>
            <div className="text-gray-500 text-sm">Ativos nos últimos 3 dias</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-purple-600 mb-2"><CreditCard size={24}/></div>
            <div className="text-2xl font-bold">{users.filter(u => u.plan === 'annual').length}</div>
            <div className="text-gray-500 text-sm">Assinantes Anuais</div>
          </div>
        </div>

        {/* TABELA DE DADOS ESTRATÉGICOS */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-bold text-gray-700 text-sm uppercase">Usuário</th>
                  <th className="p-4 font-bold text-gray-700 text-sm uppercase">Perfil / Renda</th>
                  <th className="p-4 font-bold text-gray-700 text-sm uppercase">Localização</th>
                  <th className="p-4 font-bold text-gray-700 text-sm uppercase">Plano / Status</th>
                  <th className="p-4 font-bold text-gray-700 text-sm uppercase">Último Uso</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      <div className="text-xs text-blue-600 font-medium">{user.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-700">{user.profession}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-md">
                        {user.income}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {user.city} - {user.state}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full w-fit uppercase ${
                          user.plan === 'annual' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.plan}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full w-fit ${
                          user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {user.active ? 'CONTA ATIVA' : 'INATIVA/TRIAL'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-700">
                        {user.lastActiveAt ? user.lastActiveAt.toDate().toLocaleDateString() : 'Nunca acessou'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
