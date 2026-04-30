-- 1. Create the Senatorial Districts Table
CREATE TABLE IF NOT EXISTS senatorial_districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    coalition_center VARCHAR(255),
    state_id INTEGER NOT NULL
);

-- 2. Insert Senatorial Districts
-- Note: Codes and Collation Centers are based on INEC (Independent National Electoral Commission) standard naming conventions.

INSERT INTO senatorial_districts (name, code, description, coalition_center, state_id) VALUES
-- Abia (ID: 303)
('Abia North', 'SD/001/AB', 'Comprising Umunneochi, Isuikwuato, Ohafia, Arochukwu, Bende', 'Ohafia LGA HQS', 303),
('Abia Central', 'SD/002/AB', 'Comprising Umuahia North, Umuahia South, Ikwuano, Isiala Ngwa North, Isiala Ngwa South, Osisioma', 'Umuahia North LGA HQS', 303),
('Abia South', 'SD/003/AB', 'Comprising Aba North, Aba South, Ugwunagbo, Obingwa, Ukwa East, Ukwa West', 'Aba South LGA HQS', 303),

-- Adamawa (ID: 320)
('Adamawa North', 'SD/004/AD', 'Comprising Madagali, Maiha, Michika, Mubi North, Mubi South', 'Mubi', 320),
('Adamawa South', 'SD/005/AD', 'Comprising Demsa, Ganye, Guyuk, JADA, Mayo-Belwa, Numan, Shelleng, Toungo, Lamurde', 'Numan', 320),
('Adamawa Central', 'SD/006/AD', 'Comprising Hong, Gombi, Song, Girei, Yola North, Yola South, Fufore', 'Yola', 320),

-- Akwa Ibom (ID: 304)
('Akwa Ibom North-East', 'SD/007/AK', 'Uyo, Itu, Ibiono Ibom, Uruan, Nsit Atai, Nsit Ubium, Nsit Ibom, Etinan, Ibesikpo Asutan', 'Uyo', 304),
('Akwa Ibom North-West', 'SD/008/AK', 'Ikot Ekpene, Essien Udim, Obot Akara, Ikono, Ini, Abak, Etim Ekpo, Ika, Ukanafun, Oruk Anam', 'Ikot Ekpene', 304),
('Akwa Ibom South', 'SD/009/AK', 'Eket, Onna, Esit Eket, Ibeno, Mkpat Enin, Ikot Abasi, Eastern Obolo, Oron, Udung Uko, Urue Offong/Oruko, Okobo, Mbo', 'Eket', 304),

-- Anambra (ID: 315)
('Anambra North', 'SD/010/AN', 'Onitsha North, Onitsha South, Ogbaru, Oyi, Ayamelum, Anambra East, Anambra West', 'Onitsha', 315),
('Anambra Central', 'SD/011/AN', 'Awka North, Awka South, Njikoka, Anaocha, Idemili North, Idemili South, Dunukofia', 'Awka', 315),
('Anambra South', 'SD/012/AN', 'Aguata, Orumba North, Orumba South, Ihiala, Ekwusigo, Nnewi North, Nnewi South', 'Nnewi', 315),

-- Bauchi (ID: 312)
('Bauchi South', 'SD/013/BA', 'Bauchi, Toro, Dass, Tafawa Balewa, Bogoro, Alkaleri, Kirfi', 'Bauchi', 312),
('Bauchi Central', 'SD/014/BA', 'Ningi, Warji, Darazo, Ganjuwa, Misau, Dambam', 'Darazo', 312),
('Bauchi North', 'SD/015/BA', 'Katagum, Shira, Giade, Itas/Gadau, Zaki, Gamawa, Jama’are', 'Azare', 312),

-- Bayelsa (ID: 305)
('Bayelsa East', 'SD/016/BY', 'Brass, Nembe, Ogbia', 'Brass', 305),
('Bayelsa Central', 'SD/017/BY', 'Yenagoa, Kolokuma/Opokuma, Southern Ijaw', 'Yenagoa', 305),
('Bayelsa West', 'SD/018/BY', 'Sagbama, Ekeremor', 'Sagbama', 305),

-- Benue (ID: 291)
('Benue North-East', 'SD/019/BN', 'Katsina-Ala, Konshisha, Kwande, Logo, Ukum, Ushongo, Vandeikya', 'Katsina-Ala', 291),
('Benue North-West', 'SD/020/BN', 'Buruku, Gboko, Guma, Gwer East, Gwer West, Makurdi, Tarka', 'Makurdi', 291),
('Benue South', 'SD/021/BN', 'Ado, Agatu, Apa, Obi, Ogbadibo, Ohimini, Oju, Okpokwu, Otukpo', 'Otukpo', 291),

