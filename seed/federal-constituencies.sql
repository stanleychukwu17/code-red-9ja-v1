-- 1. Create the Federal Constituencies Table
CREATE TABLE IF NOT EXISTS federal_constituencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    state_id INTEGER NOT NULL,
    state_name VARCHAR(255) NOT NULL,
    senatorial_district_id INTEGER NOT NULL,
    senatorial_district_name VARCHAR(255) NOT NULL
);

-- 2. Insert Federal Constituencies (360 total)
-- Senatorial District IDs reference senatorial_districts table (1-109)
-- State IDs reference states table

INSERT INTO federal_constituencies (id, name, code, state_id, state_name, senatorial_district_id, senatorial_district_name) VALUES

-- ============================================================
-- ABIA STATE (state_id: 303) - 8 Federal Constituencies
-- ============================================================

-- Abia North Senatorial District (SD ID: 1)
(1, 'Arochukwu / Ohafia', 'FC/001/AB', 1, 'Abia', 1, 'Abia North'),
(2, 'Bende', 'FC/002/AB', 1, 'Abia', 1, 'Abia North'),
(3, 'Isuikwuato / Umunneochi', 'FC/003/AB', 1, 'Abia', 1, 'Abia North'),

-- Abia Central Senatorial District (SD ID: 2)
(4, 'Isiala Ngwa North / Isiala Ngwa South', 'FC/004/AB', 1, 'Abia', 2, 'Abia Central'),
(5, 'Obingwa / Ugwunagbo / Osisioma', 'FC/005/AB', 1, 'Abia', 2, 'Abia Central'),
(6, 'Umuahia North / Umuahia South / Ikwuano', 'FC/006/AB', 1, 'Abia', 2, 'Abia Central'),

-- Abia South Senatorial District (SD ID: 3)
(7, 'Aba North / Aba South', 'FC/007/AB', 1, 'Abia', 3, 'Abia South'),
(8, 'Ukwa East / Ukwa West', 'FC/008/AB', 1, 'Abia', 3, 'Abia South'),

-- ============================================================
-- ADAMAWA STATE (state_id: 320) - 8 Federal Constituencies
-- ============================================================

-- Adamawa North Senatorial District (SD ID: 4)
(9, 'Michika / Madagali', 'FC/001/AD', 2, 'Adamawa', 4, 'Adamawa North'),
(10, 'Mubi North / Mubi South / Maiha', 'FC/002/AD', 2, 'Adamawa', 4, 'Adamawa North'),

-- Adamawa Central Senatorial District (SD ID: 6)
(11, 'Fufore / Song', 'FC/003/AD', 2, 'Adamawa', 6, 'Adamawa Central'),
(12, 'Hong / Gombi', 'FC/004/AD', 2, 'Adamawa', 6, 'Adamawa Central'),
(13, 'Yola North / Yola South / Girei', 'FC/005/AD', 2, 'Adamawa', 6, 'Adamawa Central'),

-- Adamawa South Senatorial District (SD ID: 5)
(14, 'Demsa / Numan / Lamurde', 'FC/006/AD', 2, 'Adamawa', 5, 'Adamawa South'),
(15, 'Guyuk / Shelleng', 'FC/007/AD', 2, 'Adamawa', 5, 'Adamawa South'),
(16, 'Jada / Ganye / Mayo Belwa / Toungo', 'FC/008/AD', 2, 'Adamawa', 5, 'Adamawa South'),

-- ============================================================
-- AKWA IBOM STATE (state_id: 304) - 10 Federal Constituencies
-- ============================================================

-- Akwa Ibom North-East Senatorial District (SD ID: 7)
(17, 'Etinan / Nsit Ibom / Nsit Ubium', 'FC/001/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East'),
(18, 'Itu / Ibiono Ibom', 'FC/002/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East'),
(19, 'Uyo / Uruan / Nsit Atai', 'FC/003/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East'), -- Fixed spelling: Nsit Atai

-- Akwa Ibom North-West Senatorial District (SD ID: 8)
(20, 'Abak / Etim Ekpo / Ika', 'FC/004/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West'),
(21, 'Ikono / Ini', 'FC/005/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West'),
(22, 'Ikot Ekpene / Essien Udim / Obot Akara', 'FC/006/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West'),
(26, 'Ukanafun / Oruk Anam', 'FC/007/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West'), -- Fixed: Moved to SD ID 8 (North-West)

