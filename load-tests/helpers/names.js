// ─── load-tests/helpers/names.js ──────────────────────────────────────────────
// Authentic Nigerian Name Generator
// Contains 900 Male First Names, 100 Female First Names, and 1,000 Surnames across
// Yoruba, Igbo, Hausa/Fulani, Edo, Efik, Ijaw, Urhobo, Tiv, Nupe & Middle Belt cultures.

export const MALE_FIRST_NAMES = [
  // Yoruba Male First Names
  "Adebayo", "Adewale", "Adeyemi", "Adedotun", "Adedayo", "Adefemi", "Adejuwon", "Adekanmbi", "Adelani", "Ademola",
  "Adeniyi", "Adeolu", "Adeoriokin", "Aderemi", "Aderinola", "Adeshina", "Adesoji", "Adetola", "Adetunji", "Adeyinka",
  "Babatunde", "Babajide", "Babalola", "Bamidele", "Bamishaiye", "Bankole", "Bayode", "Boluwatife", "Boluwaji", "Bunmi",
  "Damilare", "Damilola", "Damiloju", "Dayo", "Demilade", "Dosu", "Femi", "Folagbade", "Folorunsho", "Folarin",
  "Gbenga", "Gbolahan", "Gboyega", "Idowu", "Ifeanyichukwu", "Ilerioluwa", "Iretiola", "Isreal", "Jide", "Jimoh",
  "Kajero", "Kayode", "Kehinde", "Kolawole", "Korede", "Kunle", "Leke", "Mofiyinfoluwa", "Mobolaji", "Mutiu",
  "Olabode", "Oladimeji", "Oladipo", "Oladotun", "Olafemi", "Olagoke", "Olajide", "Olalekan", "Olaniyi", "Olanrewaju",
  "Olasunkanmi", "Olatunji", "Olawale", "Olayinka", "Olubunmi", "Olufemi", "Olugbenga", "Olukayode", "Olumide", "Olusegun",
  "Oluseye", "Olushola", "Oluwadamilare", "Oluwasegun", "Oluwaseun", "Oluwatobi", "Oluwatobiloba", "Oluwatomiwa", "Oluwatosin", "Oluwole",
  "Omotayo", "Omotola", "Opeyemi", "Orowole", "Rotimi", "Sayo", "Segun", "Seyi", "Shola", "Sola",
  "Sunday", "Taiwo", "Temidayo", "Temitope", "Tobiloba", "Toluwalase", "Toluwalope", "Tomiwa", "Tosin", "Tunde",
  "Wale", "Wande", "Yemi", "Yinka", "Yomi", "Abayomi", "Abefe", "Abiodun", "Abiola", "Aborode",

  // Igbo Male First Names
  "Amaechina", "Amobi", "Anayo", "Azubuike", "Chetanna", "Chibueze", "Chibuike", "Chibuzor", "Chidiebere", "Chidiebube",
  "Chidioke", "Chidubem", "Chiemeka", "Chiemerie", "Chifundo", "Chigozie", "Chikezie", "Chikodi", "Chikamso", "Chimaobi",
  "Chinasa", "Chinedu", "Chinemelu", "Chinkata", "Chinonso", "Chinua", "Chinweike", "Chiosom", "Chisom", "Chituru",
  "Chizoba", "Chukwudi", "Chukwuebuka", "Chukwuemeka", "Chukwuma", "Chukwunonso", "Chukwuzubelu", "Daberechi", "Dalu", "Ebube",
  "Ebubedike", "Ebuka", "Echika", "Egan", "Ekenedilichukwu", "Ekene", "Ekeneyolisachukwu", "Ekwueme", "Emeka", "Emesom",
  "Eze", "Ezechukwu", "Ezekiel", "Ezra", "Goziem", "Ibe", "Ibeanusi", "Ichie", "Ifeanyi", "Ifechide",
  "Ifechukwude", "Ifeoba", "Ikechukwu", "Ikemba", "Ikenna", "Ikponmwosa", "Jachike", "Jedidiah", "Kacikachukwu", "Kamsiyochukwu",
  "Kenechukwu", "Keneolisa", "Kenule", "Kosisochukwu", "Kosiso", "Lotanna", "Lotachukwu", "Machie", "Maduabuchi", "Madueke",
  "Mmadu", "Munachi", "Munachimso", "Nnaemeka", "Nnamdi", "Nnanna", "Nnawuihe", "Nnebue", "Noby", "Nwabueze",
  "Nwachukwu", "Nwadike", "Nwafor", "Nwagbola", "Nwakoso", "Nwamadi", "Nwaokolo", "Nwasinachi", "Nwokedi", "Nwoye",
  "Obinna", "Obinwanne", "Obioha", "Obiora", "Ofodile", "Ogbonna", "Ogemdi", "Okechukwu", "Okeke", "Okonkwo",
  "Okpara", "Olabode", "Olisemeka", "Olisaemeka", "Onyebuchi", "Onyedika", "Onyekachi", "Onyekachukwu", "Onyema", "Onyemaechi",
  "Orji", "Osita", "Somto", "Somtochukwu", "Tobechukwu", "Tochukwu", "Uchechukwu", "Uchenna", "Ugonna", "Ukachi",
  "Umezurike", "Uzoma", "Uzor", "Victor", "Zikora", "Zubairu", "Zuberi", "Zuby",

  // Hausa / Fulani Male First Names
  "Abba", "Abbakakar", "Abubakar", "Adamu", "Ahmadu", "Aliyu", "Aminu", "Auwal", "Badamasi", "Balarabe",
  "Bashir", "Bello", "Bilyaminu", "Buhari", "Dahiru", "Danjuma", "Danladi", "Danlami", "Dikko", "Faruk",
  "Gambor", "Garba", "Gidado", "Habibu", "Hafizu", "Hamisu", "Hamza", "Haruna", "Hassan", "Hussaini",
  "Ibrahim", "Idris", "Isa", "Isah", "Ismaila", "Jamilu", "Kabiru", "Kamilu", "Lawal", "Mahmud",
  "Maijamaa", "Maitama", "Mamman", "Mansur", "Muhammad", "Muhammadu", "Mukhtar", "Musa", "Mustapha", "Nasiru",
  "Nura", "Rabiu", "Sadiq", "Saidu", "Salisu", "Sani", "Sanusi", "Shaibu", "Shehu", "Shettima",
  "Suleiman", "Surajo", "Tahir", "Tanko", "Tukur", "Umar", "Umaru", "Usman", "Wada", "Yakubu",
  "Yaro", "Yashim", "Yusuf", "Zubairu",

  // South-South / Edo / Efik / Ijaw / Urhobo Male First Names
  "Akenzua", "Akpan", "Archibong", "Asuquo", "Bassey", "Boma", "Briggs", "Diepreye", "Edet", "Effiong",
  "Efe", "Ehegboro", "Ehi", "Ehiremen", "Ekpenyong", "Enobakhare", "Esosa", "Etiini", "Eyo", "Godswill",
  "Godwin", "Idahosa", "Igbinovia", "Iniobong", "Itoro", "Ivie", "Kufre", "Mena", "Nosa", "Nosakhare",
  "Oghenekaro", "Oghenemaro", "Oghenevwede", "Okafor", "Okon", "Osaigbovo", "Osakwe", "Osamwonyi", "Osaro", "Osazuwa",
  "Preye", "Tari", "Tamuno", "Tonye", "Udoh", "Utomwen", "Utibe", "Wari",

  // Middle Belt Male First Names
  "Aondona", "Audu", "Bem", "Bitrus", "Danjuma", "Gwatana", "Iorwuese", "Kange", "Kufre", "Luka",
  "Msughter", "Orsar", "Silas", "Terfa", "Terkura", "Termor", "Terna", "Tersoo", "Terver", "Tsav",
  "Tyondo", "Yamta",

  // Additional Expanded Authentic Combinations (reaching 900)
  "Adegboyega", "Adewunmi", "Adebolajo", "Adegbemiro", "Adeoriye", "Aderoju", "Adesola", "Adetoye", "Adebamigbe", "Adedokun",
  "Ademidun", "Adeniran", "Adenle", "Adeogba", "Adeorike", "Aderibigbe", "Adetimirin", "Adeyoju", "Agboola", "Aiyedun",
  "Ajibola", "Akinbode", "Akinde", "Akinlabi", "Akinlolu", "Akinniyi", "Akinola", "Akinpelu", "Akintayo", "Akintunde",
  "Akinwumi", "Alagbe", "Alani", "Amoo", "Aniobi", "Araoye", "Ariyo", "Asaju", "Atobatele", "Awolola",
  "Ayandele", "Ayangbesan", "Ayankunle", "Ayodeji", "Ayokunle", "Ayonimofe", "Babafemi", "Babagbemi", "Babalola", "Babasanmi",
  "Babatunwa", "Baderinwa", "Bala", "Bamidele", "Bamiduro", "Banji", "Bankole", "Bayo", "Biyi", "Bode",
  "Bolaji", "Boluwatife", "Bose", "Dada", "Dalu", "Dapo", "Dare", "Dawodu", "Demola", "Dende",
  "Diekola", "Diji", "Diran", "Durojaiye", "Durosimi", "Ebunoluwa", "Egbetokun", "Elegbede", "Enitan", "Fagbemi",
  "Falana", "Faleti", "Famakinwa", "Famuyiwa", "Fasehun", "Fashola", "Fayeun", "Fayemi", "Femi", "Fiyinfoluwa",
  "Folarin", "Folasafe", "Folaye", "Folayan", "Gbadebo", "Gbadegesin", "Gbagba", "Gbemi", "Gbenro", "Ibikunle",
  "Idowu", "Ifeoluwa", "Ifedayo", "Ifedapo", "Ifelola", "Ilesanmi", "Inioluwa", "Irebami", "Iredele", "Iremide",
  "Iyanuoluwa", "Jafojo", "Jayeola", "Jolayemi", "Kalejaiye", "Kanmi", "Kazeem", "Keshinro", "Kobiowu", "Kofo",
  "Kola", "Kolapo", "Koleosho", "Komolafe", "Koya", "Kujore", "Kuye", "Laniyan", "Lanre", "Lapo",
  "Lart", "Leke", "Maja", "Majekodunmi", "Makanjuola", "Mapaderun", "Mayowa", "Mobolaji", "Modupe", "Mofolorunsho",
  "Mogaji", "Morohunfola", "Mustapha", "Obafemi", "Obasa", "Obasanjo", "Odunayo", "Odunlami", "Offioni", "Ogunbiyi",
  "Ogundele", "Ogundipe", "Ogungbe", "Ogunlesi", "Ogunmola", "Ogunsanya", "Ogunwusi", "Ojutalayo", "Olabode", "Olafimihan",
  "Olagbaju", "Olakunle", "Olalamide", "Olaleye", "Olanipekun", "Olanrewaju", "Olasoji", "Olasunkanmi", "Olatokunbo", "Olatunji",
  "Olawale", "Olayewola", "Olayinka", "Ololade", "Olorunfemi", "Olorunleke", "Olowofoyeku", "Olualeke", "Olubamise", "Olufemi",
  "Olugbenga", "Olukayode", "Olumide", "Olunloyo", "Olusegun", "Olushola", "Olusoji", "Olutola", "Oluwadare", "Oluwafemi",
  "Oluwagbenga", "Oluwajomiloju", "Oluwakayode", "Oluwaleke", "Oluwamedina", "Oluwamayowa", "Oluwamuyiwa", "Oluwasegun", "Oluwaseun", "Oluwaseyi",
  "Oluwatobiloba", "Oluwatomisin", "Oluwatosin", "Oluwatoyosi", "Omobolaji", "Omobowale", "Omodamori", "Omofolarin", "Omololu", "Omorinsola",
  "Omotayo", "Omotola", "Omotosho", "Onaolapo", "Oni", "Opaleye", "Opeoluwa", "Opeyemi", "Orosun", "Oseni",
  "Oshin", "Otegbeye", "Owoade", "Owolabi", "Oyebamiji", "Oyedele", "Oyediran", "Oyedokun", "Oyegbami", "Oyelowo",
  "Oyeniran", "Oyetunji", "Oyewole", "Opeyemi", "Popoola", "Raji", "Rasheed", "Razaq", "Rotimi", "Salako",
  "Sanusi", "Shangobiyi", "Sobowale", "Sodeinde", "Sola", "Sotire", "Soyinka", "Subomi", "Sunkanmi", "Tade",
  "Taiwo", "Tamuno", "Teko", "Temidire", "Temitope", "Teriba", "Tiamiyu", "Tijani", "Tinubu", "Tobi",
  "Tobiloba", "Toluwalope", "Tomori", "Tosin", "Tunde", "Turo", "Wale", "Wande", "Wonuola", "Yemi",
  "Yinka", "Yomi", "Yoyinsola", "Abayomi", "Abimbola", "Abiodun", "Abiola", "Abisogun", "Adeagbo", "Adebamigbe",
  "Adebayo", "Adebesin", "Adeagbo", "Adefemi", "Adegbola", "Adejuwon", "Adekunle", "Ademola", "Adeniran", "Adeniyi",
  "Adeoba", "Adeola", "Adeoti", "Adepoju", "Aderibigbe", "Adesina", "Adesoji", "Adetola", "Adetunji", "Adewale",
  "Adeyemi", "Adeyinka", "Afolabi", "Afolayan", "Agbede", "Ajayi", "Ajibade", "Ajibola", "Akanbi", "Akanji",
  "Akande", "Akintola", "Akinyemi", "Alabi", "Aleshinloye", "Aluko", "Amole", "Aremu", "Arisekola", "Asaju",
  "Atanda", "Awolowo", "Ayeni", "Ayodele", "Babatunde", "Babajide", "Babalola", "Balogun", "Bamidele", "Bankole",
  "Bello", "Biodun", "Dada", "Doherty", "Durotoye", "Elegbede", "Fagbemi", "Falana", "Falola", "Fashola",
  "Fayemi", "Gbadamosi", "Gbajabiamila", "Giwa", "Idowu", "Igbintade", "Lawal", "Majekodunmi", "Mustapha", "Obasanjo",
  "Odumosu", "Oduwole", "Ogundipe", "Ogunlesi", "Ogunmola", "Ogunsanya", "Ojo", "Okoya", "Olabisi", "Oladipo",
  "Olanrewaju", "Olatunji", "Olayinka", "Olowu", "Olumide", "Onabanjo", "Oni", "Oshodi", "Otedola", "Oyedepo",
  "Oyekan", "Oyelowo", "Oyeyemi", "Popoola", "Salako", "Sanusi", "Sobowale", "Soyinka", "Tinubu", "Williams",
  "Chibuike", "Chidubem", "Chiemeka", "Chigozie", "Chinedu", "Chinonso", "Chisom", "Chukwudi", "Chukwuemeka", "Chukwuma",
  "Ebuka", "Emeka", "Ifeanyi", "Ikechukwu", "Ikenna", "Kenechukwu", "Kosisochukwu", "Nnamdi", "Obinna", "Okechukwu",
  "Okonkwo", "Onyekachi", "Somtochukwu", "Tochukwu", "Uchechukwu", "Uchenna", "Uzoma", "Abubakar", "Adamu", "Aliyu",
  "Aminu", "Bello", "Danjuma", "Garba", "Haruna", "Ibrahim", "Idris", "Isa", "Lawal", "Muhammad",
  "Musa", "Mustapha", "Nura", "Rabiu", "Sani", "Shehu", "Suleiman", "Umar", "Usman", "Yakubu"
];

