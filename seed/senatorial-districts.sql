-- 1. Create the Senatorial Districts Table
CREATE TABLE IF NOT EXISTS senatorial_districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    coalition_center VARCHAR(255),
    state_id INTEGER NOT NULL,
    state_name VARCHAR(255) NOT NULL
);

-- 2. Insert Senatorial Districts
-- Note: Codes and Collation Centers are based on INEC (Independent National Electoral Commission) standard naming conventions.

INSERT INTO senatorial_districts (id, name, code, description, coalition_center, state_id, state_name) VALUES
-- Abia (ID: 1)
(1, 'Abia North', 'SD/001/AB', 'Comprising Umunneochi, Isuikwuato, Ohafia, Arochukwu, Bende', 'Ohafia LGA HQS', 1, 'Abia'),
(2, 'Abia Central', 'SD/002/AB', 'Comprising Umuahia North, Umuahia South, Ikwuano, Isiala Ngwa North, Isiala Ngwa South, Osisioma', 'Umuahia North LGA HQS', 1, 'Abia'),
(3, 'Abia South', 'SD/003/AB', 'Comprising Aba North, Aba South, Ugwunagbo, Obingwa, Ukwa East, Ukwa West', 'Aba South LGA HQS', 1, 'Abia'),

-- Adamawa (ID: 2)
(4, 'Adamawa North', 'SD/004/AD', 'Comprising Madagali, Maiha, Michika, Mubi North, Mubi South', 'Mubi', 2, 'Adamawa'),
(5, 'Adamawa South', 'SD/005/AD', 'Comprising Demsa, Ganye, Guyuk, JADA, Mayo-Belwa, Numan, Shelleng, Toungo, Lamurde', 'Numan', 2, 'Adamawa'),
(6, 'Adamawa Central', 'SD/006/AD', 'Comprising Hong, Gombi, Song, Girei, Yola North, Yola South, Fufore', 'Yola', 2, 'Adamawa'),

-- Akwa Ibom (ID: 3)
(7, 'Akwa Ibom North-East', 'SD/007/AK', 'Uyo, Itu, Ibiono Ibom, Uruan, Nsit Atai, Nsit Ubium, Nsit Ibom, Etinan, Ibesikpo Asutan', 'Uyo', 3, 'Akwa Ibom'),
(8, 'Akwa Ibom North-West', 'SD/008/AK', 'Ikot Ekpene, Essien Udim, Obot Akara, Ikono, Ini, Abak, Etim Ekpo, Ika, Ukanafun, Oruk Anam', 'Ikot Ekpene', 3, 'Akwa Ibom'),
(9, 'Akwa Ibom South', 'SD/009/AK', 'Eket, Onna, Esit Eket, Ibeno, Mkpat Enin, Ikot Abasi, Eastern Obolo, Oron, Udung Uko, Urue Offong/Oruko, Okobo, Mbo', 'Eket', 3, 'Akwa Ibom'),

-- Anambra (ID: 4)
(10, 'Anambra North', 'SD/010/AN', 'Onitsha North, Onitsha South, Ogbaru, Oyi, Ayamelum, Anambra East, Anambra West', 'Onitsha', 4, 'Anambra'),
(11, 'Anambra Central', 'SD/011/AN', 'Awka North, Awka South, Njikoka, Anaocha, Idemili North, Idemili South, Dunukofia', 'Awka', 4, 'Anambra'),
(12, 'Anambra South', 'SD/012/AN', 'Aguata, Orumba North, Orumba South, Ihiala, Ekwusigo, Nnewi North, Nnewi South', 'Nnewi', 4, 'Anambra'),

-- Bauchi (ID: 5)
(13, 'Bauchi South', 'SD/013/BA', 'Bauchi, Toro, Dass, Tafawa Balewa, Bogoro, Alkaleri, Kirfi', 'Bauchi', 5, 'Bauchi'),
(14, 'Bauchi Central', 'SD/014/BA', 'Ningi, Warji, Darazo, Ganjuwa, Misau, Dambam', 'Darazo', 5, 'Bauchi'),
(15, 'Bauchi North', 'SD/015/BA', 'Katagum, Shira, Giade, Itas/Gadau, Zaki, Gamawa, Jama’are', 'Azare', 5, 'Bauchi'),

