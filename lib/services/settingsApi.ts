export interface WaniKaniTokenStatus {
  hasToken: boolean;
  updatedAt: number | null;
}

export const fetchWaniKaniTokenStatus = async (): Promise<WaniKaniTokenStatus> => {
  return await $fetch("/api/settings/wanikani-token");
};

export const saveWaniKaniToken = async (token: string) => {
  return await $fetch("/api/settings/wanikani-token", {
    method: "POST",
    body: { token },
  });
};
