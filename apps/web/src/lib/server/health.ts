// import { createServerFn } from "@tanstack/react-start";
// import { API_URL } from "../config";
// import { getCookie } from "@tanstack/react-start/server";

// export const checkServerHealth = createServerFn({ method: "GET" })
//   .handler(async () => {
//     try {
//       const accessToken = getCookie('access_token');
//       const refreshToken = getCookie('refresh_token');
      
//       const response = await fetch(API_URL.health, {
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
//       return { success: false, message: "Failed to check server health" };
//     }
//   });