-- Bayelsa (ID: 6)
(16, 'Bayelsa East', 'SD/016/BY', 'Brass, Nembe, Ogbia', 'Brass', 6, 'Bayelsa'),
(17, 'Bayelsa Central', 'SD/017/BY', 'Yenagoa, Kolokuma/Opokuma, Southern Ijaw', 'Yenagoa', 6, 'Bayelsa'),
(18, 'Bayelsa West', 'SD/018/BY', 'Sagbama, Ekeremor', 'Sagbama', 6, 'Bayelsa'),

-- Benue (ID: 7)
(19, 'Benue North-East', 'SD/019/BN', 'Katsina-Ala, Konshisha, Kwande, Logo, Ukum, Ushongo, Vandeikya', 'Katsina-Ala', 7, 'Benue'),
(20, 'Benue North-West', 'SD/020/BN', 'Buruku, Gboko, Guma, Gwer East, Gwer West, Makurdi, Tarka', 'Makurdi', 7, 'Benue'),
(21, 'Benue South', 'SD/021/BN', 'Ado, Agatu, Apa, Obi, Ogbadibo, Ohimini, Oju, Okpokwu, Otukpo', 'Otukpo', 7, 'Benue'),

-- Borno (ID: 8)
(22, 'Borno North', 'SD/022/BO', 'Abadam, Gubio, Guzamala, Kukawa, Magumeri, Marte, Mobbar, Monguno, Nganzai', 'Monguno', 8, 'Borno'),
(23, 'Borno Central', 'SD/023/BO', 'Maiduguri, Jere, Konduga, Mafa, Dikwa, Ngala, Kala/Balge, Bama, Kaga', 'Maiduguri', 8, 'Borno'),
(24, 'Borno South', 'SD/024/BO', 'Askira/Uba, Bayo, Biu, Chibok, Damboa, Gwoza, Hawul, Kwaya Kusar, Shani', 'Biu', 8, 'Borno'),

-- Cross River (ID: 9)
(25, 'Cross River North', 'SD/025/CR', 'Ogoja, Yala, Obudu, Obanliku, Bekwarra', 'Ogoja', 9, 'Cross River'),
(26, 'Cross River Central', 'SD/026/CR', 'Ikom, Boki, Etung, Obubra, Abi, Yakurr', 'Ikom', 9, 'Cross River'),
(27, 'Cross River South', 'SD/027/CR', 'Calabar Municipal, Calabar South, Akpabuyo, Bakassi, Odukpani, Akamkpa, Biase', 'Calabar', 9, 'Cross River'),

-- Delta (ID: 10)
(28, 'Delta Central', 'SD/028/DT', 'Ethiope East, Ethiope West, Okpe, Sapele, Udu, Ughelli North, Ughelli South, Uvwie', 'Ughelli', 10, 'Delta'),
(29, 'Delta North', 'SD/029/DT', 'Aniocha North, Aniocha South, Ika North East, Ika South, Ndokwa East, Ndokwa West, Oshimili North, Oshimili South, Ukwuani', 'Asaba', 10, 'Delta'),
(30, 'Delta South', 'SD/030/DT', 'Bomadi, Burutu, Isoko North, Isoko South, Patani, Warri North, Warri South, Warri South West', 'Oleh', 10, 'Delta'),

-- Ebonyi (ID: 11)
(31, 'Ebonyi North', 'SD/031/EB', 'Abakaliki, Ebonyi, Izzi, Ohaukwu', 'Abakaliki', 11, 'Ebonyi'),
(32, 'Ebonyi Central', 'SD/032/EB', 'Ezza North, Ezza South, Ikwo, Ishielu', 'Onueke', 11, 'Ebonyi'),
(33, 'Ebonyi South', 'SD/033/EB', 'Afikpo North, Afikpo South, Ivo, Ohaozara, Onicha', 'Afikpo', 11, 'Ebonyi'),

-- Edo (ID: 12)
(34, 'Edo South', 'SD/034/ED', 'Oredo, Ovia South West, Ovia North East, Ikpoba Okha, Uhunmwonde, Orhionmwon, Egor', 'Benin City', 12, 'Edo'),
(35, 'Edo Central', 'SD/035/ED', 'Esan Central, Esan North East, Esan South East, Esan West, Igueben', 'Uromi', 12, 'Edo'),
(36, 'Edo North', 'SD/036/ED', 'Etsako West, Etsako East, Etsako Central, Owan West, Owan East, Akoko Edo', 'Auchi', 12, 'Edo'),

