import { useQuery } from "@tanstack/react-query";
import { api, MiningReport } from "@/lib/api";

export const useRecentReports = (email?: string) => {
  return useQuery<MiningReport[]>({
    queryKey: ["reports", email ?? "all"],
    queryFn: () => api.listReports(email),
    staleTime: 30_000,
  });
};

export const useReport = (reportId?: string) => {
  return useQuery<MiningReport | undefined>({
    queryKey: ["report", reportId],
    queryFn: async () => {
      if (!reportId) return undefined;
      return api.getReport(reportId);
    },
    enabled: !!reportId,
    staleTime: 10_000,
  });
};
