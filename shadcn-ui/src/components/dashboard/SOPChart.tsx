import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOPDocument } from "@/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface SOPChartProps {
  sopDocuments: SOPDocument[];
  selectedYear: string;
  onDepartmentClick: (deptName: string) => void;
}

interface YearlyData {
  year: string;
  active: number;
  draft: number;
  archived: number;
}

export default function SOPChart({ 
  sopDocuments, 
  selectedYear, 
  onDepartmentClick 
}: SOPChartProps) {
  
  // ✅ Generate yearly data from real SOP documents
  const generateYearlyData = (): YearlyData[] => {
    const currentYear = new Date().getFullYear();
    const years = [
      currentYear - 4,
      currentYear - 3,
      currentYear - 2,
      currentYear - 1,
      currentYear,
    ];

    return years.map(year => {
      // Filter SOPs by effective date year
      const sopsInYear = sopDocuments.filter(doc => {
        if (!doc.effectiveDate) return false;
        const effectiveYear = new Date(doc.effectiveDate).getFullYear();
        return effectiveYear === year;
      });

      // Count by status
      const statusCount = sopsInYear.reduce((acc, doc) => {
        const status = doc.status || 'draft';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        year: year.toString(),
        active: statusCount.active || 0,
        draft: statusCount.draft || 0,
        archived: statusCount.archived || 0,
      };
    });
  };

  const yearlyData = generateYearlyData();

  // ✅ Generate department distribution from real SOPs
  const departmentStats = sopDocuments.reduce((acc, doc) => {
    const dept = doc.department || "Tidak ada departemen";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ✅ Sort by count and take top departments
  const sortedDepartments = Object.entries(departmentStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Top 10 departments

  const departmentData = sortedDepartments.map(([name, value], index) => ({
    name,
    value,
    color: [
      "#3B82F6", // Blue
      "#10B981", // Green
      "#F59E0B", // Orange
      "#EF4444", // Red
      "#8B5CF6", // Purple
      "#EC4899", // Pink
      "#14B8A6", // Teal
      "#F97316", // Orange (darker)
      "#6366F1", // Indigo
      "#84CC16", // Lime
    ][index % 10],
  }));

  // ✅ Calculate totals for yearly chart
  const yearlyTotals = yearlyData.reduce((acc, year) => {
    acc.active += year.active;
    acc.draft += year.draft;
    acc.archived += year.archived;
    return acc;
  }, { active: 0, draft: 0, archived: 0 });

  // ✅ Custom label for pie chart
  const renderCustomLabel = ({ name, value, percent }: any) => {
    return `${name}: ${value} (${(percent * 100).toFixed(0)}%)`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Grafik Tahunan - Real Data */}
      <Card className="bg-white/90 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle>Perkembangan SOP per Tahun</CardTitle>
          <p className="text-sm text-gray-500">
            Total: {yearlyTotals.active + yearlyTotals.draft + yearlyTotals.archived} SOP 
            (Active: {yearlyTotals.active}, Draft: {yearlyTotals.draft}, Archived: {yearlyTotals.archived})
          </p>
        </CardHeader>
        <CardContent>
          {sopDocuments.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-gray-500">
              Belum ada data SOP
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fill: '#6b7280' }}
                  axisLine={{ stroke: '#9ca3af' }}
                />
                <YAxis 
                  tick={{ fill: '#6b7280' }}
                  axisLine={{ stroke: '#9ca3af' }}
                  allowDecimals={false}
                  label={{ 
                    value: 'Jumlah SOP', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#6b7280' }
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  wrapperStyle={{ paddingBottom: '10px' }}
                />
                <Bar 
                  dataKey="active" 
                  fill="#10B981" 
                  name="Active" 
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="draft" 
                  fill="#F59E0B" 
                  name="Draft" 
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="archived" 
                  fill="#EF4444" 
                  name="Archived" 
                  stackId="a"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Distribusi per Tim - Real Data */}
      <Card className="bg-white/90 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle>Distribusi SOP per Tim</CardTitle>
          <p className="text-sm text-gray-500">
            {departmentData.length} tim • Total {sopDocuments.length} SOP • Klik untuk detail
          </p>
        </CardHeader>
        <CardContent>
          {departmentData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-gray-500">
              Belum ada data tim
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  dataKey="value"
                  label={renderCustomLabel}
                  labelLine={true}
                  onClick={(data) => onDepartmentClick(data.name)}
                  style={{ cursor: "pointer" }}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {departmentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="hover:opacity-80 transition-opacity"
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} SOP (${((value / sopDocuments.length) * 100).toFixed(1)}%)`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}