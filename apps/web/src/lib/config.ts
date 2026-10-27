// lib/config.ts
export const IP_SERVICE_URL = import.meta.env.VITE_IP_SERVICE_URL;
export const APP_NAME = import.meta.env.VITE_APP_NAME;
export const FRONTEND_APP = "web";
const API_BASE = import.meta.env.VITE_API_URL;

export const APP_URL = {
	auth: {
		login: "/auth/login",
		logout: "/auth/logout",
		onboarding: "/auth/onboarding",
		securityQuestions: "/auth/security-questions",
		signup: "/auth/signup",
		forgotPassword: "/auth/forgot-password",
	},
	dashboard: "/dashboard",
	feed: "/feed",
	home: "/home",
	notifications: "/notifications",
	profile: (username?: string, tab?: string) =>
		username ? (tab ? `/profile/${username}/${tab}` : `/profile/${username}`) : "/profile",
	search: "/search",
	pollingUnits: "/polling-units",
	myParty: "/party",
	party: (partyName: string, partyId: string | number, chapterId?: string | number) =>
		`/party/${partyName}/${partyId}/home${chapterId ? `?chapterId=${chapterId}` : ""}`,
	group: (partyId: string | number, groupId: string | number) =>
		`/group/${partyId}/${groupId}`,
	parties: "/parties",
};