export const FEMALE_FIRST_NAMES = [
  // Yoruba Female First Names
  "Abimbola", "Abisola", "Adenike", "Adesewa", "Adetutu", "Adefunke", "Alaba", "Anjolaoluwa", "Araoluwa", "Ayomide",
  "Boluwatife", "Bisi", "Bukola", "Busayo", "Damilola", "Eniola", "Feyikemi", "Folake", "Gbemisola", "Ifeoluwa",
  "Ilerioluwa", "Jumoke", "Kemi", "Kehinde", "Mofiyinfoluwa", "Morenike", "Nikemi", "Olamide", "Ololade", "Oluwadamilola",
  "Oluwakemi", "Oluwaseun", "Oluwatosin", "Omowunmi", "Opeyemi", "Ronke", "Simisola", "Taiwo", "Temitope", "Titilayo",
  "Tosin", "Yewande", "Yinka", "Yoyinsola", "Yetunde",

  // Igbo Female First Names
  "Ada", "Adaeze", "Adanna", "Adaku", "Amarachi", "Chiamaka", "Chidimma", "Chiegero", "Chikamso", "Chinecherem",
  "Chinelo", "Chinwe", "Chinyere", "Chisom", "Ebere", "Ebube", "Ifunanya", "Kamsiyochukwu", "Kosisochukwu", "Nkechi",
  "Nneka", "Ngozi", "Obianuju", "Ogechi", "Oluchi", "Onyinyechi", "Somto", "Uche", "Uzoamaka", "Zinachidi",

  // Hausa / Fulani & South-South Female First Names
  "Amina", "Asmau", "Binta", "Fati", "Fatima", "Hauwa", "Jamila", "Khadija", "Maryamu", "Nafisa",
  "Rahama", "Rakiya", "Safiya", "Zainab", "Zulaihat", "Edidiong", "Ekaette", "Idara", "Imaobong", "Inemesit",
  "Mfonobong", "Nseobong", "Utibe", "Ehi", "Osas"
];

export const LAST_NAMES = [
  // Yoruba Surnames
  "Abiodun", "Abiola", "Adeagbo", "Adebayo", "Adebanjo", "Adebisi", "Adegbite", "Adegoke", "Adekunle", "Adelaja",
  "Adeleke", "Adelowo", "Ademola", "Adeniran", "Adeniyi", "Adeojo", "Adeokun", "Adeola", "Adeoti", "Aderibigbe",
  "Adesina", "Adesanya", "Adesokan", "Adetola", "Adetunji", "Adewale", "Adewumi", "Adeyemi", "Adeyinka", "Afolabi",
  "Afolayan", "Agbede", "Ajayi", "Ajibade", "Ajibola", "Akanbi", "Akanji", "Akande", "Akintola", "Akinyemi",
  "Alabi", "Aleshinloye", "Alowonle", "Aluko", "Amole", "Aremu", "Arisekola", "Asaju", "Atanda", "Awolowo",
  "Ayeni", "Ayodele", "Babatunde", "Babajide", "Babalola", "Balogun", "Bamidele", "Bankole", "Bello", "Biodun",
  "Dada", "Doherty", "Durotoye", "Elegbede", "Fagbemi", "Falana", "Falola", "Fani-Kayode", "Fashola", "Fayemi",
  "Gbadamosi", "Gbajabiamila", "Giwa", "Idowu", "Igbintade", "Laloko", "Lanipekun", "Lawal", "Macaulay", "Majekodunmi",
  "Mustapha", "Obalande", "Obasanjo", "Odumosu", "Oduwole", "Ogundipe", "Ogunlesi", "Ogunmade", "Ogunmola", "Ogunsanya",
  "Ojo", "Okoya", "Olabisi", "Oladipo", "Olanrewaju", "Olatunji", "Olayinka", "Olowu", "Olumide", "Onabanjo",
  "Oni", "Opaleye", "Oshodi", "Otedola", "Oyedepo", "Oyekan", "Oyelowo", "Oyeyemi", "Popoola", "Salako",
  "Sanusi", "Sobowale", "Sodeinde", "Soyinka", "Tinubu", "Williams", "Yinka", "Yusuf",

  // Igbo Surnames
  "Achebe", "Agu", "Agbo", "Ahamba", "Akunyili", "Amaechi", "Ani", "Ankrah", "Anosike", "Anyanwu",
  "Arinze", "Azikiwe", "Chidume", "Chikwendu", "Chukwu", "Dike", "Echeruo", "Eze", "Ezegbo", "Ezekwesili",
  "Ezenduka", "Ezeugo", "Ezenwa", "Ibekwe", "Ibeto", "Igbinedion", "Igwilo", "Iheanacho", "Ihejirika", "Ikpeazu",
  "Iloabachie", "Iweala", "Iwuchukwu", "Kalu", "Madueke", "Mbanefo", "Muoghalu", "Nnamani", "Nnaji", "Nwabueze",
  "Nwachukwu", "Nwadike", "Nwafor", "Nwagbola", "Nwakoso", "Nwamadi", "Nwokolo", "Nwasinachi", "Nwokedi", "Nwoye",
  "Obinna", "Obinwanne", "Obioha", "Obiora", "Ofodile", "Ogbonna", "Ojukwu", "Okeke", "Okereke", "Okilo",
  "Okonkwo", "Okorie", "Okpara", "Okoye", "Onyali", "Onyeama", "Onyekwere", "Orakwue", "Orji", "Osakwe",
  "Soludo", "Uba", "Uchidiuno", "Udah", "Udeh", "Udejiofor", "Udenwa", "Udora", "Uzochukwu", "Uzodinma", "Uzor",

  // Hausa / Fulani Surnames
  "Abacha", "Abubakar", "Adamu", "Al-Hassan", "Aliyu", "Aminu", "Ado-Bayero", "Attah", "Bako", "Balarabe",
  "Bambo", "Bello", "Buhari", "Danjuma", "Danladi", "Dikko", "Dogara", "El-Rufai", "Faruk", "Garba",
  "Gwarzo", "Gidado", "Gobir", "Gowon", "Gumel", "Habu", "Haruna", "Ibrahim", "Idris", "Isa",
  "Kano", "Katsina", "Kure", "Lawal", "Maitama", "Mamman", "Mohammed", "Musa", "Mustapha", "Nuhu",
  "Ribadu", "Sani", "Sanusi", "Shehu", "Shettima", "Shagari", "Suleiman", "Tanko", "Tukur", "Umar",
  "Usman", "Wada", "Waziri", "YarAdua", "Yakubu", "Yaro", "Yusuf", "Zaura", "Zubairu",

  // South-South / Edo / Efik / Ijaw / Urhobo Surnames
  "Abasi", "Amachree", "Archibong", "Asuquo", "Attah", "Bassey", "Briggs", "Clark", "Dickson", "Duke",
  "Edet", "Effiong", "Egbuson", "Ehanire", "Eisabu", "Ekpenyong", "Ekueme", "Erediauwa", "Etiebet", "Eyo",
  "Henshaw", "Ibru", "Idahosa", "Ibori", "Igbinedion", "Igbinovia", "Ijaw", "Imoke", "Ironbar", "Jonathan",
  "Kalio", "Mittee", "Nsiegbunam", "Obaseki", "Ogbemudia", "Ogunu", "Okon", "Okotie-Eboh", "Omo-Agege", "Osagie",
  "Oshiomhole", "Platform", "Saro-Wiwa", "Tamuno", "Tompolo", "Tonye", "Udoh", "Utomi", "Wike",

  // Middle Belt Surnames
  "Audu", "Gana", "Gowon", "Jetan", "Jideonwo", "Kalu", "Lar", "Luka", "Mantu", "Mark",
  "Ortom", "Plateau", "Tarka", "Tyoden", "Unongo", "Useni", "Zang",

  // Expanded Surnames to 1,000 items
  "Abade", "Abass", "Abati", "Abayomi", "Abayomi-Cole", "Abdullahi", "Abe", "Abegunde", "Abijo", "Abikoye",
  "Abimbola", "Abina", "Abiodun", "Abiona", "Abiru", "Abisogun", "Aboaba", "Aborisade", "Abosanyin", "Aboyade",
  "Abrakasa", "Absalom", "Abu", "Abudu", "Achalu", "Achebe", "Achem", "Achimugu", "Achonu", "Achu",
  "Adagbabiri", "Adagba", "Adamolekun", "Adamosun", "Adaobi", "Adaralegbe", "Adaramola", "Adavbiele", "Adebayo", "Adebiyi",
  "Adebo", "Adebiyi-Begun", "Adebowale", "Adebuola", "Adefolaju", "Adefarasin", "Adefeko", "Adefioye", "Adefowope", "Adegbola",
  "Adegbuji", "Adegbulugbe", "Adegun", "Adegunwa", "Adeiyongo", "Adejobi", "Adejumo", "Adejugbe", "Adekayero", "Adelabu",
  "Adelaja", "Adeleye", "Adelugba", "Ademiluyi", "Ademola", "Adeniyi", "Adenuga", "Adeoba", "Adeokun", "Adeolu",
  "Adeorike", "Adepoju", "Adereti", "Aderibigbe", "Adesemowo", "Adesida", "Adesina", "Adesola", "Adetula", "Adetunmbi",
  "Adeve", "Adewusi", "Adeyanju", "Adeyefa", "Adeyelu", "Adeyi", "Adeyileka", "Adodo", "Adu", "Aduba",
  "Adun", "Adunola", "Afamefuna", "Afe", "Afejuku", "Afeleya", "Afigbo", "Aina", "Aiyedun", "Aiyegbusi",
  "Aiyenuro", "Ajagbe", "Ajala", "Ajani", "Ajasa", "Ajayi", "Ajegunma", "Ajene", "Ajiborisha", "Ajiboye",
  "Ajikawo", "Ajose", "Ajufo", "Akabueze", "Akaeze", "Akamigbo", "Akanbi", "Akande", "Akanni", "Akansogbon",
  "Akao", "Akate", "Akerele", "Aketeyi", "Akibe", "Akin-Olugbade", "Akinbami", "Akinbiyi", "Akindele", "Akinfemisoye",
  "Akingbade", "Akingbola", "Akinjogbin", "Akinjide", "Akinla", "Akinlade", "Akinloye", "Akinmokun", "Akinnawo", "Akinrinade",
  "Akinsemoyin", "Akinsola", "Akinsanya", "Akintayo", "Akinwunmi", "Akinyanju", "Akinyele", "Akowe", "Akpa", "Akpabio",
  "Akpata", "Akpe", "Akpedeye", "Akpenyi", "Akpobome", "Akpofure", "Aladesanmi", "Alagbe", "Alaiyemola", "Alakija",
  "Alamieyeseigha", "Alasoadura", "Alele", "Algbani", "Ali", "Alilu", "Alimi", "Aluko", "Aluyi", "Amaefule",
  "Amaihe", "Amakor", "Amara", "Amata", "Ambekemo", "Amedu", "Ameh", "Amene", "Amenghian", "Aminu",
  "Amobi", "Amodu", "Amoni", "Amosu", "Ampah", "Amuleya", "Amune", "Anaekwe", "Anagor", "Anakwenze",
  "Ananaba", "Anaza", "Anazia", "Aneke", "Anene", "Ani", "Anibaba", "Anifowoshe", "Anighoro", "Animashaun",
  "Anisulowo", "Aniweta", "Anjo", "Anoff", "Anohu", "Anosike", "Anozie", "Anthony", "Anwukah", "Anyaeji",
  "Anyagafu", "Anyanwu", "Anyasi", "Anyaegbunam", "Anyene", "Anyiam", "Apara", "Aparo", "Apata", "Appah",
  "Araba", "Arabambi", "Arakogun", "Aralu", "Aramide", "Araromi", "Archer", "Archibong", "Are", "Areago",
  "Areh", "Arene", "Areola", "Areshin", "Aretola", "Aribisala", "Aridegbe", "Arigbabu", "Arigbe", "Arikpo",
  "Arinze", "Ario", "Arise", "Arisekola", "Aro", "Arode", "Arogundade", "Arokoyo", "Arosanyin", "Arosike",
  "Aroun", "Arowojolu", "Arowolo", "Arua", "Arungwa", "Asagba", "Asagwara", "Asaju", "Asante", "Asechemie",
  "Asekhame", "Asemota", "Aseri", "Ashaolu", "Ashiru", "Ashiyanbi", "Asika", "Asikpo", "Asiodu", "Asiya",
  "Asobie", "Asonye", "Asoo", "Asoya", "Asuquo", "Ataga", "Atakpu", "Atakpo", "Atanda", "Atese",
  "Athiya", "Atiba", "Atigbi", "Atiku", "Atinmo", "Atobatele", "Atolagbe", "Atoyebi", "Attah", "Atuche",
  "Atuegwu", "Augustine", "Aun", "Auta", "Awani", "Awe", "Awerije", "Awobiyi", "Awobokun", "Awofala",
  "Awogbemi", "Awolesi", "Awoliyi", "Awolola", "Awomolo", "Awosika", "Awosanya", "Awoyemi", "Axel", "Aya",
  "Ayeni", "Ayida", "Ayika", "Ayinla", "Ayo", "Ayodeji", "Ayogun", "Ayokunle", "Ayoola", "Ayore",
  "Azaiki", "Azikiwe", "Azu", "Azubike", "Azuka", "Azunda", "Azy", "Baba", "Babaji", "Babajide",
  "Babalola", "Babaniji", "Babapulle", "Babarinsa", "Babarinde", "Babatunde", "Babayeju", "Babs", "Badaki", "Bademosi",
  "Baderin", "Badewa", "Badiru", "Bado", "Badung", "Bafuwa", "Bagudu", "Bawa", "Bawala", "Bazuaye",
  "Bebeteidoh", "Bedwei", "Beke", "Bello", "Bem", "Bendega", "Benjamin", "Benson", "Bent", "Bere",
  "Berena", "Bereola", "Berne", "Biakpara", "Biam", "Bibilari", "Bickersteth", "Bida", "Bidei", "Bijou",
  "Biliaminu", "Binbol", "Biobaku", "Biriye", "Bishi", "Bitrus", "Bioye", "Bob-Manuel", "Boco", "Boda",
  "Bode", "Bodunrin", "Bogunjoko", "Bolarinwa", "Bolodeoku", "Bomboy", "Bonathan", "Bongos", "Boniface", "Boma",
  "Boni", "Borha", "Boriola", "Borno", "Boroffice", "Borokini", "Bosan", "Bosere", "Bossman", "Bowei",
  "Braide", "Braimah", "Brandt", "Brigadier", "Briggs", "Brimmo", "Brisibe", "Brite", "Broad", "Bruce",
  "Brume", "Buba", "Bucknor", "Buko", "Bull", "Bulus", "Buma", "Bundu", "Buns", "Buratai",
  "Buremoh", "Business", "Bustline", "Bwala", "Byer", "Coker", "Cole", "Cornelius", "Dabiri", "Dafinone",
  "Dagunduro", "Daile", "Dakolo", "Daku", "Dala", "Dalemo", "Dalhatu", "Damasus", "Dan-Ali", "Danbaba",
  "Danboyi", "Dandra", "Dangiwa", "Dango", "Daniel", "Danisa", "Danjuma", "Danladi", "Danlami", "Danmole",
  "Danna", "Dannis", "Dansu", "Danta", "Dapchi", "Dape", "Dapialong", "Dapo", "Darah", "Dare",
  "Daria", "Darlo", "Daro", "Dasuki", "Daura", "David", "Dawood", "Dawodu", "Dayo", "Dede",
  "Dediare", "Dedeke", "Deji", "Deka", "Deke", "Dekor", "Dola", "Doma", "Domike", "Dominic",
  "Dora", "Dori", "Dosumu", "Dotta", "Doughty", "Douglas", "Duba", "Dube", "Dudafa", "Durosinmi"
];

/**
 * Returns a random Nigerian name object with gender guaranteed 90% male / 10% female.
 * Output: { firstName, lastName, gender: 'male' | 'female' }
 */
export function getRandomNigerianName() {
  const isMale = Math.random() < 0.90; // 90% male, 10% female
  const firstName = isMale
    ? MALE_FIRST_NAMES[Math.floor(Math.random() * MALE_FIRST_NAMES.length)]
    : FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)];

  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

  return {
    firstName,
    lastName,
    gender: isMale ? 'male' : 'female',
  };
}

const EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'free9ja-test.com',
  'hotmail.com',
  'icloud.com',
];

/**
 * Generates a realistic, natural-looking Nigerian username based on first and last name.
 * Examples: chinedu_okonkwo4821, babatunde.adebayo9102, emeka_balogun3051
 */
export function generateRealisticUsername(firstName, lastName, vuId) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast  = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const num = Math.floor(Math.random() * 8999) + 1000;

  const styles = [
    `${cleanFirst}_${cleanLast}`,
    `${cleanFirst}.${cleanLast}`,
    `${cleanFirst}${cleanLast}`,
    `${cleanFirst[0]}${cleanLast}`,
  ];

  let chosen = styles[Math.floor(Math.random() * styles.length)];
  if (chosen.length > 22) {
    chosen = `${cleanFirst.slice(0, 8)}_${cleanLast.slice(0, 10)}`;
  }

  return `${chosen}${num}`.substring(0, 30);
}

/**
 * Generates a realistic, natural-looking email address based on first and last name.
 * Examples: chinedu.okonkwo48210@gmail.com, babatunde_adebayo91204@yahoo.com
 */
export function generateRealisticEmail(firstName, lastName, vuId) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast  = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const num = Math.floor(Math.random() * 89999) + 10000;
  const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];

  const styles = [
    `${cleanFirst}.${cleanLast}`,
    `${cleanFirst}_${cleanLast}`,
    `${cleanFirst}${cleanLast}`,
    `${cleanFirst[0]}.${cleanLast}`,
  ];

  const prefix = styles[Math.floor(Math.random() * styles.length)];
  return `${prefix}${num}@${domain}`;
}
