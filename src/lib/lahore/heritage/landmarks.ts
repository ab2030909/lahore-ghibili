/**
 * Lahore heritage postcards. Photographs are Creative Commons images from Wikimedia
 * Commons, uploaded to Cloudinary by `scripts/cloudinary-seed.mjs` under
 * `<folder>/<landmark>/<slot>` and delivered with Cloudinary transformations. The
 * `source` URL is also used for Cloudinary "fetch" delivery before seeding.
 */

export type LandmarkId =
	| 'delhi-gate'
	| 'shahi-hammam'
	| 'wazir-khan'
	| 'walled-city'
	| 'lahore-fort'
	| 'badshahi'
	| 'food-street'
	| 'railway-station'
	| 'gaddafi-stadium'
	| 'minar-e-pakistan'
	| 'truck-art'
	| 'wagah-border'
	| 'food-karahi'
	| 'food-nihari'
	| 'food-paye'
	| 'food-tikka'
	| 'food-biryani'
	| 'food-pulao'
	| 'food-golgappay'
	| 'food-lassi';

export type HeritagePhoto = {
	slot: string;
	caption: string;
	source: string;
	author: string;
	license: string;
	licenseUrl: string;
	commonsPage: string;
	/** Focal hint for cropping thumbnails (Cloudinary gravity). */
	gravity?: string;
};

