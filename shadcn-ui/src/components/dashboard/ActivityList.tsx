import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOPDocument } from "@/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import axios from "axios";
import { AuthService } from "@/lib/auth";

const API_URL = "http://localhost:8000/api";

interface ActivityListProps {
  sopDocuments: SOPDocument[];
}

interface ActivityLog {
  id: string;
  user_id: string;
  sop_id: string;
  action: string;
  description: string;
  created_at: string;
}

interface MonthlyData {
  month: string;
  "SOP Dibuat": number;
  "SOP Diperbarui": number;
  "SOP Dihapus": number;
}

export default function ActivityList({ sopDocuments }: ActivityListProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch activity logs from backend
  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      const token = AuthService.getToken();
      
      if (!token) return;

      const response = await axios.get(`${API_URL}/activities?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setActivityLogs(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      setLoading(false);
    }
  };

  // ✅ Generate monthly trend from real activity logs
  const generateMonthlyTrend = (): MonthlyData[] => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];

    const currentYear = new Date().getFullYear();
    const monthlyData: MonthlyData[] = months.map(month => ({
      month,
      "SOP Dibuat": 0,
      "SOP Diperbarui": 0,
      "SOP Dihapus": 0,
    }));

    // Count activities per month
    activityLogs.forEach(log => {
      const date = new Date(log.created_at);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        
        if (log.action.toLowerCase().includes("create")) {
          monthlyData[monthIndex]["SOP Dibuat"]++;
        } else if (log.action.toLowerCase().includes("update")) {
          monthlyData[monthIndex]["SOP Diperbarui"]++;
        } else if (log.action.toLowerCase().includes("delete")) {
          monthlyData[monthIndex]["SOP Dihapus"]++;
        }
      }
    });

    // Return only months with data (up to current month)
    const currentMonth = new Date().getMonth();
    return monthlyData.slice(0, currentMonth + 1);
  };

  const monthlyTrend = generateMonthlyTrend();

  // ✅ Calculate department stats from real SOP documents
  const departmentStats = sopDocuments.reduce((acc, doc) => {
    acc[doc.department] = (acc[doc.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSOP = sopDocuments.length;

  // ✅ Sort departments by count (descending)
  const sortedDepartments = Object.entries(departmentStats)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Trend Aktivitas - Real Data */}
      <Card className="bg-white/90 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle>Trend Aktivitas Bulanan</CardTitle>
          <p className="text-sm text-gray-500">
            Jumlah SOP yang dibuat dan diperbarui per bulan (tahun {new Date().getFullYear()})
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : monthlyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-gray-500">
              Belum ada data aktivitas
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6b7280' }}
                  axisLine={{ stroke: '#9ca3af' }}
                />
                <YAxis 
                  label={{ 
                    value: 'Jumlah SOP', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: '#6b7280' } 
                  }}
                  tick={{ fill: '#6b7280' }}
                  axisLine={{ stroke: '#9ca3af' }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="line"
                  wrapperStyle={{ paddingBottom: '10px' }}
                />
                <Line
                  type="monotone"
                  dataKey="SOP Dibuat"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="SOP Diperbarui"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="SOP Dihapus"
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot={{ fill: '#EF4444', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detail Distribusi per Tim - Real Data */}
      <Card className="bg-white/90 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle>Detail Distribusi per Tim</CardTitle>
          <p className="text-sm text-gray-500">
            {sortedDepartments.length} tim dengan total {totalSOP} SOP
          </p>
        </CardHeader>
        <CardContent>
          {totalSOP === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-gray-500">
              Belum ada SOP
            </div>
          ) : (
            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
              {sortedDepartments.map(([name, value], index) => {
                const colors = [
                  "#3B82F6",
                  "#10B981",
                  "#F59E0B",
                  "#EF4444",
                  "#8B5CF6",
                  "#EC4899",
                  "#14B8A6",
                  "#F97316",
                  "#6366F1",
                  "#84CC16",
                ];
                const color = colors[index % colors.length];
                const percentage = ((value / totalSOP) * 100).toFixed(1);
                
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: color }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800 truncate block">
                          {name || "Tidak ada nama"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {percentage}% dari total
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-500 ease-out"
                          style={{
                            backgroundColor: color,
                            width: `${percentage}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-8 text-right">
                        {value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}