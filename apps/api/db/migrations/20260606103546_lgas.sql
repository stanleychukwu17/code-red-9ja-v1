-- +goose Up
CREATE TABLE IF NOT EXISTS lgas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    state_id INTEGER NOT NULL REFERENCES c_states(id) ON DELETE CASCADE,
    state_name VARCHAR(255) NOT NULL,
    senatorial_district_id INTEGER NOT NULL REFERENCES senatorial_districts(id) ON DELETE CASCADE,
    senatorial_district_name VARCHAR(255) NOT NULL,
    federal_constituency_id INTEGER NOT NULL REFERENCES federal_constituencies(id) ON DELETE CASCADE,
    federal_constituency_name VARCHAR(255) NOT NULL,
    state_constituencies_count INTEGER DEFAULT 0,
    wards_count INTEGER DEFAULT 0,
    polling_units_count INTEGER DEFAULT 0
);

CREATE INDEX idx_lgas_name ON lgas (name);
CREATE INDEX idx_lgas_state_id ON lgas (state_id);
CREATE INDEX idx_lgas_senatorial_district_id ON lgas (senatorial_district_id);
CREATE INDEX idx_lgas_federal_constituency_id ON lgas (federal_constituency_id);

INSERT INTO lgas (id, name, abbreviation, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name) VALUES
-- ============================================================
-- ABIA STATE (state_id: 1)
-- ============================================================
-- Abia South SD (SD: 3)
    (1, 'ABA NORTH', '01', 1, 'ABIA', 3, 'Abia South', 7, 'Aba North / Aba South'),
    (2, 'ABA SOUTH', '02', 1, 'ABIA', 3, 'Abia South', 7, 'Aba North / Aba South'),
