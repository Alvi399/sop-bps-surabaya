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
    id: "PSS", 
    name: "PSS", 
    color: "#f472b6", 
    bgColor: "bg-pink-100 dark:bg-pink-950/50", 
    textColor: "text-pink-600 dark:text-pink-400", 
    borderColor: "border-pink-300 dark:border-pink-800" 
  },
  { 
    id: "ZI", 
    name: "ZI", 
    color: "#004085", 
    bgColor: "bg-blue-100 dark:bg-blue-950/50", 
    textColor: "text-blue-800 dark:text-blue-400", 
    borderColor: "border-blue-300 dark:border-blue-800" 
  },
  { 
    id: "Sosial", 
    name: "Sosial", 
    color: "#a35858", 
    bgColor: "bg-rose-100/70 dark:bg-rose-950/40", 
    textColor: "text-rose-800 dark:text-rose-400", 
    borderColor: "border-rose-300 dark:border-rose-800" 
  },
  { 
    id: "POTIK", 
    name: "POTIK", 
    color: "#38d9d9", 
    bgColor: "bg-cyan-100 dark:bg-cyan-950/50", 
    textColor: "text-cyan-700 dark:text-cyan-400", 
    borderColor: "border-cyan-300 dark:border-cyan-800" 
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
    id: "Produksi", 
    name: "Produksi", 
    color: "#d8b4fe", 
    bgColor: "bg-purple-100 dark:bg-purple-950/50", 
    textColor: "text-purple-700 dark:text-purple-400", 
    borderColor: "border-purple-300 dark:border-purple-800" 
  },
  { 
    id: "HUMAS", 
    name: "HUMAS", 
    color: "#fbd38d", 
    bgColor: "bg-amber-100 dark:bg-amber-950/50", 
    textColor: "text-amber-800 dark:text-amber-400", 
    borderColor: "border-amber-300 dark:border-amber-800" 
  },
  { 
    id: "Distribusi", 
    name: "Distribusi", 
    color: "#bef264", 
    bgColor: "bg-lime-100 dark:bg-lime-950/50", 
    textColor: "text-lime-800 dark:text-lime-400", 
    borderColor: "border-lime-300 dark:border-lime-800" 
  },
  { 
    id: "IPDS", 
    name: "IPDS", 
    color: "#facc15", 
    bgColor: "bg-yellow-100 dark:bg-yellow-950/50", 
    textColor: "text-yellow-800 dark:text-yellow-400", 
    borderColor: "border-yellow-300 dark:border-yellow-800" 
  },
];

export const DEPARTMENTS = BPS_TEAMS.map((t) => t.name);

export const getTeamColor = (deptName: string): string => {
  const team = BPS_TEAMS.find((t) => t.name.toLowerCase() === (deptName || "").toLowerCase());
  return team ? team.color : "#3B82F6";
};
