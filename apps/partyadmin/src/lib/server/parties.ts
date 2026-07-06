import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { API_URL } from "#/lib/config";

function getAuthHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const accessToken = getCookie("access_token");
  const refreshToken = getCookie("refresh_token");

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
    headers["Cookie"] = `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
  }

  return headers;
}

export const getParties = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const response = await fetch(API_URL.parties);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch parties from API" };
    }
  });

export const getParty = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(`${API_URL.parties}/${id}`, {
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch party from API: " + (error as Error).message };
    }
  });

export const getPresignedUploadURL = createServerFn({ method: "POST" })
  .inputValidator((data: { original_name: string; mime_type: string; file_size: number; folder?: string; is_public?: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.uploadUrl, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to get upload URL: " + (error as Error).message };
    }
  });

export const confirmFileUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; success: boolean }) => data)
  .handler(async ({ data: { id, success } }) => {
    try {
      const response = await fetch(`${API_URL.confirmUpload(id)}?success=${success}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to confirm file upload" };
    }
  });

export const getPartyWallet = createServerFn({ method: "POST" })
  .inputValidator((partyID: string | number) => partyID)
  .handler(async ({ data: partyID }) => {
     try {
       const response = await fetch(`${API_URL.parties}/${partyID}/wallet`, {
         headers: getAuthHeaders(),
       });
       const resData = await response.json();
       return resData;
     } catch (error) {
       return { success: false, message: "Failed to fetch party wallet from API: " + (error as Error).message };
     }
   });

export const getPartyWalletTransactions = createServerFn({ method: "POST" })
  .inputValidator((data: { partyID: string | number; limit?: number; offset?: number }) => data)
  .handler(async ({ data: { partyID, limit, offset } }) => {
    try {
      const params = new URLSearchParams();
      if (limit !== undefined) params.append("limit", String(limit));
      if (offset !== undefined) params.append("offset", String(offset));
      const qs = params.toString();
      const url = `${API_URL.parties}/${partyID}/wallet/transactions${qs ? `?${qs}` : ""}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error(`[getPartyWalletTransactions] ${response.status} ${response.statusText} — URL: ${url} — Body: ${text}`);
        return { success: false, message: `HTTP ${response.status}: ${text}` };
      }
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch transactions: " + (error as Error).message };
    }
  });

export const withdrawFromPartyWallet = createServerFn({ method: "POST" })
  .inputValidator((data: {
    partyID: string | number;
    amountKobo: number;
    transactionReference: string;
    bankAccountNumber: string;
    bankCode: string;
    narration: string;
  }) => data)
  .handler(async ({ data: { partyID, ...body } }) => {
    try {
      const response = await fetch(`${API_URL.parties}/${partyID}/wallet/withdraw`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to process withdrawal: " + (error as Error).message };
    }
  });

export const getPartySlotPrice = createServerFn({ method: "POST" })
  .inputValidator((partyID: string | number) => partyID)
  .handler(async ({ data: partyID }) => {
    try {
      const response = await fetch(`${API_URL.parties}/${partyID}/slots/price`, {
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch slot price: " + (error as Error).message };
    }
  });

export const buyPartySlots = createServerFn({ method: "POST" })
  .inputValidator((data: { partyID: string | number; quantity: number }) => data)
  .handler(async ({ data: { partyID, quantity } }) => {
    try {
      const response = await fetch(`${API_URL.parties}/${partyID}/slots/buy`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity }),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to buy slots: " + (error as Error).message };
    }
  });

export const depositPartyAllowance = createServerFn({ method: "POST" })
  .inputValidator((data: { partyID: string | number; amountKobo: number }) => data)
  .handler(async ({ data: { partyID, amountKobo } }) => {
    try {
      const response = await fetch(`${API_URL.parties}/${partyID}/allowances/deposit`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount_kobo: amountKobo }),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to deposit allowance: " + (error as Error).message };
    }
  });

export const updatePartyStateAllowances = createServerFn({ method: "POST" })
  .inputValidator((data: { partyID: string | number; allowances: Record<string, number> }) => data)
  .handler(async ({ data: { partyID, allowances } }) => {
    try {
      const response = await fetch(`${API_URL.parties}/${partyID}/allowances/settings`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(allowances),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update state allowances: " + (error as Error).message };
    }
  });

export const fundPartyWalletTest = createServerFn({ method: "POST" })
  .inputValidator((data: { partyID: string | number; amountKobo: number }) => data)
  .handler(async ({ data: { partyID, amountKobo } }) => {
    try {
      const response = await fetch(`${API_URL.parties}/${partyID}/wallet/deposit-test`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount_kobo: amountKobo }),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to simulate wallet funding: " + (error as Error).message };
    }
  });