-- Abia North SD (SD: 1)
    (3, 'AROCHUKWU', '03', 1, 'ABIA', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
    (4, 'BENDE', '04', 1, 'ABIA', 1, 'Abia North', 2, 'Bende'),
-- Abia Central SD (SD: 2)
    (5, 'IKWUANO', '05', 1, 'ABIA', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
    (6, 'ISIALA NGWA NORTH', '06', 1, 'ABIA', 2, 'Abia Central', 4, 'Isiala Ngwa North / Isiala Ngwa South'),
    (7, 'ISIALA NGWA SOUTH', '07', 1, 'ABIA', 2, 'Abia Central', 4, 'Isiala Ngwa North / Isiala Ngwa South'),
-- Abia North SD (SD: 1)
    (8, 'ISUIKWUATO', '08', 1, 'ABIA', 1, 'Abia North', 3, 'Isuikwuato / Umunneochi'),
-- Abia Central SD (SD: 2)
    (9, 'OBINGWA', '09', 1, 'ABIA', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
-- Abia North SD (SD: 1)
    (10, 'OHAFIA', '10', 1, 'ABIA', 1, 'Abia North', 1, 'Arochukwu / Ohafia'),
-- Abia Central SD (SD: 2)
    (11, 'OSISIOMA', '11', 1, 'ABIA', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
    (12, 'UGWUNAGBO', '12', 1, 'ABIA', 2, 'Abia Central', 5, 'Obingwa / Ugwunagbo / Osisioma'),
-- Abia South SD (SD: 3)
    (13, 'UKWA EAST', '13', 1, 'ABIA', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),
    (14, 'UKWA  WEST', '14', 1, 'ABIA', 3, 'Abia South', 8, 'Ukwa East / Ukwa West'),
-- Abia Central SD (SD: 2)
    (15, 'UMUAHIA NORTH', '15', 1, 'ABIA', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
    (16, 'UMUAHIA  SOUTH', '16', 1, 'ABIA', 2, 'Abia Central', 6, 'Umuahia North / Umuahia South / Ikwuano'),
-- Abia North SD (SD: 1)
    (17, 'UMU - NNEOCHI', '17', 1, 'ABIA', 1, 'Abia North', 3, 'Isuikwuato / Umunneochi'),
-- ============================================================
-- ADAMAWA STATE (state_id: 2)
-- ============================================================
-- Adamawa South SD (SD: 5)
    (18, 'DEMSA', '01', 2, 'ADAMAWA', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
-- Adamawa Central SD (SD: 6)
    (19, 'FUFORE', '02', 2, 'ADAMAWA', 6, 'Adamawa Central', 11, 'Fufore / Song'),
-- Adamawa South SD (SD: 5)
    (20, 'GANYE', '03', 2, 'ADAMAWA', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
-- Adamawa Central SD (SD: 6)
    (21, 'GIREI', '04', 2, 'ADAMAWA', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
    (22, 'GOMBI', '05', 2, 'ADAMAWA', 6, 'Adamawa Central', 12, 'Hong / Gombi'),
-- Adamawa South SD (SD: 5)
    (23, 'GUYUK', '06', 2, 'ADAMAWA', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
-- Adamawa Central SD (SD: 6)
    (24, 'HONG', '07', 2, 'ADAMAWA', 6, 'Adamawa Central', 12, 'Hong / Gombi'),
-- Adamawa South SD (SD: 5)
    (25, 'JADA', '08', 2, 'ADAMAWA', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
    (26, 'LAMURDE', '09', 2, 'ADAMAWA', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
-- Adamawa North SD (SD: 4)
    (27, 'MADAGALI', '10', 2, 'ADAMAWA', 4, 'Adamawa North', 9, 'Michika / Madagali'),
    (28, 'MAIHA', '11', 2, 'ADAMAWA', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
-- Adamawa South SD (SD: 5)
    (29, 'MAYO - BELWA', '12', 2, 'ADAMAWA', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
-- Adamawa North SD (SD: 4)
    (30, 'MICHIKA', '13', 2, 'ADAMAWA', 4, 'Adamawa North', 9, 'Michika / Madagali'),
    (31, 'MUBI NORTH', '14', 2, 'ADAMAWA', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
    (32, 'MUBI SOUTH', '15', 2, 'ADAMAWA', 4, 'Adamawa North', 10, 'Mubi North / Mubi South / Maiha'),
-- Adamawa South SD (SD: 5)
    (33, 'NUMAN', '16', 2, 'ADAMAWA', 5, 'Adamawa South', 14, 'Demsa / Numan / Lamurde'),
    (34, 'SHELLENG', '17', 2, 'ADAMAWA', 5, 'Adamawa South', 15, 'Guyuk / Shelleng'),
-- Adamawa Central SD (SD: 6)
    (35, 'SONG', '18', 2, 'ADAMAWA', 6, 'Adamawa Central', 11, 'Fufore / Song'),
-- Adamawa South SD (SD: 5)
    (36, 'TOUNGO', '19', 2, 'ADAMAWA', 5, 'Adamawa South', 16, 'Jada / Ganye / Mayo Belwa / Toungo'),
-- Adamawa Central SD (SD: 6)
    (37, 'YOLA NORTH', '20', 2, 'ADAMAWA', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
    (38, 'YOLA SOUTH', '21', 2, 'ADAMAWA', 6, 'Adamawa Central', 13, 'Yola North / Yola South / Girei'),
-- ============================================================
-- AKWA IBOM STATE (state_id: 3)
-- ============================================================
-- Akwa Ibom North-West SD (SD: 8)
    (39, 'ABAK', '01', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
-- Akwa Ibom South SD (SD: 9)
    (40, 'EASTERN OBOLO', '02', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
    (41, 'EKET', '03', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
    (42, 'ESIT EKET (UQUO)', '04', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
-- Akwa Ibom North-West SD (SD: 8)
    (43, 'ESSIEN UDIM', '05', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
    (44, 'ETIM EKPO', '06', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
-- Akwa Ibom North-East SD (SD: 7)
    (45, 'ETINAN', '07', 3, 'AKWA IBOM', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
-- Akwa Ibom South SD (SD: 9)
    (46, 'IBENO', '08', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
-- Akwa Ibom North-East SD (SD: 7)
    (47, 'IBESIKPO ASUTAN', '09', 3, 'AKWA IBOM', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
    (48, 'IBIONO IBOM', '10', 3, 'AKWA IBOM', 7, 'Akwa Ibom North-East', 18, 'Itu / Ibiono Ibom'),
-- Akwa Ibom North-West SD (SD: 8)
    (49, 'IKA', '11', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 20, 'Abak / Etim Ekpo / Ika'),
    (50, 'IKONO', '12', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 21, 'Ikono / Ini'),
-- Akwa Ibom South SD (SD: 9)
    (51, 'IKOT ABASI', '13', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
-- Akwa Ibom North-West SD (SD: 8)
    (52, 'IKOT EKPENE', '14', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
    (53, 'INI', '15', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 21, 'Ikono / Ini'),
-- Akwa Ibom North-East SD (SD: 7)
    (54, 'ITU', '16', 3, 'AKWA IBOM', 7, 'Akwa Ibom North-East', 18, 'Itu / Ibiono Ibom'),
-- Akwa Ibom South SD (SD: 9)
    (55, 'MBO', '17', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko'),
    (56, 'MKPAT ENIN', '18', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 24, 'Ikot Abasi / Mkpat Enin / Eastern Obolo'),
-- Akwa Ibom North-East SD (SD: 7)
    (57, 'NSIT ATAI', '19', 3, 'AKWA IBOM', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
    (58, 'NSIT IBOM', '20', 3, 'AKWA IBOM', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
    (59, 'NSIT UBIUM', '21', 3, 'AKWA IBOM', 7, 'Akwa Ibom North-East', 17, 'Etinan / Nsit Ibom / Nsit Ubium'),
-- Akwa Ibom North-West SD (SD: 8)
    (60, 'OBOT AKARA', '22', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 22, 'Ikot Ekpene / Essien Udim / Obot Akara'),
-- Akwa Ibom South SD (SD: 9)
    (61, 'OKOBO', '23', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko'),
    (62, 'ONNA', '24', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 23, 'Eket / Onna / Esit Eket / Ibeno'),
    (63, 'ORON', '25', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko'),
-- Akwa Ibom North-West SD (SD: 8)
    (64, 'ORUK ANAM', '26', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 26, 'Ukanafun / Oruk Anam'),
-- Akwa Ibom South SD (SD: 9)
    (65, 'UDUNG UKO', '27', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko'),
-- Akwa Ibom North-West SD (SD: 8)
    (66, 'UKANAFUN', '28', 3, 'AKWA IBOM', 8, 'Akwa Ibom North-West', 26, 'Ukanafun / Oruk Anam'),
-- Akwa Ibom North-East SD (SD: 7)
    (67, 'URUAN', '29', 3, 'AKWA IBOM', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
-- Akwa Ibom South SD (SD: 9)
    (68, 'URUE OFFONG/ORUKO', '30', 3, 'AKWA IBOM', 9, 'Akwa Ibom South', 25, 'Oron / Mbo / Okobo / Udung Uko / Urue Offong/Oruko'),
-- Akwa Ibom North-East SD (SD: 7)
    (69, 'UYO', '31', 3, 'AKWA IBOM', 7, 'Akwa Ibom North-East', 19, 'Uyo / Uruan / Nsit Atai'),
-- ============================================================
-- ANAMBRA STATE (state_id: 4)
-- ============================================================
-- Anambra South SD (SD: 12)
    (70, 'AGUATA', '01', 4, 'ANAMBRA', 12, 'Anambra South', 34, 'Aguata'),
-- Anambra North SD (SD: 10)
    (71, 'AYAMELUM', '02', 4, 'ANAMBRA', 10, 'Anambra North', 30, 'Oyi / Ayamelum'),
    (72, 'ANAMBRA EAST', '03', 4, 'ANAMBRA', 10, 'Anambra North', 27, 'Anambra East / Anambra West'),
    (73, 'ANAMBRA WEST', '04', 4, 'ANAMBRA', 10, 'Anambra North', 27, 'Anambra East / Anambra West'),
-- Anambra Central SD (SD: 11)
    (74, 'ANAOCHA', '05', 4, 'ANAMBRA', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
    (75, 'AWKA NORTH', '06', 4, 'ANAMBRA', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
    (76, 'AWKA SOUTH', '07', 4, 'ANAMBRA', 11, 'Anambra Central', 31, 'Awka North / Awka South'),
    (77, 'DUNUKOFIA', '08', 4, 'ANAMBRA', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
-- Anambra South SD (SD: 12)
    (78, 'EKWUSIGO', '09', 4, 'ANAMBRA', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
-- Anambra Central SD (SD: 11)
    (79, 'IDEMILI NORTH', '10', 4, 'ANAMBRA', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
    (80, 'IDEMILI-SOUTH', '11', 4, 'ANAMBRA', 11, 'Anambra Central', 32, 'Idemili North / Idemili South'),
-- Anambra South SD (SD: 12)
    (81, 'IHIALA', '12', 4, 'ANAMBRA', 12, 'Anambra South', 35, 'Ihiala'),
-- Anambra Central SD (SD: 11)
    (82, 'NJIKOKA', '13', 4, 'ANAMBRA', 11, 'Anambra Central', 33, 'Njikoka / Dunukofia / Anaocha'),
-- Anambra South SD (SD: 12)
    (83, 'NNEWI NORTH', '14', 4, 'ANAMBRA', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
    (84, 'NNEWI SOUTH', '15', 4, 'ANAMBRA', 12, 'Anambra South', 36, 'Nnewi North / Nnewi South / Ekwusigo'),
-- Anambra North SD (SD: 10)
    (85, 'OGBARU', '16', 4, 'ANAMBRA', 10, 'Anambra North', 28, 'Ogbaru'),
    (86, 'ONITSHA-NORTH', '17', 4, 'ANAMBRA', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
    (87, 'ONITSHA -SOUTH', '18', 4, 'ANAMBRA', 10, 'Anambra North', 29, 'Onitsha North / Onitsha South'),
-- Anambra South SD (SD: 12)
    (88, 'ORUMBA NORTH', '19', 4, 'ANAMBRA', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),
    (89, 'ORUMBA  SOUTH', '20', 4, 'ANAMBRA', 12, 'Anambra South', 37, 'Orumba North / Orumba South'),
-- Anambra North SD (SD: 10)
    (90, 'OYI', '21', 4, 'ANAMBRA', 10, 'Anambra North', 30, 'Oyi / Ayamelum'),
-- ============================================================
-- BAUCHI STATE (state_id: 5)
-- ============================================================
-- Bauchi South SD (SD: 13)
    (91, 'ALKALERI', '01', 5, 'BAUCHI', 13, 'Bauchi South', 38, 'Alkaleri / Kirfi'),
    (92, 'BAUCHI', '02', 5, 'BAUCHI', 13, 'Bauchi South', 39, 'Bauchi'),
    (93, 'BOGORO', '03', 5, 'BAUCHI', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
-- Bauchi Central SD (SD: 14)
    (94, 'DAMBAM', '04', 5, 'BAUCHI', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
    (95, 'DARAZO', '05', 5, 'BAUCHI', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
-- Bauchi South SD (SD: 13)
    (96, 'DASS', '06', 5, 'BAUCHI', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
-- Bauchi North SD (SD: 15)
    (97, 'GAMAWA', '07', 5, 'BAUCHI', 15, 'Bauchi North', 45, 'Gamawa'),
-- Bauchi Central SD (SD: 14)
    (98, 'GANJUWA', '08', 5, 'BAUCHI', 14, 'Bauchi Central', 42, 'Darazo / Ganjuwa'),
-- Bauchi North SD (SD: 15)
    (99, 'GIADE', '09', 5, 'BAUCHI', 15, 'Bauchi North', 48, 'Shira / Giade'),
    (100, 'ITAS/GADAU', '10', 5, 'BAUCHI', 15, 'Bauchi North', 46, 'Jamaare / Itas-Gadau'),
    (101, 'JAMA''ARE', '11', 5, 'BAUCHI', 15, 'Bauchi North', 46, 'Jamaare / Itas-Gadau'),
    (102, 'KATAGUM', '12', 5, 'BAUCHI', 15, 'Bauchi North', 47, 'Katagum'),
-- Bauchi South SD (SD: 13)
    (103, 'KIRFI', '13', 5, 'BAUCHI', 13, 'Bauchi South', 38, 'Alkaleri / Kirfi'),
-- Bauchi Central SD (SD: 14)
    (104, 'MISAU', '14', 5, 'BAUCHI', 14, 'Bauchi Central', 43, 'Misau / Dambam'),
    (105, 'NINGI', '15', 5, 'BAUCHI', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
-- Bauchi North SD (SD: 15)
    (106, 'SHIRA', '16', 5, 'BAUCHI', 15, 'Bauchi North', 48, 'Shira / Giade'),
-- Bauchi South SD (SD: 13)
    (107, 'TAFAWA BALEWA', '17', 5, 'BAUCHI', 13, 'Bauchi South', 40, 'Bogoro / Dass / Tafawa Balewa'),
    (108, 'TORO', '18', 5, 'BAUCHI', 13, 'Bauchi South', 41, 'Toro'),
-- Bauchi Central SD (SD: 14)
    (109, 'WARJI', '19', 5, 'BAUCHI', 14, 'Bauchi Central', 44, 'Ningi / Warji'),
-- Bauchi North SD (SD: 15)
    (110, 'ZAKI', '20', 5, 'BAUCHI', 15, 'Bauchi North', 49, 'Zaki'),
-- ============================================================
-- BAYELSA STATE (state_id: 6)
-- ============================================================
-- Bayelsa East SD (SD: 16)
    (111, 'BRASS', '01', 6, 'BAYELSA', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
-- Bayelsa West SD (SD: 18)
    (112, 'EKEREMOR', '02', 6, 'BAYELSA', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
-- Bayelsa Central SD (SD: 17)
    (113, 'KOLOKUMA/OPOKUMA', '03', 6, 'BAYELSA', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
-- Bayelsa East SD (SD: 16)
    (114, 'NEMBE', '04', 6, 'BAYELSA', 16, 'Bayelsa East', 50, 'Brass / Nembe'),
    (115, 'OGBIA', '05', 6, 'BAYELSA', 16, 'Bayelsa East', 51, 'Ogbia'),
-- Bayelsa West SD (SD: 18)
    (116, 'SAGBAMA', '06', 6, 'BAYELSA', 18, 'Bayelsa West', 54, 'Sagbama / Ekeremor'),
-- Bayelsa Central SD (SD: 17)
    (117, 'SOUTHERN IJAW', '07', 6, 'BAYELSA', 17, 'Bayelsa Central', 52, 'Southern Ijaw'),
    (118, 'YENAGOA', '08', 6, 'BAYELSA', 17, 'Bayelsa Central', 53, 'Kolokuma / Opokuma / Yenagoa'),
-- ============================================================
-- BENUE STATE (state_id: 7)
-- ============================================================
-- Benue South SD (SD: 21)
    (119, 'ADO', '01', 7, 'BENUE', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
    (120, 'AGATU', '02', 7, 'BENUE', 21, 'Benue South', 63, 'Apa / Agatu'),
    (121, 'APA', '03', 7, 'BENUE', 21, 'Benue South', 63, 'Apa / Agatu'),
-- Benue North-West SD (SD: 20)
    (122, 'BURUKU', '04', 7, 'BENUE', 20, 'Benue North-West', 58, 'Buruku'),
    (123, 'GBOKO', '05', 7, 'BENUE', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
    (124, 'GUMA', '06', 7, 'BENUE', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
    (125, 'GWER EAST', '07', 7, 'BENUE', 20, 'Benue North-West', 61, 'Gwer East / Gwer West'),
    (126, 'GWER WEST', '08', 7, 'BENUE', 20, 'Benue North-West', 61, 'Gwer East / Gwer West'),
-- Benue North-East SD (SD: 19)
    (127, 'KATSINA-ALA', '09', 7, 'BENUE', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
    (128, 'KONSHISHA', '10', 7, 'BENUE', 19, 'Benue North-East', 56, 'Konshisha / Vandeikya'),
    (129, 'KWANDE', '11', 7, 'BENUE', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
    (130, 'LOGO', '12', 7, 'BENUE', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
-- Benue North-West SD (SD: 20)
    (131, 'MAKURDI', '13', 7, 'BENUE', 20, 'Benue North-West', 60, 'Guma / Makurdi'),
-- Benue South SD (SD: 21)
    (132, 'OBI', '14', 7, 'BENUE', 21, 'Benue South', 64, 'Oju / Obi'),
    (133, 'OGBADIBO', '15', 7, 'BENUE', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
    (134, 'OJU', '16', 7, 'BENUE', 21, 'Benue South', 64, 'Oju / Obi'),
    (135, 'OHIMINI', '17', 7, 'BENUE', 21, 'Benue South', 65, 'Otukpo / Ohimini'),
    (136, 'OKPOKWU', '18', 7, 'BENUE', 21, 'Benue South', 62, 'Ado / Ogbadibo / Okpokwu'),
    (137, 'OTUKPO', '19', 7, 'BENUE', 21, 'Benue South', 65, 'Otukpo / Ohimini'),
-- Benue North-West SD (SD: 20)
    (138, 'TARKA', '20', 7, 'BENUE', 20, 'Benue North-West', 59, 'Gboko / Tarka'),
-- Benue North-East SD (SD: 19)
    (139, 'UKUM', '21', 7, 'BENUE', 19, 'Benue North-East', 55, 'Katsina-Ala / Ukum / Logo'),
    (140, 'USHONGO', '22', 7, 'BENUE', 19, 'Benue North-East', 57, 'Kwande / Ushongo'),
    (141, 'VANDEIKYA', '23', 7, 'BENUE', 19, 'Benue North-East', 56, 'Konshisha / Vandeikya'),
-- ============================================================
-- BORNO STATE (state_id: 8)
-- ============================================================
-- Borno North SD (SD: 22)
    (142, 'ABADAM', '01', 8, 'BORNO', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
-- Borno South SD (SD: 24)
    (143, 'ASKIRA / UBA', '02', 8, 'BORNO', 24, 'Borno South', 73, 'Askira-Uba / Hawul'),
-- Borno Central SD (SD: 23)
    (144, 'BAMA', '03', 8, 'BORNO', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
-- Borno South SD (SD: 24)
    (145, 'BAYO', '04', 8, 'BORNO', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
    (146, 'BIU', '05', 8, 'BORNO', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
    (147, 'CHIBOK', '06', 8, 'BORNO', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),
    (148, 'DAMBOA', '07', 8, 'BORNO', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),
-- Borno Central SD (SD: 23)
    (149, 'DIKWA', '08', 8, 'BORNO', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
-- Borno North SD (SD: 22)
    (150, 'GUBIO', '09', 8, 'BORNO', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
    (151, 'GUZAMALA', '10', 8, 'BORNO', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
-- Borno South SD (SD: 24)
    (152, 'GWOZA', '11', 8, 'BORNO', 24, 'Borno South', 75, 'Damboa / Gwoza / Chibok'),
    (153, 'HAWUL', '12', 8, 'BORNO', 24, 'Borno South', 73, 'Askira-Uba / Hawul'),
-- Borno Central SD (SD: 23)
    (154, 'JERE', '13', 8, 'BORNO', 23, 'Borno Central', 71, 'Jere'),
-- Borno North SD (SD: 22)
    (155, 'KAGA', '14', 8, 'BORNO', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
-- Borno Central SD (SD: 23)
    (156, 'KALA BALGE', '15', 8, 'BORNO', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
    (157, 'KONDUGA', '16', 8, 'BORNO', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
-- Borno North SD (SD: 22)
    (158, 'KUKAWA', '17', 8, 'BORNO', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
-- Borno South SD (SD: 24)
    (159, 'KWAYA / KUSAR', '18', 8, 'BORNO', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
-- Borno Central SD (SD: 23)
    (160, 'MAFA', '19', 8, 'BORNO', 23, 'Borno Central', 70, 'Dikwa / Mafa / Konduga'),
-- Borno North SD (SD: 22)
    (161, 'MAGUMERI', '20', 8, 'BORNO', 22, 'Borno North', 66, 'Kaga / Gubio / Magumeri'),
-- Borno Central SD (SD: 23)
    (162, 'MAIDUGURI M. C.', '21', 8, 'BORNO', 23, 'Borno Central', 72, 'Maiduguri Metropolitan'),
-- Borno North SD (SD: 22)
    (163, 'MARTE', '22', 8, 'BORNO', 22, 'Borno North', 68, 'Monguno / Nganzai / Marte'),
    (164, 'MOBBAR', '23', 8, 'BORNO', 22, 'Borno North', 67, 'Kukawa / Mobbar / Abadam / Guzamala'),
    (165, 'MONGUNO', '24', 8, 'BORNO', 22, 'Borno North', 68, 'Monguno / Nganzai / Marte'),
-- Borno Central SD (SD: 23)
    (166, 'NGALA', '25', 8, 'BORNO', 23, 'Borno Central', 69, 'Bama / Ngala / Kala-Balge'),
-- Borno North SD (SD: 22)
    (167, 'NGANZAI', '26', 8, 'BORNO', 22, 'Borno North', 68, 'Monguno / Nganzai / Marte'),
-- Borno South SD (SD: 24)
    (168, 'SHANI', '27', 8, 'BORNO', 24, 'Borno South', 74, 'Biu / Kwaya-Kusar / Shani / Bayo'),
-- ============================================================
-- CROSS RIVER STATE (state_id: 9)
-- ============================================================
-- Cross River Central SD (SD: 26)
    (169, 'ABI', '01', 9, 'CROSS RIVER', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
-- Cross River South SD (SD: 27)
    (170, 'AKAMKPA', '02', 9, 'CROSS RIVER', 27, 'Cross River South', 81, 'Akamkpa / Biase'),
    (171, 'AKPABUYO', '03', 9, 'CROSS RIVER', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
    (172, 'BAKASSI', '04', 9, 'CROSS RIVER', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
-- Cross River North SD (SD: 25)
    (173, 'BEKWARRA', '05', 9, 'CROSS RIVER', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
-- Cross River South SD (SD: 27)
    (174, 'BIASE', '06', 9, 'CROSS RIVER', 27, 'Cross River South', 81, 'Akamkpa / Biase'),
-- Cross River Central SD (SD: 26)
    (175, 'BOKI', '07', 9, 'CROSS RIVER', 26, 'Cross River Central', 79, 'Boki / Ikom'),
-- Cross River South SD (SD: 27)
    (176, 'CALABAR MUNICIPALITY', '08', 9, 'CROSS RIVER', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
    (177, 'CALABAR SOUTH', '09', 9, 'CROSS RIVER', 27, 'Cross River South', 83, 'Calabar South / Akpabuyo / Bakassi'),
-- Cross River Central SD (SD: 26)
    (178, 'ETUNG', '10', 9, 'CROSS RIVER', 26, 'Cross River Central', 80, 'Obubra / Etung'),
    (179, 'IKOM', '11', 9, 'CROSS RIVER', 26, 'Cross River Central', 79, 'Boki / Ikom'),
-- Cross River North SD (SD: 25)
    (180, 'OBANLIKU', '12', 9, 'CROSS RIVER', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
-- Cross River Central SD (SD: 26)
    (181, 'OBUBRA', '13', 9, 'CROSS RIVER', 26, 'Cross River Central', 80, 'Obubra / Etung'),
-- Cross River North SD (SD: 25)
    (182, 'OBUDU', '14', 9, 'CROSS RIVER', 25, 'Cross River North', 76, 'Obanliku / Obudu / Bekwarra'),
-- Cross River South SD (SD: 27)
    (183, 'ODUKPANI', '15', 9, 'CROSS RIVER', 27, 'Cross River South', 82, 'Calabar Municipal / Odukpani'),
-- Cross River North SD (SD: 25)
    (184, 'OGOJA', '16', 9, 'CROSS RIVER', 25, 'Cross River North', 77, 'Ogoja / Yala'),
-- Cross River Central SD (SD: 26)
    (185, 'YAKURR', '17', 9, 'CROSS RIVER', 26, 'Cross River Central', 78, 'Abi / Yakurr'),
-- Cross River North SD (SD: 25)
    (186, 'YALA', '18', 9, 'CROSS RIVER', 25, 'Cross River North', 77, 'Ogoja / Yala'),
-- ============================================================
-- DELTA STATE (state_id: 10)
-- ============================================================
-- Delta North SD (SD: 29)
    (187, 'ANIOCHA NORTH', '01', 10, 'DELTA', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
    (188, 'ANIOCHA - SOUTH', '02', 10, 'DELTA', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
-- Delta South SD (SD: 30)
    (189, 'BOMADI', '03', 10, 'DELTA', 30, 'Delta South', 90, 'Bomadi / Patani'),
    (190, 'BURUTU', '04', 10, 'DELTA', 30, 'Delta South', 91, 'Burutu'),
-- Delta Central SD (SD: 28)
    (191, 'ETHIOPE  EAST', '05', 10, 'DELTA', 28, 'Delta Central', 84, 'Ethiope East / Ethiope West'),
    (192, 'ETHIOPE  WEST', '06', 10, 'DELTA', 28, 'Delta Central', 84, 'Ethiope East / Ethiope West'),
-- Delta North SD (SD: 29)
    (193, 'IKA NORTH- EAST', '07', 10, 'DELTA', 29, 'Delta North', 88, 'Ika North East / Ika South'),
    (194, 'IKA - SOUTH', '08', 10, 'DELTA', 29, 'Delta North', 88, 'Ika North East / Ika South'),
-- Delta South SD (SD: 30)
    (195, 'ISOKO NORTH', '09', 10, 'DELTA', 30, 'Delta South', 92, 'Isoko North / Isoko South'),
    (196, 'ISOKO SOUTH', '10', 10, 'DELTA', 30, 'Delta South', 92, 'Isoko North / Isoko South'),
-- Delta North SD (SD: 29)
    (197, 'NDOKWA EAST', '11', 10, 'DELTA', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
    (198, 'NDOKWA WEST', '12', 10, 'DELTA', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
-- Delta Central SD (SD: 28)
    (199, 'OKPE', '13', 10, 'DELTA', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
-- Delta North SD (SD: 29)
    (200, 'OSHIMILI - NORTH', '14', 10, 'DELTA', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
    (201, 'OSHIMILI - SOUTH', '15', 10, 'DELTA', 29, 'Delta North', 87, 'Aniocha North / Aniocha South / Oshimili North / Oshimili South'),
-- Delta South SD (SD: 30)
    (202, 'PATANI', '16', 10, 'DELTA', 30, 'Delta South', 90, 'Bomadi / Patani'),
-- Delta Central SD (SD: 28)
    (203, 'SAPELE', '17', 10, 'DELTA', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
    (204, 'UDU', '18', 10, 'DELTA', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
    (205, 'UGHELLI NORTH', '19', 10, 'DELTA', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
    (206, 'UGHELLI SOUTH', '20', 10, 'DELTA', 28, 'Delta Central', 86, 'Ughelli North / Ughelli South / Udu'),
-- Delta North SD (SD: 29)
    (207, 'UKWUANI', '21', 10, 'DELTA', 29, 'Delta North', 89, 'Ndokwa East / Ndokwa West / Ukwuani'),
-- Delta Central SD (SD: 28)
    (208, 'UVWIE', '22', 10, 'DELTA', 28, 'Delta Central', 85, 'Okpe / Sapele / Uvwie'),
-- Delta South SD (SD: 30)
    (209, 'WARRI  NORTH', '23', 10, 'DELTA', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
    (210, 'WARRI SOUTH', '24', 10, 'DELTA', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
    (211, 'WARRI SOUTH  WEST', '25', 10, 'DELTA', 30, 'Delta South', 93, 'Warri North / Warri South / Warri South West'),
-- ============================================================
-- EBONYI STATE (state_id: 11)
-- ============================================================
-- Ebonyi North SD (SD: 31)
    (212, 'ABAKALIKI', '01', 11, 'EBONYI', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
-- Ebonyi South SD (SD: 33)
    (213, 'AFIKPO NORTH', '02', 11, 'EBONYI', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
    (214, 'AFIKPO  SOUTH', '03', 11, 'EBONYI', 33, 'Ebonyi South', 98, 'Afikpo North / Edda'),
-- Ebonyi North SD (SD: 31)
    (215, 'EBONYI', '04', 11, 'EBONYI', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
-- Ebonyi Central SD (SD: 32)
    (216, 'EZZA NORTH', '05', 11, 'EBONYI', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
    (217, 'EZZA SOUTH', '06', 11, 'EBONYI', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
    (218, 'IKWO', '07', 11, 'EBONYI', 32, 'Ebonyi Central', 97, 'Ezza South / Ikwo'),
    (219, 'ISHIELU', '08', 11, 'EBONYI', 32, 'Ebonyi Central', 96, 'Ezza North / Ishielu'),
-- Ebonyi South SD (SD: 33)
    (220, 'IVO', '09', 11, 'EBONYI', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
-- Ebonyi North SD (SD: 31)
    (221, 'IZZI', '10', 11, 'EBONYI', 31, 'Ebonyi North', 94, 'Abakaliki / Izzi'),
-- Ebonyi South SD (SD: 33)
    (222, 'OHAOZARA', '11', 11, 'EBONYI', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
-- Ebonyi North SD (SD: 31)
    (223, 'OHAUKWU', '12', 11, 'EBONYI', 31, 'Ebonyi North', 95, 'Ebonyi / Ohaukwu'),
-- Ebonyi South SD (SD: 33)
    (224, 'ONICHA', '13', 11, 'EBONYI', 33, 'Ebonyi South', 99, 'Ivo / Ohaozara / Onicha'),
-- ============================================================
-- EDO STATE (state_id: 12)
-- ============================================================
-- Edo North SD (SD: 36)
    (225, 'AKOKO EDO', '01', 12, 'EDO', 36, 'Edo North', 108, 'Akoko-Edo'),
-- Edo South SD (SD: 34)
    (226, 'EGOR', '02', 12, 'EDO', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
-- Edo Central SD (SD: 35)
    (227, 'ESAN CENTRAL', '03', 12, 'EDO', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
    (228, 'ESAN NORTH EAST', '04', 12, 'EDO', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
    (229, 'ESAN SOUTH EAST', '05', 12, 'EDO', 35, 'Edo Central', 105, 'Esan North-East / Esan South-East'),
    (230, 'ESAN WEST', '06', 12, 'EDO', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
-- Edo North SD (SD: 36)
    (231, 'ETSAKO CENTRAL', '07', 12, 'EDO', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
    (232, 'ETSAKO EAST', '08', 12, 'EDO', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
    (233, 'ETSAKO  WEST', '09', 12, 'EDO', 36, 'Edo North', 106, 'Etsako Central / Etsako East / Etsako West'),
-- Edo Central SD (SD: 35)
    (234, 'IGUEBEN', '10', 12, 'EDO', 35, 'Edo Central', 104, 'Esan Central / Esan West / Igueben'),
-- Edo South SD (SD: 34)
    (235, 'IKPOBA/OKHA', '11', 12, 'EDO', 34, 'Edo South', 100, 'Egor / Ikpoba-Okha'),
    (236, 'OREDO', '12', 12, 'EDO', 34, 'Edo South', 101, 'Oredo'),
    (237, 'ORHIONMWON', '13', 12, 'EDO', 34, 'Edo South', 102, 'Orhionmwon / Uhunmwonde'),
    (238, 'OVIA NORTH EAST', '14', 12, 'EDO', 34, 'Edo South', 103, 'Ovia North-East / Ovia South-West'),
    (239, 'OVIA SOUTH WEST', '15', 12, 'EDO', 34, 'Edo South', 103, 'Ovia North-East / Ovia South-West'),
-- Edo North SD (SD: 36)
    (240, 'OWAN EAST', '16', 12, 'EDO', 36, 'Edo North', 107, 'Owan East / Owan West'),
    (241, 'OWAN WEST', '17', 12, 'EDO', 36, 'Edo North', 107, 'Owan East / Owan West'),
-- Edo South SD (SD: 34)
    (242, 'UHUNMWODE', '18', 12, 'EDO', 34, 'Edo South', 102, 'Orhionmwon / Uhunmwonde'),
-- ============================================================
-- EKITI STATE (state_id: 13)
-- ============================================================
-- Ekiti Central SD (SD: 37)
    (243, 'ADO EKITI', '01', 13, 'EKITI', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
    (244, 'EFON', '02', 13, 'EKITI', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
-- Ekiti South SD (SD: 39)
    (245, 'EKITI EAST', '03', 13, 'EKITI', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),
-- Ekiti Central SD (SD: 37)
    (246, 'EKITI WEST', '04', 13, 'EKITI', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
-- Ekiti South SD (SD: 39)
    (247, 'EKITI SOUTH WEST', '05', 13, 'EKITI', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
    (248, 'EMURE', '06', 13, 'EKITI', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),
    (249, 'GBONYIN', '07', 13, 'EKITI', 39, 'Ekiti South', 114, 'Ekiti East / Emure / Gbonyin'),
-- Ekiti North SD (SD: 38)
    (250, 'IDO / OSI', '08', 13, 'EKITI', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
-- Ekiti Central SD (SD: 37)
    (251, 'IJERO', '09', 13, 'EKITI', 37, 'Ekiti Central', 110, 'Ijero / Ekiti West / Efon'),
-- Ekiti South SD (SD: 39)
    (252, 'IKERE', '10', 13, 'EKITI', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
-- Ekiti North SD (SD: 38)
    (253, 'IKOLE', '11', 13, 'EKITI', 38, 'Ekiti North', 111, 'Ikole / Oye'),
    (254, 'ILEJEMEJE', '12', 13, 'EKITI', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
-- Ekiti Central SD (SD: 37)
    (255, 'IREPODUN / IFELODUN', '13', 13, 'EKITI', 37, 'Ekiti Central', 109, 'Ado Ekiti / Irepodun / Ifelodun'),
-- Ekiti South SD (SD: 39)
    (256, 'ISE / ORUN', '14', 13, 'EKITI', 39, 'Ekiti South', 113, 'Ekiti South West / Ikere / Ise-Orun'),
-- Ekiti North SD (SD: 38)
    (257, 'MOBA', '15', 13, 'EKITI', 38, 'Ekiti North', 112, 'Ido-Osi / Moba / Ilejemeje'),
    (258, 'OYE', '16', 13, 'EKITI', 38, 'Ekiti North', 111, 'Ikole / Oye'),
-- ============================================================
-- ENUGU STATE (state_id: 14)
-- ============================================================
-- Enugu West SD (SD: 42)
    (259, 'ANINRI', '01', 14, 'ENUGU', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
    (260, 'AWGU', '02', 14, 'ENUGU', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
-- Enugu East SD (SD: 41)
    (261, 'ENUGU EAST', '03', 14, 'ENUGU', 41, 'Enugu East', 118, 'Enugu East / Isi Uzo'),
    (262, 'ENUGU NORTH', '04', 14, 'ENUGU', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
    (263, 'ENUGU SOUTH', '05', 14, 'ENUGU', 41, 'Enugu East', 119, 'Enugu North / Enugu South'),
-- Enugu West SD (SD: 42)
    (264, 'EZEAGU', '06', 14, 'ENUGU', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
-- Enugu North SD (SD: 40)
    (265, 'IGBO ETITI', '07', 14, 'ENUGU', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
    (266, 'IGBO EZE NORTH', '08', 14, 'ENUGU', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
    (267, 'IGBO EZE SOUTH', '09', 14, 'ENUGU', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
-- Enugu East SD (SD: 41)
    (268, 'ISI UZO', '10', 14, 'ENUGU', 41, 'Enugu East', 118, 'Enugu East / Isi Uzo'),
    (269, 'NKANU EAST', '11', 14, 'ENUGU', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
    (270, 'NKANU WEST', '12', 14, 'ENUGU', 41, 'Enugu East', 120, 'Nkanu East / Nkanu West'),
-- Enugu North SD (SD: 40)
    (271, 'NSUKKA', '13', 14, 'ENUGU', 40, 'Enugu North', 117, 'Nsukka / Igbo-Eze South'),
-- Enugu West SD (SD: 42)
    (272, 'OJI-RIVER', '14', 14, 'ENUGU', 42, 'Enugu West', 121, 'Aninri / Awgu / Oji River'),
-- Enugu North SD (SD: 40)
    (273, 'UDENU', '15', 14, 'ENUGU', 40, 'Enugu North', 115, 'Igbo-Eze North / Udenu'),
-- Enugu West SD (SD: 42)
    (274, 'UDI', '16', 14, 'ENUGU', 42, 'Enugu West', 122, 'Ezeagu / Udi'),
-- Enugu North SD (SD: 40)
    (275, 'UZO-UWANI', '17', 14, 'ENUGU', 40, 'Enugu North', 116, 'Igbo-Etiti / Uzo-Uwani'),
-- ============================================================
-- GOMBE STATE (state_id: 15)
-- ============================================================
-- Gombe Central SD (SD: 44)
    (282, 'AKKO', '01', 15, 'GOMBE', 44, 'Gombe Central', 125, 'Akko'),
-- Gombe South SD (SD: 46)
    (283, 'BALANGA', '02', 15, 'GOMBE', 46, 'Gombe South', 129, 'Balanga / Billiri'),
    (284, 'BILLIRI', '03', 15, 'GOMBE', 46, 'Gombe South', 129, 'Balanga / Billiri'),
-- Gombe North SD (SD: 45)
    (285, 'DUKKU', '04', 15, 'GOMBE', 45, 'Gombe North', 127, 'Dukku / Nafada'),
    (286, 'FUNAKAYE', '05', 15, 'GOMBE', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
    (287, 'GOMBE', '06', 15, 'GOMBE', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
-- Gombe South SD (SD: 46)
    (288, 'KALTUNGO', '07', 15, 'GOMBE', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
-- Gombe North SD (SD: 45)
    (289, 'KWAMI', '08', 15, 'GOMBE', 45, 'Gombe North', 128, 'Gombe / Kwami / Funakaye'),
    (290, 'NAFADA', '09', 15, 'GOMBE', 45, 'Gombe North', 127, 'Dukku / Nafada'),
-- Gombe South SD (SD: 46)
    (291, 'SHONGOM', '10', 15, 'GOMBE', 46, 'Gombe South', 130, 'Kaltungo / Shongom'),
-- Gombe Central SD (SD: 44)
    (292, 'YALMALTU/ DEBA', '11', 15, 'GOMBE', 44, 'Gombe Central', 126, 'Yamaltu / Deba'),
-- ============================================================
-- IMO STATE (state_id: 16)
-- ============================================================
-- Imo East SD (SD: 48)
    (293, 'ABOH MBAISE', '01', 16, 'IMO', 48, 'Imo East', 133, 'Aboh Mbaise / Ngor Okpala'),
    (294, 'AHIAZU MBAISE', '02', 16, 'IMO', 48, 'Imo East', 134, 'Ahiazu / Ezinihitte Mbaise'),
-- Imo North SD (SD: 47)
    (295, 'EHIME MBANO', '03', 16, 'IMO', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
-- Imo East SD (SD: 48)
    (296, 'EZINIHITTE MBAISE', '04', 16, 'IMO', 48, 'Imo East', 134, 'Ahiazu / Ezinihitte Mbaise'),
-- Imo West SD (SD: 49)
    (297, 'IDEATO NORTH', '05', 16, 'IMO', 49, 'Imo West', 137, 'Ideato North / Ideato South'),
    (298, 'IDEATO SOUTH', '06', 16, 'IMO', 49, 'Imo West', 137, 'Ideato North / Ideato South'),
-- Imo North SD (SD: 47)
    (299, 'IHITTE UBOMA', '07', 16, 'IMO', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
-- Imo East SD (SD: 48)
    (300, 'IKEDURU', '08', 16, 'IMO', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
-- Imo North SD (SD: 47)
    (301, 'ISIALA MBANO', '09', 16, 'IMO', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
-- Imo West SD (SD: 49)
    (302, 'ISU', '10', 16, 'IMO', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
-- Imo East SD (SD: 48)
    (303, 'MBAITOLI', '11', 16, 'IMO', 48, 'Imo East', 135, 'Ikeduru / Mbaitoli'),
    (304, 'NGOR OKPALA', '12', 16, 'IMO', 48, 'Imo East', 133, 'Aboh Mbaise / Ngor Okpala'),
-- Imo West SD (SD: 49)
    (305, 'NJABA', '13', 16, 'IMO', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
    (306, 'NKWERRE', '14', 16, 'IMO', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
    (307, 'NWANGELE', '15', 16, 'IMO', 49, 'Imo West', 138, 'Isu / Njaba / Nkwerre / Nwangele'),
-- Imo North SD (SD: 47)
    (308, 'OBOWO', '16', 16, 'IMO', 47, 'Imo North', 131, 'Ehime Mbano / Ihitte Uboma / Obowo'),
-- Imo West SD (SD: 49)
    (309, 'OGUTA', '17', 16, 'IMO', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
    (310, 'OHAJI EGBEMA', '18', 16, 'IMO', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
-- Imo North SD (SD: 47)
    (311, 'OKIGWE', '19', 16, 'IMO', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
    (312, 'ONUIMO', '20', 16, 'IMO', 47, 'Imo North', 132, 'Okigwe / Onuimo'),
-- Imo West SD (SD: 49)
    (313, 'ORLU', '21', 16, 'IMO', 49, 'Imo West', 140, 'Orlu / Orsu / Oru East'),
    (314, 'ORSU', '22', 16, 'IMO', 49, 'Imo West', 140, 'Orlu / Orsu / Oru East'),
    (315, 'ORU EAST', '23', 16, 'IMO', 49, 'Imo West', 140, 'Orlu / Orsu / Oru East'),
    (316, 'ORU WEST', '24', 16, 'IMO', 49, 'Imo West', 139, 'Oguta / Ohaji-Egbema / Oru West'),
-- Imo East SD (SD: 48)
    (317, 'OWERRI MUNICIPAL', '25', 16, 'IMO', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
    (318, 'OWERRI NORTH', '26', 16, 'IMO', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
    (319, 'OWERRI WEST', '27', 16, 'IMO', 48, 'Imo East', 136, 'Owerri Municipal / Owerri North / Owerri West'),
-- ============================================================
-- JIGAWA STATE (state_id: 17)
-- ============================================================
-- Jigawa North-East SD (SD: 50)
    (320, 'AUYO', '01', 17, 'JIGAWA', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
-- Jigawa North-West SD (SD: 51)
    (321, 'BABURA', '02', 17, 'JIGAWA', 51, 'Jigawa North-West', 144, 'Babura / Garki'),
-- Jigawa South-West SD (SD: 52)
    (322, 'BIRNIN KUDU', '03', 17, 'JIGAWA', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
-- Jigawa North-East SD (SD: 50)
    (323, 'BIRNIWA', '04', 17, 'JIGAWA', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
-- Jigawa South-West SD (SD: 52)
    (324, 'BUJI', '05', 17, 'JIGAWA', 52, 'Jigawa South-West', 147, 'Birnin Kudu / Buji'),
    (325, 'DUTSE', '06', 17, 'JIGAWA', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
-- Jigawa North-West SD (SD: 51)
    (326, 'GARKI', '07', 17, 'JIGAWA', 51, 'Jigawa North-West', 144, 'Babura / Garki'),
    (327, 'GAGARAWA', '08', 17, 'JIGAWA', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
    (328, 'GUMEL', '09', 17, 'JIGAWA', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
-- Jigawa North-East SD (SD: 50)
    (329, 'GURI', '10', 17, 'JIGAWA', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
-- Jigawa South-West SD (SD: 52)
    (330, 'GWARAM', '11', 17, 'JIGAWA', 52, 'Jigawa South-West', 149, 'Gwaram'),
-- Jigawa North-West SD (SD: 51)
    (331, 'GWIWA', '12', 17, 'JIGAWA', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
-- Jigawa North-East SD (SD: 50)
    (332, 'HADEJIA', '13', 17, 'JIGAWA', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
-- Jigawa South-West SD (SD: 52)
    (333, 'JAHUN', '14', 17, 'JIGAWA', 52, 'Jigawa South-West', 150, 'Jahun / Miga'),
-- Jigawa North-East SD (SD: 50)
    (334, 'KAFIN HAUSA', '15', 17, 'JIGAWA', 50, 'Jigawa North-East', 141, 'Hadejia / Kafin Hausa / Auyo'),
    (335, 'KAUGAMA', '16', 17, 'JIGAWA', 50, 'Jigawa North-East', 143, 'Kaugama / Malam Madori'),
-- Jigawa North-West SD (SD: 51)
    (336, 'KAZAURE', '17', 17, 'JIGAWA', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
-- Jigawa North-East SD (SD: 50)
    (337, 'KIRIKA SAMMA', '18', 17, 'JIGAWA', 50, 'Jigawa North-East', 142, 'Birniwa / Guri / Kiri Kasamma'),
-- Jigawa South-West SD (SD: 52)
    (338, 'KIYAWA', '19', 17, 'JIGAWA', 52, 'Jigawa South-West', 148, 'Dutse / Kiyawa'),
-- Jigawa North-West SD (SD: 51)
    (339, 'MAIGATARI', '20', 17, 'JIGAWA', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
-- Jigawa North-East SD (SD: 50)
    (340, 'MALAM MADORI', '21', 17, 'JIGAWA', 50, 'Jigawa North-East', 143, 'Kaugama / Malam Madori'),
-- Jigawa South-West SD (SD: 52)
    (341, 'MIGA', '22', 17, 'JIGAWA', 52, 'Jigawa South-West', 150, 'Jahun / Miga'),
    (342, 'RINGIM', '23', 17, 'JIGAWA', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),
-- Jigawa North-West SD (SD: 51)
    (343, 'RONI', '24', 17, 'JIGAWA', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
    (344, 'SULE-TANKARKAR', '25', 17, 'JIGAWA', 51, 'Jigawa North-West', 145, 'Gumel / Maigatari / Sule Tankarkar / Gagarawa'),
-- Jigawa South-West SD (SD: 52)
    (345, 'TAURA', '26', 17, 'JIGAWA', 52, 'Jigawa South-West', 151, 'Ringim / Taura'),
-- Jigawa North-West SD (SD: 51)
    (346, 'YANKWASHI', '27', 17, 'JIGAWA', 51, 'Jigawa North-West', 146, 'Kazaure / Roni / Gwiwa / Yankwashi'),
-- ============================================================
-- KADUNA STATE (state_id: 18)
-- ============================================================
-- Kaduna Central SD (SD: 54)
    (347, 'BIRNIN GWARI', '01', 18, 'KADUNA', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
    (348, 'CHIKUN', '02', 18, 'KADUNA', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
    (349, 'GIWA', '03', 18, 'KADUNA', 54, 'Kaduna Central', 158, 'Birnin Gwari / Giwa'),
    (350, 'IGABI', '04', 18, 'KADUNA', 54, 'Kaduna Central', 160, 'Igabi'),
-- Kaduna North SD (SD: 53)
    (351, 'IKARA', '05', 18, 'KADUNA', 53, 'Kaduna North', 152, 'Ikara / Kubau'),
-- Kaduna South SD (SD: 55)
    (352, 'JABA', '06', 18, 'KADUNA', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
    (353, 'JEMA''A', '07', 18, 'KADUNA', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
    (354, 'KACHIA', '08', 18, 'KADUNA', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
-- Kaduna Central SD (SD: 54)
    (355, 'KADUNA NORTH', '09', 18, 'KADUNA', 54, 'Kaduna Central', 161, 'Kaduna North'),
    (356, 'KADUNA SOUTH', '10', 18, 'KADUNA', 54, 'Kaduna Central', 162, 'Kaduna South'),
-- Kaduna South SD (SD: 55)
    (357, 'KAGARKO', '11', 18, 'KADUNA', 55, 'Kaduna South', 165, 'Kachia / Kagarko'),
-- Kaduna Central SD (SD: 54)
    (358, 'KAJURU', '12', 18, 'KADUNA', 54, 'Kaduna Central', 159, 'Chikun / Kajuru'),
-- Kaduna South SD (SD: 55)
    (359, 'KAURA', '13', 18, 'KADUNA', 55, 'Kaduna South', 166, 'Kaura'),
    (360, 'KAURU', '14', 18, 'KADUNA', 55, 'Kaduna South', 167, 'Kauru'),
-- Kaduna North SD (SD: 53)
    (361, 'KUBAU', '15', 18, 'KADUNA', 53, 'Kaduna North', 152, 'Ikara / Kubau'),
    (362, 'KUDAN', '16', 18, 'KADUNA', 53, 'Kaduna North', 153, 'Makarfi / Kudan'),
    (363, 'LERE', '17', 18, 'KADUNA', 53, 'Kaduna North', 156, 'Lere'),
    (364, 'MAKARFI', '18', 18, 'KADUNA', 53, 'Kaduna North', 153, 'Makarfi / Kudan'),
    (365, 'SABON GARI', '19', 18, 'KADUNA', 53, 'Kaduna North', 154, 'Sabon Gari'),
-- Kaduna South SD (SD: 55)
    (366, 'SANGA', '20', 18, 'KADUNA', 55, 'Kaduna South', 164, 'Jemaa / Sanga'),
-- Kaduna North SD (SD: 53)
    (367, 'SOBA', '21', 18, 'KADUNA', 53, 'Kaduna North', 157, 'Soba'),
-- Kaduna South SD (SD: 55)
    (368, 'ZANGON KATAF', '22', 18, 'KADUNA', 55, 'Kaduna South', 163, 'Jaba / Zangon Kataf'),
-- Kaduna North SD (SD: 53)
    (369, 'ZARIA', '23', 18, 'KADUNA', 53, 'Kaduna North', 155, 'Zaria'),
-- ============================================================
-- KANO STATE (state_id: 19)
-- ============================================================
-- Kano South SD (SD: 58)
    (370, 'AJINGI', '01', 19, 'KANO', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
    (371, 'ALBASU', '02', 19, 'KANO', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
-- Kano North SD (SD: 57)
    (372, 'BAGWAI', '03', 19, 'KANO', 57, 'Kano North', 178, 'Bagwai / Shanono'),
-- Kano South SD (SD: 58)
    (373, 'BEBEJI', '04', 19, 'KANO', 58, 'Kano South', 187, 'Bebeji / Kiru'),
-- Kano North SD (SD: 57)
    (374, 'BICHI', '05', 19, 'KANO', 57, 'Kano North', 179, 'Bichi'),
-- Kano South SD (SD: 58)
    (375, 'BUNKURE', '06', 19, 'KANO', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
-- Kano Central SD (SD: 56)
    (376, 'DALA', '07', 19, 'KANO', 56, 'Kano Central', 168, 'Dala'),
-- Kano North SD (SD: 57)
    (377, 'DANBATA', '08', 19, 'KANO', 57, 'Kano North', 180, 'Dambatta / Makoda'),
-- Kano Central SD (SD: 56)
    (378, 'DAWAKI KUDU', '09', 19, 'KANO', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
-- Kano North SD (SD: 57)
    (379, 'DAWAKI TOFA', '10', 19, 'KANO', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
-- Kano South SD (SD: 58)
    (380, 'DOGUWA', '11', 19, 'KANO', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
-- Kano Central SD (SD: 56)
    (381, 'FAGGE', '12', 19, 'KANO', 56, 'Kano Central', 170, 'Fagge'),
    (382, 'GABASAWA', '13', 19, 'KANO', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
-- Kano South SD (SD: 58)
    (383, 'GARKO', '14', 19, 'KANO', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
    (384, 'GARUN MALAM', '15', 19, 'KANO', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
    (385, 'GAYA', '16', 19, 'KANO', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
-- Kano Central SD (SD: 56)
    (386, 'GEZAWA', '17', 19, 'KANO', 56, 'Kano Central', 171, 'Gezawa / Gabasawa'),
    (387, 'GWALE', '18', 19, 'KANO', 56, 'Kano Central', 172, 'Gwale'),
-- Kano North SD (SD: 57)
    (388, 'GWARZO', '19', 19, 'KANO', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
    (389, 'KABO', '20', 19, 'KANO', 57, 'Kano North', 182, 'Gwarzo / Kabo'),
-- Kano Central SD (SD: 56)
    (390, 'KANO MUNICIPAL', '21', 19, 'KANO', 56, 'Kano Central', 173, 'Kano Municipal'),
-- Kano South SD (SD: 58)
    (391, 'KARAYE', '22', 19, 'KANO', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
    (392, 'KIBIYA', '23', 19, 'KANO', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
    (393, 'KIRU', '24', 19, 'KANO', 58, 'Kano South', 187, 'Bebeji / Kiru'),
-- Kano Central SD (SD: 56)
    (394, 'KUMBOTSO', '25', 19, 'KANO', 56, 'Kano Central', 174, 'Kumbotso'),
-- Kano North SD (SD: 57)
    (395, 'KUNCHI', '26', 19, 'KANO', 57, 'Kano North', 184, 'Kunchi / Tsanyawa'),
-- Kano South SD (SD: 58)
    (396, 'KURA', '27', 19, 'KANO', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
    (397, 'MADOBI', '28', 19, 'KANO', 58, 'Kano South', 189, 'Kura / Madobi / Garun Mallam'),
-- Kano North SD (SD: 57)
    (398, 'MAKODA', '29', 19, 'KANO', 57, 'Kano North', 180, 'Dambatta / Makoda'),
    (399, 'MINJIBIR', '30', 19, 'KANO', 57, 'Kano North', 185, 'Minjibir / Ungogo'),
-- Kano Central SD (SD: 56)
    (400, 'NASARAWA', '31', 19, 'KANO', 56, 'Kano Central', 175, 'Nasarawa'),
-- Kano South SD (SD: 58)
    (401, 'RANO', '32', 19, 'KANO', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
-- Kano North SD (SD: 57)
    (402, 'RIMIN GADO', '33', 19, 'KANO', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
-- Kano South SD (SD: 58)
    (403, 'ROGO', '34', 19, 'KANO', 58, 'Kano South', 190, 'Rano / Bunkure / Kibiya'),
-- Kano North SD (SD: 57)
    (404, 'SHANONO', '35', 19, 'KANO', 57, 'Kano North', 178, 'Bagwai / Shanono'),
-- Kano South SD (SD: 58)
    (405, 'SUMAILA', '36', 19, 'KANO', 58, 'Kano South', 191, 'Takai / Sumaila'),
    (406, 'TAKAI', '37', 19, 'KANO', 58, 'Kano South', 191, 'Takai / Sumaila'),
-- Kano Central SD (SD: 56)
    (407, 'TARAUNI', '38', 19, 'KANO', 56, 'Kano Central', 176, 'Tarauni'),
-- Kano North SD (SD: 57)
    (408, 'TOFA', '39', 19, 'KANO', 57, 'Kano North', 181, 'Dawakin Tofa / Tofa / Rimin Gado'),
    (409, 'TSANYAWA', '40', 19, 'KANO', 57, 'Kano North', 184, 'Kunchi / Tsanyawa'),
-- Kano South SD (SD: 58)
    (410, 'TUDUN WADA', '41', 19, 'KANO', 58, 'Kano South', 188, 'Doguwa / Tudun Wada'),
-- Kano Central SD (SD: 56)
    (411, 'UNGOGO', '42', 19, 'KANO', 56, 'Kano Central', 177, 'Ungogo'),
    (412, 'WARAWA', '43', 19, 'KANO', 56, 'Kano Central', 169, 'Dawakin Kudu / Warawa'),
-- Kano South SD (SD: 58)
    (413, 'WUDIL', '44', 19, 'KANO', 58, 'Kano South', 186, 'Albasu / Ajingi / Gaya'),
-- ============================================================
-- KATSINA STATE (state_id: 20)
-- ============================================================
-- Katsina South SD (SD: 61)
    (414, 'BAKORI', '01', 20, 'KATSINA', 61, 'Katsina South', 202, 'Bakori / Danja'),
-- Katsina Central SD (SD: 59)
    (415, 'BATAGARAWA', '02', 20, 'KATSINA', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
    (416, 'BATSARI', '03', 20, 'KATSINA', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
-- Katsina North SD (SD: 60)
    (417, 'BAURE', '04', 20, 'KATSINA', 60, 'Katsina North', 201, 'Zango / Baure'),
    (418, 'BINDAWA', '05', 20, 'KATSINA', 60, 'Katsina North', 197, 'Bindawa / Mani'),
-- Katsina Central SD (SD: 59)
    (419, 'CHARANCHI', '06', 20, 'KATSINA', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
-- Katsina South SD (SD: 61)
    (420, 'DANDUME', '07', 20, 'KATSINA', 61, 'Katsina South', 204, 'Funtua / Dandume'),
    (421, 'DANJA', '08', 20, 'KATSINA', 61, 'Katsina South', 202, 'Bakori / Danja'),
-- Katsina Central SD (SD: 59)
    (422, 'DAN MUSA', '09', 20, 'KATSINA', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
-- Katsina North SD (SD: 60)
    (423, 'DAURA', '10', 20, 'KATSINA', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
    (424, 'DUTSI', '11', 20, 'KATSINA', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
-- Katsina Central SD (SD: 59)
    (425, 'DUTSIN-MA', '12', 20, 'KATSINA', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
-- Katsina South SD (SD: 61)
    (426, 'FASKARI', '13', 20, 'KATSINA', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
    (427, 'FUNTUA', '14', 20, 'KATSINA', 61, 'Katsina South', 204, 'Funtua / Dandume'),
-- Katsina North SD (SD: 60)
    (428, 'INGAWA', '15', 20, 'KATSINA', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
-- Katsina Central SD (SD: 59)
    (429, 'JIBIA', '16', 20, 'KATSINA', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
-- Katsina South SD (SD: 61)
    (430, 'KAFUR', '17', 20, 'KATSINA', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
-- Katsina Central SD (SD: 59)
    (431, 'KAITA', '18', 20, 'KATSINA', 59, 'Katsina Central', 195, 'Jibia / Kaita'),
-- Katsina South SD (SD: 61)
    (432, 'KANKARA', '19', 20, 'KATSINA', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
-- Katsina North SD (SD: 60)
    (433, 'KANKIA', '20', 20, 'KATSINA', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
-- Katsina Central SD (SD: 59)
    (434, 'KATSINA', '21', 20, 'KATSINA', 59, 'Katsina Central', 196, 'Katsina Central'),
    (435, 'KURFI', '22', 20, 'KATSINA', 59, 'Katsina Central', 194, 'Dutsin-Ma / Kurfi'),
-- Katsina North SD (SD: 60)
    (436, 'KUSADA', '23', 20, 'KATSINA', 60, 'Katsina North', 199, 'Ingawa / Kankia / Kusada'),
    (437, 'MAI''ADUA', '24', 20, 'KATSINA', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
-- Katsina South SD (SD: 61)
    (438, 'MALUFASHI', '25', 20, 'KATSINA', 61, 'Katsina South', 205, 'Malumfashi / Kafur'),
-- Katsina North SD (SD: 60)
    (439, 'MANI', '26', 20, 'KATSINA', 60, 'Katsina North', 197, 'Bindawa / Mani'),
    (440, 'MASHI', '27', 20, 'KATSINA', 60, 'Katsina North', 200, 'Mashi / Dutsi'),
-- Katsina South SD (SD: 61)
    (441, 'MATAZU', '28', 20, 'KATSINA', 61, 'Katsina South', 206, 'Matazu / Musawa'),
    (442, 'MUSAWA', '29', 20, 'KATSINA', 61, 'Katsina South', 206, 'Matazu / Musawa'),
-- Katsina Central SD (SD: 59)
    (443, 'RIMI', '30', 20, 'KATSINA', 59, 'Katsina Central', 192, 'Batagarawa / Charanchi / Rimi'),
-- Katsina South SD (SD: 61)
    (444, 'SABUWA', '31', 20, 'KATSINA', 61, 'Katsina South', 203, 'Faskari / Kankara / Sabuwa'),
-- Katsina Central SD (SD: 59)
    (445, 'SAFANA', '32', 20, 'KATSINA', 59, 'Katsina Central', 193, 'Batsari / Safana / Danmusa'),
-- Katsina North SD (SD: 60)
    (446, 'SANDAMU', '33', 20, 'KATSINA', 60, 'Katsina North', 198, 'Daura / Sandamu / Maiadua'),
    (447, 'ZANGO', '34', 20, 'KATSINA', 60, 'Katsina North', 201, 'Zango / Baure'),
-- ============================================================
-- KEBBI STATE (state_id: 21)
-- ============================================================
-- Kebbi Central SD (SD: 62)
    (448, 'ALIERO', '01', 21, 'KEBBI', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
-- Kebbi North SD (SD: 63)
    (449, 'AREWA', '02', 21, 'KEBBI', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
    (450, 'ARGUNGU', '03', 21, 'KEBBI', 63, 'Kebbi North', 211, 'Argungu / Augie'),
    (451, 'AUGIE', '04', 21, 'KEBBI', 63, 'Kebbi North', 211, 'Argungu / Augie'),
    (452, 'BAGUDO', '05', 21, 'KEBBI', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
-- Kebbi Central SD (SD: 62)
    (453, 'BIRNIN KEBBI', '06', 21, 'KEBBI', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
    (454, 'BUNZA', '07', 21, 'KEBBI', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
-- Kebbi North SD (SD: 63)
    (455, 'DANDI', '08', 21, 'KEBBI', 63, 'Kebbi North', 210, 'Arewa / Dandi'),
-- Kebbi South SD (SD: 64)
    (456, 'FAKAI', '09', 21, 'KEBBI', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
-- Kebbi Central SD (SD: 62)
    (457, 'GWANDU', '10', 21, 'KEBBI', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
    (458, 'JEGA', '11', 21, 'KEBBI', 62, 'Kebbi Central', 207, 'Aleiro / Gwandu / Jega'),
    (459, 'KALGO', '12', 21, 'KEBBI', 62, 'Kebbi Central', 208, 'Birnin Kebbi / Kalgo / Bunza'),
    (460, 'KOKO/BESSE', '13', 21, 'KEBBI', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
    (461, 'MAIYAMA', '14', 21, 'KEBBI', 62, 'Kebbi Central', 209, 'Maiyama / Koko/Besse'),
-- Kebbi South SD (SD: 64)
    (462, 'NGASKI', '15', 21, 'KEBBI', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
    (463, 'SAKABA', '16', 21, 'KEBBI', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
    (464, 'SHANGA', '17', 21, 'KEBBI', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
-- Kebbi North SD (SD: 63)
    (465, 'SURU', '18', 21, 'KEBBI', 63, 'Kebbi North', 212, 'Bagudo / Suru'),
-- Kebbi South SD (SD: 64)
    (466, 'WASAGU/DANKO', '19', 21, 'KEBBI', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
    (467, 'YAURI', '20', 21, 'KEBBI', 64, 'Kebbi South', 214, 'Yauri / Shanga / Ngaski'),
    (468, 'ZURU', '21', 21, 'KEBBI', 64, 'Kebbi South', 213, 'Fakai / Sakaba / Wasagu/Danko / Zuru'),
-- ============================================================
-- KOGI STATE (state_id: 22)
-- ============================================================
-- Kogi Central SD (SD: 65)
    (469, 'ADAVI', '01', 22, 'KOGI', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
    (470, 'AJAOKUTA', '02', 22, 'KOGI', 65, 'Kogi Central', 216, 'Ajaokuta'),
-- Kogi East SD (SD: 66)
    (471, 'ANKPA', '03', 22, 'KOGI', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
    (472, 'BASSA', '04', 22, 'KOGI', 66, 'Kogi East', 219, 'Dekina / Bassa'),
    (473, 'DEKINA', '05', 22, 'KOGI', 66, 'Kogi East', 219, 'Dekina / Bassa'),
    (474, 'IBAJI', '06', 22, 'KOGI', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
    (475, 'IDAH', '07', 22, 'KOGI', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
    (476, 'IGALAMELA/ODOLU', '08', 22, 'KOGI', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
-- Kogi West SD (SD: 67)
    (477, 'IJUMU', '09', 22, 'KOGI', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
    (478, 'KABBA/BUNU', '10', 22, 'KOGI', 67, 'Kogi West', 221, 'Kabba/Bunu / Ijumu'),
    (479, 'KOGI . K. K.', '11', 22, 'KOGI', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
    (480, 'LOKOJA', '12', 22, 'KOGI', 67, 'Kogi West', 222, 'Lokoja / Kogi (Koton Karfe)'),
    (481, 'MOPA MORO', '13', 22, 'KOGI', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
-- Kogi East SD (SD: 66)
    (482, 'OFU', '14', 22, 'KOGI', 66, 'Kogi East', 220, 'Idah / Ibaji / Igalamela-Odolu / Ofu'),
-- Kogi Central SD (SD: 65)
    (483, 'OGORI MANGOGO', '15', 22, 'KOGI', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
    (484, 'OKEHI', '16', 22, 'KOGI', 65, 'Kogi Central', 215, 'Adavi / Okehi'),
    (485, 'OKENE', '17', 22, 'KOGI', 65, 'Kogi Central', 217, 'Okene / Ogori-Magongo'),
-- Kogi East SD (SD: 66)
    (486, 'OLAMABORO', '18', 22, 'KOGI', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
    (487, 'OMALA', '19', 22, 'KOGI', 66, 'Kogi East', 218, 'Ankpa / Omala / Olamaboro'),
-- Kogi West SD (SD: 67)
    (488, 'YAGBA EAST', '20', 22, 'KOGI', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
    (489, 'YAGBA WEST', '21', 22, 'KOGI', 67, 'Kogi West', 223, 'Yagba East / Yagba West / Mopa-Muro'),
-- ============================================================
-- KWARA STATE (state_id: 23)
-- ============================================================
-- Kwara Central SD (SD: 68)
    (490, 'ASA', '01', 23, 'KWARA', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
-- Kwara North SD (SD: 69)
    (491, 'BARUTEN', '02', 23, 'KWARA', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
    (492, 'EDU', '03', 23, 'KWARA', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
-- Kwara South SD (SD: 70)
    (493, 'EKITI', '04', 23, 'KWARA', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
    (494, 'IFELODUN', '05', 23, 'KWARA', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
-- Kwara Central SD (SD: 68)
    (495, 'ILORIN EAST', '06', 23, 'KWARA', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
    (496, 'ILORIN-SOUTH', '07', 23, 'KWARA', 68, 'Kwara Central', 224, 'Ilorin East / Ilorin South'),
    (497, 'ILORIN-WEST', '08', 23, 'KWARA', 68, 'Kwara Central', 225, 'Ilorin West / Asa'),
-- Kwara South SD (SD: 70)
    (498, 'IREPODUN', '09', 23, 'KWARA', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
    (499, 'ISIN', '10', 23, 'KWARA', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
-- Kwara North SD (SD: 69)
    (500, 'KAIAMA', '11', 23, 'KWARA', 69, 'Kwara North', 226, 'Baruten / Kaiama'),
    (501, 'MORO', '12', 23, 'KWARA', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
-- Kwara South SD (SD: 70)
    (502, 'OFFA', '13', 23, 'KWARA', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
    (503, 'OKE - ERO', '14', 23, 'KWARA', 70, 'Kwara South', 228, 'Ekiti / Isin / Irepodun / Oke-Ero'),
    (504, 'OYUN', '15', 23, 'KWARA', 70, 'Kwara South', 229, 'Ifelodun / Offa / Oyun'),
-- Kwara North SD (SD: 69)
    (505, 'PATIGI', '16', 23, 'KWARA', 69, 'Kwara North', 227, 'Edu / Moro / Pategi'),
-- ============================================================
-- LAGOS STATE (state_id: 24)
-- ============================================================
-- Lagos West SD (SD: 73)
    (506, 'AGEGE', '01', 24, 'LAGOS', 73, 'Lagos West', 242, 'Agege'),
    (507, 'AJEROMI/IFELODUN', '02', 24, 'LAGOS', 73, 'Lagos West', 243, 'Ajeromi-Ifelodun'),
    (508, 'ALIMOSHO', '03', 24, 'LAGOS', 73, 'Lagos West', 244, 'Alimosho'),
    (509, 'AMUWO-ODOFIN', '04', 24, 'LAGOS', 73, 'Lagos West', 245, 'Amuwo-Odofin'),
-- Lagos Central SD (SD: 71)
    (510, 'APAPA', '05', 24, 'LAGOS', 71, 'Lagos Central', 230, 'Apapa'),
-- Lagos West SD (SD: 73)
    (511, 'BADAGRY', '06', 24, 'LAGOS', 73, 'Lagos West', 246, 'Badagry'),
-- Lagos East SD (SD: 72)
    (512, 'EPE', '07', 24, 'LAGOS', 72, 'Lagos East', 237, 'Epe'),
-- Lagos Central SD (SD: 71)
    (513, 'ETI-OSA', '08', 24, 'LAGOS', 71, 'Lagos Central', 231, 'Eti-Osa'),
-- Lagos East SD (SD: 72)
    (514, 'IBEJU/LEKKI', '09', 24, 'LAGOS', 72, 'Lagos East', 238, 'Ibeju-Lekki'),
-- Lagos West SD (SD: 73)
    (515, 'IFAKO-IJAYE', '10', 24, 'LAGOS', 73, 'Lagos West', 247, 'Ifako-Ijaiye'),
    (516, 'IKEJA', '11', 24, 'LAGOS', 73, 'Lagos West', 248, 'Ikeja'),
-- Lagos East SD (SD: 72)
    (517, 'IKORODU', '12', 24, 'LAGOS', 72, 'Lagos East', 239, 'Ikorodu'),
    (518, 'KOSOFE', '13', 24, 'LAGOS', 72, 'Lagos East', 240, 'Kosofe'),
-- Lagos Central SD (SD: 71)
    (519, 'LAGOS ISLAND', '14', 24, 'LAGOS', 71, 'Lagos Central', 232, 'Lagos Island I'),
    (520, 'LAGOS MAINLAND', '15', 24, 'LAGOS', 71, 'Lagos Central', 234, 'Lagos Mainland'),
-- Lagos West SD (SD: 73)
    (521, 'MUSHIN', '16', 24, 'LAGOS', 73, 'Lagos West', 249, 'Mushin I'),
    (522, 'OJO', '17', 24, 'LAGOS', 73, 'Lagos West', 251, 'Ojo'),
    (523, 'OSHODI/ISOLO', '18', 24, 'LAGOS', 73, 'Lagos West', 252, 'Oshodi-Isolo I'),
-- Lagos East SD (SD: 72)
    (524, 'SOMOLU', '19', 24, 'LAGOS', 72, 'Lagos East', 241, 'Somolu'),
-- Lagos Central SD (SD: 71)
    (525, 'SURULERE', '20', 24, 'LAGOS', 71, 'Lagos Central', 235, 'Surulere I'),
-- ============================================================
-- NASARAWA STATE (state_id: 25)
-- ============================================================
-- Nasarawa North SD (SD: 74)
    (526, 'AKWANGA', '01', 25, 'NASARAWA', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
-- Nasarawa South SD (SD: 75)
    (527, 'AWE', '02', 25, 'NASARAWA', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
    (528, 'DOMA', '03', 25, 'NASARAWA', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
-- Nasarawa West SD (SD: 76)
    (529, 'KARU', '04', 25, 'NASARAWA', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
-- Nasarawa South SD (SD: 75)
    (530, 'KEANA', '05', 25, 'NASARAWA', 75, 'Nasarawa South', 255, 'Awe / Doma / Keana'),
-- Nasarawa West SD (SD: 76)
    (531, 'KEFFI', '06', 25, 'NASARAWA', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
    (532, 'KOKONA', '07', 25, 'NASARAWA', 76, 'Nasarawa West', 257, 'Keffi / Karu / Kokona'),
-- Nasarawa South SD (SD: 75)
    (533, 'LAFIA', '08', 25, 'NASARAWA', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
-- Nasarawa West SD (SD: 76)
    (771, 'NASARAWA', '09', 25, 'NASARAWA', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
-- Nasarawa North SD (SD: 74)
    (534, 'NASARAWA EGGON', '10', 25, 'NASARAWA', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
-- Nasarawa South SD (SD: 75)
    (774, 'OBI', '11', 25, 'NASARAWA', 75, 'Nasarawa South', 256, 'Lafia / Obi'),
-- Nasarawa West SD (SD: 76)
    (535, 'TOTO', '12', 25, 'NASARAWA', 76, 'Nasarawa West', 258, 'Nasarawa / Toto'),
-- Nasarawa North SD (SD: 74)
    (536, 'WAMBA', '13', 25, 'NASARAWA', 74, 'Nasarawa North', 254, 'Akwanga / Nasarawa Eggon / Wamba'),
-- ============================================================
-- NIGER STATE (state_id: 26)
-- ============================================================
-- Niger South SD (SD: 79)
    (537, 'AGAIE', '01', 26, 'NIGER', 79, 'Niger South', 267, 'Lapai / Agaie'),
-- Niger North SD (SD: 78)
    (538, 'AGWARA', '02', 26, 'NIGER', 78, 'Niger North', 263, 'Agwara / Borgu'),
-- Niger South SD (SD: 79)
    (539, 'BIDA', '03', 26, 'NIGER', 79, 'Niger South', 264, 'Bida / Gbako / Katcha'),
-- Niger North SD (SD: 78)
    (540, 'BORGU', '04', 26, 'NIGER', 78, 'Niger North', 263, 'Agwara / Borgu'),
-- Niger East SD (SD: 77)
    (541, 'BOSSO', '05', 26, 'NIGER', 77, 'Niger East', 260, 'Bosso / Paikoro'),
    (542, 'CHANCHAGA', '06', 26, 'NIGER', 77, 'Niger East', 259, 'Chanchaga'),
-- Niger South SD (SD: 79)
    (543, 'EDATTI', '07', 26, 'NIGER', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
    (544, 'GBAKO', '08', 26, 'NIGER', 79, 'Niger South', 264, 'Bida / Gbako / Katcha'),
-- Niger East SD (SD: 77)
    (545, 'GURARA', '09', 26, 'NIGER', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
-- Niger South SD (SD: 79)
    (546, 'KATCHA', '10', 26, 'NIGER', 79, 'Niger South', 264, 'Bida / Gbako / Katcha'),
-- Niger North SD (SD: 78)
    (547, 'KONTAGORA', '11', 26, 'NIGER', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
-- Niger South SD (SD: 79)
    (548, 'LAPAI', '12', 26, 'NIGER', 79, 'Niger South', 267, 'Lapai / Agaie'),
    (549, 'LAVUN', '13', 26, 'NIGER', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
-- Niger North SD (SD: 78)
    (550, 'MAGAMA', '14', 26, 'NIGER', 78, 'Niger North', 266, 'Rijau / Magama'),
    (551, 'MARIGA', '15', 26, 'NIGER', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
    (552, 'MASHEGU', '16', 26, 'NIGER', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
-- Niger South SD (SD: 79)
    (553, 'MOKWA', '17', 26, 'NIGER', 79, 'Niger South', 268, 'Lavun / Mokwa / Edati'),
-- Niger East SD (SD: 77)
    (554, 'MUNYA', '18', 26, 'NIGER', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
    (555, 'PAIKORO', '19', 26, 'NIGER', 77, 'Niger East', 260, 'Bosso / Paikoro'),
    (556, 'RAFI', '20', 26, 'NIGER', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
-- Niger North SD (SD: 78)
    (557, 'RIJAU', '21', 26, 'NIGER', 78, 'Niger North', 266, 'Rijau / Magama'),
-- Niger East SD (SD: 77)
    (558, 'SHIRORO', '22', 26, 'NIGER', 77, 'Niger East', 262, 'Shiroro / Rafi / Munya'),
    (559, 'SULEJA', '23', 26, 'NIGER', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
    (560, 'TAFA', '24', 26, 'NIGER', 77, 'Niger East', 261, 'Gurara / Suleja / Tafa'),
-- Niger North SD (SD: 78)
    (561, 'WUSHISHI', '25', 26, 'NIGER', 78, 'Niger North', 265, 'Kontagora / Wushishi / Mariga / Mashegu'),
-- ============================================================
-- OGUN STATE (state_id: 27)
-- ============================================================
-- Ogun Central SD (SD: 80)
    (562, 'ABEOKUTA NORTH', '01', 27, 'OGUN', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
    (563, 'ABEOKUTA SOUTH', '02', 27, 'OGUN', 80, 'Ogun Central', 270, 'Abeokuta South'),
-- Ogun West SD (SD: 82)
    (564, 'ADO ODO-OTA', '03', 27, 'OGUN', 82, 'Ogun West', 275, 'Ado-Odo / Ota'),
    (565, 'EGBADO NORTH', '04', 27, 'OGUN', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
    (566, 'EGBADO SOUTH', '05', 27, 'OGUN', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
-- Ogun Central SD (SD: 80)
    (567, 'EWEKORO', '06', 27, 'OGUN', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
    (568, 'IFO', '07', 27, 'OGUN', 80, 'Ogun Central', 271, 'Ifo / Ewekoro'),
-- Ogun East SD (SD: 81)
    (569, 'IJEBU EAST', '08', 27, 'OGUN', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
    (570, 'IJEBU NORTH', '09', 27, 'OGUN', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
    (571, 'IJEBU NORTH EAST', '10', 27, 'OGUN', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
    (572, 'IJEBU ODE', '11', 27, 'OGUN', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
    (573, 'IKENNE', '12', 27, 'OGUN', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
-- Ogun West SD (SD: 82)
    (574, 'IMEKO/AFON', '13', 27, 'OGUN', 82, 'Ogun West', 276, 'Egbado North / Imeko Afon'),
    (575, 'IPOKIA', '14', 27, 'OGUN', 82, 'Ogun West', 277, 'Egbado South / Ipokia'),
-- Ogun Central SD (SD: 80)
    (576, 'OBAFEMI/OWODE', '15', 27, 'OGUN', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
    (577, 'ODEDA', '16', 27, 'OGUN', 80, 'Ogun Central', 269, 'Abeokuta North / Obafemi-Owode / Odeda'),
-- Ogun East SD (SD: 81)
    (578, 'ODOGBOLU', '17', 27, 'OGUN', 81, 'Ogun East', 273, 'Ijebu Ode / Odogbolu / Ijebu North East'),
    (579, 'OGUN WATER SIDE', '18', 27, 'OGUN', 81, 'Ogun East', 272, 'Ijebu North / Ijebu East / Ogun Waterside'),
    (580, 'REMO NORTH', '19', 27, 'OGUN', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
    (581, 'SAGAMU', '20', 27, 'OGUN', 81, 'Ogun East', 274, 'Ikenne / Shagamu / Remo North'),
-- ============================================================
-- ONDO STATE (state_id: 28)
-- ============================================================
-- Ondo North SD (SD: 84)
    (582, 'AKOKO NORTH EAST', '01', 28, 'ONDO', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
    (583, 'AKOKO NORTH WEST', '02', 28, 'ONDO', 84, 'Ondo North', 281, 'Akoko North-East / Akoko North-West'),
    (584, 'AKOKO SOUTH EAST', '03', 28, 'ONDO', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
    (585, 'AKOKO SOUTH WEST', '04', 28, 'ONDO', 84, 'Ondo North', 282, 'Akoko South-East / Akoko South-West'),
-- Ondo Central SD (SD: 83)
    (586, 'AKURE NORTH', '05', 28, 'ONDO', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
    (587, 'AKURE SOUTH', '06', 28, 'ONDO', 83, 'Ondo Central', 278, 'Akure North / Akure South'),
-- Ondo South SD (SD: 85)
    (588, 'ESE-ODO', '07', 28, 'ONDO', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
-- Ondo Central SD (SD: 83)
    (589, 'IDANRE', '08', 28, 'ONDO', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
    (590, 'IFEDORE', '09', 28, 'ONDO', 83, 'Ondo Central', 279, 'Idanre / Ifedore'),
-- Ondo South SD (SD: 85)
    (591, 'ILAJE', '10', 28, 'ONDO', 85, 'Ondo South', 284, 'Ilaje / Ese-Odo'),
    (592, 'ILEOLUJI/OKEIGBO', '11', 28, 'ONDO', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
    (593, 'IRELE', '12', 28, 'ONDO', 85, 'Ondo South', 286, 'Okitipupa / Irele'),
    (594, 'ODIGBO', '13', 28, 'ONDO', 85, 'Ondo South', 285, 'Ile-Oluji-Okeigbo / Odigbo'),
    (595, 'OKITIPUPA', '14', 28, 'ONDO', 85, 'Ondo South', 286, 'Okitipupa / Irele'),
-- Ondo Central SD (SD: 83)
    (596, 'ONDO EAST', '15', 28, 'ONDO', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
    (597, 'ONDO WEST', '16', 28, 'ONDO', 83, 'Ondo Central', 280, 'Ondo East / Ondo West'),
-- Ondo North SD (SD: 84)
    (598, 'OSE', '17', 28, 'ONDO', 84, 'Ondo North', 283, 'Ose / Owo'),
    (599, 'OWO', '18', 28, 'ONDO', 84, 'Ondo North', 283, 'Ose / Owo'),
-- ============================================================
-- OSUN STATE (state_id: 29)
-- ============================================================
-- Osun East SD (SD: 87)
    (600, 'ATAKUMOSA EAST', '01', 29, 'OSUN', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
    (601, 'ATAKUMOSA WEST', '02', 29, 'OSUN', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
-- Osun West SD (SD: 88)
    (602, 'AYEDAADE', '03', 29, 'OSUN', 88, 'Osun West', 293, 'Ayedaade / Irewole / Isokan'),
    (603, 'AYEDIRE', '04', 29, 'OSUN', 88, 'Osun West', 294, 'Ayedire / Iwo / Ola-Oluwa'),
-- Osun Central SD (SD: 86)
    (604, 'BOLUWADURO', '05', 29, 'OSUN', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
    (605, 'BORIPE', '06', 29, 'OSUN', 86, 'Osun Central', 288, 'Ifelodun / Boripe / Odo-Otin'),
-- Osun West SD (SD: 88)
    (606, 'EDE NORTH', '07', 29, 'OSUN', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),
    (607, 'EDE SOUTH', '08', 29, 'OSUN', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),
    (608, 'EGBEDORE', '09', 29, 'OSUN', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),
    (609, 'EJIGBO', '10', 29, 'OSUN', 88, 'Osun West', 295, 'Ede North / Ede South / Egbedore / Ejigbo'),
-- Osun East SD (SD: 87)
    (610, 'IFE CENTRAL', '11', 29, 'OSUN', 87, 'Osun East', 291, 'Ife Central / Ife East / Ife North / Ife South'),
-- Osun Central SD (SD: 86)
    (611, 'IFEDAYO', '12', 29, 'OSUN', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
-- Osun East SD (SD: 87)
    (612, 'IFE EAST', '13', 29, 'OSUN', 87, 'Osun East', 291, 'Ife Central / Ife East / Ife North / Ife South'),
-- Osun Central SD (SD: 86)
    (772, 'IFELODUN', '14', 29, 'OSUN', 86, 'Osun Central', 288, 'Ifelodun / Boripe / Odo-Otin'),
-- Osun East SD (SD: 87)
    (613, 'IFE NORTH', '15', 29, 'OSUN', 87, 'Osun East', 291, 'Ife Central / Ife East / Ife North / Ife South'),
    (614, 'IFE SOUTH', '16', 29, 'OSUN', 87, 'Osun East', 291, 'Ife Central / Ife East / Ife North / Ife South'),
-- Osun Central SD (SD: 86)
    (615, 'ILA', '17', 29, 'OSUN', 86, 'Osun Central', 287, 'Boluwaduro / Ifedayo / Ila'),
-- Osun East SD (SD: 87)
    (616, 'ILESA EAST', '18', 29, 'OSUN', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
    (617, 'ILESA WEST', '19', 29, 'OSUN', 87, 'Osun East', 290, 'Atakunmosa East / Atakunmosa West / Ilesa East / Ilesa West'),
-- Osun Central SD (SD: 86)
    (770, 'IREPODUN', '20', 29, 'OSUN', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
-- Osun West SD (SD: 88)
    (618, 'IREWOLE', '21', 29, 'OSUN', 88, 'Osun West', 293, 'Ayedaade / Irewole / Isokan'),
    (619, 'ISOKAN', '22', 29, 'OSUN', 88, 'Osun West', 293, 'Ayedaade / Irewole / Isokan'),
    (620, 'IWO', '23', 29, 'OSUN', 88, 'Osun West', 294, 'Ayedire / Iwo / Ola-Oluwa'),
-- Osun East SD (SD: 87)
    (621, 'OBOKUN', '24', 29, 'OSUN', 87, 'Osun East', 292, 'Obokun / Oriade'),
-- Osun Central SD (SD: 86)
    (622, 'ODO-OTIN', '25', 29, 'OSUN', 86, 'Osun Central', 288, 'Ifelodun / Boripe / Odo-Otin'),
-- Osun West SD (SD: 88)
    (623, 'OLA-OLUWA', '26', 29, 'OSUN', 88, 'Osun West', 294, 'Ayedire / Iwo / Ola-Oluwa'),
-- Osun Central SD (SD: 86)
    (624, 'OLORUNDA', '27', 29, 'OSUN', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
-- Osun East SD (SD: 87)
    (625, 'ORIADE', '28', 29, 'OSUN', 87, 'Osun East', 292, 'Obokun / Oriade'),
-- Osun Central SD (SD: 86)
    (626, 'OROLU', '29', 29, 'OSUN', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
    (627, 'OSOGBO', '30', 29, 'OSUN', 86, 'Osun Central', 289, 'Olorunda / Irepodun / Orolu / Osogbo'),
-- ============================================================
-- OYO STATE (state_id: 30)
-- ============================================================
-- Oyo Central SD (SD: 89)
    (628, 'AFIJIO', '01', 30, 'OYO', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
    (629, 'AKINYELE', '02', 30, 'OYO', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
    (630, 'ATIBA', '03', 30, 'OYO', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
-- Oyo North SD (SD: 90)
    (631, 'ATISBO', '04', 30, 'OYO', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
-- Oyo Central SD (SD: 89)
    (632, 'EGBEDA', '05', 30, 'OYO', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
-- Oyo South SD (SD: 91)
    (633, 'IBADAN NORTH', '06', 30, 'OYO', 91, 'Oyo South', 305, 'Ibadan North'),
    (634, 'IBADAN NORTH EAST', '07', 30, 'OYO', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
    (635, 'IBADAN NORTH WEST', '08', 30, 'OYO', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
    (636, 'IBADAN SOUTH-EAST', '09', 30, 'OYO', 91, 'Oyo South', 306, 'Ibadan North-East / Ibadan South-East'),
    (637, 'IBADAN SOUTH WEST', '10', 30, 'OYO', 91, 'Oyo South', 307, 'Ibadan North-West / Ibadan South-West'),
    (638, 'IBARAPA CENTRAL', '11', 30, 'OYO', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
    (639, 'IBARAPA EAST', '12', 30, 'OYO', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
    (640, 'IBARAPA NORTH', '13', 30, 'OYO', 91, 'Oyo South', 308, 'Ibarapa Central / Ibarapa North'),
    (641, 'IDO', '14', 30, 'OYO', 91, 'Oyo South', 309, 'Ido / Ibarapa East'),
-- Oyo North SD (SD: 90)
    (642, 'IREPO', '15', 30, 'OYO', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
    (643, 'ISEYIN', '16', 30, 'OYO', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
    (644, 'ITESIWAJU', '17', 30, 'OYO', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
    (645, 'IWAJOWA', '18', 30, 'OYO', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
    (646, 'KAJOLA', '19', 30, 'OYO', 90, 'Oyo North', 303, 'Iseyin / Itesiwaju / Kajola / Iwajowa'),
-- Oyo Central SD (SD: 89)
    (647, 'LAGELU', '20', 30, 'OYO', 89, 'Oyo Central', 297, 'Akinyele / Lagelu'),
-- Oyo North SD (SD: 90)
    (648, 'OGBOMOSO NORTH', '21', 30, 'OYO', 90, 'Oyo North', 304, 'Ogbomoso North / Ogbomoso South / Oriire'),
    (649, 'OGBOMOSO SOUTH', '22', 30, 'OYO', 90, 'Oyo North', 304, 'Ogbomoso North / Ogbomoso South / Oriire'),
-- Oyo Central SD (SD: 89)
    (650, 'OGO-OLUWA', '23', 30, 'OYO', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
-- Oyo North SD (SD: 90)
    (651, 'OLORUNSOGO', '24', 30, 'OYO', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
-- Oyo Central SD (SD: 89)
    (652, 'OLUYOLE', '25', 30, 'OYO', 89, 'Oyo Central', 299, 'Oluyole'),
    (653, 'ONA-ARA', '26', 30, 'OYO', 89, 'Oyo Central', 298, 'Egbeda / Ona-Ara'),
-- Oyo North SD (SD: 90)
    (654, 'OORELOPE', '27', 30, 'OYO', 90, 'Oyo North', 302, 'Irepo / Olorunsogo / Oorelope'),
    (655, 'ORI IRE', '28', 30, 'OYO', 90, 'Oyo North', 304, 'Ogbomoso North / Ogbomoso South / Oriire'),
-- Oyo Central SD (SD: 89)
    (656, 'OYO EAST', '29', 30, 'OYO', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
    (657, 'OYO WEST', '30', 30, 'OYO', 89, 'Oyo Central', 296, 'Afijio / Atiba / Oyo East / Oyo West'),
-- Oyo North SD (SD: 90)
    (658, 'SAKI EAST', '31', 30, 'OYO', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
    (659, 'SAKI WEST', '32', 30, 'OYO', 90, 'Oyo North', 301, 'Atisbo / Saki East / Saki West'),
-- Oyo Central SD (SD: 89)
    (773, 'SURULERE', '33', 30, 'OYO', 89, 'Oyo Central', 300, 'Ogo-Oluwa / Surulere'),
-- ============================================================
-- PLATEAU STATE (state_id: 31)
-- ============================================================
-- Plateau North SD (SD: 93)
    (660, 'BARIKIN LADI', '01', 31, 'PLATEAU', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
    (769, 'BASSA', '02', 31, 'PLATEAU', 93, 'Plateau North', 313, 'Jos North / Bassa'),
-- Plateau Central SD (SD: 92)
    (661, 'BOKKOS', '03', 31, 'PLATEAU', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
-- Plateau North SD (SD: 93)
    (662, 'JOS EAST', '04', 31, 'PLATEAU', 93, 'Plateau North', 314, 'Jos South / Jos East'),
    (663, 'JOS NORTH', '05', 31, 'PLATEAU', 93, 'Plateau North', 313, 'Jos North / Bassa'),
    (664, 'JOS SOUTH', '06', 31, 'PLATEAU', 93, 'Plateau North', 314, 'Jos South / Jos East'),
-- Plateau Central SD (SD: 92)
    (665, 'KANAM', '07', 31, 'PLATEAU', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
    (666, 'KANKE', '08', 31, 'PLATEAU', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
-- Plateau South SD (SD: 94)
    (667, 'LANGTANG NORTH', '09', 31, 'PLATEAU', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
    (668, 'LANGTANG SOUTH', '10', 31, 'PLATEAU', 94, 'Plateau South', 315, 'Langtang North / Langtang South'),
-- Plateau Central SD (SD: 92)
    (669, 'MANGU', '11', 31, 'PLATEAU', 92, 'Plateau Central', 310, 'Bokkos / Mangu'),
-- Plateau South SD (SD: 94)
    (670, 'MIKANG', '12', 31, 'PLATEAU', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
-- Plateau Central SD (SD: 92)
    (671, 'PANKSHIN', '13', 31, 'PLATEAU', 92, 'Plateau Central', 311, 'Pankshin / Kanke / Kanam'),
-- Plateau South SD (SD: 94)
    (672, 'QUA''AN PAN', '14', 31, 'PLATEAU', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
-- Plateau North SD (SD: 93)
    (673, 'RIYOM', '15', 31, 'PLATEAU', 93, 'Plateau North', 312, 'Barkin Ladi / Riyom'),
-- Plateau South SD (SD: 94)
    (674, 'SHENDAM', '16', 31, 'PLATEAU', 94, 'Plateau South', 316, 'Mikang / Quaan Pan / Shendam'),
    (675, 'WASE', '17', 31, 'PLATEAU', 94, 'Plateau South', 317, 'Wase'),
-- ============================================================
-- RIVERS STATE (state_id: 32)
-- ============================================================
-- Rivers West SD (SD: 97)
    (676, 'ABUA-ODUAL', '01', 32, 'RIVERS', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
    (677, 'AHOADA EAST', '02', 32, 'RIVERS', 97, 'Rivers West', 327, 'Abua/Odual / Ahoada East'),
    (678, 'AHOADA WEST', '03', 32, 'RIVERS', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
    (679, 'AKUKU TORU', '04', 32, 'RIVERS', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
-- Rivers South-East SD (SD: 96)
    (680, 'ANDONI', '05', 32, 'RIVERS', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
-- Rivers West SD (SD: 97)
    (681, 'ASARI-TORU', '06', 32, 'RIVERS', 97, 'Rivers West', 330, 'Asari-Toru / Akuku-Toru'),
    (682, 'BONNY', '07', 32, 'RIVERS', 97, 'Rivers West', 329, 'Degema / Bonny'),
    (683, 'DEGEMA', '08', 32, 'RIVERS', 97, 'Rivers West', 329, 'Degema / Bonny'),
-- Rivers South-East SD (SD: 96)
    (684, 'ELEME', '09', 32, 'RIVERS', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
-- Rivers West SD (SD: 97)
    (685, 'EMOHUA', '10', 32, 'RIVERS', 97, 'Rivers West', 319, 'Ikwerre / Emohua'),
-- Rivers East SD (SD: 95)
    (686, 'ETCHE', '11', 32, 'RIVERS', 95, 'Rivers East', 318, 'Etche / Omuma'),
-- Rivers South-East SD (SD: 96)
    (687, 'GOKANA', '12', 32, 'RIVERS', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
-- Rivers West SD (SD: 97)
    (688, 'IKWERRE', '13', 32, 'RIVERS', 97, 'Rivers West', 319, 'Ikwerre / Emohua'),
-- Rivers South-East SD (SD: 96)
    (689, 'KHANA', '14', 32, 'RIVERS', 96, 'Rivers South-East', 325, 'Gokana / Khana'),
-- Rivers East SD (SD: 95)
    (690, 'OBIO/AKPOR', '15', 32, 'RIVERS', 95, 'Rivers East', 320, 'Obio/Akpor'),
-- Rivers West SD (SD: 97)
    (691, 'OGBA/EGBEMA/NDONI', '16', 32, 'RIVERS', 97, 'Rivers West', 328, 'Ahoada West / Ogba/Egbema/Ndoni'),
-- Rivers East SD (SD: 95)
    (692, 'OGU/BOLO', '17', 32, 'RIVERS', 95, 'Rivers East', 321, 'Okrika / Ogu/Bolo'),
    (693, 'OKRIKA', '18', 32, 'RIVERS', 95, 'Rivers East', 321, 'Okrika / Ogu/Bolo'),
    (694, 'OMUMA', '19', 32, 'RIVERS', 95, 'Rivers East', 318, 'Etche / Omuma'),
-- Rivers South-East SD (SD: 96)
    (695, 'OPOBO/NKORO', '20', 32, 'RIVERS', 96, 'Rivers South-East', 324, 'Andoni / Opobo/Nkoro'),
-- Rivers East SD (SD: 95)
    (696, 'OYIGBO', '21', 32, 'RIVERS', 95, 'Rivers East', 326, 'Eleme / Tai / Oyigbo'),
    (697, 'PORT HARCOURT', '22', 32, 'RIVERS', 95, 'Rivers East', 322, 'Port Harcourt I'),
-- Rivers South-East SD (SD: 96)
    (698, 'TAI', '23', 32, 'RIVERS', 96, 'Rivers South-East', 326, 'Eleme / Tai / Oyigbo'),
-- ============================================================
-- SOKOTO STATE (state_id: 33)
-- ============================================================
-- Sokoto North SD (SD: 99)
    (699, 'BINJI', '01', 33, 'SOKOTO', 99, 'Sokoto North', 335, 'Binji / Silame'),
-- Sokoto South SD (SD: 100)
    (700, 'BODINGA', '02', 33, 'SOKOTO', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
    (701, 'DANGE/SHUNI', '03', 33, 'SOKOTO', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
-- Sokoto East SD (SD: 98)
    (702, 'GADA', '04', 33, 'SOKOTO', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
    (703, 'GORONYO', '05', 33, 'SOKOTO', 98, 'Sokoto East', 331, 'Gada / Goronyo'),
-- Sokoto North SD (SD: 99)
    (704, 'GUDU', '06', 33, 'SOKOTO', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
-- Sokoto East SD (SD: 98)
    (705, 'GWADABAWA', '07', 33, 'SOKOTO', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
    (706, 'ILLELA', '08', 33, 'SOKOTO', 98, 'Sokoto East', 333, 'Illela / Gwadabawa'),
    (707, 'ISA', '09', 33, 'SOKOTO', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
-- Sokoto North SD (SD: 99)
    (708, 'KWARE', '10', 33, 'SOKOTO', 99, 'Sokoto North', 336, 'Kware / Wamako'),
-- Sokoto South SD (SD: 100)
    (709, 'KEBBE', '11', 33, 'SOKOTO', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
-- Sokoto East SD (SD: 98)
    (710, 'RABAH', '12', 33, 'SOKOTO', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
    (711, 'S/BIRNI', '13', 33, 'SOKOTO', 98, 'Sokoto East', 332, 'Isa / Sabon Birni'),
-- Sokoto South SD (SD: 100)
    (712, 'SHAGARI', '14', 33, 'SOKOTO', 100, 'Sokoto South', 341, 'Yabo / Shagari'),
-- Sokoto North SD (SD: 99)
    (713, 'SILAME', '15', 33, 'SOKOTO', 99, 'Sokoto North', 335, 'Binji / Silame'),
    (714, 'SOKOTO NORTH', '16', 33, 'SOKOTO', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
    (715, 'SOKOTO SOUTH', '17', 33, 'SOKOTO', 99, 'Sokoto North', 337, 'Sokoto North / Sokoto South'),
-- Sokoto South SD (SD: 100)
    (716, 'TAMBUWAL', '18', 33, 'SOKOTO', 100, 'Sokoto South', 339, 'Kebbe / Tambuwal'),
-- Sokoto North SD (SD: 99)
    (717, 'TANGAZA', '19', 33, 'SOKOTO', 99, 'Sokoto North', 338, 'Tangaza / Gudu'),
-- Sokoto South SD (SD: 100)
    (718, 'TURETA', '20', 33, 'SOKOTO', 100, 'Sokoto South', 340, 'Bodinga / Dange-Shuni / Tureta'),
-- Sokoto North SD (SD: 99)
    (719, 'WAMAKKO', '21', 33, 'SOKOTO', 99, 'Sokoto North', 336, 'Kware / Wamako'),
-- Sokoto East SD (SD: 98)
    (720, 'WURNO', '22', 33, 'SOKOTO', 98, 'Sokoto East', 334, 'Rabah / Wurno'),
-- Sokoto South SD (SD: 100)
    (721, 'YABO', '23', 33, 'SOKOTO', 100, 'Sokoto South', 341, 'Yabo / Shagari'),
-- ============================================================
-- TARABA STATE (state_id: 34)
-- ============================================================
-- Taraba North SD (SD: 101)
    (722, 'ARDO - KOLA', '01', 34, 'TARABA', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
-- Taraba Central SD (SD: 102)
    (723, 'BALI', '02', 34, 'TARABA', 102, 'Taraba Central', 344, 'Bali / Gassol'),
-- Taraba South SD (SD: 103)
    (724, 'DONGA', '03', 34, 'TARABA', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
-- Taraba Central SD (SD: 102)
    (725, 'GASHAKA', '04', 34, 'TARABA', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
    (726, 'GASSOL', '05', 34, 'TARABA', 102, 'Taraba Central', 344, 'Bali / Gassol'),
-- Taraba South SD (SD: 103)
    (727, 'IBI', '06', 34, 'TARABA', 103, 'Taraba South', 347, 'Wukari / Ibi'),
-- Taraba North SD (SD: 101)
    (728, 'JALINGO', '07', 34, 'TARABA', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
    (729, 'KARIM-LAMIDO', '08', 34, 'TARABA', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
-- Taraba Central SD (SD: 102)
    (730, 'KURMI', '09', 34, 'TARABA', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
-- Taraba North SD (SD: 101)
    (731, 'LAU', '10', 34, 'TARABA', 101, 'Taraba North', 343, 'Karim Lamido / Lau / Ardo-Kola'),
-- Taraba Central SD (SD: 102)
    (732, 'SARDAUNA', '11', 34, 'TARABA', 102, 'Taraba Central', 345, 'Sardauna / Gashaka / Kurmi'),
-- Taraba South SD (SD: 103)
    (733, 'TAKUM', '12', 34, 'TARABA', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
    (734, 'USSA', '13', 34, 'TARABA', 103, 'Taraba South', 346, 'Donga / Ussa / Takum / Yangtu Special Development Area'),
    (735, 'WUKARI', '14', 34, 'TARABA', 103, 'Taraba South', 347, 'Wukari / Ibi'),
-- Taraba North SD (SD: 101)
    (736, 'YORRO', '15', 34, 'TARABA', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
    (737, 'ZING', '16', 34, 'TARABA', 101, 'Taraba North', 342, 'Jalingo / Yorro / Zing'),
-- ============================================================
-- YOBE STATE (state_id: 35)
-- ============================================================
-- Yobe North SD (SD: 104)
    (738, 'BADE', '01', 35, 'YOBE', 104, 'Yobe North', 348, 'Bade / Jakusko'),
-- Yobe East SD (SD: 105)
    (739, 'BURSARI', '02', 35, 'YOBE', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
    (740, 'DAMATURU', '03', 35, 'YOBE', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
-- Yobe South SD (SD: 106)
    (741, 'FIKA', '04', 35, 'YOBE', 106, 'Yobe South', 352, 'Fika / Fune'),
    (742, 'FUNE', '05', 35, 'YOBE', 106, 'Yobe South', 352, 'Fika / Fune'),
-- Yobe East SD (SD: 105)
    (743, 'GEIDAM', '06', 35, 'YOBE', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
    (744, 'GUJBA', '07', 35, 'YOBE', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
    (745, 'GULANI', '08', 35, 'YOBE', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
-- Yobe North SD (SD: 104)
    (746, 'JAKUSKO', '09', 35, 'YOBE', 104, 'Yobe North', 348, 'Bade / Jakusko'),
    (747, 'KARASAWA', '10', 35, 'YOBE', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
    (748, 'MACHINA', '11', 35, 'YOBE', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
-- Yobe South SD (SD: 106)
    (749, 'NANGERE', '12', 35, 'YOBE', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
-- Yobe North SD (SD: 104)
    (750, 'NGURU', '13', 35, 'YOBE', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
-- Yobe South SD (SD: 106)
    (751, 'POTISKUM', '14', 35, 'YOBE', 106, 'Yobe South', 353, 'Potiskum / Nangere'),
-- Yobe East SD (SD: 105)
    (752, 'TARMUWA', '15', 35, 'YOBE', 105, 'Yobe East', 350, 'Damaturu / Gujba / Gulani / Tarmuwa'),
    (753, 'YUNUSARI', '16', 35, 'YOBE', 105, 'Yobe East', 351, 'Geidam / Yunusari / Bursari'),
-- Yobe North SD (SD: 104)
    (754, 'YUSUFARI', '17', 35, 'YOBE', 104, 'Yobe North', 349, 'Machina / Nguru / Karasuwa / Yusufari'),
-- ============================================================
-- ZAMFARA STATE (state_id: 36)
-- ============================================================
-- Zamfara West SD (SD: 109)
    (755, 'ANKA', '01', 36, 'ZAMFARA', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
    (756, 'BAKURA', '02', 36, 'ZAMFARA', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
-- Zamfara North SD (SD: 107)
    (757, 'BIRNIN MAGAJI', '03', 36, 'ZAMFARA', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
-- Zamfara West SD (SD: 109)
    (758, 'BUKKUYUM', '04', 36, 'ZAMFARA', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum'),
-- Zamfara Central SD (SD: 108)
    (759, 'BUNGUDU', '05', 36, 'ZAMFARA', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
-- Zamfara West SD (SD: 109)
    (760, 'GUMMI', '06', 36, 'ZAMFARA', 109, 'Zamfara West', 360, 'Gummi / Bukkuyum'),
-- Zamfara Central SD (SD: 108)
    (761, 'GUSAU', '07', 36, 'ZAMFARA', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
-- Zamfara North SD (SD: 107)
    (762, 'KAURA NAMODA', '08', 36, 'ZAMFARA', 107, 'Zamfara North', 355, 'Kaura Namoda / Birnin Magaji'),
-- Zamfara West SD (SD: 109)
    (763, 'MARADUN', '09', 36, 'ZAMFARA', 109, 'Zamfara West', 358, 'Bakura / Maradun'),
-- Zamfara Central SD (SD: 108)
    (764, 'MARU', '10', 36, 'ZAMFARA', 108, 'Zamfara Central', 357, 'Bungudu / Maru'),
-- Zamfara North SD (SD: 107)
    (765, 'SHINKAFI', '11', 36, 'ZAMFARA', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
-- Zamfara West SD (SD: 109)
    (766, 'TALATA MAFARA', '12', 36, 'ZAMFARA', 109, 'Zamfara West', 359, 'Anka / Talata Mafara'),
-- Zamfara Central SD (SD: 108)
    (767, 'TSAFE', '13', 36, 'ZAMFARA', 108, 'Zamfara Central', 356, 'Gusau / Tsafe'),
-- Zamfara North SD (SD: 107)
    (768, 'ZURMI', '14', 36, 'ZAMFARA', 107, 'Zamfara North', 354, 'Zurmi / Shinkafi'),
-- ============================================================
-- FEDERAL CAPITAL TERRITORY STATE (state_id: 37)
-- ============================================================
-- FCT Senatorial District SD (SD: 43)
    (276, 'ABAJI', '01', 37, 'FEDERAL CAPITAL TERRITORY', 43, 'FCT Senatorial District', 123, 'Abaji / Gwagwalada / Kuje / Kwali'),
    (277, 'BWARI', '02', 37, 'FEDERAL CAPITAL TERRITORY', 43, 'FCT Senatorial District', 124, 'AMAC / Bwari'),
    (278, 'GWAGWALADA', '03', 37, 'FEDERAL CAPITAL TERRITORY', 43, 'FCT Senatorial District', 123, 'Abaji / Gwagwalada / Kuje / Kwali'),
    (279, 'KUJE', '04', 37, 'FEDERAL CAPITAL TERRITORY', 43, 'FCT Senatorial District', 123, 'Abaji / Gwagwalada / Kuje / Kwali'),
    (280, 'KWALI', '05', 37, 'FEDERAL CAPITAL TERRITORY', 43, 'FCT Senatorial District', 123, 'Abaji / Gwagwalada / Kuje / Kwali'),
    (281, 'MUNICIPAL', '06', 37, 'FEDERAL CAPITAL TERRITORY', 43, 'FCT Senatorial District', 124, 'AMAC / Bwari');


-- +goose Down
DROP INDEX IF EXISTS idx_lgas_name;
DROP TABLE IF EXISTS lgas;