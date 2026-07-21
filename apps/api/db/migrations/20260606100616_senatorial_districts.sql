-- +goose Up
CREATE TABLE IF NOT EXISTS senatorial_districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    coalition_center VARCHAR(255),
    state_id INTEGER NOT NULL REFERENCES c_states(id) ON DELETE CASCADE,
    state_name VARCHAR(255) NOT NULL,
    federal_constituencies_count INTEGER DEFAULT 0,
    lgas_count INTEGER DEFAULT 0,
    state_constituencies_count INTEGER DEFAULT 0,
    wards_count INTEGER DEFAULT 0,
    polling_units_count INTEGER DEFAULT 0
);

CREATE INDEX idx_senatorial_districts_name ON senatorial_districts (name);

INSERT INTO senatorial_districts (id, name, description, coalition_center, state_id, state_name) VALUES
-- Abia (ID: 1)
(1, 'Abia North', 'Comprising Umunneochi, Isuikwuato, Ohafia, Arochukwu, Bende', 'Ohafia LGA HQS', 1, 'Abia'),
(2, 'Abia Central', 'Comprising Umuahia North, Umuahia South, Ikwuano, Isiala Ngwa North, Isiala Ngwa South, Osisioma', 'Umuahia North LGA HQS', 1, 'Abia'),
(3, 'Abia South', 'Comprising Aba North, Aba South, Ugwunagbo, Obingwa, Ukwa East, Ukwa West', 'Aba South LGA HQS', 1, 'Abia'),

-- Adamawa (ID: 2)
(4, 'Adamawa North', 'Comprising Madagali, Maiha, Michika, Mubi North, Mubi South', 'Mubi', 2, 'Adamawa'),
(5, 'Adamawa South', 'Comprising Demsa, Ganye, Guyuk, JADA, Mayo-Belwa, Numan, Shelleng, Toungo, Lamurde', 'Numan', 2, 'Adamawa'),
(6, 'Adamawa Central', 'Comprising Hong, Gombi, Song, Girei, Yola North, Yola South, Fufore', 'Yola', 2, 'Adamawa'),

-- Akwa Ibom (ID: 3)
(7, 'Akwa Ibom North-East', 'Uyo, Itu, Ibiono Ibom, Uruan, Nsit Atai, Nsit Ubium, Nsit Ibom, Etinan, Ibesikpo Asutan', 'Uyo', 3, 'Akwa Ibom'),
(8, 'Akwa Ibom North-West', 'Ikot Ekpene, Essien Udim, Obot Akara, Ikono, Ini, Abak, Etim Ekpo, Ika, Ukanafun, Oruk Anam', 'Ikot Ekpene', 3, 'Akwa Ibom'),
(9, 'Akwa Ibom South', 'Eket, Onna, Esit Eket, Ibeno, Mkpat Enin, Ikot Abasi, Eastern Obolo, Oron, Udung Uko, Urue Offong/Oruko, Okobo, Mbo', 'Eket', 3, 'Akwa Ibom'),

-- Anambra (ID: 4)
(10, 'Anambra North', 'Onitsha North, Onitsha South, Ogbaru, Oyi, Ayamelum, Anambra East, Anambra West', 'Onitsha', 4, 'Anambra'),
(11, 'Anambra Central', 'Awka North, Awka South, Njikoka, Anaocha, Idemili North, Idemili South, Dunukofia', 'Awka', 4, 'Anambra'),
(12, 'Anambra South', 'Aguata, Orumba North, Orumba South, Ihiala, Ekwusigo, Nnewi North, Nnewi South', 'Nnewi', 4, 'Anambra'),

-- Bauchi (ID: 5)
(13, 'Bauchi South', 'Bauchi, Toro, Dass, Tafawa Balewa, Bogoro, Alkaleri, Kirfi', 'Bauchi', 5, 'Bauchi'),
(14, 'Bauchi Central', 'Ningi, Warji, Darazo, Ganjuwa, Misau, Dambam', 'Darazo', 5, 'Bauchi'),
(15, 'Bauchi North', 'Katagum, Shira, Giade, Itas/Gadau, Zaki, Gamawa, Jama’are', 'Azare', 5, 'Bauchi'),

