import type { LandmarkId } from '../heritage/landmarks';

export type Line = { ur: string; en: string };

export type Dialogue = {
	title?: string;
	lines: Line[];
	/** Talking to this NPC unlocks a heritage memory in the collection. */
	memory?: { landmark: LandmarkId; title: string; text: string };
	/** Finishing the conversation hands over this postcard (the food stall cooks). */
	card?: LandmarkId;
};

const greet: Line[] = [
	{ ur: 'Assalam-o-alaikum! Kya haal hai?', en: 'Peace be upon you! How are you?' },
	{ ur: 'Jee aayan nu! Lahore mein khush aamdeed.', en: 'Welcome! Welcome to Lahore.' },
	{ ur: 'Oye tourist, Lahore pasand aaya?', en: 'Hey tourist, how do you like Lahore?' },
	{ ur: 'Lahore Lahore aye, bhai!', en: 'Lahore is Lahore, brother!' }
];

export const DIALOGUES: Record<string, Dialogue> = {
	default: { lines: greet },
	diner: {
		lines: [
			{ ur: 'Yeh karahi kamaal hai! Aap bhi khao.', en: 'This karahi is amazing! You should eat too.' },
			{ ur: 'Naan garam garam aa raha hai.', en: 'The naan is coming hot from the tandoor.' },
			{ ur: 'Dekho, upar Badshahi Masjid ke gumbad chamak rahe hain.', en: 'Look, the Badshahi Mosque domes are glowing up there.' }
		]
	},
	rooftop: {
		lines: [
			{ ur: 'Is chhat se poora Lahore nazar aata hai.', en: 'You can see all of Lahore from this rooftop.' },
			{ ur: 'Shaam ko gumbadon par roshni dekhna, bas!', en: 'Watch the lights on the domes at dusk, that\u2019s all you need.' }
		]
	},
	tandoor: { lines: [{ ur: 'Roghni naan, til wala! Garam garam!', en: 'Roghni naan with sesame! Piping hot!' }, { ur: 'Tandoor ki deewar pe chipkao, ek minute mein tayyar.', en: 'Slap it on the tandoor wall, ready in a minute.' }] },
	karahi: {
		title: 'Ustad Bao',
		lines: [
			{ ur: 'Chicken karahi, makhan wali? Bas das minute.', en: 'Butter chicken karahi? Just ten minutes.' },
			{ ur: 'Tamatar, adrak, hari mirch. Lahori karahi ka raaz yahi hai.', en: 'Tomato, ginger, green chilli. That\u2019s the secret of Lahori karahi.' }
		]
	},
	grill: { lines: [{ ur: 'Tikka boti, kabab! Koylon pe seeke hue.', en: 'Tikka, boti, kebab! Grilled over coals.' }] },
	falooda: { lines: [{ ur: 'Falooda khao, garmi bhagao!', en: 'Have falooda, chase away the heat!' }] },
	fruitCart: { lines: [{ ur: 'Taaze aam! Chaunsa, anwar ratol!', en: 'Fresh mangoes! Chaunsa, anwar ratol!' }, { ur: 'Ek kilo lo, mithe na hon to paisay wapas.', en: 'Take a kilo; if they\u2019re not sweet, money back.' }] },
	phool: { lines: [{ ur: 'Motiye ke gajre, rupay ke do!', en: 'Jasmine garlands, two for a rupee!' }] },
	nani: {
		title: 'Nani',
		lines: [
			{ ur: 'Beta, Dilli Darwaza dekha? Mere bachpan mein yahan tangay chalte thay.', en: 'Child, have you seen Delhi Gate? When I was young, horse carts ran here.' },
			{ ur: 'Andar jao, Shahi Hammam aur Masjid Wazir Khan zaroor dekhna.', en: 'Go inside, and be sure to see the Shahi Hammam and Wazir Khan Mosque.' }
		]
	},
	gateShop: { lines: [{ ur: 'Darwaze ke andar dukaan hai, purani se purani.', en: 'Our shop is inside the gate, older than old.' }, { ur: 'Peetal ke bartan, sasti qeemat!', en: 'Brass pots, cheap prices!' }] },
	attar: { lines: [{ ur: 'Gulab ka attar, motia ka attar. Ek qatra laga ke dekho.', en: 'Rose attar, jasmine attar. Try a single drop.' }] },
	hammamGuide: {
		title: 'Guide Rubina',
		lines: [
			{ ur: 'Yeh Shahi Hammam 1635 mein Wazir Khan ne banwaya tha.', en: 'Wazir Khan built this Shahi Hammam in 1635.' },
			{ ur: 'Neeche se garam hawa chalti thi. Garam, neem garam aur thanday kamre.', en: 'Hot air flowed under the floor: hot, warm and cool rooms.' },
			{ ur: 'Upar dekho: gumbad mein phool, parinde aur jaal ke naqsh.', en: 'Look up: flowers, birds and lattice patterns painted in the dome.' }
		],
		memory: { landmark: 'shahi-hammam', title: 'The painted dome', text: 'The hammam\u2019s frescoes were painted on wet lime plaster. Restorers cleaned centuries of soot to reveal them again.' }
	},
	hammamElder: { lines: [{ ur: 'Mere dada yahan nahane aate thay. Kehte thay, aadha shehar ki khabrein yahin milti theen.', en: 'My grandfather bathed here. He said half the city\u2019s news was heard right here.' }] },
	calligrapher: {
		title: 'Ustad Rafiq',
		lines: [
			{ ur: 'Qalam, siyahi aur sabr. Khattati yahi hai.', en: 'Reed pen, ink and patience. That is calligraphy.' },
			{ ur: 'Masjid ke darwaze par yeh bazaar Wazir Khan ne khud banwaya tha.', en: 'Wazir Khan himself built this bazaar at the mosque\u2019s gate.' }
		],
		memory: { landmark: 'wazir-khan', title: 'The calligraphers\u2019 bazaar', text: 'Shop rents at the entrance funded the mosque. Calligraphers, binders and booksellers have worked here since the 1640s.' }
	},
	tileRestorer: {
		title: 'Naqqash Bilal',
		lines: [
			{ ur: 'Har tile haath se kati aur jodi gayi hai. Isay kashi-kari kehte hain.', en: 'Every tile piece was cut and set by hand. It\u2019s called kashi-kari.' },
			{ ur: 'Neela, firozi, peela, sabz. Yeh rang Multan aur Persia se aaye.', en: 'Cobalt, turquoise, yellow, green. These colours came from Multan and Persia.' }
		],
		memory: { landmark: 'wazir-khan', title: 'Kashi-kari', text: 'Kashi tile mosaic is made of glazed pieces cut to shape and set like a jigsaw. Wazir Khan\u2019s panels are among the finest anywhere.' }
	},
	tiles: { lines: [{ ur: 'Itne rang! Main to tasveerein khenchte khenchte thak gayi.', en: 'So many colours! I\u2019m tired of taking photos already.' }] },
	wudu: { lines: [{ ur: 'Hauz ka pani thanda hai. Wazu kar ke namaz parhte hain.', en: 'The pool water is cool. We do wudu here before prayer.' }] },
	imam: { title: 'Maulvi Sahib', lines: [{ ur: 'Masjid sab ki hai, beta. Sukoon se ghoomo.', en: 'The mosque belongs to everyone, child. Walk around in peace.' }] },
	kidPigeons: { lines: [{ ur: 'Kabootar daana khaate hain! Aap ke paas daana hai?', en: 'The pigeons eat grain! Do you have any grain?' }] },
	tourist: { lines: [{ ur: 'Main Karachi se aaya hoon, sirf yeh masjid dekhne.', en: 'I came from Karachi just to see this mosque.' }] },
	chowkElder: { lines: [{ ur: 'Is chowk mein subah chai, shaam ko gup-shup.', en: 'Tea in this square in the morning, chit-chat in the evening.' }] },
	musician: { title: 'Saeen', lines: [{ ur: 'Ek kalaam sunoge? Bulleh Shah ka.', en: 'Will you listen to a verse? One of Bulleh Shah\u2019s.' }, { ur: 'Bulleya ki jaana main kaun...', en: 'Bulleh, who knows who I am...' }] },
	charpaiElder: {
		title: 'Baba Fazal',
		lines: [
			{ ur: 'Har gali mein aik kahani hai, puttar.', en: 'Every lane has a story, son.' },
			{ ur: 'Kashmiri Bazaar, Dabbi Bazaar, Suha Bazaar. Suha mein sunar baithte hain.', en: 'Kashmiri, Dabbi and Suha Bazaar. Goldsmiths sit in Suha Bazaar.' },
			{ ur: 'Yeh jharokay dekho: lakdi ke, haath se tarashay hue.', en: 'Look at these jharokhas: wooden, carved by hand.' }
		],
		memory: { landmark: 'walled-city', title: 'Baba Fazal\u2019s galis', text: 'The bazaars of the old city are named for their trades and their people: goldsmiths in Suha Bazaar, Kashmiri traders in Kashmiri Bazaar.' }
	},
	kidGali: { lines: [{ ur: 'Patang chahiye? Basant aa rahi hai!', en: 'Want a kite? Basant is coming!' }] },
	sunehri: { lines: [{ ur: 'Yeh Sunehri Masjid hai. Sone ke gumbad, 1753 se.', en: 'This is the Golden Mosque. Golden domes since 1753.' }] },
	fortGuard: {
		title: 'Chowkidar Akram',
		lines: [
			{ ur: 'Alamgiri Darwaza, Aurangzeb ne 1674 mein banwaya.', en: 'The Alamgiri Gate, built by Aurangzeb in 1674.' },
			{ ur: 'Andar haathi seedhiyan hain, shahi haathi unhi se upar jaate thay.', en: 'Inside are the elephant stairs; the royal elephants climbed them.' }
		]
	},
	fortGuide: {
		title: 'Guide Sana',
		lines: [
			{ ur: 'Akbar ne 1566 mein qila eenton se dobara banaya.', en: 'Akbar rebuilt the fort in brick in 1566.' },
			{ ur: 'Sheesh Mahal mein lakhon sheeshe hain. Ek diya jalao to taaron jaisa lagta hai.', en: 'The Sheesh Mahal has countless mirrors. Light one lamp and it looks like stars.' }
		],
		memory: { landmark: 'lahore-fort', title: 'A fort of four emperors', text: 'Akbar, Jahangir, Shah Jahan and Aurangzeb each added to the Lahore Fort. UNESCO inscribed it in 1981 with the Shalimar Gardens.' }
	},
	naulakha: { lines: [{ ur: 'Naulakha ka matlab nau lakh rupay. Itna kharcha aaya tha!', en: 'Naulakha means nine lakh rupees. That\u2019s what it cost!' }] },
	sheeshMahal: { lines: [{ ur: 'Shah Jahan ne Sheesh Mahal apni malika ke liye banwaya tha.', en: 'Shah Jahan built the Sheesh Mahal for his empress.' }] },
	diwanEAam: { lines: [{ ur: 'Diwan-e-Aam: yahan badshah awam se milta tha.', en: 'Diwan-e-Aam: the hall where the emperor met the public.' }] },
	hazuriBagh: { lines: [{ ur: 'Ranjit Singh ne yeh baradari banwayi thi, 1818 mein.', en: 'Ranjit Singh built this baradari in 1818.' }] },
	iqbal: {
		lines: [{ ur: 'Allama Iqbal yahin aaram farma hain, masjid ki seedhiyon ke paas.', en: 'Allama Iqbal rests here, beside the mosque\u2019s steps.' }],
		memory: { landmark: 'badshahi', title: 'The poet\u2019s resting place', text: 'Allama Muhammad Iqbal, the poet-philosopher of the subcontinent, is buried in Hazuri Bagh beside the steps of the Badshahi Mosque.' }
	},
	chanaSeller: { lines: [{ ur: 'Garam chanay! Namak mirch wale!', en: 'Hot chickpeas! With salt and chilli!' }] },
	badshahiVisitor: { lines: [{ ur: 'Itna bara sehan! Kehte hain ek lakh log namaz parh sakte hain.', en: 'Such a huge courtyard! They say a hundred thousand can pray here.' }] },
	badshahiImam: {
		title: 'Khateeb Sahib',
		lines: [
			{ ur: 'Aurangzeb Alamgir ne 1673 mein yeh masjid mukammal karwayi.', en: 'Aurangzeb Alamgir completed this mosque in 1673.' },
			{ ur: 'Teen sau saal se zyada yeh duniya ki sab se bari masjid rahi.', en: 'For over three hundred years it was the largest mosque in the world.' }
		],
		memory: { landmark: 'badshahi', title: 'Red stone, white domes', text: 'The mosque\u2019s red sandstone was brought from Rajasthan; its three domes are faced with white marble.' }
	},
	badshahiGuard: { lines: [{ ur: 'Joote utaar ke andar jaana, sahib.', en: 'Please take your shoes off before going in, sir.' }] },
	kidCourtyard: { lines: [{ ur: 'Main minar ki chhat tak daud ke jaa sakta hoon!', en: 'I can run all the way to the top of the minaret!' }] },
	topiSeller: { lines: [{ ur: 'Topi le lo, tasbeeh le lo!', en: 'Buy a prayer cap, buy prayer beads!' }] },
	minar: { lines: [{ ur: 'Minar-e-Pakistan, jahan 1940 ki Qarardad-e-Lahore manzoor hui.', en: 'Minar-e-Pakistan, where the 1940 Lahore Resolution was passed.' }] },
	kite: { lines: [{ ur: 'Bo kata! Meri patang ne kaat di!', en: 'Bo kata! My kite cut theirs!' }] },
	parkElder: { lines: [{ ur: 'Iqbal Park mein subah ki sair, sehat ka raaz.', en: 'A morning walk in Iqbal Park, the secret of good health.' }] },
	stationMaster: {
		title: 'Station Master Iqbal',
		lines: [
			{ ur: 'Karachi Express platform number do se jaayegi!', en: 'The Karachi Express leaves from platform two!' },
			{ ur: 'Yeh station 1860 mein bana, qile ki tarah, mazboot deewaron ke saath.', en: 'This station was built in 1860 like a fort, with thick walls.' }
		],
		memory: { landmark: 'railway-station', title: 'A station built like a fort', text: 'Built just after 1857, Lahore Junction has loopholes and battlements so it could be defended. It is still one of Pakistan\u2019s busiest stations.' }
	},
	coolie: { title: 'Coolie Rasheed', lines: [{ ur: 'Saman uthaoon, sahib? Laal qameez wala coolie hoon!', en: 'Shall I carry your luggage, sir? I\u2019m the coolie in the red shirt!' }] },
	passenger: { lines: [{ ur: 'Gaari late hai, chai pee lete hain.', en: 'The train is late, let\u2019s have some tea.' }, { ur: 'Main Pindi ja raha hoon, ammi ke paas.', en: 'I\u2019m going to Pindi, to see my mother.' }] },
	chai: { lines: [{ ur: 'Garam chai! Station ki chai ka maza hi alag hai.', en: 'Hot tea! Station tea tastes different.' }] },
	// ---- Wagah border ----
	ranger: {
		lines: [
			{ ur: 'Pakistan Rangers! Har shaam parcham utarne ki taqreeb hoti hai.', en: 'Pakistan Rangers! Every evening we lower the flag in a ceremony.' },
			{ ur: 'Gate khulte hain, parcham ek saath utarte hain, phir haath milate hain.', en: 'The gates open, both flags come down together, then we shake hands.' },
			{ ur: 'Stands mein baith jaayein, taqreeb shuru hone wali hai!', en: 'Take a seat in the stands, the ceremony is about to begin!' }
		]
	},
	bsf: {
		lines: [
			{ ur: 'Sat Sri Akal! Attari ki taraf se salaam.', en: 'Sat Sri Akal! Greetings from the Attari side.' },
			{ ur: 'Parade ke baad dono taraf ke log ek doosre ko haath hilate hain.', en: 'After the parade, people on both sides wave to each other.' }
		]
	},
	wagahFan: {
		title: 'Chacha Wagah',
		lines: [
			{ ur: 'Pakistan Zindabad! Har Itwaar main yahan aata hoon, sabz hilali parcham le ke.', en: 'Long live Pakistan! I come here every Sunday with the green crescent flag.' },
			{ ur: 'Dekho, Rangers ki kick kitni oonchi hai! Turra dekha?', en: 'Look how high the Rangers kick! Did you see the turra (fan)?' }
		],
		memory: { landmark: 'wagah-border', title: 'The beating retreat', text: 'The Wagah ceremony has been held every evening since 1959. Pakistan\u2019s Rangers and India\u2019s BSF lower their flags at the same moment, shake hands and close the gates.' }
	},
	wagahCrowd: {
		lines: [
			{ ur: 'Pakistan Zindabad!', en: 'Long live Pakistan!' },
			{ ur: 'Jeevay jeevay Pakistan!', en: 'Long live, long live Pakistan!' },
			{ ur: 'Shor macha do, aawaz Amritsar tak jaani chahiye!', en: 'Make some noise, they should hear us in Amritsar!' }
		]
	},
	// ---- famous food stalls of Fort Road Food Street (each hands over its food card) ----
	buttKarahi: {
		title: 'Ustad Butt',
		card: 'food-karahi',
		memory: { landmark: 'food-karahi', title: 'Lakshmi Chowk at midnight', text: 'A karahi is cooked in the iron wok that gives it its name, fast and over a high flame, with tomatoes, ginger and green chillies. Lakshmi Chowk keeps cooking it long after midnight.' },
		lines: [
			{ ur: 'Aadha kilo ya poora? Desi ghee mein banaoon?', en: 'Half a kilo or a full one? Shall I make it in desi ghee?' },
			{ ur: 'Lakshmi Chowk se aaya hoon, wahan raat ke teen baje tak karahi chalti hai!', en: 'I came from Lakshmi Chowk, where the karahi keeps going until 3 a.m.!' },
			{ ur: 'Tamatar, adrak, hari mirch, aur tez aag. Bas hilate raho.', en: 'Tomatoes, ginger, green chillies and a fierce flame. Just keep stirring.' }
		]
	},
	nihariWala: {
		title: 'Haji Sahib',
		card: 'food-nihari',
		lines: [
			{ ur: 'Yeh deg saari raat chulhe pe rahi hai, fajr se pehle tayyar.', en: 'This deg sat on the fire all night, ready before dawn prayers.' },
			{ ur: 'Nalli chahiye? Upar se adrak, hari mirch aur lemon.', en: 'Want some bone marrow? Ginger, green chilli and lemon on top.' },
			{ ur: 'Khamiri roti ke saath khao, phir so jao. Lahori Itwaar!', en: 'Eat it with khamiri roti, then sleep. A Lahori Sunday!' }
		]
	},
	phajja: {
		title: 'Phajja Paye',
		card: 'food-paye',
		lines: [
			{ ur: 'Sardiyon ki subah, garam paye aur kulche. Is se behtar kya?', en: 'A winter morning, hot paye and kulchas. What could be better?' },
			{ ur: 'Taxali Gate ke paas, Badshahi Masjid ke saaye mein, barson se yahi kaam hai.', en: 'Near Taxali Gate, in the shadow of the Badshahi Mosque, we have done this for years.' }
		]
	},
	tikkaWala: {
		title: 'Tikka Master Javed',
		card: 'food-tikka',
		lines: [
			{ ur: 'Dahi aur masale mein raat bhar rakha, ab koylon pe!', en: 'Marinated overnight in yogurt and spices, now onto the coals!' },
			{ ur: 'Pankha jhalo, makhan lagao, upar se chaat masala.', en: 'Fan the coals, brush on butter, chaat masala on top.' },
			{ ur: 'Gawalmandi Lahore ki pehli food street thi, saal 2000 mein.', en: 'Gawalmandi was Lahore\u2019s first food street, in the year 2000.' }
		]
	},
	biryaniWala: {
		title: 'Biryani Wala',
		card: 'food-biryani',
		lines: [
			{ ur: 'Dum ki biryani! Deg ka dhakkan atta laga ke band kiya tha.', en: 'Dum biryani! We sealed the deg lid with dough.' },
			{ ur: 'Zafran, podina, aloo bukhara, aur thora aloo bhi. Raita saath free!', en: 'Saffron, mint, plums and a little potato too. Raita comes free!' }
		]
	},
	pulaoWala: {
		title: 'Pulao Wala',
		card: 'food-pulao',
		lines: [
			{ ur: 'Biryani nahi, pulao! Chawal yakhni mein pakte hain.', en: 'Not biryani, pulao! The rice cooks in meat stock.' },
			{ ur: 'Shaadi ho ya niaz, Lahore mein pulao ki deg zaroor chadhti hai.', en: 'Wedding or niaz, in Lahore a deg of pulao always goes on the fire.' }
		]
	},
	golgappay: {
		title: 'Golgappay Wala',
		card: 'food-golgappay',
		lines: [
			{ ur: 'Khatta pani ya meetha? Ek hi baar mein khana hai!', en: 'Sour water or sweet? You must eat it in one bite!' },
			{ ur: 'Imli, podina, kala namak. Bas karo bolo ge to rukoon ga.', en: 'Tamarind, mint, black salt. I\u2019ll stop only when you say enough.' }
		]
	},
	lassiWala: {
		title: 'Lassi Wala',
		card: 'food-lassi',
		lines: [
			{ ur: 'Meethi ya namkeen? Upar malai ka pera bhi!', en: 'Sweet or salty? With a dollop of cream on top!' },
			{ ur: 'Itni gaarhi ke chamach khara ho jaye. Phir aaram se neend.', en: 'So thick the spoon stands up. Then a good long nap.' }
		]
	},
	truckDriver: {
		title: 'Ustad Gulzar',
		lines: [
			{ ur: 'Yeh meri rani hai! Teen mahine lage is ko sajane mein.', en: 'This is my queen! It took three months to decorate her.' },
			{ ur: 'Peeche likha hai: dekh magar pyar se. Aur ammi ke liye: maa ki dua, jannat ki hawa.', en: 'The back says: look, but with love. And for my mother: a mother\u2019s prayer is a breeze from paradise.' },
			{ ur: 'Kal subah Karachi ke liye nikalna hai, Allah ke hawale!', en: 'Tomorrow morning I leave for Karachi, in God\u2019s hands!' }
		],
		memory: { landmark: 'truck-art', title: 'The taj and the chamak patti', text: 'The wooden crown over a truck\u2019s cab is its taj. Reflective chamak-patti tape, chains and tassels make a decorated truck glitter and jingle on the highway.' }
	},
	trainGuard: {
		title: 'Guard Sahib',
		lines: [
			{ ur: 'Green Line Express, Karachi ke liye tayyar! Seeti bajne wali hai.', en: 'The Green Line Express for Karachi is ready! The whistle is about to blow.' },
			{ ur: 'Engine ko dekh lo, hazaron horsepower ka dil hai is ka.', en: 'Look at the engine, it has a heart of thousands of horsepower.' }
		]
	},
	batsman: {
		title: 'Chhota Babar',
		lines: [
			{ ur: 'Main bara ho ke Babar Azam banoonga!', en: 'When I grow up I\u2019ll be Babar Azam!' },
			{ ur: 'Isi ground pe 1996 ka World Cup final hua tha.', en: 'The 1996 World Cup final was played on this very ground.' }
		],
		memory: { landmark: 'gaddafi-stadium', title: 'The 1996 final', text: 'Gaddafi Stadium hosted the 1996 Cricket World Cup final, won by Sri Lanka against Australia, under its floodlights.' }
	},
	bowler: { lines: [{ ur: 'Bowling kar raha hoon, hato! Yorker aa raha hai!', en: 'I\u2019m bowling, move! Here comes a yorker!' }] },
	fielder: { lines: [{ ur: 'Qalandars ka match dekhne aaye ho? Dama dam mast qalandar!', en: 'Here for the Qalandars match? Dama dam mast qalandar!' }] },
	ticket: { lines: [{ ur: 'Match ki tickets! Enclosure, VIP, sab hain!', en: 'Match tickets! General, VIP, all available!' }] },
	ferryman: {
		title: 'Mallah Bashir',
		lines: [
			{ ur: 'Kashti meri, chappu aap ke! Ravi paar Kamran ki Baradari hai.', en: 'My boat, your oars! Across the Ravi is Kamran\u2019s Baradari.' },
			{ ur: 'W se chappu chalao, A aur D se mudo. Jetty pe E dabao.', en: 'Row with W, steer with A and D. Press E at the jetty.' }
		]
	},
	boatman: {
		title: 'Mallah Shareef',
		lines: [
			{ ur: 'Ravi darya, Lahore ki shah rag. Yeh Kamran ki Baradari hai.', en: 'The Ravi river, Lahore\u2019s lifeline. This is Kamran\u2019s Baradari.' },
			{ ur: 'Mirza Kamran, Babur ka beta, ne yeh baagh banwaya tha.', en: 'Mirza Kamran, son of Babur, built this garden pavilion.' }
		]
	}
};

export function dialogueFor(key: string | undefined): Dialogue {
	if (key && DIALOGUES[key]) return DIALOGUES[key];
	return { lines: [greet[Math.floor(Math.random() * greet.length)]] };
}