-- Borno (ID: 307)
('Borno North', 'SD/022/BO', 'Abadam, Gubio, Guzamala, Kukawa, Magumeri, Marte, Mobbar, Monguno, Nganzai', 'Monguno', 307),
('Borno Central', 'SD/023/BO', 'Maiduguri, Jere, Konduga, Mafa, Dikwa, Ngala, Kala/Balge, Bama, Kaga', 'Maiduguri', 307),
('Borno South', 'SD/024/BO', 'Askira/Uba, Bayo, Biu, Chibok, Damboa, Gwoza, Hawul, Kwaya Kusar, Shani', 'Biu', 307),

-- Cross River (ID: 314)
('Cross River North', 'SD/025/CR', 'Ogoja, Yala, Obudu, Obanliku, Bekwarra', 'Ogoja', 314),
('Cross River Central', 'SD/026/CR', 'Ikom, Boki, Etung, Obubra, Abi, Yakurr', 'Ikom', 314),
('Cross River South', 'SD/027/CR', 'Calabar Municipal, Calabar South, Akpabuyo, Bakassi, Odukpani, Akamkpa, Biase', 'Calabar', 314),

-- Delta (ID: 316)
('Delta Central', 'SD/028/DT', 'Ethiope East, Ethiope West, Okpe, Sapele, Udu, Ughelli North, Ughelli South, Uvwie', 'Ughelli', 316),
('Delta North', 'SD/029/DT', 'Aniocha North, Aniocha South, Ika North East, Ika South, Ndokwa East, Ndokwa West, Oshimili North, Oshimili South, Ukwuani', 'Asaba', 316),
('Delta South', 'SD/030/DT', 'Bomadi, Burutu, Isoko North, Isoko South, Patani, Warri North, Warri South, Warri South West', 'Oleh', 316),

-- Ebonyi (ID: 311)
('Ebonyi North', 'SD/031/EB', 'Abakaliki, Ebonyi, Izzi, Ohaukwu', 'Abakaliki', 311),
('Ebonyi Central', 'SD/032/EB', 'Ezza North, Ezza South, Ikwo, Ishielu', 'Onueke', 311),
('Ebonyi South', 'SD/033/EB', 'Afikpo North, Afikpo South, Ivo, Ohaozara, Onicha', 'Afikpo', 311),

-- Edo (ID: 318)
('Edo South', 'SD/034/ED', 'Oredo, Ovia South West, Ovia North East, Ikpoba Okha, Uhunmwonde, Orhionmwon, Egor', 'Benin City', 318),
('Edo Central', 'SD/035/ED', 'Esan Central, Esan North East, Esan South East, Esan West, Igueben', 'Uromi', 318),
('Edo North', 'SD/036/ED', 'Etsako West, Etsako East, Etsako Central, Owan West, Owan East, Akoko Edo', 'Auchi', 318),

-- Ekiti (ID: 309)
('Ekiti Central', 'SD/037/EK', 'Ado Ekiti, Efon, Ekiti West, Ijero, Irepodun/Ifelodun', 'Ado-Ekiti', 309),
('Ekiti North', 'SD/038/EK', 'Ido Osi, Ikole, Ilejemeje, Moba, Oye', 'Ido-Ekiti', 309),
('Ekiti South', 'SD/039/EK', 'Ekiti East, Ekiti South West, Emure, Gbonyin, Ikere, Ise/Orun', 'Ikere-Ekiti', 309),

-- Enugu (ID: 289)
('Enugu North', 'SD/040/EN', 'Nsukka, Igbo-Eze North, Igbo-Eze South, Uzo-Uwani, Igbo-Etiti, Udenu', 'Nsukka', 289),
('Enugu East', 'SD/041/EN', 'Enugu North, Enugu East, Enugu South, Isi-Uzo, Nkanu East, Nkanu West', 'Enugu', 289),
('Enugu West', 'SD/042/EN', 'Aninri, Awgu, Ezeagu, Oji-River, Udi', 'Awgu', 289),

-- Abuja FCT (ID: 293)
('FCT Senatorial District', 'SD/043/FCT', 'Abuja Municipal, Abaji, Bwari, Gwagwalada, Kuje, Kwali', 'Gwagwalada', 293),