-- Ekiti (ID: 13)
(37, 'Ekiti Central', 'SD/037/EK', 'Ado Ekiti, Efon, Ekiti West, Ijero, Irepodun/Ifelodun', 'Ado-Ekiti', 13, 'Ekiti'),
(38, 'Ekiti North', 'SD/038/EK', 'Ido Osi, Ikole, Ilejemeje, Moba, Oye', 'Ido-Ekiti', 13, 'Ekiti'),
(39, 'Ekiti South', 'SD/039/EK', 'Ekiti East, Ekiti South West, Emure, Gbonyin, Ikere, Ise/Orun', 'Ikere-Ekiti', 13, 'Ekiti'),

-- Enugu (ID: 14)
(40, 'Enugu North', 'SD/040/EN', 'Nsukka, Igbo-Eze North, Igbo-Eze South, Uzo-Uwani, Igbo-Etiti, Udenu', 'Nsukka', 14, 'Enugu'),
(41, 'Enugu East', 'SD/041/EN', 'Enugu North, Enugu East, Enugu South, Isi-Uzo, Nkanu East, Nkanu West', 'Enugu', 14, 'Enugu'),
(42, 'Enugu West', 'SD/042/EN', 'Aninri, Awgu, Ezeagu, Oji-River, Udi', 'Awgu', 14, 'Enugu'),

-- Abuja FCT (ID: 37)
(43, 'FCT Senatorial District', 'SD/043/FCT', 'Abuja Municipal, Abaji, Bwari, Gwagwalada, Kuje, Kwali', 'Gwagwalada', 37, 'Abuja FCT'),

-- Gombe (ID: 15)
(44, 'Gombe Central', 'SD/044/GO', 'Akko, Yamaltu/Deba', 'Kumo', 15, 'Gombe'),
(45, 'Gombe North', 'SD/045/GO', 'Dukku, Funakaye, Gombe, Kwami, Nafada', 'Gombe', 15, 'Gombe'),
(46, 'Gombe South', 'SD/046/GO', 'Balanga, Billiri, Kaltungo, Shongom', 'Billiri', 15, 'Gombe'),

-- Imo (ID: 16)
(47, 'Imo North', 'SD/047/IM', 'Ehime-Mbano, Ihitte-Uboma, Isiala-Mbano, Obowo, Okigwe, Onuimo', 'Okigwe', 16, 'Imo'),
(48, 'Imo East', 'SD/048/IM', 'Aboh-Mbaise, Ahiazu-Mbaise, Ezinihitte-Mbaise, Ikeduru, Mbaitoli, Ngor-Okpala, Owerri Municipal, Owerri North, Owerri South', 'Owerri', 16, 'Imo'),
(49, 'Imo West', 'SD/049/IM', 'Ideato North, Ideato South, Isu, Njaba, Nwangele, Nkwerre, Oguta, Ohaji-Egbema, Orlu, Orsu, Oru East, Oru West', 'Orlu', 16, 'Imo'),

-- Jigawa (ID: 17)
(50, 'Jigawa North-East', 'SD/050/JG', 'Hadejia, Kafin Hausa, Auyo, Birniwa, Guri, Kaugama, Kirikasamma, Malam Madori', 'Hadejia', 17, 'Jigawa'),
(51, 'Jigawa North-West', 'SD/051/JG', 'Babura, Birnin Kudu, Garki, Gagarawa, Gumel, Gwiwa, Maigatari, Ringim, Sule Tankarkar, Taura', 'Gumel', 17, 'Jigawa'),
(52, 'Jigawa South-West', 'SD/052/JG', 'Dutse, Birnin Kudu, Buji, Gwaram, Kiyawa, Jahun, Miga', 'Dutse', 17, 'Jigawa'),

-- Kaduna (ID: 18)
(53, 'Kaduna North', 'SD/053/KD', 'Ikara, Kubau, Kudan, Makarfi, Sabon Gari, Soba, Zaria', 'Zaria', 18, 'Kaduna'),
(54, 'Kaduna Central', 'SD/054/KD', 'Birnin Gwari, Chikun, Giwa, Igabi, Kaduna North, Kaduna South, Kajuru', 'Kaduna', 18, 'Kaduna'),
(55, 'Kaduna South', 'SD/055/KD', 'Jaba, Jema’a, Kachia, Kagarko, Kaura, Kauru, Lere, Sanga, Zangon Kataf', 'Kafanchan', 18, 'Kaduna'),