-- Bayelsa (ID: 6)
(16, 'Bayelsa East', 'Brass, Nembe, Ogbia', 'Brass', 6, 'Bayelsa'),
(17, 'Bayelsa Central', 'Yenagoa, Kolokuma/Opokuma, Southern Ijaw', 'Yenagoa', 6, 'Bayelsa'),
(18, 'Bayelsa West', 'Sagbama, Ekeremor', 'Sagbama', 6, 'Bayelsa'),

-- Benue (ID: 7)
(19, 'Benue North-East', 'Katsina-Ala, Konshisha, Kwande, Logo, Ukum, Ushongo, Vandeikya', 'Katsina-Ala', 7, 'Benue'),
(20, 'Benue North-West', 'Buruku, Gboko, Guma, Gwer East, Gwer West, Makurdi, Tarka', 'Makurdi', 7, 'Benue'),
(21, 'Benue South', 'Ado, Agatu, Apa, Obi, Ogbadibo, Ohimini, Oju, Okpokwu, Otukpo', 'Otukpo', 7, 'Benue'),

-- Borno (ID: 8)
(22, 'Borno North', 'Abadam, Gubio, Guzamala, Kukawa, Magumeri, Marte, Mobbar, Monguno, Nganzai', 'Monguno', 8, 'Borno'),
(23, 'Borno Central', 'Maiduguri, Jere, Konduga, Mafa, Dikwa, Ngala, Kala/Balge, Bama, Kaga', 'Maiduguri', 8, 'Borno'),
(24, 'Borno South', 'Askira/Uba, Bayo, Biu, Chibok, Damboa, Gwoza, Hawul, Kwaya Kusar, Shani', 'Biu', 8, 'Borno'),

-- Cross River (ID: 9)
(25, 'Cross River North', 'Ogoja, Yala, Obudu, Obanliku, Bekwarra', 'Ogoja', 9, 'Cross River'),
(26, 'Cross River Central', 'Ikom, Boki, Etung, Obubra, Abi, Yakurr', 'Ikom', 9, 'Cross River'),
(27, 'Cross River South', 'Calabar Municipal, Calabar South, Akpabuyo, Bakassi, Odukpani, Akamkpa, Biase', 'Calabar', 9, 'Cross River'),

-- Delta (ID: 10)
(28, 'Delta Central', 'Ethiope East, Ethiope West, Okpe, Sapele, Udu, Ughelli North, Ughelli South, Uvwie', 'Ughelli', 10, 'Delta'),
(29, 'Delta North', 'Aniocha North, Aniocha South, Ika North East, Ika South, Ndokwa East, Ndokwa West, Oshimili North, Oshimili South, Ukwuani', 'Asaba', 10, 'Delta'),
(30, 'Delta South', 'Bomadi, Burutu, Isoko North, Isoko South, Patani, Warri North, Warri South, Warri South West', 'Oleh', 10, 'Delta'),

-- Ebonyi (ID: 11)
(31, 'Ebonyi North', 'Abakaliki, Ebonyi, Izzi, Ohaukwu', 'Abakaliki', 11, 'Ebonyi'),
(32, 'Ebonyi Central', 'Ezza North, Ezza South, Ikwo, Ishielu', 'Onueke', 11, 'Ebonyi'),
(33, 'Ebonyi South', 'Afikpo North, Afikpo South, Ivo, Ohaozara, Onicha', 'Afikpo', 11, 'Ebonyi'),

