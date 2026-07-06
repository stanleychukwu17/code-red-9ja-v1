-- 1. Create the State Assembly Constituencies Table
CREATE TABLE IF NOT EXISTS state_assembly_constituencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state_id INTEGER NOT NULL,
    state_name VARCHAR(255) NOT NULL,
    senatorial_district_id INTEGER NOT NULL,
    senatorial_district_name VARCHAR(255) NOT NULL,
    federal_constituency_id INTEGER NOT NULL,
    federal_constituency_name VARCHAR(255) NOT NULL
);

INSERT INTO state_assembly_constituencies (id, name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name) VALUES

-- ============================================================
-- ABIA STATE (state_id: 303) - 24 Seats
-- ============================================================
-- Abia North SD (SD ID: 1)
(1, 'Arochukwu I', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(2, 'Arochukwu II', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(3, 'Ohafia North', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(4, 'Ohafia South', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(5, 'Bende', 1, 'Abia', 1, 'Abia North', 2, 'Bende'),
(6, 'Isuikwuato', 1, 'Abia', 1, 'Abia North', 3, 'Isuikwuato / Umunneochi'),
(7, 'Umunneochi', 1, 'Abia', 1, 'Abia North', 3, 'Isuikwuato / Umunneochi'),
-- Abia Central SD (SD ID: 2)
(8, 'Isiala Ngwa North', 1, 'Abia', 2, 'Abia Central', 4, 'Isiala Ngwa North / Isiala Ngwa South'),
(9, 'Isiala Ngwa South', 1, 'Abia', 2, 'Abia Central', 4, 'Isiala Ngwa North / Isiala Ngwa South'),
(10, 'Obingwa I', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(11, 'Obingwa II', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(12, 'Ugwunagbo', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(13, 'Osisioma', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(14, 'Ikwuano', 1, 'Abia', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
(15, 'Umuahia North', 1, 'Abia', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
(16, 'Umuahia South', 1, 'Abia', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
-- Abia South SD (SD ID: 3)
(17, 'Aba North I', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(18, 'Aba North II', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(19, 'Aba South I', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(20, 'Aba South II', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(21, 'Aba South III', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(22, 'Ukwa East', 1, 'Abia', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),
(23, 'Ukwa West', 1, 'Abia', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),
(24, 'Obi Ngwa', 1, 'Abia', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),

-- ============================================================
-- ADAMAWA STATE (state_id: 320) - 25 Seats
-- ============================================================
-- Adamawa North SD (SD ID: 4)
(25, 'Michika', 2, 'Adamawa', 4, 'Adamawa North', 9, 'Michika / Madagali'),
(26, 'Madagali', 2, 'Adamawa', 4, 'Adamawa North', 9, 'Michika / Madagali'),
(27, 'Mubi North I', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
(28, 'Mubi North II', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
(29, 'Mubi South', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
(30, 'Maiha', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
-- Adamawa Central SD (SD ID: 6)
(31, 'Fufure', 2, 'Adamawa', 6, 'Adamawa Central', 11, 'Fufore / Song'),
(32, 'Song I', 2, 'Adamawa', 6, 'Adamawa Central', 11, 'Fufore / Song'),
(33, 'Song II', 2, 'Adamawa', 6, 'Adamawa Central', 11, 'Fufore / Song'),
(34, 'Hong', 2, 'Adamawa', 6, 'Adamawa Central', 12, 'Hong / Gombi'),
(35, 'Gombi', 2, 'Adamawa', 6, 'Adamawa Central', 12, 'Hong / Gombi'),
(36, 'Yola North I', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
(37, 'Yola North II', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
(38, 'Yola South', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
(39, 'Girei', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
-- Adamawa South SD (SD ID: 5)
(40, 'Demsa', 2, 'Adamawa', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
(41, 'Numan', 2, 'Adamawa', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
(42, 'Lamurde', 2, 'Adamawa', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
(43, 'Guyuk', 2, 'Adamawa', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
(44, 'Shelleng', 2, 'Adamawa', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
(45, 'Gayuk', 2, 'Adamawa', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
(46, 'Jada', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
(47, 'Ganye', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
(48, 'Mayo-Belwa', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
(49, 'Toungo', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),

-- ============================================================
-- AKWA IBOM STATE (state_id: 304) - 26 Seats
-- ============================================================
-- AK North-East SD (SD ID: 7)
(50, 'Etinan', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
(51, 'Nsit Ibom', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
(52, 'Nsit Ubium', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
(53, 'Itu', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 18, 'Itu / Ibiono Ibom'),
(54, 'Ibiono Ibom', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 18, 'Itu / Ibiono Ibom'),
(55, 'Uyo I', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
(56, 'Uyo II', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
(57, 'Uruan', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
(58, 'Nsit Atai', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
-- AK North-West SD (SD ID: 8)
(59, 'Abak', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
(60, 'Etim Ekpo', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
(61, 'Ika', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
(62, 'Ikono', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 21, 'Ikono / Ini'),
(63, 'Ini', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 21, 'Ikono / Ini'),
(64, 'Ikot Ekpene', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
(65, 'Essien Udim', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
(66, 'Obot Akara', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
(67, 'Ukanafun', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 26, 'Ukanafun / Oruk Anam'),
(68, 'Oruk Anam', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 26, 'Ukanafun / Oruk Anam'),
-- AK South SD (SD ID: 9)
(69, 'Eket', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
(70, 'Esit Eket', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
(71, 'Onna', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
(72, 'Ikot Abasi', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
(73, 'Mkpat Enin', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
(74, 'Eastern Obolo', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
(75, 'Oron', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko'),

-- ============================================================
-- ANAMBRA STATE (state_id: 315) - 30 Seats
-- ============================================================
-- Anambra North SD (SD ID: 10)
(76, 'Anambra East', 4, 'Anambra', 10, 'Anambra North', 27, 'Anambra East / Anambra West'),
(77, 'Anambra West', 4, 'Anambra', 10, 'Anambra North', 27, 'Anambra East / Anambra West'),
(78, 'Ogbaru I', 4, 'Anambra', 10, 'Anambra North', 28, 'Ogbaru'),
(79, 'Ogbaru II', 4, 'Anambra', 10, 'Anambra North', 28, 'Ogbaru'),
(80, 'Onitsha North I', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(81, 'Onitsha North II', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(82, 'Onitsha South I', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(83, 'Onitsha South II', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(84, 'Oyi', 4, 'Anambra', 10, 'Anambra North', 30, 'Oyi / Ayamelum'),
(85, 'Ayamelum', 4, 'Anambra', 10, 'Anambra North', 30, 'Oyi / Ayamelum'),
-- Anambra Central SD (SD ID: 11)
(86, 'Awka North', 4, 'Anambra', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
(87, 'Awka South I', 4, 'Anambra', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
(88, 'Awka South II', 4, 'Anambra', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
(89, 'Idemili North I', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(90, 'Idemili North II', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(91, 'Idemili South I', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(92, 'Idemili South II', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(93, 'Njikoka', 4, 'Anambra', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
(94, 'Dunukofia', 4, 'Anambra', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
(95, 'Anaocha', 4, 'Anambra', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
-- Anambra South SD (SD ID: 12)
(96, 'Aguata I', 4, 'Anambra', 12, 'Anambra South', 34, 'Aguata'),
(97, 'Aguata II', 4, 'Anambra', 12, 'Anambra South', 34, 'Aguata'),
(98, 'Ihiala I', 4, 'Anambra', 12, 'Anambra South', 35, 'Ihiala'),
(99, 'Ihiala II', 4, 'Anambra', 12, 'Anambra South', 35, 'Ihiala'),
(100, 'Nnewi North', 4, 'Anambra', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
(101, 'Nnewi South', 4, 'Anambra', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
(102, 'Ekwusigo', 4, 'Anambra', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
(103, 'Orumba North', 4, 'Anambra', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),
(104, 'Orumba South I', 4, 'Anambra', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),
(105, 'Orumba South II', 4, 'Anambra', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),

-- ============================================================
-- BAUCHI STATE (state_id: 312) - 31 Seats
-- ============================================================
-- Bauchi South SD (SD ID: 13)
(106, 'Alkaleri', 5, 'Bauchi', 13, 'Bauchi South', 38, 'Alkaleri / Kirfi'),
(107, 'Kirfi', 5, 'Bauchi', 13, 'Bauchi South', 38, 'Alkaleri / Kirfi'),
(108, 'Bauchi I', 5, 'Bauchi', 13, 'Bauchi South', 39, 'Bauchi'),
(109, 'Bauchi II', 5, 'Bauchi', 13, 'Bauchi South', 39, 'Bauchi'),
(110, 'Bauchi III', 5, 'Bauchi', 13, 'Bauchi South', 39, 'Bauchi'),
(111, 'Bogoro', 5, 'Bauchi', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
(112, 'Dass', 5, 'Bauchi', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
(113, 'Tafawa Balewa', 5, 'Bauchi', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
(114, 'Toro I', 5, 'Bauchi', 13, 'Bauchi South', 41, 'Toro'),
(115, 'Toro II', 5, 'Bauchi', 13, 'Bauchi South', 41, 'Toro'),
-- Bauchi Central SD (SD ID: 14)
(116, 'Darazo', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(117, 'Ganjuwa I', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(118, 'Ganjuwa II', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(119, 'Misau', 5, 'Bauchi', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
(120, 'Dambam', 5, 'Bauchi', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
(121, 'Ningi I', 5, 'Bauchi', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
(122, 'Ningi II', 5, 'Bauchi', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
(123, 'Warji', 5, 'Bauchi', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
(124, 'Damban', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(125, 'Misau II', 5, 'Bauchi', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
-- Bauchi North SD (SD ID: 15)
(126, 'Gamawa I', 5, 'Bauchi', 15, 'Bauchi North', 45, 'Gamawa'),
(127, 'Gamawa II', 5, 'Bauchi', 15, 'Bauchi North', 45, 'Gamawa'),
(128, 'Jamaare', 5, 'Bauchi', 15, 'Bauchi North', 46, 'Jamaare / Itas-Gadau'),
(129, 'Itas-Gadau', 5, 'Bauchi', 15, 'Bauchi North', 46, 'Jamaare / Itas-Gadau'),
(130, 'Katagum I', 5, 'Bauchi', 15, 'Bauchi North', 47, 'Katagum'),
(131, 'Katagum II', 5, 'Bauchi', 15, 'Bauchi North', 47, 'Katagum'),
(132, 'Katagum III', 5, 'Bauchi', 15, 'Bauchi North', 47, 'Katagum'),
(133, 'Shira', 5, 'Bauchi', 15, 'Bauchi North', 48, 'Shira / Giade'),
(134, 'Giade', 5, 'Bauchi', 15, 'Bauchi North', 48, 'Shira / Giade'),
(135, 'Zaki I', 5, 'Bauchi', 15, 'Bauchi North', 49, 'Zaki'),
(136, 'Zaki II', 5, 'Bauchi', 15, 'Bauchi North', 49, 'Zaki'),

-- ============================================================
-- BAYELSA STATE (state_id: 305) - 24 Seats
-- ============================================================
-- Bayelsa East SD (SD ID: 16)
(137, 'Brass I', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(138, 'Brass II', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(139, 'Brass III', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(140, 'Nembe I', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(141, 'Nembe II', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(142, 'Ogbia I', 6, 'Bayelsa', 16, 'Bayelsa East', 51, 'Ogbia'),
(143, 'Ogbia II', 6, 'Bayelsa', 16, 'Bayelsa East', 51, 'Ogbia'),
(144, 'Ogbia III', 6, 'Bayelsa', 16, 'Bayelsa East', 51, 'Ogbia'),
-- Bayelsa Central SD (SD ID: 17)
(145, 'Southern Ijaw I', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(146, 'Southern Ijaw II', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(147, 'Southern Ijaw III', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(148, 'Southern Ijaw IV', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(149, 'Kolokuma/Opokuma I', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
(150, 'Kolokuma/Opokuma II', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
(151, 'Yenagoa I', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
(152, 'Yenagoa II', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
-- Bayelsa West SD (SD ID: 18)
(153, 'Sagbama I', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(154, 'Sagbama II', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(155, 'Sagbama III', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(156, 'Sagbama IV', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(157, 'Ekeremor I', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(158, 'Ekeremor II', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(159, 'Ekeremor III', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(160, 'Ekeremor IV', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),

-- ============================================================
-- BENUE STATE (state_id: 291) - 29 Seats
-- ============================================================
-- Benue North-East SD (SD ID: 19)
(161, 'Katsina-Ala I', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(162, 'Katsina-Ala II', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(163, 'Ukum', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(164, 'Logo', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(165, 'Konshisha', 7, 'Benue', 19, 'Benue North-East', 56, 'Konshisha / Vandeikya'),
(166, 'Vandeikya', 7, 'Benue', 19, 'Benue North-East', 56, 'Konshisha / Vandeikya'),
(167, 'Kwande I', 7, 'Benue', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
(168, 'Kwande II', 7, 'Benue', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
(169, 'Ushongo', 7, 'Benue', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
-- Benue North-West SD (SD ID: 20)
(170, 'Buruku I', 7, 'Benue', 20, 'Benue North-West', 58, 'Buruku'),
(171, 'Buruku II', 7, 'Benue', 20, 'Benue North-West', 58, 'Buruku'),
(172, 'Gboko I', 7, 'Benue', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
(173, 'Gboko II', 7, 'Benue', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
(174, 'Tarka', 7, 'Benue', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
(175, 'Guma', 7, 'Benue', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
(176, 'Makurdi I', 7, 'Benue', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
(177, 'Makurdi II', 7, 'Benue', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
(178, 'Gwer East', 7, 'Benue', 20, 'Benue North-West', 61, 'Gwer East / Gwer West'),
(179, 'Gwer West', 7, 'Benue', 20, 'Benue North-West', 61, 'Gwer East / Gwer West'),

-- Benue South SD (SD ID: 21)
(180, 'Ado', 7, 'Benue', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
(181, 'Ogbadibo', 7, 'Benue', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
(182, 'Okpokwu', 7, 'Benue', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
(183, 'Apa', 7, 'Benue', 21, 'Benue South', 63, 'Apa / Agatu'),
(184, 'Agatu', 7, 'Benue', 21, 'Benue South', 63, 'Apa / Agatu'),
(185, 'Oju', 7, 'Benue', 21, 'Benue South', 64, 'Oju / Obi'),
(186, 'Obi', 7, 'Benue', 21, 'Benue South', 64, 'Oju / Obi'),
(187, 'Otukpo I', 7, 'Benue', 21, 'Benue South', 65, 'Otukpo / Ohimini'),
(188, 'Otukpo II', 7, 'Benue', 21, 'Benue South', 65, 'Otukpo / Ohimini'),
(189, 'Ohimini', 7, 'Benue', 21, 'Benue South', 65, 'Otukpo / Ohimini'),

-- ============================================================
-- BORNO STATE (state_id: 307) - 28 Seats
-- ============================================================
-- Borno North SD (SD ID: 22)
(190, 'Kaga', 8, 'Borno', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
(191, 'Gubio', 8, 'Borno', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
(192, 'Magumeri', 8, 'Borno', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
(193, 'Kukawa', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(194, 'Mobbar', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(195, 'Abadam', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(196, 'Guzamala', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(197, 'Monguno', 8, 'Borno', 22, 'Borno North', 68, 'Monguno / Nganzai / Marte'),
(198, 'Nganzai', 8, 'Borno', 22, 'Borno North', 68, 'Monguno / Nganzai / Marte'),
-- Borno Central SD (SD ID: 23)
(199, 'Bama', 8, 'Borno', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
(200, 'Ngala', 8, 'Borno', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
(201, 'Kala-Balge', 8, 'Borno', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
(202, 'Dikwa', 8, 'Borno', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
(203, 'Mafa', 8, 'Borno', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
(204, 'Konduga', 8, 'Borno', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
(205, 'Jere', 8, 'Borno', 23, 'Borno Central', 71, 'Jere'),
(206, 'Maiduguri I', 8, 'Borno', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
(207, 'Maiduguri II', 8, 'Borno', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
(208, 'Maiduguri III', 8, 'Borno', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
-- Borno South SD (SD ID: 24)
(209, 'Askira-Uba', 8, 'Borno', 24, 'Borno South', 73, 'Askira-Uba / Hawul'),
(210, 'Hawul', 8, 'Borno', 24, 'Borno South', 73, 'Askira-Uba / Hawul'),
(211, 'Biu', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(212, 'Kwaya Kusar', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(213, 'Shani', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(214, 'Bayo', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(215, 'Damboa', 8, 'Borno', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),
(216, 'Gwoza', 8, 'Borno', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),
(217, 'Chibok', 8, 'Borno', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),

-- ============================================================
-- CROSS RIVER STATE (state_id: 314) - 25 Seats
-- ============================================================
-- Cross River North SD (SD ID: 25)
(218, 'Obanliku', 9, 'Cross River', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
(219, 'Obudu', 9, 'Cross River', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
(220, 'Bekwarra', 9, 'Cross River', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
(221, 'Ogoja', 9, 'Cross River', 25, 'Cross River North', 77, 'Ogoja / Yala'),
(222, 'Yala I', 9, 'Cross River', 25, 'Cross River North', 77, 'Ogoja / Yala'),
(223, 'Yala II', 9, 'Cross River', 25, 'Cross River North', 77, 'Ogoja / Yala'),
-- Cross River Central SD (SD ID: 26)
(224, 'Abi', 9, 'Cross River', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
(225, 'Yakurr I', 9, 'Cross River', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
(226, 'Yakurr II', 9, 'Cross River', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
(227, 'Boki', 9, 'Cross River', 26, 'Cross River Central', 79, 'Boki / Ikom'),
(228, 'Ikom I', 9, 'Cross River', 26, 'Cross River Central', 79, 'Boki / Ikom'),
(229, 'Ikom II', 9, 'Cross River', 26, 'Cross River Central', 79, 'Boki / Ikom'),
(230, 'Obubra', 9, 'Cross River', 26, 'Cross River Central', 80, 'Obubra / Etung'),
(231, 'Etung', 9, 'Cross River', 26, 'Cross River Central', 80, 'Obubra / Etung'),
(232, 'Obubra II', 9, 'Cross River', 26, 'Cross River Central', 80, 'Obubra / Etung'),
-- Cross River South SD (SD ID: 27)
(233, 'Akamkpa', 9, 'Cross River', 27, 'Cross River South', 81, 'Akamkpa / Biase'),
(234, 'Biase', 9, 'Cross River', 27, 'Cross River South', 81, 'Akamkpa / Biase'),
(235, 'Calabar Municipal I', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
(236, 'Calabar Municipal II', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
(237, 'Odukpani', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
(238, 'Calabar South I', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(239, 'Calabar South II', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(240, 'Akpabuyo', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(241, 'Bakassi', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(242, 'Calabar Municipal III', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),

-- ============================================================
-- DELTA STATE (state_id: 316) - 29 Seats
-- ============================================================
-- Delta Central SD (SD ID: 28)
(243, 'Ethiope East', 10, 'Delta', 28, 'Delta Central', 84, 'Ethiope East / Ethiope West'),
(244, 'Ethiope West', 10, 'Delta', 28, 'Delta Central', 84, 'Ethiope East / Ethiope West'),
(245, 'Okpe', 10, 'Delta', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
(246, 'Sapele', 10, 'Delta', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
(247, 'Uvwie', 10, 'Delta', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
(248, 'Ughelli North I', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
(249, 'Ughelli North II', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
(250, 'Ughelli South', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
(251, 'Udu', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
-- Delta North SD (SD ID: 29)
(252, 'Aniocha North', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(253, 'Aniocha South', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(254, 'Oshimili North', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(255, 'Oshimili South', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(256, 'Ika North East', 10, 'Delta', 29, 'Delta North', 88, 'Ika North East / Ika South'),
(257, 'Ika South', 10, 'Delta', 29, 'Delta North', 88, 'Ika North East / Ika South'),
(258, 'Ndokwa East', 10, 'Delta', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
(259, 'Ndokwa West', 10, 'Delta', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
(260, 'Ukwuani', 10, 'Delta', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
-- Delta South SD (SD ID: 30)
(261, 'Bomadi', 10, 'Delta', 30, 'Delta South', 90, 'Bomadi / Patani'),
(262, 'Patani', 10, 'Delta', 30, 'Delta South', 90, 'Bomadi / Patani'),
(263, 'Burutu I', 10, 'Delta', 30, 'Delta South', 91, 'Burutu'),
(264, 'Burutu II', 10, 'Delta', 30, 'Delta South', 91, 'Burutu'),
(265, 'Burutu III', 10, 'Delta', 30, 'Delta South', 91, 'Burutu'),
(266, 'Isoko North', 10, 'Delta', 30, 'Delta South', 92, 'Isoko North / Isoko South'),
(267, 'Isoko South', 10, 'Delta', 30, 'Delta South', 92, 'Isoko North / Isoko South'),
(268, 'Warri North', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
(269, 'Warri South I', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
(270, 'Warri South II', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
(271, 'Warri South West', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),

-- ============================================================
-- EBONYI STATE (state_id: 311) - 24 Seats
-- ============================================================
-- Ebonyi North SD (SD ID: 31)
(272, 'Abakaliki I', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(273, 'Abakaliki II', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(274, 'Abakaliki III', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(275, 'Izzi I', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(276, 'Izzi II', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(277, 'Ebonyi', 11, 'Ebonyi', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
(278, 'Ohaukwu I', 11, 'Ebonyi', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
(279, 'Ohaukwu II', 11, 'Ebonyi', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
-- Ebonyi Central SD (SD ID: 32)
(280, 'Ezza North I', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(281, 'Ezza North II', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(282, 'Ishielu I', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(283, 'Ishielu II', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(284, 'Ezza South', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
(285, 'Ikwo I', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
(286, 'Ikwo II', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
(287, 'Ikwo III', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
-- Ebonyi South SD (SD ID: 33)
(288, 'Afikpo North I', 11, 'Ebonyi', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
(289, 'Afikpo North II', 11, 'Ebonyi', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
(290, 'Afikpo South (Edda)', 11, 'Ebonyi', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
(291, 'Ivo', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(292, 'Ohaozara I', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(293, 'Ohaozara II', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(294, 'Onicha I', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(295, 'Onicha II', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),

-- ============================================================
-- EDO STATE (state_id: 318) - 24 Seats
-- ============================================================
-- Edo South SD (SD ID: 34)
(296, 'Egor', 12, 'Edo', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
(297, 'Ikpoba-Okha I', 12, 'Edo', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
(298, 'Ikpoba-Okha II', 12, 'Edo', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
(299, 'Oredo I', 12, 'Edo', 34, 'Edo South', 101, 'Oredo'),
(300, 'Oredo II', 12, 'Edo', 34, 'Edo South', 101, 'Oredo'),
(301, 'Orhionmwon', 12, 'Edo', 34, 'Edo South', 102, 'Orhionmwon / Uhunmwonde'),
(302, 'Uhunmwonde', 12, 'Edo', 34, 'Edo South', 102, 'Orhionmwon / Uhunmwonde'),
(303, 'Ovia North-East', 12, 'Edo', 34, 'Edo South', 103, 'Ovia North-East / Ovia South-West'),
(304, 'Ovia South-West', 12, 'Edo', 34, 'Edo South', 103, 'Ovia North-East / Ovia South-West'),
-- Edo Central SD (SD ID: 35)
(305, 'Esan Central', 12, 'Edo', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
(306, 'Esan West', 12, 'Edo', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
(307, 'Igueben', 12, 'Edo', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
(308, 'Esan North-East', 12, 'Edo', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
(309, 'Esan South-East I', 12, 'Edo', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
(310, 'Esan South-East II', 12, 'Edo', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
-- Edo North SD (SD ID: 36)
(311, 'Etsako Central', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(312, 'Etsako East', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(313, 'Etsako West I', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(314, 'Etsako West II', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(315, 'Owan East', 12, 'Edo', 36, 'Edo North', 107, 'Owan East / Owan West'),
(316, 'Owan West', 12, 'Edo', 36, 'Edo North', 107, 'Owan East / Owan West'),
(317, 'Akoko-Edo I', 12, 'Edo', 36, 'Edo North', 108, 'Akoko-Edo'),
(318, 'Akoko-Edo II', 12, 'Edo', 36, 'Edo North', 108, 'Akoko-Edo'),
(319, 'Akoko-Edo III', 12, 'Edo', 36, 'Edo North', 108, 'Akoko-Edo'),

-- ============================================================
-- EKITI STATE (state_id: 309) - 26 Seats
-- ============================================================
-- Ekiti Central SD (SD ID: 37)
(320, 'Ado Ekiti I', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(321, 'Ado Ekiti II', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(322, 'Ado Ekiti III', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(323, 'Irepodun/Ifelodun I', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(324, 'Irepodun/Ifelodun II', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(325, 'Ijero', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
(326, 'Ekiti West', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
(327, 'Efon I', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
(328, 'Efon II', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
-- Ekiti North SD (SD ID: 38)
(329, 'Ikole I', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(330, 'Ikole II', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(331, 'Ikole III', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(332, 'Oye', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(333, 'Ido-Osi I', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(334, 'Ido-Osi II', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(335, 'Moba I', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(336, 'Moba II', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(337, 'Ilejemeje', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
-- Ekiti South SD (SD ID: 39)
(338, 'Ekiti South West I', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(339, 'Ekiti South West II', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(340, 'Ikere I', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(341, 'Ikere II', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(342, 'Ise-Orun', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(343, 'Ekiti East', 13, 'Ekiti', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),
(344, 'Emure', 13, 'Ekiti', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),
(345, 'Gbonyin', 13, 'Ekiti', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),

-- ============================================================
-- ENUGU STATE (state_id: 289) - 24 Seats
-- ============================================================
-- Enugu North SD (SD ID: 40)
(346, 'Igbo-Eze North', 14, 'Enugu', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
(347, 'Udenu', 14, 'Enugu', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
(348, 'Igbo-Etiti I', 14, 'Enugu', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
(349, 'Igbo-Etiti II', 14, 'Enugu', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
(350, 'Uzo-Uwani', 14, 'Enugu', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
(351, 'Nsukka I', 14, 'Enugu', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
(352, 'Nsukka II', 14, 'Enugu', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
(353, 'Igbo-Eze South', 14, 'Enugu', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
(354, 'Udenu II', 14, 'Enugu', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
-- Enugu East SD (SD ID: 41)
(355, 'Enugu East', 14, 'Enugu', 41, 'Enugu East', 118, 'Enugu East / Isi Uzo'),
(356, 'Isi Uzo', 14, 'Enugu', 41, 'Enugu East', 118, 'Enugu East / Isi Uzo'),
(357, 'Enugu North I', 14, 'Enugu', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
(358, 'Enugu North II', 14, 'Enugu', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
(359, 'Enugu South', 14, 'Enugu', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
(360, 'Nkanu East', 14, 'Enugu', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
(361, 'Nkanu West I', 14, 'Enugu', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
(362, 'Nkanu West II', 14, 'Enugu', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
-- Enugu West SD (SD ID: 42)
(363, 'Aninri', 14, 'Enugu', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
(364, 'Awgu', 14, 'Enugu', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
(365, 'Oji River', 14, 'Enugu', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
(366, 'Ezeagu I', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
(367, 'Ezeagu II', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
(368, 'Udi I', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
(369, 'Udi II', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),

-- ============================================================
-- GOMBE STATE (state_id: 310) - 24 Seats
-- ============================================================
-- Gombe Central SD (SD ID: 44)
(370, 'Akko I', 15, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(371, 'Akko II', 15, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(372, 'Akko III', 15, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(373, 'Akko IV', 15, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(374, 'Yamaltu I', 15, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
(375, 'Yamaltu II', 15, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
(376, 'Deba I', 15, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
(377, 'Deba II', 15, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
-- Gombe North SD (SD ID: 45)
(378, 'Dukku', 15, 'Gombe', 45, 'Gombe North', 127, 'Dukku / Nafada'),
(379, 'Nafada', 15, 'Gombe', 45, 'Gombe North', 127, 'Dukku / Nafada'),
(380, 'Gombe I', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(381, 'Gombe II', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(382, 'Gombe III', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(383, 'Kwami', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(384, 'Funakaye I', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(385, 'Funakaye II', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
-- Gombe South SD (SD ID: 46)
(386, 'Balanga I', 15, 'Gombe', 46, 'Gombe South', 129, 'Balanga / Billiri'),
(387, 'Balanga II', 15, 'Gombe', 46, 'Gombe South', 129, 'Balanga / Billiri'),
(388, 'Billiri', 15, 'Gombe', 46, 'Gombe South', 129, 'Balanga / Billiri'),
(389, 'Kaltungo I', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(390, 'Kaltungo II', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(391, 'Shongom I', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(392, 'Shongom II', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(393, 'Shongom III', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),

-- ============================================================
-- IMO STATE (state_id: 308) - 27 Seats
-- ============================================================
-- Imo North SD (SD ID: 47)
(394, 'Ehime Mbano', 16, 'Imo', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
(395, 'Ihitte-Uboma', 16, 'Imo', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
(396, 'Obowo', 16, 'Imo', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
(397, 'Okigwe I', 16, 'Imo', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
(398, 'Okigwe II', 16, 'Imo', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
(399, 'Onuimo', 16, 'Imo', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
-- Imo East SD (SD ID: 48)
(400, 'Aboh Mbaise', 16, 'Imo', 48, 'Imo East', 133, 'Aboh Mbaise / Ngor Okpala'),
(401, 'Ngor Okpala', 16, 'Imo', 48, 'Imo East', 133, 'Aboh Mbaise / Ngor Okpala'),
(402, 'Ahiazu Mbaise', 16, 'Imo', 48, 'Imo East', 134, 'Ahiazu / Ezinihitte Mbaise'),
(403, 'Ezinihitte Mbaise', 16, 'Imo', 48, 'Imo East', 134, 'Ahiazu / Ezinihitte Mbaise'),
(404, 'Ikeduru I', 16, 'Imo', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
(405, 'Ikeduru II', 16, 'Imo', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
(406, 'Mbaitoli', 16, 'Imo', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
(407, 'Owerri Municipal', 16, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
(408, 'Owerri North', 16, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
(409, 'Owerri West I', 16, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
(410, 'Owerri West II', 16, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
-- Imo West SD (SD ID: 49)
(411, 'Ideato North', 16, 'Imo', 49, 'Imo West', 137, 'Ideato North / Ideato South'),
(412, 'Ideato South', 16, 'Imo', 49, 'Imo West', 137, 'Ideato North / Ideato South'),
(413, 'Isu', 16, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(414, 'Njaba', 16, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(415, 'Nkwerre', 16, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(416, 'Nwangele', 16, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(417, 'Oguta', 16, 'Imo', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
(418, 'Ohaji-Egbema', 16, 'Imo', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
(419, 'Oru West', 16, 'Imo', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
(420, 'Orlu', 16, 'Imo', 49, 'Imo West', 140, 'Orlu / Orsu / Oru East'),

-- ============================================================
-- JIGAWA STATE (state_id: 288) - 30 Seats
-- ============================================================
-- Jigawa North-East SD (SD ID: 50)
(421, 'Hadejia', 17, 'Jigawa', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
(422, 'Kafin Hausa', 17, 'Jigawa', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
(423, 'Auyo', 17, 'Jigawa', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
(424, 'Birniwa', 17, 'Jigawa', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
(425, 'Guri', 17, 'Jigawa', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
(426, 'Kiri Kasamma', 17, 'Jigawa', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
(427, 'Kaugama', 17, 'Jigawa', 50, 'Jigawa North-East', 143, 'Kaugama / Malam Madori'),
(428, 'Malam Madori', 17, 'Jigawa', 50, 'Jigawa North-East', 143, 'Kaugama / Malam Madori'),
-- Jigawa North-West SD (SD ID: 51)
(429, 'Babura', 17, 'Jigawa', 51, 'Jigawa North-West', 144, 'Babura / Garki'),
(430, 'Garki', 17, 'Jigawa', 51, 'Jigawa North-West', 144, 'Babura / Garki'),
(431, 'Gumel', 17, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(432, 'Maigatari', 17, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(433, 'Sule Tankarkar', 17, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(434, 'Gagarawa', 17, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(435, 'Kazaure', 17, 'Jigawa', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
(436, 'Roni', 17, 'Jigawa', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
(437, 'Yankwashi', 17, 'Jigawa', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
-- Jigawa South-West SD (SD ID: 52)
(438, 'Birnin Kudu I', 17, 'Jigawa', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
(439, 'Birnin Kudu II', 17, 'Jigawa', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
(440, 'Buji', 17, 'Jigawa', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
(441, 'Dutse I', 17, 'Jigawa', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
(442, 'Dutse II', 17, 'Jigawa', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
(443, 'Kiyawa', 17, 'Jigawa', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
(444, 'Gwaram', 17, 'Jigawa', 52, 'Jigawa South-West', 149, 'Gwaram'),
(445, 'Jahun', 17, 'Jigawa', 52, 'Jigawa South-West', 150, 'Jahun / Miga'),
(446, 'Miga', 17, 'Jigawa', 52, 'Jigawa South-West', 150, 'Jahun / Miga'),
(447, 'Ringim', 17, 'Jigawa', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),
(448, 'Taura', 17, 'Jigawa', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),
(449, 'Ringim II', 17, 'Jigawa', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),
(450, 'Gwiwa', 17, 'Jigawa', 52, 'Jigawa South-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),

-- ============================================================
-- KADUNA STATE (state_id: 294) - 34 Seats
-- ============================================================
-- Kaduna North SD (SD ID: 53)
(451, 'Ikara', 18, 'Kaduna', 53, 'Kaduna North', 152, 'Ikara / Kubau'),
(452, 'Kubau', 18, 'Kaduna', 53, 'Kaduna North', 152, 'Ikara / Kubau'),
(453, 'Makarfi', 18, 'Kaduna', 53, 'Kaduna North', 153, 'Makarfi / Kudan'),
(454, 'Kudan', 18, 'Kaduna', 53, 'Kaduna North', 153, 'Makarfi / Kudan'),
(455, 'Sabon Gari I', 18, 'Kaduna', 53, 'Kaduna North', 154, 'Sabon Gari'),
(456, 'Sabon Gari II', 18, 'Kaduna', 53, 'Kaduna North', 154, 'Sabon Gari'),
(457, 'Zaria I', 18, 'Kaduna', 53, 'Kaduna North', 155, 'Zaria'),
(458, 'Zaria II', 18, 'Kaduna', 53, 'Kaduna North', 155, 'Zaria'),
(459, 'Zaria III', 18, 'Kaduna', 53, 'Kaduna North', 155, 'Zaria'),
(460, 'Lere', 18, 'Kaduna', 53, 'Kaduna North', 156, 'Lere'),
(461, 'Soba', 18, 'Kaduna', 53, 'Kaduna North', 157, 'Soba'),
-- Kaduna Central SD (SD ID: 54)
(462, 'Birnin Gwari', 18, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(463, 'Giwa', 18, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(464, 'Chikun', 18, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(465, 'Kajuru', 18, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(466, 'Igabi I', 18, 'Kaduna', 54, 'Kaduna Central', 160, 'Igabi'),
(467, 'Igabi II', 18, 'Kaduna', 54, 'Kaduna Central', 160, 'Igabi'),
(468, 'Kaduna North I', 18, 'Kaduna', 54, 'Kaduna Central', 161, 'Kaduna North'),
(469, 'Kaduna North II', 18, 'Kaduna', 54, 'Kaduna Central', 161, 'Kaduna North'),
(470, 'Kaduna South', 18, 'Kaduna', 54, 'Kaduna Central', 162, 'Kaduna South'),
-- Kaduna South SD (SD ID: 55)
(471, 'Jaba', 18, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(472, 'Zangon Kataf I', 18, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(473, 'Zangon Kataf II', 18, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(474, 'Jemaa', 18, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(475, 'Sanga', 18, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(476, 'Kachia', 18, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(477, 'Kagarko', 18, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(478, 'Kachia II', 18, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(479, 'Kaura I', 18, 'Kaduna', 55, 'Kaduna South', 166, 'Kaura'),
(480, 'Kaura II', 18, 'Kaduna', 55, 'Kaduna South', 166, 'Kaura'),
(481, 'Kauru I', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),
(482, 'Kauru II', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),
(483, 'Kauru III', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),
(484, 'Kauru IV', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),

-- ============================================================
-- KANO STATE (state_id: 300) - 40 Seats
-- ============================================================
-- Kano Central SD (SD ID: 56)
(485, 'Dala', 19, 'Kano', 56, 'Kano Central', 168, 'Dala'),
(486, 'Dawakin Kudu', 19, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(487, 'Warawa', 19, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(488, 'Fagge', 19, 'Kano', 56, 'Kano Central', 170, 'Fagge'),
(489, 'Gezawa', 19, 'Kano', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
(490, 'Gabasawa', 19, 'Kano', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
(491, 'Gwale', 19, 'Kano', 56, 'Kano Central', 172, 'Gwale'),
(492, 'Kano Municipal I', 19, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(493, 'Kano Municipal II', 19, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(494, 'Kano Municipal III', 19, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(495, 'Kumbotso', 19, 'Kano', 56, 'Kano Central', 174, 'Kumbotso'),
(496, 'Nasarawa I', 19, 'Kano', 56, 'Kano Central', 175, 'Nasarawa'),
(497, 'Nasarawa II', 19, 'Kano', 56, 'Kano Central', 175, 'Nasarawa'),
(498, 'Tarauni', 19, 'Kano', 56, 'Kano Central', 176, 'Tarauni'),
-- Kano North SD (SD ID: 57)
(499, 'Bagwai', 19, 'Kano', 57, 'Kano North', 178, 'Bagwai / Shanono'),
(500, 'Shanono', 19, 'Kano', 57, 'Kano North', 178, 'Bagwai / Shanono'),
(501, 'Bichi I', 19, 'Kano', 57, 'Kano North', 179, 'Bichi'),
(502, 'Bichi II', 19, 'Kano', 57, 'Kano North', 179, 'Bichi'),
(503, 'Dambatta', 19, 'Kano', 57, 'Kano North', 180, 'Dambatta / Makoda'),
(504, 'Makoda', 19, 'Kano', 57, 'Kano North', 180, 'Dambatta / Makoda'),
(505, 'Dawakin Tofa', 19, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(506, 'Tofa', 19, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(507, 'Rimin Gado', 19, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(508, 'Gwarzo', 19, 'Kano', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
(509, 'Kabo', 19, 'Kano', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
(510, 'Karaye', 19, 'Kano', 57, 'Kano North', 183, 'Karaye / Rogo'),
(511, 'Rogo', 19, 'Kano', 57, 'Kano North', 183, 'Karaye / Rogo'),
(512, 'Kunchi', 19, 'Kano', 57, 'Kano North', 184, 'Kunchi / Tsanyawa'),
-- Kano South SD (SD ID: 58)
(513, 'Albasu', 19, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(514, 'Ajingi', 19, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(515, 'Gaya', 19, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(516, 'Bebeji', 19, 'Kano', 58, 'Kano South', 187, 'Bebeji / Kiru'),
(517, 'Kiru', 19, 'Kano', 58, 'Kano South', 187, 'Bebeji / Kiru'),
(518, 'Doguwa', 19, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(519, 'Tudun Wada', 19, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(520, 'Kura', 19, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
(521, 'Rano', 19, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(522, 'Bunkure', 19, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(523, 'Takai', 19, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),
(524, 'Sumaila', 19, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),

-- ============================================================
-- KATSINA STATE (state_id: 313) - 34 Seats
-- ============================================================
-- Katsina Central SD (SD ID: 59)
(525, 'Batagarawa', 20, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(526, 'Charanchi', 20, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(527, 'Rimi', 20, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(528, 'Batsari', 20, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(529, 'Safana', 20, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(530, 'Dan Musa', 20, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(531, 'Dutsin-Ma', 20, 'Katsina', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
(532, 'Kurfi', 20, 'Katsina', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
(533, 'Jibia', 20, 'Katsina', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
(534, 'Kaita', 20, 'Katsina', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
(535, 'Katsina I', 20, 'Katsina', 59, 'Katsina Central', 196, 'Katsina Central'),
-- Katsina North SD (SD ID: 60)
(536, 'Bindawa', 20, 'Katsina', 60, 'Katsina North', 197, 'Bindawa / Mani'),
(537, 'Mani', 20, 'Katsina', 60, 'Katsina North', 197, 'Bindawa / Mani'),
(538, 'Daura', 20, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(539, 'Sandamu', 20, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(540, 'Mai''Adua', 20, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(541, 'Ingawa', 20, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(542, 'Kankia', 20, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(543, 'Kusada', 20, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(544, 'Mashi', 20, 'Katsina', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
(545, 'Dutsi', 20, 'Katsina', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
(546, 'Zango', 20, 'Katsina', 60, 'Katsina North', 201, 'Zango / Baure'),
(547, 'Baure', 20, 'Katsina', 60, 'Katsina North', 201, 'Zango / Baure'),
-- Katsina South SD (SD ID: 61)
(548, 'Bakori', 20, 'Katsina', 61, 'Katsina South', 202, 'Bakori / Danja'),
(549, 'Danja', 20, 'Katsina', 61, 'Katsina South', 202, 'Bakori / Danja'),
(550, 'Faskari', 20, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(551, 'Kankara', 20, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(552, 'Sabuwa', 20, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(553, 'Funtua', 20, 'Katsina', 61, 'Katsina South', 204, 'Funtua / Dandume'),
(554, 'Dandume', 20, 'Katsina', 61, 'Katsina South', 204, 'Funtua / Dandume'),
(555, 'Malumfashi', 20, 'Katsina', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
(556, 'Kafur', 20, 'Katsina', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
(557, 'Matazu', 20, 'Katsina', 61, 'Katsina South', 206, 'Matazu / Musawa'),
(558, 'Musawa', 20, 'Katsina', 61, 'Katsina South', 206, 'Matazu / Musawa'),

-- ============================================================
-- KEBBI STATE (state_id: 290) - 24 Seats
-- ============================================================
-- Kebbi Central SD (SD ID: 62)
(559, 'Aleiro', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(560, 'Gwandu', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(561, 'Jega', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(562, 'Birnin Kebbi I', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(563, 'Birnin Kebbi II', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(564, 'Kalgo', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(565, 'Bunza', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(566, 'Maiyama', 21, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
(567, 'Koko/Besse I', 21, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
(568, 'Koko/Besse II', 21, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
-- Kebbi North SD (SD ID: 63)
(569, 'Arewa', 21, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(570, 'Dandi', 21, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(571, 'Argungu', 21, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(572, 'Augie', 21, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(573, 'Bagudo', 21, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
(574, 'Suru I', 21, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
(575, 'Suru II', 21, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
-- Kebbi South SD (SD ID: 64)
(576, 'Fakai', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(577, 'Sakaba', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(578, 'Wasagu-Danko', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(579, 'Zuru', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(580, 'Yauri', 21, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
(581, 'Shanga', 21, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
(582, 'Ngaski', 21, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),

-- ============================================================
-- KOGI STATE (state_id: 298) - 25 Seats
-- ============================================================
-- Kogi Central SD (SD ID: 65)
(583, 'Adavi', 22, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(584, 'Okehi I', 22, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(585, 'Okehi II', 22, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(586, 'Ajaokuta', 22, 'Kogi', 65, 'Kogi Central', 216, 'Ajaokuta'),
(587, 'Okene I', 22, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
(588, 'Okene II', 22, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
(589, 'Ogori-Magongo', 22, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
-- Kogi East SD (SD ID: 66)
(590, 'Ankpa', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(591, 'Omala', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(592, 'Olamaboro', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(593, 'Dekina', 22, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(594, 'Bassa', 22, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(595, 'Idah', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(596, 'Ibaji', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(597, 'Igalamela-Odolu', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(598, 'Ofu', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
-- Kogi West SD (SD ID: 67)
(599, 'Kabba/Bunu I', 22, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(600, 'Kabba/Bunu II', 22, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(601, 'Ijumu', 22, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(602, 'Lokoja I', 22, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(603, 'Lokoja II', 22, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(604, 'Koton Karfe', 22, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(605, 'Yagba East', 22, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
(606, 'Yagba West', 22, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
(607, 'Mopa-Muro', 22, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),

-- ============================================================
-- KWARA STATE (state_id: 295) - 24 Seats
-- ============================================================
-- Kwara Central SD (SD ID: 68)
(608, 'Ilorin East I', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(609, 'Ilorin East II', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(610, 'Ilorin South I', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(611, 'Ilorin South II', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(612, 'Ilorin West I', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(613, 'Ilorin West II', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(614, 'Asa I', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(615, 'Asa II', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
-- Kwara North SD (SD ID: 69)
(616, 'Baruten I', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(617, 'Baruten II', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(618, 'Kaiama I', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(619, 'Kaiama II', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(620, 'Edu', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(621, 'Moro', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(622, 'Pategi I', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(623, 'Pategi II', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
-- Kwara South SD (SD ID: 70)
(624, 'Ekiti (Kwara)', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(625, 'Isin', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(626, 'Irepodun', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(627, 'Oke-Ero', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(628, 'Ifelodun', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(629, 'Offa I', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(630, 'Offa II', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(631, 'Oyun', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),

-- ============================================================
-- LAGOS STATE (state_id: 306) - 40 Seats
-- ============================================================
-- Lagos Central SD (SD ID: 71)
(632, 'Apapa I', 24, 'Lagos', 71, 'Lagos Central', 230, 'Apapa'),
(633, 'Apapa II', 24, 'Lagos', 71, 'Lagos Central', 230, 'Apapa'),
(634, 'Eti-Osa I', 24, 'Lagos', 71, 'Lagos Central', 231, 'Eti-Osa'),
(635, 'Eti-Osa II', 24, 'Lagos', 71, 'Lagos Central', 231, 'Eti-Osa'),
(636, 'Lagos Island I', 24, 'Lagos', 71, 'Lagos Central', 232, 'Lagos Island I'),
(637, 'Lagos Island II', 24, 'Lagos', 71, 'Lagos Central', 232, 'Lagos Island I'),
(638, 'Lagos Island III', 24, 'Lagos', 71, 'Lagos Central', 233, 'Lagos Island II'),
(639, 'Lagos Island IV', 24, 'Lagos', 71, 'Lagos Central', 233, 'Lagos Island II'),
(640, 'Lagos Mainland I', 24, 'Lagos', 71, 'Lagos Central', 234, 'Lagos Mainland'),
(641, 'Lagos Mainland II', 24, 'Lagos', 71, 'Lagos Central', 234, 'Lagos Mainland'),
(642, 'Surulere I', 24, 'Lagos', 71, 'Lagos Central', 235, 'Surulere I'),
(643, 'Surulere II', 24, 'Lagos', 71, 'Lagos Central', 236, 'Surulere II'),
-- Lagos East SD (SD ID: 72)
(644, 'Epe I', 24, 'Lagos', 72, 'Lagos East', 237, 'Epe'),
(645, 'Epe II', 24, 'Lagos', 72, 'Lagos East', 237, 'Epe'),
(646, 'Ibeju-Lekki I', 24, 'Lagos', 72, 'Lagos East', 238, 'Ibeju-Lekki'),
(647, 'Ibeju-Lekki II', 24, 'Lagos', 72, 'Lagos East', 238, 'Ibeju-Lekki'),
(648, 'Ikorodu I', 24, 'Lagos', 72, 'Lagos East', 239, 'Ikorodu'),
(649, 'Ikorodu II', 24, 'Lagos', 72, 'Lagos East', 239, 'Ikorodu'),
(650, 'Kosofe I', 24, 'Lagos', 72, 'Lagos East', 240, 'Kosofe'),
(651, 'Kosofe II', 24, 'Lagos', 72, 'Lagos East', 240, 'Kosofe'),
(652, 'Shomolu I', 24, 'Lagos', 72, 'Lagos East', 241, 'Somolu'),
(653, 'Shomolu II', 24, 'Lagos', 72, 'Lagos East', 241, 'Somolu'),
-- Lagos West SD (SD ID: 73)
(654, 'Agege I', 24, 'Lagos', 73, 'Lagos West', 242, 'Agege'),
(655, 'Agege II', 24, 'Lagos', 73, 'Lagos West', 242, 'Agege'),
(656, 'Ajeromi-Ifelodun I', 24, 'Lagos', 73, 'Lagos West', 243, 'Ajeromi-Ifelodun'),
(657, 'Ajeromi-Ifelodun II', 24, 'Lagos', 73, 'Lagos West', 243, 'Ajeromi-Ifelodun'),
(658, 'Alimosho I', 24, 'Lagos', 73, 'Lagos West', 244, 'Alimosho'),
(659, 'Alimosho II', 24, 'Lagos', 73, 'Lagos West', 244, 'Alimosho'),
(660, 'Amuwo-Odofin I', 24, 'Lagos', 73, 'Lagos West', 245, 'Amuwo-Odofin'),
(661, 'Amuwo-Odofin II', 24, 'Lagos', 73, 'Lagos West', 245, 'Amuwo-Odofin'),
(662, 'Badagry I', 24, 'Lagos', 73, 'Lagos West', 246, 'Badagry'),
(663, 'Badagry II', 24, 'Lagos', 73, 'Lagos West', 246, 'Badagry'),
(664, 'Ifako-Ijaiye I', 24, 'Lagos', 73, 'Lagos West', 247, 'Ifako-Ijaiye'),
(665, 'Ifako-Ijaiye II', 24, 'Lagos', 73, 'Lagos West', 247, 'Ifako-Ijaiye'),
(666, 'Ikeja I', 24, 'Lagos', 73, 'Lagos West', 248, 'Ikeja'),
(667, 'Ikeja II', 24, 'Lagos', 73, 'Lagos West', 248, 'Ikeja'),
(668, 'Mushin I', 24, 'Lagos', 73, 'Lagos West', 249, 'Mushin I'),
(669, 'Mushin II', 24, 'Lagos', 73, 'Lagos West', 250, 'Mushin II'),
(670, 'Ojo I', 24, 'Lagos', 73, 'Lagos West', 251, 'Ojo'),
(671, 'Oshodi-Isolo I', 24, 'Lagos', 73, 'Lagos West', 252, 'Oshodi-Isolo I'),

-- ============================================================
-- NASARAWA STATE (state_id: 301) - 24 Seats
-- ============================================================
-- Nasarawa North SD (SD ID: 74)
(672, 'Akwanga I', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(673, 'Akwanga II', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(674, 'Nasarawa Eggon I', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(675, 'Nasarawa Eggon II', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(676, 'Wamba I', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(677, 'Wamba II', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
-- Nasarawa South SD (SD ID: 75)
(678, 'Awe', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(679, 'Doma I', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(680, 'Doma II', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(681, 'Keana', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(682, 'Lafia I', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(683, 'Lafia II', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(684, 'Lafia III', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(685, 'Obi I', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(686, 'Obi II', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
-- Nasarawa West SD (SD ID: 76)
(687, 'Keffi I', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(688, 'Keffi II', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(689, 'Karu', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(690, 'Kokona', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(691, 'Nasarawa I', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(692, 'Nasarawa II', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(693, 'Nasarawa III', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(694, 'Toto I', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(695, 'Toto II', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),

-- ============================================================
-- NIGER STATE (state_id: 317) - 29 Seats
-- ============================================================
-- Niger East SD (SD ID: 77)
(696, 'Chanchaga I', 26, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(697, 'Chanchaga II', 26, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(698, 'Chanchaga III', 26, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(699, 'Bosso', 26, 'Niger', 77, 'Niger East', 260, 'Bosso / Paikoro'),
(700, 'Paikoro', 26, 'Niger', 77, 'Niger East', 260, 'Bosso / Paikoro'),
(701, 'Gurara', 26, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(702, 'Suleja', 26, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(703, 'Tafa', 26, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(704, 'Shiroro', 26, 'Niger', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
(705, 'Rafi', 26, 'Niger', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
-- Niger North SD (SD ID: 78)
(706, 'Agwara', 26, 'Niger', 78, 'Niger North', 263, 'Agwara / Borgu'),
(707, 'Borgu', 26, 'Niger', 78, 'Niger North', 263, 'Agwara / Borgu'),
(708, 'Bida', 26, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(709, 'Gbako', 26, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(710, 'Katcha', 26, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(711, 'Kontagora', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(712, 'Wushishi', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(713, 'Mariga', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(714, 'Mashegu', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(715, 'Rijau', 26, 'Niger', 78, 'Niger North', 266, 'Rijau / Magama'),
(716, 'Magama', 26, 'Niger', 78, 'Niger North', 266, 'Rijau / Magama'),
-- Niger South SD (SD ID: 79)
(717, 'Lapai I', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(718, 'Lapai II', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(719, 'Agaie I', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(720, 'Agaie II', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(721, 'Lavun', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(722, 'Mokwa', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(723, 'Edati', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(724, 'Mokwa II', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),

-- ============================================================
-- OGUN STATE (state_id: 323) - 26 Seats
-- ============================================================
-- Ogun Central SD (SD ID: 80)
(725, 'Abeokuta North I', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(726, 'Abeokuta North II', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(727, 'Obafemi-Owode', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(728, 'Odeda', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(729, 'Abeokuta South I', 27, 'Ogun', 80, 'Ogun Central', 270, 'Abeokuta South'),
(730, 'Abeokuta South II', 27, 'Ogun', 80, 'Ogun Central', 270, 'Abeokuta South'),
(731, 'Ifo', 27, 'Ogun', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
(732, 'Ewekoro', 27, 'Ogun', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
-- Ogun East SD (SD ID: 81)
(733, 'Ijebu North', 27, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(734, 'Ijebu East', 27, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(735, 'Ogun Waterside', 27, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(736, 'Ijebu Ode', 27, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(737, 'Odogbolu', 27, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(738, 'Ijebu North East', 27, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(739, 'Ikenne', 27, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
(740, 'Shagamu', 27, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
(741, 'Remo North', 27, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
-- Ogun West SD (SD ID: 82)
(742, 'Ado-Odo/Ota I', 27, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(743, 'Ado-Odo/Ota II', 27, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(744, 'Ado-Odo/Ota III', 27, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(745, 'Egbado North I', 27, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(746, 'Egbado North II', 27, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(747, 'Imeko Afon', 27, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(748, 'Egbado South', 27, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
(749, 'Ipokia I', 27, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
(750, 'Ipokia II', 27, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),

-- ============================================================
-- ONDO STATE (state_id: 321) - 26 Seats
-- ============================================================
-- Ondo Central SD (SD ID: 83)
(751, 'Akure North I', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(752, 'Akure North II', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(753, 'Akure South I', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(754, 'Akure South II', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(755, 'Idanre', 28, 'Ondo', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
(756, 'Ifedore', 28, 'Ondo', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
(757, 'Ondo East', 28, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
(758, 'Ondo West I', 28, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
(759, 'Ondo West II', 28, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
-- Ondo North SD (SD ID: 84)
(760, 'Akoko North-East I', 28, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(761, 'Akoko North-East II', 28, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(762, 'Akoko North-West', 28, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(763, 'Akoko South-East', 28, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(764, 'Akoko South-West I', 28, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(765, 'Akoko South-West II', 28, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(766, 'Ose', 28, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
(767, 'Owo I', 28, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
(768, 'Owo II', 28, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
-- Ondo South SD (SD ID: 85)
(769, 'Ilaje I', 28, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(770, 'Ilaje II', 28, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(771, 'Ese-Odo', 28, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(772, 'Ile-Oluji', 28, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(773, 'Okeigbo', 28, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(774, 'Odigbo', 28, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(775, 'Okitipupa', 28, 'Ondo', 85, 'Ondo South', 286, 'Okitipupa / Irele'),
(776, 'Irele', 28, 'Ondo', 85, 'Ondo South', 286, 'Okitipupa / Irele'),

-- ============================================================
-- OSUN STATE (state_id: 322) - 26 Seats
-- ============================================================
-- Osun Central SD (SD ID: 86)
(777, 'Boluwaduro', 29, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(778, 'Ifedayo', 29, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(779, 'Ila', 29, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(780, 'Ifelodun', 322, 86, 'Osun Central', 17, 'Etinan / Nsit Ibom / Nsit Ubium', 'Jigawa'),
(781, 'Boripe', 322, 86, 'Osun Central', 17, 'Etinan / Nsit Ibom / Nsit Ubium', 'Jigawa'),
(782, 'Odo-Otin', 322, 86, 'Osun Central', 17, 'Etinan / Nsit Ibom / Nsit Ubium', 'Jigawa'),
(783, 'Osogbo I', 322, 86, 'Osun Central', 14, 'Demsa / Numan / Lamurde', 'Enugu'),
(784, 'Osogbo II', 322, 86, 'Osun Central', 14, 'Demsa / Numan / Lamurde', 'Enugu'),
(785, 'Olorunda', 322, 86, 'Osun Central', 14, 'Demsa / Numan / Lamurde', 'Enugu'),
-- Osun East SD (SD ID: 87)
(786, 'Atakunmosa East', 322, 87, 'Osun East', 21, 'Ikono / Ini', 'Kebbi'),
(787, 'Atakunmosa West', 322, 87, 'Osun East', 21, 'Ikono / Ini', 'Kebbi'),
(788, 'Ilesa East', 322, 87, 'Osun East', 21, 'Ikono / Ini', 'Kebbi'),
(789, 'Ilesa West', 322, 87, 'Osun East', 21, 'Ikono / Ini', 'Kebbi'),
(790, 'Ife Central', 322, 87, 'Osun East', 7, 'Aba North / Aba South', 'Benue'),
(791, 'Ife East', 322, 87, 'Osun East', 7, 'Aba North / Aba South', 'Benue'),
(792, 'Obokun', 322, 87, 'Osun East', 33, 'Njikoka / Dunukofia / Anaocha', 'Sokoto'),
(793, 'Oriade', 322, 87, 'Osun East', 33, 'Njikoka / Dunukofia / Anaocha', 'Sokoto'),
-- Osun West SD (SD ID: 88)
(794, 'Ayedaade', 322, 88, 'Osun West', 37, 'Orumba North / Orumba South', 'Abuja FCT'),
(795, 'Irewole', 322, 88, 'Osun West', 37, 'Orumba North / Orumba South', 'Abuja FCT'),
(796, 'Isokan', 322, 88, 'Osun West', 37, 'Orumba North / Orumba South', 'Abuja FCT'),
(797, 'Ayedire', 322, 88, 'Osun West', 18, 'Itu / Ibiono Ibom', 'Kaduna'),
(798, 'Iwo', 322, 88, 'Osun West', 18, 'Itu / Ibiono Ibom', 'Kaduna'),
(799, 'Ola-Oluwa', 322, 88, 'Osun West', 18, 'Itu / Ibiono Ibom', 'Kaduna'),
(800, 'Ede North', 322, 88, 'Osun West', 23, 'Eket / Onna / Esit Eket / Ibeno', 'Kwara'),
(801, 'Ede South', 322, 88, 'Osun West', 23, 'Eket / Onna / Esit Eket / Ibeno', 'Kwara'),
(802, 'Egbedore', 322, 88, 'Osun West', 23, 'Eket / Onna / Esit Eket / Ibeno', 'Kwara'),

-- ============================================================
-- OYO STATE (state_id: 296) - 32 Seats
-- ============================================================
-- Oyo Central SD (SD ID: 89)
(803, 'Afijio', 30, 'Oyo', 89, 'Oyo Central', 30, 'Oyi / Ayamelum', 'Oyo'),
(804, 'Atiba', 30, 'Oyo', 89, 'Oyo Central', 30, 'Oyi / Ayamelum', 'Oyo'),
(805, 'Oyo East', 30, 'Oyo', 89, 'Oyo Central', 30, 'Oyi / Ayamelum', 'Oyo'),
(806, 'Oyo West', 30, 'Oyo', 89, 'Oyo Central', 30, 'Oyi / Ayamelum', 'Oyo'),
(807, 'Akinyele', 30, 'Oyo', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
(808, 'Lagelu', 30, 'Oyo', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
(809, 'Egbeda', 30, 'Oyo', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
(810, 'Ona-Ara', 30, 'Oyo', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
(811, 'Oluyole I', 30, 'Oyo', 89, 'Oyo Central', 299, 'Oluyole'),
(812, 'Oluyole II', 30, 'Oyo', 89, 'Oyo Central', 299, 'Oluyole'),
(813, 'Ogo-Oluwa', 30, 'Oyo', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
(814, 'Surulere (Oyo)', 30, 'Oyo', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
-- Oyo North SD (SD ID: 90)
(815, 'Atisbo', 30, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(816, 'Saki East', 30, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(817, 'Saki West', 30, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(818, 'Irepo', 30, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(819, 'Olorunsogo', 30, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(820, 'Orelope', 30, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(821, 'Iseyin', 30, 'Oyo', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
(822, 'Kajola', 30, 'Oyo', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
(823, 'Ogbomoso North', 30, 'Oyo', 90, 'Oyo North', 304, 'Ogbomoso North / Ogbomoso South / Oriire'),
-- Oyo South SD (SD ID: 91)
(824, 'Ibadan North I', 30, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),
(825, 'Ibadan North II', 30, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),
(826, 'Ibadan North-East', 30, 'Oyo', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
(827, 'Ibadan South-East', 30, 'Oyo', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
(828, 'Ibadan North-West', 30, 'Oyo', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
(829, 'Ibadan South-West', 30, 'Oyo', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
(830, 'Ibarapa Central', 30, 'Oyo', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
(831, 'Ibarapa North', 30, 'Oyo', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
(832, 'Ido', 30, 'Oyo', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
(833, 'Ibarapa East', 30, 'Oyo', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
(834, 'Ibadan North III', 30, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),

-- ============================================================
-- PLATEAU STATE (state_id: 302) - 24 Seats
-- ============================================================
-- Plateau Central SD (SD ID: 92)
(835, 'Bokkos', 31, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(836, 'Mangu I', 31, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(837, 'Mangu II', 31, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(838, 'Pankshin', 31, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
(839, 'Kanke', 31, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
(840, 'Kanam', 31, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
-- Plateau North SD (SD ID: 93)
(841, 'Barkin Ladi', 31, 'Plateau', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
(842, 'Riyom', 31, 'Plateau', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
(843, 'Jos North I', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(844, 'Jos North II', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(845, 'Jos North III', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(846, 'Bassa', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(847, 'Jos South I', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(848, 'Jos South II', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(849, 'Jos East', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(850, 'Jos South III', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
-- Plateau South SD (SD ID: 94)
(851, 'Langtang North', 31, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(852, 'Langtang South I', 31, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(853, 'Langtang South II', 31, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(854, 'Mikang', 31, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(855, 'Quan Pan', 31, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(856, 'Shendam', 31, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(857, 'Wase I', 31, 'Plateau', 94, 'Plateau South', 317, 'Wase'),
(858, 'Wase II', 31, 'Plateau', 94, 'Plateau South', 317, 'Wase'),

-- ============================================================
-- RIVERS STATE (state_id: 4926) - 32 Seats
-- ============================================================
-- Rivers East SD (SD ID: 95)
(859, 'Etche', 4926, 95, 'Rivers East', 12, 'Hong / Gombi', 'Edo'),
(860, 'Omuma', 4926, 95, 'Rivers East', 12, 'Hong / Gombi', 'Edo'),
(861, 'Ikwerre', 4926, 95, 'Rivers East', 34, 'Aguata', 'Taraba'),
(862, 'Emohua', 4926, 95, 'Rivers East', 34, 'Aguata', 'Taraba'),
(863, 'Obio/Akpor I', 4926, 95, 'Rivers East', 2, 'Bende', 'Adamawa'),
(864, 'Obio/Akpor II', 4926, 95, 'Rivers East', 2, 'Bende', 'Adamawa'),
(865, 'Okrika', 4926, 95, 'Rivers East', 28, 'Ogbaru', 'Ondo'),
(866, 'Ogu/Bolo', 4926, 95, 'Rivers East', 28, 'Ogbaru', 'Ondo'),
(867, 'Port Harcourt I', 4926, 95, 'Rivers East', 29, 'Onitsha North / Onitsha South', 'Osun'),
(868, 'Port Harcourt II', 4926, 95, 'Rivers East', 29, 'Onitsha North / Onitsha South', 'Osun'),
(869, 'Port Harcourt III', 4926, 95, 'Rivers East', 27, 'Anambra East / Anambra West', 'Ogun'),
(870, 'Port Harcourt IV', 4926, 95, 'Rivers East', 27, 'Anambra East / Anambra West', 'Ogun'),
(871, 'Obio/Akpor III', 4926, 95, 'Rivers East', 2, 'Bende', 'Adamawa'),
-- Rivers South-East SD (SD ID: 96)
(872, 'Andoni', 32, 'Rivers', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
(873, 'Opobo-Nkoro', 32, 'Rivers', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
(874, 'Gokana', 32, 'Rivers', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
(875, 'Khana', 32, 'Rivers', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
(876, 'Eleme', 32, 'Rivers', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
(877, 'Tai', 32, 'Rivers', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
-- Rivers West SD (SD ID: 97)
(878, 'Abua/Odual I', 32, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(879, 'Abua/Odual II', 32, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(880, 'Ahoada East', 32, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(881, 'Ahoada West', 32, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(882, 'Ogba/Egbema/Ndoni I', 32, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(883, 'Ogba/Egbema/Ndoni II', 32, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(884, 'Degema', 32, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),
(885, 'Bonny', 32, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),
(886, 'Asari-Toru I', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(887, 'Asari-Toru II', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(888, 'Akuku-Toru I', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(889, 'Akuku-Toru II', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(890, 'Degema II', 32, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),

-- ============================================================
-- SOKOTO STATE (state_id: 292) - 30 Seats
-- ============================================================
-- Sokoto East SD (SD ID: 98)
(891, 'Gada', 33, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(892, 'Goronyo I', 33, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(893, 'Goronyo II', 33, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(894, 'Isa', 33, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(895, 'Sabon Birni I', 33, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(896, 'Sabon Birni II', 33, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(897, 'Illela', 33, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(898, 'Gwadabawa I', 33, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(899, 'Gwadabawa II', 33, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(900, 'Rabah', 33, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
(901, 'Wurno I', 33, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
(902, 'Wurno II', 33, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
-- Sokoto North SD (SD ID: 99)
(903, 'Binji', 33, 'Sokoto', 99, 'Sokoto North', 335, 'Binji / Silame'),
(904, 'Silame', 33, 'Sokoto', 99, 'Sokoto North', 335, 'Binji / Silame'),
(905, 'Kware', 33, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(906, 'Wamako I', 33, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(907, 'Wamako II', 33, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(908, 'Sokoto North I', 33, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(909, 'Sokoto North II', 33, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(910, 'Sokoto South', 33, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(911, 'Tangaza', 33, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
(912, 'Gudu I', 33, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
(913, 'Gudu II', 33, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
-- Sokoto South SD (SD ID: 100)
(914, 'Kebbe', 33, 'Sokoto', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
(915, 'Tambuwal', 33, 'Sokoto', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
(916, 'Bodinga', 33, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(917, 'Dange-Shuni', 33, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(918, 'Tureta', 33, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(919, 'Yabo', 33, 'Sokoto', 100, 'Sokoto South', 341, 'Yabo / Shagari'),
(920, 'Shagari', 33, 'Sokoto', 100, 'Sokoto South', 341, 'Yabo / Shagari'),

-- ============================================================
-- TARABA STATE (state_id: 319) - 24 Seats
-- ============================================================
-- Taraba North SD (SD ID: 101)
(921, 'Jalingo I', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(922, 'Jalingo II', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(923, 'Yorro', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(924, 'Zing', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(925, 'Karim Lamido I', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(926, 'Karim Lamido II', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(927, 'Lau', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(928, 'Ardo-Kola', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
-- Taraba Central SD (SD ID: 102)
(929, 'Bali I', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(930, 'Bali II', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(931, 'Gassol I', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(932, 'Gassol II', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(933, 'Sardauna', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(934, 'Gashaka', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(935, 'Kurmi I', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(936, 'Kurmi II', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
-- Taraba South SD (SD ID: 103)
(937, 'Donga', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(938, 'Ussa', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(939, 'Takum I', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(940, 'Takum II', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(941, 'Wukari I', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(942, 'Wukari II', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(943, 'Ibi I', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(944, 'Ibi II', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),

-- ============================================================
-- YOBE STATE (state_id: 297) - 24 Seats
-- ============================================================
-- Yobe North SD (SD ID: 104)
(945, 'Bade I', 35, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(946, 'Bade II', 35, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(947, 'Jakusko', 35, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(948, 'Machina', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(949, 'Nguru', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(950, 'Karasuwa', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(951, 'Yusufari I', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(952, 'Yusufari II', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
-- Yobe East SD (SD ID: 105)
(953, 'Damaturu I', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(954, 'Damaturu II', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(955, 'Gujba', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(956, 'Gulani', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(957, 'Tarmuwa', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(958, 'Geidam', 35, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
(959, 'Yunusari', 35, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
(960, 'Bursari', 35, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
-- Yobe South SD (SD ID: 106)
(961, 'Fika I', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(962, 'Fika II', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(963, 'Fune I', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(964, 'Fune II', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(965, 'Potiskum I', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(966, 'Potiskum II', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(967, 'Nangere I', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(968, 'Nangere II', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),

-- ============================================================
-- ZAMFARA STATE (state_id: 299) - 24 Seats
-- ============================================================
-- Zamfara North SD (SD ID: 107)
(969, 'Zurmi I', 36, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(970, 'Zurmi II', 36, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(971, 'Shinkafi', 36, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(972, 'Kaura Namoda', 36, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
(973, 'Birnin Magaji I', 36, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
(974, 'Birnin Magaji II', 36, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
-- Zamfara Central SD (SD ID: 108)
(975, 'Gusau I', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(976, 'Gusau II', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(977, 'Gusau III', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(978, 'Tsafe I', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(979, 'Tsafe II', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(980, 'Bungudu I', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(981, 'Bungudu II', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(982, 'Bungudu III', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(983, 'Maru I', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(984, 'Maru II', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
-- Zamfara West SD (SD ID: 109)
(985, 'Bakura', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(986, 'Maradun', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(987, 'Talata Mafara I', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(988, 'Talata Mafara II', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(989, 'Anka I', 36, 'Zamfara', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
(990, 'Anka II', 36, 'Zamfara', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
(991, 'Gummi', 36, 'Zamfara', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum'),
(992, 'Bukkuyum', 36, 'Zamfara', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum');