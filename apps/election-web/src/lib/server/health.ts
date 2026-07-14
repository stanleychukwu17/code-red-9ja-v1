// import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
// import { API_URL } from "../config";
// 
// export const checkServerHealth = createServerFn({ method: "GET" })
//   .handler(async () => {
//     try {
//       const accessToken = getCookie('access_token');
//       const refreshToken = getCookie('refresh_token');
      
//       const response = await apiFetch(API_URL.health, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
//         },
//         credentials: "include",
//       });

//       const result = await response.json();
//       return result;
//     } catch (error) {
//       console.error("Health check error:", error);
//       return { status: "error", message: "Failed to check server health" };
//     }
//   });