-- Kano (ID: 19)
(56, 'Kano Central', 'SD/056/KN', 'Kano Municipal, Fagge, Dala, Gwale, Tarauni, Nasarawa, Kumbotso, Ungogo, Dawakin Kudu, Gezawa, Minjibir, Warawa, Kura, Madobi, Garun Mallam', 'Kano', 19, 'Kano'),
(57, 'Kano North', 'SD/057/KN', 'Bichi, Bagwai, Shanono, Tsanyawa, Kunchi, Makoda, Danbatta, Minjibir, Gwarzo, Kabo, Rimingado, Tofa, Dawakin Tofa', 'Bichi', 19, 'Kano'),
(58, 'Kano South', 'SD/058/KN', 'Bebeji, Bunkure, Doguwa, Gaya, Albasu, Ajingi, Wudil, Sumaila, Kibiya, Rano, Tudun Wada, Karaye, Rogo, Kiru', 'Rano', 19, 'Kano'),

-- Katsina (ID: 20)
(59, 'Katsina Central', 'SD/059/KT', 'Katsina, Batagarawa, Cheranchi, Dan-Musa, Dutsin-Ma, Jibia, Kaita, Kurfi, Rimi, Safana', 'Katsina', 20, 'Katsina'),
(60, 'Katsina North', 'SD/060/KT', 'Daura, Baure, Bindawa, Dutsi, Ingawa, Kankia, Mani, Mashi, Mai’Adua, Sandamu, Zango', 'Daura', 20, 'Katsina'),
(61, 'Katsina South', 'SD/061/KT', 'Funtua, Bakori, Dandume, Danja, Faskari, Kafur, Kankara, Malumfashi, Musawa, Matazu, Sabuwa', 'Funtua', 20, 'Katsina'),

-- Kebbi (ID: 21)
(62, 'Kebbi Central', 'SD/062/KB', 'Birnin Kebbi, Gwandu, Jega, Kalgo, Koko/Besse, Maiyama, Aliero', 'Birnin Kebbi', 21, 'Kebbi'),
(63, 'Kebbi North', 'SD/063/KB', 'Argungu, Augie, Bagudo, Bunza, Dandi, Suru, Arewa Dandi', 'Argungu', 21, 'Kebbi'),
(64, 'Kebbi South', 'SD/064/KB', 'Zuru, Danko-Wasagu, Fakai, Sakaba, Ngaski, Shanga, Yauri', 'Zuru', 21, 'Kebbi'),

-- Kogi (ID: 22)
(65, 'Kogi Central', 'SD/065/KO', 'Adavi, Ajaokuta, Ogori-Magongo, Okene, Okehi', 'Okene', 22, 'Kogi'),
(66, 'Kogi East', 'SD/066/KO', 'Ankpa, Bassa, Dekina, Ibaji, Idah, Igalamela-Odolu, Itobe, Omala, Olamaboro', 'Idah', 22, 'Kogi'),
(67, 'Kogi West', 'SD/067/KO', 'Kabba/Bunu, Kogi, Lokoja, Mopa-Muro, Ijumu, Yagba East, Yagba West', 'Lokoja', 22, 'Kogi'),

-- Kwara (ID: 23)
(68, 'Kwara Central', 'SD/068/KW', 'Ilorin East, Ilorin South, Ilorin West, Asa', 'Ilorin', 23, 'Kwara'),
(69, 'Kwara North', 'SD/069/KW', 'Baruten, Kaiama, Moro, Pategi, Edu', 'Lafiagi', 23, 'Kwara'),
(70, 'Kwara South', 'SD/070/KW', 'Ekiti, Ifelodun, Irepodun, Isin, Offa, Oke-Ero, Oyun', 'Omupo', 23, 'Kwara'),