-- Edo (ID: 12)
(34, 'Edo South', 'Oredo, Ovia South West, Ovia North East, Ikpoba Okha, Uhunmwonde, Orhionmwon, Egor', 'Benin City', 12, 'Edo'),
(35, 'Edo Central', 'Esan Central, Esan North East, Esan South East, Esan West, Igueben', 'Uromi', 12, 'Edo'),
(36, 'Edo North', 'Etsako West, Etsako East, Etsako Central, Owan West, Owan East, Akoko Edo', 'Auchi', 12, 'Edo'),

-- Ekiti (ID: 13)
(37, 'Ekiti Central', 'Ado Ekiti, Efon, Ekiti West, Ijero, Irepodun/Ifelodun', 'Ado-Ekiti', 13, 'Ekiti'),
(38, 'Ekiti North', 'Ido Osi, Ikole, Ilejemeje, Moba, Oye', 'Ido-Ekiti', 13, 'Ekiti'),
(39, 'Ekiti South', 'Ekiti East, Ekiti South West, Emure, Gbonyin, Ikere, Ise/Orun', 'Ikere-Ekiti', 13, 'Ekiti'),

-- Enugu (ID: 14)
(40, 'Enugu North', 'Nsukka, Igbo-Eze North, Igbo-Eze South, Uzo-Uwani, Igbo-Etiti, Udenu', 'Nsukka', 14, 'Enugu'),
(41, 'Enugu East', 'Enugu North, Enugu East, Enugu South, Isi-Uzo, Nkanu East, Nkanu West', 'Enugu', 14, 'Enugu'),
(42, 'Enugu West', 'Aninri, Awgu, Ezeagu, Oji-River, Udi', 'Awgu', 14, 'Enugu'),

-- Abuja FCT (ID: 37)
(43, 'FCT Senatorial District', 'Abuja Municipal, Abaji, Bwari, Gwagwalada, Kuje, Kwali', 'Gwagwalada', 37, 'Abuja FCT'),

-- Gombe (ID: 15)
(44, 'Gombe Central', 'Akko, Yamaltu/Deba', 'Kumo', 15, 'Gombe'),
(45, 'Gombe North', 'Dukku, Funakaye, Gombe, Kwami, Nafada', 'Gombe', 15, 'Gombe'),
(46, 'Gombe South', 'Balanga, Billiri, Kaltungo, Shongom', 'Billiri', 15, 'Gombe'),

-- Imo (ID: 16)
(47, 'Imo North', 'Ehime-Mbano, Ihitte-Uboma, Isiala-Mbano, Obowo, Okigwe, Onuimo', 'Okigwe', 16, 'Imo'),
(48, 'Imo East', 'Aboh-Mbaise, Ahiazu-Mbaise, Ezinihitte-Mbaise, Ikeduru, Mbaitoli, Ngor-Okpala, Owerri Municipal, Owerri North, Owerri South', 'Owerri', 16, 'Imo'),
(49, 'Imo West', 'Ideato North, Ideato South, Isu, Njaba, Nwangele, Nkwerre, Oguta, Ohaji-Egbema, Orlu, Orsu, Oru East, Oru West', 'Orlu', 16, 'Imo'),

-- Jigawa (ID: 17)
(50, 'Jigawa North-East', 'Hadejia, Kafin Hausa, Auyo, Birniwa, Guri, Kaugama, Kirikasamma, Malam Madori', 'Hadejia', 17, 'Jigawa'),
(51, 'Jigawa North-West', 'Babura, Birnin Kudu, Garki, Gagarawa, Gumel, Gwiwa, Maigatari, Ringim, Sule Tankarkar, Taura', 'Gumel', 17, 'Jigawa'),
(52, 'Jigawa South-West', 'Dutse, Birnin Kudu, Buji, Gwaram, Kiyawa, Jahun, Miga', 'Dutse', 17, 'Jigawa'),

