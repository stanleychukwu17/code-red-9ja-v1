export type UsersTabId = "admin" | "app-users";

export const USERS_TABS = [
  { id: "admin", label: "Admin", href: "/users/admin" },
  { id: "party-admin", label: "Party admins", href: "/users/party-admin" },
  { id: "users", label: "Users", href: "/users/users" },
];
