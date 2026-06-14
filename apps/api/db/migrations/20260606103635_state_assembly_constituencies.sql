-- +goose Up
CREATE TABLE IF NOT EXISTS state_assembly_constituencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lga_id INTEGER NOT NULL,
    lga_name VARCHAR(255) NOT NULL,
    state_id INTEGER NOT NULL,
    state_name VARCHAR(255) NOT NULL,
    senatorial_district_id INTEGER NOT NULL,
    senatorial_district_name VARCHAR(255) NOT NULL,
    federal_constituency_id INTEGER NOT NULL,
    federal_constituency_name VARCHAR(255) NOT NULL
);

INSERT INTO state_assembly_constituencies (id, name, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name) VALUES
-- ============================================================
-- ABIA STATE (state_id: 303) - 24 Seats
-- ============================================================
-- Abia North SD (SD ID: 1)
(1, 'Arochukwu I', 3, 'AROCHUKWU', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(2, 'Arochukwu II', 3, 'AROCHUKWU', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(3, 'Ohafia North', 10, 'OHAFIA', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(4, 'Ohafia South', 10, 'OHAFIA', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(5, 'Bende', 4, 'BENDE', 1, 'Abia', 1, 'Abia North', 2, 'Bende'),
(6, 'Isuikwuato', 8, 'ISUIKWUATO', 1, 'Abia', 1, 'Abia North', 3, 'Isuikwuato / Umunneochi'),
(7, 'Umunneochi', 17, 'UMU - NNEOCHI', 1, 'Abia', 1, 'Abia North', 3, 'Isuikwuato / Umunneochi'),
-- Abia Central SD (SD ID: 2)
(8, 'Isiala Ngwa North', 6, 'ISIALA NGWA NORTH', 1, 'Abia', 2, 'Abia Central', 4, 'Isiala Ngwa North / Isiala Ngwa South'),
(9, 'Isiala Ngwa South', 7, 'ISIALA NGWA SOUTH', 1, 'Abia', 2, 'Abia Central', 4, 'Isiala Ngwa North / Isiala Ngwa South'),
(10, 'Obingwa I', 9, 'OBINGWA', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(11, 'Obingwa II', 9, 'OBINGWA', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(12, 'Ugwunagbo', 12, 'UGWUNAGBO', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(13, 'Osisioma', 11, 'OSISIOMA', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(14, 'Ikwuano', 5, 'IKWUANO', 1, 'Abia', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
(15, 'Umuahia North', 15, 'UMUAHIA NORTH', 1, 'Abia', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
(16, 'Umuahia South', 16, 'UMUAHIA  SOUTH', 1, 'Abia', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
-- Abia South SD (SD ID: 3)
(17, 'Aba North I', 1, 'ABA NORTH', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(18, 'Aba North II', 1, 'ABA NORTH', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(19, 'Aba South I', 2, 'ABA SOUTH', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(20, 'Aba South II', 2, 'ABA SOUTH', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(21, 'Aba South III', 2, 'ABA SOUTH', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(22, 'Ukwa East', 13, 'UKWA EAST', 1, 'Abia', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),
(23, 'Ukwa West', 14, 'UKWA  WEST', 1, 'Abia', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),
(24, 'Obi Ngwa', 9, 'OBINGWA', 1, 'Abia', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),

-- ============================================================
-- ADAMAWA STATE (state_id: 320) - 25 Seats
-- ============================================================
-- Adamawa North SD (SD ID: 4)
(25, 'Michika', 30, 'MICHIKA', 2, 'Adamawa', 4, 'Adamawa North', 9, 'Michika / Madagali'),
(26, 'Madagali', 27, 'MADAGALI', 2, 'Adamawa', 4, 'Adamawa North', 9, 'Michika / Madagali'),
(27, 'Mubi North I', 31, 'MUBI NORTH', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
(28, 'Mubi North II', 31, 'MUBI NORTH', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
(29, 'Mubi South', 32, 'MUBI SOUTH', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
(30, 'Maiha', 28, 'MAIHA', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
-- Adamawa Central SD (SD ID: 6)
(31, 'Fufure', 19, 'FUFORE', 2, 'Adamawa', 6, 'Adamawa Central', 11, 'Fufore / Song'),
(32, 'Song I', 35, 'SONG', 2, 'Adamawa', 6, 'Adamawa Central', 11, 'Fufore / Song'),
(33, 'Song II', 35, 'SONG', 2, 'Adamawa', 6, 'Adamawa Central', 11, 'Fufore / Song'),
(34, 'Hong', 24, 'HONG', 2, 'Adamawa', 6, 'Adamawa Central', 12, 'Hong / Gombi'),
(35, 'Gombi', 22, 'GOMBI', 2, 'Adamawa', 6, 'Adamawa Central', 12, 'Hong / Gombi'),
(36, 'Yola North I', 37, 'YOLA NORTH', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
(37, 'Yola North II', 37, 'YOLA NORTH', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
(38, 'Yola South', 38, 'YOLA SOUTH', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
(39, 'Girei', 21, 'GIRE 1', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
-- Adamawa South SD (SD ID: 5)
(40, 'Demsa', 18, 'DEMSA', 2, 'Adamawa', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
(41, 'Numan', 33, 'NUMAN', 2, 'Adamawa', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
(42, 'Lamurde', 26, 'LAMURDE', 2, 'Adamawa', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
(43, 'Guyuk', 23, 'GUYUK', 2, 'Adamawa', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
(44, 'Shelleng', 34, 'SHELLENG', 2, 'Adamawa', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
(45, 'Gayuk', 23, 'GUYUK', 2, 'Adamawa', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
(46, 'Jada', 25, 'JADA', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
(47, 'Ganye', 20, 'GANYE', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
(48, 'Mayo-Belwa', 29, 'MAYO - BELWA', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
(49, 'Toungo', 36, 'TOUNGO', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),

-- ============================================================
-- AKWA IBOM STATE (state_id: 304) - 26 Seats
-- ============================================================
-- AK North-East SD (SD ID: 7)
(50, 'Etinan', 45, 'ETINAN', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
(51, 'Nsit Ibom', 58, 'NSIT IBOM', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
(52, 'Nsit Ubium', 59, 'NSIT UBIUM', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
(53, 'Itu', 54, 'ITU', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 18, 'Itu / Ibiono Ibom'),
(54, 'Ibiono Ibom', 48, 'IBIONO IBOM', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 18, 'Itu / Ibiono Ibom'),
(55, 'Uyo I', 69, 'UYO', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
(56, 'Uyo II', 69, 'UYO', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
(57, 'Uruan', 67, 'URUAN', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
(58, 'Nsit Atai', 57, 'NSIT ATAI', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
-- AK North-West SD (SD ID: 8)
(59, 'Abak', 39, 'ABAK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
(60, 'Etim Ekpo', 44, 'ETIM EKPO', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
(61, 'Ika', 49, 'IKA', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
(62, 'Ikono', 50, 'IKONO', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 21, 'Ikono / Ini'),
(63, 'Ini', 53, 'INI', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 21, 'Ikono / Ini'),
(64, 'Ikot Ekpene', 52, 'IKOT EKPENE', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
(65, 'Essien Udim', 43, 'ESSIEN UDIM', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
(66, 'Obot Akara', 60, 'OBOT AKARA', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
(67, 'Ukanafun', 66, 'UKANAFUN', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 26, 'Ukanafun / Oruk Anam'),
(68, 'Oruk Anam', 64, 'ORUK ANAM', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 26, 'Ukanafun / Oruk Anam'),
-- AK South SD (SD ID: 9)
(69, 'Eket', 41, 'EKET', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
(70, 'Esit Eket', 41, 'EKET', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
(71, 'Onna', 62, 'ONNA', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
(72, 'Ikot Abasi', 51, 'IKOT ABASI', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
(73, 'Mkpat Enin', 56, 'MKPAT ENIN', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
(74, 'Eastern Obolo', 40, 'EASTERN OBOLO', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
(75, 'Oron', 63, 'ORON', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko'),

-- ============================================================
-- ANAMBRA STATE (state_id: 315) - 30 Seats
-- ============================================================
-- Anambra North SD (SD ID: 10)
(76, 'Anambra East', 72, 'ANAMBRA EAST', 4, 'Anambra', 10, 'Anambra North', 27, 'Anambra East / Anambra West'),
(77, 'Anambra West', 73, 'ANAMBRA WEST', 4, 'Anambra', 10, 'Anambra North', 27, 'Anambra East / Anambra West'),
(78, 'Ogbaru I', 85, 'OGBARU', 4, 'Anambra', 10, 'Anambra North', 28, 'Ogbaru'),
(79, 'Ogbaru II', 85, 'OGBARU', 4, 'Anambra', 10, 'Anambra North', 28, 'Ogbaru'),
(80, 'Onitsha North I', 86, 'ONITSHA-NORTH', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(81, 'Onitsha North II', 86, 'ONITSHA-NORTH', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(82, 'Onitsha South I', 87, 'ONITSHA -SOUTH', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(83, 'Onitsha South II', 87, 'ONITSHA -SOUTH', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(84, 'Oyi', 90, 'OYI', 4, 'Anambra', 10, 'Anambra North', 30, 'Oyi / Ayamelum'),
(85, 'Ayamelum', 71, 'AYAMELUM', 4, 'Anambra', 10, 'Anambra North', 30, 'Oyi / Ayamelum'),
-- Anambra Central SD (SD ID: 11)
(86, 'Awka North', 75, 'AWKA NORTH', 4, 'Anambra', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
(87, 'Awka South I', 76, 'AWKA SOUTH', 4, 'Anambra', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
(88, 'Awka South II', 76, 'AWKA SOUTH', 4, 'Anambra', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
(89, 'Idemili North I', 79, 'IDEMILI NORTH', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(90, 'Idemili North II', 79, 'IDEMILI NORTH', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(91, 'Idemili South I', 80, 'IDEMILI-SOUTH', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(92, 'Idemili South II', 80, 'IDEMILI-SOUTH', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(93, 'Njikoka', 82, 'NJIKOKA', 4, 'Anambra', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
(94, 'Dunukofia', 77, 'DUNUKOFIA', 4, 'Anambra', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
(95, 'Anaocha', 74, 'ANAOCHA', 4, 'Anambra', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
-- Anambra South SD (SD ID: 12)
(96, 'Aguata I', 70, 'AGUATA', 4, 'Anambra', 12, 'Anambra South', 34, 'Aguata'),
(97, 'Aguata II', 70, 'AGUATA', 4, 'Anambra', 12, 'Anambra South', 34, 'Aguata'),
(98, 'Ihiala I', 81, 'IHALA', 4, 'Anambra', 12, 'Anambra South', 35, 'Ihiala'),
(99, 'Ihiala II', 81, 'IHALA', 4, 'Anambra', 12, 'Anambra South', 35, 'Ihiala'),
(100, 'Nnewi North', 83, 'NNEWI NORTH', 4, 'Anambra', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
(101, 'Nnewi South', 84, 'NNEWI SOUTH', 4, 'Anambra', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
(102, 'Ekwusigo', 78, 'EKWUSIGO', 4, 'Anambra', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
(103, 'Orumba North', 88, 'ORUMBA NORTH', 4, 'Anambra', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),
(104, 'Orumba South I', 89, 'ORUMBA  SOUTH', 4, 'Anambra', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),
(105, 'Orumba South II', 89, 'ORUMBA  SOUTH', 4, 'Anambra', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),

-- ============================================================
-- BAUCHI STATE (state_id: 312) - 31 Seats
-- ============================================================
-- Bauchi South SD (SD ID: 13)
(106, 'Alkaleri', 91, 'ALKALERI', 5, 'Bauchi', 13, 'Bauchi South', 38, 'Alkaleri / Kirfi'),
(107, 'Kirfi', 103, 'KIRFI', 5, 'Bauchi', 13, 'Bauchi South', 38, 'Alkaleri / Kirfi'),
(108, 'Bauchi I', 92, 'BAUCHI', 5, 'Bauchi', 13, 'Bauchi South', 39, 'Bauchi'),
(109, 'Bauchi II', 92, 'BAUCHI', 5, 'Bauchi', 13, 'Bauchi South', 39, 'Bauchi'),
(110, 'Bauchi III', 92, 'BAUCHI', 5, 'Bauchi', 13, 'Bauchi South', 39, 'Bauchi'),
(111, 'Bogoro', 93, 'BOGORO', 5, 'Bauchi', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
(112, 'Dass', 96, 'DASS', 5, 'Bauchi', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
(113, 'Tafawa Balewa', 107, 'TAFAWA BALEWA', 5, 'Bauchi', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
(114, 'Toro I', 108, 'TORO', 5, 'Bauchi', 13, 'Bauchi South', 41, 'Toro'),
(115, 'Toro II', 108, 'TORO', 5, 'Bauchi', 13, 'Bauchi South', 41, 'Toro'),
-- Bauchi Central SD (SD ID: 14)
(116, 'Darazo', 95, 'DARAZO', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(117, 'Ganjuwa I', 98, 'GANJUWA', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(118, 'Ganjuwa II', 98, 'GANJUWA', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(119, 'Misau', 104, 'MISAU', 5, 'Bauchi', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
(120, 'Dambam', 94, 'DAMBAM', 5, 'Bauchi', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
(121, 'Ningi I', 105, 'NINGI', 5, 'Bauchi', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
(122, 'Ningi II', 105, 'NINGI', 5, 'Bauchi', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
(123, 'Warji', 109, 'WARJI', 5, 'Bauchi', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
(124, 'Damban', 94, 'DAMBAM', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(125, 'Misau II', 104, 'MISAU', 5, 'Bauchi', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
-- Bauchi North SD (SD ID: 15)
(126, 'Gamawa I', 97, 'GAMAWA', 5, 'Bauchi', 15, 'Bauchi North', 45, 'Gamawa'),
(127, 'Gamawa II', 97, 'GAMAWA', 5, 'Bauchi', 15, 'Bauchi North', 45, 'Gamawa'),
(128, 'Jamaare', 91, 'ALKALERI', 5, 'Bauchi', 15, 'Bauchi North', 46, 'Jamaare / Itas-Gadau'),
(129, 'Itas-Gadau', 100, 'ITAS/GADAU', 5, 'Bauchi', 15, 'Bauchi North', 46, 'Jamaare / Itas-Gadau'),
(130, 'Katagum I', 102, 'KATAGUM', 5, 'Bauchi', 15, 'Bauchi North', 47, 'Katagum'),
(131, 'Katagum II', 102, 'KATAGUM', 5, 'Bauchi', 15, 'Bauchi North', 47, 'Katagum'),
(132, 'Katagum III', 102, 'KATAGUM', 5, 'Bauchi', 15, 'Bauchi North', 47, 'Katagum'),
(133, 'Shira', 106, 'SHIRA', 5, 'Bauchi', 15, 'Bauchi North', 48, 'Shira / Giade'),
(134, 'Giade', 99, 'GIADE', 5, 'Bauchi', 15, 'Bauchi North', 48, 'Shira / Giade'),
(135, 'Zaki I', 110, 'ZAKI', 5, 'Bauchi', 15, 'Bauchi North', 49, 'Zaki'),
(136, 'Zaki II', 110, 'ZAKI', 5, 'Bauchi', 15, 'Bauchi North', 49, 'Zaki'),

-- ============================================================
-- BAYELSA STATE (state_id: 305) - 24 Seats
-- ============================================================
-- Bayelsa East SD (SD ID: 16)
(137, 'Brass I', 111, 'BRASS', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(138, 'Brass II', 111, 'BRASS', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(139, 'Brass III', 111, 'BRASS', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(140, 'Nembe I', 114, 'NEMBE', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(141, 'Nembe II', 114, 'NEMBE', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(142, 'Ogbia I', 115, 'OGBIA', 6, 'Bayelsa', 16, 'Bayelsa East', 51, 'Ogbia'),
(143, 'Ogbia II', 115, 'OGBIA', 6, 'Bayelsa', 16, 'Bayelsa East', 51, 'Ogbia'),
(144, 'Ogbia III', 115, 'OGBIA', 6, 'Bayelsa', 16, 'Bayelsa East', 51, 'Ogbia'),
-- Bayelsa Central SD (SD ID: 17)
(145, 'Southern Ijaw I', 117, 'SOUTHERN IJAW', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(146, 'Southern Ijaw II', 117, 'SOUTHERN IJAW', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(147, 'Southern Ijaw III', 117, 'SOUTHERN IJAW', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(148, 'Southern Ijaw IV', 117, 'SOUTHERN IJAW', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(149, 'Kolokuma/Opokuma I', 113, 'KOLOKUMA/OPOKUMA', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
(150, 'Kolokuma/Opokuma II', 113, 'KOLOKUMA/OPOKUMA', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
(151, 'Yenagoa I', 118, 'YENAGOA', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
(152, 'Yenagoa II', 118, 'YENAGOA', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
-- Bayelsa West SD (SD ID: 18)
(153, 'Sagbama I', 116, 'SAGBAMA', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(154, 'Sagbama II', 116, 'SAGBAMA', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(155, 'Sagbama III', 116, 'SAGBAMA', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(156, 'Sagbama IV', 116, 'SAGBAMA', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(157, 'Ekeremor I', 112, 'EKEREMOR', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(158, 'Ekeremor II', 112, 'EKEREMOR', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(159, 'Ekeremor III', 112, 'EKEREMOR', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(160, 'Ekeremor IV', 112, 'EKEREMOR', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),

-- ============================================================
-- BENUE STATE (state_id: 291) - 29 Seats
-- ============================================================
-- Benue North-East SD (SD ID: 19)
(161, 'Katsina-Ala I', 127, 'KATSINA-ALA', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(162, 'Katsina-Ala II', 127, 'KATSINA-ALA', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(163, 'Ukum', 139, 'UKUM', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(164, 'Logo', 130, 'LOGO', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(165, 'Konshisha', 128, 'KONSHISHA', 7, 'Benue', 19, 'Benue North-East', 56, 'Konshisha / Vandeikya'),
(166, 'Vandeikya', 141, 'VANDEIKYA', 7, 'Benue', 19, 'Benue North-East', 56, 'Konshisha / Vandeikya'),
(167, 'Kwande I', 129, 'KWANDE', 7, 'Benue', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
(168, 'Kwande II', 129, 'KWANDE', 7, 'Benue', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
(169, 'Ushongo', 140, 'USHONGO', 7, 'Benue', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
-- Benue North-West SD (SD ID: 20)
(170, 'Buruku I', 122, 'BURUKU', 7, 'Benue', 20, 'Benue North-West', 58, 'Buruku'),
(171, 'Buruku II', 122, 'BURUKU', 7, 'Benue', 20, 'Benue North-West', 58, 'Buruku'),
(172, 'Gboko I', 123, 'GBOKO', 7, 'Benue', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
(173, 'Gboko II', 123, 'GBOKO', 7, 'Benue', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
(174, 'Tarka', 138, 'TARKA', 7, 'Benue', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
(175, 'Guma', 124, 'GUMA', 7, 'Benue', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
(176, 'Makurdi I', 131, 'MAKURDI', 7, 'Benue', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
(177, 'Makurdi II', 131, 'MAKURDI', 7, 'Benue', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
(178, 'Gwer East', 125, 'GWER EAST', 7, 'Benue', 20, 'Benue North-West', 61, 'Gwer East / Gwer West'),
(179, 'Gwer West', 126, 'GWER WEST', 7, 'Benue', 20, 'Benue North-West', 61, 'Gwer East / Gwer West'),

-- Benue South SD (SD ID: 21)
(180, 'Ado', 119, 'ADO', 7, 'Benue', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
(181, 'Ogbadibo', 133, 'OGBADIBO', 7, 'Benue', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
(182, 'Okpokwu', 136, 'OKPOKWU', 7, 'Benue', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
(183, 'Apa', 121, 'APA', 7, 'Benue', 21, 'Benue South', 63, 'Apa / Agatu'),
(184, 'Agatu', 120, 'AGATU', 7, 'Benue', 21, 'Benue South', 63, 'Apa / Agatu'),
(185, 'Oju', 134, 'OJU', 7, 'Benue', 21, 'Benue South', 64, 'Oju / Obi'),
(186, 'Obi', 132, 'OBI', 7, 'Benue', 21, 'Benue South', 64, 'Oju / Obi'),
(187, 'Otukpo I', 137, 'OTUKPO', 7, 'Benue', 21, 'Benue South', 65, 'Otukpo / Ohimini'),
(188, 'Otukpo II', 137, 'OTUKPO', 7, 'Benue', 21, 'Benue South', 65, 'Otukpo / Ohimini'),
(189, 'Ohimini', 135, 'OHIMINI', 7, 'Benue', 21, 'Benue South', 65, 'Otukpo / Ohimini'),

-- ============================================================
-- BORNO STATE (state_id: 307) - 28 Seats
-- ============================================================
-- Borno North SD (SD ID: 22)
(190, 'Kaga', 155, 'KAGA', 8, 'Borno', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
(191, 'Gubio', 150, 'GUBIO', 8, 'Borno', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
(192, 'Magumeri', 161, 'MAGUMERI', 8, 'Borno', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
(193, 'Kukawa', 158, 'KUKAWA', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(194, 'Mobbar', 164, 'MOBBAR', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(195, 'Abadam', 142, 'ABADAM', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(196, 'Guzamala', 151, 'GUZAMALA', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(197, 'Monguno', 165, 'MONGUNO', 8, 'Borno', 22, 'Borno North', 68, 'Monguno / Nganzai / Marte'),
(198, 'Nganzai', 167, 'NGANZAI', 8, 'Borno', 22, 'Borno North', 68, 'Monguno / Nganzai / Marte'),
-- Borno Central SD (SD ID: 23)
(199, 'Bama', 144, 'BAMA', 8, 'Borno', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
(200, 'Ngala', 166, 'NGALA', 8, 'Borno', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
(201, 'Kala-Balge', 156, 'KALA BALGE', 8, 'Borno', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
(202, 'Dikwa', 149, 'DIKWA', 8, 'Borno', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
(203, 'Mafa', 160, 'MAFA', 8, 'Borno', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
(204, 'Konduga', 157, 'KONDUGA', 8, 'Borno', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
(205, 'Jere', 154, 'JERE', 8, 'Borno', 23, 'Borno Central', 71, 'Jere'),
(206, 'Maiduguri I', 162, 'MAIDUGURI M. C.', 8, 'Borno', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
(207, 'Maiduguri II', 162, 'MAIDUGURI M. C.', 8, 'Borno', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
(208, 'Maiduguri III', 162, 'MAIDUGURI M. C.', 8, 'Borno', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
-- Borno South SD (SD ID: 24)
(209, 'Askira-Uba', 143, 'ASKIRA / UBA', 8, 'Borno', 24, 'Borno South', 73, 'Askira-Uba / Hawul'),
(210, 'Hawul', 153, 'HAWUL', 8, 'Borno', 24, 'Borno South', 73, 'Askira-Uba / Hawul'),
(211, 'Biu', 146, 'BIU', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(212, 'Kwaya Kusar', 159, 'KWAYA / KUSAR', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(213, 'Shani', 168, 'SHANI', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(214, 'Bayo', 145, 'BAYO', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(215, 'Damboa', 148, 'DAMBOA', 8, 'Borno', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),
(216, 'Gwoza', 152, 'GWOZA', 8, 'Borno', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),
(217, 'Chibok', 147, 'CHIBOK', 8, 'Borno', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),

-- ============================================================
-- CROSS RIVER STATE (state_id: 314) - 25 Seats
-- ============================================================
-- Cross River North SD (SD ID: 25)
(218, 'Obanliku', 180, 'OBANLIKU', 9, 'Cross River', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
(219, 'Obudu', 182, 'OBUDU', 9, 'Cross River', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
(220, 'Bekwarra', 173, 'BEKWARRA', 9, 'Cross River', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
(221, 'Ogoja', 184, 'OGOJA', 9, 'Cross River', 25, 'Cross River North', 77, 'Ogoja / Yala'),
(222, 'Yala I', 186, 'YALA', 9, 'Cross River', 25, 'Cross River North', 77, 'Ogoja / Yala'),
(223, 'Yala II', 186, 'YALA', 9, 'Cross River', 25, 'Cross River North', 77, 'Ogoja / Yala'),
-- Cross River Central SD (SD ID: 26)
(224, 'Abi', 169, 'ABI', 9, 'Cross River', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
(225, 'Yakurr I', 185, 'YAKURR', 9, 'Cross River', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
(226, 'Yakurr II', 185, 'YAKURR', 9, 'Cross River', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
(227, 'Boki', 175, 'BOKI', 9, 'Cross River', 26, 'Cross River Central', 79, 'Boki / Ikom'),
(228, 'Ikom I', 179, 'IKOM', 9, 'Cross River', 26, 'Cross River Central', 79, 'Boki / Ikom'),
(229, 'Ikom II', 179, 'IKOM', 9, 'Cross River', 26, 'Cross River Central', 79, 'Boki / Ikom'),
(230, 'Obubra', 181, 'OBUBRA', 9, 'Cross River', 26, 'Cross River Central', 80, 'Obubra / Etung'),
(231, 'Etung', 178, 'ETUNG', 9, 'Cross River', 26, 'Cross River Central', 80, 'Obubra / Etung'),
(232, 'Obubra II', 181, 'OBUBRA', 9, 'Cross River', 26, 'Cross River Central', 80, 'Obubra / Etung'),
-- Cross River South SD (SD ID: 27)
(233, 'Akamkpa', 170, 'AKAMKPA', 9, 'Cross River', 27, 'Cross River South', 81, 'Akamkpa / Biase'),
(234, 'Biase', 174, 'BIASE', 9, 'Cross River', 27, 'Cross River South', 81, 'Akamkpa / Biase'),
(235, 'Calabar Municipal I', 176, 'CALABAR MUNICIPALITY', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
(236, 'Calabar Municipal II', 176, 'CALABAR MUNICIPALITY', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
(237, 'Odukpani', 183, 'ODUKPANI', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
(238, 'Calabar South I', 177, 'CALABAR SOUTH', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(239, 'Calabar South II', 177, 'CALABAR SOUTH', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(240, 'Akpabuyo', 171, 'AKPABUYO', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(241, 'Bakassi', 172, 'BAKASSI', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(242, 'Calabar Municipal III', 176, 'CALABAR MUNICIPALITY', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),

-- ============================================================
-- DELTA STATE (state_id: 316) - 29 Seats
-- ============================================================
-- Delta Central SD (SD ID: 28)
(243, 'Ethiope East', 191, 'ETHIOPE  EAST', 10, 'Delta', 28, 'Delta Central', 84, 'Ethiope East / Ethiope West'),
(244, 'Ethiope West', 192, 'ETHIOPE  WEST', 10, 'Delta', 28, 'Delta Central', 84, 'Ethiope East / Ethiope West'),
(245, 'Okpe', 199, 'OKPE', 10, 'Delta', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
(246, 'Sapele', 203, 'SAPELE', 10, 'Delta', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
(247, 'Uvwie', 208, 'UVWIE', 10, 'Delta', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
(248, 'Ughelli North I', 205, 'UGHELLI NORTH', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
(249, 'Ughelli North II', 205, 'UGHELLI NORTH', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
(250, 'Ughelli South', 206, 'UGHELLI SOUTH', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
(251, 'Udu', 204, 'UDU', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
-- Delta North SD (SD ID: 29)
(252, 'Aniocha North', 187, 'ANIOCHA NORTH', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(253, 'Aniocha South', 188, 'ANIOCHA - SOUTH', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(254, 'Oshimili North', 200, 'OSHIMILI - NORTH', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(255, 'Oshimili South', 201, 'OSHIMILI - SOUTH', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(256, 'Ika North East', 193, 'IKA NORTH- EAST', 10, 'Delta', 29, 'Delta North', 88, 'Ika North East / Ika South'),
(257, 'Ika South', 194, 'IKA - SOUTH', 10, 'Delta', 29, 'Delta North', 88, 'Ika North East / Ika South'),
(258, 'Ndokwa East', 197, 'NDOKWA EAST', 10, 'Delta', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
(259, 'Ndokwa West', 198, 'NDOKWA WEST', 10, 'Delta', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
(260, 'Ukwuani', 207, 'UKWUANI', 10, 'Delta', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
-- Delta South SD (SD ID: 30)
(261, 'Bomadi', 189, 'BOMADI', 10, 'Delta', 30, 'Delta South', 90, 'Bomadi / Patani'),
(262, 'Patani', 202, 'PATANI', 10, 'Delta', 30, 'Delta South', 90, 'Bomadi / Patani'),
(263, 'Burutu I', 190, 'BURUTU', 10, 'Delta', 30, 'Delta South', 91, 'Burutu'),
(264, 'Burutu II', 190, 'BURUTU', 10, 'Delta', 30, 'Delta South', 91, 'Burutu'),
(265, 'Burutu III', 190, 'BURUTU', 10, 'Delta', 30, 'Delta South', 91, 'Burutu'),
(266, 'Isoko North', 195, 'ISOKO NORTH', 10, 'Delta', 30, 'Delta South', 92, 'Isoko North / Isoko South'),
(267, 'Isoko South', 196, 'ISOKO SOUTH', 10, 'Delta', 30, 'Delta South', 92, 'Isoko North / Isoko South'),
(268, 'Warri North', 209, 'WARRI  NORTH', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
(269, 'Warri South I', 210, 'WARRI SOUTH', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
(270, 'Warri South II', 210, 'WARRI SOUTH', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
(271, 'Warri South West', 211, 'WARRI SOUTH  WEST', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),

-- ============================================================
-- EBONYI STATE (state_id: 311) - 24 Seats
-- ============================================================
-- Ebonyi North SD (SD ID: 31)
(272, 'Abakaliki I', 212, 'ABAKALIKI', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(273, 'Abakaliki II', 212, 'ABAKALIKI', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(274, 'Abakaliki III', 212, 'ABAKALIKI', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(275, 'Izzi I', 221, 'IZZI', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(276, 'Izzi II', 221, 'IZZI', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(277, 'Ebonyi', 215, 'EBONYI', 11, 'Ebonyi', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
(278, 'Ohaukwu I', 223, 'OHAUKWU', 11, 'Ebonyi', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
(279, 'Ohaukwu II', 223, 'OHAUKWU', 11, 'Ebonyi', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
-- Ebonyi Central SD (SD ID: 32)
(280, 'Ezza North I', 216, 'EZZA NORTH', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(281, 'Ezza North II', 216, 'EZZA NORTH', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(282, 'Ishielu I', 219, 'ISHIELU', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(283, 'Ishielu II', 219, 'ISHIELU', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(284, 'Ezza South', 217, 'EZZA SOUTH', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
(285, 'Ikwo I', 218, 'IKWO', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
(286, 'Ikwo II', 218, 'IKWO', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
(287, 'Ikwo III', 218, 'IKWO', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
-- Ebonyi South SD (SD ID: 33)
(288, 'Afikpo North I', 213, 'AFIKPO NORTH', 11, 'Ebonyi', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
(289, 'Afikpo North II', 213, 'AFIKPO NORTH', 11, 'Ebonyi', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
(290, 'Afikpo South (Edda)', 214, 'AFIKPO  SOUTH', 11, 'Ebonyi', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
(291, 'Ivo', 220, 'IVO', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(292, 'Ohaozara I', 222, 'OHAOZARA', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(293, 'Ohaozara II', 222, 'OHAOZARA', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(294, 'Onicha I', 224, 'ONICHA', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(295, 'Onicha II', 224, 'ONICHA', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),

-- ============================================================
-- EDO STATE (state_id: 318) - 24 Seats
-- ============================================================
-- Edo South SD (SD ID: 34)
(296, 'Egor', 226, 'EGOR', 12, 'Edo', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
(297, 'Ikpoba-Okha I', 235, 'IKPOBA/OKHA', 12, 'Edo', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
(298, 'Ikpoba-Okha II', 235, 'IKPOBA/OKHA', 12, 'Edo', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
(299, 'Oredo I', 236, 'OREDO', 12, 'Edo', 34, 'Edo South', 101, 'Oredo'),
(300, 'Oredo II', 236, 'OREDO', 12, 'Edo', 34, 'Edo South', 101, 'Oredo'),
(301, 'Orhionmwon', 237, 'ORHIONMWON', 12, 'Edo', 34, 'Edo South', 102, 'Orhionmwon / Uhunmwonde'),
(302, 'Uhunmwonde', 225, 'AKOKO EDO', 12, 'Edo', 34, 'Edo South', 102, 'Orhionmwon / Uhunmwonde'),
(303, 'Ovia North-East', 238, 'OVIA NORTH EAST', 12, 'Edo', 34, 'Edo South', 103, 'Ovia North-East / Ovia South-West'),
(304, 'Ovia South-West', 239, 'OVIA SOUTH WEST', 12, 'Edo', 34, 'Edo South', 103, 'Ovia North-East / Ovia South-West'),
-- Edo Central SD (SD ID: 35)
(305, 'Esan Central', 227, 'ESAN CENTRAL', 12, 'Edo', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
(306, 'Esan West', 230, 'ESAN WEST', 12, 'Edo', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
(307, 'Igueben', 234, 'IGUEBEN', 12, 'Edo', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
(308, 'Esan North-East', 228, 'ESAN NORTH EAST', 12, 'Edo', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
(309, 'Esan South-East I', 229, 'ESAN SOUTH EAST', 12, 'Edo', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
(310, 'Esan South-East II', 229, 'ESAN SOUTH EAST', 12, 'Edo', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
-- Edo North SD (SD ID: 36)
(311, 'Etsako Central', 231, 'ETSAKO CENTRAL', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(312, 'Etsako East', 232, 'ETSAKO EAST', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(313, 'Etsako West I', 233, 'ETSAKO  WEST', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(314, 'Etsako West II', 233, 'ETSAKO  WEST', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(315, 'Owan East', 240, 'OWAN EAST', 12, 'Edo', 36, 'Edo North', 107, 'Owan East / Owan West'),
(316, 'Owan West', 241, 'OWAN WEST', 12, 'Edo', 36, 'Edo North', 107, 'Owan East / Owan West'),
(317, 'Akoko-Edo I', 225, 'AKOKO EDO', 12, 'Edo', 36, 'Edo North', 108, 'Akoko-Edo'),
(318, 'Akoko-Edo II', 225, 'AKOKO EDO', 12, 'Edo', 36, 'Edo North', 108, 'Akoko-Edo'),
(319, 'Akoko-Edo III', 225, 'AKOKO EDO', 12, 'Edo', 36, 'Edo North', 108, 'Akoko-Edo'),

-- ============================================================
-- EKITI STATE (state_id: 309) - 26 Seats
-- ============================================================
-- Ekiti Central SD (SD ID: 37)
(320, 'Ado Ekiti I', 243, 'ADO EKITI', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(321, 'Ado Ekiti II', 243, 'ADO EKITI', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(322, 'Ado Ekiti III', 243, 'ADO EKITI', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(323, 'Irepodun/Ifelodun I', 255, 'IREPODUN / IFELODUN', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(324, 'Irepodun/Ifelodun II', 255, 'IREPODUN / IFELODUN', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(325, 'Ijero', 251, 'IJERO', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
(326, 'Ekiti West', 246, 'EKITI WEST', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
(327, 'Efon I', 244, 'EFON', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
(328, 'Efon II', 244, 'EFON', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
-- Ekiti North SD (SD ID: 38)
(329, 'Ikole I', 253, 'IKOLE', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(330, 'Ikole II', 253, 'IKOLE', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(331, 'Ikole III', 253, 'IKOLE', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(332, 'Oye', 258, 'OYE', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(333, 'Ido-Osi I', 250, 'IDO / OSI', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(334, 'Ido-Osi II', 250, 'IDO / OSI', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(335, 'Moba I', 257, 'MOBA', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(336, 'Moba II', 257, 'MOBA', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(337, 'Ilejemeje', 254, 'ILEJEMEJE', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
-- Ekiti South SD (SD ID: 39)
(338, 'Ekiti South West I', 247, 'EKITI SOUTH WEST', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(339, 'Ekiti South West II', 247, 'EKITI SOUTH WEST', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(340, 'Ikere I', 252, 'IKERE', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(341, 'Ikere II', 252, 'IKERE', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(342, 'Ise-Orun', 256, 'ISE / ORUN', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(343, 'Ekiti East', 245, 'EKITI EAST', 13, 'Ekiti', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),
(344, 'Emure', 248, 'EMURE', 13, 'Ekiti', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),
(345, 'Gbonyin', 249, 'GBONYIN', 13, 'Ekiti', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),

-- ============================================================
-- ENUGU STATE (state_id: 289) - 24 Seats
-- ============================================================
-- Enugu North SD (SD ID: 40)
(346, 'Igbo-Eze North', 266, 'IGBO EZE NORTH', 14, 'Enugu', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
(347, 'Udenu', 273, 'UDENU', 14, 'Enugu', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
(348, 'Igbo-Etiti I', 265, 'IGBO ETITI', 14, 'Enugu', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
(349, 'Igbo-Etiti II', 265, 'IGBO ETITI', 14, 'Enugu', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
(350, 'Uzo-Uwani', 275, 'UZO-UWANI', 14, 'Enugu', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
(351, 'Nsukka I', 271, 'NSUKKA', 14, 'Enugu', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
(352, 'Nsukka II', 271, 'NSUKKA', 14, 'Enugu', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
(353, 'Igbo-Eze South', 267, 'IGBO EZE SOUTH', 14, 'Enugu', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
(354, 'Udenu II', 273, 'UDENU', 14, 'Enugu', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
-- Enugu East SD (SD ID: 41)
(355, 'Enugu East', 261, 'ENUGU EAST', 14, 'Enugu', 41, 'Enugu East', 118, 'Enugu East / Isi Uzo'),
(356, 'Isi Uzo', 268, 'ISI UZO', 14, 'Enugu', 41, 'Enugu East', 118, 'Enugu East / Isi Uzo'),
(357, 'Enugu North I', 262, 'ENUGU NORTH', 14, 'Enugu', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
(358, 'Enugu North II', 262, 'ENUGU NORTH', 14, 'Enugu', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
(359, 'Enugu South', 263, 'ENUGU SOUTH', 14, 'Enugu', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
(360, 'Nkanu East', 269, 'NKANU EAST', 14, 'Enugu', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
(361, 'Nkanu West I', 270, 'NKANU WEST', 14, 'Enugu', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
(362, 'Nkanu West II', 270, 'NKANU WEST', 14, 'Enugu', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
-- Enugu West SD (SD ID: 42)
(363, 'Aninri', 259, 'ANINRI', 14, 'Enugu', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
(364, 'Awgu', 260, 'AWGU', 14, 'Enugu', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
(365, 'Oji River', 272, 'OJI-RIVER', 14, 'Enugu', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
(366, 'Ezeagu I', 264, 'EZEAGU', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
(367, 'Ezeagu II', 264, 'EZEAGU', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
(368, 'Udi I', 274, 'UDI', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
(369, 'Udi II', 274, 'UDI', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),

-- ============================================================
-- GOMBE STATE (state_id: 310) - 24 Seats
-- ============================================================
-- Gombe Central SD (SD ID: 44)
(370, 'Akko I', 282, 'AKKO', 16, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(371, 'Akko II', 282, 'AKKO', 16, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(372, 'Akko III', 282, 'AKKO', 16, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(373, 'Akko IV', 282, 'AKKO', 16, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(374, 'Yamaltu I', 282, 'AKKO', 16, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
(375, 'Yamaltu II', 282, 'AKKO', 16, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
(376, 'Deba I', 282, 'AKKO', 16, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
(377, 'Deba II', 282, 'AKKO', 16, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
-- Gombe North SD (SD ID: 45)
(378, 'Dukku', 285, 'DUKKU', 16, 'Gombe', 45, 'Gombe North', 127, 'Dukku / Nafada'),
(379, 'Nafada', 290, 'NAFADA', 16, 'Gombe', 45, 'Gombe North', 127, 'Dukku / Nafada'),
(380, 'Gombe I', 287, 'GOMBE', 16, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(381, 'Gombe II', 287, 'GOMBE', 16, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(382, 'Gombe III', 287, 'GOMBE', 16, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(383, 'Kwami', 289, 'KWAMI', 16, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(384, 'Funakaye I', 286, 'FUNAKAYE', 16, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(385, 'Funakaye II', 286, 'FUNAKAYE', 16, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
-- Gombe South SD (SD ID: 46)
(386, 'Balanga I', 283, 'BALANGA', 16, 'Gombe', 46, 'Gombe South', 129, 'Balanga / Billiri'),
(387, 'Balanga II', 283, 'BALANGA', 16, 'Gombe', 46, 'Gombe South', 129, 'Balanga / Billiri'),
(388, 'Billiri', 284, 'BILLIRI', 16, 'Gombe', 46, 'Gombe South', 129, 'Balanga / Billiri'),
(389, 'Kaltungo I', 288, 'KALTUNGO', 16, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(390, 'Kaltungo II', 288, 'KALTUNGO', 16, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(391, 'Shongom I', 291, 'SHONGOM', 16, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(392, 'Shongom II', 291, 'SHONGOM', 16, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(393, 'Shongom III', 291, 'SHONGOM', 16, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),

-- ============================================================
-- IMO STATE (state_id: 308) - 27 Seats
-- ============================================================
-- Imo North SD (SD ID: 47)
(394, 'Ehime Mbano', 295, 'EHIME MBANO', 17, 'Imo', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
(395, 'Ihitte-Uboma', 299, 'IHITTE/UBOMA (ISINWEKE)', 17, 'Imo', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
(396, 'Obowo', 308, 'OBOWO (OTOKO)', 17, 'Imo', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
(397, 'Okigwe I', 311, 'OKIGWE  (OKIGWE)', 17, 'Imo', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
(398, 'Okigwe II', 311, 'OKIGWE  (OKIGWE)', 17, 'Imo', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
(399, 'Onuimo', 312, 'ONUIMO (OKWE)', 17, 'Imo', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
-- Imo East SD (SD ID: 48)
(400, 'Aboh Mbaise', 293, 'ABOH MBAISE', 17, 'Imo', 48, 'Imo East', 133, 'Aboh Mbaise / Ngor Okpala'),
(401, 'Ngor Okpala', 304, 'NGOR OKPALA (UMUNEKE)', 17, 'Imo', 48, 'Imo East', 133, 'Aboh Mbaise / Ngor Okpala'),
(402, 'Ahiazu Mbaise', 294, 'AHIAZU MBAISE', 17, 'Imo', 48, 'Imo East', 134, 'Ahiazu / Ezinihitte Mbaise'),
(403, 'Ezinihitte Mbaise', 296, 'EZINIHITTE MBAISE', 17, 'Imo', 48, 'Imo East', 134, 'Ahiazu / Ezinihitte Mbaise'),
(404, 'Ikeduru I', 300, 'IKEDURU (IHO)', 17, 'Imo', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
(405, 'Ikeduru II', 300, 'IKEDURU (IHO)', 17, 'Imo', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
(406, 'Mbaitoli', 303, 'MBAITOLI (NWAORIEUBI)', 17, 'Imo', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
(407, 'Owerri Municipal', 317, 'OWERRI MUNICIPAL', 17, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
(408, 'Owerri North', 318, 'OWERRI NORTH (ORIE URATTA)', 17, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
(409, 'Owerri West I', 319, 'OWERRI WEST (UMUGUMA)', 17, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
(410, 'Owerri West II', 319, 'OWERRI WEST (UMUGUMA)', 17, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
-- Imo West SD (SD ID: 49)
(411, 'Ideato North', 297, 'IDEATO NORTH', 17, 'Imo', 49, 'Imo West', 137, 'Ideato North / Ideato South'),
(412, 'Ideato South', 298, 'IDEATO SOUTH', 17, 'Imo', 49, 'Imo West', 137, 'Ideato North / Ideato South'),
(413, 'Isu', 302, 'ISU (UMUNDUGBA)', 17, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(414, 'Njaba', 305, 'NJABA (NNENASA)', 17, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(415, 'Nkwerre', 306, 'NKWERRE', 17, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(416, 'Nwangele', 307, 'NWANGELE (ONU-NWANGELE AMAIGBO)', 17, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(417, 'Oguta', 309, 'OGUTA (OGUTA)', 17, 'Imo', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
(418, 'Ohaji-Egbema', 310, 'OHAJI/EGBEMA (MMAHU-EGBEMA)', 17, 'Imo', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
(419, 'Oru West', 316, 'ORU WEST (MGBIDI)', 17, 'Imo', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
(420, 'Orlu', 313, 'ORLU', 17, 'Imo', 49, 'Imo West', 140, 'Orlu / Orsu / Oru East'),

-- ============================================================
-- JIGAWA STATE (state_id: 288) - 30 Seats
-- ============================================================
-- Jigawa North-East SD (SD ID: 50)
(421, 'Hadejia', 332, 'HADEJIA', 18, 'Jigawa', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
(422, 'Kafin Hausa', 334, 'KAFIN HAUSA', 18, 'Jigawa', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
(423, 'Auyo', 320, 'AUYO', 18, 'Jigawa', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
(424, 'Birniwa', 323, 'BIRNIWA', 18, 'Jigawa', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
(425, 'Guri', 329, 'GURI', 18, 'Jigawa', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
(426, 'Kiri Kasamma', 337, 'KIRIKA SAMMA', 18, 'Jigawa', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
(427, 'Kaugama', 335, 'KAUGAMA', 18, 'Jigawa', 50, 'Jigawa North-East', 143, 'Kaugama / Malam Madori'),
(428, 'Malam Madori', 340, 'MALAM MADORI', 18, 'Jigawa', 50, 'Jigawa North-East', 143, 'Kaugama / Malam Madori'),
-- Jigawa North-West SD (SD ID: 51)
(429, 'Babura', 321, 'BABURA', 18, 'Jigawa', 51, 'Jigawa North-West', 144, 'Babura / Garki'),
(430, 'Garki', 326, 'GARKI', 18, 'Jigawa', 51, 'Jigawa North-West', 144, 'Babura / Garki'),
(431, 'Gumel', 328, 'GUMEL', 18, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(432, 'Maigatari', 339, 'MAIGATARI', 18, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(433, 'Sule Tankarkar', 344, 'SULE-TANKARKAR', 18, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(434, 'Gagarawa', 327, 'GAGARAWA', 18, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(435, 'Birnin Kudu I', 322, 'BIRNIN KUDU', 18, 'Jigawa', 51, 'Jigawa North-West', 147, 'Birnin Kudu / Buji'),
(436, 'Birnin Kudu II', 322, 'BIRNIN KUDU', 18, 'Jigawa', 51, 'Jigawa North-West', 147, 'Birnin Kudu / Buji'),
(437, 'Buji', 324, 'BUJI', 18, 'Jigawa', 51, 'Jigawa North-West', 147, 'Birnin Kudu / Buji'),
(438, 'Dutse I', 325, 'DUTSE', 18, 'Jigawa', 51, 'Jigawa North-West', 148, 'Dutse / Kiyawa'),
(439, 'Dutse II', 325, 'DUTSE', 18, 'Jigawa', 51, 'Jigawa North-West', 148, 'Dutse / Kiyawa'),
(440, 'Kiyawa', 338, 'KIYAWA', 18, 'Jigawa', 51, 'Jigawa North-West', 148, 'Dutse / Kiyawa'),
(441, 'Gwaram I', 330, 'GWARAM', 18, 'Jigawa', 51, 'Jigawa North-West', 149, 'Gwaram'),
(442, 'Gwaram II', 330, 'GWARAM', 18, 'Jigawa', 51, 'Jigawa North-West', 149, 'Gwaram'),
(443, 'Jahun', 333, 'JAHUN', 18, 'Jigawa', 51, 'Jigawa North-West', 150, 'Jahun / Miga'),
(444, 'Miga', 341, 'MIGA', 18, 'Jigawa', 51, 'Jigawa North-West', 150, 'Jahun / Miga'),
(445, 'Ringim', 342, 'RINGIM', 18, 'Jigawa', 51, 'Jigawa North-West', 151, 'Ringim / Taura'),
(446, 'Taura', 345, 'TAURA', 18, 'Jigawa', 51, 'Jigawa North-West', 151, 'Ringim / Taura'),
-- Jigawa South-West SD (SD ID: 52)
(447, 'Birnin Kudu III', 322, 'BIRNIN KUDU', 18, 'Jigawa', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
(448, 'Dutse III', 325, 'DUTSE', 18, 'Jigawa', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
(449, 'Gwaram III', 330, 'GWARAM', 18, 'Jigawa', 52, 'Jigawa South-West', 149, 'Gwaram'),
(450, 'Ringim II', 342, 'RINGIM', 18, 'Jigawa', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),

-- ============================================================
-- KADUNA STATE (state_id: 294) - 34 Seats
-- ============================================================
-- Kaduna North SD (SD ID: 53)
(451, 'Ikara', 351, 'IKARA', 19, 'Kaduna', 53, 'Kaduna North', 152, 'Ikara / Kubau'),
(452, 'Kubau', 361, 'KUBAU', 19, 'Kaduna', 53, 'Kaduna North', 152, 'Ikara / Kubau'),
(453, 'Makarfi', 364, 'MAKARFI', 19, 'Kaduna', 53, 'Kaduna North', 153, 'Makarfi / Kudan'),
(454, 'Kudan', 362, 'KUDAN', 19, 'Kaduna', 53, 'Kaduna North', 153, 'Makarfi / Kudan'),
(455, 'Sabon Gari I', 365, 'SABON GARI', 19, 'Kaduna', 53, 'Kaduna North', 154, 'Sabon Gari'),
(456, 'Sabon Gari II', 365, 'SABON GARI', 19, 'Kaduna', 53, 'Kaduna North', 154, 'Sabon Gari'),
(457, 'Zaria I', 369, 'ZARIA', 19, 'Kaduna', 53, 'Kaduna North', 155, 'Zaria'),
(458, 'Zaria II', 369, 'ZARIA', 19, 'Kaduna', 53, 'Kaduna North', 155, 'Zaria'),
(459, 'Lere I', 363, 'LERE', 19, 'Kaduna', 53, 'Kaduna North', 156, 'Lere'),
(460, 'Lere II', 363, 'LERE', 19, 'Kaduna', 53, 'Kaduna North', 156, 'Lere'),
(461, 'Soba I', 367, 'SOBA', 19, 'Kaduna', 53, 'Kaduna North', 157, 'Soba'),
(462, 'Soba II', 367, 'SOBA', 19, 'Kaduna', 53, 'Kaduna North', 157, 'Soba'),
-- Kaduna Central SD (SD ID: 54)
(463, 'Birnin Gwari', 347, 'BIRNIN GWARI', 19, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(464, 'Giwa I', 349, 'GIWA', 19, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(465, 'Giwa II', 349, 'GIWA', 19, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(466, 'Chikun I', 348, 'CHIKUN', 19, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(467, 'Chikun II', 348, 'CHIKUN', 19, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(468, 'Kajuru', 358, 'KAJURU', 19, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(469, 'Igabi I', 350, 'IGABI', 19, 'Kaduna', 54, 'Kaduna Central', 160, 'Igabi'),
(470, 'Igabi II', 350, 'IGABI', 19, 'Kaduna', 54, 'Kaduna Central', 160, 'Igabi'),
(471, 'Kaduna North I', 355, 'KADUNA NORTH', 19, 'Kaduna', 54, 'Kaduna Central', 161, 'Kaduna North'),
(472, 'Kaduna North II', 355, 'KADUNA NORTH', 19, 'Kaduna', 54, 'Kaduna Central', 161, 'Kaduna North'),
(473, 'Kaduna South I', 356, 'KADUNA SOUTH', 19, 'Kaduna', 54, 'Kaduna Central', 162, 'Kaduna South'),
(474, 'Kaduna South II', 356, 'KADUNA SOUTH', 19, 'Kaduna', 54, 'Kaduna Central', 162, 'Kaduna South'),
-- Kaduna South SD (SD ID: 55)
(475, 'Jaba', 352, 'JABA', 19, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(476, 'Zangon Kataf I', 368, 'ZANGON KATAF', 19, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(477, 'Zangon Kataf II', 368, 'ZANGON KATAF', 19, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(478, 'Jemaa I', 347, 'BIRNIN GWARI', 19, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(479, 'Jemaa II', 347, 'BIRNIN GWARI', 19, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(480, 'Sanga', 366, 'SANGA', 19, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(481, 'Kachia I', 354, 'KACHIA', 19, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(482, 'Kachia II', 354, 'KACHIA', 19, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(483, 'Kagarko', 357, 'KAGARKO', 19, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(484, 'Kaura', 359, 'KAURA', 19, 'Kaduna', 55, 'Kaduna South', 166, 'Kaura'),
(485, 'Kauru I', 360, 'KAURU', 19, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),
(486, 'Kauru II', 360, 'KAURU', 19, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),

-- ============================================================
-- KANO STATE (state_id: 300) - 40 Seats
-- ============================================================
-- Kano Central SD (SD ID: 56)
(487, 'Dala I', 376, 'DALA', 20, 'Kano', 56, 'Kano Central', 168, 'Dala'),
(488, 'Dala II', 376, 'DALA', 20, 'Kano', 56, 'Kano Central', 168, 'Dala'),
(489, 'Dawakin Kudu I', 378, 'DAWAKI KUDU', 20, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(490, 'Dawakin Kudu II', 378, 'DAWAKI KUDU', 20, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(491, 'Warawa', 412, 'WARAWA', 20, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(492, 'Fagge I', 381, 'FAGGE', 20, 'Kano', 56, 'Kano Central', 170, 'Fagge'),
(493, 'Fagge II', 381, 'FAGGE', 20, 'Kano', 56, 'Kano Central', 170, 'Fagge'),
(494, 'Gezawa', 386, 'GEZAWA', 20, 'Kano', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
(495, 'Gabasawa', 382, 'GABASAWA', 20, 'Kano', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
(496, 'Gwale I', 387, 'GWALE', 20, 'Kano', 56, 'Kano Central', 172, 'Gwale'),
(497, 'Gwale II', 387, 'GWALE', 20, 'Kano', 56, 'Kano Central', 172, 'Gwale'),
(498, 'Kano Municipal I', 390, 'KANO MUNICIPAL', 20, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(499, 'Kano Municipal II', 390, 'KANO MUNICIPAL', 20, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(500, 'Kumbotso I', 394, 'KUMBOTSO', 20, 'Kano', 56, 'Kano Central', 174, 'Kumbotso'),
(501, 'Kumbotso II', 394, 'KUMBOTSO', 20, 'Kano', 56, 'Kano Central', 174, 'Kumbotso'),
(502, 'Nasarawa I', 400, 'NASARAWA', 20, 'Kano', 56, 'Kano Central', 175, 'Nasarawa'),
(503, 'Nasarawa II', 400, 'NASARAWA', 20, 'Kano', 56, 'Kano Central', 175, 'Nasarawa'),
(504, 'Tarauni I', 407, 'TARAUNI', 20, 'Kano', 56, 'Kano Central', 176, 'Tarauni'),
(505, 'Tarauni II', 407, 'TARAUNI', 20, 'Kano', 56, 'Kano Central', 176, 'Tarauni'),
(506, 'Ungogo I', 411, 'UNGOGO', 20, 'Kano', 56, 'Kano Central', 177, 'Ungogo'),
-- Kano North SD (SD ID: 57)
(507, 'Bagwai I', 372, 'BAGWAI', 20, 'Kano', 57, 'Kano North', 178, 'Bagwai / Shanono'),
(508, 'Shanono', 404, 'SHANONO', 20, 'Kano', 57, 'Kano North', 178, 'Bagwai / Shanono'),
(509, 'Bichi I', 374, 'BICHI', 20, 'Kano', 57, 'Kano North', 179, 'Bichi'),
(510, 'Bichi II', 374, 'BICHI', 20, 'Kano', 57, 'Kano North', 179, 'Bichi'),
(511, 'Dambatta I', 370, 'AJINGI', 20, 'Kano', 57, 'Kano North', 180, 'Dambatta / Makoda'),
(512, 'Makoda', 398, 'MAKODA', 20, 'Kano', 57, 'Kano North', 180, 'Dambatta / Makoda'),
(513, 'Dawakin Tofa I', 408, 'TOFA', 20, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(514, 'Tofa I', 408, 'TOFA', 20, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(515, 'Rimin Gado', 402, 'RIMIN GADO', 20, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(516, 'Gwarzo I', 388, 'GWARZO', 20, 'Kano', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
(517, 'Kabo', 389, 'KABO', 20, 'Kano', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
(518, 'Karaye', 391, 'KARAYE', 20, 'Kano', 57, 'Kano North', 183, 'Karaye / Rogo'),
(519, 'Rogo', 403, 'ROGO', 20, 'Kano', 57, 'Kano North', 183, 'Karaye / Rogo'),
(520, 'Kunchi', 395, 'KUNCHI', 20, 'Kano', 57, 'Kano North', 184, 'Kunchi / Tsanyawa'),
(521, 'Tsanyawa', 409, 'TSANYAWA', 20, 'Kano', 57, 'Kano North', 184, 'Kunchi / Tsanyawa'),
(522, 'Minjibir', 399, 'MINJIBIR', 20, 'Kano', 57, 'Kano North', 185, 'Minjibir / Ungogo'),
-- Kano South SD (SD ID: 58)
(523, 'Albasu I', 371, 'ALBASU', 20, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(524, 'Ajingi I', 370, 'AJINGI', 20, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(525, 'Gaya I', 385, 'GAYA', 20, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(526, 'Bebeji I', 373, 'BEBEJI', 20, 'Kano', 58, 'Kano South', 187, 'Bebeji / Kiru'),
(527, 'Kiru I', 393, 'KIRU', 20, 'Kano', 58, 'Kano South', 187, 'Bebeji / Kiru'),
(528, 'Doguwa I', 380, 'DOGUWA', 20, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(529, 'Tudun Wada I', 410, 'TUDUN WADA', 20, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(530, 'Tudun Wada II', 410, 'TUDUN WADA', 20, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(531, 'Kura I', 396, 'KURA', 20, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
(532, 'Madobi I', 397, 'MADOBI', 20, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
(533, 'Garun Mallam I', 370, 'AJINGI', 20, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
(534, 'Rano I', 401, 'RANO', 20, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(535, 'Bunkure I', 375, 'BUNKURE', 20, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(536, 'Kibiya I', 392, 'KIBIYA', 20, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(537, 'Takai I', 406, 'TAKAI', 20, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),
(538, 'Sumaila I', 405, 'SUMAILA', 20, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),
(539, 'Sumaila II', 405, 'SUMAILA', 20, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),
(540, 'Kura II', 396, 'KURA', 20, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),

-- ============================================================
-- KATSINA STATE (state_id: 313) - 34 Seats
-- ============================================================
-- Katsina Central SD (SD ID: 59)
(541, 'Batagarawa I', 415, 'BATAGARAWA', 21, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(542, 'Charanchi I', 419, 'CHARANCHI', 21, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(543, 'Rimi I', 443, 'RIMI', 21, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(544, 'Batsari I', 416, 'BATSARI', 21, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(545, 'Safana I', 445, 'SAFANA', 21, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(546, 'Danmusa I', 422, 'DAN MUSA', 21, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(547, 'Dutsin-Ma I', 424, 'DUTSI', 21, 'Katsina', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
(548, 'Kurfi I', 435, 'KURFI', 21, 'Katsina', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
(549, 'Jibia I', 429, 'JIBIA', 21, 'Katsina', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
(550, 'Kaita I', 431, 'KAITA', 21, 'Katsina', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
(551, 'Katsina Central I', 434, 'KATSINA', 21, 'Katsina', 59, 'Katsina Central', 196, 'Katsina Central'),
(552, 'Katsina Central II', 434, 'KATSINA', 21, 'Katsina', 59, 'Katsina Central', 196, 'Katsina Central'),
-- Katsina North SD (SD ID: 60)
(553, 'Bindawa I', 418, 'BINDAWA', 21, 'Katsina', 60, 'Katsina North', 197, 'Bindawa / Mani'),
(554, 'Mani I', 439, 'MANI', 21, 'Katsina', 60, 'Katsina North', 197, 'Bindawa / Mani'),
(555, 'Daura I', 423, 'DAURA', 21, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(556, 'Sandamu I', 446, 'SANDAMU', 21, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(557, 'Maiadua I', 414, 'BAKORI', 21, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(558, 'Ingawa I', 428, 'INGAWA', 21, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(559, 'Kankia I', 433, 'KANKIA', 21, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(560, 'Kusada I', 436, 'KUSADA', 21, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(561, 'Mashi I', 440, 'MASHI', 21, 'Katsina', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
(562, 'Dutsi I', 424, 'DUTSI', 21, 'Katsina', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
(563, 'Zango I', 447, 'ZANGO', 21, 'Katsina', 60, 'Katsina North', 201, 'Zango / Baure'),
(564, 'Baure I', 417, 'BAURE', 21, 'Katsina', 60, 'Katsina North', 201, 'Zango / Baure'),
-- Katsina South SD (SD ID: 61)
(565, 'Bakori I', 414, 'BAKORI', 21, 'Katsina', 61, 'Katsina South', 202, 'Bakori / Danja'),
(566, 'Danja I', 421, 'DANJA', 21, 'Katsina', 61, 'Katsina South', 202, 'Bakori / Danja'),
(567, 'Faskari I', 426, 'FASKARI', 21, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(568, 'Kankara I', 432, 'KANKARA', 21, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(569, 'Sabuwa I', 444, 'SABUWA', 21, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(570, 'Funtua I', 427, 'FUNTUA', 21, 'Katsina', 61, 'Katsina South', 204, 'Funtua / Dandume'),
(571, 'Dandume I', 420, 'DANDUME', 21, 'Katsina', 61, 'Katsina South', 204, 'Funtua / Dandume'),
(572, 'Malumfashi I', 414, 'BAKORI', 21, 'Katsina', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
(573, 'Kafur I', 430, 'KAFUR', 21, 'Katsina', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
(574, 'Matazu I', 441, 'MATAZU', 21, 'Katsina', 61, 'Katsina South', 206, 'Matazu / Musawa'),
(575, 'Musawa I', 442, 'MUSAWA', 21, 'Katsina', 61, 'Katsina South', 206, 'Matazu / Musawa'),

-- ============================================================
-- KEBBI STATE (state_id: 290) - 24 Seats
-- ============================================================
-- Kebbi Central SD (SD ID: 62)
(576, 'Aleiro', 448, 'ALIERO', 22, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(577, 'Gwandu', 457, 'GWANDU', 22, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(578, 'Jega I', 458, 'JEGA', 22, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(579, 'Jega II', 458, 'JEGA', 22, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(580, 'Birnin Kebbi I', 453, 'BIRNIN KEBBI', 22, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(581, 'Birnin Kebbi II', 453, 'BIRNIN KEBBI', 22, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(582, 'Kalgo', 459, 'KALGO', 22, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(583, 'Bunza', 454, 'BUNZA', 22, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(584, 'Maiyama', 461, 'MAIYAMA', 22, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
(585, 'Koko/Besse', 460, 'KOKO/BESSE', 22, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
-- Kebbi North SD (SD ID: 63)
(586, 'Arewa I', 449, 'AREWA', 22, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(587, 'Arewa II', 449, 'AREWA', 22, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(588, 'Dandi', 455, 'DANDI', 22, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(589, 'Argungu I', 450, 'ARGUNGU', 22, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(590, 'Argungu II', 450, 'ARGUNGU', 22, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(591, 'Augie', 451, 'AUGIE', 22, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(592, 'Bagudo I', 452, 'BAGUDO', 22, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
(593, 'Bagudo II', 452, 'BAGUDO', 22, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
(594, 'Suru', 465, 'SURU', 22, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
-- Kebbi South SD (SD ID: 64)
(595, 'Fakai', 456, 'FAKAI', 22, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(596, 'Sakaba', 463, 'SAKABA', 22, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(597, 'Wasagu/Danko I', 466, 'WASAGU/DANKO', 22, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(598, 'Wasagu/Danko II', 466, 'WASAGU/DANKO', 22, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(599, 'Zuru', 468, 'ZURU', 22, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(600, 'Yauri', 467, 'YAURI', 22, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
(601, 'Shanga', 464, 'SHANGA', 22, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
(602, 'Ngaski', 462, 'NGASKI', 22, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),

-- ============================================================
-- KOGI STATE (state_id: 298) - 25 Seats
-- ============================================================
-- Kogi Central SD (SD ID: 65)
(603, 'Adavi', 469, 'ADAVI', 23, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(604, 'Okehi', 484, 'OKEHI', 23, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(605, 'Ajaokuta', 470, 'AJAOKUTA', 23, 'Kogi', 65, 'Kogi Central', 216, 'Ajaokuta'),
(606, 'Okene I', 485, 'OKENE', 23, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
(607, 'Okene II', 485, 'OKENE', 23, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
(608, 'Ogori-Magongo', 469, 'ADAVI', 23, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
-- Kogi East SD (SD ID: 66)
(609, 'Ankpa I', 471, 'ANKPA', 23, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(610, 'Ankpa II', 471, 'ANKPA', 23, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(611, 'Omala', 487, 'OMALA', 23, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(612, 'Olamaboro', 486, 'OLAMABORO', 23, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(613, 'Dekina I', 473, 'DEKINA', 23, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(614, 'Dekina II', 473, 'DEKINA', 23, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(615, 'Bassa', 472, 'BASSA', 23, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(616, 'Idah', 475, 'IDAH', 23, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(617, 'Ibaji', 474, 'IBAJI', 23, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(618, 'Igalamela-Odolu', 476, 'IGALAMELA/ODOLU', 23, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(619, 'Ofu', 482, 'OFU', 23, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
-- Kogi West SD (SD ID: 67)
(620, 'Kabba/Bunu', 478, 'KABBA/BUNU', 23, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(621, 'Ijumu', 477, 'IJUMU', 23, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(622, 'Lokoja I', 480, 'LOKOJA', 23, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(623, 'Lokoja II', 480, 'LOKOJA', 23, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(624, 'Kogi (Koton Karfe)', 479, 'KOGI . K. K.', 23, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(625, 'Yagba East', 488, 'YAGBA EAST', 23, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
(626, 'Yagba West', 489, 'YAGBA WEST', 23, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
(627, 'Mopa-Muro', 469, 'ADAVI', 23, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),

-- ============================================================
-- KWARA STATE (state_id: 295) - 24 Seats
-- ============================================================
-- Kwara Central SD (SD ID: 68)
(628, 'Ilorin East', 495, 'ILORIN EAST', 24, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(629, 'Ilorin South', 496, 'ILORIN-SOUTH', 24, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(630, 'Ilorin West I', 497, 'ILORIN-WEST', 24, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(631, 'Ilorin West II', 497, 'ILORIN-WEST', 24, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(632, 'Asa', 490, 'ASA', 24, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
-- Kwara North SD (SD ID: 69)
(633, 'Baruten I', 491, 'BARUTEN', 24, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(634, 'Baruten II', 491, 'BARUTEN', 24, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(635, 'Kaiama I', 500, 'KAIAMA', 24, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(636, 'Kaiama II', 500, 'KAIAMA', 24, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(637, 'Edu I', 492, 'EDU', 24, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(638, 'Edu II', 492, 'EDU', 24, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(639, 'Moro', 501, 'MORO', 24, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(640, 'Pategi I', 490, 'ASA', 24, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(641, 'Pategi II', 490, 'ASA', 24, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
-- Kwara South SD (SD ID: 70)
(642, 'Ekiti (Kwara)', 493, 'EKITI', 24, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(643, 'Isin', 499, 'ISIN', 24, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(644, 'Irepodun', 498, 'IREPODUN', 24, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(645, 'Oke-Ero', 503, 'OKE - ERO', 24, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(646, 'Ifelodun', 494, 'IFELODUN', 24, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(647, 'Offa I', 502, 'OFFA', 24, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(648, 'Offa II', 502, 'OFFA', 24, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(649, 'Oyun', 504, 'OYUN', 24, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),

-- ============================================================
-- LAGOS STATE (state_id: 306) - 40 Seats
-- ============================================================
-- Lagos Central SD (SD ID: 71)
(650, 'Apapa I', 510, 'APAPA', 25, 'Lagos', 71, 'Lagos Central', 230, 'Apapa'),
(651, 'Apapa II', 510, 'APAPA', 25, 'Lagos', 71, 'Lagos Central', 230, 'Apapa'),
(652, 'Eti-Osa I', 513, 'ETI-OSA', 25, 'Lagos', 71, 'Lagos Central', 231, 'Eti-Osa'),
(653, 'Eti-Osa II', 513, 'ETI-OSA', 25, 'Lagos', 71, 'Lagos Central', 231, 'Eti-Osa'),
(654, 'Lagos Island I', 519, 'LAGOS ISLAND', 25, 'Lagos', 71, 'Lagos Central', 232, 'Lagos Island I'),
(655, 'Lagos Island II', 519, 'LAGOS ISLAND', 25, 'Lagos', 71, 'Lagos Central', 232, 'Lagos Island I'),
(656, 'Lagos Island III', 519, 'LAGOS ISLAND', 25, 'Lagos', 71, 'Lagos Central', 233, 'Lagos Island II'),
(657, 'Lagos Island IV', 519, 'LAGOS ISLAND', 25, 'Lagos', 71, 'Lagos Central', 233, 'Lagos Island II'),
(658, 'Lagos Mainland I', 520, 'LAGOS MAINLAND', 25, 'Lagos', 71, 'Lagos Central', 234, 'Lagos Mainland'),
(659, 'Lagos Mainland II', 520, 'LAGOS MAINLAND', 25, 'Lagos', 71, 'Lagos Central', 234, 'Lagos Mainland'),
(660, 'Surulere I', 525, 'SURULERE', 25, 'Lagos', 71, 'Lagos Central', 235, 'Surulere I'),
(661, 'Surulere II', 525, 'SURULERE', 25, 'Lagos', 71, 'Lagos Central', 236, 'Surulere II'),
-- Lagos East SD (SD ID: 72)
(662, 'Epe I', 512, 'EPE', 25, 'Lagos', 72, 'Lagos East', 237, 'Epe'),
(663, 'Epe II', 512, 'EPE', 25, 'Lagos', 72, 'Lagos East', 237, 'Epe'),
(664, 'Ibeju-Lekki I', 514, 'IBEJU/LEKKI', 25, 'Lagos', 72, 'Lagos East', 238, 'Ibeju-Lekki'),
(665, 'Ibeju-Lekki II', 514, 'IBEJU/LEKKI', 25, 'Lagos', 72, 'Lagos East', 238, 'Ibeju-Lekki'),
(666, 'Ikorodu I', 517, 'IKORODU', 25, 'Lagos', 72, 'Lagos East', 239, 'Ikorodu'),
(667, 'Ikorodu II', 517, 'IKORODU', 25, 'Lagos', 72, 'Lagos East', 239, 'Ikorodu'),
(668, 'Kosofe I', 518, 'KOSOFE', 25, 'Lagos', 72, 'Lagos East', 240, 'Kosofe'),
(669, 'Kosofe II', 518, 'KOSOFE', 25, 'Lagos', 72, 'Lagos East', 240, 'Kosofe'),
(670, 'Shomolu I', 524, 'SOMOLU', 25, 'Lagos', 72, 'Lagos East', 241, 'Somolu'),
(671, 'Shomolu II', 524, 'SOMOLU', 25, 'Lagos', 72, 'Lagos East', 241, 'Somolu'),
-- Lagos West SD (SD ID: 73)
(672, 'Agege I', 506, 'AGEGE', 25, 'Lagos', 73, 'Lagos West', 242, 'Agege'),
(673, 'Agege II', 506, 'AGEGE', 25, 'Lagos', 73, 'Lagos West', 242, 'Agege'),
(674, 'Ajeromi-Ifelodun I', 507, 'AJEROMI/IFELODUN', 25, 'Lagos', 73, 'Lagos West', 243, 'Ajeromi-Ifelodun'),
(675, 'Ajeromi-Ifelodun II', 507, 'AJEROMI/IFELODUN', 25, 'Lagos', 73, 'Lagos West', 243, 'Ajeromi-Ifelodun'),
(676, 'Alimosho I', 508, 'ALIMOSHO', 25, 'Lagos', 73, 'Lagos West', 244, 'Alimosho'),
(677, 'Alimosho II', 508, 'ALIMOSHO', 25, 'Lagos', 73, 'Lagos West', 244, 'Alimosho'),
(678, 'Amuwo-Odofin I', 509, 'AMUWO-ODOFIN', 25, 'Lagos', 73, 'Lagos West', 245, 'Amuwo-Odofin'),
(679, 'Amuwo-Odofin II', 509, 'AMUWO-ODOFIN', 25, 'Lagos', 73, 'Lagos West', 245, 'Amuwo-Odofin'),
(680, 'Badagry I', 511, 'BADAGRY', 25, 'Lagos', 73, 'Lagos West', 246, 'Badagry'),
(681, 'Badagry II', 511, 'BADAGRY', 25, 'Lagos', 73, 'Lagos West', 246, 'Badagry'),
(682, 'Ifako-Ijaiye I', 515, 'IFAKO-IJAYE', 25, 'Lagos', 73, 'Lagos West', 247, 'Ifako-Ijaiye'),
(683, 'Ifako-Ijaiye II', 506, 'AGEGE', 25, 'Lagos', 73, 'Lagos West', 247, 'Ifako-Ijaiye'),
(684, 'Ikeja I', 516, 'IKEJA', 25, 'Lagos', 73, 'Lagos West', 248, 'Ikeja'),
(685, 'Ikeja II', 516, 'IKEJA', 25, 'Lagos', 73, 'Lagos West', 248, 'Ikeja'),
(686, 'Mushin I', 521, 'MUSHIN', 25, 'Lagos', 73, 'Lagos West', 249, 'Mushin I'),
(687, 'Mushin II', 521, 'MUSHIN', 25, 'Lagos', 73, 'Lagos West', 250, 'Mushin II'),
(688, 'Ojo I', 522, 'OJO', 25, 'Lagos', 73, 'Lagos West', 251, 'Ojo'),
(689, 'Oshodi-Isolo I', 506, 'AGEGE', 25, 'Lagos', 73, 'Lagos West', 252, 'Oshodi-Isolo I'),

-- ============================================================
-- NASARAWA STATE (state_id: 301) - 24 Seats
-- ============================================================
-- Nasarawa North SD (SD ID: 74)
(690, 'Akwanga I', 526, 'AKWANGA', 26, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(691, 'Akwanga II', 526, 'AKWANGA', 26, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(692, 'Nasarawa Eggon I', 534, 'NASARAWA EGGON', 26, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(693, 'Nasarawa Eggon II', 534, 'NASARAWA EGGON', 26, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(694, 'Wamba I', 536, 'WAMBA', 26, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(695, 'Wamba II', 536, 'WAMBA', 26, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
-- Nasarawa South SD (SD ID: 75)
(696, 'Awe', 527, 'AWE', 26, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(697, 'Doma I', 528, 'DOMA', 26, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(698, 'Doma II', 528, 'DOMA', 26, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(699, 'Keana', 530, 'KEANA', 26, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(700, 'Lafia I', 533, 'LAFIA', 26, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(701, 'Lafia II', 533, 'LAFIA', 26, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(702, 'Lafia III', 533, 'LAFIA', 26, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(703, 'Obi I', 774, 'OBI', 26, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(704, 'Obi II', 774, 'OBI', 26, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
-- Nasarawa West SD (SD ID: 76)
(705, 'Keffi I', 531, 'KEFFI', 26, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(706, 'Keffi II', 531, 'KEFFI', 26, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(707, 'Karu', 529, 'KARU', 26, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(708, 'Kokona', 532, 'KOKONA', 26, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(709, 'Nasarawa I', 771, 'NASARAWA', 26, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(710, 'Nasarawa II', 771, 'NASARAWA', 26, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(711, 'Nasarawa III', 771, 'NASARAWA', 26, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(712, 'Toto I', 535, 'TOTO', 26, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(713, 'Toto II', 535, 'TOTO', 26, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),

-- ============================================================
-- NIGER STATE (state_id: 317) - 29 Seats
-- ============================================================
-- Niger East SD (SD ID: 77)
(714, 'Chanchaga I', 542, 'CHANCHAGA', 27, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(715, 'Chanchaga II', 542, 'CHANCHAGA', 27, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(716, 'Chanchaga III', 542, 'CHANCHAGA', 27, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(717, 'Bosso', 541, 'BOSSO', 27, 'Niger', 77, 'Niger East', 260, 'Bosso / Paikoro'),
(718, 'Paikoro', 555, 'PAIKORO', 27, 'Niger', 77, 'Niger East', 260, 'Bosso / Paikoro'),
(719, 'Gurara', 545, 'GURARA', 27, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(720, 'Suleja', 559, 'SULEJA', 27, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(721, 'Tafa', 560, 'TAFA', 27, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(722, 'Shiroro', 558, 'SHIRORO', 27, 'Niger', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
(723, 'Rafi', 556, 'RAFI', 27, 'Niger', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
-- Niger North SD (SD ID: 78)
(724, 'Agwara', 538, 'AGWARA', 27, 'Niger', 78, 'Niger North', 263, 'Agwara / Borgu'),
(725, 'Borgu', 540, 'BORGU', 27, 'Niger', 78, 'Niger North', 263, 'Agwara / Borgu'),
(726, 'Bida', 539, 'BIDA', 27, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(727, 'Gbako', 544, 'GBAKO', 27, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(728, 'Katcha', 546, 'KATCHA', 27, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(729, 'Kontagora', 547, 'KONTAGORA', 27, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(730, 'Wushishi', 561, 'WUSHISHI', 27, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(731, 'Mariga', 551, 'MARIGA', 27, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(732, 'Mashegu', 552, 'MASHEGU', 27, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(733, 'Rijau', 557, 'RIJAU', 27, 'Niger', 78, 'Niger North', 266, 'Rijau / Magama'),
(734, 'Magama', 550, 'MAGAMA', 27, 'Niger', 78, 'Niger North', 266, 'Rijau / Magama'),
-- Niger South SD (SD ID: 79)
(735, 'Lapai I', 548, 'LAPAI', 27, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(736, 'Lapai II', 548, 'LAPAI', 27, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(737, 'Agaie I', 537, 'AGAIE', 27, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(738, 'Agaie II', 537, 'AGAIE', 27, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(739, 'Lavun', 549, 'LAVUN', 27, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(740, 'Mokwa', 553, 'MOKWA', 27, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(741, 'Edati', 537, 'AGAIE', 27, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(742, 'Mokwa II', 553, 'MOKWA', 27, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),

-- ============================================================
-- OGUN STATE (state_id: 323) - 26 Seats
-- ============================================================
-- Ogun Central SD (SD ID: 80)
(743, 'Abeokuta North I', 562, 'ABEOKUTA NORTH', 28, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(744, 'Abeokuta North II', 562, 'ABEOKUTA NORTH', 28, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(745, 'Obafemi-Owode', 576, 'OBAFEMI/OWODE', 28, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(746, 'Odeda', 577, 'ODEDA', 28, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(747, 'Abeokuta South I', 563, 'ABEOKUTA SOUTH', 28, 'Ogun', 80, 'Ogun Central', 270, 'Abeokuta South'),
(748, 'Abeokuta South II', 563, 'ABEOKUTA SOUTH', 28, 'Ogun', 80, 'Ogun Central', 270, 'Abeokuta South'),
(749, 'Ifo', 568, 'IFO', 28, 'Ogun', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
(750, 'Ewekoro', 567, 'EWEKORO', 28, 'Ogun', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
-- Ogun East SD (SD ID: 81)
(751, 'Ijebu North', 570, 'IJEBU NORTH', 28, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(752, 'Ijebu East', 569, 'IJEBU EAST', 28, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(753, 'Ogun Waterside', 579, 'OGUN WATER SIDE', 28, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(754, 'Ijebu Ode', 572, 'IJEBU ODE', 28, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(755, 'Odogbolu', 578, 'ODOGBOLU', 28, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(756, 'Ijebu North East', 571, 'IJEBU NORTH EAST', 28, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(757, 'Ikenne', 573, 'IKENNE', 28, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
(758, 'Shagamu', 562, 'ABEOKUTA NORTH', 28, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
(759, 'Remo North', 580, 'REMO NORTH', 28, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
-- Ogun West SD (SD ID: 82)
(760, 'Ado-Odo/Ota I', 564, 'ADO ODO-OTA', 28, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(761, 'Ado-Odo/Ota II', 564, 'ADO ODO-OTA', 28, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(762, 'Ado-Odo/Ota III', 564, 'ADO ODO-OTA', 28, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(763, 'Egbado North I', 565, 'EGBADO NORTH', 28, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(764, 'Egbado North II', 565, 'EGBADO NORTH', 28, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(765, 'Imeko Afon', 574, 'IMEKO/AFON', 28, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(766, 'Egbado South', 566, 'EGBADO SOUTH', 28, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
(767, 'Ipokia I', 575, 'IPOKIA', 28, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
(768, 'Ipokia II', 575, 'IPOKIA', 28, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),

-- ============================================================
-- ONDO STATE (state_id: 321) - 26 Seats
-- ============================================================
-- Ondo Central SD (SD ID: 83)
(769, 'Akure North I', 586, 'AKURE NORTH', 29, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(770, 'Akure North II', 586, 'AKURE NORTH', 29, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(771, 'Akure South I', 587, 'AKURE SOUTH', 29, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(772, 'Akure South II', 587, 'AKURE SOUTH', 29, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(773, 'Idanre', 589, 'IDANRE', 29, 'Ondo', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
(774, 'Ifedore', 590, 'IFEDORE', 29, 'Ondo', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
(775, 'Ondo East', 596, 'ONDO EAST', 29, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
(776, 'Ondo West I', 597, 'ONDO WEST', 29, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
(777, 'Ondo West II', 597, 'ONDO WEST', 29, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
-- Ondo North SD (SD ID: 84)
(778, 'Akoko North-East I', 582, 'AKOKO NORTH EAST', 29, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(779, 'Akoko North-East II', 582, 'AKOKO NORTH EAST', 29, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(780, 'Akoko North-West', 583, 'AKOKO NORTH WEST', 29, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(781, 'Akoko South-East', 584, 'AKOKO SOUTH EAST', 29, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(782, 'Akoko South-West I', 585, 'AKOKO SOUTH WEST', 29, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(783, 'Akoko South-West II', 585, 'AKOKO SOUTH WEST', 29, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(784, 'Ose', 598, 'OSE', 29, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
(785, 'Owo I', 599, 'OWO', 29, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
(786, 'Owo II', 599, 'OWO', 29, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
-- Ondo South SD (SD ID: 85)
(787, 'Ilaje I', 591, 'ILAJE', 29, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(788, 'Ilaje II', 591, 'ILAJE', 29, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(789, 'Ese-Odo', 588, 'ESE-ODO', 29, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(790, 'Ile-Oluji', 592, 'ILEOLUJI/OKEIGBO', 29, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(791, 'Okeigbo', 592, 'ILEOLUJI/OKEIGBO', 29, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(792, 'Odigbo', 594, 'ODIGBO', 29, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(793, 'Okitipupa', 595, 'OKITIPUPA', 29, 'Ondo', 85, 'Ondo South', 286, 'Okitipupa / Irele'),
(794, 'Irele', 593, 'IRELE', 29, 'Ondo', 85, 'Ondo South', 286, 'Okitipupa / Irele'),

-- ============================================================
-- OSUN STATE (state_id: 322) - 26 Seats
-- ============================================================
-- Osun Central SD (SD ID: 86)
(795, 'Boluwaduro', 604, 'BOLUWADURO', 30, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(796, 'Ifedayo', 611, 'IFEDAYO', 30, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(797, 'Ila', 615, 'ILA', 30, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(798, 'Ifelodun', 772, 'IFELODUN', 30, 'Osun', 86, 'Osun Central', 288, 'Ifelodun / Boripe / Odo-Otin'),
(799, 'Boripe', 605, 'BORIPE', 30, 'Osun', 86, 'Osun Central', 288, 'Ifelodun / Boripe / Odo-Otin'),
(800, 'Odo-Otin', 622, 'ODO-OTIN', 30, 'Osun', 86, 'Osun Central', 288, 'Ifelodun / Boripe / Odo-Otin'),
(801, 'Osogbo I', 627, 'OSOGBO', 30, 'Osun', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
(802, 'Osogbo II', 627, 'OSOGBO', 30, 'Osun', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
(803, 'Olorunda', 624, 'OLORUNDA', 30, 'Osun', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
-- Osun East SD (SD ID: 87)
(804, 'Atakunmosa East', 600, 'ATAKUMOSA EAST', 30, 'Osun', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
(805, 'Atakunmosa West', 601, 'ATAKUMOSA WEST', 30, 'Osun', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
(806, 'Ilesa East', 616, 'ILESA EAST', 30, 'Osun', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
(807, 'Ilesa West', 617, 'ILESA WEST', 30, 'Osun', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
(808, 'Ife Central', 610, 'IFE CENTRAL', 30, 'Osun', 87, 'Osun East', 291, 'Ife Central / Ife East / Ife North / Ife South'),
(809, 'Ife East', 612, 'IFE EAST', 30, 'Osun', 87, 'Osun East', 291, 'Ife Central / Ife East / Ife North / Ife South'),
(810, 'Obokun', 621, 'OBOKUN', 30, 'Osun', 87, 'Osun East', 292, 'Obokun / Oriade'),
(811, 'Oriade', 625, 'ORIADE', 30, 'Osun', 87, 'Osun East', 292, 'Obokun / Oriade'),
-- Osun West SD (SD ID: 88)
(812, 'Ayedaade', 602, 'AYEDAADE', 30, 'Osun', 88, 'Osun West', 293, 'Ayedaade / Irewole / Isokan'),
(813, 'Irewole', 618, 'IREWOLE', 30, 'Osun', 88, 'Osun West', 293, 'Ayedaade / Irewole / Isokan'),
(814, 'Isokan', 619, 'ISOKAN', 30, 'Osun', 88, 'Osun West', 293, 'Ayedaade / Irewole / Isokan'),
(815, 'Ayedire', 603, 'AYEDIRE', 30, 'Osun', 88, 'Osun West', 294, 'Ayedire / Iwo / Ola-Oluwa'),
(816, 'Iwo', 620, 'IWO', 30, 'Osun', 88, 'Osun West', 294, 'Ayedire / Iwo / Ola-Oluwa'),
(817, 'Ola-Oluwa', 623, 'OLA-OLUWA', 30, 'Osun', 88, 'Osun West', 294, 'Ayedire / Iwo / Ola-Oluwa'),
(818, 'Ede North', 606, 'EDE NORTH', 30, 'Osun', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),
(819, 'Ede South', 607, 'EDE SOUTH', 30, 'Osun', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),
(820, 'Egbedore', 608, 'EGBEDORE', 30, 'Osun', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),

-- ============================================================
-- OYO STATE (state_id: 296) - 32 Seats
-- ============================================================
-- Oyo Central SD (SD ID: 89)
(821, 'Afijio', 628, 'AFIJIO', 31, 'Oyo', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
(822, 'Atiba', 630, 'ATIBA', 31, 'Oyo', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
(823, 'Oyo East', 656, 'OYO EAST', 31, 'Oyo', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
(824, 'Oyo West', 657, 'OYO WEST', 31, 'Oyo', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
(825, 'Akinyele', 629, 'AKINYELE', 31, 'Oyo', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
(826, 'Lagelu', 647, 'LAGELU', 31, 'Oyo', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
(827, 'Egbeda', 632, 'EGBEDA', 31, 'Oyo', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
(828, 'Ona-Ara', 653, 'ONA-ARA', 31, 'Oyo', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
(829, 'Oluyole I', 652, 'OLUYOLE', 31, 'Oyo', 89, 'Oyo Central', 299, 'Oluyole'),
(830, 'Oluyole II', 652, 'OLUYOLE', 31, 'Oyo', 89, 'Oyo Central', 299, 'Oluyole'),
(831, 'Ogo-Oluwa', 650, 'OGO-OLUWA', 31, 'Oyo', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
(832, 'Surulere (Oyo)', 773, 'SURULERE', 31, 'Oyo', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
-- Oyo North SD (SD ID: 90)
(833, 'Atisbo', 631, 'ATISBO', 31, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(834, 'Saki East', 658, 'SAKI EAST', 31, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(835, 'Saki West', 659, 'SAKI WEST', 31, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(836, 'Irepo', 642, 'IREPO', 31, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(837, 'Olorunsogo', 651, 'OLORUNSOGO', 31, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(838, 'Orelope', 654, 'OORELOPE', 31, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(839, 'Iseyin', 643, 'ISEYIN', 31, 'Oyo', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
(840, 'Kajola', 646, 'KAJOLA', 31, 'Oyo', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
(841, 'Ogbomoso North', 648, 'OGBOMOSO NORTH', 31, 'Oyo', 90, 'Oyo North', 304, 'Ogbomoso North / Ogbomoso South / Oriire'),
-- Oyo South SD (SD ID: 91)
(842, 'Ibadan North I', 633, 'IBADAN NORTH', 31, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),
(843, 'Ibadan North II', 633, 'IBADAN NORTH', 31, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),
(844, 'Ibadan North-East', 634, 'IBADAN NORTH EAST', 31, 'Oyo', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
(845, 'Ibadan South-East', 636, 'IBADAN SOUTH-EAST', 31, 'Oyo', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
(846, 'Ibadan North-West', 635, 'IBADAN NORTH WEST', 31, 'Oyo', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
(847, 'Ibadan South-West', 637, 'IBADAN SOUTH WEST', 31, 'Oyo', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
(848, 'Ibarapa Central', 638, 'IBARAPA CENTRAL', 31, 'Oyo', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
(849, 'Ibarapa North', 640, 'IBARAPA NORTH', 31, 'Oyo', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
(850, 'Ido', 641, 'IDO', 31, 'Oyo', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
(851, 'Ibarapa East', 639, 'IBARAPA EAST', 31, 'Oyo', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
(852, 'Ibadan North III', 633, 'IBADAN NORTH', 31, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),

-- ============================================================
-- PLATEAU STATE (state_id: 302) - 24 Seats
-- ============================================================
-- Plateau Central SD (SD ID: 92)
(853, 'Bokkos', 661, 'BOKKOS', 32, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(854, 'Mangu I', 669, 'MANGU', 32, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(855, 'Mangu II', 669, 'MANGU', 32, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(856, 'Pankshin', 671, 'PANKSHIN', 32, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
(857, 'Kanke', 666, 'KANKE', 32, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
(858, 'Kanam', 665, 'KANAM', 32, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
-- Plateau North SD (SD ID: 93)
(859, 'Barkin Ladi', 660, 'BARIKIN LADI', 32, 'Plateau', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
(860, 'Riyom', 673, 'RIYOM', 32, 'Plateau', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
(861, 'Jos North I', 663, 'JOS NORTH', 32, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(862, 'Jos North II', 663, 'JOS NORTH', 32, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(863, 'Jos North III', 663, 'JOS NORTH', 32, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(864, 'Bassa', 769, 'BASSA', 32, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(865, 'Jos South I', 664, 'JOS SOUTH', 32, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(866, 'Jos South II', 664, 'JOS SOUTH', 32, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(867, 'Jos East', 662, 'JOS EAST', 32, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(868, 'Jos South III', 664, 'JOS SOUTH', 32, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
-- Plateau South SD (SD ID: 94)
(869, 'Langtang North', 667, 'LANGTANG NORTH', 32, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(870, 'Langtang South I', 668, 'LANGTANG SOUTH', 32, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(871, 'Langtang South II', 668, 'LANGTANG SOUTH', 32, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(872, 'Mikang', 670, 'MIKANG', 32, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(873, 'Quan Pan', 660, 'BARIKIN LADI', 32, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(874, 'Shendam', 674, 'SHENDAM', 32, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(875, 'Wase I', 675, 'WASE', 32, 'Plateau', 94, 'Plateau South', 317, 'Wase'),
(876, 'Wase II', 675, 'WASE', 32, 'Plateau', 94, 'Plateau South', 317, 'Wase'),

-- ============================================================
-- RIVERS STATE (state_id: 4926) - 32 Seats
-- ============================================================
-- Rivers East SD (SD ID: 95)
(877, 'Etche', 686, 'ETCHE', 33, 'Rivers', 95, 'Rivers East', 318, 'Etche / Omuma'),
(878, 'Omuma', 694, 'OMUMA', 33, 'Rivers', 95, 'Rivers East', 318, 'Etche / Omuma'),
(879, 'Ikwerre', 688, 'IKWERRE', 33, 'Rivers', 95, 'Rivers East', 319, 'Ikwerre / Emohua'),
(880, 'Emohua', 685, 'EMOHUA', 33, 'Rivers', 95, 'Rivers East', 319, 'Ikwerre / Emohua'),
(881, 'Obio/Akpor I', 690, 'OBIO/AKPOR', 33, 'Rivers', 95, 'Rivers East', 320, 'Obio/Akpor'),
(882, 'Obio/Akpor II', 690, 'OBIO/AKPOR', 33, 'Rivers', 95, 'Rivers East', 320, 'Obio/Akpor'),
(883, 'Okrika', 693, 'OKRIKA', 33, 'Rivers', 95, 'Rivers East', 321, 'Okrika / Ogu/Bolo'),
(884, 'Ogu/Bolo', 692, 'OGU/BOLO', 33, 'Rivers', 95, 'Rivers East', 321, 'Okrika / Ogu/Bolo'),
(885, 'Port Harcourt I', 697, 'PORT HARCOURT', 33, 'Rivers', 95, 'Rivers East', 322, 'Port Harcourt I'),
(886, 'Port Harcourt II', 697, 'PORT HARCOURT', 33, 'Rivers', 95, 'Rivers East', 323, 'Port Harcourt II'),
(887, 'Port Harcourt III', 697, 'PORT HARCOURT', 33, 'Rivers', 95, 'Rivers East', 322, 'Port Harcourt I'),
(888, 'Port Harcourt IV', 697, 'PORT HARCOURT', 33, 'Rivers', 95, 'Rivers East', 323, 'Port Harcourt II'),
(889, 'Obio/Akpor III', 690, 'OBIO/AKPOR', 33, 'Rivers', 95, 'Rivers East', 320, 'Obio/Akpor'),
-- Rivers South-East SD (SD ID: 96)
(890, 'Andoni', 680, 'ANDONI', 33, 'Rivers', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
(891, 'Opobo-Nkoro', 676, 'ABUA-ODUAL', 33, 'Rivers', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
(892, 'Gokana', 687, 'GOKANA', 33, 'Rivers', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
(893, 'Khana', 689, 'KHANA', 33, 'Rivers', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
(894, 'Eleme', 684, 'ELEME', 33, 'Rivers', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
(895, 'Tai', 698, 'TAI', 33, 'Rivers', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
-- Rivers West SD (SD ID: 97)
(896, 'Abua/Odual I', 676, 'ABUA-ODUAL', 33, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(897, 'Abua/Odual II', 676, 'ABUA-ODUAL', 33, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(898, 'Ahoada East', 677, 'AHOADA EAST', 33, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(899, 'Ahoada West', 678, 'AHOADA WEST', 33, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(900, 'Ogba/Egbema/Ndoni I', 691, 'OGBA/EGBEMA/NDONI', 33, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(901, 'Ogba/Egbema/Ndoni II', 691, 'OGBA/EGBEMA/NDONI', 33, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(902, 'Degema', 683, 'DEGEMA', 33, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),
(903, 'Bonny', 682, 'BONNY', 33, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),
(904, 'Asari-Toru I', 681, 'ASARI-TORU', 33, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(905, 'Asari-Toru II', 681, 'ASARI-TORU', 33, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(906, 'Akuku-Toru I', 679, 'AKUKU TORU', 33, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(907, 'Akuku-Toru II', 679, 'AKUKU TORU', 33, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(908, 'Degema II', 683, 'DEGEMA', 33, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),

-- ============================================================
-- SOKOTO STATE (state_id: 292) - 30 Seats
-- ============================================================
-- Sokoto East SD (SD ID: 98)
(909, 'Gada', 702, 'GADA', 34, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(910, 'Goronyo I', 703, 'GORONYO', 34, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(911, 'Goronyo II', 703, 'GORONYO', 34, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(912, 'Isa', 707, 'ISA', 34, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(913, 'Sabon Birni I', 699, 'BINJI', 34, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(914, 'Sabon Birni II', 699, 'BINJI', 34, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(915, 'Illela', 706, 'ILLELA', 34, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(916, 'Gwadabawa I', 705, 'GWADABAWA', 34, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(917, 'Gwadabawa II', 705, 'GWADABAWA', 34, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(918, 'Rabah', 710, 'RABAH', 34, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
(919, 'Wurno I', 720, 'WURNO', 34, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
(920, 'Wurno II', 720, 'WURNO', 34, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
-- Sokoto North SD (SD ID: 99)
(921, 'Binji', 699, 'BINJI', 34, 'Sokoto', 99, 'Sokoto North', 335, 'Binji / Silame'),
(922, 'Silame', 713, 'SILAME', 34, 'Sokoto', 99, 'Sokoto North', 335, 'Binji / Silame'),
(923, 'Kware', 708, 'KWARE', 34, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(924, 'Wamako I', 719, 'WAMAKKO', 34, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(925, 'Wamako II', 719, 'WAMAKKO', 34, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(926, 'Sokoto North I', 714, 'SOKOTO NORTH', 34, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(927, 'Sokoto North II', 714, 'SOKOTO NORTH', 34, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(928, 'Sokoto South', 715, 'SOKOTO SOUTH', 34, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(929, 'Tangaza', 717, 'TANGAZA', 34, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
(930, 'Gudu I', 704, 'GUDU', 34, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
(931, 'Gudu II', 704, 'GUDU', 34, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
-- Sokoto South SD (SD ID: 100)
(932, 'Kebbe', 709, 'KEBBE', 34, 'Sokoto', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
(933, 'Tambuwal', 716, 'TAMBUWAL', 34, 'Sokoto', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
(934, 'Bodinga', 700, 'BODINGA', 34, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(935, 'Dange-Shuni', 701, 'DANGE/SHUNI', 34, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(936, 'Tureta', 718, 'TURETA', 34, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(937, 'Yabo', 721, 'YABO', 34, 'Sokoto', 100, 'Sokoto South', 341, 'Yabo / Shagari'),
(938, 'Shagari', 712, 'SHAGARI', 34, 'Sokoto', 100, 'Sokoto South', 341, 'Yabo / Shagari'),

-- ============================================================
-- TARABA STATE (state_id: 319) - 24 Seats
-- ============================================================
-- Taraba North SD (SD ID: 101)
(939, 'Jalingo I', 728, 'JALINGO', 35, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(940, 'Jalingo II', 728, 'JALINGO', 35, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(941, 'Yorro', 736, 'YORRO', 35, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(942, 'Zing', 737, 'ZING', 35, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(943, 'Karim Lamido I', 729, 'KARIM-LAMIDO', 35, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(944, 'Karim Lamido II', 729, 'KARIM-LAMIDO', 35, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(945, 'Lau', 731, 'LAU', 35, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(946, 'Ardo-Kola', 722, 'ARDO - KOLA', 35, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
-- Taraba Central SD (SD ID: 102)
(947, 'Bali I', 723, 'BALI', 35, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(948, 'Bali II', 723, 'BALI', 35, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(949, 'Gassol I', 726, 'GASSOL', 35, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(950, 'Gassol II', 726, 'GASSOL', 35, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(951, 'Sardauna', 732, 'SARDAUNA', 35, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(952, 'Gashaka', 725, 'GASHAKA', 35, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(953, 'Kurmi I', 730, 'KURMI', 35, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(954, 'Kurmi II', 730, 'KURMI', 35, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
-- Taraba South SD (SD ID: 103)
(955, 'Donga', 724, 'DONGA', 35, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(956, 'Ussa', 734, 'USSA', 35, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(957, 'Takum I', 733, 'TAKUM', 35, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(958, 'Takum II', 733, 'TAKUM', 35, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(959, 'Wukari I', 735, 'WUKARI', 35, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(960, 'Wukari II', 735, 'WUKARI', 35, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(961, 'Ibi I', 727, 'IBI', 35, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(962, 'Ibi II', 727, 'IBI', 35, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),

-- ============================================================
-- YOBE STATE (state_id: 297) - 24 Seats
-- ============================================================
-- Yobe North SD (SD ID: 104)
(963, 'Bade I', 738, 'BADE', 36, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(964, 'Bade II', 738, 'BADE', 36, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(965, 'Jakusko', 746, 'JAKUSKO', 36, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(966, 'Machina', 748, 'MACHINA', 36, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(967, 'Nguru', 750, 'NGURU', 36, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(968, 'Karasuwa', 747, 'KARASAWA', 36, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(969, 'Yusufari I', 754, 'YUSUFARI', 36, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(970, 'Yusufari II', 754, 'YUSUFARI', 36, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
-- Yobe East SD (SD ID: 105)
(971, 'Damaturu I', 740, 'DAMATURU', 36, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(972, 'Damaturu II', 740, 'DAMATURU', 36, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(973, 'Gujba', 744, 'GUJBA', 36, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(974, 'Gulani', 745, 'GULANI', 36, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(975, 'Tarmuwa', 752, 'TARMUWA', 36, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(976, 'Geidam', 743, 'GEIDAM', 36, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
(977, 'Yunusari', 753, 'YUNUSARI', 36, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
(978, 'Bursari', 739, 'BURSARI', 36, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
-- Yobe South SD (SD ID: 106)
(979, 'Fika I', 741, 'FIKA', 36, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(980, 'Fika II', 741, 'FIKA', 36, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(981, 'Fune I', 742, 'FUNE', 36, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(982, 'Fune II', 742, 'FUNE', 36, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(983, 'Potiskum I', 751, 'POTISKUM', 36, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(984, 'Potiskum II', 751, 'POTISKUM', 36, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(985, 'Nangere I', 749, 'NANGERE', 36, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(986, 'Nangere II', 749, 'NANGERE', 36, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),

-- ============================================================
-- ZAMFARA STATE (state_id: 299) - 24 Seats
-- ============================================================
-- Zamfara North SD (SD ID: 107)
(987, 'Zurmi I', 768, 'ZURMI', 37, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(988, 'Zurmi II', 768, 'ZURMI', 37, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(989, 'Shinkafi', 765, 'SHINKAFI', 37, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(990, 'Kaura Namoda', 762, 'KAURA NAMODA', 37, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
(991, 'Birnin Magaji I', 757, 'BIRNIN MAGAJI', 37, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
(992, 'Birnin Magaji II', 757, 'BIRNIN MAGAJI', 37, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
-- Zamfara Central SD (SD ID: 108)
(993, 'Gusau I', 761, 'GUSAU', 37, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(994, 'Gusau II', 761, 'GUSAU', 37, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(995, 'Gusau III', 761, 'GUSAU', 37, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(996, 'Tsafe I', 767, 'TSAFE', 37, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(997, 'Tsafe II', 767, 'TSAFE', 37, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(998, 'Bungudu I', 759, 'BUNGUDU', 37, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(999, 'Bungudu II', 759, 'BUNGUDU', 37, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(1000, 'Bungudu III', 759, 'BUNGUDU', 37, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(1001, 'Maru I', 764, 'MARU', 37, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(1002, 'Maru II', 764, 'MARU', 37, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
-- Zamfara West SD (SD ID: 109)
(1003, 'Bakura', 756, 'BAKURA', 37, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(1004, 'Maradun', 763, 'MARADUN', 37, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(1005, 'Talata Mafara I', 766, 'TALATA MAFARA', 37, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(1006, 'Talata Mafara II', 766, 'TALATA MAFARA', 37, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(1007, 'Anka I', 755, 'ANKA', 37, 'Zamfara', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
(1008, 'Anka II', 755, 'ANKA', 37, 'Zamfara', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
(1009, 'Gummi', 760, 'GUMMI', 37, 'Zamfara', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum'),
(1010, 'Bukkuyum', 758, 'BUKKUYUM', 37, 'Zamfara', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum');

-- +goose Down
DROP TABLE IF EXISTS state_assembly_constituencies;