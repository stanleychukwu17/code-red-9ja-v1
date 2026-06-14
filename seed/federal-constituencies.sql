-- 1. Create the Federal Constituencies Table
CREATE TABLE IF NOT EXISTS federal_constituencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state_id INTEGER NOT NULL,
    state_name VARCHAR(255) NOT NULL,
    senatorial_district_id INTEGER NOT NULL,
    senatorial_district_name VARCHAR(255) NOT NULL
);

-- 2. Insert Federal Constituencies (360 total)
-- Senatorial District IDs reference senatorial_districts table (1-109)
-- State IDs reference states table

INSERT INTO federal_constituencies (id, name, state_id, state_name, senatorial_district_id, senatorial_district_name) VALUES

-- ============================================================
-- ABIA STATE (state_id: 303) - 8 Federal Constituencies
-- ============================================================

-- Abia North Senatorial District (SD ID: 1)
(1, 'Arochukwu / Ohafia', 1, 'Abia', 1, 'Abia North'),
(2, 'Bende', 1, 'Abia', 1, 'Abia North'),
(3, 'Isuikwuato / Umunneochi', 1, 'Abia', 1, 'Abia North'),

-- Abia Central Senatorial District (SD ID: 2)
(4, 'Isiala Ngwa North / Isiala Ngwa South', 1, 'Abia', 2, 'Abia Central'),
(5, 'Obingwa / Ugwunagbo / Osisioma', 1, 'Abia', 2, 'Abia Central'),
(6, 'Umuahia North / Umuahia South / Ikwuano', 1, 'Abia', 2, 'Abia Central'),

-- Abia South Senatorial District (SD ID: 3)
(7, 'Aba North / Aba South', 1, 'Abia', 3, 'Abia South'),
(8, 'Ukwa East / Ukwa West', 1, 'Abia', 3, 'Abia South'),

-- ============================================================
-- ADAMAWA STATE (state_id: 320) - 8 Federal Constituencies
-- ============================================================

-- Adamawa North Senatorial District (SD ID: 4)
(9, 'Michika / Madagali', 2, 'Adamawa', 4, 'Adamawa North'),
(10, 'Mubi North / Mubi South / Maiha', 2, 'Adamawa', 4, 'Adamawa North'),

-- Adamawa Central Senatorial District (SD ID: 6)
(11, 'Fufore / Song', 2, 'Adamawa', 6, 'Adamawa Central'),
(12, 'Hong / Gombi', 2, 'Adamawa', 6, 'Adamawa Central'),
(13, 'Yola North / Yola South / Girei', 2, 'Adamawa', 6, 'Adamawa Central'),

-- Adamawa South Senatorial District (SD ID: 5)
(14, 'Demsa / Numan / Lamurde', 2, 'Adamawa', 5, 'Adamawa South'),
(15, 'Guyuk / Shelleng', 2, 'Adamawa', 5, 'Adamawa South'),
(16, 'Jada / Ganye / Mayo Belwa / Toungo', 2, 'Adamawa', 5, 'Adamawa South'),

-- ============================================================
-- AKWA IBOM STATE (state_id: 304) - 10 Federal Constituencies
-- ============================================================

-- Akwa Ibom North-East Senatorial District (SD ID: 7)
(17, 'Etinan / Nsit Ibom / Nsit Ubium', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East'),
(18, 'Itu / Ibiono Ibom', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East'),
(19, 'Uyo / Uruan / Nsit Atai', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East'), -- Fixed spelling: Nsit Atai

-- Akwa Ibom North-West Senatorial District (SD ID: 8)
(20, 'Abak / Etim Ekpo / Ika', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West'),
(21, 'Ikono / Ini', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West'),
(22, 'Ikot Ekpene / Essien Udim / Obot Akara', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West'),
(26, 'Ukanafun / Oruk Anam', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West'), -- Fixed: Moved to SD ID 8 (North-West)

-- Akwa Ibom South Senatorial District (SD ID: 9)
(23, 'Eket / Onna / Esit Eket / Ibeno', 3, 'Akwa Ibom', 9, 'Akwa Ibom South'),
(24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo', 3, 'Akwa Ibom', 9, 'Akwa Ibom South'),
(25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko', 3, 'Akwa Ibom', 9, 'Akwa Ibom South'),

-- ============================================================
-- ANAMBRA STATE (state_id: 315) - 11 Federal Constituencies
-- ============================================================

-- Anambra North Senatorial District (SD ID: 10)
(27, 'Anambra East / Anambra West', 4, 'Anambra', 10, 'Anambra North'), -- Normalised codes to standardise format
(28, 'Ogbaru', 4, 'Anambra', 10, 'Anambra North'),
(29, 'Onitsha North / Onitsha South', 4, 'Anambra', 10, 'Anambra North'),
(30, 'Oyi / Ayamelum', 4, 'Anambra', 10, 'Anambra North'),

-- Anambra Central Senatorial District (SD ID: 11)
(31, 'Awka North / Awka South', 4, 'Anambra', 11, 'Anambra Central'),
(32, 'Idemili North / Idemili South', 4, 'Anambra', 11, 'Anambra Central'),
(33, 'Njikoka / Dunukofia / Anaocha', 4, 'Anambra', 11, 'Anambra Central'),

-- Anambra South Senatorial District (SD ID: 12)
(34, 'Aguata', 4, 'Anambra', 12, 'Anambra South'),
(35, 'Ihiala', 4, 'Anambra', 12, 'Anambra South'),
(36, 'Nnewi North / Nnewi South / Ekwusigo', 4, 'Anambra', 12, 'Anambra South'),
(37, 'Orumba North / Orumba South', 4, 'Anambra', 12, 'Anambra South'),

-- ============================================================
-- BAUCHI STATE (state_id: 312) - 12 Federal Constituencies
-- ============================================================

-- Bauchi South Senatorial District (SD ID: 13)
(38, 'Alkaleri / Kirfi', 5, 'Bauchi', 13, 'Bauchi South'),
(39, 'Bauchi', 5, 'Bauchi', 13, 'Bauchi South'),
(40, 'Bogoro / Dass / Tafawa Balewa', 5, 'Bauchi', 13, 'Bauchi South'),
(41, 'Toro', 5, 'Bauchi', 13, 'Bauchi South'),

-- Bauchi Central Senatorial District (SD ID: 14)
(42, 'Darazo / Ganjuwa', 5, 'Bauchi', 14, 'Bauchi Central'),
(43, 'Misau / Dambam', 5, 'Bauchi', 14, 'Bauchi Central'),
(44, 'Ningi / Warji', 5, 'Bauchi', 14, 'Bauchi Central'),

-- Bauchi North Senatorial District (SD ID: 15)
(45, 'Gamawa', 5, 'Bauchi', 15, 'Bauchi North'),
(46, 'Jamaare / Itas-Gadau', 5, 'Bauchi', 15, 'Bauchi North'),
(47, 'Katagum', 5, 'Bauchi', 15, 'Bauchi North'),
(48, 'Shira / Giade', 5, 'Bauchi', 15, 'Bauchi North'),
(49, 'Zaki', 5, 'Bauchi', 15, 'Bauchi North');
-- ============================================================
-- BAYELSA STATE (state_id: 305) - 5 Federal Constituencies
-- ============================================================

-- Bayelsa East Senatorial District (SD ID: 16)
(50, 'Brass / Nembe', 6, 'Bayelsa', 16, 'Bayelsa East'),
(51, 'Ogbia', 6, 'Bayelsa', 16, 'Bayelsa East'),

-- Bayelsa Central Senatorial District (SD ID: 17)
(52, 'Southern Ijaw', 6, 'Bayelsa', 17, 'Bayelsa Central'),
(53, 'Kolokuma / Opokuma / Yenagoa', 6, 'Bayelsa', 17, 'Bayelsa Central'),

-- Bayelsa West Senatorial District (SD ID: 18)
(54, 'Sagbama / Ekeremor', 6, 'Bayelsa', 18, 'Bayelsa West'),

-- ============================================================
-- BENUE STATE (state_id: 291) - 11 Federal Constituencies
-- ============================================================

-- Benue North-East Senatorial District (SD ID: 19)
(55, 'Katsina-Ala / Ukum / Logo', 7, 'Benue', 19, 'Benue North-East'),
(56, 'Konshisha / Vandeikya', 7, 'Benue', 19, 'Benue North-East'),
(57, 'Kwande / Ushongo', 7, 'Benue', 19, 'Benue North-East'),

-- Benue North-West Senatorial District (SD ID: 20)
(58, 'Buruku', 7, 'Benue', 20, 'Benue North-West'),
(59, 'Gboko / Tarka', 7, 'Benue', 20, 'Benue North-West'),
(60, 'Guma / Makurdi', 7, 'Benue', 20, 'Benue North-West'),
(61, 'Gwer East / Gwer West', 7, 'Benue', 20, 'Benue North-West'),

-- Benue South Senatorial District (SD ID: 21)
(62, 'Ado / Ogbadibo / Okpokwu', 7, 'Benue', 21, 'Benue South'),
(63, 'Apa / Agatu', 7, 'Benue', 21, 'Benue South'),
(64, 'Oju / Obi', 7, 'Benue', 21, 'Benue South'),
(65, 'Otukpo / Ohimini', 7, 'Benue', 21, 'Benue South'),

-- ============================================================
-- BORNO STATE (state_id: 307) - 10 Federal Constituencies
-- ============================================================

-- Borno North Senatorial District (SD ID: 22)
(66, 'Kaga / Gubio / Magumeri', 8, 'Borno', 22, 'Borno North'),
(67, 'Kukawa / Mobbar / Abadam / Guzamala', 8, 'Borno', 22, 'Borno North'),
(68, 'Monguno / Nganzai / Marte', 8, 'Borno', 22, 'Borno North'),

-- Borno Central Senatorial District (SD ID: 23)
(69, 'Bama / Ngala / Kala-Balge', 8, 'Borno', 23, 'Borno Central'),
(70, 'Dikwa / Mafa / Konduga', 8, 'Borno', 23, 'Borno Central'),
(71, 'Jere', 8, 'Borno', 23, 'Borno Central'),
(72, 'Maiduguri Metropolitan', 8, 'Borno', 23, 'Borno Central'),

-- Borno South Senatorial District (SD ID: 24)
(73, 'Askira-Uba / Hawul', 8, 'Borno', 24, 'Borno South'),
(74, 'Biu / Kwaya-Kusar / Shani / Bayo', 8, 'Borno', 24, 'Borno South'),
(75, 'Damboa / Gwoza / Chibok', 8, 'Borno', 24, 'Borno South'),

-- ============================================================
-- CROSS RIVER STATE (state_id: 314) - 8 Federal Constituencies
-- ============================================================

-- Cross River North Senatorial District (SD ID: 25)
(76, 'Obanliku / Obudu / Bekwarra', 9, 'Cross River', 25, 'Cross River North'),
(77, 'Ogoja / Yala', 9, 'Cross River', 25, 'Cross River North'),

-- Cross River Central Senatorial District (SD ID: 26)
(78, 'Abi / Yakurr', 9, 'Cross River', 26, 'Cross River Central'),
(79, 'Boki / Ikom', 9, 'Cross River', 26, 'Cross River Central'),
(80, 'Obubra / Etung', 9, 'Cross River', 26, 'Cross River Central'),

-- Cross River South Senatorial District (SD ID: 27)
(81, 'Akamkpa / Biase', 9, 'Cross River', 27, 'Cross River South'),
(82, 'Calabar Municipal / Odukpani', 9, 'Cross River', 27, 'Cross River South'),
(83, 'Calabar South / Akpabuyo / Bakassi', 9, 'Cross River', 27, 'Cross River South'),

-- ============================================================
-- DELTA STATE (state_id: 316) - 10 Federal Constituencies
-- ============================================================

-- Delta Central Senatorial District (SD ID: 28)
(84, 'Ethiope East / Ethiope West', 10, 'Delta', 28, 'Delta Central'),
(85, 'Okpe / Sapele / Uvwie', 10, 'Delta', 28, 'Delta Central'),
(86, 'Ughelli North / Ughelli South / Udu', 10, 'Delta', 28, 'Delta Central'),

-- Delta North Senatorial District (SD ID: 29)
(87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South', 10, 'Delta', 29, 'Delta North'),
(88, 'Ika North East / Ika South', 10, 'Delta', 29, 'Delta North'),
(89, 'Ndokwa East / Ndokwa West / Ukwuani', 10, 'Delta', 29, 'Delta North'),

-- Delta South Senatorial District (SD ID: 30)
(90, 'Bomadi / Patani', 10, 'Delta', 30, 'Delta South'),
(91, 'Burutu', 10, 'Delta', 30, 'Delta South'),
(92, 'Isoko North / Isoko South', 10, 'Delta', 30, 'Delta South'),
(93, 'Warri North / Warri South / Warri South West', 10, 'Delta', 30, 'Delta South'),

-- ============================================================
-- EBONYI STATE (state_id: 311) - 6 Federal Constituencies
-- ============================================================

-- Ebonyi North Senatorial District (SD ID: 31)
(94, 'Abakaliki / Izzi', 11, 'Ebonyi', 31, 'Ebonyi North'),
(95, 'Ebonyi / Ohaukwu', 11, 'Ebonyi', 31, 'Ebonyi North'),

-- Ebonyi Central Senatorial District (SD ID: 32)
(96, 'Ezza North / Ishielu', 11, 'Ebonyi', 32, 'Ebonyi Central'),
(97, 'Ezza South / Ikwo', 11, 'Ebonyi', 32, 'Ebonyi Central'),

-- Ebonyi South Senatorial District (SD ID: 33)
(98, 'Afikpo North / Edda', 11, 'Ebonyi', 33, 'Ebonyi South'), -- Updated: Afikpo South is now Edda LGA
(99, 'Ivo / Ohaozara / Onicha', 11, 'Ebonyi', 33, 'Ebonyi South'),

-- ============================================================
-- EDO STATE (state_id: 318) - 9 Federal Constituencies
-- ============================================================

-- Edo South Senatorial District (SD ID: 34)
(100, 'Egor / Ikpoba-Okha', 12, 'Edo', 34, 'Edo South'),
(101, 'Oredo', 12, 'Edo', 34, 'Edo South'),
(102, 'Orhionmwon / Uhunmwonde', 12, 'Edo', 34, 'Edo South'),

-- Edo Central Senatorial District (SD ID: 35)
(103, 'Ovia North-East / Ovia South-West', 12, 'Edo', 34, 'Edo South'),
(104, 'Esan Central / Esan West / Igueben', 12, 'Edo', 35, 'Edo Central'), -- Adjusted alignment to standard pairs
(105, 'Esan North-East / Esan South-East', 12, 'Edo', 35, 'Edo Central'),

-- Edo North Senatorial District (SD ID: 36)
(106, 'Etsako Central / Etsako East / Etsako West', 12, 'Edo', 36, 'Edo North'),
(107, 'Owan East / Owan West', 12, 'Edo', 36, 'Edo North'), -- Fixed: Kept Owan LGAs together
(108, 'Akoko-Edo', 12, 'Edo', 36, 'Edo North'), -- Fixed: Separated Akoko-Edo into its own entry

-- ============================================================
-- EKITI STATE (state_id: 309) - 6 Federal Constituencies
-- ============================================================

-- Ekiti Central Senatorial District (SD ID: 37)
(109, 'Ado Ekiti / Irepodun / Ifelodun', 13, 'Ekiti', 37, 'Ekiti Central'),
(110, 'Ijero / Ekiti West / Efon', 13, 'Ekiti', 37, 'Ekiti Central'),

-- Ekiti North Senatorial District (SD ID: 38)
(111, 'Ikole / Oye', 13, 'Ekiti', 38, 'Ekiti North'),
(112, 'Ido-Osi / Moba / Ilejemeje', 13, 'Ekiti', 38, 'Ekiti North'),

-- Ekiti South Senatorial District (SD ID: 39)
(113, 'Ekiti South West / Ikere / Ise-Orun', 13, 'Ekiti', 39, 'Ekiti South'),
(114, 'Ekiti East / Emure / Gbonyin', 13, 'Ekiti', 39, 'Ekiti South'),

-- ============================================================
-- ENUGU STATE (state_id: 289) - 8 Federal Constituencies
-- ============================================================

-- Enugu North Senatorial District (SD ID: 40)
(115, 'Igbo-Eze North / Udenu', 14, 'Enugu', 40, 'Enugu North'),
(116, 'Igbo-Etiti / Uzo-Uwani', 14, 'Enugu', 40, 'Enugu North'),
(117, 'Nsukka / Igbo-Eze South', 14, 'Enugu', 40, 'Enugu North'),

-- Enugu East Senatorial District (SD ID: 41)
(118, 'Enugu East / Isi Uzo', 14, 'Enugu', 41, 'Enugu East'),
(119, 'Enugu North / Enugu South', 14, 'Enugu', 41, 'Enugu East'),
(120, 'Nkanu East / Nkanu West', 14, 'Enugu', 41, 'Enugu East'),

-- Enugu West Senatorial District (SD ID: 42)
(121, 'Aninri / Awgu / Oji River', 14, 'Enugu', 42, 'Enugu West'),
(122, 'Ezeagu / Udi', 14, 'Enugu', 42, 'Enugu West');
-- ============================================================
-- ABUJA FCT (state_id: 293) - 2 Federal Constituencies
-- ============================================================

-- FCT Senatorial District (SD ID: 43)
(123, 'Abaji / Gwagwalada / Kuje / Kwali', 37, 'Abuja FCT', 43, 'FCT Senatorial District'),
(124, 'AMAC / Bwari', 37, 'Abuja FCT', 43, 'FCT Senatorial District'),

-- ============================================================
-- GOMBE STATE (state_id: 310) - 6 Federal Constituencies
-- ============================================================

-- Gombe Central Senatorial District (SD ID: 44)
(125, 'Akko', 15, 'Gombe', 44, 'Gombe Central'),
(126, 'Yamaltu / Deba', 15, 'Gombe', 44, 'Gombe Central'),

-- Gombe North Senatorial District (SD ID: 45)
(127, 'Dukku / Nafada', 15, 'Gombe', 45, 'Gombe North'),
(128, 'Gombe / Kwami / Funakaye', 15, 'Gombe', 45, 'Gombe North'),

-- Gombe South Senatorial District (SD ID: 46)
(129, 'Balanga / Billiri', 15, 'Gombe', 46, 'Gombe South'),
(130, 'Kaltungo / Shongom', 15, 'Gombe', 46, 'Gombe South'),

-- ============================================================
-- IMO STATE (state_id: 308) - 10 Federal Constituencies
-- ============================================================

-- Imo North Senatorial District (SD ID: 47)
(131, 'Ehime Mbano / Ihitte Uboma / Obowo', 16, 'Imo', 47, 'Imo North'),
(132, 'Okigwe / Onuimo', 16, 'Imo', 47, 'Imo North'),

-- Imo East Senatorial District (SD ID: 48)
(133, 'Aboh Mbaise / Ngor Okpala', 16, 'Imo', 48, 'Imo East'),
(134, 'Ahiazu / Ezinihitte Mbaise', 16, 'Imo', 48, 'Imo East'), -- Fixed: Added missing Mbaise block pair
(135, 'Ikeduru / Mbaitoli', 16, 'Imo', 48, 'Imo East'), -- Corrected: Belongs to Imo East (Owerri zone)
(136, 'Owerri Municipal / Owerri North / Owerri West', 16, 'Imo', 48, 'Imo East'),

-- Imo West Senatorial District (SD ID: 49)
(137, 'Ideato North / Ideato South', 16, 'Imo', 49, 'Imo West'),
(138, 'Isu / Njaba / Nkwerre / Nwangele', 16, 'Imo', 49, 'Imo West'),
(139, 'Oguta / Ohaji-Egbema / Oru West', 16, 'Imo', 49, 'Imo West'),
(140, 'Orlu / Orsu / Oru East', 16, 'Imo', 49, 'Imo West'),

-- ============================================================
-- JIGAWA STATE (state_id: 288) - 11 Federal Constituencies
-- ============================================================

-- Jigawa North-East Senatorial District (SD ID: 50)
(141, 'Hadejia / Kafin Hausa / Auyo', 17, 'Jigawa', 50, 'Jigawa North-East'),
(142, 'Birniwa / Guri / Kiri Kasamma', 17, 'Jigawa', 50, 'Jigawa North-East'),
(143, 'Kaugama / Malam Madori', 17, 'Jigawa', 50, 'Jigawa North-East'), -- Fixed: Moved to North-East District

-- Jigawa North-West Senatorial District (SD ID: 51)
(144, 'Babura / Garki', 17, 'Jigawa', 51, 'Jigawa North-West'),
(145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa', 17, 'Jigawa', 51, 'Jigawa North-West'),
(146, 'Kazaure / Roni / Gwiwa / Yankwashi', 17, 'Jigawa', 51, 'Jigawa North-West'),

-- Jigawa South-West Senatorial District (SD ID: 52)
(147, 'Birnin Kudu / Buji', 17, 'Jigawa', 52, 'Jigawa South-West'),
(148, 'Dutse / Kiyawa', 17, 'Jigawa', 52, 'Jigawa South-West'),
(149, 'Gwaram', 17, 'Jigawa', 52, 'Jigawa South-West'),
(150, 'Jahun / Miga', 17, 'Jigawa', 52, 'Jigawa South-West'),
(151, 'Ringim / Taura', 17, 'Jigawa', 52, 'Jigawa South-West'),

-- ============================================================
-- KADUNA STATE (state_id: 294) - 16 Federal Constituencies
-- ============================================================

-- Kaduna North Senatorial District (SD ID: 53)
(152, 'Ikara / Kubau', 18, 'Kaduna', 53, 'Kaduna North'),
(153, 'Makarfi / Kudan', 18, 'Kaduna', 53, 'Kaduna North'),
(154, 'Sabon Gari', 18, 'Kaduna', 53, 'Kaduna North'),
(155, 'Zaria', 18, 'Kaduna', 53, 'Kaduna North'),
(156, 'Lere', 18, 'Kaduna', 53, 'Kaduna North'),
(157, 'Soba', 18, 'Kaduna', 53, 'Kaduna North'),

-- Kaduna Central Senatorial District (SD ID: 54)
(158, 'Birnin Gwari / Giwa', 18, 'Kaduna', 54, 'Kaduna Central'),
(159, 'Chikun / Kajuru', 18, 'Kaduna', 54, 'Kaduna Central'),
(160, 'Igabi', 18, 'Kaduna', 54, 'Kaduna Central'),
(161, 'Kaduna North', 18, 'Kaduna', 54, 'Kaduna Central'),
(162, 'Kaduna South', 18, 'Kaduna', 54, 'Kaduna Central'),

-- Kaduna South Senatorial District (SD ID: 55)
(163, 'Jaba / Zangon Kataf', 18, 'Kaduna', 55, 'Kaduna South'),
(164, 'Jemaa / Sanga', 18, 'Kaduna', 55, 'Kaduna South'),
(165, 'Kachia / Kagarko', 18, 'Kaduna', 55, 'Kaduna South'),
(166, 'Kaura', 18, 'Kaduna', 55, 'Kaduna South'),
(167, 'Kauru', 18, 'Kaduna', 55, 'Kaduna South'),

-- ============================================================
-- KANO STATE (state_id: 300) - 24 Federal Constituencies
-- ============================================================

-- Kano Central Senatorial District (SD ID: 56)
(168, 'Dala', 19, 'Kano', 56, 'Kano Central'),
(169, 'Dawakin Kudu / Warawa', 19, 'Kano', 56, 'Kano Central'),
(170, 'Fagge', 19, 'Kano', 56, 'Kano Central'),
(171, 'Gezawa / Gabasawa', 19, 'Kano', 56, 'Kano Central'),
(172, 'Gwale', 19, 'Kano', 56, 'Kano Central'),
(173, 'Kano Municipal', 19, 'Kano', 56, 'Kano Central'),
(174, 'Kumbotso', 19, 'Kano', 56, 'Kano Central'),
(175, 'Nasarawa', 19, 'Kano', 56, 'Kano Central'),
(176, 'Tarauni', 19, 'Kano', 56, 'Kano Central'),
(177, 'Ungogo', 19, 'Kano', 56, 'Kano Central'),

-- Kano North Senatorial District (SD ID: 57)
(178, 'Bagwai / Shanono', 19, 'Kano', 57, 'Kano North'),
(179, 'Bichi', 19, 'Kano', 57, 'Kano North'),
(180, 'Dambatta / Makoda', 19, 'Kano', 57, 'Kano North'),
(181, 'Dawakin Tofa / Tofa / Rimin Gado', 19, 'Kano', 57, 'Kano North'),
(182, 'Gwarzo / Kabo', 19, 'Kano', 57, 'Kano North'),
(183, 'Karaye / Rogo', 19, 'Kano', 57, 'Kano North'),
(184, 'Kunchi / Tsanyawa', 19, 'Kano', 57, 'Kano North'),
(185, 'Minjibir / Ungogo', 19, 'Kano', 57, 'Kano North'),

-- Kano South Senatorial District (SD ID: 58)
(186, 'Albasu / Ajingi / Gaya', 19, 'Kano', 58, 'Kano South'),
(187, 'Bebeji / Kiru', 19, 'Kano', 58, 'Kano South'),
(188, 'Doguwa / Tudun Wada', 19, 'Kano', 58, 'Kano South'),
(189, 'Kura / Madobi / Garun Mallam', 19, 'Kano', 58, 'Kano South'),
(190, 'Rano / Bunkure / Kibiya', 19, 'Kano', 58, 'Kano South'),
(191, 'Takai / Sumaila', 19, 'Kano', 58, 'Kano South'),

-- ============================================================
-- KATSINA STATE (state_id: 313) - 15 Federal Constituencies
-- ============================================================

-- Katsina Central Senatorial District (SD ID: 59)
(192, 'Batagarawa / Charanchi / Rimi', 20, 'Katsina', 59, 'Katsina Central'),
(193, 'Batsari / Safana / Danmusa', 20, 'Katsina', 59, 'Katsina Central'),
(194, 'Dutsin-Ma / Kurfi', 20, 'Katsina', 59, 'Katsina Central'),
(195, 'Jibia / Kaita', 20, 'Katsina', 59, 'Katsina Central'),
(196, 'Katsina Central', 20, 'Katsina', 59, 'Katsina Central'),

-- Katsina North Senatorial District (SD ID: 60)
(197, 'Bindawa / Mani', 20, 'Katsina', 60, 'Katsina North'),
(198, 'Daura / Sandamu / Maiadua', 20, 'Katsina', 60, 'Katsina North'),
(199, 'Ingawa / Kankia / Kusada', 20, 'Katsina', 60, 'Katsina North'),
(200, 'Mashi / Dutsi', 20, 'Katsina', 60, 'Katsina North'),
(201, 'Zango / Baure', 20, 'Katsina', 60, 'Katsina North'),

-- Katsina South Senatorial District (SD ID: 61)
(202, 'Bakori / Danja', 20, 'Katsina', 61, 'Katsina South'),
(203, 'Faskari / Kankara / Sabuwa', 20, 'Katsina', 61, 'Katsina South'),
(204, 'Funtua / Dandume', 20, 'Katsina', 61, 'Katsina South'),
(205, 'Malumfashi / Kafur', 20, 'Katsina', 61, 'Katsina South'),
(206, 'Matazu / Musawa', 20, 'Katsina', 61, 'Katsina South'),

-- ============================================================
-- KEBBI STATE (state_id: 290) - 8 Federal Constituencies
-- ============================================================

-- Kebbi Central Senatorial District (SD ID: 62)
(207, 'Aleiro / Gwandu / Jega', 21, 'Kebbi', 62, 'Kebbi Central'),
(208, 'Birnin Kebbi / Kalgo / Bunza', 21, 'Kebbi', 62, 'Kebbi Central'),
(209, 'Maiyama / Koko/Besse', 21, 'Kebbi', 62, 'Kebbi Central'),

-- Kebbi North Senatorial District (SD ID: 63)
(210, 'Arewa / Dandi', 21, 'Kebbi', 63, 'Kebbi North'),
(211, 'Argungu / Augie', 21, 'Kebbi', 63, 'Kebbi North'),
(212, 'Bagudo / Suru', 21, 'Kebbi', 63, 'Kebbi North'),

-- Kebbi South Senatorial District (SD ID: 64)
(213, 'Fakai / Sakaba / Wasagu/Danko / Zuru', 21, 'Kebbi', 64, 'Kebbi South'),
(214, 'Yauri / Shanga / Ngaski', 21, 'Kebbi', 64, 'Kebbi South'),

-- ============================================================
-- KOGI STATE (state_id: 298) - 9 Federal Constituencies
-- ============================================================

-- Kogi Central Senatorial District (SD ID: 65)
(215, 'Adavi / Okehi', 22, 'Kogi', 65, 'Kogi Central'),
(216, 'Ajaokuta', 22, 'Kogi', 65, 'Kogi Central'),
(217, 'Okene / Ogori-Magongo', 22, 'Kogi', 65, 'Kogi Central'),

-- Kogi East Senatorial District (SD ID: 66)
(218, 'Ankpa / Omala / Olamaboro', 22, 'Kogi', 66, 'Kogi East'),
(219, 'Dekina / Bassa', 22, 'Kogi', 66, 'Kogi East'),
(220, 'Idah / Ibaji / Igalamela-Odolu / Ofu', 22, 'Kogi', 66, 'Kogi East'),

-- Kogi West Senatorial District (SD ID: 67)
(221, 'Kabba/Bunu / Ijumu', 22, 'Kogi', 67, 'Kogi West'),
(222, 'Lokoja / Kogi (Koton Karfe)', 22, 'Kogi', 67, 'Kogi West'),
(223, 'Yagba East / Yagba West / Mopa-Muro', 22, 'Kogi', 67, 'Kogi West');

-- ============================================================
-- KWARA STATE (state_id: 295) - 6 Federal Constituencies
-- ============================================================

-- Kwara Central Senatorial District (SD ID: 68)
(224, 'Ilorin East / Ilorin South', 23, 'Kwara', 68, 'Kwara Central'),
(225, 'Ilorin West / Asa', 23, 'Kwara', 68, 'Kwara Central'),

-- Kwara North Senatorial District (SD ID: 69)
(226, 'Baruten / Kaiama', 23, 'Kwara', 69, 'Kwara North'),
(227, 'Edu / Moro / Pategi', 23, 'Kwara', 69, 'Kwara North'),

-- Kwara South Senatorial District (SD ID: 70)
(228, 'Ekiti / Isin / Irepodun / Oke-Ero', 23, 'Kwara', 70, 'Kwara South'),
(229, 'Ifelodun / Offa / Oyun', 23, 'Kwara', 70, 'Kwara South'),

-- ============================================================
-- LAGOS STATE (state_id: 306) - 24 Federal Constituencies
-- ============================================================

-- Lagos Central Senatorial District (SD ID: 71)
(230, 'Apapa', 24, 'Lagos', 71, 'Lagos Central'),
(231, 'Eti-Osa', 24, 'Lagos', 71, 'Lagos Central'),
(232, 'Lagos Island I', 24, 'Lagos', 71, 'Lagos Central'),
(233, 'Lagos Island II', 24, 'Lagos', 71, 'Lagos Central'),
(234, 'Lagos Mainland', 24, 'Lagos', 71, 'Lagos Central'),
(235, 'Surulere I', 24, 'Lagos', 71, 'Lagos Central'),
(236, 'Surulere II', 24, 'Lagos', 71, 'Lagos Central'),

-- Lagos East Senatorial District (SD ID: 72)
(237, 'Epe', 24, 'Lagos', 72, 'Lagos East'),
(238, 'Ibeju-Lekki', 24, 'Lagos', 72, 'Lagos East'),
(239, 'Ikorodu', 24, 'Lagos', 72, 'Lagos East'),
(240, 'Kosofe', 24, 'Lagos', 72, 'Lagos East'),
(241, 'Somolu', 24, 'Lagos', 72, 'Lagos East'),

-- Lagos West Senatorial District (SD ID: 73)
(242, 'Agege', 24, 'Lagos', 73, 'Lagos West'),
(243, 'Ajeromi-Ifelodun', 24, 'Lagos', 73, 'Lagos West'),
(244, 'Alimosho', 24, 'Lagos', 73, 'Lagos West'),
(245, 'Amuwo-Odofin', 24, 'Lagos', 73, 'Lagos West'),
(246, 'Badagry', 24, 'Lagos', 73, 'Lagos West'),
(247, 'Ifako-Ijaiye', 24, 'Lagos', 73, 'Lagos West'),
(248, 'Ikeja', 24, 'Lagos', 73, 'Lagos West'),
(249, 'Mushin I', 24, 'Lagos', 73, 'Lagos West'),
(250, 'Mushin II', 24, 'Lagos', 73, 'Lagos West'),
(251, 'Ojo', 24, 'Lagos', 73, 'Lagos West'),
(252, 'Oshodi-Isolo I', 24, 'Lagos', 73, 'Lagos West'), -- Fixed structural split
(253, 'Oshodi-Isolo II', 24, 'Lagos', 73, 'Lagos West'), -- Fixed structural split

-- ============================================================
-- NASARAWA STATE (state_id: 301) - 5 Federal Constituencies
-- ============================================================

-- Nasarawa North Senatorial District (SD ID: 74)
(254, 'Akwanga / Nasarawa Eggon / Wamba', 25, 'Nasarawa', 74, 'Nasarawa North'),

-- Nasarawa South Senatorial District (SD ID: 75)
(255, 'Awe / Doma / Keana', 25, 'Nasarawa', 75, 'Nasarawa South'),
(256, 'Lafia / Obi', 25, 'Nasarawa', 75, 'Nasarawa South'),

-- Nasarawa West Senatorial District (SD ID: 76)
(257, 'Keffi / Karu / Kokona', 25, 'Nasarawa', 76, 'Nasarawa West'),
(258, 'Nasarawa / Toto', 25, 'Nasarawa', 76, 'Nasarawa West'),

-- ============================================================
-- NIGER STATE (state_id: 317) - 10 Federal Constituencies
-- ============================================================

-- Niger East Senatorial District (SD ID: 77)
(259, 'Chanchaga', 26, 'Niger', 77, 'Niger East'),
(260, 'Bosso / Paikoro', 26, 'Niger', 77, 'Niger East'),
(261, 'Gurara / Suleja / Tafa', 26, 'Niger', 77, 'Niger East'),
(262, 'Shiroro / Rafi / Munya', 26, 'Niger', 77, 'Niger East'),

-- Niger North Senatorial District (SD ID: 78)
(263, 'Agwara / Borgu', 26, 'Niger', 78, 'Niger North'),
(264, 'Bida / Gbako / Katcha', 26, 'Niger', 78, 'Niger North'),
(265, 'Kontagora / Wushishi / Mariga / Mashegu', 26, 'Niger', 78, 'Niger North'),
(266, 'Rijau / Magama', 26, 'Niger', 78, 'Niger North'),

-- Niger South Senatorial District (SD ID: 79)
(267, 'Lapai / Agaie', 26, 'Niger', 79, 'Niger South'),
(268, 'Lavun / Mokwa / Edati', 26, 'Niger', 79, 'Niger South'),

-- ============================================================
-- OGUN STATE (state_id: 323) - 9 Federal Constituencies
-- ============================================================

-- Ogun Central Senatorial District (SD ID: 80)
(269, 'Abeokuta North / Obafemi-Owode / Odeda', 27, 'Ogun', 80, 'Ogun Central'),
(270, 'Abeokuta South', 27, 'Ogun', 80, 'Ogun Central'),
(271, 'Ifo / Ewekoro', 27, 'Ogun', 80, 'Ogun Central'),

-- Ogun East Senatorial District (SD ID: 81)
(272, 'Ijebu North / Ijebu East / Ogun Waterside', 27, 'Ogun', 81, 'Ogun East'),
(273, 'Ijebu Ode / Odogbolu / Ijebu North East', 27, 'Ogun', 81, 'Ogun East'),
(274, 'Ikenne / Shagamu / Remo North', 27, 'Ogun', 81, 'Ogun East'),

-- Ogun West Senatorial District (SD ID: 82)
(275, 'Ado-Odo / Ota', 27, 'Ogun', 82, 'Ogun West'),
(276, 'Egbado North / Imeko Afon', 27, 'Ogun', 82, 'Ogun West'),
(277, 'Egbado South / Ipokia', 27, 'Ogun', 82, 'Ogun West'),

-- ============================================================
-- ONDO STATE (state_id: 321) - 9 Federal Constituencies
-- ============================================================

-- Ondo Central Senatorial District (SD ID: 83)
(278, 'Akure North / Akure South', 28, 'Ondo', 83, 'Ondo Central'),
(279, 'Idanre / Ifedore', 28, 'Ondo', 83, 'Ondo Central'),
(280, 'Ondo East / Ondo West', 28, 'Ondo', 83, 'Ondo Central'),

-- Ondo North Senatorial District (SD ID: 84)
(281, 'Akoko North-East / Akoko North-West', 28, 'Ondo', 84, 'Ondo North'),
(282, 'Akoko South-East / Akoko South-West', 28, 'Ondo', 84, 'Ondo North'),
(283, 'Ose / Owo', 28, 'Ondo', 84, 'Ondo North'),

-- Ondo South Senatorial District (SD ID: 85)
(284, 'Ilaje / Ese-Odo', 28, 'Ondo', 85, 'Ondo South'),
(285, 'Ile-Oluji-Okeigbo / Odigbo', 28, 'Ondo', 85, 'Ondo South'),
(286, 'Okitipupa / Irele', 28, 'Ondo', 85, 'Ondo South'),

-- ============================================================
-- OSUN STATE (state_id: 322) - 9 Federal Constituencies
-- ============================================================

-- Osun Central Senatorial District (SD ID: 86)
(287, 'Boluwaduro / Ifedayo / Ila', 29, 'Osun', 86, 'Osun Central'),
(288, 'Ifelodun / Boripe / Odo-Otin', 29, 'Osun', 86, 'Osun Central'),
(289, 'Olorunda / Irepodun / Orolu / Osogbo', 29, 'Osun', 86, 'Osun Central'),

-- Osun East Senatorial District (SD ID: 87)
(290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West', 29, 'Osun', 87, 'Osun East'),
(291, 'Ife Central / Ife East / Ife North / Ife South', 29, 'Osun', 87, 'Osun East'),
(292, 'Obokun / Oriade', 29, 'Osun', 87, 'Osun East'),

-- Osun West Senatorial District (SD ID: 88)
(293, 'Ayedaade / Irewole / Isokan', 29, 'Osun', 88, 'Osun West'),
(294, 'Ayedire / Iwo / Ola-Oluwa', 29, 'Osun', 88, 'Osun West'),
(295, 'Ede North / Ede South / Egbedore / Ejigbo', 29, 'Osun', 88, 'Osun West'),

-- ============================================================
-- OYO STATE (state_id: 296) - 14 Federal Constituencies
-- ============================================================

-- Oyo Central Senatorial District (SD ID: 89)
(296, 'Afijio / Atiba / Oyo East / Oyo West', 30, 'Oyo', 89, 'Oyo Central'), -- Cleaned up spaces
(297, 'Akinyele / Lagelu', 30, 'Oyo', 89, 'Oyo Central'),
(298, 'Egbeda / Ona-Ara', 30, 'Oyo', 89, 'Oyo Central'),
(299, 'Oluyole', 30, 'Oyo', 89, 'Oyo Central'),
(300, 'Ogo-Oluwa / Surulere', 30, 'Oyo', 89, 'Oyo Central'),

-- Oyo North Senatorial District (SD ID: 90)
(301, 'Atisbo / Saki East / Saki West', 30, 'Oyo', 90, 'Oyo North'),
(302, 'Irepo / Olorunsogo / Oorelope', 30, 'Oyo', 90, 'Oyo North'),
(303, 'Iseyin / Itesiwaju / Kajola / Iwajowa', 30, 'Oyo', 90, 'Oyo North'),
(304, 'Ogbomoso North / Ogbomoso South / Oriire', 30, 'Oyo', 90, 'Oyo North'),

-- Oyo South Senatorial District (SD ID: 91)
(305, 'Ibadan North', 30, 'Oyo', 91, 'Oyo South'),
(306, 'Ibadan North-East / Ibadan South-East', 30, 'Oyo', 91, 'Oyo South'),
(307, 'Ibadan North-West / Ibadan South-West', 30, 'Oyo', 91, 'Oyo South'),
(308, 'Ibarapa Central / Ibarapa North', 30, 'Oyo', 91, 'Oyo South'),
(309, 'Ido / Ibarapa East', 30, 'Oyo', 91, 'Oyo South'),

-- ============================================================
-- PLATEAU STATE (state_id: 302) - 8 Federal Constituencies
-- ============================================================

-- Plateau Central Senatorial District (SD ID: 92)
(310, 'Bokkos / Mangu', 31, 'Plateau', 92, 'Plateau Central'),
(311, 'Pankshin / Kanke / Kanam', 31, 'Plateau', 92, 'Plateau Central'),

-- Plateau North Senatorial District (SD ID: 93)
(312, 'Barkin Ladi / Riyom', 31, 'Plateau', 93, 'Plateau North'),
(313, 'Jos North / Bassa', 31, 'Plateau', 93, 'Plateau North'),
(314, 'Jos South / Jos East', 31, 'Plateau', 93, 'Plateau North'),

-- Plateau South Senatorial District (SD ID: 94)
(315, 'Langtang North / Langtang South', 31, 'Plateau', 94, 'Plateau South'),
(316, 'Mikang / Quaan Pan / Shendam', 31, 'Plateau', 94, 'Plateau South'),
(317, 'Wase', 31, 'Plateau', 94, 'Plateau South'),

-- ============================================================
-- RIVERS STATE (state_id: 4926) - 13 Federal Constituencies
-- ============================================================

-- Rivers East Senatorial District (SD ID: 95)
(318, 'Etche / Omuma', 32, 'Rivers', 95, 'Rivers East'),
(319, 'Ikwerre / Emohua', 32, 'Rivers', 95, 'Rivers East'),
(320, 'Obio/Akpor', 32, 'Rivers', 95, 'Rivers East'),
(321, 'Okrika / Ogu/Bolo', 32, 'Rivers', 95, 'Rivers East'),
(322, 'Port Harcourt I', 32, 'Rivers', 95, 'Rivers East'),
(323, 'Port Harcourt II', 32, 'Rivers', 95, 'Rivers East'),

-- Rivers South-East Senatorial District (SD ID: 96)
(324, 'Andoni / Opobo/Nkoro', 32, 'Rivers', 96, 'Rivers South-East'),
(325, 'Gokana / Khana', 32, 'Rivers', 96, 'Rivers South-East'),
(326, 'Eleme / Tai / Oyigbo', 32, 'Rivers', 96, 'Rivers South-East'),

-- Rivers West Senatorial District (SD ID: 97)
(327, 'Abua/Odual / Ahoada East', 32, 'Rivers', 97, 'Rivers West'),
(328, 'Ahoada West / Ogba/Egbema/Ndoni', 32, 'Rivers', 97, 'Rivers West'),
(329, 'Degema / Bonny', 32, 'Rivers', 97, 'Rivers West'),
(330, 'Asari-Toru / Akuku-Toru', 32, 'Rivers', 97, 'Rivers West');

-- ============================================================
-- SOKOTO STATE (state_id: 292) - 11 Federal Constituencies
-- ============================================================

-- Sokoto East Senatorial District (SD ID: 98)
(331, 'Gada / Goronyo', 33, 'Sokoto', 98, 'Sokoto East'),
(332, 'Isa / Sabon Birni', 33, 'Sokoto', 98, 'Sokoto East'),
(333, 'Illela / Gwadabawa', 33, 'Sokoto', 98, 'Sokoto East'),
(334, 'Rabah / Wurno', 33, 'Sokoto', 98, 'Sokoto East'),

-- Sokoto North Senatorial District (SD ID: 99)
(335, 'Binji / Silame', 33, 'Sokoto', 99, 'Sokoto North'),
(336, 'Kware / Wamako', 33, 'Sokoto', 99, 'Sokoto North'),
(337, 'Sokoto North / Sokoto South', 33, 'Sokoto', 99, 'Sokoto North'),
(338, 'Tangaza / Gudu', 33, 'Sokoto', 99, 'Sokoto North'),

-- Sokoto South Senatorial District (SD ID: 100)
(339, 'Kebbe / Tambuwal', 33, 'Sokoto', 100, 'Sokoto South'),
(340, 'Bodinga / Dange-Shuni / Tureta', 33, 'Sokoto', 100, 'Sokoto South'),
(341, 'Yabo / Shagari', 33, 'Sokoto', 100, 'Sokoto South'),

-- ============================================================
-- TARABA STATE (state_id: 319) - 6 Federal Constituencies
-- ============================================================

-- Taraba North Senatorial District (SD ID: 101)
(342, 'Jalingo / Yorro / Zing', 34, 'Taraba', 101, 'Taraba North'),
(343, 'Karim Lamido / Lau / Ardo-Kola', 34, 'Taraba', 101, 'Taraba North'),

-- Taraba Central Senatorial District (SD ID: 102)
(344, 'Bali / Gassol', 34, 'Taraba', 102, 'Taraba Central'),
(345, 'Sardauna / Gashaka / Kurmi', 34, 'Taraba', 102, 'Taraba Central'),

-- Taraba South Senatorial District (SD ID: 103)
(346, 'Donga / Ussa / Takum / Yangtu Special Development Area', 34, 'Taraba', 103, 'Taraba South'),
(347, 'Wukari / Ibi', 34, 'Taraba', 103, 'Taraba South'),

-- ============================================================
-- YOBE STATE (state_id: 297) - 6 Federal Constituencies
-- ============================================================

-- Yobe North Senatorial District (SD ID: 104)
(348, 'Bade / Jakusko', 35, 'Yobe', 104, 'Yobe North'),
(349, 'Machina / Nguru / Karasuwa / Yusufari', 35, 'Yobe', 104, 'Yobe North'),

-- Yobe East Senatorial District (SD ID: 105)
(350, 'Damaturu / Gujba / Gulani / Tarmuwa', 35, 'Yobe', 105, 'Yobe East'),
(351, 'Geidam / Yunusari / Bursari', 35, 'Yobe', 105, 'Yobe East'),

-- Yobe South Senatorial District (SD ID: 106)
(352, 'Fika / Fune', 35, 'Yobe', 106, 'Yobe South'),
(353, 'Potiskum / Nangere', 35, 'Yobe', 106, 'Yobe South'),

-- ============================================================
-- ZAMFARA STATE (state_id: 299) - 7 Federal Constituencies
-- ============================================================

-- Zamfara North Senatorial District (SD ID: 107)
(354, 'Zurmi / Shinkafi', 36, 'Zamfara', 107, 'Zamfara North'),
(355, 'Kaura Namoda / Birnin Magaji', 36, 'Zamfara', 107, 'Zamfara North'),

-- Zamfara Central Senatorial District (SD ID: 108)
(356, 'Gusau / Tsafe', 36, 'Zamfara', 108, 'Zamfara Central'),
(357, 'Bungudu / Maru', 36, 'Zamfara', 108, 'Zamfara Central'),

-- Zamfara West Senatorial District (SD ID: 109)
(358, 'Bakura / Maradun', 36, 'Zamfara', 109, 'Zamfara West'),
(359, 'Anka / Talata Mafara', 36, 'Zamfara', 109, 'Zamfara West'),
(360, 'Gummi / Bukkuyum', 36, 'Zamfara', 109, 'Zamfara West');