-- Kaduna (ID: 18)
(53, 'Kaduna North', 'Ikara, Kubau, Kudan, Makarfi, Sabon Gari, Soba, Zaria', 'Zaria', 18, 'Kaduna'),
(54, 'Kaduna Central', 'Birnin Gwari, Chikun, Giwa, Igabi, Kaduna North, Kaduna South, Kajuru', 'Kaduna', 18, 'Kaduna'),
(55, 'Kaduna South', 'Jaba, Jema’a, Kachia, Kagarko, Kaura, Kauru, Lere, Sanga, Zangon Kataf', 'Kafanchan', 18, 'Kaduna'),

-- Kano (ID: 19)
(56, 'Kano Central', 'Kano Municipal, Fagge, Dala, Gwale, Tarauni, Nasarawa, Kumbotso, Ungogo, Dawakin Kudu, Gezawa, Minjibir, Warawa, Kura, Madobi, Garun Mallam', 'Kano', 19, 'Kano'),
(57, 'Kano North', 'Bichi, Bagwai, Shanono, Tsanyawa, Kunchi, Makoda, Danbatta, Minjibir, Gwarzo, Kabo, Rimingado, Tofa, Dawakin Tofa', 'Bichi', 19, 'Kano'),
(58, 'Kano South', 'Bebeji, Bunkure, Doguwa, Gaya, Albasu, Ajingi, Wudil, Sumaila, Kibiya, Rano, Tudun Wada, Karaye, Rogo, Kiru', 'Rano', 19, 'Kano'),

-- Katsina (ID: 20)
(59, 'Katsina Central', 'Katsina, Batagarawa, Cheranchi, Dan-Musa, Dutsin-Ma, Jibia, Kaita, Kurfi, Rimi, Safana', 'Katsina', 20, 'Katsina'),
(60, 'Katsina North', 'Daura, Baure, Bindawa, Dutsi, Ingawa, Kankia, Mani, Mashi, Mai’Adua, Sandamu, Zango', 'Daura', 20, 'Katsina'),
(61, 'Katsina South', 'Funtua, Bakori, Dandume, Danja, Faskari, Kafur, Kankara, Malumfashi, Musawa, Matazu, Sabuwa', 'Funtua', 20, 'Katsina'),

-- Kebbi (ID: 21)
(62, 'Kebbi Central', 'Birnin Kebbi, Gwandu, Jega, Kalgo, Koko/Besse, Maiyama, Aliero', 'Birnin Kebbi', 21, 'Kebbi'),
(63, 'Kebbi North', 'Argungu, Augie, Bagudo, Bunza, Dandi, Suru, Arewa Dandi', 'Argungu', 21, 'Kebbi'),
(64, 'Kebbi South', 'Zuru, Danko-Wasagu, Fakai, Sakaba, Ngaski, Shanga, Yauri', 'Zuru', 21, 'Kebbi'),

-- Kogi (ID: 22)
(65, 'Kogi Central', 'Adavi, Ajaokuta, Ogori-Magongo, Okene, Okehi', 'Okene', 22, 'Kogi'),
(66, 'Kogi East', 'Ankpa, Bassa, Dekina, Ibaji, Idah, Igalamela-Odolu, Itobe, Omala, Olamaboro', 'Idah', 22, 'Kogi'),
(67, 'Kogi West', 'Kabba/Bunu, Kogi, Lokoja, Mopa-Muro, Ijumu, Yagba East, Yagba West', 'Lokoja', 22, 'Kogi'),

-- Kwara (ID: 23)
(68, 'Kwara Central', 'Ilorin East, Ilorin South, Ilorin West, Asa', 'Ilorin', 23, 'Kwara'),
(69, 'Kwara North', 'Baruten, Kaiama, Moro, Pategi, Edu', 'Lafiagi', 23, 'Kwara'),
(70, 'Kwara South', 'Ekiti, Ifelodun, Irepodun, Isin, Offa, Oke-Ero, Oyun', 'Omupo', 23, 'Kwara'),

