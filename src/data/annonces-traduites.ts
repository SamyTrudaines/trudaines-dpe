/**
 * Annonces traduites pour les flux des portails internationaux (/flux/kyero.xml,
 * /flux/trovit-<langue>.xml).
 *
 * Une entrée par bien, clé = nom du fichier dans src/content/biens. Chaque
 * traduction reprend le texte français de la fiche, sans rien y ajouter : ni
 * surface, ni étage, ni prestation qui n'y figure pas. Prix, surface, pièces,
 * DPE et dépenses d'énergie ne s'écrivent jamais ici : les flux les lisent dans
 * la fiche, et la ligne légale se compose dans src/lib/flux.ts.
 *
 * Langues retenues, celles des acquéreurs étrangers les plus présents sur le
 * haut de gamme parisien : anglais, allemand, espagnol, italien, portugais,
 * chinois simplifié, arabe. Un bien sans traduction part en français seul.
 */

export const LANGUES = ['en', 'de', 'es', 'it', 'pt', 'zh', 'ar'] as const;
export type Langue = (typeof LANGUES)[number];

export type Traduction = { titre: string; texte: string };

export const annoncesTraduites: Record<string, Partial<Record<Langue, Traduction>>> = {
  'appartement-2-pieces-43m2-renove-rue-vaneau': {
    en: {
      titre: 'Renovated 2-room apartment, rue Vaneau, Paris 7th',
      texte: `Exclusive listing. In the Babylone Vaneau area, between Le Bon Marché and Les Invalides, a fully renovated, dual-aspect two-room apartment on a quiet street, close to the Hôtel Matignon and the Catherine Labouré garden.

On the second floor, without lift, of a small building set around a paved, planted courtyard, the apartment was entirely redesigned in 2021. A bright living room where the open, fully equipped kitchen with marble worktop faces a marble fireplace, cornices and a ceiling rose. The bedroom, about 13 m², has a built-in desk, wardrobe and bookcase. Shower room with window and wall-hung WC.

Pale long-board parquet, built-in storage, double glazing. Vaneau metro (line 10) five minutes on foot, Sèvres-Babylone and Saint-François-Xavier nearby. A rare address for a first purchase, a pied-à-terre in Paris or a long-term investment.`,
    },
    de: {
      titre: 'Renovierte 2-Zimmer-Wohnung, Rue Vaneau, Paris 7.',
      texte: `Exklusivangebot. Im Viertel Babylone Vaneau, zwischen Le Bon Marché und Les Invalides, eine vollständig renovierte, durchgehende Zweizimmerwohnung in ruhiger Straße, nahe dem Hôtel Matignon und dem Garten Catherine Labouré.

Im zweiten Stock ohne Aufzug eines kleinen Hauses mit gepflastertem, begrüntem Innenhof, 2021 komplett neu gestaltet. Ein heller Wohnraum, in dem die offene, voll ausgestattete Küche mit Marmorarbeitsplatte einem Marmorkamin, Stuck und einer Deckenrosette gegenübersteht. Das Schlafzimmer, rund 13 m², mit eingebautem Schreibtisch, Kleiderschrank und Bücherregal. Duschbad mit Fenster, wandhängendes WC.

Heller Langdielenparkett, Einbauschränke, Doppelverglasung. Metro Vaneau (Linie 10) fünf Gehminuten, Sèvres-Babylone und Saint-François-Xavier in der Nähe. Eine seltene Adresse für einen ersten Kauf, ein Pied-à-terre in Paris oder eine langfristige Anlage.`,
    },
    es: {
      titre: 'Piso reformado de 2 piezas, rue Vaneau, París 7',
      texte: `En exclusiva. En el barrio de Babylone Vaneau, entre Le Bon Marché y Les Invalides, un piso de dos piezas totalmente reformado, con doble orientación, en una calle tranquila, cerca del Hôtel Matignon y del jardín Catherine Labouré.

En la segunda planta sin ascensor de un pequeño edificio con patio adoquinado y ajardinado, el piso se rediseñó por completo en 2021. Un salón luminoso donde la cocina abierta y totalmente equipada, con encimera de mármol, dialoga con una chimenea de mármol, molduras y un rosetón. El dormitorio, de unos 13 m², incluye escritorio, armario y biblioteca empotrados. Baño con ducha y ventana, inodoro suspendido.

Parqué claro de lama larga, armarios empotrados, doble acristalamiento. Metro Vaneau (línea 10) a cinco minutos a pie, Sèvres-Babylone y Saint-François-Xavier muy cerca. Una dirección poco común para una primera compra, un pied-à-terre en París o una inversión patrimonial.`,
    },
    it: {
      titre: 'Bilocale ristrutturato, rue Vaneau, Parigi 7°',
      texte: `In esclusiva. Nel quartiere Babylone Vaneau, tra Le Bon Marché e Les Invalides, un bilocale passante interamente ristrutturato, in una via tranquilla, vicino all'Hôtel Matignon e al giardino Catherine Labouré.

Al secondo piano senza ascensore di un piccolo stabile con cortile lastricato e verde, l'appartamento è stato completamente ripensato nel 2021. Un soggiorno luminoso in cui la cucina a vista, completamente attrezzata, con piano in marmo, dialoga con un camino in marmo, modanature e un rosone. La camera, di circa 13 m², ha scrivania, armadio e libreria su misura. Bagno con doccia e finestra, WC sospeso.

Parquet chiaro a doghe lunghe, armadi a muro, doppi vetri. Metro Vaneau (linea 10) a cinque minuti a piedi, Sèvres-Babylone e Saint-François-Xavier vicini. Un indirizzo raro per un primo acquisto, un pied-à-terre a Parigi o un investimento patrimoniale.`,
    },
    pt: {
      titre: 'Apartamento renovado de 2 assoalhadas, rue Vaneau, Paris 7',
      texte: `Em exclusivo. No bairro Babylone Vaneau, entre Le Bon Marché e Les Invalides, um apartamento de duas assoalhadas totalmente renovado, com dupla orientação, numa rua tranquila, perto do Hôtel Matignon e do jardim Catherine Labouré.

No segundo andar sem elevador de um pequeno prédio com pátio empedrado e ajardinado, o apartamento foi inteiramente redesenhado em 2021. Uma sala luminosa onde a cozinha aberta e totalmente equipada, com bancada em mármore, dialoga com uma lareira em mármore, sancas e um florão. O quarto, com cerca de 13 m², tem secretária, roupeiro e estante embutidos. Casa de banho com duche e janela, sanita suspensa.

Soalho claro de tábua comprida, arrumação embutida, vidros duplos. Metro Vaneau (linha 10) a cinco minutos a pé, Sèvres-Babylone e Saint-François-Xavier por perto. Uma morada rara para uma primeira compra, um pied-à-terre em Paris ou um investimento patrimonial.`,
    },
    zh: {
      titre: '巴黎七区 Vaneau 街 翻新两居室公寓',
      texte: `独家代理。位于 Babylone Vaneau 街区，介于乐蓬马歇百货与荣军院之间，安静街道上的一套全面翻新、南北通透的两居室公寓，邻近马提尼翁府与 Catherine Labouré 花园。

公寓位于一栋小型建筑的二楼（无电梯），楼内有铺石并绿化的庭院，2021 年整体重新设计。明亮的客厅中，配备齐全的开放式厨房（大理石台面）与大理石壁炉、石膏线脚和天花玫瑰饰相映。卧室约 13 平方米，配有嵌入式书桌、衣柜和书架。带窗淋浴间，壁挂式马桶。

浅色长条实木地板，嵌入式储物，双层玻璃。步行五分钟至 Vaneau 地铁站（10 号线），Sèvres-Babylone 与 Saint-François-Xavier 站亦在附近。适合首次置业、巴黎落脚公寓或长期资产配置的稀缺地址。`,
    },
    ar: {
      titre: 'شقة من غرفتين مجددة، شارع فانو، الدائرة السابعة في باريس',
      texte: `عرض حصري. في حي بابيلون فانو، بين متجر لو بون مارشيه وقصر الأنفاليد، شقة من غرفتين مجددة بالكامل ومفتوحة على جهتين، في شارع هادئ، بالقرب من قصر ماتينيون وحديقة كاترين لابوريه.

في الطابق الثاني من دون مصعد، في مبنى صغير يطل على فناء مرصوف ومزروع، أعيد تصميم الشقة بالكامل عام 2021. صالة مضيئة يلتقي فيها المطبخ المفتوح المجهز بالكامل وسطحه من الرخام بمدفأة رخامية وزخارف جصية ووردة سقف. غرفة النوم، نحو 13 مترا مربعا، فيها مكتب وخزانة ومكتبة مدمجة. حمام بدش ونافذة، ومرحاض معلق.

أرضية باركيه فاتحة بألواح طويلة، خزائن مدمجة، زجاج مزدوج. محطة مترو فانو (الخط 10) على بعد خمس دقائق سيرا، ومحطتا سيفر بابيلون وسان فرانسوا كزافييه قريبتان. عنوان نادر لشراء أول، أو مسكن في باريس، أو استثمار طويل الأمد.`,
    },
  },

  'appartement-3-pieces-63m2-renove-abbesses': {
    en: {
      titre: 'Renovated 3-room apartment, Abbesses, Montmartre, Paris 18th',
      texte: `Bright, renovated and flexible three-room apartment in the heart of Montmartre, on rue des Trois Frères, one of the prettiest streets of the hill, about three minutes on foot from Abbesses metro (line 12), the place des Abbesses and the Halle Saint-Pierre.

Entrance with built-in storage, a double reception room, one bedroom, a separate equipped kitchen and a shower room with WC. Claustra panels and a sliding door make it easy to turn part of the reception into a second bedroom. The bedroom is quiet, on the courtyard side, with PVC double glazing and built-in storage. Equipped kitchen with window on the courtyard. Carefully finished shower room with metro tiles and cement tiles.

Fully renovated, nothing to plan: armoured three-point front door, new electricity meter, double glazing, generous built-in storage.`,
    },
    de: {
      titre: 'Renovierte 3-Zimmer-Wohnung, Abbesses, Montmartre, Paris 18.',
      texte: `Helle, renovierte und flexible Dreizimmerwohnung im Herzen von Montmartre, in der Rue des Trois Frères, einer der schönsten Straßen des Hügels, rund drei Gehminuten von der Metro Abbesses (Linie 12), der Place des Abbesses und der Halle Saint-Pierre.

Eingang mit Einbauschrank, Doppelsalon, ein Schlafzimmer, separate ausgestattete Küche und Duschbad mit WC. Raumteiler und eine Schiebetür machen aus einem Teil des Salons leicht ein zweites Schlafzimmer. Das Schlafzimmer liegt ruhig zum Hof, mit PVC-Doppelverglasung und Einbauschrank. Küche mit Fenster zum Hof. Sorgfältig gestaltetes Duschbad mit Metrofliesen und Zementfliesen.

Komplett renoviert, nichts zu tun: gepanzerte Eingangstür mit Dreipunktverriegelung, neuer Stromzähler, Doppelverglasung, viele Einbauschränke.`,
    },
    es: {
      titre: 'Piso reformado de 3 piezas, Abbesses, Montmartre, París 18',
      texte: `Piso de tres piezas luminoso, reformado y modulable en pleno Montmartre, en la rue des Trois Frères, una de las calles más bonitas de la colina, a unos tres minutos a pie del metro Abbesses (línea 12), de la place des Abbesses y de la Halle Saint-Pierre.

Entrada con armario empotrado, doble salón, un dormitorio, cocina independiente equipada y baño con ducha y aseo. Unos paneles de celosía y una puerta corredera permiten convertir parte del salón en un segundo dormitorio. El dormitorio, tranquilo, da al patio, con doble acristalamiento de PVC y armario empotrado. Cocina con ventana al patio. Baño cuidado con azulejo metro y baldosas hidráulicas.

Totalmente reformado, sin obras que prever: puerta blindada de tres puntos, contador eléctrico nuevo, doble acristalamiento, numerosos armarios empotrados.`,
    },
    it: {
      titre: 'Trilocale ristrutturato, Abbesses, Montmartre, Parigi 18°',
      texte: `Trilocale luminoso, ristrutturato e modulabile nel cuore di Montmartre, in rue des Trois Frères, una delle vie più belle della collina, a circa tre minuti a piedi dalla metro Abbesses (linea 12), da place des Abbesses e dalla Halle Saint-Pierre.

Ingresso con armadio a muro, doppio soggiorno, una camera, cucina abitabile separata e attrezzata, bagno con doccia e WC. Pannelli divisori e una porta scorrevole permettono di ricavare facilmente una seconda camera dal soggiorno. La camera, silenziosa, affaccia sul cortile, con doppi vetri in PVC e armadio a muro. Cucina con finestra sul cortile. Bagno curato con piastrelle metro e cementine.

Interamente ristrutturato, nulla da prevedere: porta blindata a tre punti, contatore elettrico nuovo, doppi vetri, numerosi armadi a muro.`,
    },
    pt: {
      titre: 'Apartamento renovado de 3 assoalhadas, Abbesses, Montmartre, Paris 18',
      texte: `Apartamento de três assoalhadas luminoso, renovado e modulável no coração de Montmartre, na rue des Trois Frères, uma das ruas mais bonitas da colina, a cerca de três minutos a pé do metro Abbesses (linha 12), da place des Abbesses e da Halle Saint-Pierre.

Entrada com arrumação embutida, sala dupla, um quarto, cozinha independente equipada e casa de banho com duche e sanita. Painéis de claustra e uma porta de correr permitem transformar parte da sala num segundo quarto. O quarto, sossegado, dá para o pátio, com vidros duplos em PVC e arrumação embutida. Cozinha com janela para o pátio. Casa de banho cuidada com azulejo metro e mosaico hidráulico.

Totalmente renovado, sem obras a prever: porta blindada de três pontos, contador elétrico novo, vidros duplos, muita arrumação embutida.`,
    },
    zh: {
      titre: '巴黎十八区 蒙马特 Abbesses 翻新三室公寓',
      texte: `位于蒙马特中心的明亮、翻新且布局灵活的三室公寓，坐落于山丘上最美的街道之一 Trois Frères 街，步行约三分钟可达 Abbesses 地铁站（12 号线）、Abbesses 广场和 Halle Saint-Pierre。

入户玄关带嵌入式储物，双客厅，一间卧室，独立的配套厨房，以及带卫生间的淋浴间。借助隔断屏风和推拉门，可轻松将部分客厅改为第二间卧室。卧室朝向内院，安静，配有 PVC 双层玻璃和嵌入式储物。厨房设有朝向内院的窗户。淋浴间做工精致，铺有地铁砖和水泥花砖。

全面翻新，无需任何工程：三点式防盗门，新电表，双层玻璃，大量嵌入式储物空间。`,
    },
    ar: {
      titre: 'شقة من ثلاث غرف مجددة، أبيس، مونمارتر، الدائرة 18 في باريس',
      texte: `شقة من ثلاث غرف مضيئة ومجددة وقابلة للتعديل في قلب مونمارتر، في شارع تروا فرير، أحد أجمل شوارع التلة، على بعد ثلاث دقائق سيرا تقريبا من محطة مترو أبيس (الخط 12) وساحة أبيس وقاعة سان بيير.

مدخل مع خزانة مدمجة، صالة مزدوجة، غرفة نوم، مطبخ مستقل مجهز، وحمام بدش ومرحاض. تتيح ألواح فاصلة وباب منزلق تحويل جزء من الصالة بسهولة إلى غرفة نوم ثانية. غرفة النوم هادئة تطل على الفناء، بزجاج مزدوج وخزانة مدمجة. مطبخ بنافذة على الفناء. حمام بتشطيب متقن ببلاط المترو والبلاط الإسمنتي.

مجددة بالكامل ولا تحتاج إلى أي أعمال: باب مصفح بثلاث نقاط قفل، عداد كهرباء جديد، زجاج مزدوج، خزائن مدمجة كثيرة.`,
    },
  },

  'appartement-4-pieces-83m2-vue-seine-exelmans': {
    en: {
      titre: '4-room apartment with Seine view, top floor, Exelmans, Paris 16th',
      texte: `Bright, dual-aspect four-room apartment with three bedrooms, on the seventh and top floor with lift, with an open view over the Seine, in a well-kept architect-designed cut-stone building with renovated common areas. Close to the Seine and avenue de Versailles, 600 m from Exelmans and Porte de Saint-Cloud (line 9) and Chardon-Lagache (line 10), about 350 m from the RER C and tram T3a at Pont du Garigliano.

The only apartment on its landing. Entrance with armoured door, two large wardrobes and a skylight. South-west facing living and dining room with Seine view, made-to-measure bookcase, pale long-board parquet. Fully equipped kitchen with quality materials. All three bedrooms face the courtyard, quiet, with views over the rooftops. Renovated shower room with walk-in shower and double basin on marble top, separate WC.

Double glazing and insulation lining, electric heating. Loft space, cellar and bicycle storage. Low service charges.`,
    },
    de: {
      titre: '4-Zimmer-Wohnung mit Seineblick, Dachgeschoss, Exelmans, Paris 16.',
      texte: `Helle, durchgehende Vierzimmerwohnung mit drei Schlafzimmern im siebten und obersten Stock mit Aufzug, mit freiem Blick auf die Seine, in einem gepflegten Architektenhaus aus Haustein mit renovierten Gemeinschaftsflächen. Nahe der Seine und der Avenue de Versailles, 600 m von den Metrostationen Exelmans und Porte de Saint-Cloud (Linie 9) und Chardon-Lagache (Linie 10), rund 350 m von RER C und Tram T3a am Pont du Garigliano.

Einzige Wohnung auf der Etage. Eingang mit Panzertür, zwei großen Einbauschränken und Oberlicht. Wohn- und Esszimmer nach Südwesten mit Seineblick, maßgefertigtes Bücherregal, heller Langdielenparkett. Voll ausgestattete Küche mit hochwertigen Materialien. Alle drei Schlafzimmer liegen ruhig zum Hof, mit Blick über die Dächer. Renoviertes Duschbad mit bodengleicher Dusche und Doppelwaschtisch mit Marmorplatte, separates WC.

Doppelverglasung und Innendämmung, Elektroheizung. Dachboden, Keller und Fahrradraum. Niedrige Nebenkosten.`,
    },
    es: {
      titre: 'Piso de 4 piezas con vistas al Sena, última planta, Exelmans, París 16',
      texte: `Piso de cuatro piezas luminoso y con doble orientación, tres dormitorios, en la séptima y última planta con ascensor, con vistas despejadas al Sena, en un edificio de piedra tallada de arquitecto, bien cuidado, con zonas comunes reformadas. Cerca del Sena y de la avenue de Versailles, a 600 m de los metros Exelmans y Porte de Saint-Cloud (línea 9) y Chardon-Lagache (línea 10), a unos 350 m del RER C y del tranvía T3a en Pont du Garigliano.

Único piso en el rellano. Entrada con puerta blindada, dos grandes armarios y luz cenital. Salón comedor orientado al suroeste con vistas al Sena, biblioteca a medida, parqué claro de lama larga. Cocina totalmente equipada con materiales de calidad. Los tres dormitorios dan al patio, tranquilos, con vistas a los tejados. Baño reformado con ducha a ras de suelo y doble lavabo con encimera de mármol, aseo independiente.

Doble acristalamiento y aislamiento interior, calefacción eléctrica. Desván, trastero y cuarto de bicicletas. Gastos de comunidad bajos.`,
    },
    it: {
      titre: 'Quadrilocale vista Senna, ultimo piano, Exelmans, Parigi 16°',
      texte: `Quadrilocale luminoso e passante con tre camere, al settimo e ultimo piano con ascensore, con vista aperta sulla Senna, in un elegante stabile d'architetto in pietra da taglio, ben tenuto, con parti comuni ristrutturate. Vicino alla Senna e ad avenue de Versailles, a 600 m dalle metro Exelmans e Porte de Saint-Cloud (linea 9) e Chardon-Lagache (linea 10), a circa 350 m dalla RER C e dal tram T3a a Pont du Garigliano.

Unico appartamento sul pianerottolo. Ingresso con porta blindata, due grandi armadi e lucernario. Soggiorno con zona pranzo esposto a sud-ovest con vista Senna, libreria su misura, parquet chiaro a doghe lunghe. Cucina completamente attrezzata con materiali di qualità. Le tre camere affacciano sul cortile, silenziose, con vista sui tetti. Bagno ristrutturato con doccia a filo pavimento e doppio lavabo con piano in marmo, WC separato.

Doppi vetri e isolamento interno, riscaldamento elettrico. Sottotetto, cantina e locale biciclette. Spese condominiali contenute.`,
    },
    pt: {
      titre: 'Apartamento de 4 assoalhadas com vista para o Sena, último andar, Exelmans, Paris 16',
      texte: `Apartamento de quatro assoalhadas luminoso e com dupla orientação, três quartos, no sétimo e último andar com elevador, com vista desafogada para o Sena, num prédio de arquiteto em pedra de cantaria, bem conservado, com áreas comuns renovadas. Perto do Sena e da avenue de Versailles, a 600 m dos metros Exelmans e Porte de Saint-Cloud (linha 9) e Chardon-Lagache (linha 10), a cerca de 350 m do RER C e do elétrico T3a em Pont du Garigliano.

Único apartamento no patamar. Entrada com porta blindada, dois grandes roupeiros e claraboia. Sala de estar e jantar orientada a sudoeste com vista para o Sena, estante por medida, soalho claro de tábua comprida. Cozinha totalmente equipada com materiais de qualidade. Os três quartos dão para o pátio, sossegados, com vista sobre os telhados. Casa de banho renovada com duche de nível e lavatório duplo com tampo em mármore, sanita separada.

Vidros duplos e isolamento interior, aquecimento elétrico. Sótão, arrecadação e espaço para bicicletas. Despesas de condomínio baixas.`,
    },
    zh: {
      titre: '巴黎十六区 Exelmans 顶层塞纳河景四室公寓',
      texte: `明亮、南北通透的四室公寓，三间卧室，位于七楼顶层，设有电梯，可远眺塞纳河。建筑为保养良好的建筑师设计石材楼宇，公共区域已翻新。邻近塞纳河与凡尔赛大道，距 Exelmans 和 Porte de Saint-Cloud 地铁站（9 号线）及 Chardon-Lagache 站（10 号线）600 米，距 Pont du Garigliano 的 RER C 线和 T3a 有轨电车约 350 米。

一梯一户。入户设防盗门、两个大型衣帽柜和天窗采光。客厅兼餐厅朝西南，享塞纳河景，定制书架，浅色长条实木地板。厨房设备齐全，用料考究。三间卧室均朝向内院，安静，可俯瞰屋顶景色。翻新淋浴间配无门槛淋浴和大理石台面双洗手盆，独立卫生间。

双层玻璃及保温内衬，电暖。另有阁楼、地下储藏室和自行车间。物业费低。`,
    },
    ar: {
      titre: 'شقة من أربع غرف بإطلالة على نهر السين، الطابق الأخير، إكسلمانس، الدائرة 16 في باريس',
      texte: `شقة من أربع غرف مضيئة ومفتوحة على جهتين، فيها ثلاث غرف نوم، في الطابق السابع والأخير مع مصعد، بإطلالة مفتوحة على نهر السين، في مبنى حجري من تصميم معماري، محافظ عليه جيدا، وأجزاؤه المشتركة مجددة. قريبة من نهر السين وجادة فرساي، على بعد 600 متر من محطتي مترو إكسلمانس وبورت دو سان كلو (الخط 9) وشاردون لاغاش (الخط 10)، ونحو 350 مترا من قطار RER C وترام T3a عند جسر غاريليانو.

الشقة الوحيدة في الطابق. مدخل بباب مصفح وخزانتين كبيرتين ونافذة سقفية. صالة استقبال وطعام موجهة نحو الجنوب الغربي بإطلالة على السين، مكتبة مصنوعة حسب الطلب، باركيه فاتح بألواح طويلة. مطبخ مجهز بالكامل بمواد عالية الجودة. غرف النوم الثلاث تطل على الفناء، هادئة، مع إطلالة على الأسطح. حمام مجدد بدش أرضي ومغسلتين على سطح رخامي، ومرحاض منفصل.

زجاج مزدوج وعزل داخلي، تدفئة كهربائية. علية وقبو ومكان للدراجات. رسوم ملكية مشتركة منخفضة.`,
    },
  },
};