-- Gombe (ID: 310)
('Gombe Central', 'SD/044/GO', 'Akko, Yamaltu/Deba', 'Kumo', 310),
('Gombe North', 'SD/045/GO', 'Dukku, Funakaye, Gombe, Kwami, Nafada', 'Gombe', 310),
('Gombe South', 'SD/046/GO', 'Balanga, Billiri, Kaltungo, Shongom', 'Billiri', 310),

-- Imo (ID: 308)
('Imo North', 'SD/047/IM', 'Ehime-Mbano, Ihitte-Uboma, Isiala-Mbano, Obowo, Okigwe, Onuimo', 'Okigwe', 308),
('Imo East', 'SD/048/IM', 'Aboh-Mbaise, Ahiazu-Mbaise, Ezinihitte-Mbaise, Ikeduru, Mbaitoli, Ngor-Okpala, Owerri Municipal, Owerri North, Owerri South', 'Owerri', 308),
('Imo West', 'SD/049/IM', 'Ideato North, Ideato South, Isu, Njaba, Nwangele, Nkwerre, Oguta, Ohaji-Egbema, Orlu, Orsu, Oru East, Oru West', 'Orlu', 308),

-- Jigawa (ID: 288)
('Jigawa North-East', 'SD/050/JG', 'Hadejia, Kafin Hausa, Auyo, Birniwa, Guri, Kaugama, Kirikasamma, Malam Madori', 'Hadejia', 288),
('Jigawa North-West', 'SD/051/JG', 'Babura, Birnin Kudu, Garki, Gagarawa, Gumel, Gwiwa, Maigatari, Ringim, Sule Tankarkar, Taura', 'Gumel', 288),
('Jigawa South-West', 'SD/052/JG', 'Dutse, Birnin Kudu, Buji, Gwaram, Kiyawa, Jahun, Miga', 'Dutse', 288),

-- Kaduna (ID: 294)
('Kaduna North', 'SD/053/KD', 'Ikara, Kubau, Kudan, Makarfi, Sabon Gari, Soba, Zaria', 'Zaria', 294),
('Kaduna Central', 'SD/054/KD', 'Birnin Gwari, Chikun, Giwa, Igabi, Kaduna North, Kaduna South, Kajuru', 'Kaduna', 294),
('Kaduna South', 'SD/055/KD', 'Jaba, Jema’a, Kachia, Kagarko, Kaura, Kauru, Lere, Sanga, Zangon Kataf', 'Kafanchan', 294),

-- Kano (ID: 300)
('Kano Central', 'SD/056/KN', 'Kano Municipal, Fagge, Dala, Gwale, Tarauni, Nasarawa, Kumbotso, Ungogo, Dawakin Kudu, Gezawa, Minjibir, Warawa, Kura, Madobi, Garun Mallam', 'Kano', 300),
('Kano North', 'SD/057/KN', 'Bichi, Bagwai, Shanono, Tsanyawa, Kunchi, Makoda, Danbatta, Minjibir, Gwarzo, Kabo, Rimingado, Tofa, Dawakin Tofa', 'Bichi', 300),
('Kano South', 'SD/058/KN', 'Bebeji, Bunkure, Doguwa, Gaya, Albasu, Ajingi, Wudil, Sumaila, Kibiya, Rano, Tudun Wada, Karaye, Rogo, Kiru', 'Rano', 300),

-- Katsina (ID: 313)
('Katsina Central', 'SD/059/KT', 'Katsina, Batagarawa, Cheranchi, Dan-Musa, Dutsin-Ma, Jibia, Kaita, Kurfi, Rimi, Safana', 'Katsina', 313),
('Katsina North', 'SD/060/KT', 'Daura, Baure, Bindawa, Dutsi, Ingawa, Kankia, Mani, Mashi, Mai’Adua, Sandamu, Zango', 'Daura', 313),
('Katsina South', 'SD/061/KT', 'Funtua, Bakori, Dandume, Danja, Faskari, Kafur, Kankara, Malumfashi, Musawa, Matazu, Sabuwa', 'Funtua', 313),

-- Kebbi (ID: 290)
('Kebbi Central', 'SD/062/KB', 'Birnin Kebbi, Gwandu, Jega, Kalgo, Koko/Besse, Maiyama, Aliero', 'Birnin Kebbi', 290),
('Kebbi North', 'SD/063/KB', 'Argungu, Augie, Bagudo, Bunza, Dandi, Suru, Arewa Dandi', 'Argungu', 290),
('Kebbi South', 'SD/064/KB', 'Zuru, Danko-Wasagu, Fakai, Sakaba, Ngaski, Shanga, Yauri', 'Zuru', 290),