const api = `${API_BASE}/api/v1`;
export const API_URL = {
	health: `${API_BASE}/health`,
	auth: {
		sendSignupEmailOtp: `${api}/auth/signup/email-otp`,
		verifySignupEmailOtp: `${api}/auth/signup/email-otp/verify`,
		checkNin: `${api}/auth/check_nin`,
		checkUsername: `${api}/auth/check_username`,
		checkReferralCode: `${api}/auth/check_referral_code`,
		signup: `${api}/auth/signup`,
		completeOnboarding: `${api}/auth/onboarding`,
		login: `${api}/auth/login`,
		refresh: `${api}/auth/refresh`,
		logout: `${api}/auth/logout`,
		sendForgotPasswordEmailOtp: `${api}/auth/forgot-password/email-otp`,
		changePasswordByEmail: `${api}/auth/change_password_by_email`,
	},
	getAllCountries: `${api}/countries`,
	getStates: (countryId: number) => `${api}/countries/${countryId}/states`,
	getCities: (stateId: number) => `${api}/states/${stateId}/cities`,
	getLGAs: (stateId?: number, limit?: number, cursor?: string | number) => {
		const params = new URLSearchParams();
		if (stateId) params.append("state_id", String(stateId));
		if (limit) params.append("limit", String(limit));
		if (cursor) params.append("cursor", String(cursor));
		const qs = params.toString();
		return `${api}/lgas${qs ? `?${qs}` : ""}`;
	},
	getWards: (
		localGovernmentId?: number,
		stateId?: number,
		limit?: number,
		cursor?: string | number
	) => {
		const params = new URLSearchParams();
		if (localGovernmentId) params.append("lga_id", String(localGovernmentId));
		if (stateId) params.append("state_id", String(stateId));
		if (limit) params.append("limit", String(limit));
		if (cursor) params.append("cursor", String(cursor));
		const qs = params.toString();
		return `${api}/wards${qs ? `?${qs}` : ""}`;
	},
	getPollingUnits: (
		wardId?: number,
		localGovernmentId?: number,
		stateId?: number,
		limit?: number,
		cursor?: string | number
	) => {
		const params = new URLSearchParams();
		if (wardId) params.append("ward_id", String(wardId));
		if (localGovernmentId) params.append("lga_id", String(localGovernmentId));
		if (stateId) params.append("state_id", String(stateId));
		if (limit) params.append("limit", String(limit));
		if (cursor) params.append("cursor", String(cursor));
		const qs = params.toString();
		return `${api}/polling-units${qs ? `?${qs}` : ""}`;
	},
	parties: `${api}/parties`,
	partyCards: `${api}/parties/cards`,
	joinPartyHierarchy: (partyId: number) => `${api}/parties/${partyId}/join-hierarchy`,
	getPartyProfile: (partyId: number, shortName: string, chapterId?: number) => {
		const qs = chapterId ? `?chapter_id=${chapterId}` : "";
		return `${api}/parties/${partyId}/${shortName}/profile${qs}`;
	},
	partyHome: (partyId: number | string, chapterId?: number) => {
		const qs = chapterId ? `?chapter_id=${chapterId}` : "";
		return `${api}/parties/${partyId}/home${qs}`;
	},
	partyEvents: (
		partyId: number | string,
		params?: {
			chapter_id?: number;
			tier?: string;
			category?: string;
			status?: string;
			search?: string;
		}
	) => {
		const searchParams = new URLSearchParams();
		if (params?.chapter_id) searchParams.append("chapter_id", String(params.chapter_id));
		if (params?.tier) searchParams.append("tier", params.tier);
		if (params?.category) searchParams.append("category", params.category);
		if (params?.status) searchParams.append("status", params.status);
		if (params?.search) searchParams.append("search", params.search);
		const qs = searchParams.toString();
		return `${api}/parties/${partyId}/events${qs ? `?${qs}` : ""}`;
	},
	partyPositions: (id: string | number) => `${api}/parties/${id}/positions`,
	partyOfficials: (
		id: string | number,
		params?: {
			chapter_id?: number;
			country_id?: number;
			zonal_id?: number;
			state_id?: number;
			lga_id?: number;
			ward_id?: number;
		}
	) => {
		const searchParams = new URLSearchParams();
		if (params?.chapter_id) searchParams.append("chapter_id", String(params.chapter_id));
		if (params?.country_id) searchParams.append("country_id", String(params.country_id));
		if (params?.zonal_id) searchParams.append("zonal_id", String(params.zonal_id));
		if (params?.state_id) searchParams.append("state_id", String(params.state_id));
		if (params?.lga_id) searchParams.append("lga_id", String(params.lga_id));
		if (params?.ward_id) searchParams.append("ward_id", String(params.ward_id));
		const qs = searchParams.toString();
		return `${api}/parties/${id}/officials${qs ? `?${qs}` : ""}`;
	},
	partyMembers: (
		id: string | number,
		params?: {
			chapter_id?: number;
			search?: string;
			cursor?: number;
			limit?: number;
		}
	) => {
		const searchParams = new URLSearchParams();
		if (params?.chapter_id) searchParams.append("chapter_id", String(params.chapter_id));
		if (params?.search) searchParams.append("search", params.search);
		if (params?.cursor) searchParams.append("cursor", String(params.cursor));
		if (params?.limit) searchParams.append("limit", String(params.limit));
		const qs = searchParams.toString();
		return `${api}/parties/${id}/members${qs ? `?${qs}` : ""}`;
	},
	partyAdmins: (partyId: number | string) => `${api}/parties/${partyId}/admins`,
	userPreferences: `${api}/user_preferences`,
	searchUsers: `${api}/users/search`,
	getUserProfile: (username: string) => `${api}/users/${username.replace(/^@/, "")}/profile`,
	campaignGroups: {
		getGroup: (groupId: number | string) => `${api}/campaign-groups/${groupId}`,
		getMembers: (groupId: number | string) => `${api}/campaign-groups/${groupId}/members`,
		syncOfficials: (groupId: number | string) => `${api}/campaign-groups/${groupId}/sync-officials`,
	},
};

export const QUERY_KEYS = {
	auth: {
		session: ["authSession"],
	},
	parties: ["parties"],
	partyCards: ["partyCards"],
	partyPositions: {
		root: ["partyPositions"] as const,
		byParty: (partyId?: number | string) => ["partyPositions", partyId] as const,
	},
	partyOfficials: {
		root: ["partyOfficials"] as const,
		byChapter: (partyId?: number | string, chapterId?: number) =>
			["partyOfficials", partyId, chapterId] as const,
	},
	partyMembers: {
		root: ["partyMembers"] as const,
		byChapter: (partyId?: number | string, chapterId?: number, search?: string) =>
			["partyMembers", partyId, chapterId, search] as const,
	},
	campaignGroup: (groupId: number | string) => ["campaign-group", String(groupId)],
	campaignGroupMembers: (groupId: number | string) => ["campaign-group-members", String(groupId)],
	countries: ["countries"],
	states: (countryId?: number) => ["states", countryId],
	nigeriaStates: ["nigeria-states"],
	lgas: (stateId?: number) => ["lgas", stateId],
	wards: (lgaId?: number, stateId?: number) => ["wards", lgaId, stateId],
	cities: (stateId?: number) => ["cities", stateId],
};
