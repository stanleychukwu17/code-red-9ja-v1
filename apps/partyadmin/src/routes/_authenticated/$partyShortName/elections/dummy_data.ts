import type { ElectionGroupType } from "#/components/tiles/election-group-tile";
import type { ElectionInstanceType } from "#/components/tiles/election-instance-tile";

export const electionGroups: ElectionGroupType[] = [
  {
    title: "2027 Presidential Election Group",
    pollingAgentsCoverage: "0%",
    numberOfElectionsPartyIsContesting: "2/470",
    statesCount: 37,
    electionDate: "Jan 16, 27",
  },
  {
    title: "2027 Governorship Election Group",
    pollingAgentsCoverage: "0%",
    numberOfElectionsPartyIsContesting: "6/24",
    statesCount: 18,
    electionDate: "Jan 16, 27",
  },
  {
    title: "2027 Local Government Area Election Group",
    pollingAgentsCoverage: "0%",
    numberOfElectionsPartyIsContesting: "3/360",
    statesCount: 91,
    electionDate: "Jan 16, 27",
  },
];

export const electionInstances: ElectionInstanceType[] = [
  {
    _id: "829d",
    rank: 1,
    rankColor: "#25654c",
    title: "Presidential",
    candidate: {
      _id: "829e",
      avatar: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
      name: "Atiku Abubakar",
    },
    electionDate: "Jan 16, 2027",
  },
  {
    _id: "829d",
    rank: 2,
    rankColor: "#ffbf2e",
    title: "Governorship Election (Abia)",
    candidate: {
      _id: "829e",
      avatar: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
      name: "Atiku Abubakar",
    },
    electionDate: "Jan 16, 2027",
  },
  {
    _id: "829d",
    rank: 3,
    rankColor: "#ffbf2e",
    title: "Governorship Election (Adamawa)",
    candidate: {
      _id: "829e",
      avatar: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
      name: "Atiku Abubakar",
    },
    electionDate: "Jan 16, 2027",
  },
  {
    _id: "829d",
    rank: 4,
    rankColor: "#ffbf2e",
    title: "Governorship Election (Akwa Ibom)",
    candidate: {
      _id: "829e",
      avatar: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
      name: "Atiku Abubakar",
    },
    electionDate: "Jan 16, 2027",
  },
  {
    _id: "829d",
    rank: 5,
    rankColor: "#ffbf2e",
    title: "Governorship Election (Akwa Ibom)",
    candidate: {
      _id: "829e",
      avatar: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
      name: "Atiku Abubakar",
    },
    electionDate: "Jan 16, 2027",
  },
];