export type Landmark = {
	id: LandmarkId;
	/** Food cards get their own section in the collection. */
	kind?: 'place' | 'food';
	name: string;
	urdu: string;
	location: string;
	era: string;
	stamp: string;
	accent: string;
	summary: string;
	story: string[];
	memory: string;
	photos: HeritagePhoto[];
	/** Ken Burns film made by Cloudinary e_zoompan from the first photo. */
	film: { mode: 'ztc' | 'ofc' | 'plr' | 'prl' | 'ztl' | 'ztr'; maxzoom: number; duration: number };
};

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replaceAll(' ', '_'))}`;

const photo = (slot: string, caption: string, url: string, file: string, author: string, license: string, licenseUrl: string): HeritagePhoto => ({
	slot,
	caption,
	source: url,
	author,
	license,
	licenseUrl,
	commonsPage: commons(file)
});
const CC_BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0';
const PUBLIC_DOMAIN = 'https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain';

/** Food of Lahore: each card is unlocked at its stall on Fort Road Food Street. */
const FOOD: Landmark[] = [
	{
		id: 'food-karahi',
		kind: 'food',
		name: 'Karahi',
		urdu: 'کڑاہی',
		location: 'Butt Karahi stall, Fort Road Food Street · real life: Lakshmi Chowk',
		era: 'Dinner, cooked to order',
		stamp: 'Karahi',
		accent: '#b8401f',
		summary: 'Chicken or mutton cooked fast in the iron wok it is named after.',
		story: [
			'A karahi is the round iron wok, and the dish takes its name from it. Chicken or mutton is cooked over a very high flame with tomatoes, ginger, garlic and green chillies until the oil separates, and it comes to the table still sizzling in the pan.',
			'Lahoris order it by weight, half a kilo or a full kilo, and argue about desi ghee versus oil. It is eaten with hot naan straight from the tandoor and a plate of salad and raita.',
			'Lakshmi Chowk, near the old Royal Park cinemas, is Lahore\u2019s most famous karahi crossing, and Butt Karahi there is a name every Lahori knows. The chowk stays busy until long after midnight.'
		],
		memory: 'Ustad Butt says the secret is never to stop stirring.',
		photos: [
			photo('main', 'Chicken karahi in Pakistan', 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Chicken_Karahi_in_Pakistan.jpg', 'Chicken Karahi in Pakistan.jpg', 'Kskhh', 'CC BY-SA 4.0', CC_BY_SA_4),
			photo('punjabi', 'Punjabi chicken karahi', 'https://upload.wikimedia.org/wikipedia/commons/b/be/Punjabi_Chicken_Karahi.JPG', 'Punjabi Chicken Karahi.JPG', 'Miansari66', 'Public domain', PUBLIC_DOMAIN)
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 7 }
	},
	{
		id: 'food-nihari',
		kind: 'food',
		name: 'Nihari',
		urdu: 'نہاری',
		location: 'Nihari House stall, Fort Road Food Street · real life: the old city and Mozang',
		era: 'Breakfast, cooked overnight',
		stamp: 'Nihari',
		accent: '#8e2a12',
		summary: 'Beef shank stew slow-cooked all night and eaten at dawn.',
		story: [
			'The name comes from the Arabic nahar, the morning. Nihari began in the royal kitchens of Mughal Delhi as a breakfast for workers and soldiers, and came to Lahore and Karachi with families who migrated in 1947.',
			'Beef shank and bone marrow cook through the night in a sealed deg with a spice mix of fennel, ginger and dried chillies. By morning the gravy is deep red and glossy, and it is ladled out with a scoop of nalli (marrow) for those who ask.',
			'It is served with fine shreds of ginger, green chillies, fried onions and a squeeze of lemon, with naan or khamiri roti. The famous nihari houses of the walled city and Mozang open before sunrise and often sell out by mid-morning.'
		],
		memory: 'Nihari for breakfast, then a nap: the old Lahori Sunday.',
		photos: [
			photo('main', 'Beef nihari made in Pakistan', 'https://upload.wikimedia.org/wikipedia/commons/9/91/Beef_Nihari%2C_made_by_Saleha_Atif%2C_Pakistan.jpg', 'Beef Nihari, made by Saleha Atif, Pakistan.jpg', 'Satcreak', 'CC BY-SA 4.0', CC_BY_SA_4)
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 7 }
	},
	{
		id: 'food-paye',
		kind: 'food',
		name: 'Siri Paye',
		urdu: 'سری پائے',
		location: 'Phajja Paye stall, Fort Road Food Street · real life: near Taxali Gate',
		era: 'Winter breakfast',
		stamp: 'Paye',
		accent: '#7b4325',
		summary: 'Trotters and head meat simmered for hours into a rich, sticky broth.',
		story: [
			'Paye are goat or cow trotters, and siri is the head. They are cleaned, then simmered on a low fire for many hours with onions, garlic, ginger and spices until the broth turns thick and sticky.',
			'It is the great winter breakfast of Punjab, eaten with kulchas or naan and garnished with green chillies, coriander, ginger and lemon. A bowl of paye on a foggy December morning is said to keep you warm until evening.',
			'Phajja Siri Paye, in the old city beside the Badshahi Mosque near Taxali Gate, has served it for decades and is one of Lahore\u2019s most famous breakfast stops.'
		],
		memory: 'Paye with kulcha in the fog, the Badshahi domes just visible.',
		photos: [
			photo('main', 'A bowl of paya curry', 'https://upload.wikimedia.org/wikipedia/commons/8/88/Paya_Curry.JPG', 'Paya Curry.JPG', 'Miansari66', 'Public domain', PUBLIC_DOMAIN)
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 7 }
	},
	{
		id: 'food-tikka',
		kind: 'food',
		name: 'Tikka',
		urdu: 'تکہ',
		location: 'Tikka House grill, Fort Road Food Street · real life: Gawalmandi and Fort Road',
		era: 'Evening, over charcoal',
		stamp: 'Tikka',
		accent: '#c9472c',
		summary: 'Chicken marinated in yogurt and spices and grilled on skewers over charcoal.',
		story: [
			'Tikka means small pieces. Chicken (or mutton) is marinated in yogurt, lemon, ginger, garlic and red chilli, threaded on long iron seekhs and turned over glowing charcoal until the edges char.',
			'Lahori tikka stalls fan the coals with a hand fan, brush the meat with butter and finish it with chaat masala. It comes with naan, sliced onions, lemon and a sharp mint chutney.',
			'Gawalmandi became Lahore\u2019s first food street in 2000, and the Fort Road Food Street followed, with rooftop restaurants where you eat tikka facing the lit domes of the Badshahi Mosque.'
		],
		memory: 'Smoke, butter and chaat masala: you can smell the tikka from the gate.',
		photos: [
			photo('main', 'Chicken tikka from Pakistan', 'https://upload.wikimedia.org/wikipedia/commons/7/73/Chicken_Tikka.jpg', 'Chicken Tikka.jpg', 'Umair Mohsin (Flickr)', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0')
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 7 }
	},
	{
		id: 'food-biryani',
		kind: 'food',
		name: 'Biryani',
		urdu: 'بریانی',
		location: 'Dum Biryani deg, Fort Road Food Street · real life: every bazaar in Lahore',
		era: 'Lunch, from huge copper degs',
		stamp: 'Biryani',
		accent: '#f2b84b',
		summary: 'Spiced meat and fragrant rice layered and slow-steamed in a sealed pot.',
		story: [
			'Biryani grew out of Persian rice dishes in the kitchens of the Mughal court. Partly boiled basmati rice is layered over meat cooked in yogurt and spices, then the pot is sealed with dough and steamed on a low fire, a method called dum.',
			'Saffron, rose water, fried onions, mint and plums give each layer a different colour and smell. Pakistani biryani is usually spicier than its cousins and often includes potatoes.',
			'In Lahore, biryani is cooked in giant copper degs and sold by the plate from shopfronts all over the city, always with raita and a little salad on the side.'
		],
		memory: 'When the deg is opened, the whole gali knows lunch is ready.',
		photos: [
			photo('main', 'A plate of Sindhi biryani', 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Sindhi_Biryani.JPG', 'Sindhi Biryani.JPG', 'Miansari66', 'Public domain', PUBLIC_DOMAIN)
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 7 }
	},
	{
		id: 'food-pulao',
		kind: 'food',
		name: 'Yakhni Pulao',
		urdu: 'یخنی پلاؤ',
		location: 'Pulao deg, Fort Road Food Street · real life: weddings and niaz across the city',
		era: 'Weddings, feasts and every Friday',
		stamp: 'Pulao',
		accent: '#c99a5a',
		summary: 'Rice cooked in a rich meat stock with whole spices: gentler than biryani.',
		story: [
			'Pulao (pilaf) is older than biryani and is made differently: the rice is cooked in yakhni, a stock made by simmering meat with whole spices such as cardamom, cloves, cinnamon and bay leaves, so every grain absorbs the flavour.',
			'It is milder and more aromatic than biryani and is not layered. Lahoris eat it with shami kebabs, raita and salad, and chana pulao made with chickpeas is a favourite.',
			'At weddings and on religious occasions, huge degs of pulao are cooked in the street and shared as niaz with neighbours, passers-by and anyone who is hungry.'
		],
		memory: 'Biryani or pulao? In Lahore that question can start a family argument.',
		photos: [
			photo('main', 'Zafrani (saffron) pulao', 'https://upload.wikimedia.org/wikipedia/commons/4/45/Zafrani_Pulao.jpg', 'Zafrani Pulao.jpg', 'Satcreak', 'CC BY-SA 4.0', CC_BY_SA_4),
			photo('cholistan', 'Pulao from Cholistan', 'https://upload.wikimedia.org/wikipedia/commons/8/89/Cholistani_Camel_Meat_Pulao.JPG', 'Cholistani Camel Meat Pulao.JPG', 'Miansari66', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en')
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 7 }
	},
	{
		id: 'food-golgappay',
		kind: 'food',
		name: 'Golgappay',
		urdu: 'گول گپے',
		location: 'Golgappay cart, Fort Road Food Street · real life: Anarkali and every school gate',
		era: 'Street snack, any time',
		stamp: 'Gol Gappa',
		accent: '#5b8f3a',
		summary: 'Crisp hollow puris filled with chickpeas and tangy spiced water, eaten in one bite.',
		story: [
			'Golgappay are tiny, puffed, hollow puris. The vendor cracks a hole in the top with his thumb, adds boiled chickpeas and potato, and dunks it in a pot of khatta pani made with tamarind, mint and spices.',
			'You have to eat it in one bite before it goes soft, and the vendor keeps filling them until you tell him to stop. In Karachi they are called pani puri, in Lahore golgappay.',
			'Golgappa carts stand outside schools, colleges and in bazaars like Anarkali, and they are a favourite at weddings, where there is always a queue at the golgappa stall.'
		],
		memory: 'One more, bhai, just one more!',
		photos: [
			photo('main', 'Golgappay (pani puri)', 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Pani_Puri1.JPG', 'Pani Puri1.JPG', 'Sruthi612', 'CC BY-SA 4.0', CC_BY_SA_4),
			photo('chutney', 'Golgappay with chutney', 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Panipuri_and_Chutney.jpg', 'Panipuri and Chutney.jpg', 'Shaifali Sood', 'CC BY-SA 4.0', CC_BY_SA_4)
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 7 }
	},
	{
		id: 'food-lassi',
		kind: 'food',
		name: 'Lassi',
		urdu: 'لسی',
		location: 'Malai Lassi stall, Fort Road Food Street · real life: lassi shops of the old city',
		era: 'Summer, after breakfast',
		stamp: 'Lassi',
		accent: '#d9c9a0',
		summary: 'Churned yogurt drink, sweet or salty, topped with a thick layer of cream.',
		story: [
			'Lassi is yogurt churned with water until frothy. Meethi lassi is sweet with sugar, namkeen lassi is salty with a pinch of roasted cumin, and in summer both are served with crushed ice.',
			'Lahori lassi is famously thick. It is poured into tall steel glasses or clay cups and crowned with a spoonful of malai (cream), sometimes with a knob of butter on top.',
			'A big glass of lassi after a breakfast of halwa puri or paye is the classic Lahori way to end the meal, followed, everyone agrees, by a long nap.'
		],
		memory: 'Lassi so thick the spoon stands up in it.',
		photos: [
			photo('main', 'Salt lassi', 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Salt_lassi.jpg', 'Salt lassi.jpg', 'Raksanand', 'CC BY-SA 4.0', CC_BY_SA_4),
			photo('patiala', 'A tall glass of Punjabi lassi', 'https://upload.wikimedia.org/wikipedia/commons/2/26/Patiyala_Lassi.jpg', 'Patiyala Lassi.jpg', 'Fatfoodie', 'CC BY-SA 4.0', CC_BY_SA_4)
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 7 }
	}
];

export const LANDMARKS: Landmark[] = [
	{
		id: 'delhi-gate',
		name: 'Delhi Gate',
		urdu: 'دہلی دروازہ',
		location: 'Walled City, Lahore',
		era: 'Mughal gateway, present gatehouse from the colonial era',
		stamp: 'Darwaza',
		accent: '#c6a582',
		summary: 'The eastern gate of the Walled City, facing the old road to Delhi.',
		story: [
			'Delhi Gate is one of the thirteen gates of the Walled City of Lahore. It faces east, towards the imperial road that once ran to Delhi, which gave the gate its name.',
			'It opens onto the Shahi Guzargah, the royal route that Mughal processions followed from the gate to the Lahore Fort, passing the Shahi Hammam and the Wazir Khan Mosque.',
			'The two-storey gatehouse still shelters shops inside its passage, and the bazaar around it has been one of the busiest in the old city for centuries.'
		],
		memory: 'Every story of the old city starts at a gate. This one opens towards Delhi.',
		photos: [
			{
				slot: 'main',
				caption: 'Delhi Gate seen from the Circular Road',
				source: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Delhi_Gate_11.jpg',
				author: 'Tahir mq',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Delhi Gate 11.jpg')
			}
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 8 }
	},
	{
		id: 'shahi-hammam',
		name: 'Shahi Hammam',
		urdu: 'شاہی حمام',
		location: 'Inside Delhi Gate, Walled City',
		era: '1634–1635, reign of Shah Jahan',
		stamp: 'Hammam',
		accent: '#a94d36',
		summary: 'A Persian-style royal bathhouse famous for its painted domes.',
		story: [
			'The Shahi Hammam was built in 1634–35 by Ilm-ud-din Ansari, known as Wazir Khan, the governor of Lahore under the Mughal emperor Shah Jahan. Its income supported the upkeep of the Wazir Khan Mosque.',
			'Visitors moved through a sequence of rooms: changing rooms, then warm and hot chambers heated from below, around a central octagonal hall under a dome.',
			'Its walls and vaults are covered with frescoes of flowers, vases, birds and geometric lattices. A conservation project led by the Aga Khan Trust for Culture with the Walled City of Lahore Authority restored the building in the 2010s.'
		],
		memory: 'Under the painted dome, the steam once carried gossip from every corner of the city.',
		photos: [
			{
				slot: 'main',
				caption: 'Central dome and frescoes of the hammam',
				source: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Central_dome_and_fresco_painting_of_Wazir_Khan_Hammam.jpg',
				author: 'Kumail Hasan',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Central dome and fresco painting of Wazir Khan Hammam.jpg')
			}
		],
		film: { mode: 'ofc', maxzoom: 1.5, duration: 9 }
	},
	{
		id: 'wazir-khan',
		name: 'Wazir Khan Mosque',
		urdu: 'مسجد وزیر خان',
		location: 'Wazir Khan Chowk, Walled City',
		era: '1634–1641, reign of Shah Jahan',
		stamp: 'Kashi-kari',
		accent: '#2f56a6',
		summary: 'The most richly decorated Mughal mosque, covered in kashi tile mosaic.',
		story: [
			'Wazir Khan built this mosque between 1634 and 1641 on the royal route through the old city. It is celebrated for its kashi-kari: faience tile mosaic in cobalt, turquoise, yellow, green and white.',
			'Four octagonal minarets stand at the corners of the courtyard, which centres on an ablution pool. The prayer hall to the west carries five domes and an iwan framed by floral tilework and Persian inscriptions.',
			'At the entrance, the mosque was built with a bazaar of shops, including the calligraphers\u2019 bazaar, whose rents paid for the mosque\u2019s upkeep.'
		],
		memory: 'Count the colours in a single tile panel. The craftsmen used them all, and then some.',
		photos: [
			{
				slot: 'main',
				caption: 'Courtyard, minarets and entrance portal',
				source: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Wazir_Khan_Mosque_by_Moiz.jpg',
				author: 'Moiz Ismaili',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Wazir Khan Mosque by Moiz.jpg')
			},
			{
				slot: 'minaret',
				caption: 'Tiled octagonal minaret',
				source: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Minaret_of_WK_Mosque.jpg',
				author: 'Guilhem Vellut',
				license: 'CC BY-SA 2.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
				commonsPage: commons('Minaret of WK Mosque.jpg')
			},
			{
				slot: 'tiles',
				caption: 'Kashi tile panels on the façade',
				source: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Tile_art_at_Wazir_khan_Mosque.jpg',
				author: 'Atif Gulzar',
				license: 'CC BY-SA 3.0',
				licenseUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
				commonsPage: commons('Tile art at Wazir khan Mosque.jpg')
			},
			{
				slot: 'iwan',
				caption: 'The prayer hall iwan',
				source: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Wazir_khan_iwan.jpg',
				author: 'Muhammad Ashar',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Wazir khan iwan.jpg')
			}
		],
		film: { mode: 'ztc', maxzoom: 1.4, duration: 9 }
	},
	{
		id: 'walled-city',
		name: 'Androon Shehr',
		urdu: 'اندرون شہر',
		location: 'Kashmiri Bazaar, Walled City',
		era: 'Mughal city walls from the reign of Akbar, 16th century',
		stamp: 'Galiyan',
		accent: '#b8694f',
		summary: 'The old walled city: narrow galis, wooden jharokhas and bazaars.',
		story: [
			'The Walled City of Lahore, Androon Shehr, grew inside walls rebuilt in brick under the emperor Akbar. Thirteen gates once led into it.',
			'Its lanes are lined with havelis whose carved wooden jharokhas lean over the street, with workshops and shops on the ground floor: Kashmiri Bazaar, Dabbi Bazaar and Suha Bazaar for jewellers among them.',
			'The Walled City of Lahore Authority, created in 2012, works on conserving the old fabric, including the restoration of the Shahi Guzargah.'
		],
		memory: 'Har gali mein aik kahani hai: every lane has a story.',
		photos: [
			{
				slot: 'main',
				caption: 'Calligraphers\u2019 bazaar at Wazir Khan Mosque',
				source: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Calligrapher%27s_Bazaar_at_Wazir_Khan_Mosque_6.jpg',
				author: 'Muhammad Ashar',
				license: 'CC BY-SA 3.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
				commonsPage: commons("Calligrapher's Bazaar at Wazir Khan Mosque 6.jpg")
			}
		],
		film: { mode: 'plr', maxzoom: 1.3, duration: 8 }
	},
	{
		id: 'lahore-fort',
		name: 'Lahore Fort',
		urdu: 'شاہی قلعہ',
		location: 'Northern edge of the Walled City',
		era: 'Rebuilt by Akbar in 1566; Alamgiri Gate 1674',
		stamp: 'Shahi Qila',
		accent: '#a0533c',
		summary: 'The Shahi Qila, a UNESCO World Heritage Site of Mughal palaces.',
		story: [
			'The Lahore Fort was rebuilt in brick by Akbar in 1566 and expanded by Jahangir, Shah Jahan and Aurangzeb. It was inscribed on the UNESCO World Heritage List in 1981, together with the Shalimar Gardens.',
			'Aurangzeb\u2019s Alamgiri Gate, flanked by two great semicircular bastions crowned with domed pavilions, faces Hazuri Bagh and the Badshahi Mosque.',
			'Inside are the Diwan-e-Aam, the Sheesh Mahal with its mirror mosaic, and the white marble Naulakha Pavilion with its curved Bengali roof.'
		],
		memory: 'Emperors entered here on elephants. You can walk in on foot.',
		photos: [
			{
				slot: 'main',
				caption: 'Alamgiri Gate and the Hazuri Bagh Baradari',
				source: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Alamgiri_Gate_and_Hazuri_Bagh._Lahore._0067p.jpg',
				author: 'Uzair Wali Muhammad',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Alamgiri Gate and Hazuri Bagh. Lahore. 0067p.jpg')
			},
			{
				slot: 'naulakha',
				caption: 'Naulakha Pavilion',
				source: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Naulakha_Pavilion_in_Lahore_Fort.jpg',
				author: 'Jawad.hassan89',
				license: 'CC BY-SA 3.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
				commonsPage: commons('Naulakha Pavilion in Lahore Fort.jpg')
			},
			{
				slot: 'sheesh-mahal',
				caption: 'Arches of the Sheesh Mahal',
				source: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Sheesh_Mahal_Arches.jpg',
				author: 'Faizanahmad',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Sheesh Mahal Arches.jpg')
			},
			{
				slot: 'baradari',
				caption: 'Hazuri Bagh Baradari',
				source: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Hazuri_Bagh_Baradari_%26_Ground.JPG',
				author: 'Rana Ahsan Chohan',
				license: 'CC BY-SA 3.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
				commonsPage: commons('Hazuri Bagh Baradari & Ground.JPG')
			}
		],
		film: { mode: 'ztc', maxzoom: 1.35, duration: 9 }
	},
	{
		id: 'badshahi',
		name: 'Badshahi Mosque',
		urdu: 'بادشاہی مسجد',
		location: 'Facing Hazuri Bagh and the Lahore Fort',
		era: '1671–1673, reign of Aurangzeb',
		stamp: 'Badshahi',
		accent: '#c96f58',
		summary: 'Aurangzeb\u2019s monumental red sandstone mosque with marble domes.',
		story: [
			'Commissioned by the emperor Aurangzeb and completed in 1673, the Badshahi Mosque is built of red sandstone inlaid with white marble. For more than three centuries it was the largest mosque in the world.',
			'Its vast courtyard is enclosed by arcades, with four towering minarets at the corners. The prayer hall carries three white marble domes over a façade of cusped arches.',
			'Its grand gateway faces the Alamgiri Gate of the Lahore Fort across Hazuri Bagh. The poet Allama Iqbal is buried beside its steps.'
		],
		memory: 'Stand in the courtyard at sunset and the red stone glows like a lantern.',
		photos: [
			{
				slot: 'main',
				caption: 'Prayer hall and domes from the courtyard',
				source: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Badshahi_Mosque_front_picture.jpg',
				author: 'Romero Maia',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Badshahi Mosque front picture.jpg')
			},
			{
				slot: 'aerial',
				caption: 'Badshahi Mosque, Hazuri Bagh and the Fort from the air',
				source: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Badshahi_Mosqu_-_Mughal_Art_in_an_Ocean_of_Concrete.jpg',
				author: 'Idaudpota',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Badshahi Mosqu - Mughal Art in an Ocean of Concrete.jpg')
			}
		],
		film: { mode: 'ofc', maxzoom: 1.4, duration: 9 }
	},
	{
		id: 'food-street',
		name: 'Fort Road Food Street',
		urdu: 'فوڈ اسٹریٹ',
		location: 'Fort Road, beside the Badshahi Mosque',
		era: 'Opened in 2012 in restored havelis',
		stamp: 'Khana',
		accent: '#e08b50',
		summary: 'Rooftop restaurants in old havelis, looking onto the Badshahi Mosque.',
		story: [
			'Fort Road Food Street runs through a row of old havelis whose façades and wooden balconies were restored and painted when the street opened to diners in 2012.',
			'At night the lane fills with tables, lanterns and the smell of karahi, tikka and fresh naan from the tandoor. Many rooftops look straight onto the domes of the Badshahi Mosque.',
			'It is part of Lahore\u2019s reputation as Pakistan\u2019s food capital, where people say: Lahore Lahore aye.'
		],
		memory: 'Order the karahi, wait for the naan, and watch the domes light up.',
		photos: [
			{
				slot: 'main',
				caption: 'Havelis of Fort Road Food Street at dusk',
				source: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Food_Street_Lahore.jpg',
				author: 'Sanabil Taym',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Food Street Lahore.jpg')
			}
		],
		film: { mode: 'ztc', maxzoom: 1.3, duration: 8 }
	},
	{
		id: 'railway-station',
		name: 'Lahore Junction',
		urdu: 'لاہور ریلوے اسٹیشن',
		location: 'Railway Road, east of the Walled City',
		era: 'Built 1859–1860, British colonial era',
		stamp: 'Rail',
		accent: '#9c3f2f',
		summary: 'A red-brick railway station built like a fortress, with towers and battlements.',
		story: [
			'Lahore Junction was built between 1859 and 1860, soon after the uprising of 1857. Its designers gave it thick walls, crenellated towers and loopholes so that it could be defended like a fort.',
			'The style mixes Victorian Gothic with Mughal details: pointed arches, turrets with domed tops and a central clock tower. It is one of the largest and busiest stations in Pakistan.',
			'In 1947, during Partition, the station saw huge crowds of refugees arriving and leaving. Today trains still run from here to Karachi, Rawalpindi, Peshawar and the Wagah border.'
		],
		memory: 'The old trains still run from Lahore Junction. The station was built like a fort after 1857.',
		photos: [
			{
				slot: 'main',
				caption: 'The fortified façade of Lahore Junction',
				source: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Lahore_Railway_Station_14.jpg',
				author: 'Nadeem Abbas Mushtaq',
				license: 'CC BY-SA 3.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
				commonsPage: commons('Lahore Railway Station 14.jpg')
			},
			{
				slot: 'front',
				caption: 'The front of the station in 2019',
				source: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Front_View_of_Lahore_Railway_Station_2019.jpg',
				author: 'KamranRashied',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Front View of Lahore Railway Station 2019.jpg')
			},
			{
				slot: 'platform',
				caption: 'A train waiting at the platform',
				source: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Train_platform_at_Lahore_Railway_Station.jpg',
				author: 'Pale blue dot (English Wikipedia)',
				license: 'CC BY-SA 3.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
				commonsPage: commons('Train platform at Lahore Railway Station.jpg')
			},
			{
				slot: 'history',
				caption: 'Lahore Railway Station in the 1880s',
				source: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Lahore_Railway_Station_in_1880s.jpg',
				author: 'Unknown photographer',
				license: 'Public domain',
				licenseUrl: 'https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain',
				commonsPage: commons('Lahore Railway Station in 1880s.jpg')
			}
		],
		film: { mode: 'plr', maxzoom: 1.3, duration: 8 }
	},
	{
		id: 'gaddafi-stadium',
		name: 'Gaddafi Stadium',
		urdu: 'قذافی اسٹیڈیم',
		location: 'Gulberg, Lahore',
		era: 'Opened 1959, renamed 1974',
		stamp: 'Cricket',
		accent: '#2f7b56',
		summary: 'Lahore\u2019s great cricket ground, home of the Lahore Qalandars.',
		story: [
			'The stadium opened in 1959 as Lahore Stadium and hosted its first Test match that year. It was renamed in 1974 after Libya\u2019s leader Muammar Gaddafi, following a speech he gave in Lahore supporting Pakistan\u2019s nuclear programme.',
			'Its outer façade of red brick arches was designed by the architect Nayyar Ali Dada. The ground hosted the 1996 Cricket World Cup final, in which Sri Lanka beat Australia.',
			'It is the headquarters of the Pakistan Cricket Board and the home ground of the Lahore Qalandars in the Pakistan Super League.'
		],
		memory: 'On match nights the floodlights glow over Gulberg and the whole city shouts at once.',
		photos: [
			{
				slot: 'main',
				caption: 'Gaddafi Stadium during the Pakistan Super League',
				source: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Gaddafi_Stadium_during_PSL_2026.jpg',
				author: 'PCB',
				license: 'CC0',
				licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en',
				commonsPage: commons('Gaddafi Stadium during PSL 2026.jpg')
			}
		],
		film: { mode: 'ofc', maxzoom: 1.35, duration: 8 }
	},
	{
		id: 'minar-e-pakistan',
		name: 'Minar-e-Pakistan',
		urdu: 'مینار پاکستان',
		location: 'Greater Iqbal Park, north of the Fort',
		era: 'Built 1960–1968',
		stamp: 'Minar',
		accent: '#7f97a8',
		summary: 'The national monument where the Lahore Resolution was passed in 1940.',
		story: [
			'Minar-e-Pakistan stands where the All-India Muslim League passed the Lahore Resolution on 23 March 1940, calling for independent states for the Muslims of the subcontinent.',
			'Designed by Nasreddin Murat-Khan and completed in 1968, the tower rises about 62 metres from a base shaped like an opening flower. The base platforms symbolise the struggle for freedom.',
			'Inscriptions around the base include the text of the resolution and verses of Allama Iqbal. The park around it, once Minto Park, is now Greater Iqbal Park.'
		],
		memory: 'Every 23rd of March the park fills with green flags around the white tower.',
		photos: [
			{
				slot: 'main',
				caption: 'Minar-e-Pakistan in Greater Iqbal Park',
				source: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Minar_e_Pakistan_2021.jpg',
				author: 'King Eliot',
				license: 'CC BY-SA 4.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
				commonsPage: commons('Minar e Pakistan 2021.jpg')
			}
		],
		film: { mode: 'ztc', maxzoom: 1.3, duration: 8 }
	},
	{
		id: 'truck-art',
		name: 'Pakistani Truck Art',
		urdu: 'ٹرک آرٹ',
		location: 'Parked in Delhi Gate chowk, and on every highway of Pakistan',
		era: 'A living folk art of the 20th and 21st centuries',
		stamp: 'Phool Patti',
		accent: '#d8352a',
		summary: 'Trucks painted like travelling palaces: flowers, birds, poetry and a crown over the cab.',
		story: [
			'Decorating trucks grew into a craft in the workshops of Karachi, Rawalpindi and Peshawar, and became one of Pakistan\u2019s best-known folk arts. Painters, carpenters, metalworkers and chamak-patti (reflective tape) artists each add their part.',
			'The wooden crown over the cab is called the taj. The sides carry flowers, peacocks, mountains, mosques and portraits, and chains and tassels hang from the bumpers and chassis so the truck jingles on the road.',
			'The back panel is for poetry and sayings, such as \u201cDekh magar pyar se\u201d (look, but with love) and \u201cMaa ki dua, jannat ki hawa\u201d (a mother\u2019s prayer is a breeze from paradise). Drivers often spend a large part of their savings on the decoration.'
		],
		memory: 'A decorated truck is a travelling palace. The poetry on the back is the best writing on the road.',
		photos: [
			{
				slot: 'main',
				caption: 'A decorated truck on the road',
				source: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Pakistani_truck.jpg',
				author: 'Alexandros.Papadopoulos (Flickr)',
				license: 'CC BY-SA 2.0',
				licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
				commonsPage: commons('Pakistani truck.jpg')
			},
			{
				slot: 'highway',
				caption: 'A jingle truck on the N-5 highway near Thatta',
				source: 'https://upload.wikimedia.org/wikipedia/commons/0/04/PK_Truck_on_N-5_near_Thatta_asv2020-02_img2.jpg',
				author: 'A.Savin',
				license: 'Free Art License',
				licenseUrl: 'http://artlibre.org/licence/lal/en',
				commonsPage: commons('PK Truck on N-5 near Thatta asv2020-02 img2.jpg')
			},
			{
				slot: 'detail',
				caption: 'Painted panels in close-up',
				source: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Such_beauty_%281015799377%29.jpg',
				author: 'Murtaza Imran Ali (Flickr)',
				license: 'CC BY 2.0',
				licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
				commonsPage: commons('Such beauty (1015799377).jpg')
			},
			{
				slot: 'symbol',
				caption: 'The symbol of art: truck art up close',
				source: 'https://upload.wikimedia.org/wikipedia/commons/8/87/The_symbol_of_art_%281015808925%29.jpg',
				author: 'Murtaza Imran Ali (Flickr)',
				license: 'CC BY 2.0',
				licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
				commonsPage: commons('The symbol of art (1015808925).jpg')
			}
		],
		film: { mode: 'ztc', maxzoom: 1.4, duration: 8 }
	},
	{
		id: 'wagah-border',
		name: 'Wagah Border',
		urdu: 'واہگہ بارڈر',
		location: 'Grand Trunk Road, between Lahore and Amritsar',
		era: 'Ceremony held every evening since 1959',
		stamp: 'Wagah',
		accent: '#01411c',
		summary: 'Where the Grand Trunk Road crosses into India, and the evening flag ceremony draws cheering crowds on both sides.',
		story: [
			'Wagah is the village on Pakistan\u2019s side of the only road crossing between Pakistan and India, on the old Grand Trunk Road between Lahore and Amritsar. Across the zero line is Attari on the Indian side.',
			'Every evening before sunset, Pakistan Rangers in black and India\u2019s Border Security Force in khaki perform the lowering of the flags. Soldiers in fan-crested turbans march to the gates with high kicks and stamps, the iron gates are thrown open, the two flags come down together, the commanders shake hands and the gates are shut.',
			'Thousands of spectators fill the stands on both sides, waving flags and chanting. Pakistan\u2019s gate is the Bab-e-Azadi (Gate of Freedom); India\u2019s is the Swarna Jayanti Dwar. The ceremony has been held since 1959.'
		],
		memory: 'Pakistan Zindabad echoes off the Bab-e-Azadi as the flags come down at sunset.',
		photos: [
			photo('main', 'The flag ceremony at Wagah', 'https://upload.wikimedia.org/wikipedia/commons/0/07/Flag_ceremony_at_Wahga_border_of_Pak_India.jpg', 'Flag ceremony at Wahga border of Pak India.jpg', 'Intisar Ali', 'CC BY-SA 4.0', CC_BY_SA_4),
			photo('gate', 'Bab-e-Azadi, the Gate of Freedom', 'https://upload.wikimedia.org/wikipedia/commons/6/66/Bab_e_Azadi_Wahga_Border.jpg', 'Bab e Azadi Wahga Border.jpg', 'King Eliot', 'CC BY-SA 4.0', CC_BY_SA_4),
			photo('stands', 'The stands on the Pakistani side', 'https://upload.wikimedia.org/wikipedia/commons/2/24/Stadium_wahga_border.jpg', 'Stadium wahga border.jpg', 'King Eliot', 'CC BY-SA 4.0', CC_BY_SA_4),
			photo('rangers', 'Pakistan Rangers at Wagah', 'https://upload.wikimedia.org/wikipedia/commons/7/78/Soldiers_at_Wagah_border.jpg', 'Soldiers at Wagah border.jpg', 'Guilhem Vellut (Flickr)', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0'),
			photo('line', 'The border seen from the Pakistani side before the ceremony', 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Wagha_border.jpg', 'Wagha border.jpg', 'ZMAlam', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0')
		],
		film: { mode: 'ztc', maxzoom: 1.3, duration: 8 }
	},
	...FOOD
];

export const LANDMARK_BY_ID = Object.fromEntries(LANDMARKS.map((l) => [l.id, l])) as Record<LandmarkId, Landmark>;
