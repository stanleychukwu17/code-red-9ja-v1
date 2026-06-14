-- +goose Up
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
(435, 'Birnin Kudu I', 17, 'Jigawa', 51, 'Jigawa North-West', 147, 'Birnin Kudu / Buji'),
(436, 'Birnin Kudu II', 17, 'Jigawa', 51, 'Jigawa North-West', 147, 'Birnin Kudu / Buji'),
(437, 'Buji', 17, 'Jigawa', 51, 'Jigawa North-West', 147, 'Birnin Kudu / Buji'),
(438, 'Dutse I', 17, 'Jigawa', 51, 'Jigawa North-West', 148, 'Dutse / Kiyawa'),
(439, 'Dutse II', 17, 'Jigawa', 51, 'Jigawa North-West', 148, 'Dutse / Kiyawa'),
(440, 'Kiyawa', 17, 'Jigawa', 51, 'Jigawa North-West', 148, 'Dutse / Kiyawa'),
(441, 'Gwaram I', 17, 'Jigawa', 51, 'Jigawa North-West', 149, 'Gwaram'),
(442, 'Gwaram II', 17, 'Jigawa', 51, 'Jigawa North-West', 149, 'Gwaram'),
(443, 'Jahun', 17, 'Jigawa', 51, 'Jigawa North-West', 150, 'Jahun / Miga'),
(444, 'Miga', 17, 'Jigawa', 51, 'Jigawa North-West', 150, 'Jahun / Miga'),
(445, 'Ringim', 17, 'Jigawa', 51, 'Jigawa North-West', 151, 'Ringim / Taura'),
(446, 'Taura', 17, 'Jigawa', 51, 'Jigawa North-West', 151, 'Ringim / Taura'),
-- Jigawa South-West SD (SD ID: 52)
(447, 'Birnin Kudu III', 17, 'Jigawa', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
(448, 'Dutse III', 17, 'Jigawa', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
(449, 'Gwaram III', 17, 'Jigawa', 52, 'Jigawa South-West', 149, 'Gwaram'),
(450, 'Ringim II', 17, 'Jigawa', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),

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
(459, 'Lere I', 18, 'Kaduna', 53, 'Kaduna North', 156, 'Lere'),
(460, 'Lere II', 18, 'Kaduna', 53, 'Kaduna North', 156, 'Lere'),
(461, 'Soba I', 18, 'Kaduna', 53, 'Kaduna North', 157, 'Soba'),
(462, 'Soba II', 18, 'Kaduna', 53, 'Kaduna North', 157, 'Soba'),
-- Kaduna Central SD (SD ID: 54)
(463, 'Birnin Gwari', 18, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(464, 'Giwa I', 18, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(465, 'Giwa II', 18, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(466, 'Chikun I', 18, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(467, 'Chikun II', 18, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(468, 'Kajuru', 18, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(469, 'Igabi I', 18, 'Kaduna', 54, 'Kaduna Central', 160, 'Igabi'),
(470, 'Igabi II', 18, 'Kaduna', 54, 'Kaduna Central', 160, 'Igabi'),
(471, 'Kaduna North I', 18, 'Kaduna', 54, 'Kaduna Central', 161, 'Kaduna North'),
(472, 'Kaduna North II', 18, 'Kaduna', 54, 'Kaduna Central', 161, 'Kaduna North'),
(473, 'Kaduna South I', 18, 'Kaduna', 54, 'Kaduna Central', 162, 'Kaduna South'),
(474, 'Kaduna South II', 18, 'Kaduna', 54, 'Kaduna Central', 162, 'Kaduna South'),
-- Kaduna South SD (SD ID: 55)
(475, 'Jaba', 18, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(476, 'Zangon Kataf I', 18, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(477, 'Zangon Kataf II', 18, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(478, 'Jemaa I', 18, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(479, 'Jemaa II', 18, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(480, 'Sanga', 18, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(481, 'Kachia I', 18, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(482, 'Kachia II', 18, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(483, 'Kagarko', 18, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(484, 'Kaura', 18, 'Kaduna', 55, 'Kaduna South', 166, 'Kaura'),
(485, 'Kauru I', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),
(486, 'Kauru II', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),

-- ============================================================
-- KANO STATE (state_id: 300) - 40 Seats
-- ============================================================
-- Kano Central SD (SD ID: 56)
(487, 'Dala I', 19, 'Kano', 56, 'Kano Central', 168, 'Dala'),
(488, 'Dala II', 19, 'Kano', 56, 'Kano Central', 168, 'Dala'),
(489, 'Dawakin Kudu I', 19, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(490, 'Dawakin Kudu II', 19, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(491, 'Warawa', 19, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(492, 'Fagge I', 19, 'Kano', 56, 'Kano Central', 170, 'Fagge'),
(493, 'Fagge II', 19, 'Kano', 56, 'Kano Central', 170, 'Fagge'),
(494, 'Gezawa', 19, 'Kano', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
(495, 'Gabasawa', 19, 'Kano', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
(496, 'Gwale I', 19, 'Kano', 56, 'Kano Central', 172, 'Gwale'),
(497, 'Gwale II', 19, 'Kano', 56, 'Kano Central', 172, 'Gwale'),
(498, 'Kano Municipal I', 19, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(499, 'Kano Municipal II', 19, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(500, 'Kumbotso I', 19, 'Kano', 56, 'Kano Central', 174, 'Kumbotso'),
(501, 'Kumbotso II', 19, 'Kano', 56, 'Kano Central', 174, 'Kumbotso'),
(502, 'Nasarawa I', 19, 'Kano', 56, 'Kano Central', 175, 'Nasarawa'),
(503, 'Nasarawa II', 19, 'Kano', 56, 'Kano Central', 175, 'Nasarawa'),
(504, 'Tarauni I', 19, 'Kano', 56, 'Kano Central', 176, 'Tarauni'),
(505, 'Tarauni II', 19, 'Kano', 56, 'Kano Central', 176, 'Tarauni'),
(506, 'Ungogo I', 19, 'Kano', 56, 'Kano Central', 177, 'Ungogo'),
-- Kano North SD (SD ID: 57)
(507, 'Bagwai I', 19, 'Kano', 57, 'Kano North', 178, 'Bagwai / Shanono'),
(508, 'Shanono', 19, 'Kano', 57, 'Kano North', 178, 'Bagwai / Shanono'),
(509, 'Bichi I', 19, 'Kano', 57, 'Kano North', 179, 'Bichi'),
(510, 'Bichi II', 19, 'Kano', 57, 'Kano North', 179, 'Bichi'),
(511, 'Dambatta I', 19, 'Kano', 57, 'Kano North', 180, 'Dambatta / Makoda'),
(512, 'Makoda', 19, 'Kano', 57, 'Kano North', 180, 'Dambatta / Makoda'),
(513, 'Dawakin Tofa I', 19, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(514, 'Tofa I', 19, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(515, 'Rimin Gado', 19, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(516, 'Gwarzo I', 19, 'Kano', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
(517, 'Kabo', 19, 'Kano', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
(518, 'Karaye', 19, 'Kano', 57, 'Kano North', 183, 'Karaye / Rogo'),
(519, 'Rogo', 19, 'Kano', 57, 'Kano North', 183, 'Karaye / Rogo'),
(520, 'Kunchi', 19, 'Kano', 57, 'Kano North', 184, 'Kunchi / Tsanyawa'),
(521, 'Tsanyawa', 19, 'Kano', 57, 'Kano North', 184, 'Kunchi / Tsanyawa'),
(522, 'Minjibir', 19, 'Kano', 57, 'Kano North', 185, 'Minjibir / Ungogo'),
-- Kano South SD (SD ID: 58)
(523, 'Albasu I', 19, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(524, 'Ajingi I', 19, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(525, 'Gaya I', 19, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(526, 'Bebeji I', 19, 'Kano', 58, 'Kano South', 187, 'Bebeji / Kiru'),
(527, 'Kiru I', 19, 'Kano', 58, 'Kano South', 187, 'Bebeji / Kiru'),
(528, 'Doguwa I', 19, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(529, 'Tudun Wada I', 19, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(530, 'Tudun Wada II', 19, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(531, 'Kura I', 19, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
(532, 'Madobi I', 19, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
(533, 'Garun Mallam I', 19, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
(534, 'Rano I', 19, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(535, 'Bunkure I', 19, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(536, 'Kibiya I', 19, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(537, 'Takai I', 19, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),
(538, 'Sumaila I', 19, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),
(539, 'Sumaila II', 19, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),
(540, 'Kura II', 19, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),

-- ============================================================
-- KATSINA STATE (state_id: 313) - 34 Seats
-- ============================================================
-- Katsina Central SD (SD ID: 59)
(541, 'Batagarawa I', 20, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(542, 'Charanchi I', 20, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(543, 'Rimi I', 20, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(544, 'Batsari I', 20, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(545, 'Safana I', 20, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(546, 'Danmusa I', 20, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(547, 'Dutsin-Ma I', 20, 'Katsina', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
(548, 'Kurfi I', 20, 'Katsina', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
(549, 'Jibia I', 20, 'Katsina', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
(550, 'Kaita I', 20, 'Katsina', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
(551, 'Katsina Central I', 20, 'Katsina', 59, 'Katsina Central', 196, 'Katsina Central'),
(552, 'Katsina Central II', 20, 'Katsina', 59, 'Katsina Central', 196, 'Katsina Central'),
-- Katsina North SD (SD ID: 60)
(553, 'Bindawa I', 20, 'Katsina', 60, 'Katsina North', 197, 'Bindawa / Mani'),
(554, 'Mani I', 20, 'Katsina', 60, 'Katsina North', 197, 'Bindawa / Mani'),
(555, 'Daura I', 20, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(556, 'Sandamu I', 20, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(557, 'Maiadua I', 20, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(558, 'Ingawa I', 20, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(559, 'Kankia I', 20, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(560, 'Kusada I', 20, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(561, 'Mashi I', 20, 'Katsina', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
(562, 'Dutsi I', 20, 'Katsina', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
(563, 'Zango I', 20, 'Katsina', 60, 'Katsina North', 201, 'Zango / Baure'),
(564, 'Baure I', 20, 'Katsina', 60, 'Katsina North', 201, 'Zango / Baure'),
-- Katsina South SD (SD ID: 61)
(565, 'Bakori I', 20, 'Katsina', 61, 'Katsina South', 202, 'Bakori / Danja'),
(566, 'Danja I', 20, 'Katsina', 61, 'Katsina South', 202, 'Bakori / Danja'),
(567, 'Faskari I', 20, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(568, 'Kankara I', 20, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(569, 'Sabuwa I', 20, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(570, 'Funtua I', 20, 'Katsina', 61, 'Katsina South', 204, 'Funtua / Dandume'),
(571, 'Dandume I', 20, 'Katsina', 61, 'Katsina South', 204, 'Funtua / Dandume'),
(572, 'Malumfashi I', 20, 'Katsina', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
(573, 'Kafur I', 20, 'Katsina', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
(574, 'Matazu I', 20, 'Katsina', 61, 'Katsina South', 206, 'Matazu / Musawa'),
(575, 'Musawa I', 20, 'Katsina', 61, 'Katsina South', 206, 'Matazu / Musawa'),

-- ============================================================
-- KEBBI STATE (state_id: 290) - 24 Seats
-- ============================================================
-- Kebbi Central SD (SD ID: 62)
(576, 'Aleiro', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(577, 'Gwandu', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(578, 'Jega I', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(579, 'Jega II', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(580, 'Birnin Kebbi I', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(581, 'Birnin Kebbi II', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(582, 'Kalgo', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(583, 'Bunza', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(584, 'Maiyama', 21, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
(585, 'Koko/Besse', 21, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
-- Kebbi North SD (SD ID: 63)
(586, 'Arewa I', 21, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(587, 'Arewa II', 21, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(588, 'Dandi', 21, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(589, 'Argungu I', 21, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(590, 'Argungu II', 21, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(591, 'Augie', 21, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(592, 'Bagudo I', 21, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
(593, 'Bagudo II', 21, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
(594, 'Suru', 21, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
-- Kebbi South SD (SD ID: 64)
(595, 'Fakai', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(596, 'Sakaba', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(597, 'Wasagu/Danko I', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(598, 'Wasagu/Danko II', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(599, 'Zuru', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(600, 'Yauri', 21, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
(601, 'Shanga', 21, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
(602, 'Ngaski', 21, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),

-- ============================================================
-- KOGI STATE (state_id: 298) - 25 Seats
-- ============================================================
-- Kogi Central SD (SD ID: 65)
(603, 'Adavi', 22, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(604, 'Okehi', 22, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(605, 'Ajaokuta', 22, 'Kogi', 65, 'Kogi Central', 216, 'Ajaokuta'),
(606, 'Okene I', 22, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
(607, 'Okene II', 22, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
(608, 'Ogori-Magongo', 22, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
-- Kogi East SD (SD ID: 66)
(609, 'Ankpa I', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(610, 'Ankpa II', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(611, 'Omala', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(612, 'Olamaboro', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(613, 'Dekina I', 22, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(614, 'Dekina II', 22, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(615, 'Bassa', 22, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(616, 'Idah', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(617, 'Ibaji', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(618, 'Igalamela-Odolu', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(619, 'Ofu', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
-- Kogi West SD (SD ID: 67)
(620, 'Kabba/Bunu', 22, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(621, 'Ijumu', 22, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(622, 'Lokoja I', 22, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(623, 'Lokoja II', 22, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(624, 'Kogi (Koton Karfe)', 22, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(625, 'Yagba East', 22, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
(626, 'Yagba West', 22, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
(627, 'Mopa-Muro', 22, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),

-- ============================================================
-- KWARA STATE (state_id: 295) - 24 Seats
-- ============================================================
-- Kwara Central SD (SD ID: 68)
(628, 'Ilorin East', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(629, 'Ilorin South', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(630, 'Ilorin West I', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(631, 'Ilorin West II', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(632, 'Asa', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
-- Kwara North SD (SD ID: 69)
(633, 'Baruten I', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(634, 'Baruten II', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(635, 'Kaiama I', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(636, 'Kaiama II', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(637, 'Edu I', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(638, 'Edu II', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(639, 'Moro', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(640, 'Pategi I', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(641, 'Pategi II', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
-- Kwara South SD (SD ID: 70)
(642, 'Ekiti (Kwara)', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(643, 'Isin', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(644, 'Irepodun', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(645, 'Oke-Ero', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(646, 'Ifelodun', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(647, 'Offa I', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(648, 'Offa II', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(649, 'Oyun', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),

-- ============================================================
-- LAGOS STATE (state_id: 306) - 40 Seats
-- ============================================================
-- Lagos Central SD (SD ID: 71)
(650, 'Apapa I', 24, 'Lagos', 71, 'Lagos Central', 230, 'Apapa'),
(651, 'Apapa II', 24, 'Lagos', 71, 'Lagos Central', 230, 'Apapa'),
(652, 'Eti-Osa I', 24, 'Lagos', 71, 'Lagos Central', 231, 'Eti-Osa'),
(653, 'Eti-Osa II', 24, 'Lagos', 71, 'Lagos Central', 231, 'Eti-Osa'),
(654, 'Lagos Island I', 24, 'Lagos', 71, 'Lagos Central', 232, 'Lagos Island I'),
(655, 'Lagos Island II', 24, 'Lagos', 71, 'Lagos Central', 232, 'Lagos Island I'),
(656, 'Lagos Island III', 24, 'Lagos', 71, 'Lagos Central', 233, 'Lagos Island II'),
(657, 'Lagos Island IV', 24, 'Lagos', 71, 'Lagos Central', 233, 'Lagos Island II'),
(658, 'Lagos Mainland I', 24, 'Lagos', 71, 'Lagos Central', 234, 'Lagos Mainland'),
(659, 'Lagos Mainland II', 24, 'Lagos', 71, 'Lagos Central', 234, 'Lagos Mainland'),
(660, 'Surulere I', 24, 'Lagos', 71, 'Lagos Central', 235, 'Surulere I'),
(661, 'Surulere II', 24, 'Lagos', 71, 'Lagos Central', 236, 'Surulere II'),
-- Lagos East SD (SD ID: 72)
(662, 'Epe I', 24, 'Lagos', 72, 'Lagos East', 237, 'Epe'),
(663, 'Epe II', 24, 'Lagos', 72, 'Lagos East', 237, 'Epe'),
(664, 'Ibeju-Lekki I', 24, 'Lagos', 72, 'Lagos East', 238, 'Ibeju-Lekki'),
(665, 'Ibeju-Lekki II', 24, 'Lagos', 72, 'Lagos East', 238, 'Ibeju-Lekki'),
(666, 'Ikorodu I', 24, 'Lagos', 72, 'Lagos East', 239, 'Ikorodu'),
(667, 'Ikorodu II', 24, 'Lagos', 72, 'Lagos East', 239, 'Ikorodu'),
(668, 'Kosofe I', 24, 'Lagos', 72, 'Lagos East', 240, 'Kosofe'),
(669, 'Kosofe II', 24, 'Lagos', 72, 'Lagos East', 240, 'Kosofe'),
(670, 'Shomolu I', 24, 'Lagos', 72, 'Lagos East', 241, 'Somolu'),
(671, 'Shomolu II', 24, 'Lagos', 72, 'Lagos East', 241, 'Somolu'),
-- Lagos West SD (SD ID: 73)
(672, 'Agege I', 24, 'Lagos', 73, 'Lagos West', 242, 'Agege'),
(673, 'Agege II', 24, 'Lagos', 73, 'Lagos West', 242, 'Agege'),
(674, 'Ajeromi-Ifelodun I', 24, 'Lagos', 73, 'Lagos West', 243, 'Ajeromi-Ifelodun'),
(675, 'Ajeromi-Ifelodun II', 24, 'Lagos', 73, 'Lagos West', 243, 'Ajeromi-Ifelodun'),
(676, 'Alimosho I', 24, 'Lagos', 73, 'Lagos West', 244, 'Alimosho'),
(677, 'Alimosho II', 24, 'Lagos', 73, 'Lagos West', 244, 'Alimosho'),
(678, 'Amuwo-Odofin I', 24, 'Lagos', 73, 'Lagos West', 245, 'Amuwo-Odofin'),
(679, 'Amuwo-Odofin II', 24, 'Lagos', 73, 'Lagos West', 245, 'Amuwo-Odofin'),
(680, 'Badagry I', 24, 'Lagos', 73, 'Lagos West', 246, 'Badagry'),
(681, 'Badagry II', 24, 'Lagos', 73, 'Lagos West', 246, 'Badagry'),
(682, 'Ifako-Ijaiye I', 24, 'Lagos', 73, 'Lagos West', 247, 'Ifako-Ijaiye'),
(683, 'Ifako-Ijaiye II', 24, 'Lagos', 73, 'Lagos West', 247, 'Ifako-Ijaiye'),
(684, 'Ikeja I', 24, 'Lagos', 73, 'Lagos West', 248, 'Ikeja'),
(685, 'Ikeja II', 24, 'Lagos', 73, 'Lagos West', 248, 'Ikeja'),
(686, 'Mushin I', 24, 'Lagos', 73, 'Lagos West', 249, 'Mushin I'),
(687, 'Mushin II', 24, 'Lagos', 73, 'Lagos West', 250, 'Mushin II'),
(688, 'Ojo I', 24, 'Lagos', 73, 'Lagos West', 251, 'Ojo'),
(689, 'Oshodi-Isolo I', 24, 'Lagos', 73, 'Lagos West', 252, 'Oshodi-Isolo I'),

-- ============================================================
-- NASARAWA STATE (state_id: 301) - 24 Seats
-- ============================================================
-- Nasarawa North SD (SD ID: 74)
(690, 'Akwanga I', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(691, 'Akwanga II', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(692, 'Nasarawa Eggon I', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(693, 'Nasarawa Eggon II', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(694, 'Wamba I', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(695, 'Wamba II', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
-- Nasarawa South SD (SD ID: 75)
(696, 'Awe', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(697, 'Doma I', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(698, 'Doma II', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(699, 'Keana', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(700, 'Lafia I', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(701, 'Lafia II', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(702, 'Lafia III', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(703, 'Obi I', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(704, 'Obi II', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
-- Nasarawa West SD (SD ID: 76)
(705, 'Keffi I', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(706, 'Keffi II', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(707, 'Karu', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(708, 'Kokona', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(709, 'Nasarawa I', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(710, 'Nasarawa II', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(711, 'Nasarawa III', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(712, 'Toto I', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(713, 'Toto II', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),

-- ============================================================
-- NIGER STATE (state_id: 317) - 29 Seats
-- ============================================================
-- Niger East SD (SD ID: 77)
(714, 'Chanchaga I', 26, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(715, 'Chanchaga II', 26, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(716, 'Chanchaga III', 26, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(717, 'Bosso', 26, 'Niger', 77, 'Niger East', 260, 'Bosso / Paikoro'),
(718, 'Paikoro', 26, 'Niger', 77, 'Niger East', 260, 'Bosso / Paikoro'),
(719, 'Gurara', 26, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(720, 'Suleja', 26, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(721, 'Tafa', 26, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(722, 'Shiroro', 26, 'Niger', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
(723, 'Rafi', 26, 'Niger', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
-- Niger North SD (SD ID: 78)
(724, 'Agwara', 26, 'Niger', 78, 'Niger North', 263, 'Agwara / Borgu'),
(725, 'Borgu', 26, 'Niger', 78, 'Niger North', 263, 'Agwara / Borgu'),
(726, 'Bida', 26, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(727, 'Gbako', 26, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(728, 'Katcha', 26, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(729, 'Kontagora', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(730, 'Wushishi', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(731, 'Mariga', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(732, 'Mashegu', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(733, 'Rijau', 26, 'Niger', 78, 'Niger North', 266, 'Rijau / Magama'),
(734, 'Magama', 26, 'Niger', 78, 'Niger North', 266, 'Rijau / Magama'),
-- Niger South SD (SD ID: 79)
(735, 'Lapai I', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(736, 'Lapai II', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(737, 'Agaie I', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(738, 'Agaie II', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(739, 'Lavun', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(740, 'Mokwa', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(741, 'Edati', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(742, 'Mokwa II', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),

-- ============================================================
-- OGUN STATE (state_id: 323) - 26 Seats
-- ============================================================
-- Ogun Central SD (SD ID: 80)
(743, 'Abeokuta North I', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(744, 'Abeokuta North II', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(745, 'Obafemi-Owode', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(746, 'Odeda', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(747, 'Abeokuta South I', 27, 'Ogun', 80, 'Ogun Central', 270, 'Abeokuta South'),
(748, 'Abeokuta South II', 27, 'Ogun', 80, 'Ogun Central', 270, 'Abeokuta South'),
(749, 'Ifo', 27, 'Ogun', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
(750, 'Ewekoro', 27, 'Ogun', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
-- Ogun East SD (SD ID: 81)
(751, 'Ijebu North', 27, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(752, 'Ijebu East', 27, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(753, 'Ogun Waterside', 27, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(754, 'Ijebu Ode', 27, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(755, 'Odogbolu', 27, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(756, 'Ijebu North East', 27, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(757, 'Ikenne', 27, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
(758, 'Shagamu', 27, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
(759, 'Remo North', 27, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
-- Ogun West SD (SD ID: 82)
(760, 'Ado-Odo/Ota I', 27, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(761, 'Ado-Odo/Ota II', 27, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(762, 'Ado-Odo/Ota III', 27, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(763, 'Egbado North I', 27, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(764, 'Egbado North II', 27, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(765, 'Imeko Afon', 27, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(766, 'Egbado South', 27, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
(767, 'Ipokia I', 27, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
(768, 'Ipokia II', 27, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),

-- ============================================================
-- ONDO STATE (state_id: 321) - 26 Seats
-- ============================================================
-- Ondo Central SD (SD ID: 83)
(769, 'Akure North I', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(770, 'Akure North II', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(771, 'Akure South I', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(772, 'Akure South II', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(773, 'Idanre', 28, 'Ondo', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
(774, 'Ifedore', 28, 'Ondo', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
(775, 'Ondo East', 28, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
(776, 'Ondo West I', 28, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
(777, 'Ondo West II', 28, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
-- Ondo North SD (SD ID: 84)
(778, 'Akoko North-East I', 28, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(779, 'Akoko North-East II', 28, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(780, 'Akoko North-West', 28, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(781, 'Akoko South-East', 28, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(782, 'Akoko South-West I', 28, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(783, 'Akoko South-West II', 28, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(784, 'Ose', 28, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
(785, 'Owo I', 28, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
(786, 'Owo II', 28, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
-- Ondo South SD (SD ID: 85)
(787, 'Ilaje I', 28, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(788, 'Ilaje II', 28, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(789, 'Ese-Odo', 28, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(790, 'Ile-Oluji', 28, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(791, 'Okeigbo', 28, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(792, 'Odigbo', 28, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(793, 'Okitipupa', 28, 'Ondo', 85, 'Ondo South', 286, 'Okitipupa / Irele'),
(794, 'Irele', 28, 'Ondo', 85, 'Ondo South', 286, 'Okitipupa / Irele'),

-- ============================================================
-- OSUN STATE (state_id: 322) - 26 Seats
-- ============================================================
-- Osun Central SD (SD ID: 86)
(795, 'Boluwaduro', 29, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(796, 'Ifedayo', 29, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(797, 'Ila', 29, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(798, 'Ifelodun', 29, 'Osun', 86, 'Osun Central', 288, 'Ifelodun / Boripe / Odo-Otin'),
(799, 'Boripe', 29, 'Osun', 86, 'Osun Central', 288, 'Ifelodun / Boripe / Odo-Otin'),
(800, 'Odo-Otin', 29, 'Osun', 86, 'Osun Central', 288, 'Ifelodun / Boripe / Odo-Otin'),
(801, 'Osogbo I', 29, 'Osun', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
(802, 'Osogbo II', 29, 'Osun', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
(803, 'Olorunda', 29, 'Osun', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
-- Osun East SD (SD ID: 87)
(804, 'Atakunmosa East', 29, 'Osun', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
(805, 'Atakunmosa West', 29, 'Osun', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
(806, 'Ilesa East', 29, 'Osun', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
(807, 'Ilesa West', 29, 'Osun', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
(808, 'Ife Central', 29, 'Osun', 87, 'Osun East', 291, 'Ife Central / Ife East / Ife North / Ife South'),
(809, 'Ife East', 29, 'Osun', 87, 'Osun East', 291, 'Ife Central / Ife East / Ife North / Ife South'),
(810, 'Obokun', 29, 'Osun', 87, 'Osun East', 292, 'Obokun / Oriade'),
(811, 'Oriade', 29, 'Osun', 87, 'Osun East', 292, 'Obokun / Oriade'),
-- Osun West SD (SD ID: 88)
(812, 'Ayedaade', 29, 'Osun', 88, 'Osun West', 293, 'Ayedaade / Irewole / Isokan'),
(813, 'Irewole', 29, 'Osun', 88, 'Osun West', 293, 'Ayedaade / Irewole / Isokan'),
(814, 'Isokan', 29, 'Osun', 88, 'Osun West', 293, 'Ayedaade / Irewole / Isokan'),
(815, 'Ayedire', 29, 'Osun', 88, 'Osun West', 294, 'Ayedire / Iwo / Ola-Oluwa'),
(816, 'Iwo', 29, 'Osun', 88, 'Osun West', 294, 'Ayedire / Iwo / Ola-Oluwa'),
(817, 'Ola-Oluwa', 29, 'Osun', 88, 'Osun West', 294, 'Ayedire / Iwo / Ola-Oluwa'),
(818, 'Ede North', 29, 'Osun', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),
(819, 'Ede South', 29, 'Osun', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),
(820, 'Egbedore', 29, 'Osun', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),

-- ============================================================
-- OYO STATE (state_id: 296) - 32 Seats
-- ============================================================
-- Oyo Central SD (SD ID: 89)
(821, 'Afijio', 30, 'Oyo', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
(822, 'Atiba', 30, 'Oyo', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
(823, 'Oyo East', 30, 'Oyo', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
(824, 'Oyo West', 30, 'Oyo', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
(825, 'Akinyele', 30, 'Oyo', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
(826, 'Lagelu', 30, 'Oyo', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
(827, 'Egbeda', 30, 'Oyo', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
(828, 'Ona-Ara', 30, 'Oyo', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
(829, 'Oluyole I', 30, 'Oyo', 89, 'Oyo Central', 299, 'Oluyole'),
(830, 'Oluyole II', 30, 'Oyo', 89, 'Oyo Central', 299, 'Oluyole'),
(831, 'Ogo-Oluwa', 30, 'Oyo', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
(832, 'Surulere (Oyo)', 30, 'Oyo', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
-- Oyo North SD (SD ID: 90)
(833, 'Atisbo', 30, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(834, 'Saki East', 30, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(835, 'Saki West', 30, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(836, 'Irepo', 30, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(837, 'Olorunsogo', 30, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(838, 'Orelope', 30, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(839, 'Iseyin', 30, 'Oyo', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
(840, 'Kajola', 30, 'Oyo', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
(841, 'Ogbomoso North', 30, 'Oyo', 90, 'Oyo North', 304, 'Ogbomoso North / Ogbomoso South / Oriire'),
-- Oyo South SD (SD ID: 91)
(842, 'Ibadan North I', 30, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),
(843, 'Ibadan North II', 30, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),
(844, 'Ibadan North-East', 30, 'Oyo', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
(845, 'Ibadan South-East', 30, 'Oyo', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
(846, 'Ibadan North-West', 30, 'Oyo', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
(847, 'Ibadan South-West', 30, 'Oyo', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
(848, 'Ibarapa Central', 30, 'Oyo', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
(849, 'Ibarapa North', 30, 'Oyo', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
(850, 'Ido', 30, 'Oyo', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
(851, 'Ibarapa East', 30, 'Oyo', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
(852, 'Ibadan North III', 30, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),

-- ============================================================
-- PLATEAU STATE (state_id: 302) - 24 Seats
-- ============================================================
-- Plateau Central SD (SD ID: 92)
(853, 'Bokkos', 31, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(854, 'Mangu I', 31, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(855, 'Mangu II', 31, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(856, 'Pankshin', 31, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
(857, 'Kanke', 31, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
(858, 'Kanam', 31, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
-- Plateau North SD (SD ID: 93)
(859, 'Barkin Ladi', 31, 'Plateau', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
(860, 'Riyom', 31, 'Plateau', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
(861, 'Jos North I', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(862, 'Jos North II', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(863, 'Jos North III', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(864, 'Bassa', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(865, 'Jos South I', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(866, 'Jos South II', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(867, 'Jos East', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(868, 'Jos South III', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
-- Plateau South SD (SD ID: 94)
(869, 'Langtang North', 31, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(870, 'Langtang South I', 31, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(871, 'Langtang South II', 31, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(872, 'Mikang', 31, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(873, 'Quan Pan', 31, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(874, 'Shendam', 31, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(875, 'Wase I', 31, 'Plateau', 94, 'Plateau South', 317, 'Wase'),
(876, 'Wase II', 31, 'Plateau', 94, 'Plateau South', 317, 'Wase'),

-- ============================================================
-- RIVERS STATE (state_id: 4926) - 32 Seats
-- ============================================================
-- Rivers East SD (SD ID: 95)
(877, 'Etche', 32, 'Rivers', 95, 'Rivers East', 318, 'Etche / Omuma'),
(878, 'Omuma', 32, 'Rivers', 95, 'Rivers East', 318, 'Etche / Omuma'),
(879, 'Ikwerre', 32, 'Rivers', 95, 'Rivers East', 319, 'Ikwerre / Emohua'),
(880, 'Emohua', 32, 'Rivers', 95, 'Rivers East', 319, 'Ikwerre / Emohua'),
(881, 'Obio/Akpor I', 32, 'Rivers', 95, 'Rivers East', 320, 'Obio/Akpor'),
(882, 'Obio/Akpor II', 32, 'Rivers', 95, 'Rivers East', 320, 'Obio/Akpor'),
(883, 'Okrika', 32, 'Rivers', 95, 'Rivers East', 321, 'Okrika / Ogu/Bolo'),
(884, 'Ogu/Bolo', 32, 'Rivers', 95, 'Rivers East', 321, 'Okrika / Ogu/Bolo'),
(885, 'Port Harcourt I', 32, 'Rivers', 95, 'Rivers East', 322, 'Port Harcourt I'),
(886, 'Port Harcourt II', 32, 'Rivers', 95, 'Rivers East', 323, 'Port Harcourt II'),
(887, 'Port Harcourt III', 32, 'Rivers', 95, 'Rivers East', 322, 'Port Harcourt I'),
(888, 'Port Harcourt IV', 32, 'Rivers', 95, 'Rivers East', 323, 'Port Harcourt II'),
(889, 'Obio/Akpor III', 32, 'Rivers', 95, 'Rivers East', 320, 'Obio/Akpor'),
-- Rivers South-East SD (SD ID: 96)
(890, 'Andoni', 32, 'Rivers', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
(891, 'Opobo-Nkoro', 32, 'Rivers', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
(892, 'Gokana', 32, 'Rivers', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
(893, 'Khana', 32, 'Rivers', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
(894, 'Eleme', 32, 'Rivers', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
(895, 'Tai', 32, 'Rivers', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
-- Rivers West SD (SD ID: 97)
(896, 'Abua/Odual I', 32, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(897, 'Abua/Odual II', 32, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(898, 'Ahoada East', 32, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(899, 'Ahoada West', 32, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(900, 'Ogba/Egbema/Ndoni I', 32, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(901, 'Ogba/Egbema/Ndoni II', 32, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(902, 'Degema', 32, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),
(903, 'Bonny', 32, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),
(904, 'Asari-Toru I', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(905, 'Asari-Toru II', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(906, 'Akuku-Toru I', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(907, 'Akuku-Toru II', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(908, 'Degema II', 32, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),

-- ============================================================
-- SOKOTO STATE (state_id: 292) - 30 Seats
-- ============================================================
-- Sokoto East SD (SD ID: 98)
(909, 'Gada', 33, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(910, 'Goronyo I', 33, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(911, 'Goronyo II', 33, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(912, 'Isa', 33, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(913, 'Sabon Birni I', 33, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(914, 'Sabon Birni II', 33, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(915, 'Illela', 33, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(916, 'Gwadabawa I', 33, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(917, 'Gwadabawa II', 33, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(918, 'Rabah', 33, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
(919, 'Wurno I', 33, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
(920, 'Wurno II', 33, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
-- Sokoto North SD (SD ID: 99)
(921, 'Binji', 33, 'Sokoto', 99, 'Sokoto North', 335, 'Binji / Silame'),
(922, 'Silame', 33, 'Sokoto', 99, 'Sokoto North', 335, 'Binji / Silame'),
(923, 'Kware', 33, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(924, 'Wamako I', 33, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(925, 'Wamako II', 33, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(926, 'Sokoto North I', 33, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(927, 'Sokoto North II', 33, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(928, 'Sokoto South', 33, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(929, 'Tangaza', 33, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
(930, 'Gudu I', 33, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
(931, 'Gudu II', 33, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
-- Sokoto South SD (SD ID: 100)
(932, 'Kebbe', 33, 'Sokoto', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
(933, 'Tambuwal', 33, 'Sokoto', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
(934, 'Bodinga', 33, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(935, 'Dange-Shuni', 33, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(936, 'Tureta', 33, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(937, 'Yabo', 33, 'Sokoto', 100, 'Sokoto South', 341, 'Yabo / Shagari'),
(938, 'Shagari', 33, 'Sokoto', 100, 'Sokoto South', 341, 'Yabo / Shagari'),

-- ============================================================
-- TARABA STATE (state_id: 319) - 24 Seats
-- ============================================================
-- Taraba North SD (SD ID: 101)
(939, 'Jalingo I', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(940, 'Jalingo II', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(941, 'Yorro', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(942, 'Zing', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(943, 'Karim Lamido I', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(944, 'Karim Lamido II', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(945, 'Lau', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(946, 'Ardo-Kola', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
-- Taraba Central SD (SD ID: 102)
(947, 'Bali I', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(948, 'Bali II', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(949, 'Gassol I', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(950, 'Gassol II', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(951, 'Sardauna', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(952, 'Gashaka', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(953, 'Kurmi I', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(954, 'Kurmi II', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
-- Taraba South SD (SD ID: 103)
(955, 'Donga', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(956, 'Ussa', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(957, 'Takum I', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(958, 'Takum II', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(959, 'Wukari I', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(960, 'Wukari II', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(961, 'Ibi I', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(962, 'Ibi II', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),

-- ============================================================
-- YOBE STATE (state_id: 297) - 24 Seats
-- ============================================================
-- Yobe North SD (SD ID: 104)
(963, 'Bade I', 35, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(964, 'Bade II', 35, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(965, 'Jakusko', 35, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(966, 'Machina', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(967, 'Nguru', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(968, 'Karasuwa', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(969, 'Yusufari I', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(970, 'Yusufari II', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
-- Yobe East SD (SD ID: 105)
(971, 'Damaturu I', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(972, 'Damaturu II', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(973, 'Gujba', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(974, 'Gulani', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(975, 'Tarmuwa', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(976, 'Geidam', 35, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
(977, 'Yunusari', 35, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
(978, 'Bursari', 35, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
-- Yobe South SD (SD ID: 106)
(979, 'Fika I', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(980, 'Fika II', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(981, 'Fune I', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(982, 'Fune II', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(983, 'Potiskum I', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(984, 'Potiskum II', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(985, 'Nangere I', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(986, 'Nangere II', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),

-- ============================================================
-- ZAMFARA STATE (state_id: 299) - 24 Seats
-- ============================================================
-- Zamfara North SD (SD ID: 107)
(987, 'Zurmi I', 36, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(988, 'Zurmi II', 36, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(989, 'Shinkafi', 36, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(990, 'Kaura Namoda', 36, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
(991, 'Birnin Magaji I', 36, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
(992, 'Birnin Magaji II', 36, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
-- Zamfara Central SD (SD ID: 108)
(993, 'Gusau I', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(994, 'Gusau II', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(995, 'Gusau III', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(996, 'Tsafe I', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(997, 'Tsafe II', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(998, 'Bungudu I', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(999, 'Bungudu II', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(1000, 'Bungudu III', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(1001, 'Maru I', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(1002, 'Maru II', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
-- Zamfara West SD (SD ID: 109)
(1003, 'Bakura', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(1004, 'Maradun', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(1005, 'Talata Mafara I', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(1006, 'Talata Mafara II', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(1007, 'Anka I', 36, 'Zamfara', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
(1008, 'Anka II', 36, 'Zamfara', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
(1009, 'Gummi', 36, 'Zamfara', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum'),
(1010, 'Bukkuyum', 36, 'Zamfara', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum');

-- +goose Down
DROP TABLE IF EXISTS state_assembly_constituencies;