-- Lagos (ID: 24)
(71, 'Lagos Central', 'SD/071/LA', 'Lagos Island, Lagos Mainland, Surulere, Apapa, Eti-Osa', 'Lagos Island', 24, 'Lagos'),
(72, 'Lagos East', 'SD/072/LA', 'Shomolu, Kosofe, Ikorodu, Epe, Ibeju-Lekki', 'Ikorodu', 24, 'Lagos'),
(73, 'Lagos West', 'SD/073/LA', 'Alimosho, Agege, Ifako-Ijaiye, Ikeja, Mushin, Oshodi-Isolo, Ojo, Badagry, Amuwo-Odofin, Ajeromi-Ifelodun', 'Ikeja', 24, 'Lagos'),

-- Nasarawa (ID: 25)
(74, 'Nasarawa North', 'SD/074/NA', 'Akwanga, Nasarawa-Eggon, Wamba', 'Akwanga', 25, 'Nasarawa'),
(75, 'Nasarawa South', 'SD/075/NA', 'Lafia, Doma, Awe, Keana, Obi', 'Lafia', 25, 'Nasarawa'),
(76, 'Nasarawa West', 'SD/076/NA', 'Karu, Keffi, Kokona, Nasarawa, Toto', 'Keffi', 25, 'Nasarawa'),

-- Niger (ID: 26)
(77, 'Niger East', 'SD/077/NI', 'Bosso, Chanchaga, Gurara, Munya, Paikoro, Rafi, Shiroro, Suleja, Tafa', 'Minna', 26, 'Niger'),
(78, 'Niger North', 'SD/078/NI', 'Agwara, Borgu, Kontagora, Magama, Mariga, Mashegu, Rijau, Wushishi', 'Kontagora', 26, 'Niger'),
(79, 'Niger South', 'SD/079/NI', 'Agaie, Bida, Edati, Gbako, Katcha, Lapai, Lavun, Mokwa', 'Bida', 26, 'Niger'),

-- Ogun (ID: 27)
(80, 'Ogun Central', 'SD/080/OG', 'Abeokuta North, Abeokuta South, Ewekoro, Ifo, Obafemi-Owode, Odeda', 'Abeokuta', 27, 'Ogun'),
(81, 'Ogun East', 'SD/081/OG', 'Ijebu North, Ijebu North East, Ijebu Ode, Ijebu East, Ikenne, Odogbolu, Ogun Waterside, Remo North, Sagamu', 'Ijebu-Ode', 27, 'Ogun'),
(82, 'Ogun West', 'SD/082/OG', 'Ado-Odo/Ota, Egbado North, Egbado South, Imeko Afon, Ipokia', 'Ilaro', 27, 'Ogun'),

-- Ondo (ID: 28)
(83, 'Ondo Central', 'SD/083/ON', 'Akure North, Akure South, Idanre, Ifedore, Ondo East, Ondo West', 'Akure', 28, 'Ondo'),
(84, 'Ondo North', 'SD/084/ON', 'Akoko North East, Akoko North West, Akoko South East, Akoko South West, Owo, Ose', 'Owo', 28, 'Ondo'),
(85, 'Ondo South', 'SD/085/ON', 'Ese Odo, Ilaje, Ile Oluji/Okeigbo, Irele, Odigbo, Okitipupa', 'Okitipupa', 28, 'Ondo'),

-- Osun (ID: 29)
(86, 'Osun Central', 'SD/086/OS', 'Boluwaduro, Boripe, Ifelodun, Ila, Irepodun, Odo Otin, Olorunda, Ororolu, Osogbo', 'Osogbo', 29, 'Osun'),
(87, 'Osun East', 'SD/087/OS', 'Atakunmosa East, Atakunmosa West, Ife Central, Ife East, Ife North, Ife South, Ilesa East, Ilesa West, Obokun, Oriade', 'Ife', 29, 'Osun'),
(88, 'Osun West', 'SD/088/OS', 'Ayedaade, Ayedire, Ede North, Ede South, Egbedore, Ejigbo, Isokan, Iwo, Ola Oluwa, Irewole', 'Iwo', 29, 'Osun'),

