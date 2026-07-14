import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";

export const getBanks = createServerFn().handler(async () => {
  try {
    const response = await apiFetch(API_URL.getBanks);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch banks from API",
    };
  }
});

export const validateBankAccount = createServerFn({ method: "POST" })
  .inputValidator((data: { accountNumber: string; bankCode: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        API_URL.validateBankAccount(data.accountNumber, data.bankCode)
      );
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: "Failed to validate bank account",
      };
    }
  });
