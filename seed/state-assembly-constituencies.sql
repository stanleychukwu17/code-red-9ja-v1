-- 1. Create the State Assembly Constituencies Table
CREATE TABLE IF NOT EXISTS state_assembly_constituencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    state_id INTEGER NOT NULL,
    state_name VARCHAR(255) NOT NULL,
    senatorial_district_id INTEGER NOT NULL,
    senatorial_district_name VARCHAR(255) NOT NULL,
    federal_constituency_id INTEGER NOT NULL,
    federal_constituency_name VARCHAR(255) NOT NULL
);

INSERT INTO state_assembly_constituencies (id, name, code, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name) VALUES

-- ============================================================
-- ABIA STATE (state_id: 303) - 24 Seats
-- ============================================================
-- Abia North SD (SD ID: 1)
(1, 'Arochukwu I', 'SAC/001/AB', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(2, 'Arochukwu II', 'SAC/002/AB', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(3, 'Ohafia North', 'SAC/003/AB', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(4, 'Ohafia South', 'SAC/004/AB', 1, 'Abia', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
(5, 'Bende', 'SAC/005/AB', 1, 'Abia', 1, 'Abia North', 2, 'Bende'),
(6, 'Isuikwuato', 'SAC/006/AB', 1, 'Abia', 1, 'Abia North', 3, 'Isuikwuato / Umunneochi'),
(7, 'Umunneochi', 'SAC/007/AB', 1, 'Abia', 1, 'Abia North', 3, 'Isuikwuato / Umunneochi'),
-- Abia Central SD (SD ID: 2)
(8, 'Isiala Ngwa North', 'SAC/008/AB', 1, 'Abia', 2, 'Abia Central', 4, 'Isiala Ngwa North / Isiala Ngwa South'),
(9, 'Isiala Ngwa South', 'SAC/009/AB', 1, 'Abia', 2, 'Abia Central', 4, 'Isiala Ngwa North / Isiala Ngwa South'),
(10, 'Obingwa I', 'SAC/010/AB', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(11, 'Obingwa II', 'SAC/011/AB', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(12, 'Ugwunagbo', 'SAC/012/AB', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(13, 'Osisioma', 'SAC/013/AB', 1, 'Abia', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
(14, 'Ikwuano', 'SAC/014/AB', 1, 'Abia', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
(15, 'Umuahia North', 'SAC/015/AB', 1, 'Abia', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
(16, 'Umuahia South', 'SAC/016/AB', 1, 'Abia', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
-- Abia South SD (SD ID: 3)
(17, 'Aba North I', 'SAC/017/AB', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(18, 'Aba North II', 'SAC/018/AB', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(19, 'Aba South I', 'SAC/019/AB', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(20, 'Aba South II', 'SAC/020/AB', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(21, 'Aba South III', 'SAC/021/AB', 1, 'Abia', 3, 'Abia South', 7, 'Aba North / Aba South'),
(22, 'Ukwa East', 'SAC/022/AB', 1, 'Abia', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),
(23, 'Ukwa West', 'SAC/023/AB', 1, 'Abia', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),
(24, 'Obi Ngwa', 'SAC/024/AB', 1, 'Abia', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),

-- ============================================================
-- ADAMAWA STATE (state_id: 320) - 25 Seats
-- ============================================================
-- Adamawa North SD (SD ID: 4)
(25, 'Michika', 'SAC/001/AD', 2, 'Adamawa', 4, 'Adamawa North', 9, 'Michika / Madagali'),
(26, 'Madagali', 'SAC/002/AD', 2, 'Adamawa', 4, 'Adamawa North', 9, 'Michika / Madagali'),
(27, 'Mubi North I', 'SAC/003/AD', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
(28, 'Mubi North II', 'SAC/004/AD', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
(29, 'Mubi South', 'SAC/005/AD', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
(30, 'Maiha', 'SAC/006/AD', 2, 'Adamawa', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
-- Adamawa Central SD (SD ID: 6)
(31, 'Fufure', 'SAC/007/AD', 2, 'Adamawa', 6, 'Adamawa Central', 11, 'Fufore / Song'),
(32, 'Song I', 'SAC/008/AD', 2, 'Adamawa', 6, 'Adamawa Central', 11, 'Fufore / Song'),
(33, 'Song II', 'SAC/009/AD', 2, 'Adamawa', 6, 'Adamawa Central', 11, 'Fufore / Song'),
(34, 'Hong', 'SAC/010/AD', 2, 'Adamawa', 6, 'Adamawa Central', 12, 'Hong / Gombi'),
(35, 'Gombi', 'SAC/011/AD', 2, 'Adamawa', 6, 'Adamawa Central', 12, 'Hong / Gombi'),
(36, 'Yola North I', 'SAC/012/AD', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
(37, 'Yola North II', 'SAC/013/AD', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
(38, 'Yola South', 'SAC/014/AD', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
(39, 'Girei', 'SAC/015/AD', 2, 'Adamawa', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
-- Adamawa South SD (SD ID: 5)
(40, 'Demsa', 'SAC/016/AD', 2, 'Adamawa', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
(41, 'Numan', 'SAC/017/AD', 2, 'Adamawa', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
(42, 'Lamurde', 'SAC/018/AD', 2, 'Adamawa', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
(43, 'Guyuk', 'SAC/019/AD', 2, 'Adamawa', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
(44, 'Shelleng', 'SAC/020/AD', 2, 'Adamawa', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
(45, 'Gayuk', 'SAC/021/AD', 2, 'Adamawa', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
(46, 'Jada', 'SAC/022/AD', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
(47, 'Ganye', 'SAC/023/AD', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
(48, 'Mayo-Belwa', 'SAC/024/AD', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
(49, 'Toungo', 'SAC/025/AD', 2, 'Adamawa', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),

-- ============================================================
-- AKWA IBOM STATE (state_id: 304) - 26 Seats
-- ============================================================
-- AK North-East SD (SD ID: 7)
(50, 'Etinan', 'SAC/001/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
(51, 'Nsit Ibom', 'SAC/002/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
(52, 'Nsit Ubium', 'SAC/003/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
(53, 'Itu', 'SAC/004/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 18, 'Itu / Ibiono Ibom'),
(54, 'Ibiono Ibom', 'SAC/005/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 18, 'Itu / Ibiono Ibom'),
(55, 'Uyo I', 'SAC/006/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
(56, 'Uyo II', 'SAC/007/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
(57, 'Uruan', 'SAC/008/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
(58, 'Nsit Atai', 'SAC/009/AK', 3, 'Akwa Ibom', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
-- AK North-West SD (SD ID: 8)
(59, 'Abak', 'SAC/010/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
(60, 'Etim Ekpo', 'SAC/011/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
(61, 'Ika', 'SAC/012/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
(62, 'Ikono', 'SAC/013/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 21, 'Ikono / Ini'),
(63, 'Ini', 'SAC/014/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 21, 'Ikono / Ini'),
(64, 'Ikot Ekpene', 'SAC/015/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
(65, 'Essien Udim', 'SAC/016/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
(66, 'Obot Akara', 'SAC/017/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
(67, 'Ukanafun', 'SAC/018/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 26, 'Ukanafun / Oruk Anam'),
(68, 'Oruk Anam', 'SAC/019/AK', 3, 'Akwa Ibom', 8, 'Akwa Ibom North-West', 26, 'Ukanafun / Oruk Anam'),
-- AK South SD (SD ID: 9)
(69, 'Eket', 'SAC/020/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
(70, 'Esit Eket', 'SAC/021/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
(71, 'Onna', 'SAC/022/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
(72, 'Ikot Abasi', 'SAC/023/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
(73, 'Mkpat Enin', 'SAC/024/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
(74, 'Eastern Obolo', 'SAC/025/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
(75, 'Oron', 'SAC/026/AK', 3, 'Akwa Ibom', 9, 'Akwa Ibom South', 25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko'),

-- ============================================================
-- ANAMBRA STATE (state_id: 315) - 30 Seats
-- ============================================================
-- Anambra North SD (SD ID: 10)
(76, 'Anambra East', 'SAC/001/AN', 4, 'Anambra', 10, 'Anambra North', 27, 'Anambra East / Anambra West'),
(77, 'Anambra West', 'SAC/002/AN', 4, 'Anambra', 10, 'Anambra North', 27, 'Anambra East / Anambra West'),
(78, 'Ogbaru I', 'SAC/003/AN', 4, 'Anambra', 10, 'Anambra North', 28, 'Ogbaru'),
(79, 'Ogbaru II', 'SAC/004/AN', 4, 'Anambra', 10, 'Anambra North', 28, 'Ogbaru'),
(80, 'Onitsha North I', 'SAC/005/AN', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(81, 'Onitsha North II', 'SAC/006/AN', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(82, 'Onitsha South I', 'SAC/007/AN', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(83, 'Onitsha South II', 'SAC/008/AN', 4, 'Anambra', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
(84, 'Oyi', 'SAC/009/AN', 4, 'Anambra', 10, 'Anambra North', 30, 'Oyi / Ayamelum'),
(85, 'Ayamelum', 'SAC/010/AN', 4, 'Anambra', 10, 'Anambra North', 30, 'Oyi / Ayamelum'),
-- Anambra Central SD (SD ID: 11)
(86, 'Awka North', 'SAC/011/AN', 4, 'Anambra', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
(87, 'Awka South I', 'SAC/012/AN', 4, 'Anambra', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
(88, 'Awka South II', 'SAC/013/AN', 4, 'Anambra', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
(89, 'Idemili North I', 'SAC/014/AN', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(90, 'Idemili North II', 'SAC/015/AN', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(91, 'Idemili South I', 'SAC/016/AN', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(92, 'Idemili South II', 'SAC/017/AN', 4, 'Anambra', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
(93, 'Njikoka', 'SAC/018/AN', 4, 'Anambra', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
(94, 'Dunukofia', 'SAC/019/AN', 4, 'Anambra', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
(95, 'Anaocha', 'SAC/020/AN', 4, 'Anambra', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
-- Anambra South SD (SD ID: 12)
(96, 'Aguata I', 'SAC/021/AN', 4, 'Anambra', 12, 'Anambra South', 34, 'Aguata'),
(97, 'Aguata II', 'SAC/022/AN', 4, 'Anambra', 12, 'Anambra South', 34, 'Aguata'),
(98, 'Ihiala I', 'SAC/023/AN', 4, 'Anambra', 12, 'Anambra South', 35, 'Ihiala'),
(99, 'Ihiala II', 'SAC/024/AN', 4, 'Anambra', 12, 'Anambra South', 35, 'Ihiala'),
(100, 'Nnewi North', 'SAC/025/AN', 4, 'Anambra', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
(101, 'Nnewi South', 'SAC/026/AN', 4, 'Anambra', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
(102, 'Ekwusigo', 'SAC/027/AN', 4, 'Anambra', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
(103, 'Orumba North', 'SAC/028/AN', 4, 'Anambra', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),
(104, 'Orumba South I', 'SAC/029/AN', 4, 'Anambra', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),
(105, 'Orumba South II', 'SAC/030/AN', 4, 'Anambra', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),

-- ============================================================
-- BAUCHI STATE (state_id: 312) - 31 Seats
-- ============================================================
-- Bauchi South SD (SD ID: 13)
(106, 'Alkaleri', 'SAC/001/BA', 5, 'Bauchi', 13, 'Bauchi South', 38, 'Alkaleri / Kirfi'),
(107, 'Kirfi', 'SAC/002/BA', 5, 'Bauchi', 13, 'Bauchi South', 38, 'Alkaleri / Kirfi'),
(108, 'Bauchi I', 'SAC/003/BA', 5, 'Bauchi', 13, 'Bauchi South', 39, 'Bauchi'),
(109, 'Bauchi II', 'SAC/004/BA', 5, 'Bauchi', 13, 'Bauchi South', 39, 'Bauchi'),
(110, 'Bauchi III', 'SAC/005/BA', 5, 'Bauchi', 13, 'Bauchi South', 39, 'Bauchi'),
(111, 'Bogoro', 'SAC/006/BA', 5, 'Bauchi', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
(112, 'Dass', 'SAC/007/BA', 5, 'Bauchi', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
(113, 'Tafawa Balewa', 'SAC/008/BA', 5, 'Bauchi', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
(114, 'Toro I', 'SAC/009/BA', 5, 'Bauchi', 13, 'Bauchi South', 41, 'Toro'),
(115, 'Toro II', 'SAC/010/BA', 5, 'Bauchi', 13, 'Bauchi South', 41, 'Toro'),
-- Bauchi Central SD (SD ID: 14)
(116, 'Darazo', 'SAC/011/BA', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(117, 'Ganjuwa I', 'SAC/012/BA', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(118, 'Ganjuwa II', 'SAC/013/BA', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(119, 'Misau', 'SAC/014/BA', 5, 'Bauchi', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
(120, 'Dambam', 'SAC/015/BA', 5, 'Bauchi', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
(121, 'Ningi I', 'SAC/016/BA', 5, 'Bauchi', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
(122, 'Ningi II', 'SAC/017/BA', 5, 'Bauchi', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
(123, 'Warji', 'SAC/018/BA', 5, 'Bauchi', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
(124, 'Damban', 'SAC/019/BA', 5, 'Bauchi', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
(125, 'Misau II', 'SAC/020/BA', 5, 'Bauchi', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
-- Bauchi North SD (SD ID: 15)
(126, 'Gamawa I', 'SAC/021/BA', 5, 'Bauchi', 15, 'Bauchi North', 45, 'Gamawa'),
(127, 'Gamawa II', 'SAC/022/BA', 5, 'Bauchi', 15, 'Bauchi North', 45, 'Gamawa'),
(128, 'Jamaare', 'SAC/023/BA', 5, 'Bauchi', 15, 'Bauchi North', 46, 'Jamaare / Itas-Gadau'),
(129, 'Itas-Gadau', 'SAC/024/BA', 5, 'Bauchi', 15, 'Bauchi North', 46, 'Jamaare / Itas-Gadau'),
(130, 'Katagum I', 'SAC/025/BA', 5, 'Bauchi', 15, 'Bauchi North', 47, 'Katagum'),
(131, 'Katagum II', 'SAC/026/BA', 5, 'Bauchi', 15, 'Bauchi North', 47, 'Katagum'),
(132, 'Katagum III', 'SAC/027/BA', 5, 'Bauchi', 15, 'Bauchi North', 47, 'Katagum'),
(133, 'Shira', 'SAC/028/BA', 5, 'Bauchi', 15, 'Bauchi North', 48, 'Shira / Giade'),
(134, 'Giade', 'SAC/029/BA', 5, 'Bauchi', 15, 'Bauchi North', 48, 'Shira / Giade'),
(135, 'Zaki I', 'SAC/030/BA', 5, 'Bauchi', 15, 'Bauchi North', 49, 'Zaki'),
(136, 'Zaki II', 'SAC/031/BA', 5, 'Bauchi', 15, 'Bauchi North', 49, 'Zaki'),

-- ============================================================
-- BAYELSA STATE (state_id: 305) - 24 Seats
-- ============================================================
-- Bayelsa East SD (SD ID: 16)
(137, 'Brass I', 'SAC/001/BY', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(138, 'Brass II', 'SAC/002/BY', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(139, 'Brass III', 'SAC/003/BY', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(140, 'Nembe I', 'SAC/004/BY', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(141, 'Nembe II', 'SAC/005/BY', 6, 'Bayelsa', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
(142, 'Ogbia I', 'SAC/006/BY', 6, 'Bayelsa', 16, 'Bayelsa East', 51, 'Ogbia'),
(143, 'Ogbia II', 'SAC/007/BY', 6, 'Bayelsa', 16, 'Bayelsa East', 51, 'Ogbia'),
(144, 'Ogbia III', 'SAC/008/BY', 6, 'Bayelsa', 16, 'Bayelsa East', 51, 'Ogbia'),
-- Bayelsa Central SD (SD ID: 17)
(145, 'Southern Ijaw I', 'SAC/009/BY', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(146, 'Southern Ijaw II', 'SAC/010/BY', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(147, 'Southern Ijaw III', 'SAC/011/BY', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(148, 'Southern Ijaw IV', 'SAC/012/BY', 6, 'Bayelsa', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
(149, 'Kolokuma/Opokuma I', 'SAC/013/BY', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
(150, 'Kolokuma/Opokuma II', 'SAC/014/BY', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
(151, 'Yenagoa I', 'SAC/015/BY', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
(152, 'Yenagoa II', 'SAC/016/BY', 6, 'Bayelsa', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
-- Bayelsa West SD (SD ID: 18)
(153, 'Sagbama I', 'SAC/017/BY', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(154, 'Sagbama II', 'SAC/018/BY', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(155, 'Sagbama III', 'SAC/019/BY', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(156, 'Sagbama IV', 'SAC/020/BY', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(157, 'Ekeremor I', 'SAC/021/BY', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(158, 'Ekeremor II', 'SAC/022/BY', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(159, 'Ekeremor III', 'SAC/023/BY', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
(160, 'Ekeremor IV', 'SAC/024/BY', 6, 'Bayelsa', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),

-- ============================================================
-- BENUE STATE (state_id: 291) - 29 Seats
-- ============================================================
-- Benue North-East SD (SD ID: 19)
(161, 'Katsina-Ala I', 'SAC/001/BN', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(162, 'Katsina-Ala II', 'SAC/002/BN', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(163, 'Ukum', 'SAC/003/BN', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(164, 'Logo', 'SAC/004/BN', 7, 'Benue', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
(165, 'Konshisha', 'SAC/005/BN', 7, 'Benue', 19, 'Benue North-East', 56, 'Konshisha / Vandeikya'),
(166, 'Vandeikya', 'SAC/006/BN', 7, 'Benue', 19, 'Benue North-East', 56, 'Konshisha / Vandeikya'),
(167, 'Kwande I', 'SAC/007/BN', 7, 'Benue', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
(168, 'Kwande II', 'SAC/008/BN', 7, 'Benue', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
(169, 'Ushongo', 'SAC/009/BN', 7, 'Benue', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
-- Benue North-West SD (SD ID: 20)
(170, 'Buruku I', 'SAC/010/BN', 7, 'Benue', 20, 'Benue North-West', 58, 'Buruku'),
(171, 'Buruku II', 'SAC/011/BN', 7, 'Benue', 20, 'Benue North-West', 58, 'Buruku'),
(172, 'Gboko I', 'SAC/012/BN', 7, 'Benue', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
(173, 'Gboko II', 'SAC/013/BN', 7, 'Benue', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
(174, 'Tarka', 'SAC/014/BN', 7, 'Benue', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
(175, 'Guma', 'SAC/015/BN', 7, 'Benue', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
(176, 'Makurdi I', 'SAC/016/BN', 7, 'Benue', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
(177, 'Makurdi II', 'SAC/017/BN', 7, 'Benue', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
(178, 'Gwer East', 'SAC/018/BN', 7, 'Benue', 20, 'Benue North-West', 61, 'Gwer East / Gwer West'),
(179, 'Gwer West', 'SAC/019/BN', 7, 'Benue', 20, 'Benue North-West', 61, 'Gwer East / Gwer West'),

-- Benue South SD (SD ID: 21)
(180, 'Ado', 'SAC/020/BN', 7, 'Benue', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
(181, 'Ogbadibo', 'SAC/021/BN', 7, 'Benue', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
(182, 'Okpokwu', 'SAC/022/BN', 7, 'Benue', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
(183, 'Apa', 'SAC/023/BN', 7, 'Benue', 21, 'Benue South', 63, 'Apa / Agatu'),
(184, 'Agatu', 'SAC/024/BN', 7, 'Benue', 21, 'Benue South', 63, 'Apa / Agatu'),
(185, 'Oju', 'SAC/025/BN', 7, 'Benue', 21, 'Benue South', 64, 'Oju / Obi'),
(186, 'Obi', 'SAC/026/BN', 7, 'Benue', 21, 'Benue South', 64, 'Oju / Obi'),
(187, 'Otukpo I', 'SAC/027/BN', 7, 'Benue', 21, 'Benue South', 65, 'Otukpo / Ohimini'),
(188, 'Otukpo II', 'SAC/028/BN', 7, 'Benue', 21, 'Benue South', 65, 'Otukpo / Ohimini'),
(189, 'Ohimini', 'SAC/029/BN', 7, 'Benue', 21, 'Benue South', 65, 'Otukpo / Ohimini'),

-- ============================================================
-- BORNO STATE (state_id: 307) - 28 Seats
-- ============================================================
-- Borno North SD (SD ID: 22)
(190, 'Kaga', 'SAC/001/BO', 8, 'Borno', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
(191, 'Gubio', 'SAC/002/BO', 8, 'Borno', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
(192, 'Magumeri', 'SAC/003/BO', 8, 'Borno', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
(193, 'Kukawa', 'SAC/004/BO', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(194, 'Mobbar', 'SAC/005/BO', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(195, 'Abadam', 'SAC/006/BO', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(196, 'Guzamala', 'SAC/007/BO', 8, 'Borno', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
(197, 'Monguno', 'SAC/008/BO', 8, 'Borno', 22, 'Borno North', 68, 'Monguno / Nganzai / Marte'),
(198, 'Nganzai', 'SAC/009/BO', 8, 'Borno', 22, 'Borno North', 68, 'Monguno / Nganzai / Marte'),
-- Borno Central SD (SD ID: 23)
(199, 'Bama', 'SAC/010/BO', 8, 'Borno', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
(200, 'Ngala', 'SAC/011/BO', 8, 'Borno', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
(201, 'Kala-Balge', 'SAC/012/BO', 8, 'Borno', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
(202, 'Dikwa', 'SAC/013/BO', 8, 'Borno', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
(203, 'Mafa', 'SAC/014/BO', 8, 'Borno', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
(204, 'Konduga', 'SAC/015/BO', 8, 'Borno', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
(205, 'Jere', 'SAC/016/BO', 8, 'Borno', 23, 'Borno Central', 71, 'Jere'),
(206, 'Maiduguri I', 'SAC/017/BO', 8, 'Borno', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
(207, 'Maiduguri II', 'SAC/018/BO', 8, 'Borno', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
(208, 'Maiduguri III', 'SAC/019/BO', 8, 'Borno', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
-- Borno South SD (SD ID: 24)
(209, 'Askira-Uba', 'SAC/020/BO', 8, 'Borno', 24, 'Borno South', 73, 'Askira-Uba / Hawul'),
(210, 'Hawul', 'SAC/021/BO', 8, 'Borno', 24, 'Borno South', 73, 'Askira-Uba / Hawul'),
(211, 'Biu', 'SAC/022/BO', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(212, 'Kwaya Kusar', 'SAC/023/BO', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(213, 'Shani', 'SAC/024/BO', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(214, 'Bayo', 'SAC/025/BO', 8, 'Borno', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
(215, 'Damboa', 'SAC/026/BO', 8, 'Borno', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),
(216, 'Gwoza', 'SAC/027/BO', 8, 'Borno', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),
(217, 'Chibok', 'SAC/028/BO', 8, 'Borno', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),

-- ============================================================
-- CROSS RIVER STATE (state_id: 314) - 25 Seats
-- ============================================================
-- Cross River North SD (SD ID: 25)
(218, 'Obanliku', 'SAC/001/CR', 9, 'Cross River', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
(219, 'Obudu', 'SAC/002/CR', 9, 'Cross River', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
(220, 'Bekwarra', 'SAC/003/CR', 9, 'Cross River', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
(221, 'Ogoja', 'SAC/004/CR', 9, 'Cross River', 25, 'Cross River North', 77, 'Ogoja / Yala'),
(222, 'Yala I', 'SAC/005/CR', 9, 'Cross River', 25, 'Cross River North', 77, 'Ogoja / Yala'),
(223, 'Yala II', 'SAC/006/CR', 9, 'Cross River', 25, 'Cross River North', 77, 'Ogoja / Yala'),
-- Cross River Central SD (SD ID: 26)
(224, 'Abi', 'SAC/007/CR', 9, 'Cross River', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
(225, 'Yakurr I', 'SAC/008/CR', 9, 'Cross River', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
(226, 'Yakurr II', 'SAC/009/CR', 9, 'Cross River', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
(227, 'Boki', 'SAC/010/CR', 9, 'Cross River', 26, 'Cross River Central', 79, 'Boki / Ikom'),
(228, 'Ikom I', 'SAC/011/CR', 9, 'Cross River', 26, 'Cross River Central', 79, 'Boki / Ikom'),
(229, 'Ikom II', 'SAC/012/CR', 9, 'Cross River', 26, 'Cross River Central', 79, 'Boki / Ikom'),
(230, 'Obubra', 'SAC/013/CR', 9, 'Cross River', 26, 'Cross River Central', 80, 'Obubra / Etung'),
(231, 'Etung', 'SAC/014/CR', 9, 'Cross River', 26, 'Cross River Central', 80, 'Obubra / Etung'),
(232, 'Obubra II', 'SAC/015/CR', 9, 'Cross River', 26, 'Cross River Central', 80, 'Obubra / Etung'),
-- Cross River South SD (SD ID: 27)
(233, 'Akamkpa', 'SAC/016/CR', 9, 'Cross River', 27, 'Cross River South', 81, 'Akamkpa / Biase'),
(234, 'Biase', 'SAC/017/CR', 9, 'Cross River', 27, 'Cross River South', 81, 'Akamkpa / Biase'),
(235, 'Calabar Municipal I', 'SAC/018/CR', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
(236, 'Calabar Municipal II', 'SAC/019/CR', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
(237, 'Odukpani', 'SAC/020/CR', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
(238, 'Calabar South I', 'SAC/021/CR', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(239, 'Calabar South II', 'SAC/022/CR', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(240, 'Akpabuyo', 'SAC/023/CR', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(241, 'Bakassi', 'SAC/024/CR', 9, 'Cross River', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
(242, 'Calabar Municipal III', 'SAC/025/CR', 9, 'Cross River', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),

-- ============================================================
-- DELTA STATE (state_id: 316) - 29 Seats
-- ============================================================
-- Delta Central SD (SD ID: 28)
(243, 'Ethiope East', 'SAC/001/DE', 10, 'Delta', 28, 'Delta Central', 84, 'Ethiope East / Ethiope West'),
(244, 'Ethiope West', 'SAC/002/DE', 10, 'Delta', 28, 'Delta Central', 84, 'Ethiope East / Ethiope West'),
(245, 'Okpe', 'SAC/003/DE', 10, 'Delta', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
(246, 'Sapele', 'SAC/004/DE', 10, 'Delta', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
(247, 'Uvwie', 'SAC/005/DE', 10, 'Delta', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
(248, 'Ughelli North I', 'SAC/006/DE', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
(249, 'Ughelli North II', 'SAC/007/DE', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
(250, 'Ughelli South', 'SAC/008/DE', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
(251, 'Udu', 'SAC/009/DE', 10, 'Delta', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
-- Delta North SD (SD ID: 29)
(252, 'Aniocha North', 'SAC/010/DE', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(253, 'Aniocha South', 'SAC/011/DE', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(254, 'Oshimili North', 'SAC/012/DE', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(255, 'Oshimili South', 'SAC/013/DE', 10, 'Delta', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
(256, 'Ika North East', 'SAC/014/DE', 10, 'Delta', 29, 'Delta North', 88, 'Ika North East / Ika South'),
(257, 'Ika South', 'SAC/015/DE', 10, 'Delta', 29, 'Delta North', 88, 'Ika North East / Ika South'),
(258, 'Ndokwa East', 'SAC/016/DE', 10, 'Delta', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
(259, 'Ndokwa West', 'SAC/017/DE', 10, 'Delta', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
(260, 'Ukwuani', 'SAC/018/DE', 10, 'Delta', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
-- Delta South SD (SD ID: 30)
(261, 'Bomadi', 'SAC/019/DE', 10, 'Delta', 30, 'Delta South', 90, 'Bomadi / Patani'),
(262, 'Patani', 'SAC/020/DE', 10, 'Delta', 30, 'Delta South', 90, 'Bomadi / Patani'),
(263, 'Burutu I', 'SAC/021/DE', 10, 'Delta', 30, 'Delta South', 91, 'Burutu'),
(264, 'Burutu II', 'SAC/022/DE', 10, 'Delta', 30, 'Delta South', 91, 'Burutu'),
(265, 'Burutu III', 'SAC/023/DE', 10, 'Delta', 30, 'Delta South', 91, 'Burutu'),
(266, 'Isoko North', 'SAC/024/DE', 10, 'Delta', 30, 'Delta South', 92, 'Isoko North / Isoko South'),
(267, 'Isoko South', 'SAC/025/DE', 10, 'Delta', 30, 'Delta South', 92, 'Isoko North / Isoko South'),
(268, 'Warri North', 'SAC/026/DE', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
(269, 'Warri South I', 'SAC/027/DE', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
(270, 'Warri South II', 'SAC/028/DE', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
(271, 'Warri South West', 'SAC/029/DE', 10, 'Delta', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),

-- ============================================================
-- EBONYI STATE (state_id: 311) - 24 Seats
-- ============================================================
-- Ebonyi North SD (SD ID: 31)
(272, 'Abakaliki I', 'SAC/001/EB', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(273, 'Abakaliki II', 'SAC/002/EB', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(274, 'Abakaliki III', 'SAC/003/EB', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(275, 'Izzi I', 'SAC/004/EB', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(276, 'Izzi II', 'SAC/005/EB', 11, 'Ebonyi', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
(277, 'Ebonyi', 'SAC/006/EB', 11, 'Ebonyi', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
(278, 'Ohaukwu I', 'SAC/007/EB', 11, 'Ebonyi', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
(279, 'Ohaukwu II', 'SAC/008/EB', 11, 'Ebonyi', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
-- Ebonyi Central SD (SD ID: 32)
(280, 'Ezza North I', 'SAC/009/EB', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(281, 'Ezza North II', 'SAC/010/EB', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(282, 'Ishielu I', 'SAC/011/EB', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(283, 'Ishielu II', 'SAC/012/EB', 11, 'Ebonyi', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
(284, 'Ezza South', 'SAC/013/EB', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
(285, 'Ikwo I', 'SAC/014/EB', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
(286, 'Ikwo II', 'SAC/015/EB', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
(287, 'Ikwo III', 'SAC/016/EB', 11, 'Ebonyi', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
-- Ebonyi South SD (SD ID: 33)
(288, 'Afikpo North I', 'SAC/017/EB', 11, 'Ebonyi', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
(289, 'Afikpo North II', 'SAC/018/EB', 11, 'Ebonyi', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
(290, 'Afikpo South (Edda)', 'SAC/019/EB', 11, 'Ebonyi', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
(291, 'Ivo', 'SAC/020/EB', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(292, 'Ohaozara I', 'SAC/021/EB', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(293, 'Ohaozara II', 'SAC/022/EB', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(294, 'Onicha I', 'SAC/023/EB', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
(295, 'Onicha II', 'SAC/024/EB', 11, 'Ebonyi', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),

-- ============================================================
-- EDO STATE (state_id: 318) - 24 Seats
-- ============================================================
-- Edo South SD (SD ID: 34)
(296, 'Egor', 'SAC/001/ED', 12, 'Edo', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
(297, 'Ikpoba-Okha I', 'SAC/002/ED', 12, 'Edo', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
(298, 'Ikpoba-Okha II', 'SAC/003/ED', 12, 'Edo', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
(299, 'Oredo I', 'SAC/004/ED', 12, 'Edo', 34, 'Edo South', 101, 'Oredo'),
(300, 'Oredo II', 'SAC/005/ED', 12, 'Edo', 34, 'Edo South', 101, 'Oredo'),
(301, 'Orhionmwon', 'SAC/006/ED', 12, 'Edo', 34, 'Edo South', 102, 'Orhionmwon / Uhunmwonde'),
(302, 'Uhunmwonde', 'SAC/007/ED', 12, 'Edo', 34, 'Edo South', 102, 'Orhionmwon / Uhunmwonde'),
(303, 'Ovia North-East', 'SAC/008/ED', 12, 'Edo', 34, 'Edo South', 103, 'Ovia North-East / Ovia South-West'),
(304, 'Ovia South-West', 'SAC/009/ED', 12, 'Edo', 34, 'Edo South', 103, 'Ovia North-East / Ovia South-West'),
-- Edo Central SD (SD ID: 35)
(305, 'Esan Central', 'SAC/010/ED', 12, 'Edo', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
(306, 'Esan West', 'SAC/011/ED', 12, 'Edo', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
(307, 'Igueben', 'SAC/012/ED', 12, 'Edo', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
(308, 'Esan North-East', 'SAC/013/ED', 12, 'Edo', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
(309, 'Esan South-East I', 'SAC/014/ED', 12, 'Edo', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
(310, 'Esan South-East II', 'SAC/015/ED', 12, 'Edo', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
-- Edo North SD (SD ID: 36)
(311, 'Etsako Central', 'SAC/016/ED', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(312, 'Etsako East', 'SAC/017/ED', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(313, 'Etsako West I', 'SAC/018/ED', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(314, 'Etsako West II', 'SAC/019/ED', 12, 'Edo', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
(315, 'Owan East', 'SAC/020/ED', 12, 'Edo', 36, 'Edo North', 107, 'Owan East / Owan West'),
(316, 'Owan West', 'SAC/021/ED', 12, 'Edo', 36, 'Edo North', 107, 'Owan East / Owan West'),
(317, 'Akoko-Edo I', 'SAC/022/ED', 12, 'Edo', 36, 'Edo North', 108, 'Akoko-Edo'),
(318, 'Akoko-Edo II', 'SAC/023/ED', 12, 'Edo', 36, 'Edo North', 108, 'Akoko-Edo'),
(319, 'Akoko-Edo III', 'SAC/024/ED', 12, 'Edo', 36, 'Edo North', 108, 'Akoko-Edo'),

-- ============================================================
-- EKITI STATE (state_id: 309) - 26 Seats
-- ============================================================
-- Ekiti Central SD (SD ID: 37)
(320, 'Ado Ekiti I', 'SAC/001/EK', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(321, 'Ado Ekiti II', 'SAC/002/EK', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(322, 'Ado Ekiti III', 'SAC/003/EK', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(323, 'Irepodun/Ifelodun I', 'SAC/004/EK', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(324, 'Irepodun/Ifelodun II', 'SAC/005/EK', 13, 'Ekiti', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
(325, 'Ijero', 'SAC/006/EK', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
(326, 'Ekiti West', 'SAC/007/EK', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
(327, 'Efon I', 'SAC/008/EK', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
(328, 'Efon II', 'SAC/009/EK', 13, 'Ekiti', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
-- Ekiti North SD (SD ID: 38)
(329, 'Ikole I', 'SAC/010/EK', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(330, 'Ikole II', 'SAC/011/EK', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(331, 'Ikole III', 'SAC/012/EK', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(332, 'Oye', 'SAC/013/EK', 13, 'Ekiti', 38, 'Ekiti North', 111, 'Ikole / Oye'),
(333, 'Ido-Osi I', 'SAC/014/EK', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(334, 'Ido-Osi II', 'SAC/015/EK', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(335, 'Moba I', 'SAC/016/EK', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(336, 'Moba II', 'SAC/017/EK', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
(337, 'Ilejemeje', 'SAC/018/EK', 13, 'Ekiti', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
-- Ekiti South SD (SD ID: 39)
(338, 'Ekiti South West I', 'SAC/019/EK', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(339, 'Ekiti South West II', 'SAC/020/EK', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(340, 'Ikere I', 'SAC/021/EK', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(341, 'Ikere II', 'SAC/022/EK', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(342, 'Ise-Orun', 'SAC/023/EK', 13, 'Ekiti', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
(343, 'Ekiti East', 'SAC/024/EK', 13, 'Ekiti', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),
(344, 'Emure', 'SAC/025/EK', 13, 'Ekiti', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),
(345, 'Gbonyin', 'SAC/026/EK', 13, 'Ekiti', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),

-- ============================================================
-- ENUGU STATE (state_id: 289) - 24 Seats
-- ============================================================
-- Enugu North SD (SD ID: 40)
(346, 'Igbo-Eze North', 'SAC/001/EN', 14, 'Enugu', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
(347, 'Udenu', 'SAC/002/EN', 14, 'Enugu', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
(348, 'Igbo-Etiti I', 'SAC/003/EN', 14, 'Enugu', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
(349, 'Igbo-Etiti II', 'SAC/004/EN', 14, 'Enugu', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
(350, 'Uzo-Uwani', 'SAC/005/EN', 14, 'Enugu', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
(351, 'Nsukka I', 'SAC/006/EN', 14, 'Enugu', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
(352, 'Nsukka II', 'SAC/007/EN', 14, 'Enugu', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
(353, 'Igbo-Eze South', 'SAC/008/EN', 14, 'Enugu', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
(354, 'Udenu II', 'SAC/009/EN', 14, 'Enugu', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
-- Enugu East SD (SD ID: 41)
(355, 'Enugu East', 'SAC/010/EN', 14, 'Enugu', 41, 'Enugu East', 118, 'Enugu East / Isi Uzo'),
(356, 'Isi Uzo', 'SAC/011/EN', 14, 'Enugu', 41, 'Enugu East', 118, 'Enugu East / Isi Uzo'),
(357, 'Enugu North I', 'SAC/012/EN', 14, 'Enugu', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
(358, 'Enugu North II', 'SAC/013/EN', 14, 'Enugu', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
(359, 'Enugu South', 'SAC/014/EN', 14, 'Enugu', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
(360, 'Nkanu East', 'SAC/015/EN', 14, 'Enugu', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
(361, 'Nkanu West I', 'SAC/016/EN', 14, 'Enugu', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
(362, 'Nkanu West II', 'SAC/017/EN', 14, 'Enugu', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
-- Enugu West SD (SD ID: 42)
(363, 'Aninri', 'SAC/018/EN', 14, 'Enugu', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
(364, 'Awgu', 'SAC/019/EN', 14, 'Enugu', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
(365, 'Oji River', 'SAC/020/EN', 14, 'Enugu', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
(366, 'Ezeagu I', 'SAC/021/EN', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
(367, 'Ezeagu II', 'SAC/022/EN', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
(368, 'Udi I', 'SAC/023/EN', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
(369, 'Udi II', 'SAC/024/EN', 14, 'Enugu', 42, 'Enugu West', 122, 'Ezeagu / Udi'),

-- ============================================================
-- GOMBE STATE (state_id: 310) - 24 Seats
-- ============================================================
-- Gombe Central SD (SD ID: 44)
(370, 'Akko I', 'SAC/001/GO', 15, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(371, 'Akko II', 'SAC/002/GO', 15, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(372, 'Akko III', 'SAC/003/GO', 15, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(373, 'Akko IV', 'SAC/004/GO', 15, 'Gombe', 44, 'Gombe Central', 125, 'Akko'),
(374, 'Yamaltu I', 'SAC/005/GO', 15, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
(375, 'Yamaltu II', 'SAC/006/GO', 15, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
(376, 'Deba I', 'SAC/007/GO', 15, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
(377, 'Deba II', 'SAC/008/GO', 15, 'Gombe', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
-- Gombe North SD (SD ID: 45)
(378, 'Dukku', 'SAC/009/GO', 15, 'Gombe', 45, 'Gombe North', 127, 'Dukku / Nafada'),
(379, 'Nafada', 'SAC/010/GO', 15, 'Gombe', 45, 'Gombe North', 127, 'Dukku / Nafada'),
(380, 'Gombe I', 'SAC/011/GO', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(381, 'Gombe II', 'SAC/012/GO', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(382, 'Gombe III', 'SAC/013/GO', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(383, 'Kwami', 'SAC/014/GO', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(384, 'Funakaye I', 'SAC/015/GO', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
(385, 'Funakaye II', 'SAC/016/GO', 15, 'Gombe', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
-- Gombe South SD (SD ID: 46)
(386, 'Balanga I', 'SAC/017/GO', 15, 'Gombe', 46, 'Gombe South', 129, 'Balanga / Billiri'),
(387, 'Balanga II', 'SAC/018/GO', 15, 'Gombe', 46, 'Gombe South', 129, 'Balanga / Billiri'),
(388, 'Billiri', 'SAC/019/GO', 15, 'Gombe', 46, 'Gombe South', 129, 'Balanga / Billiri'),
(389, 'Kaltungo I', 'SAC/020/GO', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(390, 'Kaltungo II', 'SAC/021/GO', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(391, 'Shongom I', 'SAC/022/GO', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(392, 'Shongom II', 'SAC/023/GO', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
(393, 'Shongom III', 'SAC/024/GO', 15, 'Gombe', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),

-- ============================================================
-- IMO STATE (state_id: 308) - 27 Seats
-- ============================================================
-- Imo North SD (SD ID: 47)
(394, 'Ehime Mbano', 'SAC/001/IM', 16, 'Imo', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
(395, 'Ihitte-Uboma', 'SAC/002/IM', 16, 'Imo', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
(396, 'Obowo', 'SAC/003/IM', 16, 'Imo', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
(397, 'Okigwe I', 'SAC/004/IM', 16, 'Imo', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
(398, 'Okigwe II', 'SAC/005/IM', 16, 'Imo', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
(399, 'Onuimo', 'SAC/006/IM', 16, 'Imo', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
-- Imo East SD (SD ID: 48)
(400, 'Aboh Mbaise', 'SAC/007/IM', 16, 'Imo', 48, 'Imo East', 133, 'Aboh Mbaise / Ngor Okpala'),
(401, 'Ngor Okpala', 'SAC/008/IM', 16, 'Imo', 48, 'Imo East', 133, 'Aboh Mbaise / Ngor Okpala'),
(402, 'Ahiazu Mbaise', 'SAC/009/IM', 16, 'Imo', 48, 'Imo East', 134, 'Ahiazu / Ezinihitte Mbaise'),
(403, 'Ezinihitte Mbaise', 'SAC/010/IM', 16, 'Imo', 48, 'Imo East', 134, 'Ahiazu / Ezinihitte Mbaise'),
(404, 'Ikeduru I', 'SAC/011/IM', 16, 'Imo', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
(405, 'Ikeduru II', 'SAC/012/IM', 16, 'Imo', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
(406, 'Mbaitoli', 'SAC/013/IM', 16, 'Imo', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
(407, 'Owerri Municipal', 'SAC/014/IM', 16, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
(408, 'Owerri North', 'SAC/015/IM', 16, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
(409, 'Owerri West I', 'SAC/016/IM', 16, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
(410, 'Owerri West II', 'SAC/017/IM', 16, 'Imo', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
-- Imo West SD (SD ID: 49)
(411, 'Ideato North', 'SAC/018/IM', 16, 'Imo', 49, 'Imo West', 137, 'Ideato North / Ideato South'),
(412, 'Ideato South', 'SAC/019/IM', 16, 'Imo', 49, 'Imo West', 137, 'Ideato North / Ideato South'),
(413, 'Isu', 'SAC/020/IM', 16, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(414, 'Njaba', 'SAC/021/IM', 16, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(415, 'Nkwerre', 'SAC/022/IM', 16, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(416, 'Nwangele', 'SAC/023/IM', 16, 'Imo', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
(417, 'Oguta', 'SAC/024/IM', 16, 'Imo', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
(418, 'Ohaji-Egbema', 'SAC/025/IM', 16, 'Imo', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
(419, 'Oru West', 'SAC/026/IM', 16, 'Imo', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
(420, 'Orlu', 'SAC/027/IM', 16, 'Imo', 49, 'Imo West', 140, 'Orlu / Orsu / Oru East'),

-- ============================================================
-- JIGAWA STATE (state_id: 288) - 30 Seats
-- ============================================================
-- Jigawa North-East SD (SD ID: 50)
(421, 'Hadejia', 'SAC/001/JG', 17, 'Jigawa', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
(422, 'Kafin Hausa', 'SAC/002/JG', 17, 'Jigawa', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
(423, 'Auyo', 'SAC/003/JG', 17, 'Jigawa', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
(424, 'Birniwa', 'SAC/004/JG', 17, 'Jigawa', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
(425, 'Guri', 'SAC/005/JG', 17, 'Jigawa', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
(426, 'Kiri Kasamma', 'SAC/006/JG', 17, 'Jigawa', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
(427, 'Kaugama', 'SAC/007/JG', 17, 'Jigawa', 50, 'Jigawa North-East', 143, 'Kaugama / Malam Madori'),
(428, 'Malam Madori', 'SAC/008/JG', 17, 'Jigawa', 50, 'Jigawa North-East', 143, 'Kaugama / Malam Madori'),
-- Jigawa North-West SD (SD ID: 51)
(429, 'Babura', 'SAC/009/JG', 17, 'Jigawa', 51, 'Jigawa North-West', 144, 'Babura / Garki'),
(430, 'Garki', 'SAC/010/JG', 17, 'Jigawa', 51, 'Jigawa North-West', 144, 'Babura / Garki'),
(431, 'Gumel', 'SAC/011/JG', 17, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(432, 'Maigatari', 'SAC/012/JG', 17, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(433, 'Sule Tankarkar', 'SAC/013/JG', 17, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(434, 'Gagarawa', 'SAC/014/JG', 17, 'Jigawa', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
(435, 'Kazaure', 'SAC/015/JG', 17, 'Jigawa', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
(436, 'Roni', 'SAC/016/JG', 17, 'Jigawa', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
(437, 'Yankwashi', 'SAC/017/JG', 17, 'Jigawa', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
-- Jigawa South-West SD (SD ID: 52)
(438, 'Birnin Kudu I', 'SAC/018/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
(439, 'Birnin Kudu II', 'SAC/019/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
(440, 'Buji', 'SAC/020/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
(441, 'Dutse I', 'SAC/021/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
(442, 'Dutse II', 'SAC/022/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
(443, 'Kiyawa', 'SAC/023/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
(444, 'Gwaram', 'SAC/024/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 149, 'Gwaram'),
(445, 'Jahun', 'SAC/025/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 150, 'Jahun / Miga'),
(446, 'Miga', 'SAC/026/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 150, 'Jahun / Miga'),
(447, 'Ringim', 'SAC/027/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),
(448, 'Taura', 'SAC/028/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),
(449, 'Ringim II', 'SAC/029/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),
(450, 'Gwiwa', 'SAC/030/JG', 17, 'Jigawa', 52, 'Jigawa South-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),

-- ============================================================
-- KADUNA STATE (state_id: 294) - 34 Seats
-- ============================================================
-- Kaduna North SD (SD ID: 53)
(451, 'Ikara', 'SAC/001/KD', 18, 'Kaduna', 53, 'Kaduna North', 152, 'Ikara / Kubau'),
(452, 'Kubau', 'SAC/002/KD', 18, 'Kaduna', 53, 'Kaduna North', 152, 'Ikara / Kubau'),
(453, 'Makarfi', 'SAC/003/KD', 18, 'Kaduna', 53, 'Kaduna North', 153, 'Makarfi / Kudan'),
(454, 'Kudan', 'SAC/004/KD', 18, 'Kaduna', 53, 'Kaduna North', 153, 'Makarfi / Kudan'),
(455, 'Sabon Gari I', 'SAC/005/KD', 18, 'Kaduna', 53, 'Kaduna North', 154, 'Sabon Gari'),
(456, 'Sabon Gari II', 'SAC/006/KD', 18, 'Kaduna', 53, 'Kaduna North', 154, 'Sabon Gari'),
(457, 'Zaria I', 'SAC/007/KD', 18, 'Kaduna', 53, 'Kaduna North', 155, 'Zaria'),
(458, 'Zaria II', 'SAC/008/KD', 18, 'Kaduna', 53, 'Kaduna North', 155, 'Zaria'),
(459, 'Zaria III', 'SAC/009/KD', 18, 'Kaduna', 53, 'Kaduna North', 155, 'Zaria'),
(460, 'Lere', 'SAC/010/KD', 18, 'Kaduna', 53, 'Kaduna North', 156, 'Lere'),
(461, 'Soba', 'SAC/011/KD', 18, 'Kaduna', 53, 'Kaduna North', 157, 'Soba'),
-- Kaduna Central SD (SD ID: 54)
(462, 'Birnin Gwari', 'SAC/012/KD', 18, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(463, 'Giwa', 'SAC/013/KD', 18, 'Kaduna', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
(464, 'Chikun', 'SAC/014/KD', 18, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(465, 'Kajuru', 'SAC/015/KD', 18, 'Kaduna', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
(466, 'Igabi I', 'SAC/016/KD', 18, 'Kaduna', 54, 'Kaduna Central', 160, 'Igabi'),
(467, 'Igabi II', 'SAC/017/KD', 18, 'Kaduna', 54, 'Kaduna Central', 160, 'Igabi'),
(468, 'Kaduna North I', 'SAC/018/KD', 18, 'Kaduna', 54, 'Kaduna Central', 161, 'Kaduna North'),
(469, 'Kaduna North II', 'SAC/019/KD', 18, 'Kaduna', 54, 'Kaduna Central', 161, 'Kaduna North'),
(470, 'Kaduna South', 'SAC/020/KD', 18, 'Kaduna', 54, 'Kaduna Central', 162, 'Kaduna South'),
-- Kaduna South SD (SD ID: 55)
(471, 'Jaba', 'SAC/021/KD', 18, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(472, 'Zangon Kataf I', 'SAC/022/KD', 18, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(473, 'Zangon Kataf II', 'SAC/023/KD', 18, 'Kaduna', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
(474, 'Jemaa', 'SAC/024/KD', 18, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(475, 'Sanga', 'SAC/025/KD', 18, 'Kaduna', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
(476, 'Kachia', 'SAC/026/KD', 18, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(477, 'Kagarko', 'SAC/027/KD', 18, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(478, 'Kachia II', 'SAC/028/KD', 18, 'Kaduna', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
(479, 'Kaura I', 'SAC/029/KD', 18, 'Kaduna', 55, 'Kaduna South', 166, 'Kaura'),
(480, 'Kaura II', 'SAC/030/KD', 18, 'Kaduna', 55, 'Kaduna South', 166, 'Kaura'),
(481, 'Kauru I', 'SAC/031/KD', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),
(482, 'Kauru II', 'SAC/032/KD', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),
(483, 'Kauru III', 'SAC/033/KD', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),
(484, 'Kauru IV', 'SAC/034/KD', 18, 'Kaduna', 55, 'Kaduna South', 167, 'Kauru'),

-- ============================================================
-- KANO STATE (state_id: 300) - 40 Seats
-- ============================================================
-- Kano Central SD (SD ID: 56)
(485, 'Dala', 'SAC/001/KN', 19, 'Kano', 56, 'Kano Central', 168, 'Dala'),
(486, 'Dawakin Kudu', 'SAC/002/KN', 19, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(487, 'Warawa', 'SAC/003/KN', 19, 'Kano', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
(488, 'Fagge', 'SAC/004/KN', 19, 'Kano', 56, 'Kano Central', 170, 'Fagge'),
(489, 'Gezawa', 'SAC/005/KN', 19, 'Kano', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
(490, 'Gabasawa', 'SAC/006/KN', 19, 'Kano', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
(491, 'Gwale', 'SAC/007/KN', 19, 'Kano', 56, 'Kano Central', 172, 'Gwale'),
(492, 'Kano Municipal I', 'SAC/008/KN', 19, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(493, 'Kano Municipal II', 'SAC/009/KN', 19, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(494, 'Kano Municipal III', 'SAC/010/KN', 19, 'Kano', 56, 'Kano Central', 173, 'Kano Municipal'),
(495, 'Kumbotso', 'SAC/011/KN', 19, 'Kano', 56, 'Kano Central', 174, 'Kumbotso'),
(496, 'Nasarawa I', 'SAC/012/KN', 19, 'Kano', 56, 'Kano Central', 175, 'Nasarawa'),
(497, 'Nasarawa II', 'SAC/013/KN', 19, 'Kano', 56, 'Kano Central', 175, 'Nasarawa'),
(498, 'Tarauni', 'SAC/014/KN', 19, 'Kano', 56, 'Kano Central', 176, 'Tarauni'),
-- Kano North SD (SD ID: 57)
(499, 'Bagwai', 'SAC/015/KN', 19, 'Kano', 57, 'Kano North', 178, 'Bagwai / Shanono'),
(500, 'Shanono', 'SAC/016/KN', 19, 'Kano', 57, 'Kano North', 178, 'Bagwai / Shanono'),
(501, 'Bichi I', 'SAC/017/KN', 19, 'Kano', 57, 'Kano North', 179, 'Bichi'),
(502, 'Bichi II', 'SAC/018/KN', 19, 'Kano', 57, 'Kano North', 179, 'Bichi'),
(503, 'Dambatta', 'SAC/019/KN', 19, 'Kano', 57, 'Kano North', 180, 'Dambatta / Makoda'),
(504, 'Makoda', 'SAC/020/KN', 19, 'Kano', 57, 'Kano North', 180, 'Dambatta / Makoda'),
(505, 'Dawakin Tofa', 'SAC/021/KN', 19, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(506, 'Tofa', 'SAC/022/KN', 19, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(507, 'Rimin Gado', 'SAC/023/KN', 19, 'Kano', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
(508, 'Gwarzo', 'SAC/024/KN', 19, 'Kano', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
(509, 'Kabo', 'SAC/025/KN', 19, 'Kano', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
(510, 'Karaye', 'SAC/026/KN', 19, 'Kano', 57, 'Kano North', 183, 'Karaye / Rogo'),
(511, 'Rogo', 'SAC/027/KN', 19, 'Kano', 57, 'Kano North', 183, 'Karaye / Rogo'),
(512, 'Kunchi', 'SAC/028/KN', 19, 'Kano', 57, 'Kano North', 184, 'Kunchi / Tsanyawa'),
-- Kano South SD (SD ID: 58)
(513, 'Albasu', 'SAC/029/KN', 19, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(514, 'Ajingi', 'SAC/030/KN', 19, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(515, 'Gaya', 'SAC/031/KN', 19, 'Kano', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
(516, 'Bebeji', 'SAC/032/KN', 19, 'Kano', 58, 'Kano South', 187, 'Bebeji / Kiru'),
(517, 'Kiru', 'SAC/033/KN', 19, 'Kano', 58, 'Kano South', 187, 'Bebeji / Kiru'),
(518, 'Doguwa', 'SAC/034/KN', 19, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(519, 'Tudun Wada', 'SAC/035/KN', 19, 'Kano', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
(520, 'Kura', 'SAC/036/KN', 19, 'Kano', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
(521, 'Rano', 'SAC/037/KN', 19, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(522, 'Bunkure', 'SAC/038/KN', 19, 'Kano', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
(523, 'Takai', 'SAC/039/KN', 19, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),
(524, 'Sumaila', 'SAC/040/KN', 19, 'Kano', 58, 'Kano South', 191, 'Takai / Sumaila'),

-- ============================================================
-- KATSINA STATE (state_id: 313) - 34 Seats
-- ============================================================
-- Katsina Central SD (SD ID: 59)
(525, 'Batagarawa', 'SAC/001/KT', 20, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(526, 'Charanchi', 'SAC/002/KT', 20, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(527, 'Rimi', 'SAC/003/KT', 20, 'Katsina', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
(528, 'Batsari', 'SAC/004/KT', 20, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(529, 'Safana', 'SAC/005/KT', 20, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(530, 'Dan Musa', 'SAC/006/KT', 20, 'Katsina', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
(531, 'Dutsin-Ma', 'SAC/007/KT', 20, 'Katsina', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
(532, 'Kurfi', 'SAC/008/KT', 20, 'Katsina', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
(533, 'Jibia', 'SAC/009/KT', 20, 'Katsina', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
(534, 'Kaita', 'SAC/010/KT', 20, 'Katsina', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
(535, 'Katsina I', 'SAC/011/KT', 20, 'Katsina', 59, 'Katsina Central', 196, 'Katsina Central'),
-- Katsina North SD (SD ID: 60)
(536, 'Bindawa', 'SAC/012/KT', 20, 'Katsina', 60, 'Katsina North', 197, 'Bindawa / Mani'),
(537, 'Mani', 'SAC/013/KT', 20, 'Katsina', 60, 'Katsina North', 197, 'Bindawa / Mani'),
(538, 'Daura', 'SAC/014/KT', 20, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(539, 'Sandamu', 'SAC/015/KT', 20, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(540, 'Mai''Adua', 'SAC/016/KT', 20, 'Katsina', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
(541, 'Ingawa', 'SAC/017/KT', 20, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(542, 'Kankia', 'SAC/018/KT', 20, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(543, 'Kusada', 'SAC/019/KT', 20, 'Katsina', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
(544, 'Mashi', 'SAC/020/KT', 20, 'Katsina', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
(545, 'Dutsi', 'SAC/021/KT', 20, 'Katsina', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
(546, 'Zango', 'SAC/022/KT', 20, 'Katsina', 60, 'Katsina North', 201, 'Zango / Baure'),
(547, 'Baure', 'SAC/023/KT', 20, 'Katsina', 60, 'Katsina North', 201, 'Zango / Baure'),
-- Katsina South SD (SD ID: 61)
(548, 'Bakori', 'SAC/024/KT', 20, 'Katsina', 61, 'Katsina South', 202, 'Bakori / Danja'),
(549, 'Danja', 'SAC/025/KT', 20, 'Katsina', 61, 'Katsina South', 202, 'Bakori / Danja'),
(550, 'Faskari', 'SAC/026/KT', 20, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(551, 'Kankara', 'SAC/027/KT', 20, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(552, 'Sabuwa', 'SAC/028/KT', 20, 'Katsina', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
(553, 'Funtua', 'SAC/029/KT', 20, 'Katsina', 61, 'Katsina South', 204, 'Funtua / Dandume'),
(554, 'Dandume', 'SAC/030/KT', 20, 'Katsina', 61, 'Katsina South', 204, 'Funtua / Dandume'),
(555, 'Malumfashi', 'SAC/031/KT', 20, 'Katsina', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
(556, 'Kafur', 'SAC/032/KT', 20, 'Katsina', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
(557, 'Matazu', 'SAC/033/KT', 20, 'Katsina', 61, 'Katsina South', 206, 'Matazu / Musawa'),
(558, 'Musawa', 'SAC/034/KT', 20, 'Katsina', 61, 'Katsina South', 206, 'Matazu / Musawa'),

-- ============================================================
-- KEBBI STATE (state_id: 290) - 24 Seats
-- ============================================================
-- Kebbi Central SD (SD ID: 62)
(559, 'Aleiro', 'SAC/001/KB', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(560, 'Gwandu', 'SAC/002/KB', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(561, 'Jega', 'SAC/003/KB', 21, 'Kebbi', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
(562, 'Birnin Kebbi I', 'SAC/004/KB', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(563, 'Birnin Kebbi II', 'SAC/005/KB', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(564, 'Kalgo', 'SAC/006/KB', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(565, 'Bunza', 'SAC/007/KB', 21, 'Kebbi', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
(566, 'Maiyama', 'SAC/008/KB', 21, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
(567, 'Koko/Besse I', 'SAC/009/KB', 21, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
(568, 'Koko/Besse II', 'SAC/010/KB', 21, 'Kebbi', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
-- Kebbi North SD (SD ID: 63)
(569, 'Arewa', 'SAC/011/KB', 21, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(570, 'Dandi', 'SAC/012/KB', 21, 'Kebbi', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
(571, 'Argungu', 'SAC/013/KB', 21, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(572, 'Augie', 'SAC/014/KB', 21, 'Kebbi', 63, 'Kebbi North', 211, 'Argungu / Augie'),
(573, 'Bagudo', 'SAC/015/KB', 21, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
(574, 'Suru I', 'SAC/016/KB', 21, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
(575, 'Suru II', 'SAC/017/KB', 21, 'Kebbi', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
-- Kebbi South SD (SD ID: 64)
(576, 'Fakai', 'SAC/018/KB', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(577, 'Sakaba', 'SAC/019/KB', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(578, 'Wasagu-Danko', 'SAC/020/KB', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(579, 'Zuru', 'SAC/021/KB', 21, 'Kebbi', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
(580, 'Yauri', 'SAC/022/KB', 21, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
(581, 'Shanga', 'SAC/023/KB', 21, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
(582, 'Ngaski', 'SAC/024/KB', 21, 'Kebbi', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),

-- ============================================================
-- KOGI STATE (state_id: 298) - 25 Seats
-- ============================================================
-- Kogi Central SD (SD ID: 65)
(583, 'Adavi', 'SAC/001/KG', 22, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(584, 'Okehi I', 'SAC/002/KG', 22, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(585, 'Okehi II', 'SAC/003/KG', 22, 'Kogi', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
(586, 'Ajaokuta', 'SAC/004/KG', 22, 'Kogi', 65, 'Kogi Central', 216, 'Ajaokuta'),
(587, 'Okene I', 'SAC/005/KG', 22, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
(588, 'Okene II', 'SAC/006/KG', 22, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
(589, 'Ogori-Magongo', 'SAC/007/KG', 22, 'Kogi', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
-- Kogi East SD (SD ID: 66)
(590, 'Ankpa', 'SAC/008/KG', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(591, 'Omala', 'SAC/009/KG', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(592, 'Olamaboro', 'SAC/010/KG', 22, 'Kogi', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
(593, 'Dekina', 'SAC/011/KG', 22, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(594, 'Bassa', 'SAC/012/KG', 22, 'Kogi', 66, 'Kogi East', 219, 'Dekina / Bassa'),
(595, 'Idah', 'SAC/013/KG', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(596, 'Ibaji', 'SAC/014/KG', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(597, 'Igalamela-Odolu', 'SAC/015/KG', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
(598, 'Ofu', 'SAC/016/KG', 22, 'Kogi', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
-- Kogi West SD (SD ID: 67)
(599, 'Kabba/Bunu I', 'SAC/017/KG', 22, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(600, 'Kabba/Bunu II', 'SAC/018/KG', 22, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(601, 'Ijumu', 'SAC/019/KG', 22, 'Kogi', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
(602, 'Lokoja I', 'SAC/020/KG', 22, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(603, 'Lokoja II', 'SAC/021/KG', 22, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(604, 'Koton Karfe', 'SAC/022/KG', 22, 'Kogi', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
(605, 'Yagba East', 'SAC/023/KG', 22, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
(606, 'Yagba West', 'SAC/024/KG', 22, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
(607, 'Mopa-Muro', 'SAC/025/KG', 22, 'Kogi', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),

-- ============================================================
-- KWARA STATE (state_id: 295) - 24 Seats
-- ============================================================
-- Kwara Central SD (SD ID: 68)
(608, 'Ilorin East I', 'SAC/001/KW', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(609, 'Ilorin East II', 'SAC/002/KW', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(610, 'Ilorin South I', 'SAC/003/KW', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(611, 'Ilorin South II', 'SAC/004/KW', 23, 'Kwara', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
(612, 'Ilorin West I', 'SAC/005/KW', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(613, 'Ilorin West II', 'SAC/006/KW', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(614, 'Asa I', 'SAC/007/KW', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
(615, 'Asa II', 'SAC/008/KW', 23, 'Kwara', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
-- Kwara North SD (SD ID: 69)
(616, 'Baruten I', 'SAC/009/KW', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(617, 'Baruten II', 'SAC/010/KW', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(618, 'Kaiama I', 'SAC/011/KW', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(619, 'Kaiama II', 'SAC/012/KW', 23, 'Kwara', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
(620, 'Edu', 'SAC/013/KW', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(621, 'Moro', 'SAC/014/KW', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(622, 'Pategi I', 'SAC/015/KW', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
(623, 'Pategi II', 'SAC/016/KW', 23, 'Kwara', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
-- Kwara South SD (SD ID: 70)
(624, 'Ekiti (Kwara)', 'SAC/017/KW', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(625, 'Isin', 'SAC/018/KW', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(626, 'Irepodun', 'SAC/019/KW', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(627, 'Oke-Ero', 'SAC/020/KW', 23, 'Kwara', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
(628, 'Ifelodun', 'SAC/021/KW', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(629, 'Offa I', 'SAC/022/KW', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(630, 'Offa II', 'SAC/023/KW', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
(631, 'Oyun', 'SAC/024/KW', 23, 'Kwara', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),

-- ============================================================
-- LAGOS STATE (state_id: 306) - 40 Seats
-- ============================================================
-- Lagos Central SD (SD ID: 71)
(632, 'Apapa I', 'SAC/001/LA', 24, 'Lagos', 71, 'Lagos Central', 230, 'Apapa'),
(633, 'Apapa II', 'SAC/002/LA', 24, 'Lagos', 71, 'Lagos Central', 230, 'Apapa'),
(634, 'Eti-Osa I', 'SAC/003/LA', 24, 'Lagos', 71, 'Lagos Central', 231, 'Eti-Osa'),
(635, 'Eti-Osa II', 'SAC/004/LA', 24, 'Lagos', 71, 'Lagos Central', 231, 'Eti-Osa'),
(636, 'Lagos Island I', 'SAC/005/LA', 24, 'Lagos', 71, 'Lagos Central', 232, 'Lagos Island I'),
(637, 'Lagos Island II', 'SAC/006/LA', 24, 'Lagos', 71, 'Lagos Central', 232, 'Lagos Island I'),
(638, 'Lagos Island III', 'SAC/007/LA', 24, 'Lagos', 71, 'Lagos Central', 233, 'Lagos Island II'),
(639, 'Lagos Island IV', 'SAC/008/LA', 24, 'Lagos', 71, 'Lagos Central', 233, 'Lagos Island II'),
(640, 'Lagos Mainland I', 'SAC/009/LA', 24, 'Lagos', 71, 'Lagos Central', 234, 'Lagos Mainland'),
(641, 'Lagos Mainland II', 'SAC/010/LA', 24, 'Lagos', 71, 'Lagos Central', 234, 'Lagos Mainland'),
(642, 'Surulere I', 'SAC/011/LA', 24, 'Lagos', 71, 'Lagos Central', 235, 'Surulere I'),
(643, 'Surulere II', 'SAC/012/LA', 24, 'Lagos', 71, 'Lagos Central', 236, 'Surulere II'),
-- Lagos East SD (SD ID: 72)
(644, 'Epe I', 'SAC/013/LA', 24, 'Lagos', 72, 'Lagos East', 237, 'Epe'),
(645, 'Epe II', 'SAC/014/LA', 24, 'Lagos', 72, 'Lagos East', 237, 'Epe'),
(646, 'Ibeju-Lekki I', 'SAC/015/LA', 24, 'Lagos', 72, 'Lagos East', 238, 'Ibeju-Lekki'),
(647, 'Ibeju-Lekki II', 'SAC/016/LA', 24, 'Lagos', 72, 'Lagos East', 238, 'Ibeju-Lekki'),
(648, 'Ikorodu I', 'SAC/017/LA', 24, 'Lagos', 72, 'Lagos East', 239, 'Ikorodu'),
(649, 'Ikorodu II', 'SAC/018/LA', 24, 'Lagos', 72, 'Lagos East', 239, 'Ikorodu'),
(650, 'Kosofe I', 'SAC/019/LA', 24, 'Lagos', 72, 'Lagos East', 240, 'Kosofe'),
(651, 'Kosofe II', 'SAC/020/LA', 24, 'Lagos', 72, 'Lagos East', 240, 'Kosofe'),
(652, 'Shomolu I', 'SAC/021/LA', 24, 'Lagos', 72, 'Lagos East', 241, 'Somolu'),
(653, 'Shomolu II', 'SAC/022/LA', 24, 'Lagos', 72, 'Lagos East', 241, 'Somolu'),
-- Lagos West SD (SD ID: 73)
(654, 'Agege I', 'SAC/023/LA', 24, 'Lagos', 73, 'Lagos West', 242, 'Agege'),
(655, 'Agege II', 'SAC/024/LA', 24, 'Lagos', 73, 'Lagos West', 242, 'Agege'),
(656, 'Ajeromi-Ifelodun I', 'SAC/025/LA', 24, 'Lagos', 73, 'Lagos West', 243, 'Ajeromi-Ifelodun'),
(657, 'Ajeromi-Ifelodun II', 'SAC/026/LA', 24, 'Lagos', 73, 'Lagos West', 243, 'Ajeromi-Ifelodun'),
(658, 'Alimosho I', 'SAC/027/LA', 24, 'Lagos', 73, 'Lagos West', 244, 'Alimosho'),
(659, 'Alimosho II', 'SAC/028/LA', 24, 'Lagos', 73, 'Lagos West', 244, 'Alimosho'),
(660, 'Amuwo-Odofin I', 'SAC/029/LA', 24, 'Lagos', 73, 'Lagos West', 245, 'Amuwo-Odofin'),
(661, 'Amuwo-Odofin II', 'SAC/030/LA', 24, 'Lagos', 73, 'Lagos West', 245, 'Amuwo-Odofin'),
(662, 'Badagry I', 'SAC/031/LA', 24, 'Lagos', 73, 'Lagos West', 246, 'Badagry'),
(663, 'Badagry II', 'SAC/032/LA', 24, 'Lagos', 73, 'Lagos West', 246, 'Badagry'),
(664, 'Ifako-Ijaiye I', 'SAC/033/LA', 24, 'Lagos', 73, 'Lagos West', 247, 'Ifako-Ijaiye'),
(665, 'Ifako-Ijaiye II', 'SAC/034/LA', 24, 'Lagos', 73, 'Lagos West', 247, 'Ifako-Ijaiye'),
(666, 'Ikeja I', 'SAC/035/LA', 24, 'Lagos', 73, 'Lagos West', 248, 'Ikeja'),
(667, 'Ikeja II', 'SAC/036/LA', 24, 'Lagos', 73, 'Lagos West', 248, 'Ikeja'),
(668, 'Mushin I', 'SAC/037/LA', 24, 'Lagos', 73, 'Lagos West', 249, 'Mushin I'),
(669, 'Mushin II', 'SAC/038/LA', 24, 'Lagos', 73, 'Lagos West', 250, 'Mushin II'),
(670, 'Ojo I', 'SAC/039/LA', 24, 'Lagos', 73, 'Lagos West', 251, 'Ojo'),
(671, 'Oshodi-Isolo I', 'SAC/040/LA', 24, 'Lagos', 73, 'Lagos West', 252, 'Oshodi-Isolo I'),

-- ============================================================
-- NASARAWA STATE (state_id: 301) - 24 Seats
-- ============================================================
-- Nasarawa North SD (SD ID: 74)
(672, 'Akwanga I', 'SAC/001/NS', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(673, 'Akwanga II', 'SAC/002/NS', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(674, 'Nasarawa Eggon I', 'SAC/003/NS', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(675, 'Nasarawa Eggon II', 'SAC/004/NS', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(676, 'Wamba I', 'SAC/005/NS', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
(677, 'Wamba II', 'SAC/006/NS', 25, 'Nasarawa', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
-- Nasarawa South SD (SD ID: 75)
(678, 'Awe', 'SAC/007/NS', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(679, 'Doma I', 'SAC/008/NS', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(680, 'Doma II', 'SAC/009/NS', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(681, 'Keana', 'SAC/010/NS', 25, 'Nasarawa', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
(682, 'Lafia I', 'SAC/011/NS', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(683, 'Lafia II', 'SAC/012/NS', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(684, 'Lafia III', 'SAC/013/NS', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(685, 'Obi I', 'SAC/014/NS', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
(686, 'Obi II', 'SAC/015/NS', 25, 'Nasarawa', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
-- Nasarawa West SD (SD ID: 76)
(687, 'Keffi I', 'SAC/016/NS', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(688, 'Keffi II', 'SAC/017/NS', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(689, 'Karu', 'SAC/018/NS', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(690, 'Kokona', 'SAC/019/NS', 25, 'Nasarawa', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
(691, 'Nasarawa I', 'SAC/020/NS', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(692, 'Nasarawa II', 'SAC/021/NS', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(693, 'Nasarawa III', 'SAC/022/NS', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(694, 'Toto I', 'SAC/023/NS', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
(695, 'Toto II', 'SAC/024/NS', 25, 'Nasarawa', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),

-- ============================================================
-- NIGER STATE (state_id: 317) - 29 Seats
-- ============================================================
-- Niger East SD (SD ID: 77)
(696, 'Chanchaga I', 'SAC/001/NI', 26, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(697, 'Chanchaga II', 'SAC/002/NI', 26, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(698, 'Chanchaga III', 'SAC/003/NI', 26, 'Niger', 77, 'Niger East', 259, 'Chanchaga'),
(699, 'Bosso', 'SAC/004/NI', 26, 'Niger', 77, 'Niger East', 260, 'Bosso / Paikoro'),
(700, 'Paikoro', 'SAC/005/NI', 26, 'Niger', 77, 'Niger East', 260, 'Bosso / Paikoro'),
(701, 'Gurara', 'SAC/006/NI', 26, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(702, 'Suleja', 'SAC/007/NI', 26, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(703, 'Tafa', 'SAC/008/NI', 26, 'Niger', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
(704, 'Shiroro', 'SAC/009/NI', 26, 'Niger', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
(705, 'Rafi', 'SAC/010/NI', 26, 'Niger', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
-- Niger North SD (SD ID: 78)
(706, 'Agwara', 'SAC/011/NI', 26, 'Niger', 78, 'Niger North', 263, 'Agwara / Borgu'),
(707, 'Borgu', 'SAC/012/NI', 26, 'Niger', 78, 'Niger North', 263, 'Agwara / Borgu'),
(708, 'Bida', 'SAC/013/NI', 26, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(709, 'Gbako', 'SAC/014/NI', 26, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(710, 'Katcha', 'SAC/015/NI', 26, 'Niger', 78, 'Niger North', 264, 'Bida / Gbako / Katcha'),
(711, 'Kontagora', 'SAC/016/NI', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(712, 'Wushishi', 'SAC/017/NI', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(713, 'Mariga', 'SAC/018/NI', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(714, 'Mashegu', 'SAC/019/NI', 26, 'Niger', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
(715, 'Rijau', 'SAC/020/NI', 26, 'Niger', 78, 'Niger North', 266, 'Rijau / Magama'),
(716, 'Magama', 'SAC/021/NI', 26, 'Niger', 78, 'Niger North', 266, 'Rijau / Magama'),
-- Niger South SD (SD ID: 79)
(717, 'Lapai I', 'SAC/022/NI', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(718, 'Lapai II', 'SAC/023/NI', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(719, 'Agaie I', 'SAC/024/NI', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(720, 'Agaie II', 'SAC/025/NI', 26, 'Niger', 79, 'Niger South', 267, 'Lapai / Agaie'),
(721, 'Lavun', 'SAC/026/NI', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(722, 'Mokwa', 'SAC/027/NI', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(723, 'Edati', 'SAC/028/NI', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
(724, 'Mokwa II', 'SAC/029/NI', 26, 'Niger', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),

-- ============================================================
-- OGUN STATE (state_id: 323) - 26 Seats
-- ============================================================
-- Ogun Central SD (SD ID: 80)
(725, 'Abeokuta North I', 'SAC/001/OG', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(726, 'Abeokuta North II', 'SAC/002/OG', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(727, 'Obafemi-Owode', 'SAC/003/OG', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(728, 'Odeda', 'SAC/004/OG', 27, 'Ogun', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
(729, 'Abeokuta South I', 'SAC/005/OG', 27, 'Ogun', 80, 'Ogun Central', 270, 'Abeokuta South'),
(730, 'Abeokuta South II', 'SAC/006/OG', 27, 'Ogun', 80, 'Ogun Central', 270, 'Abeokuta South'),
(731, 'Ifo', 'SAC/007/OG', 27, 'Ogun', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
(732, 'Ewekoro', 'SAC/008/OG', 27, 'Ogun', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
-- Ogun East SD (SD ID: 81)
(733, 'Ijebu North', 'SAC/009/OG', 27, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(734, 'Ijebu East', 'SAC/010/OG', 27, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(735, 'Ogun Waterside', 'SAC/011/OG', 27, 'Ogun', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
(736, 'Ijebu Ode', 'SAC/012/OG', 27, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(737, 'Odogbolu', 'SAC/013/OG', 27, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(738, 'Ijebu North East', 'SAC/014/OG', 27, 'Ogun', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
(739, 'Ikenne', 'SAC/015/OG', 27, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
(740, 'Shagamu', 'SAC/016/OG', 27, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
(741, 'Remo North', 'SAC/017/OG', 27, 'Ogun', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
-- Ogun West SD (SD ID: 82)
(742, 'Ado-Odo/Ota I', 'SAC/018/OG', 27, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(743, 'Ado-Odo/Ota II', 'SAC/019/OG', 27, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(744, 'Ado-Odo/Ota III', 'SAC/020/OG', 27, 'Ogun', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
(745, 'Egbado North I', 'SAC/021/OG', 27, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(746, 'Egbado North II', 'SAC/022/OG', 27, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(747, 'Imeko Afon', 'SAC/023/OG', 27, 'Ogun', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
(748, 'Egbado South', 'SAC/024/OG', 27, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
(749, 'Ipokia I', 'SAC/025/OG', 27, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
(750, 'Ipokia II', 'SAC/026/OG', 27, 'Ogun', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),

-- ============================================================
-- ONDO STATE (state_id: 321) - 26 Seats
-- ============================================================
-- Ondo Central SD (SD ID: 83)
(751, 'Akure North I', 'SAC/001/ON', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(752, 'Akure North II', 'SAC/002/ON', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(753, 'Akure South I', 'SAC/003/ON', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(754, 'Akure South II', 'SAC/004/ON', 28, 'Ondo', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
(755, 'Idanre', 'SAC/005/ON', 28, 'Ondo', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
(756, 'Ifedore', 'SAC/006/ON', 28, 'Ondo', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
(757, 'Ondo East', 'SAC/007/ON', 28, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
(758, 'Ondo West I', 'SAC/008/ON', 28, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
(759, 'Ondo West II', 'SAC/009/ON', 28, 'Ondo', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
-- Ondo North SD (SD ID: 84)
(760, 'Akoko North-East I', 'SAC/010/ON', 28, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(761, 'Akoko North-East II', 'SAC/011/ON', 28, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(762, 'Akoko North-West', 'SAC/012/ON', 28, 'Ondo', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
(763, 'Akoko South-East', 'SAC/013/ON', 28, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(764, 'Akoko South-West I', 'SAC/014/ON', 28, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(765, 'Akoko South-West II', 'SAC/015/ON', 28, 'Ondo', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
(766, 'Ose', 'SAC/016/ON', 28, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
(767, 'Owo I', 'SAC/017/ON', 28, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
(768, 'Owo II', 'SAC/018/ON', 28, 'Ondo', 84, 'Ondo North', 283, 'Ose / Owo'),
-- Ondo South SD (SD ID: 85)
(769, 'Ilaje I', 'SAC/019/ON', 28, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(770, 'Ilaje II', 'SAC/020/ON', 28, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(771, 'Ese-Odo', 'SAC/021/ON', 28, 'Ondo', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
(772, 'Ile-Oluji', 'SAC/022/ON', 28, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(773, 'Okeigbo', 'SAC/023/ON', 28, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(774, 'Odigbo', 'SAC/024/ON', 28, 'Ondo', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
(775, 'Okitipupa', 'SAC/025/ON', 28, 'Ondo', 85, 'Ondo South', 286, 'Okitipupa / Irele'),
(776, 'Irele', 'SAC/026/ON', 28, 'Ondo', 85, 'Ondo South', 286, 'Okitipupa / Irele'),

-- ============================================================
-- OSUN STATE (state_id: 322) - 26 Seats
-- ============================================================
-- Osun Central SD (SD ID: 86)
(777, 'Boluwaduro', 'SAC/001/OS', 29, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(778, 'Ifedayo', 'SAC/002/OS', 29, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(779, 'Ila', 'SAC/003/OS', 29, 'Osun', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
(780, 'Ifelodun', 'SAC/004/OS', 322, 86, 'Osun Central', 17, 'Etinan / Nsit Ibom / Nsit Ubium', 'Jigawa'),
(781, 'Boripe', 'SAC/005/OS', 322, 86, 'Osun Central', 17, 'Etinan / Nsit Ibom / Nsit Ubium', 'Jigawa'),
(782, 'Odo-Otin', 'SAC/006/OS', 322, 86, 'Osun Central', 17, 'Etinan / Nsit Ibom / Nsit Ubium', 'Jigawa'),
(783, 'Osogbo I', 'SAC/007/OS', 322, 86, 'Osun Central', 14, 'Demsa / Numan / Lamurde', 'Enugu'),
(784, 'Osogbo II', 'SAC/008/OS', 322, 86, 'Osun Central', 14, 'Demsa / Numan / Lamurde', 'Enugu'),
(785, 'Olorunda', 'SAC/009/OS', 322, 86, 'Osun Central', 14, 'Demsa / Numan / Lamurde', 'Enugu'),
-- Osun East SD (SD ID: 87)
(786, 'Atakunmosa East', 'SAC/010/OS', 322, 87, 'Osun East', 21, 'Ikono / Ini', 'Kebbi'),
(787, 'Atakunmosa West', 'SAC/011/OS', 322, 87, 'Osun East', 21, 'Ikono / Ini', 'Kebbi'),
(788, 'Ilesa East', 'SAC/012/OS', 322, 87, 'Osun East', 21, 'Ikono / Ini', 'Kebbi'),
(789, 'Ilesa West', 'SAC/013/OS', 322, 87, 'Osun East', 21, 'Ikono / Ini', 'Kebbi'),
(790, 'Ife Central', 'SAC/014/OS', 322, 87, 'Osun East', 7, 'Aba North / Aba South', 'Benue'),
(791, 'Ife East', 'SAC/015/OS', 322, 87, 'Osun East', 7, 'Aba North / Aba South', 'Benue'),
(792, 'Obokun', 'SAC/016/OS', 322, 87, 'Osun East', 33, 'Njikoka / Dunukofia / Anaocha', 'Sokoto'),
(793, 'Oriade', 'SAC/017/OS', 322, 87, 'Osun East', 33, 'Njikoka / Dunukofia / Anaocha', 'Sokoto'),
-- Osun West SD (SD ID: 88)
(794, 'Ayedaade', 'SAC/018/OS', 322, 88, 'Osun West', 37, 'Orumba North / Orumba South', 'Abuja FCT'),
(795, 'Irewole', 'SAC/019/OS', 322, 88, 'Osun West', 37, 'Orumba North / Orumba South', 'Abuja FCT'),
(796, 'Isokan', 'SAC/020/OS', 322, 88, 'Osun West', 37, 'Orumba North / Orumba South', 'Abuja FCT'),
(797, 'Ayedire', 'SAC/021/OS', 322, 88, 'Osun West', 18, 'Itu / Ibiono Ibom', 'Kaduna'),
(798, 'Iwo', 'SAC/022/OS', 322, 88, 'Osun West', 18, 'Itu / Ibiono Ibom', 'Kaduna'),
(799, 'Ola-Oluwa', 'SAC/023/OS', 322, 88, 'Osun West', 18, 'Itu / Ibiono Ibom', 'Kaduna'),
(800, 'Ede North', 'SAC/024/OS', 322, 88, 'Osun West', 23, 'Eket / Onna / Esit Eket / Ibeno', 'Kwara'),
(801, 'Ede South', 'SAC/025/OS', 322, 88, 'Osun West', 23, 'Eket / Onna / Esit Eket / Ibeno', 'Kwara'),
(802, 'Egbedore', 'SAC/026/OS', 322, 88, 'Osun West', 23, 'Eket / Onna / Esit Eket / Ibeno', 'Kwara'),

-- ============================================================
-- OYO STATE (state_id: 296) - 32 Seats
-- ============================================================
-- Oyo Central SD (SD ID: 89)
(803, 'Afijio', 'SAC/001/OY', 30, 'Oyo', 89, 'Oyo Central', 30, 'Oyi / Ayamelum', 'Oyo'),
(804, 'Atiba', 'SAC/002/OY', 30, 'Oyo', 89, 'Oyo Central', 30, 'Oyi / Ayamelum', 'Oyo'),
(805, 'Oyo East', 'SAC/003/OY', 30, 'Oyo', 89, 'Oyo Central', 30, 'Oyi / Ayamelum', 'Oyo'),
(806, 'Oyo West', 'SAC/004/OY', 30, 'Oyo', 89, 'Oyo Central', 30, 'Oyi / Ayamelum', 'Oyo'),
(807, 'Akinyele', 'SAC/005/OY', 30, 'Oyo', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
(808, 'Lagelu', 'SAC/006/OY', 30, 'Oyo', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
(809, 'Egbeda', 'SAC/007/OY', 30, 'Oyo', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
(810, 'Ona-Ara', 'SAC/008/OY', 30, 'Oyo', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
(811, 'Oluyole I', 'SAC/009/OY', 30, 'Oyo', 89, 'Oyo Central', 299, 'Oluyole'),
(812, 'Oluyole II', 'SAC/010/OY', 30, 'Oyo', 89, 'Oyo Central', 299, 'Oluyole'),
(813, 'Ogo-Oluwa', 'SAC/011/OY', 30, 'Oyo', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
(814, 'Surulere (Oyo)', 'SAC/012/OY', 30, 'Oyo', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
-- Oyo North SD (SD ID: 90)
(815, 'Atisbo', 'SAC/013/OY', 30, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(816, 'Saki East', 'SAC/014/OY', 30, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(817, 'Saki West', 'SAC/015/OY', 30, 'Oyo', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
(818, 'Irepo', 'SAC/016/OY', 30, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(819, 'Olorunsogo', 'SAC/017/OY', 30, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(820, 'Orelope', 'SAC/018/OY', 30, 'Oyo', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
(821, 'Iseyin', 'SAC/019/OY', 30, 'Oyo', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
(822, 'Kajola', 'SAC/020/OY', 30, 'Oyo', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
(823, 'Ogbomoso North', 'SAC/021/OY', 30, 'Oyo', 90, 'Oyo North', 304, 'Ogbomoso North / Ogbomoso South / Oriire'),
-- Oyo South SD (SD ID: 91)
(824, 'Ibadan North I', 'SAC/022/OY', 30, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),
(825, 'Ibadan North II', 'SAC/023/OY', 30, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),
(826, 'Ibadan North-East', 'SAC/024/OY', 30, 'Oyo', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
(827, 'Ibadan South-East', 'SAC/025/OY', 30, 'Oyo', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
(828, 'Ibadan North-West', 'SAC/026/OY', 30, 'Oyo', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
(829, 'Ibadan South-West', 'SAC/027/OY', 30, 'Oyo', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
(830, 'Ibarapa Central', 'SAC/028/OY', 30, 'Oyo', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
(831, 'Ibarapa North', 'SAC/029/OY', 30, 'Oyo', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
(832, 'Ido', 'SAC/030/OY', 30, 'Oyo', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
(833, 'Ibarapa East', 'SAC/031/OY', 30, 'Oyo', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
(834, 'Ibadan North III', 'SAC/032/OY', 30, 'Oyo', 91, 'Oyo South', 305, 'Ibadan North'),

-- ============================================================
-- PLATEAU STATE (state_id: 302) - 24 Seats
-- ============================================================
-- Plateau Central SD (SD ID: 92)
(835, 'Bokkos', 'SAC/001/PL', 31, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(836, 'Mangu I', 'SAC/002/PL', 31, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(837, 'Mangu II', 'SAC/003/PL', 31, 'Plateau', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
(838, 'Pankshin', 'SAC/004/PL', 31, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
(839, 'Kanke', 'SAC/005/PL', 31, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
(840, 'Kanam', 'SAC/006/PL', 31, 'Plateau', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
-- Plateau North SD (SD ID: 93)
(841, 'Barkin Ladi', 'SAC/007/PL', 31, 'Plateau', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
(842, 'Riyom', 'SAC/008/PL', 31, 'Plateau', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
(843, 'Jos North I', 'SAC/009/PL', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(844, 'Jos North II', 'SAC/010/PL', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(845, 'Jos North III', 'SAC/011/PL', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(846, 'Bassa', 'SAC/012/PL', 31, 'Plateau', 93, 'Plateau North', 313, 'Jos North / Bassa'),
(847, 'Jos South I', 'SAC/013/PL', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(848, 'Jos South II', 'SAC/014/PL', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(849, 'Jos East', 'SAC/015/PL', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
(850, 'Jos South III', 'SAC/016/PL', 31, 'Plateau', 93, 'Plateau North', 314, 'Jos South / Jos East'),
-- Plateau South SD (SD ID: 94)
(851, 'Langtang North', 'SAC/017/PL', 31, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(852, 'Langtang South I', 'SAC/018/PL', 31, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(853, 'Langtang South II', 'SAC/019/PL', 31, 'Plateau', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
(854, 'Mikang', 'SAC/020/PL', 31, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(855, 'Quan Pan', 'SAC/021/PL', 31, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(856, 'Shendam', 'SAC/022/PL', 31, 'Plateau', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
(857, 'Wase I', 'SAC/023/PL', 31, 'Plateau', 94, 'Plateau South', 317, 'Wase'),
(858, 'Wase II', 'SAC/024/PL', 31, 'Plateau', 94, 'Plateau South', 317, 'Wase'),

-- ============================================================
-- RIVERS STATE (state_id: 4926) - 32 Seats
-- ============================================================
-- Rivers East SD (SD ID: 95)
(859, 'Etche', 'SAC/001/RV', 4926, 95, 'Rivers East', 12, 'Hong / Gombi', 'Edo'),
(860, 'Omuma', 'SAC/002/RV', 4926, 95, 'Rivers East', 12, 'Hong / Gombi', 'Edo'),
(861, 'Ikwerre', 'SAC/003/RV', 4926, 95, 'Rivers East', 34, 'Aguata', 'Taraba'),
(862, 'Emohua', 'SAC/004/RV', 4926, 95, 'Rivers East', 34, 'Aguata', 'Taraba'),
(863, 'Obio/Akpor I', 'SAC/005/RV', 4926, 95, 'Rivers East', 2, 'Bende', 'Adamawa'),
(864, 'Obio/Akpor II', 'SAC/006/RV', 4926, 95, 'Rivers East', 2, 'Bende', 'Adamawa'),
(865, 'Okrika', 'SAC/007/RV', 4926, 95, 'Rivers East', 28, 'Ogbaru', 'Ondo'),
(866, 'Ogu/Bolo', 'SAC/008/RV', 4926, 95, 'Rivers East', 28, 'Ogbaru', 'Ondo'),
(867, 'Port Harcourt I', 'SAC/009/RV', 4926, 95, 'Rivers East', 29, 'Onitsha North / Onitsha South', 'Osun'),
(868, 'Port Harcourt II', 'SAC/010/RV', 4926, 95, 'Rivers East', 29, 'Onitsha North / Onitsha South', 'Osun'),
(869, 'Port Harcourt III', 'SAC/011/RV', 4926, 95, 'Rivers East', 27, 'Anambra East / Anambra West', 'Ogun'),
(870, 'Port Harcourt IV', 'SAC/012/RV', 4926, 95, 'Rivers East', 27, 'Anambra East / Anambra West', 'Ogun'),
(871, 'Obio/Akpor III', 'SAC/013/RV', 4926, 95, 'Rivers East', 2, 'Bende', 'Adamawa'),
-- Rivers South-East SD (SD ID: 96)
(872, 'Andoni', 'SAC/014/RV', 32, 'Rivers', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
(873, 'Opobo-Nkoro', 'SAC/015/RV', 32, 'Rivers', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
(874, 'Gokana', 'SAC/016/RV', 32, 'Rivers', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
(875, 'Khana', 'SAC/017/RV', 32, 'Rivers', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
(876, 'Eleme', 'SAC/018/RV', 32, 'Rivers', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
(877, 'Tai', 'SAC/019/RV', 32, 'Rivers', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
-- Rivers West SD (SD ID: 97)
(878, 'Abua/Odual I', 'SAC/020/RV', 32, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(879, 'Abua/Odual II', 'SAC/021/RV', 32, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(880, 'Ahoada East', 'SAC/022/RV', 32, 'Rivers', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
(881, 'Ahoada West', 'SAC/023/RV', 32, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(882, 'Ogba/Egbema/Ndoni I', 'SAC/024/RV', 32, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(883, 'Ogba/Egbema/Ndoni II', 'SAC/025/RV', 32, 'Rivers', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
(884, 'Degema', 'SAC/026/RV', 32, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),
(885, 'Bonny', 'SAC/027/RV', 32, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),
(886, 'Asari-Toru I', 'SAC/028/RV', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(887, 'Asari-Toru II', 'SAC/029/RV', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(888, 'Akuku-Toru I', 'SAC/030/RV', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(889, 'Akuku-Toru II', 'SAC/031/RV', 32, 'Rivers', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
(890, 'Degema II', 'SAC/032/RV', 32, 'Rivers', 97, 'Rivers West', 329, 'Degema / Bonny'),

-- ============================================================
-- SOKOTO STATE (state_id: 292) - 30 Seats
-- ============================================================
-- Sokoto East SD (SD ID: 98)
(891, 'Gada', 'SAC/001/SK', 33, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(892, 'Goronyo I', 'SAC/002/SK', 33, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(893, 'Goronyo II', 'SAC/003/SK', 33, 'Sokoto', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
(894, 'Isa', 'SAC/004/SK', 33, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(895, 'Sabon Birni I', 'SAC/005/SK', 33, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(896, 'Sabon Birni II', 'SAC/006/SK', 33, 'Sokoto', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
(897, 'Illela', 'SAC/007/SK', 33, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(898, 'Gwadabawa I', 'SAC/008/SK', 33, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(899, 'Gwadabawa II', 'SAC/009/SK', 33, 'Sokoto', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
(900, 'Rabah', 'SAC/010/SK', 33, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
(901, 'Wurno I', 'SAC/011/SK', 33, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
(902, 'Wurno II', 'SAC/012/SK', 33, 'Sokoto', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
-- Sokoto North SD (SD ID: 99)
(903, 'Binji', 'SAC/013/SK', 33, 'Sokoto', 99, 'Sokoto North', 335, 'Binji / Silame'),
(904, 'Silame', 'SAC/014/SK', 33, 'Sokoto', 99, 'Sokoto North', 335, 'Binji / Silame'),
(905, 'Kware', 'SAC/015/SK', 33, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(906, 'Wamako I', 'SAC/016/SK', 33, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(907, 'Wamako II', 'SAC/017/SK', 33, 'Sokoto', 99, 'Sokoto North', 336, 'Kware / Wamako'),
(908, 'Sokoto North I', 'SAC/018/SK', 33, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(909, 'Sokoto North II', 'SAC/019/SK', 33, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(910, 'Sokoto South', 'SAC/020/SK', 33, 'Sokoto', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
(911, 'Tangaza', 'SAC/021/SK', 33, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
(912, 'Gudu I', 'SAC/022/SK', 33, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
(913, 'Gudu II', 'SAC/023/SK', 33, 'Sokoto', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
-- Sokoto South SD (SD ID: 100)
(914, 'Kebbe', 'SAC/024/SK', 33, 'Sokoto', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
(915, 'Tambuwal', 'SAC/025/SK', 33, 'Sokoto', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
(916, 'Bodinga', 'SAC/026/SK', 33, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(917, 'Dange-Shuni', 'SAC/027/SK', 33, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(918, 'Tureta', 'SAC/028/SK', 33, 'Sokoto', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
(919, 'Yabo', 'SAC/029/SK', 33, 'Sokoto', 100, 'Sokoto South', 341, 'Yabo / Shagari'),
(920, 'Shagari', 'SAC/030/SK', 33, 'Sokoto', 100, 'Sokoto South', 341, 'Yabo / Shagari'),

-- ============================================================
-- TARABA STATE (state_id: 319) - 24 Seats
-- ============================================================
-- Taraba North SD (SD ID: 101)
(921, 'Jalingo I', 'SAC/001/TR', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(922, 'Jalingo II', 'SAC/002/TR', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(923, 'Yorro', 'SAC/003/TR', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(924, 'Zing', 'SAC/004/TR', 34, 'Taraba', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
(925, 'Karim Lamido I', 'SAC/005/TR', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(926, 'Karim Lamido II', 'SAC/006/TR', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(927, 'Lau', 'SAC/007/TR', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
(928, 'Ardo-Kola', 'SAC/008/TR', 34, 'Taraba', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
-- Taraba Central SD (SD ID: 102)
(929, 'Bali I', 'SAC/009/TR', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(930, 'Bali II', 'SAC/010/TR', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(931, 'Gassol I', 'SAC/011/TR', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(932, 'Gassol II', 'SAC/012/TR', 34, 'Taraba', 102, 'Taraba Central', 344, 'Bali / Gassol'),
(933, 'Sardauna', 'SAC/013/TR', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(934, 'Gashaka', 'SAC/014/TR', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(935, 'Kurmi I', 'SAC/015/TR', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
(936, 'Kurmi II', 'SAC/016/TR', 34, 'Taraba', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
-- Taraba South SD (SD ID: 103)
(937, 'Donga', 'SAC/017/TR', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(938, 'Ussa', 'SAC/018/TR', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(939, 'Takum I', 'SAC/019/TR', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(940, 'Takum II', 'SAC/020/TR', 34, 'Taraba', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
(941, 'Wukari I', 'SAC/021/TR', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(942, 'Wukari II', 'SAC/022/TR', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(943, 'Ibi I', 'SAC/023/TR', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),
(944, 'Ibi II', 'SAC/024/TR', 34, 'Taraba', 103, 'Taraba South', 347, 'Wukari / Ibi'),

-- ============================================================
-- YOBE STATE (state_id: 297) - 24 Seats
-- ============================================================
-- Yobe North SD (SD ID: 104)
(945, 'Bade I', 'SAC/001/YB', 35, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(946, 'Bade II', 'SAC/002/YB', 35, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(947, 'Jakusko', 'SAC/003/YB', 35, 'Yobe', 104, 'Yobe North', 348, 'Bade / Jakusko'),
(948, 'Machina', 'SAC/004/YB', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(949, 'Nguru', 'SAC/005/YB', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(950, 'Karasuwa', 'SAC/006/YB', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(951, 'Yusufari I', 'SAC/007/YB', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
(952, 'Yusufari II', 'SAC/008/YB', 35, 'Yobe', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
-- Yobe East SD (SD ID: 105)
(953, 'Damaturu I', 'SAC/009/YB', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(954, 'Damaturu II', 'SAC/010/YB', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(955, 'Gujba', 'SAC/011/YB', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(956, 'Gulani', 'SAC/012/YB', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(957, 'Tarmuwa', 'SAC/013/YB', 35, 'Yobe', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
(958, 'Geidam', 'SAC/014/YB', 35, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
(959, 'Yunusari', 'SAC/015/YB', 35, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
(960, 'Bursari', 'SAC/016/YB', 35, 'Yobe', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
-- Yobe South SD (SD ID: 106)
(961, 'Fika I', 'SAC/017/YB', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(962, 'Fika II', 'SAC/018/YB', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(963, 'Fune I', 'SAC/019/YB', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(964, 'Fune II', 'SAC/020/YB', 35, 'Yobe', 106, 'Yobe South', 352, 'Fika / Fune'),
(965, 'Potiskum I', 'SAC/021/YB', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(966, 'Potiskum II', 'SAC/022/YB', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(967, 'Nangere I', 'SAC/023/YB', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
(968, 'Nangere II', 'SAC/024/YB', 35, 'Yobe', 106, 'Yobe South', 353, 'Potiskum / Nangere'),

-- ============================================================
-- ZAMFARA STATE (state_id: 299) - 24 Seats
-- ============================================================
-- Zamfara North SD (SD ID: 107)
(969, 'Zurmi I', 'SAC/001/ZM', 36, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(970, 'Zurmi II', 'SAC/002/ZM', 36, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(971, 'Shinkafi', 'SAC/003/ZM', 36, 'Zamfara', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
(972, 'Kaura Namoda', 'SAC/004/ZM', 36, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
(973, 'Birnin Magaji I', 'SAC/005/ZM', 36, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
(974, 'Birnin Magaji II', 'SAC/006/ZM', 36, 'Zamfara', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
-- Zamfara Central SD (SD ID: 108)
(975, 'Gusau I', 'SAC/007/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(976, 'Gusau II', 'SAC/008/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(977, 'Gusau III', 'SAC/009/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(978, 'Tsafe I', 'SAC/010/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(979, 'Tsafe II', 'SAC/011/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
(980, 'Bungudu I', 'SAC/012/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(981, 'Bungudu II', 'SAC/013/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(982, 'Bungudu III', 'SAC/014/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(983, 'Maru I', 'SAC/015/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
(984, 'Maru II', 'SAC/016/ZM', 36, 'Zamfara', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
-- Zamfara West SD (SD ID: 109)
(985, 'Bakura', 'SAC/017/ZM', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(986, 'Maradun', 'SAC/018/ZM', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(987, 'Talata Mafara I', 'SAC/019/ZM', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(988, 'Talata Mafara II', 'SAC/020/ZM', 36, 'Zamfara', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
(989, 'Anka I', 'SAC/021/ZM', 36, 'Zamfara', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
(990, 'Anka II', 'SAC/022/ZM', 36, 'Zamfara', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
(991, 'Gummi', 'SAC/023/ZM', 36, 'Zamfara', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum'),
(992, 'Bukkuyum', 'SAC/024/ZM', 36, 'Zamfara', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum');