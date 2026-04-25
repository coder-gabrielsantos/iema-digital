'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, UtensilsCrossed, TrendingUp, RefreshCw, Clock, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/lib/utils';

interface DashboardData {
  totalStudents: number;
  presentStudents: number;
  presentPercent: number;
  todayMeals: number;
  mealForecast: number;
  hourlyData: { hour: string; entradas: number }[];
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  iconClass,
  bgClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  iconClass: string;
  bgClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
          </div>
          <div className={`rounded-xl p-3 ${bgClass}`}>
            <Icon className={`h-6 w-6 ${iconClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <ProtectedLayout requiredRole="admin">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Atualizado às {formatTime(lastUpdated)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            loading={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {loading && !data ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="h-8 w-16 rounded bg-slate-200" />
                    <div className="h-3 w-32 rounded bg-slate-200" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Metric cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
              <MetricCard
                icon={Users}
                label="Alunos no Prédio Agora"
                value={data.presentStudents}
                sub={`de ${data.totalStudents} matriculados (${data.presentPercent}%)`}
                iconClass="text-blue-600"
                bgClass="bg-blue-50"
              />
              <MetricCard
                icon={UtensilsCrossed}
                label="Refeições Servidas Hoje"
                value={data.todayMeals}
                sub={`de ${data.totalStudents} alunos`}
                iconClass="text-emerald-600"
                bgClass="bg-emerald-50"
              />
              <MetricCard
                icon={TrendingUp}
                label="Previsão Próxima Refeição"
                value={data.mealForecast}
                sub="estimativa baseada na presença atual"
                iconClass="text-amber-600"
                bgClass="bg-amber-50"
              />
            </div>

            {/* Presence bar */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-700">Taxa de Presença</p>
                  <Badge variant="default">{data.presentPercent}%</Badge>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                    style={{ width: `${data.presentPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{data.presentStudents} presentes</span>
                  <span>{data.totalStudents - data.presentStudents} ausentes</span>
                </div>
              </CardContent>
            </Card>

            {/* Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <CardTitle>Fluxo de Entradas por Horário</CardTitle>
                </div>
                <CardDescription>Número de entradas registradas por hora hoje</CardDescription>
              </CardHeader>
              <CardContent>
                {data.hourlyData.every((d) => d.entradas === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma entrada registrada ainda hoje</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        }}
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(v) => [v, 'Entradas']}
                      />
                      <Bar
                        dataKey="entradas"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