-- Lagos (ID: 24)
(71, 'Lagos Central', 'Lagos Island, Lagos Mainland, Surulere, Apapa, Eti-Osa', 'Lagos Island', 24, 'Lagos'),
(72, 'Lagos East', 'Shomolu, Kosofe, Ikorodu, Epe, Ibeju-Lekki', 'Ikorodu', 24, 'Lagos'),
(73, 'Lagos West', 'Alimosho, Agege, Ifako-Ijaiye, Ikeja, Mushin, Oshodi-Isolo, Ojo, Badagry, Amuwo-Odofin, Ajeromi-Ifelodun', 'Ikeja', 24, 'Lagos'),

-- Nasarawa (ID: 25)
(74, 'Nasarawa North', 'Akwanga, Nasarawa-Eggon, Wamba', 'Akwanga', 25, 'Nasarawa'),
(75, 'Nasarawa South', 'Lafia, Doma, Awe, Keana, Obi', 'Lafia', 25, 'Nasarawa'),
(76, 'Nasarawa West', 'Karu, Keffi, Kokona, Nasarawa, Toto', 'Keffi', 25, 'Nasarawa'),

-- Niger (ID: 26)
(77, 'Niger East', 'Bosso, Chanchaga, Gurara, Munya, Paikoro, Rafi, Shiroro, Suleja, Tafa', 'Minna', 26, 'Niger'),
(78, 'Niger North', 'Agwara, Borgu, Kontagora, Magama, Mariga, Mashegu, Rijau, Wushishi', 'Kontagora', 26, 'Niger'),
(79, 'Niger South', 'Agaie, Bida, Edati, Gbako, Katcha, Lapai, Lavun, Mokwa', 'Bida', 26, 'Niger'),

-- Ogun (ID: 27)
(80, 'Ogun Central', 'Abeokuta North, Abeokuta South, Ewekoro, Ifo, Obafemi-Owode, Odeda', 'Abeokuta', 27, 'Ogun'),
(81, 'Ogun East', 'Ijebu North, Ijebu North East, Ijebu Ode, Ijebu East, Ikenne, Odogbolu, Ogun Waterside, Remo North, Sagamu', 'Ijebu-Ode', 27, 'Ogun'),
(82, 'Ogun West', 'Ado-Odo/Ota, Egbado North, Egbado South, Imeko Afon, Ipokia', 'Ilaro', 27, 'Ogun'),

-- Ondo (ID: 28)
(83, 'Ondo Central', 'Akure North, Akure South, Idanre, Ifedore, Ondo East, Ondo West', 'Akure', 28, 'Ondo'),
(84, 'Ondo North', 'Akoko North East, Akoko North West, Akoko South East, Akoko South West, Owo, Ose', 'Owo', 28, 'Ondo'),
(85, 'Ondo South', 'Ese Odo, Ilaje, Ile Oluji/Okeigbo, Irele, Odigbo, Okitipupa', 'Okitipupa', 28, 'Ondo'),

-- Osun (ID: 29)
(86, 'Osun Central', 'Boluwaduro, Boripe, Ifelodun, Ila, Irepodun, Odo Otin, Olorunda, Ororolu, Osogbo', 'Osogbo', 29, 'Osun'),
(87, 'Osun East', 'Atakunmosa East, Atakunmosa West, Ife Central, Ife East, Ife North, Ife South, Ilesa East, Ilesa West, Obokun, Oriade', 'Ife', 29, 'Osun'),
(88, 'Osun West', 'Ayedaade, Ayedire, Ede North, Ede South, Egbedore, Ejigbo, Isokan, Iwo, Ola Oluwa, Irewole', 'Iwo', 29, 'Osun'),