-- Akwa Ibom South Senatorial District (SD ID: 9)
(23, 'Eket / Onna / Esit Eket / Ibeno', 'FC/008/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South'),
(24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo', 'FC/009/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South'),
(25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko', 'FC/010/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South'),

-- ============================================================
-- ANAMBRA STATE (state_id: 315) - 11 Federal Constituencies
-- ============================================================

-- Anambra North Senatorial District (SD ID: 10)
(27, 'Anambra East / Anambra West', 'FC/001/AN', 4, 'Anambra', 10, 'Anambra North'), -- Normalised codes to standardise format
(28, 'Ogbaru', 'FC/002/AN', 4, 'Anambra', 10, 'Anambra North'),
(29, 'Onitsha North / Onitsha South', 'FC/003/AN', 4, 'Anambra', 10, 'Anambra North'),
(30, 'Oyi / Ayamelum', 'FC/004/AN', 4, 'Anambra', 10, 'Anambra North'),

-- Anambra Central Senatorial District (SD ID: 11)
(31, 'Awka North / Awka South', 'FC/005/AN', 4, 'Anambra', 11, 'Anambra Central'),
(32, 'Idemili North / Idemili South', 'FC/006/AN', 4, 'Anambra', 11, 'Anambra Central'),
(33, 'Njikoka / Dunukofia / Anaocha', 'FC/007/AN', 4, 'Anambra', 11, 'Anambra Central'),

-- Anambra South Senatorial District (SD ID: 12)
(34, 'Aguata', 'FC/008/AN', 4, 'Anambra', 12, 'Anambra South'),
(35, 'Ihiala', 'FC/009/AN', 4, 'Anambra', 12, 'Anambra South'),
(36, 'Nnewi North / Nnewi South / Ekwusigo', 'FC/010/AN', 4, 'Anambra', 12, 'Anambra South'),
(37, 'Orumba North / Orumba South', 'FC/011/AN', 4, 'Anambra', 12, 'Anambra South'),

-- ============================================================
-- BAUCHI STATE (state_id: 312) - 12 Federal Constituencies
-- ============================================================

-- Bauchi South Senatorial District (SD ID: 13)
(38, 'Alkaleri / Kirfi', 'FC/001/BA', 5, 'Bauchi', 13, 'Bauchi South'),
(39, 'Bauchi', 'FC/002/BA', 5, 'Bauchi', 13, 'Bauchi South'),
(40, 'Bogoro / Dass / Tafawa Balewa', 'FC/003/BA', 5, 'Bauchi', 13, 'Bauchi South'),
(41, 'Toro', 'FC/004/BA', 5, 'Bauchi', 13, 'Bauchi South'),

-- Bauchi Central Senatorial District (SD ID: 14)
(42, 'Darazo / Ganjuwa', 'FC/005/BA', 5, 'Bauchi', 14, 'Bauchi Central'),
(43, 'Misau / Dambam', 'FC/006/BA', 5, 'Bauchi', 14, 'Bauchi Central'),
(44, 'Ningi / Warji', 'FC/007/BA', 5, 'Bauchi', 14, 'Bauchi Central'),

-- Bauchi North Senatorial District (SD ID: 15)
(45, 'Gamawa', 'FC/008/BA', 5, 'Bauchi', 15, 'Bauchi North'),
(46, 'Jamaare / Itas-Gadau', 'FC/009/BA', 5, 'Bauchi', 15, 'Bauchi North'),
(47, 'Katagum', 'FC/010/BA', 5, 'Bauchi', 15, 'Bauchi North'),
(48, 'Shira / Giade', 'FC/011/BA', 5, 'Bauchi', 15, 'Bauchi North'),
(49, 'Zaki', 'FC/012/BA', 5, 'Bauchi', 15, 'Bauchi North');
-- ============================================================
-- BAYELSA STATE (state_id: 305) - 5 Federal Constituencies
-- ============================================================

-- Bayelsa East Senatorial District (SD ID: 16)
(50, 'Brass / Nembe', 'FC/050/BY', 6, 'Bayelsa', 16, 'Bayelsa East'),
(51, 'Ogbia', 'FC/051/BY', 6, 'Bayelsa', 16, 'Bayelsa East'),

-- Bayelsa Central Senatorial District (SD ID: 17)
(52, 'Southern Ijaw', 'FC/053/BY', 6, 'Bayelsa', 17, 'Bayelsa Central'),
(53, 'Kolokuma / Opokuma / Yenagoa', 'FC/054/BY', 6, 'Bayelsa', 17, 'Bayelsa Central'),

-- Bayelsa West Senatorial District (SD ID: 18)
(54, 'Sagbama / Ekeremor', 'FC/052/BY', 6, 'Bayelsa', 18, 'Bayelsa West'),

-- ============================================================
-- BENUE STATE (state_id: 291) - 11 Federal Constituencies
-- ============================================================

-- Benue North-East Senatorial District (SD ID: 19)
(55, 'Katsina-Ala / Ukum / Logo', 'FC/059/BN', 7, 'Benue', 19, 'Benue North-East'),
(56, 'Konshisha / Vandeikya', 'FC/060/BN', 7, 'Benue', 19, 'Benue North-East'),
(57, 'Kwande / Ushongo', 'FC/061/BN', 7, 'Benue', 19, 'Benue North-East'),

-- Benue North-West Senatorial District (SD ID: 20)
(58, 'Buruku', 'FC/057/BN', 7, 'Benue', 20, 'Benue North-West'),
(59, 'Gboko / Tarka', 'FC/058/BN', 7, 'Benue', 20, 'Benue North-West'),
(60, 'Guma / Makurdi', 'FC/062/BN', 7, 'Benue', 20, 'Benue North-West'),
(61, 'Gwer East / Gwer West', 'FC/063/BN', 7, 'Benue', 20, 'Benue North-West'),

-- Benue South Senatorial District (SD ID: 21)
(62, 'Ado / Ogbadibo / Okpokwu', 'FC/055/BN', 7, 'Benue', 21, 'Benue South'),
(63, 'Apa / Agatu', 'FC/056/BN', 7, 'Benue', 21, 'Benue South'),
(64, 'Oju / Obi', 'FC/064/BN', 7, 'Benue', 21, 'Benue South'),
(65, 'Otukpo / Ohimini', 'FC/065/BN', 7, 'Benue', 21, 'Benue South'),

-- ============================================================
-- BORNO STATE (state_id: 307) - 10 Federal Constituencies
-- ============================================================

-- Borno North Senatorial District (SD ID: 22)
(66, 'Kaga / Gubio / Magumeri', 'FC/066/BO', 8, 'Borno', 22, 'Borno North'),
(67, 'Kukawa / Mobbar / Abadam / Guzamala', 'FC/067/BO', 8, 'Borno', 22, 'Borno North'),
(68, 'Monguno / Nganzai / Marte', 'FC/068/BO', 8, 'Borno', 22, 'Borno North'),

-- Borno Central Senatorial District (SD ID: 23)
(69, 'Bama / Ngala / Kala-Balge', 'FC/069/BO', 8, 'Borno', 23, 'Borno Central'),
(70, 'Dikwa / Mafa / Konduga', 'FC/070/BO', 8, 'Borno', 23, 'Borno Central'),
(71, 'Jere', 'FC/071/BO', 8, 'Borno', 23, 'Borno Central'),
(72, 'Maiduguri Metropolitan', 'FC/072/BO', 8, 'Borno', 23, 'Borno Central'),

-- Borno South Senatorial District (SD ID: 24)
(73, 'Askira-Uba / Hawul', 'FC/073/BO', 8, 'Borno', 24, 'Borno South'),
(74, 'Biu / Kwaya-Kusar / Shani / Bayo', 'FC/074/BO', 8, 'Borno', 24, 'Borno South'),
(75, 'Damboa / Gwoza / Chibok', 'FC/075/BO', 8, 'Borno', 24, 'Borno South'),

-- ============================================================
-- CROSS RIVER STATE (state_id: 314) - 8 Federal Constituencies
-- ============================================================

-- Cross River North Senatorial District (SD ID: 25)
(76, 'Obanliku / Obudu / Bekwarra', 'FC/076/CR', 9, 'Cross River', 25, 'Cross River North'),
(77, 'Ogoja / Yala', 'FC/077/CR', 9, 'Cross River', 25, 'Cross River North'),

-- Cross River Central Senatorial District (SD ID: 26)
(78, 'Abi / Yakurr', 'FC/078/CR', 9, 'Cross River', 26, 'Cross River Central'),
(79, 'Boki / Ikom', 'FC/079/CR', 9, 'Cross River', 26, 'Cross River Central'),
(80, 'Obubra / Etung', 'FC/080/CR', 9, 'Cross River', 26, 'Cross River Central'),

-- Cross River South Senatorial District (SD ID: 27)
(81, 'Akamkpa / Biase', 'FC/081/CR', 9, 'Cross River', 27, 'Cross River South'),
(82, 'Calabar Municipal / Odukpani', 'FC/082/CR', 9, 'Cross River', 27, 'Cross River South'),
(83, 'Calabar South / Akpabuyo / Bakassi', 'FC/083/CR', 9, 'Cross River', 27, 'Cross River South'),

-- ============================================================
-- DELTA STATE (state_id: 316) - 10 Federal Constituencies
-- ============================================================

-- Delta Central Senatorial District (SD ID: 28)
(84, 'Ethiope East / Ethiope West', 'FC/084/DE', 10, 'Delta', 28, 'Delta Central'),
(85, 'Okpe / Sapele / Uvwie', 'FC/085/DE', 10, 'Delta', 28, 'Delta Central'),
(86, 'Ughelli North / Ughelli South / Udu', 'FC/086/DE', 10, 'Delta', 28, 'Delta Central'),

-- Delta North Senatorial District (SD ID: 29)
(87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South', 'FC/087/DE', 10, 'Delta', 29, 'Delta North'),
(88, 'Ika North East / Ika South', 'FC/088/DE', 10, 'Delta', 29, 'Delta North'),
(89, 'Ndokwa East / Ndokwa West / Ukwuani', 'FC/089/DE', 10, 'Delta', 29, 'Delta North'),

-- Delta South Senatorial District (SD ID: 30)
(90, 'Bomadi / Patani', 'FC/090/DE', 10, 'Delta', 30, 'Delta South'),
(91, 'Burutu', 'FC/091/DE', 10, 'Delta', 30, 'Delta South'),
(92, 'Isoko North / Isoko South', 'FC/092/DE', 10, 'Delta', 30, 'Delta South'),
(93, 'Warri North / Warri South / Warri South West', 'FC/093/DE', 10, 'Delta', 30, 'Delta South'),

-- ============================================================
-- EBONYI STATE (state_id: 311) - 6 Federal Constituencies
-- ============================================================

-- Ebonyi North Senatorial District (SD ID: 31)
(94, 'Abakaliki / Izzi', 'FC/094/EB', 11, 'Ebonyi', 31, 'Ebonyi North'),
(95, 'Ebonyi / Ohaukwu', 'FC/095/EB', 11, 'Ebonyi', 31, 'Ebonyi North'),

-- Ebonyi Central Senatorial District (SD ID: 32)
(96, 'Ezza North / Ishielu', 'FC/096/EB', 11, 'Ebonyi', 32, 'Ebonyi Central'),
(97, 'Ezza South / Ikwo', 'FC/097/EB', 11, 'Ebonyi', 32, 'Ebonyi Central'),

-- Ebonyi South Senatorial District (SD ID: 33)
(98, 'Afikpo North / Edda', 'FC/098/EB', 11, 'Ebonyi', 33, 'Ebonyi South'), -- Updated: Afikpo South is now Edda LGA
(99, 'Ivo / Ohaozara / Onicha', 'FC/099/EB', 11, 'Ebonyi', 33, 'Ebonyi South'),

-- ============================================================
-- EDO STATE (state_id: 318) - 9 Federal Constituencies
-- ============================================================

-- Edo South Senatorial District (SD ID: 34)
(100, 'Egor / Ikpoba-Okha', 'FC/100/ED', 12, 'Edo', 34, 'Edo South'),
(101, 'Oredo', 'FC/101/ED', 12, 'Edo', 34, 'Edo South'),
(102, 'Orhionmwon / Uhunmwonde', 'FC/102/ED', 12, 'Edo', 34, 'Edo South'),

-- Edo Central Senatorial District (SD ID: 35)
(103, 'Ovia North-East / Ovia South-West', 'FC/103/ED', 12, 'Edo', 34, 'Edo South'),
(104, 'Esan Central / Esan West / Igueben', 'FC/104/ED', 12, 'Edo', 35, 'Edo Central'), -- Adjusted alignment to standard pairs
(105, 'Esan North-East / Esan South-East', 'FC/105/ED', 12, 'Edo', 35, 'Edo Central'),

-- Edo North Senatorial District (SD ID: 36)
(106, 'Etsako Central / Etsako East / Etsako West', 'FC/106/ED', 12, 'Edo', 36, 'Edo North'),
(107, 'Owan East / Owan West', 'FC/107/ED', 12, 'Edo', 36, 'Edo North'), -- Fixed: Kept Owan LGAs together
(108, 'Akoko-Edo', 'FC/108/ED', 12, 'Edo', 36, 'Edo North'), -- Fixed: Separated Akoko-Edo into its own entry

-- ============================================================
-- EKITI STATE (state_id: 309) - 6 Federal Constituencies
-- ============================================================

-- Ekiti Central Senatorial District (SD ID: 37)
(109, 'Ado Ekiti / Irepodun / Ifelodun', 'FC/109/EK', 13, 'Ekiti', 37, 'Ekiti Central'),
(110, 'Ijero / Ekiti West / Efon', 'FC/110/EK', 13, 'Ekiti', 37, 'Ekiti Central'),

-- Ekiti North Senatorial District (SD ID: 38)
(111, 'Ikole / Oye', 'FC/111/EK', 13, 'Ekiti', 38, 'Ekiti North'),
(112, 'Ido-Osi / Moba / Ilejemeje', 'FC/112/EK', 13, 'Ekiti', 38, 'Ekiti North'),

-- Ekiti South Senatorial District (SD ID: 39)
(113, 'Ekiti South West / Ikere / Ise-Orun', 'FC/113/EK', 13, 'Ekiti', 39, 'Ekiti South'),
(114, 'Ekiti East / Emure / Gbonyin', 'FC/114/EK', 13, 'Ekiti', 39, 'Ekiti South'),

-- ============================================================
-- ENUGU STATE (state_id: 289) - 8 Federal Constituencies
-- ============================================================

-- Enugu North Senatorial District (SD ID: 40)
(115, 'Igbo-Eze North / Udenu', 'FC/115/EN', 14, 'Enugu', 40, 'Enugu North'),
(116, 'Igbo-Etiti / Uzo-Uwani', 'FC/116/EN', 14, 'Enugu', 40, 'Enugu North'),
(117, 'Nsukka / Igbo-Eze South', 'FC/117/EN', 14, 'Enugu', 40, 'Enugu North'),

-- Enugu East Senatorial District (SD ID: 41)
(118, 'Enugu East / Isi Uzo', 'FC/118/EN', 14, 'Enugu', 41, 'Enugu East'),
(119, 'Enugu North / Enugu South', 'FC/119/EN', 14, 'Enugu', 41, 'Enugu East'),
(120, 'Nkanu East / Nkanu West', 'FC/120/EN', 14, 'Enugu', 41, 'Enugu East'),

-- Enugu West Senatorial District (SD ID: 42)
(121, 'Aninri / Awgu / Oji River', 'FC/121/EN', 14, 'Enugu', 42, 'Enugu West'),
(122, 'Ezeagu / Udi', 'FC/122/EN', 14, 'Enugu', 42, 'Enugu West');
-- ============================================================
-- ABUJA FCT (state_id: 293) - 2 Federal Constituencies
-- ============================================================

-- FCT Senatorial District (SD ID: 43)
(123, 'Abaji / Gwagwalada / Kuje / Kwali', 'FC/123/FCT', 37, 'Abuja FCT', 43, 'FCT Senatorial District'),
(124, 'AMAC / Bwari', 'FC/124/FCT', 37, 'Abuja FCT', 43, 'FCT Senatorial District'),

-- ============================================================
-- GOMBE STATE (state_id: 310) - 6 Federal Constituencies
-- ============================================================

-- Gombe Central Senatorial District (SD ID: 44)
(125, 'Akko', 'FC/125/GM', 15, 'Gombe', 44, 'Gombe Central'),
(126, 'Yamaltu / Deba', 'FC/126/GM', 15, 'Gombe', 44, 'Gombe Central'),

-- Gombe North Senatorial District (SD ID: 45)
(127, 'Dukku / Nafada', 'FC/127/GM', 15, 'Gombe', 45, 'Gombe North'),
(128, 'Gombe / Kwami / Funakaye', 'FC/128/GM', 15, 'Gombe', 45, 'Gombe North'),

-- Gombe South Senatorial District (SD ID: 46)
(129, 'Balanga / Billiri', 'FC/129/GM', 15, 'Gombe', 46, 'Gombe South'),
(130, 'Kaltungo / Shongom', 'FC/130/GM', 15, 'Gombe', 46, 'Gombe South'),

-- ============================================================
-- IMO STATE (state_id: 308) - 10 Federal Constituencies
-- ============================================================

-- Imo North Senatorial District (SD ID: 47)
(131, 'Ehime Mbano / Ihitte Uboma / Obowo', 'FC/131/IM', 16, 'Imo', 47, 'Imo North'),
(132, 'Okigwe / Onuimo', 'FC/132/IM', 16, 'Imo', 47, 'Imo North'),

-- Imo East Senatorial District (SD ID: 48)
(133, 'Aboh Mbaise / Ngor Okpala', 'FC/133/IM', 16, 'Imo', 48, 'Imo East'),
(134, 'Ahiazu / Ezinihitte Mbaise', 'FC/134/IM', 16, 'Imo', 48, 'Imo East'), -- Fixed: Added missing Mbaise block pair
(135, 'Ikeduru / Mbaitoli', 'FC/135/IM', 16, 'Imo', 48, 'Imo East'), -- Corrected: Belongs to Imo East (Owerri zone)
(136, 'Owerri Municipal / Owerri North / Owerri West', 'FC/136/IM', 16, 'Imo', 48, 'Imo East'),

-- Imo West Senatorial District (SD ID: 49)
(137, 'Ideato North / Ideato South', 'FC/137/IM', 16, 'Imo', 49, 'Imo West'),
(138, 'Isu / Njaba / Nkwerre / Nwangele', 'FC/138/IM', 16, 'Imo', 49, 'Imo West'),
(139, 'Oguta / Ohaji-Egbema / Oru West', 'FC/139/IM', 16, 'Imo', 49, 'Imo West'),
(140, 'Orlu / Orsu / Oru East', 'FC/140/IM', 16, 'Imo', 49, 'Imo West'),

-- ============================================================
-- JIGAWA STATE (state_id: 288) - 11 Federal Constituencies
-- ============================================================

-- Jigawa North-East Senatorial District (SD ID: 50)
(141, 'Hadejia / Kafin Hausa / Auyo', 'FC/141/JG', 17, 'Jigawa', 50, 'Jigawa North-East'),
(142, 'Birniwa / Guri / Kiri Kasamma', 'FC/142/JG', 17, 'Jigawa', 50, 'Jigawa North-East'),
(143, 'Kaugama / Malam Madori', 'FC/143/JG', 17, 'Jigawa', 50, 'Jigawa North-East'), -- Fixed: Moved to North-East District

-- Jigawa North-West Senatorial District (SD ID: 51)
(144, 'Babura / Garki', 'FC/144/JG', 17, 'Jigawa', 51, 'Jigawa North-West'),
(145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa', 'FC/145/JG', 17, 'Jigawa', 51, 'Jigawa North-West'),
(146, 'Kazaure / Roni / Gwiwa / Yankwashi', 'FC/146/JG', 17, 'Jigawa', 51, 'Jigawa North-West'),

-- Jigawa South-West Senatorial District (SD ID: 52)
(147, 'Birnin Kudu / Buji', 'FC/147/JG', 17, 'Jigawa', 52, 'Jigawa South-West'),
(148, 'Dutse / Kiyawa', 'FC/148/JG', 17, 'Jigawa', 52, 'Jigawa South-West'),
(149, 'Gwaram', 'FC/149/JG', 17, 'Jigawa', 52, 'Jigawa South-West'),
(150, 'Jahun / Miga', 'FC/150/JG', 17, 'Jigawa', 52, 'Jigawa South-West'),
(151, 'Ringim / Taura', 'FC/151/JG', 17, 'Jigawa', 52, 'Jigawa South-West'),

-- ============================================================
-- KADUNA STATE (state_id: 294) - 16 Federal Constituencies
-- ============================================================

-- Kaduna North Senatorial District (SD ID: 53)
(152, 'Ikara / Kubau', 'FC/152/KD', 18, 'Kaduna', 53, 'Kaduna North'),
(153, 'Makarfi / Kudan', 'FC/153/KD', 18, 'Kaduna', 53, 'Kaduna North'),
(154, 'Sabon Gari', 'FC/154/KD', 18, 'Kaduna', 53, 'Kaduna North'),
(155, 'Zaria', 'FC/155/KD', 18, 'Kaduna', 53, 'Kaduna North'),
(156, 'Lere', 'FC/156/KD', 18, 'Kaduna', 53, 'Kaduna North'),
(157, 'Soba', 'FC/157/KD', 18, 'Kaduna', 53, 'Kaduna North'),

-- Kaduna Central Senatorial District (SD ID: 54)
(158, 'Birnin Gwari / Giwa', 'FC/158/KD', 18, 'Kaduna', 54, 'Kaduna Central'),
(159, 'Chikun / Kajuru', 'FC/159/KD', 18, 'Kaduna', 54, 'Kaduna Central'),
(160, 'Igabi', 'FC/160/KD', 18, 'Kaduna', 54, 'Kaduna Central'),
(161, 'Kaduna North', 'FC/161/KD', 18, 'Kaduna', 54, 'Kaduna Central'),
(162, 'Kaduna South', 'FC/162/KD', 18, 'Kaduna', 54, 'Kaduna Central'),

-- Kaduna South Senatorial District (SD ID: 55)
(163, 'Jaba / Zangon Kataf', 'FC/163/KD', 18, 'Kaduna', 55, 'Kaduna South'),
(164, 'Jemaa / Sanga', 'FC/164/KD', 18, 'Kaduna', 55, 'Kaduna South'),
(165, 'Kachia / Kagarko', 'FC/165/KD', 18, 'Kaduna', 55, 'Kaduna South'),
(166, 'Kaura', 'FC/166/KD', 18, 'Kaduna', 55, 'Kaduna South'),
(167, 'Kauru', 'FC/167/KD', 18, 'Kaduna', 55, 'Kaduna South'),

-- ============================================================
-- KANO STATE (state_id: 300) - 24 Federal Constituencies
-- ============================================================

-- Kano Central Senatorial District (SD ID: 56)
(168, 'Dala', 'FC/168/KN', 19, 'Kano', 56, 'Kano Central'),
(169, 'Dawakin Kudu / Warawa', 'FC/169/KN', 19, 'Kano', 56, 'Kano Central'),
(170, 'Fagge', 'FC/170/KN', 19, 'Kano', 56, 'Kano Central'),
(171, 'Gezawa / Gabasawa', 'FC/171/KN', 19, 'Kano', 56, 'Kano Central'),
(172, 'Gwale', 'FC/172/KN', 19, 'Kano', 56, 'Kano Central'),
(173, 'Kano Municipal', 'FC/173/KN', 19, 'Kano', 56, 'Kano Central'),
(174, 'Kumbotso', 'FC/174/KN', 19, 'Kano', 56, 'Kano Central'),
(175, 'Nasarawa', 'FC/175/KN', 19, 'Kano', 56, 'Kano Central'),
(176, 'Tarauni', 'FC/176/KN', 19, 'Kano', 56, 'Kano Central'),
(177, 'Ungogo', 'FC/177/KN', 19, 'Kano', 56, 'Kano Central'),

-- Kano North Senatorial District (SD ID: 57)
(178, 'Bagwai / Shanono', 'FC/178/KN', 19, 'Kano', 57, 'Kano North'),
(179, 'Bichi', 'FC/179/KN', 19, 'Kano', 57, 'Kano North'),
(180, 'Dambatta / Makoda', 'FC/180/KN', 19, 'Kano', 57, 'Kano North'),
(181, 'Dawakin Tofa / Tofa / Rimin Gado', 'FC/181/KN', 19, 'Kano', 57, 'Kano North'),
(182, 'Gwarzo / Kabo', 'FC/182/KN', 19, 'Kano', 57, 'Kano North'),
(183, 'Karaye / Rogo', 'FC/183/KN', 19, 'Kano', 57, 'Kano North'),
(184, 'Kunchi / Tsanyawa', 'FC/184/KN', 19, 'Kano', 57, 'Kano North'),
(185, 'Minjibir / Ungogo', 'FC/185/KN', 19, 'Kano', 57, 'Kano North'),

-- Kano South Senatorial District (SD ID: 58)
(186, 'Albasu / Ajingi / Gaya', 'FC/186/KN', 19, 'Kano', 58, 'Kano South'),
(187, 'Bebeji / Kiru', 'FC/187/KN', 19, 'Kano', 58, 'Kano South'),
(188, 'Doguwa / Tudun Wada', 'FC/188/KN', 19, 'Kano', 58, 'Kano South'),
(189, 'Kura / Madobi / Garun Mallam', 'FC/189/KN', 19, 'Kano', 58, 'Kano South'),
(190, 'Rano / Bunkure / Kibiya', 'FC/190/KN', 19, 'Kano', 58, 'Kano South'),
(191, 'Takai / Sumaila', 'FC/191/KN', 19, 'Kano', 58, 'Kano South'),

-- ============================================================
-- KATSINA STATE (state_id: 313) - 15 Federal Constituencies
-- ============================================================

-- Katsina Central Senatorial District (SD ID: 59)
(192, 'Batagarawa / Charanchi / Rimi', 'FC/192/KT', 20, 'Katsina', 59, 'Katsina Central'),
(193, 'Batsari / Safana / Danmusa', 'FC/193/KT', 20, 'Katsina', 59, 'Katsina Central'),
(194, 'Dutsin-Ma / Kurfi', 'FC/194/KT', 20, 'Katsina', 59, 'Katsina Central'),
(195, 'Jibia / Kaita', 'FC/195/KT', 20, 'Katsina', 59, 'Katsina Central'),
(196, 'Katsina Central', 'FC/196/KT', 20, 'Katsina', 59, 'Katsina Central'),

-- Katsina North Senatorial District (SD ID: 60)
(197, 'Bindawa / Mani', 'FC/197/KT', 20, 'Katsina', 60, 'Katsina North'),
(198, 'Daura / Sandamu / Maiadua', 'FC/198/KT', 20, 'Katsina', 60, 'Katsina North'),
(199, 'Ingawa / Kankia / Kusada', 'FC/199/KT', 20, 'Katsina', 60, 'Katsina North'),
(200, 'Mashi / Dutsi', 'FC/200/KT', 20, 'Katsina', 60, 'Katsina North'),
(201, 'Zango / Baure', 'FC/201/KT', 20, 'Katsina', 60, 'Katsina North'),

-- Katsina South Senatorial District (SD ID: 61)
(202, 'Bakori / Danja', 'FC/202/KT', 20, 'Katsina', 61, 'Katsina South'),
(203, 'Faskari / Kankara / Sabuwa', 'FC/203/KT', 20, 'Katsina', 61, 'Katsina South'),
(204, 'Funtua / Dandume', 'FC/204/KT', 20, 'Katsina', 61, 'Katsina South'),
(205, 'Malumfashi / Kafur', 'FC/205/KT', 20, 'Katsina', 61, 'Katsina South'),
(206, 'Matazu / Musawa', 'FC/206/KT', 20, 'Katsina', 61, 'Katsina South'),

-- ============================================================
-- KEBBI STATE (state_id: 290) - 8 Federal Constituencies
-- ============================================================

-- Kebbi Central Senatorial District (SD ID: 62)
(207, 'Aleiro / Gwandu / Jega', 'FC/207/KB', 21, 'Kebbi', 62, 'Kebbi Central'),
(208, 'Birnin Kebbi / Kalgo / Bunza', 'FC/208/KB', 21, 'Kebbi', 62, 'Kebbi Central'),
(209, 'Maiyama / Koko/Besse', 'FC/209/KB', 21, 'Kebbi', 62, 'Kebbi Central'),

-- Kebbi North Senatorial District (SD ID: 63)
(210, 'Arewa / Dandi', 'FC/210/KB', 21, 'Kebbi', 63, 'Kebbi North'),
(211, 'Argungu / Augie', 'FC/211/KB', 21, 'Kebbi', 63, 'Kebbi North'),
(212, 'Bagudo / Suru', 'FC/212/KB', 21, 'Kebbi', 63, 'Kebbi North'),

-- Kebbi South Senatorial District (SD ID: 64)
(213, 'Fakai / Sakaba / Wasagu/Danko / Zuru', 'FC/213/KB', 21, 'Kebbi', 64, 'Kebbi South'),
(214, 'Yauri / Shanga / Ngaski', 'FC/214/KB', 21, 'Kebbi', 64, 'Kebbi South'),

-- ============================================================
-- KOGI STATE (state_id: 298) - 9 Federal Constituencies
-- ============================================================

-- Kogi Central Senatorial District (SD ID: 65)
(215, 'Adavi / Okehi', 'FC/215/KG', 22, 'Kogi', 65, 'Kogi Central'),
(216, 'Ajaokuta', 'FC/216/KG', 22, 'Kogi', 65, 'Kogi Central'),
(217, 'Okene / Ogori-Magongo', 'FC/217/KG', 22, 'Kogi', 65, 'Kogi Central'),

-- Kogi East Senatorial District (SD ID: 66)
(218, 'Ankpa / Omala / Olamaboro', 'FC/218/KG', 22, 'Kogi', 66, 'Kogi East'),
(219, 'Dekina / Bassa', 'FC/219/KG', 22, 'Kogi', 66, 'Kogi East'),
(220, 'Idah / Ibaji / Igalamela-Odolu / Ofu', 'FC/220/KG', 22, 'Kogi', 66, 'Kogi East'),

-- Kogi West Senatorial District (SD ID: 67)
(221, 'Kabba/Bunu / Ijumu', 'FC/221/KG', 22, 'Kogi', 67, 'Kogi West'),
(222, 'Lokoja / Kogi (Koton Karfe)', 'FC/222/KG', 22, 'Kogi', 67, 'Kogi West'),
(223, 'Yagba East / Yagba West / Mopa-Muro', 'FC/223/KG', 22, 'Kogi', 67, 'Kogi West');

-- ============================================================
-- KWARA STATE (state_id: 295) - 6 Federal Constituencies
-- ============================================================

-- Kwara Central Senatorial District (SD ID: 68)
(224, 'Ilorin East / Ilorin South', 'FC/224/KW', 23, 'Kwara', 68, 'Kwara Central'),
(225, 'Ilorin West / Asa', 'FC/225/KW', 23, 'Kwara', 68, 'Kwara Central'),

-- Kwara North Senatorial District (SD ID: 69)
(226, 'Baruten / Kaiama', 'FC/226/KW', 23, 'Kwara', 69, 'Kwara North'),
(227, 'Edu / Moro / Pategi', 'FC/227/KW', 23, 'Kwara', 69, 'Kwara North'),

-- Kwara South Senatorial District (SD ID: 70)
(228, 'Ekiti / Isin / Irepodun / Oke-Ero', 'FC/228/KW', 23, 'Kwara', 70, 'Kwara South'),
(229, 'Ifelodun / Offa / Oyun', 'FC/229/KW', 23, 'Kwara', 70, 'Kwara South'),

-- ============================================================
-- LAGOS STATE (state_id: 306) - 24 Federal Constituencies
-- ============================================================

-- Lagos Central Senatorial District (SD ID: 71)
(230, 'Apapa', 'FC/230/LA', 24, 'Lagos', 71, 'Lagos Central'),
(231, 'Eti-Osa', 'FC/231/LA', 24, 'Lagos', 71, 'Lagos Central'),
(232, 'Lagos Island I', 'FC/232/LA', 24, 'Lagos', 71, 'Lagos Central'),
(233, 'Lagos Island II', 'FC/233/LA', 24, 'Lagos', 71, 'Lagos Central'),
(234, 'Lagos Mainland', 'FC/234/LA', 24, 'Lagos', 71, 'Lagos Central'),
(235, 'Surulere I', 'FC/235/LA', 24, 'Lagos', 71, 'Lagos Central'),
(236, 'Surulere II', 'FC/236/LA', 24, 'Lagos', 71, 'Lagos Central'),

-- Lagos East Senatorial District (SD ID: 72)
(237, 'Epe', 'FC/237/LA', 24, 'Lagos', 72, 'Lagos East'),
(238, 'Ibeju-Lekki', 'FC/238/LA', 24, 'Lagos', 72, 'Lagos East'),
(239, 'Ikorodu', 'FC/239/LA', 24, 'Lagos', 72, 'Lagos East'),
(240, 'Kosofe', 'FC/240/LA', 24, 'Lagos', 72, 'Lagos East'),
(241, 'Somolu', 'FC/241/LA', 24, 'Lagos', 72, 'Lagos East'),

-- Lagos West Senatorial District (SD ID: 73)
(242, 'Agege', 'FC/242/LA', 24, 'Lagos', 73, 'Lagos West'),
(243, 'Ajeromi-Ifelodun', 'FC/243/LA', 24, 'Lagos', 73, 'Lagos West'),
(244, 'Alimosho', 'FC/244/LA', 24, 'Lagos', 73, 'Lagos West'),
(245, 'Amuwo-Odofin', 'FC/245/LA', 24, 'Lagos', 73, 'Lagos West'),
(246, 'Badagry', 'FC/246/LA', 24, 'Lagos', 73, 'Lagos West'),
(247, 'Ifako-Ijaiye', 'FC/247/LA', 24, 'Lagos', 73, 'Lagos West'),
(248, 'Ikeja', 'FC/248/LA', 24, 'Lagos', 73, 'Lagos West'),
(249, 'Mushin I', 'FC/249/LA', 24, 'Lagos', 73, 'Lagos West'),
(250, 'Mushin II', 'FC/250/LA', 24, 'Lagos', 73, 'Lagos West'),
(251, 'Ojo', 'FC/251/LA', 24, 'Lagos', 73, 'Lagos West'),
(252, 'Oshodi-Isolo I', 'FC/252/LA', 24, 'Lagos', 73, 'Lagos West'), -- Fixed structural split
(253, 'Oshodi-Isolo II', 'FC/253/LA', 24, 'Lagos', 73, 'Lagos West'), -- Fixed structural split

-- ============================================================
-- NASARAWA STATE (state_id: 301) - 5 Federal Constituencies
-- ============================================================

-- Nasarawa North Senatorial District (SD ID: 74)
(254, 'Akwanga / Nasarawa Eggon / Wamba', 'FC/254/NS', 25, 'Nasarawa', 74, 'Nasarawa North'),

-- Nasarawa South Senatorial District (SD ID: 75)
(255, 'Awe / Doma / Keana', 'FC/255/NS', 25, 'Nasarawa', 75, 'Nasarawa South'),
(256, 'Lafia / Obi', 'FC/256/NS', 25, 'Nasarawa', 75, 'Nasarawa South'),

-- Nasarawa West Senatorial District (SD ID: 76)
(257, 'Keffi / Karu / Kokona', 'FC/257/NS', 25, 'Nasarawa', 76, 'Nasarawa West'),
(258, 'Nasarawa / Toto', 'FC/258/NS', 25, 'Nasarawa', 76, 'Nasarawa West'),

-- ============================================================
-- NIGER STATE (state_id: 317) - 10 Federal Constituencies
-- ============================================================

-- Niger East Senatorial District (SD ID: 77)
(259, 'Chanchaga', 'FC/259/NG', 26, 'Niger', 77, 'Niger East'),
(260, 'Bosso / Paikoro', 'FC/260/NG', 26, 'Niger', 77, 'Niger East'),
(261, 'Gurara / Suleja / Tafa', 'FC/261/NG', 26, 'Niger', 77, 'Niger East'),
(262, 'Shiroro / Rafi / Munya', 'FC/262/NG', 26, 'Niger', 77, 'Niger East'),

-- Niger North Senatorial District (SD ID: 78)
(263, 'Agwara / Borgu', 'FC/263/NG', 26, 'Niger', 78, 'Niger North'),
(264, 'Bida / Gbako / Katcha', 'FC/264/NG', 26, 'Niger', 78, 'Niger North'),
(265, 'Kontagora / Wushishi / Mariga / Mashegu', 'FC/265/NG', 26, 'Niger', 78, 'Niger North'),
(266, 'Rijau / Magama', 'FC/266/NG', 26, 'Niger', 78, 'Niger North'),

-- Niger South Senatorial District (SD ID: 79)
(267, 'Lapai / Agaie', 'FC/267/NG', 26, 'Niger', 79, 'Niger South'),
(268, 'Lavun / Mokwa / Edati', 'FC/268/NG', 26, 'Niger', 79, 'Niger South'),

-- ============================================================
-- OGUN STATE (state_id: 323) - 9 Federal Constituencies
-- ============================================================

-- Ogun Central Senatorial District (SD ID: 80)
(269, 'Abeokuta North / Obafemi-Owode / Odeda', 'FC/269/OG', 27, 'Ogun', 80, 'Ogun Central'),
(270, 'Abeokuta South', 'FC/270/OG', 27, 'Ogun', 80, 'Ogun Central'),
(271, 'Ifo / Ewekoro', 'FC/271/OG', 27, 'Ogun', 80, 'Ogun Central'),

-- Ogun East Senatorial District (SD ID: 81)
(272, 'Ijebu North / Ijebu East / Ogun Waterside', 'FC/272/OG', 27, 'Ogun', 81, 'Ogun East'),
(273, 'Ijebu Ode / Odogbolu / Ijebu North East', 'FC/273/OG', 27, 'Ogun', 81, 'Ogun East'),
(274, 'Ikenne / Shagamu / Remo North', 'FC/274/OG', 27, 'Ogun', 81, 'Ogun East'),

-- Ogun West Senatorial District (SD ID: 82)
(275, 'Ado-Odo / Ota', 'FC/275/OG', 27, 'Ogun', 82, 'Ogun West'),
(276, 'Egbado North / Imeko Afon', 'FC/276/OG', 27, 'Ogun', 82, 'Ogun West'),
(277, 'Egbado South / Ipokia', 'FC/277/OG', 27, 'Ogun', 82, 'Ogun West'),

-- ============================================================
-- ONDO STATE (state_id: 321) - 9 Federal Constituencies
-- ============================================================

-- Ondo Central Senatorial District (SD ID: 83)
(278, 'Akure North / Akure South', 'FC/278/OD', 28, 'Ondo', 83, 'Ondo Central'),
(279, 'Idanre / Ifedore', 'FC/279/OD', 28, 'Ondo', 83, 'Ondo Central'),
(280, 'Ondo East / Ondo West', 'FC/280/OD', 28, 'Ondo', 83, 'Ondo Central'),

-- Ondo North Senatorial District (SD ID: 84)
(281, 'Akoko North-East / Akoko North-West', 'FC/281/OD', 28, 'Ondo', 84, 'Ondo North'),
(282, 'Akoko South-East / Akoko South-West', 'FC/282/OD', 28, 'Ondo', 84, 'Ondo North'),
(283, 'Ose / Owo', 'FC/283/OD', 28, 'Ondo', 84, 'Ondo North'),

-- Ondo South Senatorial District (SD ID: 85)
(284, 'Ilaje / Ese-Odo', 'FC/284/OD', 28, 'Ondo', 85, 'Ondo South'),
(285, 'Ile-Oluji-Okeigbo / Odigbo', 'FC/285/OD', 28, 'Ondo', 85, 'Ondo South'),
(286, 'Okitipupa / Irele', 'FC/286/OD', 28, 'Ondo', 85, 'Ondo South'),

-- ============================================================
-- OSUN STATE (state_id: 322) - 9 Federal Constituencies
-- ============================================================

-- Osun Central Senatorial District (SD ID: 86)
(287, 'Boluwaduro / Ifedayo / Ila', 'FC/287/OS', 29, 'Osun', 86, 'Osun Central'),
(288, 'Ifelodun / Boripe / Odo-Otin', 'FC/288/OS', 29, 'Osun', 86, 'Osun Central'),
(289, 'Olorunda / Irepodun / Orolu / Osogbo', 'FC/289/OS', 29, 'Osun', 86, 'Osun Central'),

-- Osun East Senatorial District (SD ID: 87)
(290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West', 'FC/290/OS', 29, 'Osun', 87, 'Osun East'),
(291, 'Ife Central / Ife East / Ife North / Ife South', 'FC/291/OS', 29, 'Osun', 87, 'Osun East'),
(292, 'Obokun / Oriade', 'FC/292/OS', 29, 'Osun', 87, 'Osun East'),

-- Osun West Senatorial District (SD ID: 88)
(293, 'Ayedaade / Irewole / Isokan', 'FC/293/OS', 29, 'Osun', 88, 'Osun West'),
(294, 'Ayedire / Iwo / Ola-Oluwa', 'FC/294/OS', 29, 'Osun', 88, 'Osun West'),
(295, 'Ede North / Ede South / Egbedore / Ejigbo', 'FC/295/OS', 29, 'Osun', 88, 'Osun West'),

-- ============================================================
-- OYO STATE (state_id: 296) - 14 Federal Constituencies
-- ============================================================

-- Oyo Central Senatorial District (SD ID: 89)
(296, 'Afijio / Atiba / Oyo East / Oyo West', 'FC/296/OY', 30, 'Oyo', 89, 'Oyo Central'), -- Cleaned up spaces
(297, 'Akinyele / Lagelu', 'FC/297/OY', 30, 'Oyo', 89, 'Oyo Central'),
(298, 'Egbeda / Ona-Ara', 'FC/298/OY', 30, 'Oyo', 89, 'Oyo Central'),
(299, 'Oluyole', 'FC/299/OY', 30, 'Oyo', 89, 'Oyo Central'),
(300, 'Ogo-Oluwa / Surulere', 'FC/300/OY', 30, 'Oyo', 89, 'Oyo Central'),

-- Oyo North Senatorial District (SD ID: 90)
(301, 'Atisbo / Saki East / Saki West', 'FC/301/OY', 30, 'Oyo', 90, 'Oyo North'),
(302, 'Irepo / Olorunsogo / Oorelope', 'FC/302/OY', 30, 'Oyo', 90, 'Oyo North'),
(303, 'Iseyin / Itesiwaju / Kajola / Iwajowa', 'FC/303/OY', 30, 'Oyo', 90, 'Oyo North'),
(304, 'Ogbomoso North / Ogbomoso South / Oriire', 'FC/304/OY', 30, 'Oyo', 90, 'Oyo North'),

-- Oyo South Senatorial District (SD ID: 91)
(305, 'Ibadan North', 'FC/305/OY', 30, 'Oyo', 91, 'Oyo South'),
(306, 'Ibadan North-East / Ibadan South-East', 'FC/306/OY', 30, 'Oyo', 91, 'Oyo South'),
(307, 'Ibadan North-West / Ibadan South-West', 'FC/307/OY', 30, 'Oyo', 91, 'Oyo South'),
(308, 'Ibarapa Central / Ibarapa North', 'FC/308/OY', 30, 'Oyo', 91, 'Oyo South'),
(309, 'Ido / Ibarapa East', 'FC/309/OY', 30, 'Oyo', 91, 'Oyo South'),

-- ============================================================
-- PLATEAU STATE (state_id: 302) - 8 Federal Constituencies
-- ============================================================

-- Plateau Central Senatorial District (SD ID: 92)
(310, 'Bokkos / Mangu', 'FC/310/PL', 31, 'Plateau', 92, 'Plateau Central'),
(311, 'Pankshin / Kanke / Kanam', 'FC/311/PL', 31, 'Plateau', 92, 'Plateau Central'),

-- Plateau North Senatorial District (SD ID: 93)
(312, 'Barkin Ladi / Riyom', 'FC/312/PL', 31, 'Plateau', 93, 'Plateau North'),
(313, 'Jos North / Bassa', 'FC/313/PL', 31, 'Plateau', 93, 'Plateau North'),
(314, 'Jos South / Jos East', 'FC/314/PL', 31, 'Plateau', 93, 'Plateau North'),

-- Plateau South Senatorial District (SD ID: 94)
(315, 'Langtang North / Langtang South', 'FC/315/PL', 31, 'Plateau', 94, 'Plateau South'),
(316, 'Mikang / Quaan Pan / Shendam', 'FC/316/PL', 31, 'Plateau', 94, 'Plateau South'),
(317, 'Wase', 'FC/317/PL', 31, 'Plateau', 94, 'Plateau South'),

-- ============================================================
-- RIVERS STATE (state_id: 4926) - 13 Federal Constituencies
-- ============================================================

-- Rivers East Senatorial District (SD ID: 95)
(318, 'Etche / Omuma', 'FC/318/RV', 32, 'Rivers', 95, 'Rivers East'),
(319, 'Ikwerre / Emohua', 'FC/319/RV', 32, 'Rivers', 95, 'Rivers East'),
(320, 'Obio/Akpor', 'FC/320/RV', 32, 'Rivers', 95, 'Rivers East'),
(321, 'Okrika / Ogu/Bolo', 'FC/321/RV', 32, 'Rivers', 95, 'Rivers East'),
(322, 'Port Harcourt I', 'FC/322/RV', 32, 'Rivers', 95, 'Rivers East'),
(323, 'Port Harcourt II', 'FC/323/RV', 32, 'Rivers', 95, 'Rivers East'),

-- Rivers South-East Senatorial District (SD ID: 96)
(324, 'Andoni / Opobo/Nkoro', 'FC/324/RV', 32, 'Rivers', 96, 'Rivers South-East'),
(325, 'Gokana / Khana', 'FC/325/RV', 32, 'Rivers', 96, 'Rivers South-East'),
(326, 'Eleme / Tai / Oyigbo', 'FC/326/RV', 32, 'Rivers', 96, 'Rivers South-East'),

-- Rivers West Senatorial District (SD ID: 97)
(327, 'Abua/Odual / Ahoada East', 'FC/327/RV', 32, 'Rivers', 97, 'Rivers West'),
(328, 'Ahoada West / Ogba/Egbema/Ndoni', 'FC/328/RV', 32, 'Rivers', 97, 'Rivers West'),
(329, 'Degema / Bonny', 'FC/329/RV', 32, 'Rivers', 97, 'Rivers West'),
(330, 'Asari-Toru / Akuku-Toru', 'FC/330/RV', 32, 'Rivers', 97, 'Rivers West');

-- ============================================================
-- SOKOTO STATE (state_id: 292) - 11 Federal Constituencies
-- ============================================================

-- Sokoto East Senatorial District (SD ID: 98)
(331, 'Gada / Goronyo', 'FC/331/SK', 33, 'Sokoto', 98, 'Sokoto East'),
(332, 'Isa / Sabon Birni', 'FC/332/SK', 33, 'Sokoto', 98, 'Sokoto East'),
(333, 'Illela / Gwadabawa', 'FC/333/SK', 33, 'Sokoto', 98, 'Sokoto East'),
(334, 'Rabah / Wurno', 'FC/334/SK', 33, 'Sokoto', 98, 'Sokoto East'),

-- Sokoto North Senatorial District (SD ID: 99)
(335, 'Binji / Silame', 'FC/335/SK', 33, 'Sokoto', 99, 'Sokoto North'),
(336, 'Kware / Wamako', 'FC/336/SK', 33, 'Sokoto', 99, 'Sokoto North'),
(337, 'Sokoto North / Sokoto South', 'FC/337/SK', 33, 'Sokoto', 99, 'Sokoto North'),
(338, 'Tangaza / Gudu', 'FC/338/SK', 33, 'Sokoto', 99, 'Sokoto North'),

-- Sokoto South Senatorial District (SD ID: 100)
(339, 'Kebbe / Tambuwal', 'FC/339/SK', 33, 'Sokoto', 100, 'Sokoto South'),
(340, 'Bodinga / Dange-Shuni / Tureta', 'FC/340/SK', 33, 'Sokoto', 100, 'Sokoto South'),
(341, 'Yabo / Shagari', 'FC/341/SK', 33, 'Sokoto', 100, 'Sokoto South'),

-- ============================================================
-- TARABA STATE (state_id: 319) - 6 Federal Constituencies
-- ============================================================

-- Taraba North Senatorial District (SD ID: 101)
(342, 'Jalingo / Yorro / Zing', 'FC/342/TR', 34, 'Taraba', 101, 'Taraba North'),
(343, 'Karim Lamido / Lau / Ardo-Kola', 'FC/343/TR', 34, 'Taraba', 101, 'Taraba North'),

-- Taraba Central Senatorial District (SD ID: 102)
(344, 'Bali / Gassol', 'FC/344/TR', 34, 'Taraba', 102, 'Taraba Central'),
(345, 'Sardauna / Gashaka / Kurmi', 'FC/345/TR', 34, 'Taraba', 102, 'Taraba Central'),

-- Taraba South Senatorial District (SD ID: 103)
(346, 'Donga / Ussa / Takum / Yangtu Special Development Area', 'FC/346/TR', 34, 'Taraba', 103, 'Taraba South'),
(347, 'Wukari / Ibi', 'FC/347/TR', 34, 'Taraba', 103, 'Taraba South'),

-- ============================================================
-- YOBE STATE (state_id: 297) - 6 Federal Constituencies
-- ============================================================

-- Yobe North Senatorial District (SD ID: 104)
(348, 'Bade / Jakusko', 'FC/348/YB', 35, 'Yobe', 104, 'Yobe North'),
(349, 'Machina / Nguru / Karasuwa / Yusufari', 'FC/349/YB', 35, 'Yobe', 104, 'Yobe North'),

-- Yobe East Senatorial District (SD ID: 105)
(350, 'Damaturu / Gujba / Gulani / Tarmuwa', 'FC/350/YB', 35, 'Yobe', 105, 'Yobe East'),
(351, 'Geidam / Yunusari / Bursari', 'FC/351/YB', 35, 'Yobe', 105, 'Yobe East'),

-- Yobe South Senatorial District (SD ID: 106)
(352, 'Fika / Fune', 'FC/352/YB', 35, 'Yobe', 106, 'Yobe South'),
(353, 'Potiskum / Nangere', 'FC/353/YB', 35, 'Yobe', 106, 'Yobe South'),

-- ============================================================
-- ZAMFARA STATE (state_id: 299) - 7 Federal Constituencies
-- ============================================================

-- Zamfara North Senatorial District (SD ID: 107)
(354, 'Zurmi / Shinkafi', 'FC/354/ZM', 36, 'Zamfara', 107, 'Zamfara North'),
(355, 'Kaura Namoda / Birnin Magaji', 'FC/355/ZM', 36, 'Zamfara', 107, 'Zamfara North'),

-- Zamfara Central Senatorial District (SD ID: 108)
(356, 'Gusau / Tsafe', 'FC/356/ZM', 36, 'Zamfara', 108, 'Zamfara Central'),
(357, 'Bungudu / Maru', 'FC/357/ZM', 36, 'Zamfara', 108, 'Zamfara Central'),

-- Zamfara West Senatorial District (SD ID: 109)
(358, 'Bakura / Maradun', 'FC/358/ZM', 36, 'Zamfara', 109, 'Zamfara West'),
(359, 'Anka / Talata Mafara', 'FC/359/ZM', 36, 'Zamfara', 109, 'Zamfara West'),
(360, 'Gummi / Bukkuyum', 'FC/360/ZM', 36, 'Zamfara', 109, 'Zamfara West');
