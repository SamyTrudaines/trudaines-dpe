/**
 * Le regard de l'agence sur une rue : texte de Samy, affiché sur /prix-immobilier/<slug>
 * sous « Ce que ces chiffres disent ». Aucun chiffre ici : les prix, ventes et typologies
 * de la page viennent de src/data/rues.json et se mettent à jour seuls. Les comparaisons
 * restent qualitatives (plus cher, moins cher) et ont été vérifiées sur rues.json au
 * moment de la rédaction. Une rue absente de cette liste garde sa page telle quelle.
 */
export const regardsRues: Record<string, string[]> = {
  /* Montmartre, Abbesses */
  'rue-lepic-18': [
    "La rue Lepic n'est pas une rue, c'en est deux. En bas, près du boulevard de Clichy, elle vit avec son marché, ses commerces et son passage. En haut, après le virage du Moulin de la Galette, elle devient calme et résidentielle. Le prix suit cette montée.",
    "Les deux pièces font l'essentiel des ventes ; les trois pièces sont rares et partent vite. En visite, nous regardons d'abord le numéro, puis l'étage et l'ascenseur. Sur la partie haute, un dernier étage avec vue se vend nettement au-dessus de la médiane de la rue.",
  ],
  'rue-des-abbesses-18': [
    "Autour de la place et de son entrée de métro Guimard, la rue des Abbesses est la vitrine de Montmartre. Elle se vend parmi les prix les plus élevés du 18e, surtout en studios et en deux pièces.",
    "Les acheteurs sont souvent des Parisiens qui veulent un pied-à-terre, ou des acquéreurs qui achètent l'adresse autant que l'appartement. Le bruit et la fréquentation pèsent sur les premiers étages côté rue. Côté cour ou en étage élevé, l'écart disparaît : c'est souvent là que se joue la négociation.",
  ],
  'rue-tholoze-18': [
    "Rue courte et pentue, la rue Tholozé descend du Moulin de la Galette vers la rue des Abbesses, devant le Studio 28. Les ventes y sont rares et les biens se ressemblent.",
    "Avec si peu de transactions, nous complétons toujours par les rues voisines, Lepic, Durantin et Burq. Ici, le prix dépend surtout de l'état et de l'étage : un appartement rénové en étage part vite, un rez-de-chaussée sur la pente demande un prix ajusté dès la mise en vente.",
  ],
  'rue-des-trois-freres-18': [
    "Rendue célèbre par l'épicerie d'Amélie Poulain, la rue des Trois-Frères est aussi l'une des plus actives de la Butte. C'est une rue de petites surfaces : studios et deux pièces font l'essentiel du marché, achetés par des primo-accédants exigeants, des investisseurs et des pied-à-terre.",
    "La partie haute, vers la place Émile-Goudeau, est plus calme et se vend mieux que la partie basse, plus commerçante. Pour un studio, la qualité du plan pèse autant que l'adresse : chaque mètre carré utile doit se voir en photo.",
  ],
  'rue-ravignan-18': [
    "Rue Ravignan, place Émile-Goudeau, le Bateau-Lavoir : c'est le cœur historique de Montmartre, et l'une des rues les plus chères de nos secteurs. Les surfaces y sont petites, dans des immeubles anciens souvent sans ascenseur.",
    "Ce qui fait la différence, c'est la vue. Depuis les étages élevés, les dégagements sur Paris peuvent porter un appartement largement au-dessus de la médiane. Nous le chiffrons à partir de ventes comparables, pas d'une intuition.",
  ],
  'rue-durantin-18': [
    "Entre la rue Lepic et la rue Burq, la rue Durantin est une rue de vie de quartier, plus calme que les Abbesses toutes proches. C'est la rue des studios et des deux pièces compacts, prisée des jeunes actifs qui veulent les Abbesses à pied sans en payer tout le prix.",
    "Pour un vendeur, c'est un marché liquide. Les biens bien présentés et au bon prix se vendent en quelques semaines ; les biens surestimés restent, car les acheteurs comparent avec les rues Lepic et Burq.",
  ],
  'rue-germain-pilon-18': [
    "La rue Germain-Pilon descend des Abbesses vers le boulevard de Clichy et relie deux mondes : la Butte en haut, Pigalle en bas. Elle a une particularité dans ce secteur de petites surfaces : on y vend aussi de grands appartements.",
    "Le haut de rue, près de la rue des Abbesses, se vend mieux que le bas, plus animé le soir. La cité Germain-Pilon voisine, plus discrète, se vend un peu moins cher. Pour estimer, nous regardons le numéro exact et l'exposition.",
  ],
  'rue-veron-18': [
    "Petite rue entre la rue Lepic et la rue des Abbesses, la rue Véron est l'une des portes d'entrée les plus accessibles de Montmartre. On n'y vend presque que des studios et des deux pièces : c'est la rue des premiers achats et des investisseurs.",
    "La rue Audran voisine se vend nettement plus cher ; l'écart tient surtout à la configuration des immeubles et à la lumière. Un studio rénové en étage, rue Véron, peut se rapprocher des prix des rues voisines. Nous le montrons avec des ventes réelles.",
  ],
  'rue-tardieu-18': [
    "Au pied du funiculaire, la rue Tardieu relie le quartier du marché Saint-Pierre aux Abbesses. Peu de ventes, mais toutes les tailles, jusqu'à de grands appartements.",
    "C'est une rue très fréquentée en journée. En étage, avec une vue qui remonte vers le Sacré-Cœur, un appartement se vend nettement mieux qu'au premier étage. Nous comparons toujours avec la rue Chappe et la rue d'Orsel voisines.",
  ],
  'rue-gabrielle-18': [
    "Rue étroite et en pente sous le Sacré-Cœur, la rue Gabrielle compte parmi les plus chères de la Butte. Ses studios et ses deux pièces y sont plus spacieux que dans les rues voisines.",
    "Les étages élevés ouverts sur Paris font les plus hauts prix du quartier ; les appartements bas, adossés à la pente, se vendent très en dessous. Une estimation à la médiane n'a ici presque aucun sens : tout se joue à la visite.",
  ],
  'rue-audran-18': [
    "Petite rue calme près de la rue Véron et de la rue des Abbesses, la rue Audran compte peu de ventes, presque toutes en studios et en deux pièces compacts. L'adresse se paie, nettement plus que dans la rue Véron voisine.",
    "Cet écart montre à quel point le calme et la qualité des immeubles pèsent sur la Butte. Avec si peu de ventes, nous élargissons toujours la comparaison à la rue des Abbesses et à la rue Robert-Planquette.",
  ],
  'rue-burq-18': [
    "Courte rue proche de la rue des Abbesses et de la rue Durantin, la rue Burq est recherchée pour son calme. Studios et deux pièces font presque tout le marché, avec des studios plus spacieux que dans la plupart des rues voisines.",
    "Les immeubles y sont variés, et l'écart entre les ventes est large. Un appartement rénové, en étage, sur cette rue tranquille, se vend souvent au-dessus de ses voisines Durantin et Tholozé.",
  ],
  'rue-chappe-18': [
    "La rue Chappe se termine en escaliers vers le Sacré-Cœur. Ces marches, et les vues qu'elles offrent, font son charme. On y vend surtout des petites surfaces.",
    "L'accès compte : les escaliers séduisent les amoureux de la Butte mais en écartent d'autres. Nous en tenons compte dans la stratégie de prix et dans le choix des acheteurs à qui présenter le bien.",
  ],
  'rue-berthe-18': [
    "Rue pittoresque entre la rue des Trois-Frères et la rue Ravignan, la rue Berthe se vend bien au-dessus de la médiane du 18e. Le marché y est presque exclusivement fait de studios et de deux pièces, recherchés par des acheteurs qui veulent le Montmartre des cartes postales.",
    "Les immeubles anciens, souvent sans ascenseur, rendent l'étage décisif. Un dernier étage lumineux peut se rapprocher des prix de la rue Gabrielle voisine.",
  ],
  'rue-yvonne-le-tac-18': [
    "Près de la place des Abbesses et de la rue des Martyrs, la rue Yvonne-Le-Tac a une particularité sur la Butte : on y vend aussi de grands appartements, dans de beaux immeubles.",
    "L'écart entre les ventes est large. Les immeubles proches des Abbesses se vendent bien au-dessus de la médiane ; côté rue des Martyrs, l'écart avec les rues voisines se resserre.",
  ],
  'villa-dancourt-18': [
    "Voie discrète près du square d'Anvers, à la frontière du 9e, la villa Dancourt offre des surfaces confortables dans un cadre calme. Elle se vend parmi les prix les plus élevés du 18e.",
    "C'est l'exemple même d'une adresse qui ne se compare pas à sa rue voisine : la rue Dancourt se vend nettement moins cher. Pour estimer ici, nous comparons avec les rues calmes du 9e nord, comme la rue Lallier.",
  ],
  /* Lamarck, Caulaincourt, versant nord */
  'rue-caulaincourt-18': [
    "Rue haussmannienne qui enjambe le cimetière de Montmartre et contourne la Butte par le nord, la rue Caulaincourt est la grande rue familiale du 18e. Elle offre ce que la Butte offre rarement : des surfaces, jusqu'aux grands appartements de plus de cent mètres carrés.",
    "Le début de la rue, côté place de Clichy, et la portion qui longe le cimetière n'ont pas le même marché que la partie haute, vers l'avenue Junot. Balcon, ascenseur et appartement traversant font ici les plus gros écarts.",
  ],
  'rue-lamarck-18': [
    "La rue Lamarck fait le tour de la Butte par le nord, du Sacré-Cœur à la rue Marcadet, en passant par la station Lamarck Caulaincourt. C'est l'une des rues les plus actives de nos secteurs, avec des immeubles de rapport, des constructions des années 1930 et quelques immeubles récents.",
    "La rue n'a pas un prix mais plusieurs. Côté Sacré-Cœur et escaliers, les vues se paient ; vers la rue Marcadet, les prix rejoignent ceux de Jules-Joffrin. La bonne référence est la vente la plus proche, pas la médiane de la rue.",
  ],
  'avenue-junot-18': [
    "Hôtels particuliers, ateliers d'artistes, villa Léandre : l'avenue Junot est l'adresse la plus prestigieuse de Montmartre, et un marché à part. Les surfaces y sont grandes pour la Butte, même pour un studio.",
    "Un appartement avec terrasse, jardin ou vue sur Paris n'a pas de vraie référence dans la médiane. Nous travaillons à partir des quelques ventes réellement comparables, et nous proposons si besoin une mise en vente confidentielle.",
  ],
  'rue-joseph-de-maistre-18': [
    "Rue qui longe le cimetière de Montmartre avant de rejoindre la rue Lamarck, la rue Joseph-de-Maistre est une adresse de familles, aux appartements plus grands que la moyenne de la Butte.",
    "Le côté cimetière est recherché pour son calme et ses vues dégagées, sans vis-à-vis. Certains acheteurs l'écartent par principe, d'autres le cherchent : bien cibler les visites fait gagner du temps et protège le prix.",
  ],
  'rue-paul-feval-18': [
    "Rue calme du versant nord de la Butte, la rue Paul-Féval offre des surfaces confortables, à l'écart des flux touristiques. Elle attire les acheteurs qui veulent vivre Montmartre au calme.",
    "La rue Gaston-Couté voisine se vend plus cher, les rues des Saules et Darwin un peu moins. Nous situons votre appartement entre ces références, après visite.",
  ],
  'rue-feutrier-18': [
    "Sur le versant est de la Butte, la rue Feutrier vend surtout des studios et des deux pièces, et quelques trois pièces recherchés. La proximité du Sacré-Cœur se paie, mais la rue reste plus abordable que le versant sud.",
    "Pour estimer, nous comparons avec les rues Muller, Paul-Albert et André-del-Sarte, toutes proches.",
  ],
  'rue-andre-del-sarte-18': [
    "Rue en pente sur le versant est de la Butte, la rue André-del-Sarte est une rue de premiers achats à proximité du Sacré-Cœur. Les deux pièces y dominent.",
    "L'étage et la vue font ici la différence. Nous comparons avec la rue Feutrier et la rue Charles-Nodier voisines, cette dernière se vendant nettement plus cher.",
  ],
  /* Clignancourt, Jules-Joffrin */
  'rue-du-mont-cenis-18': [
    "La rue du Mont-Cenis descend de la Butte jusqu'à la mairie du 18e, puis continue vers le nord. Une seule rue, plusieurs marchés, avec une majorité de deux pièces.",
    "La partie haute, sur la Butte, n'a rien à voir avec la partie basse, au-delà de la mairie : la première se compare à Montmartre, la seconde à Jules-Joffrin. Pour estimer, nous partons des ventes de votre portion de rue.",
  ],
  'rue-marcadet-18': [
    "La rue Marcadet traverse tout le 18e d'est en ouest. C'est l'une des rues les plus actives de l'arrondissement, avec de tout : studios, deux pièces, appartements familiaux.",
    "Comme pour la rue Lamarck, la médiane de la rue dit peu de chose. Autour de Jules-Joffrin et du Mont-Cenis, les prix montent ; vers Barbès ou Guy-Môquet, ils baissent nettement. Nous partons toujours de la portion de rue.",
  ],
  'rue-ordener-18': [
    "Grande rue du nord du 18e, la rue Ordener passe devant la mairie et la place Jules-Joffrin. C'est un marché de deux et trois pièces, à des prix qui attirent les familles venues de quartiers plus chers.",
    "La portion autour de la mairie est la plus recherchée, et les immeubles haussmanniens avec ascenseur se vendent au-dessus de la médiane. La bonne comparaison est la rue du Mont-Cenis voisine, un peu plus chère.",
  ],
  'rue-custine-18': [
    "La rue Custine relie Château-Rouge aux pentes de la Butte. C'est une rue familiale, où les trois pièces sont les plus vendus et où les deux pièces sont plus grands que dans la plupart des rues voisines.",
    "Les immeubles haussmanniens dominent, et plus on approche de la Butte, plus le prix s'élève. Pour une famille qui veut de la surface près de Montmartre, c'est une des adresses les plus intéressantes de l'arrondissement.",
  ],
  'rue-ramey-18': [
    "Rue animée et commerçante entre Clignancourt et la Butte, la rue Ramey vend surtout des deux pièces. Elle profite de sa position entre Montmartre et Jules-Joffrin.",
    "La partie proche du Sacré-Cœur est la plus recherchée. Nous comparons toujours avec la rue Custine et le passage Ramey, légèrement plus chers.",
  ],
  'rue-d-orsel-18': [
    "La rue d'Orsel relie le quartier d'Anvers à la place Charles-Dullin et au théâtre de l'Atelier, en passant à deux pas du marché Saint-Pierre et de notre bureau. Elle se vend au-dessus de la médiane du 18e : c'est déjà Montmartre, sans la pente.",
    "Les deux pièces font plus de la moitié des ventes. Côté place Charles-Dullin, la rue est plus calme ; côté Anvers, plus commerçante. Nous passons devant chaque jour : une estimation ici peut commencer par une visite le jour même.",
  ],
  'rue-livingstone-18': [
    "C'est la rue de notre bureau, au 2 rue Livingstone, au pied de la Butte, près du marché Saint-Pierre. Petite rue, peu de ventes, entourée d'adresses très différentes : la rue Charles-Nodier se vend nettement plus cher, la rue Pierre-Picard un peu moins.",
    "À quelques mètres près, le prix change. Nous voyons passer chaque jour les propriétaires du quartier : pousser la porte du bureau reste le moyen le plus simple de connaître la valeur de votre appartement.",
  ],
  /* Trudaine, Maubeuge */
  'avenue-trudaine-09': [
    "C'est l'avenue qui a donné son nom à notre agence. Terre-plein planté, lycée Jacques-Decour, square d'Anvers au bout : l'avenue Trudaine fonctionne comme une place de village pour tout le 9e nord. Les grands appartements y font une part importante des ventes, achetés par des familles qui s'installent pour longtemps.",
    "L'écart entre les ventes est large. Les étages nobles avec balcon filant et les immeubles en pierre de taille font les plus hauts prix ; un rez-de-chaussée ou un appartement sur cour sombre se vend loin de la médiane. C'est notre rue : nous connaissons ses immeubles un par un.",
  ],
  'rue-de-maubeuge-09': [
    "La rue de Maubeuge traverse le 9e en diagonale, de Notre-Dame-de-Lorette vers la gare du Nord. C'est une rue de grands appartements haussmanniens, recherchés par des familles et des cadres qui veulent les gares à pied.",
    "La rue est passante. Les étages élevés et les appartements traversants, avec une partie sur cour, se vendent au-dessus de la médiane ; les premiers étages sur rue demandent un prix ajusté. La distinction se fait à la visite, pas sur un tableau.",
  ],
  'rue-condorcet-09': [
    "Parallèle à l'avenue Trudaine, la rue Condorcet est plus étroite et plus calme. Son marché est très étalé, du studio au très grand appartement familial : peu de rues de nos secteurs offrent une telle amplitude.",
    "Les beaux immeubles en pierre de taille sont les plus recherchés. Pour un grand appartement, nous comparons avec l'avenue Trudaine et la rue de Maubeuge, pas avec la moyenne de la rue.",
  ],
  'rue-claude-rodier-09': [
    "Commerçante, animée, avec ses boutiques et ses cafés, la rue Rodier croise l'avenue Trudaine au cœur du 9e nord. C'est l'une des rues les plus actives du secteur, surtout en studios et en deux pièces ; les trois pièces partent vite auprès des couples qui s'agrandissent sans quitter le quartier.",
    "Les portions proches de l'avenue Trudaine sont les plus cotées. Un appartement sur cour, au calme, dans cette rue vivante, est exactement ce que cherchent nos acheteurs.",
  ],
  'rue-lentonnet-09': [
    "Petite rue tranquille près du square d'Anvers, la rue Lentonnet compte parmi les adresses les plus chères du 9e nord. Peu de ventes, mais surtout de grands appartements, dans des immeubles bourgeois sans commerce.",
    "Le calme se paie : la rue Pétrelle voisine se vend nettement moins cher. Pour ces biens familiaux, une mise en vente confidentielle auprès des acheteurs qualifiés de notre fichier est souvent la bonne option.",
  ],
  'rue-turgot-09': [
    "Courte rue près de l'avenue Trudaine, la rue Turgot vend surtout des studios. C'est une rue d'investisseurs et de premiers achats, à l'adresse très recherchée.",
    "Être à deux pas de l'avenue Trudaine sans en payer tout le prix : c'est l'argument principal pour un acheteur. Pour un vendeur, la référence est la rue Condorcet voisine, un peu plus chère, dont un studio bien rénové peut s'approcher.",
  ],
  'rue-lallier-09': [
    "Petite rue résidentielle près du square d'Anvers, la rue Lallier vend presque uniquement des trois pièces et des grands appartements, qui se ressemblent. C'est une adresse de familles, au calme, à quelques minutes de l'avenue Trudaine.",
    "Avec peu de ventes, nous complétons par la rue Alfred-Stevens, la rue Cretet et la villa Dancourt voisines.",
  ],
  /* Martyrs, Lorette, Saint-Georges */
  'rue-des-martyrs-09': [
    "Fromagers, boulangers, primeurs, cavistes : la rue des Martyrs concentre des commerces de bouche comme peu de rues à Paris. Côté 9e, toutes les tailles s'y vendent, du studio au grand appartement familial.",
    "Le boulevard marque une vraie frontière : côté 18e, au-dessus, la rue se vend nettement moins cher. Dans le 9e, le calme d'un appartement sur cour, au-dessus de la rue la plus vivante du quartier, est ce qui se vend le mieux.",
  ],
  'rue-notre-dame-de-lorette-09': [
    "De l'église au carrefour Saint-Georges, la rue Notre-Dame-de-Lorette monte en pente douce vers Pigalle. Son marché est très partagé entre petits studios et grands appartements familiaux, dans les immeubles Restauration de la Nouvelle Athènes.",
    "La rue est passante, desservie par le métro et plusieurs bus. Les étages élevés et les appartements avec une partie sur cour se vendent nettement mieux que les premiers étages sur rue. Nous l'expliquons au vendeur, ventes à l'appui, avant la mise en vente.",
  ],
  'rue-henry-monnier-09': [
    "Rue calme qui monte de la rue Notre-Dame-de-Lorette vers la rue Victor-Massé, la rue Henry-Monnier vend surtout des studios et des deux pièces, entre petits immeubles anciens et immeubles bourgeois.",
    "Peu passante, à deux pas de la rue des Martyrs, elle offre ce que nos acheteurs cherchent : la vie de quartier sans le bruit. Une estimation à la médiane s'y trompe souvent, dans un sens ou dans l'autre ; la visite fait la différence.",
  ],
  'rue-saint-georges-09': [
    "La rue Saint-Georges mène à la place du même nom, l'une des plus élégantes de Paris, avec l'hôtel Dosne-Thiers. Les immeubles Restauration et Second Empire y offrent des hauteurs sous plafond généreuses, et les grands appartements y sont nombreux.",
    "La partie proche de la place se vend au-dessus de la médiane ; vers la rue de Châteaudun, plus passante, le prix baisse. Pour un grand appartement, la bonne comparaison est la place Saint-Georges et la rue de La Rochefoucauld.",
  ],
  'rue-de-la-rochefoucauld-09': [
    "Au cœur de la Nouvelle Athènes, la rue de La Rochefoucauld abrite le musée Gustave-Moreau. C'est une rue de grands appartements, où les hauteurs sous plafond et les volumes sont recherchés.",
    "Pour ces biens familiaux, la bonne comparaison est la rue La Bruyère et la place Saint-Georges. Nous les présentons d'abord aux acheteurs de notre fichier qui cherchent ce type de volume.",
  ],
  /* Clichy, Trinité, Nouvelle Athènes */
  'rue-blanche-09': [
    "La rue Blanche monte de la Trinité à la place Blanche. C'est une rue de grands appartements haussmanniens, avec de beaux étages nobles, et des deux pièces plus spacieux qu'ailleurs.",
    "Le bas de rue, près de la Trinité, est le plus recherché ; le haut, vers la place Blanche, est plus animé le soir. Pour un grand appartement familial, nous comparons avec la rue La Bruyère et la rue de Clichy.",
  ],
  'rue-pierre-fontaine-09': [
    "Parallèle à la rue Blanche, la rue Fontaine monte vers la place Blanche par le quartier des théâtres. C'est la rue la plus active de Clichy Trinité, du studio au grand appartement.",
    "Le bas de rue, côté Trinité et Saint-Lazare, attire des cadres et des familles ; le haut, plus animé, plaît aux jeunes actifs et aux investisseurs. Pour estimer, le numéro exact compte plus que la médiane.",
  ],
  'rue-de-clichy-09': [
    "Grande artère entre Saint-Lazare et la place de Clichy, la rue de Clichy est bordée d'immeubles haussmanniens et du Casino de Paris. C'est une rue de contrastes, entre petits studios et très grands appartements.",
    "La rue est bruyante. Un grand appartement en étage élevé, bien isolé ou ouvert sur cour, se vend au niveau des rues calmes de la Nouvelle Athènes ; un premier étage sur rue, non. C'est ce que nous vérifions en visite, fenêtres ouvertes.",
  ],
  'rue-la-bruyere-09': [
    "Au cœur de la Nouvelle Athènes, la rue La Bruyère est résidentielle et calme. Les grands appartements y sont nombreux, dans une architecture d'hôtels particuliers, d'ateliers d'artistes et d'immeubles Restauration que nos acheteurs reconnaissent.",
    "Pour ces biens, la bonne référence est la rue de La Rochefoucauld et la place Saint-Georges, plus que les grands axes voisins.",
  ],
  'rue-du-cardinal-mercier-09': [
    "Petite rue proche de la place de Clichy, la rue du Cardinal-Mercier est une rue calme à deux pas d'un des carrefours les plus animés de Paris. Son marché est très contrasté, du petit studio au grand appartement.",
    "Elle se vend au niveau du square Moncey voisin, et nettement au-dessus de la rue de Clichy.",
  ],
  /* Batignolles, Legendre */
  'rue-legendre-17': [
    "La rue Legendre traverse le 17e d'ouest en est, de la plaine Monceau aux Épinettes, en passant par les Batignolles. C'est l'une des rues les plus actives de nos secteurs, surtout en deux et trois pièces, achetés par des couples et de jeunes familles.",
    "La rue Legendre n'a pas un prix, elle en a trois. Côté Villiers, elle se vend au-dessus de la médiane ; au cœur des Batignolles, elle s'y situe ; vers la Fourche et Guy-Môquet, elle baisse. Nous estimons à partir des ventes de votre portion de rue.",
  ],
  'rue-nollet-17': [
    "La rue Nollet traverse les Batignolles vers le quartier Brochant. Son marché est actif sur toutes les tailles, du studio au grand appartement familial.",
    "La partie centrale, entre la rue des Dames et la rue Lemercier, est la plus recherchée par les familles du village ; vers l'avenue de Clichy, le prix baisse avec le bruit. L'ascenseur fait ici une différence nette, car beaucoup d'immeubles faubouriens en sont dépourvus.",
  ],
  'rue-lemercier-17': [
    "La rue Lemercier abrite le marché couvert des Batignolles. Vie de quartier, commerces, écoles : c'est l'une des rues les plus demandées par les familles, où les deux pièces font une grande part des ventes.",
    "La portion autour du marché couvert est la plus recherchée. Un appartement familial avec ascenseur y trouve preneur rapidement : c'est le type de bien que nos acheteurs familiaux demandent le plus aux Batignolles.",
  ],
  'rue-des-dames-17': [
    "Bars, restaurants, petits commerces : la rue des Dames est la rue animée des Batignolles, jusqu'à l'avenue de Clichy. On y vend toutes les tailles, du studio aux rares grands appartements.",
    "La rue Mariotte voisine se vend nettement plus cher, la rue Truffaut au même niveau. La rue des Dames est vivante le soir : les appartements sur cour ou en étage élevé se vendent nettement mieux. C'est le premier point que nous regardons en visite.",
  ],
  'rue-truffaut-17': [
    "Rue résidentielle au cœur du village des Batignolles, la rue Truffaut a un marché équilibré, du studio à l'appartement familial.",
    "Les rues Lamande et Bridaine voisines se vendent un peu plus cher. L'écart tient souvent à l'immeuble plus qu'à l'adresse : un appartement rénové avec ascenseur, rue Truffaut, peut s'aligner sur ses voisines.",
  ],
  'rue-des-batignolles-17': [
    "La rue qui a donné son nom au quartier mène du boulevard à l'église Sainte-Marie. Ses deux pièces y sont parmi les plus chers du quartier.",
    "La partie proche de la place, avec ses commerces et ses terrasses, est la plus recherchée. La rue Mariotte voisine, beaucoup plus chère, montre ce que vaut le calme dans ce secteur animé.",
  ],
  'rue-dulong-17': [
    "Rue longue et commerçante qui traverse les Batignolles, la rue Dulong vend surtout des studios et des deux pièces. C'est une rue de jeunes actifs et de premiers achats, à deux pas du marché et des écoles.",
    "Pour estimer, nous comparons avec la rue de Rome et la rue Claude-Pouillet, au même niveau de prix.",
  ],
  'rue-la-condamine-17': [
    "Rue animée entre l'avenue de Clichy et le cœur des Batignolles, la rue La Condamine compte plus de grands appartements que ses voisines.",
    "Elle change de visage d'un bout à l'autre : côté avenue de Clichy, le prix baisse ; vers la rue des Batignolles et la rue Nollet, il remonte. Le numéro exact compte plus que la médiane.",
  ],
  'rue-brochant-17': [
    "Rue qui longe le square des Batignolles, la rue Brochant se vend au-dessus de la médiane du 17e. Le square et sa verdure se paient, et les trois pièces partent vite auprès des familles.",
    "L'écart avec l'avenue de Clichy toute proche, nettement moins chère, est l'un des plus marqués du quartier. Un appartement avec vue sur le square se vend au-dessus de la médiane de la rue.",
  ],
  'rue-des-moines-17': [
    "Rue commerçante qui relie les Batignolles à Guy-Môquet, la rue des Moines est surtout une rue de deux pièces.",
    "La partie proche du marché couvert et de la rue Lemercier se vend mieux que la partie nord. Pour un acheteur, c'est une porte d'entrée dans le quartier à un prix plus accessible.",
  ],
  'boulevard-des-batignolles-17': [
    "Le boulevard des Batignolles marque la limite entre le 17e et le 8e. Côté 17e, c'est l'adresse des grands appartements haussmanniens, qui font une large part des ventes.",
    "Le boulevard est passant. Les étages élevés, les appartements traversants et ceux qui s'ouvrent aussi sur cour font les plus hauts prix ; un premier étage sur boulevard se vend nettement en dessous.",
  ],
  'rue-mariotte-17': [
    "Petite rue calme au cœur des Batignolles, la rue Mariotte est la plus chère du quartier, surtout en appartements familiaux de trois et quatre pièces.",
    "L'écart avec les rues voisines est spectaculaire, et il tient au calme et à la qualité des immeubles. Avec peu de ventes, nous vérifions chaque référence une par une avant de proposer un prix.",
  ],
  'rue-boursault-17': [
    "Rue résidentielle entre la rue de Rome et la rue des Batignolles, la rue Boursault offre des deux pièces généreux.",
    "Côté rue de Rome, certains immeubles sont exposés au bruit des voies ferrées ; côté Batignolles, la rue est plus calme et se vend mieux. Nous le vérifions à la visite, fenêtres ouvertes.",
  ],
  'rue-lebouteux-17': [
    "Petite rue proche de la rue de Lévis, la rue Lebouteux vend surtout des studios et des deux pièces, avec des deux pièces spacieux pour le secteur.",
    "La proximité du marché de la rue de Lévis attire les acheteurs. Pour estimer, nous comparons avec la rue de Lévis et la rue Claude-Pouillet, au même niveau de prix.",
  ],
  'rue-bridaine-17': [
    "Rue courte et calme du village des Batignolles, la rue Bridaine est une rue de couples et de jeunes familles. Elle se vend un peu au-dessus de ses voisines Truffaut et des Batignolles, et le calme explique l'essentiel de l'écart.",
    "Les studios y sont très petits : une estimation au mètre carré doit alors tenir compte de la surface réellement utile.",
  ],
  'place-du-dr-f-lobligeois-17': [
    "Face à l'église Sainte-Marie des Batignolles, cette place est le cœur du village. Son marché est varié, du studio au grand appartement.",
    "Les étages avec vue sur l'église et la place font les plus hauts prix. Avec peu de ventes, nous complétons toujours avec les rues Lamande, Bridaine et Truffaut voisines.",
  ],
};

/** Mois de rédaction des regards, affiché sous le texte. */
export const dateRegards = 'octobre 2026';