-- Oyo (ID: 30)
(89, 'Oyo Central', 'SD/089/OY', 'Afijio, Akinyele, Egbeda, Lagelu, Oluyole, Ona Ara, Oyo East, Oyo West, Surulere', 'Oyo', 30, 'Oyo'),
(90, 'Oyo North', 'SD/090/OY', 'Atisbo, Irepo, Iseyin, Itesiwaju, Iwajowa, Kajola, Olorunsogo, Ogbomosho North, Ogbomosho South, Orelope, Ori Ire, Saki East, Saki West', 'Iseyin', 30, 'Oyo'),
(91, 'Oyo South', 'SD/091/OY', 'Ibadan North, Ibadan North East, Ibadan North West, Ibadan South East, Ibadan South West, Ibarapa Central, Ibarapa East, Ibarapa North, Itesiwaju', 'Ibadan', 30, 'Oyo'),

-- Plateau (ID: 31)
(92, 'Plateau Central', 'SD/092/PL', 'Bokkos, Mangu, Pankshin, Kanke, Kanam', 'Pankshin', 31, 'Plateau'),
(93, 'Plateau North', 'SD/093/PL', 'Jos North, Jos South, Jos East, Bassa, Barkin Ladi, Riyom', 'Jos', 31, 'Plateau'),
(94, 'Plateau South', 'SD/094/PL', 'Langtang North, Langtang South, Mikang, Qua’an Pan, Shendam, Wase', 'Shendam', 31, 'Plateau'),

-- Rivers (ID: 32)
(95, 'Rivers East', 'SD/095/RV', 'Port Harcourt, Obio/Akpor, Okrika, Ogu/Bolo, Eleme, Tai, Oyigbo, Etche, Omuma', 'Port Harcourt', 32, 'Rivers'),
(96, 'Rivers South-East', 'SD/096/RV', 'Andoni, Opobo/Nkoro, Khana, Gokana', 'Bori', 32, 'Rivers'),
(97, 'Rivers West', 'SD/097/RV', 'Asari-Toru, Akuku-Toru, Degema, Bonny, Ahoada East, Ahoada West, Abua/Odual, Emohua, Ikwerre', 'Ahoada', 32, 'Rivers'),

-- Sokoto (ID: 33)
(98, 'Sokoto East', 'SD/098/SK', 'Isa, Sabon Birni, Wurno, Rabah, Goronyo, Gada, Illela, Gwadabawa', 'Wurno', 33, 'Sokoto'),
(99, 'Sokoto North', 'SD/099/SK', 'Sokoto North, Sokoto South, Binji, Wamakko, Silame, Kware, Tangaza, Gudu', 'Sokoto', 33, 'Sokoto'),
(100, 'Sokoto South', 'SD/100/SK', 'Dange-Shuni, Tureta, Bodinga, Shagari, Yabo, Kebbe, Tambuwal, Gummi', 'Bodinga', 33, 'Sokoto'),

-- Taraba (ID: 34)
(101, 'Taraba North', 'SD/101/TR', 'Jalingo, Lau, Zing, Yorro, Ardo-Kola, Karim-Lamido', 'Jalingo', 34, 'Taraba'),
(102, 'Taraba Central', 'SD/102/TR', 'Bali, Gashaka, Kurmi, Sardauna, Gassol', 'Bali', 34, 'Taraba'),
(103, 'Taraba South', 'SD/103/TR', 'Wukari, Donga, Takum, Ussa, Ibi', 'Wukari', 34, 'Taraba'),

-- Yobe (ID: 35)
(104, 'Yobe North', 'SD/104/YB', 'Bade, Jakusko, Karasuwa, Machina, Nguru, Yusufari', 'Gashua', 35, 'Yobe'),
(105, 'Yobe East', 'SD/105/YB', 'Bursari, Geidam, Gujba, Gulani, Tarmuwa, Yunusari, Damaturu', 'Damaturu', 35, 'Yobe'),
(106, 'Yobe South', 'SD/106/YB', 'Fika, Fune, Nangere, Potiskum', 'Potiskum', 35, 'Yobe'),

-- Zamfara (ID: 36)
(107, 'Zamfara North', 'SD/107/ZA', 'Shinkafi, Zurmi, Birnin Magaji, Kaura Namoda', 'Kaura Namoda', 36, 'Zamfara'),
(108, 'Zamfara Central', 'SD/108/ZA', 'Gusau, Tsafe, Bungudu, Maru', 'Gusau', 36, 'Zamfara'),
(109, 'Zamfara West', 'SD/109/ZA', 'Bakura, Maradun, Talata Mafara, Anka, Gummi, Bukkuyum', 'Talata Mafara', 36, 'Zamfara');