-- Oyo (ID: 30)
(89, 'Oyo Central', 'Afijio, Akinyele, Egbeda, Lagelu, Oluyole, Ona Ara, Oyo East, Oyo West, Surulere', 'Oyo', 30, 'Oyo'),
(90, 'Oyo North', 'Atisbo, Irepo, Iseyin, Itesiwaju, Iwajowa, Kajola, Olorunsogo, Ogbomosho North, Ogbomosho South, Orelope, Ori Ire, Saki East, Saki West', 'Iseyin', 30, 'Oyo'),
(91, 'Oyo South', 'Ibadan North, Ibadan North East, Ibadan North West, Ibadan South East, Ibadan South West, Ibarapa Central, Ibarapa East, Ibarapa North, Itesiwaju', 'Ibadan', 30, 'Oyo'),

-- Plateau (ID: 31)
(92, 'Plateau Central', 'Bokkos, Mangu, Pankshin, Kanke, Kanam', 'Pankshin', 31, 'Plateau'),
(93, 'Plateau North', 'Jos North, Jos South, Jos East, Bassa, Barkin Ladi, Riyom', 'Jos', 31, 'Plateau'),
(94, 'Plateau South', 'Langtang North, Langtang South, Mikang, Qua’an Pan, Shendam, Wase', 'Shendam', 31, 'Plateau'),

-- Rivers (ID: 32)
(95, 'Rivers East', 'Port Harcourt, Obio/Akpor, Okrika, Ogu/Bolo, Eleme, Tai, Oyigbo, Etche, Omuma', 'Port Harcourt', 32, 'Rivers'),
(96, 'Rivers South-East', 'Andoni, Opobo/Nkoro, Khana, Gokana', 'Bori', 32, 'Rivers'),
(97, 'Rivers West', 'Asari-Toru, Akuku-Toru, Degema, Bonny, Ahoada East, Ahoada West, Abua/Odual, Emohua, Ikwerre', 'Ahoada', 32, 'Rivers'),

-- Sokoto (ID: 33)
(98, 'Sokoto East', 'Isa, Sabon Birni, Wurno, Rabah, Goronyo, Gada, Illela, Gwadabawa', 'Wurno', 33, 'Sokoto'),
(99, 'Sokoto North', 'Sokoto North, Sokoto South, Binji, Wamakko, Silame, Kware, Tangaza, Gudu', 'Sokoto', 33, 'Sokoto'),
(100, 'Sokoto South', 'Dange-Shuni, Tureta, Bodinga, Shagari, Yabo, Kebbe, Tambuwal, Gummi', 'Bodinga', 33, 'Sokoto'),

-- Taraba (ID: 34)
(101, 'Taraba North', 'Jalingo, Lau, Zing, Yorro, Ardo-Kola, Karim-Lamido', 'Jalingo', 34, 'Taraba'),
(102, 'Taraba Central', 'Bali, Gashaka, Kurmi, Sardauna, Gassol', 'Bali', 34, 'Taraba'),
(103, 'Taraba South', 'Wukari, Donga, Takum, Ussa, Ibi', 'Wukari', 34, 'Taraba'),

-- Yobe (ID: 35)
(104, 'Yobe North', 'Bade, Jakusko, Karasuwa, Machina, Nguru, Yusufari', 'Gashua', 35, 'Yobe'),
(105, 'Yobe East', 'Bursari, Geidam, Gujba, Gulani, Tarmuwa, Yunusari, Damaturu', 'Damaturu', 35, 'Yobe'),
(106, 'Yobe South', 'Fika, Fune, Nangere, Potiskum', 'Potiskum', 35, 'Yobe'),

-- Zamfara (ID: 36)
(107, 'Zamfara North', 'Shinkafi, Zurmi, Birnin Magaji, Kaura Namoda', 'Kaura Namoda', 36, 'Zamfara'),
(108, 'Zamfara Central', 'Gusau, Tsafe, Bungudu, Maru', 'Gusau', 36, 'Zamfara'),
(109, 'Zamfara West', 'Bakura, Maradun, Talata Mafara, Anka, Gummi, Bukkuyum', 'Talata Mafara', 36, 'Zamfara');


-- +goose Down
DROP INDEX IF EXISTS idx_senatorial_districts_name;
DROP TABLE IF EXISTS senatorial_districts;