-- Kogi (ID: 298)
('Kogi Central', 'SD/065/KO', 'Adavi, Ajaokuta, Ogori-Magongo, Okene, Okehi', 'Okene', 298),
('Kogi East', 'SD/066/KO', 'Ankpa, Bassa, Dekina, Ibaji, Idah, Igalamela-Odolu, Itobe, Omala, Olamaboro', 'Idah', 298),
('Kogi West', 'SD/067/KO', 'Kabba/Bunu, Kogi, Lokoja, Mopa-Muro, Ijumu, Yagba East, Yagba West', 'Lokoja', 298),

-- Kwara (ID: 295)
('Kwara Central', 'SD/068/KW', 'Ilorin East, Ilorin South, Ilorin West, Asa', 'Ilorin', 295),
('Kwara North', 'SD/069/KW', 'Baruten, Kaiama, Moro, Pategi, Edu', 'Lafiagi', 295),
('Kwara South', 'SD/070/KW', 'Ekiti, Ifelodun, Irepodun, Isin, Offa, Oke-Ero, Oyun', 'Omupo', 295),

-- Lagos (ID: 306)
('Lagos Central', 'SD/071/LA', 'Lagos Island, Lagos Mainland, Surulere, Apapa, Eti-Osa', 'Lagos Island', 306),
('Lagos East', 'SD/072/LA', 'Shomolu, Kosofe, Ikorodu, Epe, Ibeju-Lekki', 'Ikorodu', 306),
('Lagos West', 'SD/073/LA', 'Alimosho, Agege, Ifako-Ijaiye, Ikeja, Mushin, Oshodi-Isolo, Ojo, Badagry, Amuwo-Odofin, Ajeromi-Ifelodun', 'Ikeja', 306),

-- Nasarawa (ID: 301)
('Nasarawa North', 'SD/074/NA', 'Akwanga, Nasarawa-Eggon, Wamba', 'Akwanga', 301),
('Nasarawa South', 'SD/075/NA', 'Lafia, Doma, Awe, Keana, Obi', 'Lafia', 301),
('Nasarawa West', 'SD/076/NA', 'Karu, Keffi, Kokona, Nasarawa, Toto', 'Keffi', 301),

-- Niger (ID: 317)
('Niger East', 'SD/077/NI', 'Bosso, Chanchaga, Gurara, Munya, Paikoro, Rafi, Shiroro, Suleja, Tafa', 'Minna', 317),
('Niger North', 'SD/078/NI', 'Agwara, Borgu, Kontagora, Magama, Mariga, Mashegu, Rijau, Wushishi', 'Kontagora', 317),
('Niger South', 'SD/079/NI', 'Agaie, Bida, Edati, Gbako, Katcha, Lapai, Lavun, Mokwa', 'Bida', 317),

-- Ogun (ID: 323)
('Ogun Central', 'SD/080/OG', 'Abeokuta North, Abeokuta South, Ewekoro, Ifo, Obafemi-Owode, Odeda', 'Abeokuta', 323),
('Ogun East', 'SD/081/OG', 'Ijebu North, Ijebu North East, Ijebu Ode, Ijebu East, Ikenne, Odogbolu, Ogun Waterside, Remo North, Sagamu', 'Ijebu-Ode', 323),
('Ogun West', 'SD/082/OG', 'Ado-Odo/Ota, Egbado North, Egbado South, Imeko Afon, Ipokia', 'Ilaro', 323),

-- Ondo (ID: 321)
('Ondo Central', 'SD/083/ON', 'Akure North, Akure South, Idanre, Ifedore, Ondo East, Ondo West', 'Akure', 321),
('Ondo North', 'SD/084/ON', 'Akoko North East, Akoko North West, Akoko South East, Akoko South West, Owo, Ose', 'Owo', 321),
('Ondo South', 'SD/085/ON', 'Ese Odo, Ilaje, Ile Oluji/Okeigbo, Irele, Odigbo, Okitipupa', 'Okitipupa', 321),

