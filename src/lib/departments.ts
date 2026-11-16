export interface BPSTeam {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const BPS_TEAMS: BPSTeam[] = [
  { 
    id: "Distribusi", 
    name: "Distribusi", 
    color: "#84cc16", 
    bgColor: "bg-lime-100 dark:bg-lime-950/50", 
    textColor: "text-lime-800 dark:text-lime-400", 
    borderColor: "border-lime-300 dark:border-lime-800" 
  },
  { 
    id: "ZI", 
    name: "ZI", 
    color: "#2563eb", 
    bgColor: "bg-blue-100 dark:bg-blue-950/50", 
    textColor: "text-blue-800 dark:text-blue-400", 
    borderColor: "border-blue-300 dark:border-blue-800" 
  },
  { 
    id: "PSS", 
    name: "PSS", 
    color: "#ec4899", 
    bgColor: "bg-pink-100 dark:bg-pink-950/50", 
    textColor: "text-pink-700 dark:text-pink-400", 
    borderColor: "border-pink-300 dark:border-pink-800" 
  },
  { 
    id: "POTIK", 
    name: "POTIK", 
    color: "#06b6d4", 
    bgColor: "bg-cyan-100 dark:bg-cyan-950/50", 
    textColor: "text-cyan-700 dark:text-cyan-400", 
    borderColor: "border-cyan-300 dark:border-cyan-800" 
  },
  { 
    id: "Produksi", 
    name: "Produksi", 
    color: "#a855f7", 
    bgColor: "bg-purple-100 dark:bg-purple-950/50", 
    textColor: "text-purple-700 dark:text-purple-400", 
    borderColor: "border-purple-300 dark:border-purple-800" 
  },
  { 
    id: "Sosial", 
    name: "Sosial", 
    color: "#f43f5e", 
    bgColor: "bg-rose-100/70 dark:bg-rose-950/40", 
    textColor: "text-rose-800 dark:text-rose-400", 
    borderColor: "border-rose-300 dark:border-rose-800" 
  },
  { 
    id: "TU", 
    name: "TU", 
    color: "#64748b", 
    bgColor: "bg-slate-100 dark:bg-slate-800", 
    textColor: "text-slate-800 dark:text-slate-300", 
    borderColor: "border-slate-300 dark:border-slate-700" 
  },
  { 
    id: "Neraca", 
    name: "Neraca", 
    color: "#ef4444", 
    bgColor: "bg-red-100 dark:bg-red-950/50", 
    textColor: "text-red-600 dark:text-red-400", 
    borderColor: "border-red-300 dark:border-red-800" 
  },
  { 
    id: "Humas", 
    name: "Humas", 
    color: "#f59e0b", 
    bgColor: "bg-amber-100 dark:bg-amber-950/50", 
    textColor: "text-amber-800 dark:text-amber-400", 
    borderColor: "border-amber-300 dark:border-amber-800" 
  },
  { 
    id: "IPDS", 
    name: "IPDS", 
    color: "#eab308", 
    bgColor: "bg-yellow-100 dark:bg-yellow-950/50", 
    textColor: "text-yellow-800 dark:text-yellow-400", 
    borderColor: "border-yellow-300 dark:border-yellow-800" 
  },
  { 
    id: "Umum", 
    name: "Umum", 
    color: "#10b981", 
    bgColor: "bg-emerald-100 dark:bg-emerald-950/50", 
    textColor: "text-emerald-800 dark:text-emerald-400", 
    borderColor: "border-emerald-300 dark:border-emerald-800" 
  },
  { 
    id: "UKK", 
    name: "UKK", 
    color: "#6366f1", 
    bgColor: "bg-indigo-100 dark:bg-indigo-950/50", 
    textColor: "text-indigo-800 dark:text-indigo-400", 
    borderColor: "border-indigo-300 dark:border-indigo-800" 
  },
];

export const DEPARTMENTS = BPS_TEAMS.map((t) => t.name);

export const getTeamColor = (deptName: string): string => {
  const team = BPS_TEAMS.find((t) => t.name.toLowerCase() === (deptName || "").toLowerCase());
  return team ? team.color : "#3B82F6";
};
