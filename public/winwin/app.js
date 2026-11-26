/* Trudaines WinWin : application des prescripteurs. Aucun contenu n'est injecté en HTML : tout passe par des noeuds texte. */
(() => {
  'use strict';

  const RACINE = location.pathname.startsWith('/winwin') ? '/winwin/' : '/';
  const ADRESSE = location.origin + RACINE;
  const racine = document.getElementById('app');
  const etat = { user: null, config: null };
  const debut = Date.now();

  /* ------------------------------------------------------------ Outils */

  function h(balise, attributs, ...enfants) {
    const noeud = document.createElement(balise);
    for (const [cle, valeur] of Object.entries(attributs || {})) {
      if (valeur === false || valeur == null) continue;
      if (cle === 'class') noeud.className = valeur;
      else if (cle.startsWith('on')) noeud.addEventListener(cle.slice(2), valeur);
      else if (cle === 'value') noeud.value = valeur;
      else if (cle === 'checked') noeud.checked = Boolean(valeur);
      else noeud.setAttribute(cle, valeur === true ? '' : valeur);
    }
    for (const enfant of enfants.flat(Infinity)) {
      if (enfant === false || enfant == null || enfant === '') continue;
      noeud.append(enfant instanceof Node ? enfant : document.createTextNode(String(enfant)));
    }
    return noeud;
  }

  async function api(chemin, corps) {
    const reponse = await fetch(`/api/winwin/${chemin}`, {
      method: corps ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: corps ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: corps ? JSON.stringify(corps) : undefined,
    }).catch(() => null);
    if (!reponse) return { ok: false, message: 'Connexion impossible. Vérifiez votre réseau et réessayez.' };
    const donnees = await reponse.json().catch(() => ({ ok: false, message: 'Réponse illisible. Réessayez dans un instant.' }));
    donnees.statut = reponse.status;
    return donnees;
  }

  const euros = (n) => (n == null ? 'À préciser' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
  const jour = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const jourHeure = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '');
  const aller = (route) => { if (location.hash === `#${route}`) rendre(); else location.hash = route; };
  const libelleStatut = (s) => (etat.config.statuts.find(([v]) => v === s) || [s, s])[1];
  const ETAPES = () => etat.config.statuts.filter(([s]) => s !== 'perdu');
  const rang = (s) => ETAPES().findIndex(([v]) => v === s);

  function toast(message) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div', { class: 'toast', role: 'status' }, message);
    document.body.append(t);
    setTimeout(() => t.remove(), 4200);
  }

  function memoire(cle, valeur) {
    try {
      if (valeur === undefined) return localStorage.getItem(cle) || '';
      localStorage.setItem(cle, valeur);
    } catch { /* stockage indisponible */ }
    return valeur || '';
  }

  /* Honoraires TTC d'une vente en mandat exclusif, d'après le barème transmis par le serveur. */
  function primeVente(prix) {
    const b = etat.config.bareme;
    const tranche = b.vente.find(([plafond]) => plafond === null || prix <= plafond);
    const ttc = Math.max(prix * tranche[1], b.minimumVente);
    return Math.round((ttc / (1 + b.tva)) * etat.config.part);
  }
  function primeEstimee(type, valeur, loyer) {
    const b = etat.config.bareme;
    if (type === 'gestion') return loyer ? Math.round(((loyer * 12 * b.gestion) / (1 + b.tva)) * etat.config.part) : null;
    if (!valeur) return null;
    if (type === 'achat') {
      const tranche = b.achat.find(([plafond]) => plafond === null || valeur <= plafond);
      return tranche[1] === null ? null : Math.round(((valeur * tranche[1]) / (1 + b.tva)) * etat.config.part);
    }
    return primeVente(valeur);
  }

  /* ------------------------------------------------------------ Gabarit */

  function entete(courant) {
    const u = etat.user;
    const lien = (route, texte, classe) => h('a', { href: `#${route}`, class: classe, 'aria-current': courant === route ? 'page' : null }, texte);
    return h('header', { class: 'entete' }, h('div', { class: 'page' },
      h('a', { class: 'marque', href: u ? '#/espace' : '#/' }, 'TRUD', h('span', null, 'AI'), 'NES', h('small', null, 'WINWIN')),
      h('nav', { class: 'nav', 'aria-label': 'Navigation' },
        u ? [
          lien('/espace', 'Mon espace'),
          lien('/inviter', 'Inviter'),
          u.role === 'admin' && lien('/admin', 'Back-office'),
          h('button', { type: 'button', class: 'long', onclick: deconnexion }, 'Quitter'),
        ] : [lien('/connexion', 'Se connecter')],
      )));
  }

  function pied() {
    return h('footer', { class: 'pied' }, h('div', { class: 'page pile' },
      h('p', null, 'Trudaines Immobilier, 2 rue Livingstone, 75018 Paris. 06 20 46 59 12. Carte professionnelle CPI 9201 2024 000 000 114.'),
      h('p', null, 'Recommandation occasionnelle, rémunérée après encaissement des honoraires par l\'agence. ',
        h('a', { href: '#/conditions' }, 'Conditions du programme'), ' · ', h('a', { href: 'https://www.trudaines.com' }, 'trudaines.com'))));
  }

  function afficher(courant, ...contenu) {
    racine.replaceChildren(entete(courant), h('main', null, contenu), pied());
    window.scrollTo(0, 0);
  }

  async function deconnexion() {
    await api('deconnexion', {});
    etat.user = null;
    aller('/');
  }

  /* ------------------------------------------------------------ Accueil public */

  function simulateur() {
    const prime = h('p', { class: 'chiffre' });
    const prix = h('p', { class: 'petit doux' });
    const curseur = h('input', { type: 'range', min: '200000', max: '3000000', step: '25000', value: '650000', 'aria-label': 'Prix de vente du bien' });
    const maj = () => { const v = Number(curseur.value); prix.textContent = `Bien vendu ${euros(v)}`; prime.textContent = euros(primeVente(v)); };
    curseur.addEventListener('input', maj);
    maj();
    return h('div', { class: 'cadre simulateur pile' },
      h('p', { class: 'sur' }, 'Votre prime, en un geste'),
      prix, curseur,
      h('div', { class: 'resultat' }, h('p', { class: 'sur' }, 'Pour vous'), prime,
        h('p', { class: 'mini doux' }, `${Math.round(etat.config.part * 100)} % de nos honoraires hors taxes, au barème du mandat exclusif. Versés après la signature chez le notaire.`)));
  }

  async function accueil() {
    if (etat.user) return aller('/espace');
    const code = memoire('ww_parrain');
    const invitation = h('p', { class: 'bandeau', hidden: true });
    if (code) api(`parrain?code=${encodeURIComponent(code)}`).then((r) => { if (r.prenom) { invitation.textContent = `${r.prenom} vous invite à rejoindre son cercle.`; invitation.hidden = false; } });
    const part = Math.round(etat.config.part * 100);
    const etapes = [
      ['Vous présentez', 'Un proche, un client ou un voisin vend, achète ou veut faire gérer un bien à Paris. Son prénom et son numéro suffisent, avec son accord. Deux minutes.'],
      ['Samy s\'en occupe', 'Il appelle votre contact sous 24 heures, de votre part. Vous suivez chaque étape depuis votre espace : rendez-vous, mandat, compromis, acte.'],
      ['Vous êtes rémunéré', `Si l'affaire se conclut, ${part} % de nos honoraires hors taxes vous reviennent, versés après la signature chez le notaire.`],
    ];
    afficher('/',
      h('div', { class: 'page' },
        h('section', { class: 'hero' },
          h('div', { class: 'pile-l' },
            h('div', { class: 'pile' }, invitation, h('p', { class: 'sur' }, 'La recommandation récompensée'),
              h('h1', null, 'Vous connaissez quelqu\'un qui vend à Paris ?'),
              h('p', { class: 'accroche' }, `Présentez-le à Trudaines. Si la vente se fait, ${part} % de nos honoraires sont pour vous.`)),
            h('div', { class: 'rang' }, h('a', { class: 'btn or', href: '#/inscription' }, 'Créer mon espace'), h('a', { class: 'btn clair', href: '#/connexion' }, 'J\'ai déjà un espace')),
            h('p', { class: 'petit doux' }, 'Gratuit, sans engagement, sans exclusivité. Deux minutes pour s\'inscrire, aucun mot de passe.')),
          simulateur()),
        h('section', { class: 'section pile-l' },
          h('h2', null, 'Comment cela se passe'),
          h('div', { class: 'grille3' }, etapes.map(([titre, texte], i) => h('div', { class: 'pile' }, h('p', { class: 'numero' }, String(i + 1)), h('h3', null, titre), h('p', { class: 'petit doux' }, texte))))),
        h('section', { class: 'section grille2' },
          h('div', { class: 'pile' }, h('h2', null, 'Pour qui'),
            h('p', { class: 'petit doux' }, 'Pour celles et ceux qui entendent parler d\'un projet immobilier avant tout le monde, et qui veulent confier leur contact à quelqu\'un de sûr.'),
            h('p', { class: 'metiers' }, ['Courtiers', 'Notaires', 'Diagnostiqueurs', 'Anciens clients', 'Gardiens', 'Commerçants', 'Syndics'].map((m) => h('span', null, m)))),
          h('div', { class: 'pile' }, h('h2', null, 'Ce que vous voyez'),
            h('p', { class: 'petit doux' }, 'L\'avancement de chaque recommandation, étape par étape. Votre prime : estimée au dépôt, précisée au mandat, versée après l\'acte. Et votre lien personnel pour inviter votre entourage : '
              + `${Math.round(etat.config.partParrain * 100)} % de nos honoraires vous reviennent aussi sur les affaires qu'il apporte.`))),
        h('section', { class: 'section pile-l centre' }, h('h2', null, 'Un nom vous vient en tête ?'),
          h('div', null, h('a', { class: 'btn', href: '#/inscription' }, 'Créer mon espace')))));
  }

  /* ------------------------------------------------------------ Inscription et connexion */

  function champ(libelle, attributs, facultatif) {
    const entree = h(attributs.rows ? 'textarea' : 'input', { type: 'text', ...attributs });
    const bloc = h('div', { class: 'champ' }, h('label', { for: attributs.id }, libelle, facultatif && h('span', { class: 'facultatif' }, ' (facultatif)')), entree);
    bloc.entree = entree;
    return bloc;
  }

  function pastilles(options, valeur, auChangement) {
    const boutons = options.map(([v, libelle]) => h('button', { type: 'button', 'aria-pressed': String(v === valeur), onclick: () => {
      boutons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      bloc.valeur = v; bouton(v).setAttribute('aria-pressed', 'true');
      if (auChangement) auChangement(v);
    } }, libelle));
    const bouton = (v) => boutons[options.findIndex(([o]) => o === v)];
    const bloc = h('div', { class: 'choix', role: 'group' }, boutons);
    bloc.valeur = valeur;
    return bloc;
  }

  function inscription() {
    if (etat.user) return aller('/espace');
    const prenom = champ('Prénom', { id: 'prenom', autocomplete: 'given-name', required: true });
    const nom = champ('Nom', { id: 'nom', autocomplete: 'family-name', required: true });
    const telephone = champ('Téléphone mobile', { id: 'telephone', type: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true });
    const email = champ('Email', { id: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', required: true });
    const metier = pastilles(etat.config.metiers.map((m) => [m, m]), '');
    const cgu = h('input', { type: 'checkbox', id: 'cgu' });
    const piege = h('input', { type: 'text', name: 'controle', tabindex: '-1', autocomplete: 'off' });
    const message = h('p', { class: 'erreur', hidden: true, role: 'alert' });
    const envoyer = h('button', { class: 'btn or plein', type: 'submit' }, 'Créer mon espace');
    const formulaire = h('form', { class: 'pile-l', novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      message.hidden = true; envoyer.disabled = true;
      const r = await api('inscription', {
        prenom: prenom.entree.value, nom: nom.entree.value, telephone: telephone.entree.value, email: email.entree.value,
        metier: metier.valeur || 'Autre', cgu: cgu.checked, parrain: memoire('ww_parrain'), controle: piege.value, duree: Date.now() - debut,
      });
      envoyer.disabled = false;
      if (!r.ok) { message.textContent = r.message; message.hidden = false; return; }
      if (r.lien) return afficher('/inscription', h('div', { class: 'page etroit section pile' }, h('h2', null, 'Vérifiez vos emails'),
        h('p', null, `Un lien de connexion vient de partir vers ${email.entree.value}. Ouvrez-le pour entrer dans votre espace.`)));
      etat.user = r.user;
      toast('Votre espace est ouvert. Bienvenue.');
      aller('/recommander');
    } },
      h('div', null, h('div', { class: 'deux' }, prenom, nom), telephone, email),
      h('div', null, h('label', null, 'Vous êtes'), metier),
      h('label', { class: 'case', for: 'cgu' }, cgu, h('span', null, 'J\'accepte les ', h('a', { href: '#/conditions', target: '_blank' }, 'conditions du programme'), ' et d\'être contacté par Trudaines au sujet de mes recommandations.')),
      h('div', { class: 'piege', 'aria-hidden': 'true' }, piege),
      message, envoyer,
      h('p', { class: 'petit doux centre' }, 'Aucun mot de passe : vous restez connecté sur cet appareil.'));
    afficher('/inscription', h('div', { class: 'page etroit section pile-l' },
      h('div', { class: 'pile' }, h('p', { class: 'sur' }, 'Deux minutes'), h('h2', null, 'Créer mon espace WinWin')), formulaire,
      h('p', { class: 'petit centre' }, h('a', { href: '#/connexion' }, 'J\'ai déjà un espace'))));
    prenom.entree.focus();
  }

  function connexion() {
    if (etat.user) return aller('/espace');
    const email = champ('Votre email', { id: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', required: true });
    const message = h('p', { class: 'erreur', hidden: true, role: 'alert' });
    const envoyer = h('button', { class: 'btn plein', type: 'submit' }, 'Recevoir mon lien de connexion');
    const bloc = h('form', { class: 'pile-l', novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      message.hidden = true; envoyer.disabled = true;
      const r = await api('connexion', { email: email.entree.value });
      envoyer.disabled = false;
      if (!r.ok) { message.textContent = r.message; message.hidden = false; return; }
      bloc.replaceChildren(h('div', { class: 'succes pile' }, h('p', null, `Si un espace existe pour ${email.entree.value}, un lien vient de partir. Ouvrez-le sur cet appareil : il est valable 45 minutes.`),
        h('p', { class: 'petit' }, 'Rien reçu ? Regardez dans les indésirables, ou appelez-nous au 06 20 46 59 12.')));
    } }, email, message, envoyer);
    afficher('/connexion', h('div', { class: 'page etroit section pile-l' },
      h('div', { class: 'pile' }, h('h2', null, 'Retrouver mon espace'), h('p', { class: 'doux' }, 'Pas de mot de passe à retenir : nous vous envoyons un lien par email.')),
      bloc, h('p', { class: 'petit centre' }, 'Pas encore inscrit ? ', h('a', { href: '#/inscription' }, 'Créer mon espace'))));
    email.entree.focus();
  }

  async function jeton(valeur) {
    afficher('', h('p', { class: 'chargement' }, 'Connexion en cours'));
    const r = await api('jeton', { jeton: valeur });
    if (!r.ok) return afficher('/connexion', h('div', { class: 'page etroit section pile' }, h('h2', null, 'Ce lien ne fonctionne plus'), h('p', null, r.message), h('div', null, h('a', { class: 'btn', href: '#/connexion' }, 'Recevoir un nouveau lien'))));
    await charger();
    aller(etat.user && etat.user.role === 'admin' ? '/admin' : '/espace');
  }

  /* ------------------------------------------------------------ Espace du prescripteur */

  function frise(reco) {
    if (reco.statut === 'perdu') return h('p', { class: 'petit doux' }, 'Ce projet ne s\'est pas fait cette fois. Merci de nous l\'avoir présenté.');
    const etapes = ETAPES();
    const ici = rang(reco.statut);
    const suivante = etapes[ici + 1];
    return h('div', null,
      h('div', { class: 'frise', role: 'img', 'aria-label': `Étape ${ici + 1} sur ${etapes.length} : ${libelleStatut(reco.statut)}` }, etapes.map((_, i) => h('i', { class: i < ici ? 'fait' : i === ici ? 'ici' : '' }))),
      h('p', { class: 'petit' }, h('strong', null, libelleStatut(reco.statut)), reco.statut === 'rdv_estimation' && reco.date_rdv ? `, ${jourHeure(reco.date_rdv)}` : '',
        suivante ? h('span', { class: 'doux' }, ` · Prochaine étape : ${suivante[1].toLowerCase()}`) : ''));
  }

  function libellePrime(reco) {
    if (reco.statut === 'prescripteur_paye') return 'Prime versée';
    if (reco.prix) return 'Prime prévue';
    return 'Prime estimée';
  }

  function carteReco(reco) {
    return h('article', { class: 'dossier' },
      h('div', { class: 'tete' },
        h('div', null, h('h3', null, `${reco.contact_prenom} ${reco.contact_nom}`.trim()), h('p', { class: 'mini doux' }, `${etat.config.types[reco.type] || reco.type}${reco.lieu ? ` · ${reco.lieu}` : ''} · présenté le ${jour(reco.cree_le)}`)),
        reco.statut !== 'perdu' && h('div', { class: 'droite' }, h('p', { class: 'sur' }, libellePrime(reco)), h('p', { class: 'chiffre', style: null }, euros(reco.prime)))),
      frise(reco),
      reco.message && h('p', { class: 'succes', style: null }, `Message de Samy : ${reco.message}`));
  }

  function blocInvitation(compact) {
    const lien = `${ADRESSE}?p=${etat.user.code}`;
    const part = Math.round(etat.config.part * 100), cercle = Math.round(etat.config.partParrain * 100);
    const texte = `Je confie mes contacts qui vendent ou achètent à Paris à Samy, de l'agence Trudaines. Si l'affaire se fait, ${part} % de ses honoraires me reviennent. Tu peux faire pareil, l'inscription prend deux minutes : ${lien}`;
    const zone = h('input', { type: 'text', readonly: true, value: lien, 'aria-label': 'Votre lien personnel', onclick: (e) => e.target.select() });
    const copier = async () => {
      try { await navigator.clipboard.writeText(lien); } catch { zone.select(); document.execCommand('copy'); }
      toast('Lien copié. Collez-le où vous voulez.');
    };
    const partager = navigator.share ? h('button', { class: 'btn fin', type: 'button', onclick: () => navigator.share({ title: 'Trudaines WinWin', text: texte }).catch(() => null) }, 'Partager') : null;
    return h('div', { class: 'cadre accent pile' },
      h('p', { class: 'sur' }, 'Votre cercle'),
      h('h3', null, compact ? 'Invitez votre entourage' : 'Faites entrer votre entourage dans WinWin'),
      h('p', { class: 'petit doux' }, `Chaque personne inscrite avec votre lien entre dans votre cercle. Sur chaque affaire qu'elle apporte, ${cercle} % de nos honoraires hors taxes vous reviennent, sans rien retirer à sa propre prime.`),
      h('div', { class: 'lien-perso' }, zone, h('button', { type: 'button', onclick: copier }, 'Copier')),
      h('div', { class: 'partage' },
        h('a', { class: 'btn fin clair', href: `https://wa.me/?text=${encodeURIComponent(texte)}`, target: '_blank', rel: 'noopener' }, 'WhatsApp'),
        h('a', { class: 'btn fin clair', href: `sms:?&body=${encodeURIComponent(texte)}` }, 'SMS'),
        h('a', { class: 'btn fin clair', href: `mailto:?subject=${encodeURIComponent('Trudaines WinWin, la recommandation récompensée')}&body=${encodeURIComponent(texte)}` }, 'Email'),
        partager));
  }

  async function espace() {
    const r = await api('espace');
    if (!r.ok) return r.statut === 401 ? sessionPerdue() : afficher('/espace', h('div', { class: 'page section' }, h('p', { class: 'erreur' }, r.message)));
    const actives = r.recos.filter((x) => !['perdu', 'prescripteur_paye'].includes(x.statut));
    const verse = r.recos.filter((x) => x.statut === 'prescripteur_paye').reduce((s, x) => s + (x.prime || 0), 0) + r.cercle.verse;
    const enCours = actives.reduce((s, x) => s + (x.prime || 0), 0) + r.cercle.enCours;
    afficher('/espace', h('div', { class: 'page section pile-l', style: null },
      h('div', { class: 'tete pile' }, h('p', { class: 'sur' }, 'Mon espace'), h('h2', null, `Bonjour ${etat.user.prenom}`)),
      h('div', { class: 'compteurs' },
        h('div', null, h('p', { class: 'sur' }, 'Primes en cours'), h('p', { class: 'chiffre' }, euros(enCours)), h('p', { class: 'mini doux' }, `${actives.length} recommandation${actives.length > 1 ? 's' : ''} en cours`)),
        h('div', null, h('p', { class: 'sur' }, 'Déjà versé'), h('p', { class: 'chiffre' }, euros(verse)), h('p', { class: 'mini doux' }, 'Après signature chez le notaire')),
        h('div', null, h('p', { class: 'sur' }, 'Mon cercle'), h('p', { class: 'chiffre' }, String(r.filleuls.length)), h('p', { class: 'mini doux' }, r.filleuls.length ? r.filleuls.map((f) => f.prenom).slice(0, 4).join(', ') : 'Personne encore. Invitez votre entourage.'))),
      h('div', { class: 'fixe-mobile' }, h('a', { class: 'btn or plein', href: '#/recommander' }, 'Recommander quelqu\'un')),
      h('section', { class: 'pile' }, h('h3', null, 'Mes recommandations'),
        r.recos.length ? r.recos.map(carteReco) : h('div', { class: 'cadre papier pile' },
          h('p', null, 'Vous n\'avez encore présenté personne.'),
          h('p', { class: 'petit doux' }, 'Pensez à celles et ceux qui vous ont parlé d\'un déménagement, d\'une succession, d\'une séparation, d\'un départ à la retraite ou d\'un appartement devenu trop petit. Un prénom et un numéro suffisent.'))),
      blocInvitation(true)));
  }

  function sessionPerdue() { etat.user = null; aller('/connexion'); }

  function recommander() {
    const types = Object.entries(etat.config.types).filter(([v]) => v !== 'autre').map(([v, l]) => [v, v === 'vente' ? 'Vendre' : v === 'achat' ? 'Acheter' : 'Faire gérer son bien']);
    const apercu = h('p', { class: 'succes', hidden: true });
    const valeur = champ('Valeur approximative du bien', { id: 'valeur', inputmode: 'numeric', placeholder: 'Par exemple 650 000' }, true);
    const loyer = champ('Loyer mensuel envisagé', { id: 'loyer', inputmode: 'numeric', placeholder: 'Par exemple 1 800' }, true);
    const lire = (c) => Number(c.entree.value.replace(/[^\d]/g, '')) || 0;
    const majApercu = () => {
      const p = primeEstimee(type.valeur, lire(valeur), lire(loyer));
      apercu.hidden = !p;
      if (p) apercu.textContent = `Si l'affaire se conclut, votre prime est estimée à ${euros(p)}.`;
    };
    const type = pastilles(types, 'vente', (v) => { loyer.hidden = v !== 'gestion'; valeur.hidden = v === 'gestion'; majApercu(); });
    loyer.hidden = true;
    valeur.entree.addEventListener('input', majApercu);
    loyer.entree.addEventListener('input', majApercu);
    const prenom = champ('Prénom de votre contact', { id: 'cprenom', required: true });
    const nom = champ('Nom', { id: 'cnom' }, true);
    const telephone = champ('Son téléphone', { id: 'ctel', type: 'tel', inputmode: 'tel', required: true });
    const lieu = champ('Adresse ou quartier du bien', { id: 'lieu', placeholder: 'Par exemple rue des Martyrs, Paris 9e' }, true);
    const commentaire = champ('Ce qu\'il faut savoir', { id: 'commentaire', rows: '3', placeholder: 'Son projet, le bon moment pour l\'appeler...' }, true);
    const accord = h('input', { type: 'checkbox', id: 'accord' });
    const message = h('p', { class: 'erreur', hidden: true, role: 'alert' });
    const envoyer = h('button', { class: 'btn or plein', type: 'submit' }, 'Envoyer ma recommandation');
    const formulaire = h('form', { class: 'pile-l', novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      message.hidden = true; envoyer.disabled = true;
      const r = await api('recos', {
        type: type.valeur, contact_prenom: prenom.entree.value, contact_nom: nom.entree.value, contact_telephone: telephone.entree.value,
        lieu: lieu.entree.value, commentaire: commentaire.entree.value, valeur: lire(valeur) || null, loyer: lire(loyer) || null, accord: accord.checked,
      });
      envoyer.disabled = false;
      if (r.statut === 401) return sessionPerdue();
      if (!r.ok) { message.textContent = r.message; message.hidden = false; return; }
      afficher('/recommander', h('div', { class: 'page etroit section pile-l' },
        h('div', { class: 'pile' }, h('p', { class: 'sur' }, 'C\'est envoyé'), h('h2', null, `Merci ${etat.user.prenom}`),
          h('p', null, `Samy appelle ${prenom.entree.value} de votre part sous 24 heures ouvrées. Vous recevez un email à chaque étape.`),
          r.prime && h('p', { class: 'succes' }, `Prime estimée si l'affaire se conclut : ${euros(r.prime)}.`)),
        h('div', { class: 'rang' }, h('a', { class: 'btn', href: '#/espace' }, 'Suivre mes recommandations'), h('a', { class: 'btn clair', href: '#/recommander', onclick: () => setTimeout(rendre, 0) }, 'En présenter une autre')),
        blocInvitation(true)));
    } },
      h('div', null, h('label', null, 'Votre contact souhaite'), type),
      h('div', null, h('div', { class: 'deux' }, prenom, nom), telephone, lieu, valeur, loyer, commentaire),
      apercu,
      h('label', { class: 'case', for: 'accord' }, accord, h('span', null, 'Mon contact est d\'accord pour être appelé par Samy Santamarina, de ma part.')),
      message, envoyer);
    afficher('/recommander', h('div', { class: 'page etroit section pile-l' },
      h('div', { class: 'pile' }, h('p', { class: 'sur' }, 'Deux minutes'), h('h2', null, 'Recommander quelqu\'un'),
        h('p', { class: 'doux' }, 'Un prénom et un numéro suffisent. Samy l\'appelle de votre part, et vous suivez tout depuis votre espace.')),
      formulaire));
  }

  function inviter() {
    api('espace').then((r) => {
      if (!r.ok) return r.statut === 401 ? sessionPerdue() : null;
      afficher('/inviter', h('div', { class: 'page etroit section pile-l' },
        h('div', { class: 'pile' }, h('p', { class: 'sur' }, 'Mon cercle'), h('h2', null, 'Inviter mon entourage')),
        blocInvitation(false),
        h('section', { class: 'pile' }, h('h3', null, `Dans votre cercle (${r.filleuls.length})`),
          r.filleuls.length
            ? h('div', { class: 'defile' }, h('table', { class: 'table' }, h('thead', null, h('tr', null, h('th', null, 'Prénom'), h('th', null, 'Inscrit le'), h('th', null, 'Recommandations'))),
              h('tbody', null, r.filleuls.map((f) => h('tr', null, h('td', null, f.prenom), h('td', null, jour(f.cree_le)), h('td', null, String(f.recos)))))))
            : h('p', { class: 'petit doux' }, 'Personne pour l\'instant. Un collègue, un confrère, un voisin commerçant : envoyez-lui votre lien.'))));
    });
  }

  function conditions() {
    const part = Math.round(etat.config.part * 100), cercle = Math.round(etat.config.partParrain * 100);
    const articles = [
      ['Le principe', `Vous présentez ponctuellement à Trudaines Immobilier une personne qui a un projet de vente, d'achat ou de gestion locative. Si elle confie son projet à l'agence et que l'opération se conclut, ${part} % des honoraires hors taxes encaissés par l'agence vous reviennent. En gestion locative, la prime porte sur les honoraires de la première année.`],
      ['Votre rôle', 'Vous mettez en relation, rien de plus : ni visite, ni négociation, ni conseil. La recommandation reste occasionnelle. Si elle devient habituelle, parlons-en : un statut adapté existe.'],
      ['L\'accord de votre contact', 'Vous ne transmettez les coordonnées d\'une personne qu\'avec son accord. Elles servent uniquement à la rappeler au sujet de son projet et ne sont jamais cédées.'],
      ['Le versement', 'La prime est due après la signature de l\'acte chez le notaire et l\'encaissement des honoraires par l\'agence. Un accord écrit la fixe avant la mise en relation. Les montants affichés avant la signature sont des estimations.'],
      ['Votre cercle', `Les personnes inscrites avec votre lien entrent dans votre cercle. Sur chaque affaire conclue grâce à leurs recommandations, ${cercle} % des honoraires hors taxes de l'agence vous reviennent, sans réduire leur propre prime.`],
      ['Fiscalité', 'La prime est un revenu que vous déclarez selon votre situation. Les professionnels soumis à une règle déontologique (notaires, courtiers, syndics) vérifient qu\'elle leur permet de la percevoir.'],
      ['Vos données', 'Trudaines Immobilier (MIGA SASU, 2 rue Livingstone, 75018 Paris) traite vos données pour gérer le programme. Vous pouvez y accéder, les corriger ou les faire supprimer en écrivant à samy.santamarina@trudaines.com.'],
    ];
    afficher('/conditions', h('div', { class: 'page etroit section pile-l' }, h('h2', null, 'Conditions du programme WinWin'),
      articles.map(([titre, texte]) => h('div', { class: 'pile' }, h('h3', null, titre), h('p', { class: 'petit' }, texte))),
      h('div', null, h('a', { class: 'btn clair', href: etat.user ? '#/espace' : '#/' }, 'Retour'))));
  }

  /* ------------------------------------------------------------ Back-office */

  const admin = { donnees: null };

  async function chargerAdmin() {
    const r = await api('admin/tableau');
    if (!r.ok) { if (r.statut === 401) sessionPerdue(); else afficher('/admin', h('div', { class: 'page section' }, h('p', { class: 'erreur' }, r.message))); return null; }
    admin.donnees = r;
    return r;
  }

  const personne = (id) => admin.donnees.users.find((u) => u.id === id) || { prenom: 'Prescripteur', nom: '', email: '', telephone: '' };
  const heuresDepuis = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  const telLien = (numero) => (numero ? h('a', { href: `tel:${numero.replace(/[^\d+]/g, '')}` }, numero) : '');

  function onglets(courant) {
    const d = admin.donnees;
    const echecs = d.emails.filter((e) => e.etat !== 'envoyé').length;
    return h('nav', { class: 'onglets', 'aria-label': 'Back-office' },
      [['/admin', `Dossiers (${d.recos.length})`], ['/admin/prescripteurs', `Prescripteurs (${d.users.length})`], ['/admin/emails', `Alertes${echecs ? ` (${echecs} à voir)` : ''}`]]
        .map(([route, texte]) => h('a', { href: `#${route}`, 'aria-current': courant === route ? 'page' : null }, texte)));
  }

  async function changerStatut(id, statut, bouton) {
    if (bouton) bouton.disabled = true;
    const r = await api(`admin/recos/${id}`, { statut });
    if (!r.ok) { toast(r.message); if (bouton) bouton.disabled = false; return; }
    toast(`Étape enregistrée : ${libelleStatut(statut).toLowerCase()}. Le prescripteur est prévenu.`);
    adminDossiers();
  }

  async function adminDossiers() {
    const d = await chargerAdmin();
    if (!d) return;
    const actives = d.recos.filter((r) => !['perdu', 'prescripteur_paye'].includes(r.statut));
    const aAppeler = d.recos.filter((r) => r.statut === 'nouveau');
    const mandats = d.recos.filter((r) => rang(r.statut) >= rang('mandat_signe')).length;
    const aVerser = d.recos.filter((r) => ['acte_signe', 'honoraires_percus'].includes(r.statut)).reduce((s, r) => s + (r.prime || 0) + (r.prime_parrain || 0), 0);
    const honoraires = actives.filter((r) => rang(r.statut) >= rang('mandat_signe')).reduce((s, r) => s + (r.honoraires_ht || 0), 0);
    const kpi = (libelle, valeur, detail) => h('div', null, h('p', { class: 'sur' }, libelle), h('p', { class: 'chiffre' }, valeur), h('p', { class: 'mini doux' }, detail));

    const urgence = aAppeler.length
      ? h('section', { class: 'cadre accent pile' }, h('h3', null, `À appeler (${aAppeler.length})`),
        aAppeler.map((r) => {
          const p = personne(r.user_id), heures = heuresDepuis(r.cree_le);
          return h('div', { class: 'dossier' }, h('div', { class: 'tete' },
            h('div', null, h('p', null, h('strong', null, `${r.contact_prenom} ${r.contact_nom}`.trim()), ' · ', telLien(r.contact_telephone)),
              h('p', { class: 'mini doux' }, `${etat.config.types[r.type]}${r.lieu ? ` · ${r.lieu}` : ''} · de la part de ${p.prenom} ${p.nom}`),
              r.commentaire && h('p', { class: 'petit' }, r.commentaire)),
            h('div', { class: 'rang' }, h('span', { class: `pastille ${heures >= 24 ? 'alerte' : 'or'}` }, heures < 1 ? 'À l\'instant' : heures < 48 ? `Depuis ${heures} h` : `Depuis ${Math.floor(heures / 24)} j`),
              h('button', { class: 'btn fin', type: 'button', onclick: (e) => changerStatut(r.id, 'contacte', e.currentTarget) }, 'Contact pris'),
              h('a', { class: 'btn fin clair', href: `#/admin/reco/${r.id}` }, 'Ouvrir'))));
        }))
      : h('p', { class: 'succes' }, 'Aucune recommandation en attente d\'appel.');

    const colonnes = ETAPES().concat([['perdu', 'Sans suite']]).map(([statut, libelle]) => {
      const cartes = d.recos.filter((r) => r.statut === statut);
      return h('div', { class: 'colonne' }, h('h3', null, h('span', null, libelle), h('span', null, String(cartes.length))),
        cartes.map((r) => h('button', { class: `carte${statut === 'nouveau' && heuresDepuis(r.cree_le) >= 24 ? ' retard' : ''}`, type: 'button', onclick: () => aller(`/admin/reco/${r.id}`) },
          h('strong', null, `${r.contact_prenom} ${r.contact_nom}`.trim()), h('br'),
          h('span', { class: 'mini doux' }, `${etat.config.types[r.type]} · ${personne(r.user_id).prenom} ${personne(r.user_id).nom}`), h('br'),
          h('span', { class: 'mini' }, r.prime ? `Prime ${euros(r.prime)}` : 'Prime à préciser'))));
    });

    afficher('/admin', h('div', { class: 'page section pile-l' },
      h('div', { class: 'tete pile' }, h('p', { class: 'sur' }, 'Back-office'), h('h2', null, 'Recommandations')),
      onglets('/admin'),
      h('div', { class: 'kpis' },
        kpi('À appeler', String(aAppeler.length), aAppeler.some((r) => heuresDepuis(r.cree_le) >= 24) ? 'Dont en retard de plus de 24 h' : 'Dans les 24 heures'),
        kpi('En cours', String(actives.length), `${d.recos.length} reçues au total`),
        kpi('Transformation', d.recos.length ? `${Math.round((mandats / d.recos.length) * 100)} %` : '0 %', `${mandats} mandat${mandats > 1 ? 's' : ''} signé${mandats > 1 ? 's' : ''}`),
        kpi('Honoraires HT attendus', euros(honoraires), 'Dossiers sous mandat'),
        kpi('Primes à verser', euros(aVerser), 'Actes signés, non réglés')),
      urgence,
      h('section', { class: 'pile' }, h('div', { class: 'tete rang', style: null }, h('h3', null, 'Tous les dossiers, par étape'), h('button', { class: 'lien petit', type: 'button', onclick: exporter }, 'Exporter en CSV')),
        h('div', { class: 'pipeline' }, colonnes))));
  }

  function exporter() {
    const d = admin.donnees;
    const cellule = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lignes = [['Reçue le', 'Projet', 'Contact', 'Téléphone', 'Lieu', 'Statut', 'Prescripteur', 'Email prescripteur', 'Prix', 'Honoraires HT', 'Prime', 'Prime cercle', 'Payée le']]
      .concat(d.recos.map((r) => { const p = personne(r.user_id); return [r.cree_le.slice(0, 10), etat.config.types[r.type], `${r.contact_prenom} ${r.contact_nom}`.trim(), r.contact_telephone, r.lieu, libelleStatut(r.statut), `${p.prenom} ${p.nom}`, p.email, r.prix || r.valeur || '', r.honoraires_ht || '', r.prime || '', r.prime_parrain || '', (r.paye_le || '').slice(0, 10)]; }));
    const fichier = new Blob([`﻿${lignes.map((l) => l.map(cellule).join(';')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const lien = h('a', { href: URL.createObjectURL(fichier), download: `winwin-recommandations-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.append(lien); lien.click(); lien.remove();
  }

  const versChampLocal = (iso) => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

  async function adminReco(id) {
    const d = admin.donnees || await chargerAdmin();
    if (!d) return;
    const r = d.recos.find((x) => x.id === id);
    if (!r) return aller('/admin');
    const p = personne(r.user_id);
    const parrain = p.parrain_id ? personne(p.parrain_id) : null;
    const statut = h('select', { id: 'statut' }, etat.config.statuts.map(([v, l]) => h('option', { value: v, selected: v === r.statut }, l)));
    const rdv = champ('Date du rendez-vous', { id: 'rdv', type: 'datetime-local', value: versChampLocal(r.date_rdv) }, true);
    const prix = champ(r.type === 'gestion' ? 'Loyer mensuel' : 'Prix de vente réel', { id: 'prix', inputmode: 'numeric', value: r.type === 'gestion' ? (r.loyer || '') : (r.prix || '') }, true);
    const valeur = champ('Valeur estimée', { id: 'valeur', inputmode: 'numeric', value: r.valeur || '' }, true);
    const taux = champ('Taux d\'honoraires TTC du mandat, en %', { id: 'taux', inputmode: 'decimal', value: r.taux || '', placeholder: 'Vide : barème publié' }, true);
    const message = champ('Message au prescripteur', { id: 'message', rows: '3', placeholder: 'Un mot sur l\'avancement, envoyé par email avec le changement d\'étape.' }, true);
    const notes = champ('Notes internes, jamais montrées', { id: 'notes', rows: '4', value: r.notes || '' }, true);
    const prevenir = h('input', { type: 'checkbox', id: 'prevenir', checked: true });
    const erreur = h('p', { class: 'erreur', hidden: true, role: 'alert' });
    const enregistrer = h('button', { class: 'btn or plein', type: 'submit' }, 'Enregistrer');
    const suivante = ETAPES()[rang(r.statut) + 1];
    const formulaire = h('form', { class: 'pile-l', novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      erreur.hidden = true; enregistrer.disabled = true;
      const corps = { statut: statut.value, date_rdv: rdv.entree.value ? new Date(rdv.entree.value).toISOString() : null, valeur: valeur.entree.value, taux: taux.entree.value, message: message.entree.value, notes: notes.entree.value, prevenir: prevenir.checked };
      if (r.type === 'gestion') corps.loyer = prix.entree.value; else corps.prix = prix.entree.value;
      const rep = await api(`admin/recos/${id}`, corps);
      enregistrer.disabled = false;
      if (!rep.ok) { erreur.textContent = rep.message; erreur.hidden = false; return; }
      toast('Dossier enregistré.');
      await chargerAdmin();
      adminReco(id);
    } },
      suivante && r.statut !== 'perdu' && h('div', { class: 'cadre papier pile' }, h('p', { class: 'sur' }, 'Étape suivante'),
        h('button', { class: 'btn plein', type: 'button', onclick: () => { statut.value = suivante[0]; formulaire.requestSubmit(); } }, `Passer à : ${suivante[1]}`)),
      h('div', null, h('div', { class: 'champ' }, h('label', { for: 'statut' }, 'Étape'), statut), rdv, h('div', { class: 'deux champ' }, prix, valeur), taux, message),
      h('label', { class: 'case', for: 'prevenir' }, prevenir, h('span', null, 'Prévenir le prescripteur par email')),
      notes, erreur, enregistrer);

    const ligne = (terme, valeurAffichee) => (valeurAffichee ? [h('dt', null, terme), h('dd', null, valeurAffichee)] : []);
    const historique = d.etapes.filter((e) => e.reco_id === id);
    afficher('/admin', h('div', { class: 'page section pile-l' },
      h('p', { class: 'petit' }, h('a', { href: '#/admin' }, 'Retour aux dossiers')),
      h('div', { class: 'tete pile' }, h('p', { class: 'sur' }, `${etat.config.types[r.type]} · reçue le ${jour(r.cree_le)}`), h('h2', null, `${r.contact_prenom} ${r.contact_nom}`.trim()),
        h('p', null, h('span', { class: `pastille ${r.statut === 'perdu' ? '' : 'or'}` }, libelleStatut(r.statut)))),
      h('div', { class: 'fiche' },
        h('div', { class: 'pile-l' },
          h('div', { class: 'cadre pile' }, h('p', { class: 'sur' }, 'Le contact'),
            h('dl', { class: 'lignes' }, ligne('Téléphone', telLien(r.contact_telephone)), ligne('Email', r.contact_email && h('a', { href: `mailto:${r.contact_email}` }, r.contact_email)), ligne('Lieu', r.lieu),
              ligne('Valeur estimée', r.valeur ? euros(r.valeur) : ''), ligne('Loyer', r.loyer ? euros(r.loyer) : ''), ligne('À savoir', r.commentaire))),
          h('div', { class: 'cadre pile' }, h('p', { class: 'sur' }, 'Le prescripteur'),
            h('dl', { class: 'lignes' }, ligne('Nom', `${p.prenom} ${p.nom}`), ligne('Activité', p.metier), ligne('Téléphone', telLien(p.telephone)), ligne('Email', p.email && h('a', { href: `mailto:${p.email}` }, p.email)), ligne('Invité par', parrain && `${parrain.prenom} ${parrain.nom}`))),
          h('div', { class: 'cadre accent pile' }, h('p', { class: 'sur' }, 'Les montants'),
            h('dl', { class: 'lignes' }, ligne('Honoraires HT', euros(r.honoraires_ht)), ligne(`Prime prescripteur, ${Math.round(etat.config.part * 100)} %`, euros(r.prime)),
              parrain ? ligne(`Prime de cercle, ${Math.round(etat.config.partParrain * 100)} %`, euros(r.prime_parrain)) : [], ligne('Payée le', jour(r.paye_le))),
            h('p', { class: 'mini doux' }, r.prix ? 'Calculés sur le prix réel.' : 'Estimation sur la valeur déclarée, au barème publié. Saisissez le prix réel et le taux du mandat pour les figer.')),
          h('div', { class: 'pile' }, h('p', { class: 'sur' }, 'Historique'), historique.map((e) => h('p', { class: 'petit' }, `${jour(e.cree_le)} · ${libelleStatut(e.statut)}`)))),
        formulaire)));
  }

  async function adminPrescripteurs() {
    const d = await chargerAdmin();
    if (!d) return;
    const message = (u) => `Bonjour ${u.prenom}, c'est Samy de Trudaines. Votre espace WinWin est ouvert : si quelqu'un autour de vous parle de vendre ou d'acheter à Paris, présentez-le-moi en deux minutes ici : ${ADRESSE} Belle journée.`;
    const lignes = d.users.filter((u) => !['samy.santamarina@trudaines.com', 'samysantamarina@trudaines.com'].includes(u.email)).map((u) => {
      const recos = d.recos.filter((r) => r.user_id === u.id);
      const filleuls = d.users.filter((x) => x.parrain_id === u.id).length;
      const mobile = (u.telephone || '').replace(/[^\d+]/g, '').replace(/^0/, '33').replace(/^\+/, '');
      return h('tr', null,
        h('td', null, h('strong', null, `${u.prenom} ${u.nom}`), h('br'), h('span', { class: 'mini doux' }, u.metier || '')),
        h('td', null, telLien(u.telephone), h('br'), h('a', { class: 'mini', href: `mailto:${u.email}` }, u.email)),
        h('td', null, jour(u.cree_le), h('br'), h('span', { class: 'mini doux' }, u.vu_le ? `Vu le ${jour(u.vu_le)}` : 'Jamais reconnecté')),
        h('td', null, recos.length ? String(recos.length) : h('span', { class: 'pastille' }, 'Aucune')),
        h('td', null, String(filleuls), u.parrain_id ? h('span', { class: 'mini doux' }, ` · invité par ${personne(u.parrain_id).prenom}`) : ''),
        h('td', null, h('div', { class: 'rang' },
          mobile && h('a', { class: 'btn fin clair', href: `https://wa.me/${mobile}?text=${encodeURIComponent(message(u))}`, target: '_blank', rel: 'noopener' }, 'WhatsApp'),
          h('a', { class: 'btn fin clair', href: `mailto:${u.email}?subject=${encodeURIComponent('Votre espace Trudaines WinWin')}&body=${encodeURIComponent(message(u))}` }, 'Email'))));
    });
    const dormants = d.users.filter((u) => !d.recos.some((r) => r.user_id === u.id)).length;
    afficher('/admin', h('div', { class: 'page section pile-l' },
      h('div', { class: 'tete pile' }, h('p', { class: 'sur' }, 'Back-office'), h('h2', null, 'Prescripteurs')),
      onglets('/admin/prescripteurs'),
      h('p', { class: 'petit doux' }, `${dormants} inscrit${dormants > 1 ? 's' : ''} sans recommandation : un message personnel suffit souvent à déclencher la première. Les boutons ouvrent un message déjà rédigé, que vous envoyez vous-même.`),
      lignes.length ? h('div', { class: 'defile' }, h('table', { class: 'table' },
        h('thead', null, h('tr', null, ['Prescripteur', 'Contact', 'Inscrit le', 'Recos', 'Cercle', 'Relancer'].map((t) => h('th', null, t)))), h('tbody', null, lignes)))
        : h('p', { class: 'cadre papier' }, 'Aucun prescripteur inscrit pour l\'instant. Partagez l\'adresse de l\'application ou votre lien d\'invitation.')));
  }

  async function adminEmails() {
    const d = await chargerAdmin();
    if (!d) return;
    const resultat = h('p', { class: 'succes', hidden: true });
    const essai = h('button', { class: 'btn', type: 'button', onclick: async () => {
      essai.disabled = true;
      const r = await api('admin/essai', {});
      essai.disabled = false;
      resultat.hidden = false;
      resultat.textContent = r.ok ? `Email : ${r.email ? 'accepté par Brevo' : 'refusé, voir le journal'}. SMS : ${r.sms ? 'accepté par Brevo' : 'refusé'}. Vérifiez votre boîte et votre téléphone.` : r.message;
      const maj = await chargerAdmin();
      if (maj) journal.replaceChildren(...lignesJournal(maj.emails));
    } }, 'Tester les alertes maintenant');
    const lignesJournal = (emails) => emails.map((e) => h('tr', null, h('td', null, new Date(e.cree_le).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })),
      h('td', null, e.genre), h('td', null, e.destinataire), h('td', null, e.sujet), h('td', null, h('span', { class: `pastille ${e.etat === 'envoyé' ? 'encre' : 'alerte'}` }, e.etat), e.etat !== 'envoyé' && e.detail ? h('span', { class: 'mini doux' }, ` ${e.detail}`) : '')));
    const journal = h('tbody', null, lignesJournal(d.emails));
    afficher('/admin', h('div', { class: 'page section pile-l' },
      h('div', { class: 'tete pile' }, h('p', { class: 'sur' }, 'Back-office'), h('h2', null, 'Alertes et emails')),
      onglets('/admin/emails'),
      h('div', { class: 'cadre pile' }, h('p', null, 'Chaque nouvelle recommandation vous envoie un email et un SMS. Chaque changement d\'étape prévient le prescripteur.'), h('div', null, essai), resultat),
      h('div', { class: 'defile' }, h('table', { class: 'table' }, h('thead', null, h('tr', null, ['Date', 'Type', 'Destinataire', 'Objet', 'État'].map((t) => h('th', null, t)))), journal))));
  }

  /* ------------------------------------------------------------ Aiguillage */

  async function charger() {
    const r = await api('moi');
    if (r.config) etat.config = r.config;
    etat.user = r.user || null;
    return r;
  }

  function rendre() {
    const route = location.hash.replace(/^#/, '') || '/';
    const prive = (vue) => (etat.user ? vue() : aller('/connexion'));
    const agence = (vue) => (etat.user && etat.user.role === 'admin' ? vue() : aller(etat.user ? '/espace' : '/connexion'));
    let m;
    if ((m = /^\/jeton\/([a-f0-9]{64})$/.exec(route))) return jeton(m[1]);
    if (route === '/') return accueil();
    if (route === '/inscription') return inscription();
    if (route === '/connexion') return connexion();
    if (route === '/conditions') return conditions();
    if (route === '/espace') return prive(espace);
    if (route === '/recommander') return prive(recommander);
    if (route === '/inviter') return prive(inviter);
    if (route === '/admin') return agence(adminDossiers);
    if (route === '/admin/prescripteurs') return agence(adminPrescripteurs);
    if (route === '/admin/emails') return agence(adminEmails);
    if ((m = /^\/admin\/reco\/([a-zA-Z0-9-]+)$/.exec(route))) return agence(() => adminReco(m[1]));
    return aller('/');
  }

  (async () => {
    const code = new URLSearchParams(location.search).get('p');
    if (code && /^[A-Za-z0-9]{4,12}$/.test(code)) memoire('ww_parrain', code.toUpperCase());
    const r = await charger();
    if (!etat.config) {
      racine.replaceChildren(h('p', { class: 'chargement' }, r.message || 'Application momentanément indisponible. Appelez-nous au 06 20 46 59 12.'));
      return;
    }
    window.addEventListener('hashchange', rendre);
    rendre();
  })();
})();