-- Osun (ID: 322)
('Osun Central', 'SD/086/OS', 'Boluwaduro, Boripe, Ifelodun, Ila, Irepodun, Odo Otin, Olorunda, Ororolu, Osogbo', 'Osogbo', 322),
('Osun East', 'SD/087/OS', 'Atakunmosa East, Atakunmosa West, Ife Central, Ife East, Ife North, Ife South, Ilesa East, Ilesa West, Obokun, Oriade', 'Ife', 322),
('Osun West', 'SD/088/OS', 'Ayedaade, Ayedire, Ede North, Ede South, Egbedore, Ejigbo, Isokan, Iwo, Ola Oluwa, Irewole', 'Iwo', 322),

-- Oyo (ID: 296)
('Oyo Central', 'SD/089/OY', 'Afijio, Akinyele, Egbeda, Lagelu, Oluyole, Ona Ara, Oyo East, Oyo West, Surulere', 'Oyo', 296),
('Oyo North', 'SD/090/OY', 'Atisbo, Irepo, Iseyin, Itesiwaju, Iwajowa, Kajola, Olorunsogo, Ogbomosho North, Ogbomosho South, Orelope, Ori Ire, Saki East, Saki West', 'Iseyin', 296),
('Oyo South', 'SD/091/OY', 'Ibadan North, Ibadan North East, Ibadan North West, Ibadan South East, Ibadan South West, Ibarapa Central, Ibarapa East, Ibarapa North, Itesiwaju', 'Ibadan', 296),

-- Plateau (ID: 302)
('Plateau Central', 'SD/092/PL', 'Bokkos, Mangu, Pankshin, Kanke, Kanam', 'Pankshin', 302),
('Plateau North', 'SD/093/PL', 'Jos North, Jos South, Jos East, Bassa, Barkin Ladi, Riyom', 'Jos', 302),
('Plateau South', 'SD/094/PL', 'Langtang North, Langtang South, Mikang, Qua’an Pan, Shendam, Wase', 'Shendam', 302),

-- Rivers (ID: 4926)
('Rivers East', 'SD/095/RV', 'Port Harcourt, Obio/Akpor, Okrika, Ogu/Bolo, Eleme, Tai, Oyigbo, Etche, Omuma', 'Port Harcourt', 4926),
('Rivers South-East', 'SD/096/RV', 'Andoni, Opobo/Nkoro, Khana, Gokana', 'Bori', 4926),
('Rivers West', 'SD/097/RV', 'Asari-Toru, Akuku-Toru, Degema, Bonny, Ahoada East, Ahoada West, Abua/Odual, Emohua, Ikwerre', 'Ahoada', 4926),

-- Sokoto (ID: 292)
('Sokoto East', 'SD/098/SK', 'Isa, Sabon Birni, Wurno, Rabah, Goronyo, Gada, Illela, Gwadabawa', 'Wurno', 292),
('Sokoto North', 'SD/099/SK', 'Sokoto North, Sokoto South, Binji, Wamakko, Silame, Kware, Tangaza, Gudu', 'Sokoto', 292),
('Sokoto South', 'SD/100/SK', 'Dange-Shuni, Tureta, Bodinga, Shagari, Yabo, Kebbe, Tambuwal, Gummi', 'Bodinga', 292),

-- Taraba (ID: 319)
('Taraba North', 'SD/101/TR', 'Jalingo, Lau, Zing, Yorro, Ardo-Kola, Karim-Lamido', 'Jalingo', 319),
('Taraba Central', 'SD/102/TR', 'Bali, Gashaka, Kurmi, Sardauna, Gassol', 'Bali', 319),
('Taraba South', 'SD/103/TR', 'Wukari, Donga, Takum, Ussa, Ibi', 'Wukari', 319),

-- Yobe (ID: 297)
('Yobe North', 'SD/104/YB', 'Bade, Jakusko, Karasuwa, Machina, Nguru, Yusufari', 'Gashua', 297),
('Yobe East', 'SD/105/YB', 'Bursari, Geidam, Gujba, Gulani, Tarmuwa, Yunusari, Damaturu', 'Damaturu', 297),
('Yobe South', 'SD/106/YB', 'Fika, Fune, Nangere, Potiskum', 'Potiskum', 297),

-- Zamfara (ID: 299)
('Zamfara North', 'SD/107/ZA', 'Shinkafi, Zurmi, Birnin Magaji, Kaura Namoda', 'Kaura Namoda', 299),
('Zamfara Central', 'SD/108/ZA', 'Gusau, Tsafe, Bungudu, Maru', 'Gusau', 299),
('Zamfara West', 'SD/109/ZA', 'Bakura, Maradun, Talata Mafara, Anka, Gummi, Bukkuyum', 'Talata Mafara', 299);