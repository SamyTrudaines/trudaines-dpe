/**
 * Tests de la mise en ligne, sans réseau : les règles de plan.mjs une à une,
 * puis la mise en ligne entière rejouée sur un internet simulé, avec les
 * trois API, les DNS publics, l'ancien et le nouveau site.
 * Lancer : npm run test-mise-en-ligne
 */
process.env.MISE_EN_LIGNE_ATTENTE_MS = '1';
process.env.MISE_EN_LIGNE_SILENCE = '1';

const plan = await import('./mise-en-ligne/plan.mjs');
const { executer } = await import('./mise-en-ligne/index.mjs');

let echecs = 0;
function verifier(nom, condition, detail = '') {
  if (!condition) echecs += 1;
  console.log(`${condition ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ` · ${detail}` : ''}`);
}

/* -------------------------------------------------------- règles du plan */

const SPF = '"v=spf1 include:_mailcust.gandi.net ?all"';
const zoneType = () => [
  { rrset_name: '@', rrset_type: 'A', rrset_ttl: 10800, rrset_values: ['203.0.113.10'] },
  { rrset_name: '@', rrset_type: 'AAAA', rrset_ttl: 10800, rrset_values: ['2001:db8::10'] },
  { rrset_name: '@', rrset_type: 'MX', rrset_ttl: 10800, rrset_values: ['10 spool.mail.gandi.net.', '50 fb.mail.gandi.net.'] },
  { rrset_name: '@', rrset_type: 'TXT', rrset_ttl: 10800, rrset_values: [SPF] },
  { rrset_name: 'gm1._domainkey', rrset_type: 'CNAME', rrset_ttl: 10800, rrset_values: ['gm1.gandimail.net.'] },
  { rrset_name: 'www', rrset_type: 'A', rrset_ttl: 10800, rrset_values: ['203.0.113.10'] },
];

{
  const p = plan.planWww(zoneType());
  verifier('www en A : retrait des A puis CNAME vers Pages', p.actions.length === 2 && p.actions[0].type === 'supprimer' && p.actions[1].valeurs[0] === 'trudaines-dpe.pages.dev.', JSON.stringify(p.actions.map((a) => a.type)));
  const deja = [{ rrset_name: 'www', rrset_type: 'CNAME', rrset_ttl: 300, rrset_values: ['trudaines-dpe.pages.dev.'] }];
  verifier('www déjà juste : aucune action', plan.planWww(deja).actions.length === 0);
  const txt = [...zoneType(), { rrset_name: 'www', rrset_type: 'TXT', rrset_ttl: 300, rrset_values: ['"x"'] }];
  verifier('www avec un TXT : bloquant, aucune action', plan.planWww(txt).bloquants.length === 1 && plan.planWww(txt).actions.length === 0);
}

{
  const p = plan.planTxtAdditif(zoneType(), '@', 'brevo-code:abc123');
  const valeurs = p.actions[0]?.valeurs || [];
  verifier('TXT racine : le SPF est conservé tel quel', valeurs[0] === SPF, valeurs.join(' | '));
  verifier('TXT racine : le code Brevo est ajouté entre guillemets', valeurs[1] === '"brevo-code:abc123"');
  const zone = zoneType();
  zone[3].rrset_values.push('"brevo-code:abc123"');
  verifier('TXT racine : aucune action si déjà présent', plan.planTxtAdditif(zone, '@', 'brevo-code:abc123').actions.length === 0);
}

{
  const long = `k=rsa;p=${'A'.repeat(400)}`;
  const q = plan.enGuillemets(long);
  verifier('TXT long découpé en segments de 255', q.split('" "').length === 2 && plan.sansGuillemets(q) === long);
}

{
  const cree = plan.planUnique(zoneType(), 'mail._domainkey', 'TXT', 'k=rsa;p=XYZ');
  verifier('DKIM absent : créé', cree.actions.length === 1 && cree.actions[0].valeurs[0] === '"k=rsa;p=XYZ"');
  const zone = [...zoneType(), { rrset_name: 'mail._domainkey', rrset_type: 'TXT', rrset_ttl: 300, rrset_values: ['"k=rsa;p=AUTRE"'] }];
  const conflit = plan.planUnique(zone, 'mail._domainkey', 'TXT', 'k=rsa;p=XYZ');
  verifier('DKIM différent déjà en place : jamais écrasé', conflit.actions.length === 0 && conflit.conflits.length === 1);
  const dmarc = [...zoneType(), { rrset_name: '_dmarc', rrset_type: 'TXT', rrset_ttl: 300, rrset_values: ['"v=DMARC1; p=quarantine"'] }];
  const garde = plan.planUnique(dmarc, '_dmarc', 'TXT', 'v=DMARC1; p=none', { garderExistant: true });
  verifier('DMARC existant : politique conservée', garde.actions.length === 0 && garde.conflits.length === 0);
  const cname = plan.planUnique(zoneType(), 'gm1._domainkey', 'TXT', 'x');
  verifier('Nom porteur d’un CNAME : aucune écriture', cname.actions.length === 0 && cname.conflits.length === 1);
}

{
  const records = {
    brevo_code: { type: 'TXT', value: 'brevo-code:abc123', host_name: 'trudaines.com', status: false },
    dkim_record: { type: 'TXT', value: 'k=rsa;p=XYZ', host_name: 'mail._domainkey.trudaines.com', status: false },
    dmarc_record: { type: 'TXT', value: 'v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com', host_name: '_dmarc', status: false },
    spf_record: { type: 'TXT', value: 'v=spf1 include:spf.brevo.com ~all', host_name: '@', status: false },
  };
  const p = plan.planBrevo(zoneType(), records);
  const noms = p.actions.map((a) => `${a.nom} ${a.rrtype}`);
  verifier('Brevo : code, DKIM et DMARC planifiés', noms.join(',') === '@ TXT,mail._domainkey TXT,_dmarc TXT', noms.join(', '));
  verifier('Brevo : le SPF du domaine n’est jamais modifié', !p.actions.some((a) => a.valeurs.some((v) => v.includes('spf.brevo.com'))));
  verifier('Brevo : aucune action ne touche un MX', !p.actions.some((a) => a.rrtype === 'MX'));
}

{
  verifier('Racine sans redirection : création', plan.planRacine([]).actions[0]?.type === 'redirection-creer');
  const juste = [{ host: 'trudaines.com', url: 'https://www.trudaines.com/', type: 'http301' }];
  verifier('Racine déjà redirigée : aucune action', plan.planRacine(juste).actions.length === 0);
  const nettoyage = plan.planNettoyageRacine(zoneType(), { A: ['217.70.184.55'], AAAA: ['2001:4b98:dc0:41::55'] });
  verifier('Racine : l’IPv6 de l’ancien hébergeur est retirée', nettoyage.actions.length === 1 && nettoyage.actions[0].rrtype === 'AAAA');
  const prudent = plan.planNettoyageRacine(zoneType(), { A: [], AAAA: [] });
  verifier('Racine : rien retiré si les adresses de redirection sont inconnues', prudent.actions.length === 0 && prudent.alertes.length === 2);
}

verifier('Serveurs de noms Gandi reconnus', plan.verifierServeursDeNoms(['ns-1.gandi.net', 'ns-2.gandi.net']).length === 0);
verifier('Serveurs de noms étrangers : bloquant', plan.verifierServeursDeNoms(['ns1.wixdns.net']).length === 1);
verifier('CAA Let’s Encrypt accepté', plan.verifierCaa(['0 issue "letsencrypt.org"']).length === 0);
verifier('CAA fermé à Cloudflare : bloquant', plan.verifierCaa(['0 issue "sectigo.com"']).length === 1);
verifier('Hôte Brevo normalisé', plan.nomRelatif('mail._domainkey.trudaines.com') === 'mail._domainkey' && plan.nomRelatif('trudaines.com') === '@' && plan.nomRelatif('') === '@');

/* ---------------------------------------------- internet simulé, bout en bout */

function internet({ blocageIp = false } = {}) {
  const etat = {
    zone: zoneType(),
    redirections: [],
    listes: [
      { id: 5, name: 'RENT 600' },
      { id: 6, name: 'RENT LEADS STAND CONF QR CODE' },
    ],
    dossiers: [{ id: 1, name: 'Your first folder' }],
    attributs: [{ name: 'PRENOM' }, { name: 'NOM' }, { name: 'SMS' }, { name: 'OPT_IN' }],
    domaineBrevo: false,
    domainesPages: [],
    variables: null,
    ecritures: [],
  };
  const json = (corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json' } });
  const html = (corps, entetes = {}) => new Response(corps, { status: 200, headers: { 'content-type': 'text/html', ...entetes } });
  const redirige = (vers, statut = 301) => new Response(null, { status: statut, headers: { location: vers } });
  const bascule = () => etat.zone.some((e) => e.rrset_name === 'www' && e.rrset_type === 'CNAME');
  const doh = (nom, type) => {
    const reponses = [];
    const ajouter = (t, data) => reponses.push({ name: `${nom}.`, type: { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28, DS: 43, CAA: 257 }[t], TTL: 300, data });
    if (nom === 'trudaines.com' && type === 'NS') ['ns-176-a.gandi.net.', 'ns-68-b.gandi.net.'].forEach((n) => ajouter('NS', n));
    if (nom === 'webredir.vip.gandi.net' && type === 'A') ajouter('A', '217.70.184.55');
    if (nom === 'webredir.vip.gandi.net' && type === 'AAAA') ajouter('AAAA', '2001:4b98:dc0:41::55');
    const rel = nom === 'trudaines.com' ? '@' : nom.replace(/\.trudaines\.com$/, '');
    for (const e of etat.zone.filter((x) => x.rrset_name === rel)) {
      if (e.rrset_type === type || (e.rrset_type === 'CNAME' && ['A', 'AAAA', 'TXT'].includes(type))) {
        e.rrset_values.forEach((v) => ajouter(e.rrset_type, v));
      }
    }
    return json({ Status: 0, AD: false, Answer: reponses });
  };
  const nouveauSite = (chemin, methode, options) => {
    if (chemin === '/') return html(`<title>Trudaines</title><p>L'immobilier au-delà des murs.</p>`, { 'strict-transport-security': 'max-age=31536000', 'x-content-type-options': 'nosniff' });
    if (['/sitemap-index.xml', '/robots.txt', '/.well-known/security.txt', '/estimation', '/acheter', '/bien/appartement-2-pieces-43m2-renove-rue-vaneau', '/panorama'].includes(chemin)) return html('ok');
    if (chemin.startsWith('/vente/')) return redirige('/bien/appartement-2-pieces-43m2-renove-rue-vaneau');
    if (chemin.startsWith('/nos-actualites/')) return redirige('/panorama');
    if (chemin === '/api/guide' && methode === 'POST') {
      const origine = options.headers?.Origin;
      if (origine && !origine.includes('trudaines')) return new Response('Origine non autorisée.', { status: 403 });
      const f = options.body;
      if (f.get('societe')) return json({ ok: true, message: 'Reçu' });
      if (!etat.variables?.BREVO_API_KEY) return json({ ok: false, message: 'L’envoi a échoué.' }, 500);
      return json({ ok: true, message: 'Guide envoyé' });
    }
    return new Response('introuvable', { status: 404, headers: { 'content-type': 'text/html' } });
  };

  globalThis.fetch = async (entree, options = {}) => {
    const url = new URL(String(entree));
    const methode = (options.method || 'GET').toUpperCase();
    const chemin = url.pathname;
    const corps = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : null;
    const trace = (service) => {
      if (methode !== 'GET') etat.ecritures.push({ service, methode, chemin, corps });
    };

    if (url.hostname === 'cloudflare-dns.com') return doh(url.searchParams.get('name'), url.searchParams.get('type'));

    if (url.hostname === 'api.brevo.com') {
      trace('brevo');
      if (blocageIp) return json({ code: 'unauthorized', message: 'We have detected you are using an unrecognised IP address 192.0.2.1' }, 401);
      const p = chemin.replace('/v3', '');
      if (p === '/account') return json({ companyName: 'MIGA' });
      if (p === '/contacts/folders' && methode === 'GET') return json({ folders: etat.dossiers });
      if (p === '/contacts/folders') {
        etat.dossiers.push({ id: 9, name: corps.name });
        return json({ id: 9 }, 201);
      }
      if (p === '/contacts/lists' && methode === 'GET') return json({ lists: etat.listes });
      if (p === '/contacts/lists') {
        const id = 20 + etat.listes.length;
        etat.listes.push({ id, name: corps.name, folderId: corps.folderId });
        return json({ id }, 201);
      }
      if (p === '/contacts/attributes') return json({ attributes: etat.attributs });
      if (p.startsWith('/contacts/attributes/normal/')) {
        etat.attributs.push({ name: p.split('/').pop() });
        return new Response(null, { status: 201 });
      }
      if (p === '/senders') return json({ senders: [{ id: 1, email: 'samy.santamarina@trudaines.com', active: true }] });
      if (p === '/senders/domains' && methode === 'GET') return json({ domains: etat.domaineBrevo ? [{ domain_name: 'trudaines.com', authenticated: false }] : [] });
      const dns = {
        brevo_code: { type: 'TXT', value: 'brevo-code:abc123', host_name: '@', status: false },
        dkim_record: { type: 'TXT', value: 'k=rsa;p=XYZ', host_name: 'mail._domainkey', status: false },
        dmarc_record: { type: 'TXT', value: 'v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com', host_name: '_dmarc', status: false },
      };
      if (p === '/senders/domains') {
        etat.domaineBrevo = true;
        return json({ id: 3, domain_name: 'trudaines.com', dns_records: dns }, 201);
      }
      if (p === '/senders/domains/trudaines.com') return json({ domain: 'trudaines.com', dns_records: dns });
      if (p.endsWith('/authenticate')) return json({ message: 'ok' });
      return json({ message: 'inconnu' }, 404);
    }

    if (url.hostname === 'api.gandi.net') {
      trace('gandi');
      const p = chemin.replace('/v5', '');
      if (p === '/livedns/domains/trudaines.com/records') return json(etat.zone);
      const m = p.match(/^\/livedns\/domains\/trudaines\.com\/records\/([^/]+)\/([A-Z]+)$/);
      if (m) {
        const nom = decodeURIComponent(m[1]);
        etat.zone = etat.zone.filter((e) => !(e.rrset_name === nom && e.rrset_type === m[2]));
        if (methode === 'PUT') etat.zone.push({ rrset_name: nom, rrset_type: m[2], rrset_ttl: corps.rrset_ttl, rrset_values: corps.rrset_values });
        return methode === 'PUT' ? json({ message: 'ok' }, 201) : new Response(null, { status: 204 });
      }
      if (p.startsWith('/domain/domains/trudaines.com/webredirs') && methode === 'GET') return json(etat.redirections);
      if (p === '/domain/domains/trudaines.com/webredirs' && methode === 'POST') {
        etat.redirections.push(corps);
        etat.zone = etat.zone.filter((e) => !(e.rrset_name === '@' && e.rrset_type === 'A'));
        etat.zone.push({ rrset_name: '@', rrset_type: 'A', rrset_ttl: 10800, rrset_values: ['217.70.184.55'] });
        return json({ message: 'ok' }, 201);
      }
      return json({ message: 'inconnu' }, 404);
    }

    if (url.hostname === 'api.cloudflare.com') {
      trace('cloudflare');
      const p = chemin.replace(/^\/client\/v4\/accounts\/[^/]+\/pages\/projects\/trudaines-dpe/, '');
      if (p === '' && methode === 'GET') return json({ result: { name: 'trudaines-dpe', production_branch: etat.brancheProduction ?? 'main', deployment_configs: { production: { env_vars: etat.variables || {} } } } });
      if (p === '' && methode === 'PATCH' && corps.production_branch) {
        etat.brancheProduction = corps.production_branch;
        return json({ result: {} });
      }
      if (p === '' && methode === 'PATCH') {
        etat.variables = corps.deployment_configs.production.env_vars;
        return json({ result: {} });
      }
      if (p === '/domains' && methode === 'GET') return json({ result: etat.domainesPages });
      if (p === '/domains' && methode === 'POST') {
        etat.domainesPages.push({ name: corps.name, status: 'pending' });
        return json({ result: { name: corps.name, status: 'pending' } });
      }
      if (p.startsWith('/domains/')) {
        const actif = bascule();
        return json({ result: { name: 'www.trudaines.com', status: actif ? 'active' : 'pending', validation_data: { method: 'http' } } });
      }
      if (p === '/deployments' && methode === 'POST') return json({ result: { id: 'deploiement-1' } });
      if (p.startsWith('/deployments/')) return json({ result: { id: 'deploiement-1', latest_stage: { name: 'deploy', status: 'success' } } });
      if (p.startsWith('/deployments')) return json({ result: [{ id: 'deploiement-0' }] });
      return json({ success: false }, 404);
    }

    if (url.hostname === 'trudaines-dpe.pages.dev') return nouveauSite(chemin, methode, options);
    if (url.hostname === 'www.trudaines.com') {
      if (!bascule()) {
        if (chemin === '/robots.txt') return new Response('Sitemap: https://www.trudaines.com/sitemap.xml', { status: 200, headers: { 'content-type': 'text/plain' } });
        if (chemin === '/sitemap.xml') {
          return new Response(
            '<urlset><url><loc>https://www.trudaines.com/vente/1-paris/appartement/180-appartement-2-pieces-43m-renove-rue-vaneau</loc></url><url><loc>https://www.trudaines.com/nos-actualites/x.html</loc></url><url><loc>https://www.trudaines.com/page-oubliee</loc></url></urlset>',
            { status: 200, headers: { 'content-type': 'application/xml' } }
          );
        }
        return html('<title>Trudaines ancien site</title><meta name="generator" content="Ancien moteur">', { server: 'ancien' });
      }
      if (url.protocol === 'http:') return redirige(`https://www.trudaines.com${chemin}`);
      return nouveauSite(chemin, methode, options);
    }
    if (url.hostname === 'trudaines.com') {
      if (etat.redirections.length) return redirige('https://www.trudaines.com');
      return html('<title>Trudaines ancien site</title>');
    }
    return new Response('hors simulation', { status: 599 });
  };
  return etat;
}

const secrets = { cloudflare: 'jeton-cf', gandi: 'jeton-gandi', brevo: 'cle-brevo' };
const CONFIRMATION = 'METTRE EN LIGNE trudaines.com';

{
  const etat = internet();
  const r = await executer({ mode: 'audit', secrets: {} });
  verifier('Audit sans jetons : aucun appel en écriture', etat.ecritures.length === 0);
  verifier('Audit sans jetons : pas prêt, en attente des accès', r.pret === false && r.reussite === true);
  const erreurs = r.audit.ancienSite.enErreur.map((e) => e.chemin);
  verifier('Audit : l’ancienne adresse sans redirection est signalée', erreurs.length === 1 && erreurs[0] === '/page-oubliee', erreurs.join(', '));
  verifier('Audit : messagerie Gandi reconnue', r.audit.messagerie === 'Gandi Mail');
}

{
  const etat = internet();
  const r = await executer({ mode: 'audit', secrets });
  verifier('Audit avec jetons : lectures seules, aucune écriture', etat.ecritures.length === 0, etat.ecritures.map((e) => `${e.methode} ${e.chemin}`).join(', '));
  verifier('Audit avec jetons : prêt, plan détaillé', r.pret === true && r.journal.some((l) => l.statut === 'prevu' && l.texte.includes('www CNAME')));
}

{
  const etat = internet();
  const r = await executer({ mode: 'appliquer', confirmation: 'oui', secrets });
  verifier('Appliquer sans la phrase de confirmation : rien n’est écrit', etat.ecritures.length === 0 && r.reussite === false);
}

{
  const etat = internet({ blocageIp: true });
  const r = await executer({ mode: 'appliquer', confirmation: CONFIRMATION, secrets });
  const message = r.journal.find((l) => l.section === 'Brevo' && l.statut === 'bloquant')?.texte || '';
  verifier('Blocage IP Brevo : détecté et expliqué', message.includes('IP autorisées'), message);
  verifier('Blocage IP Brevo : aucune écriture Gandi ni Cloudflare', !etat.ecritures.some((e) => e.service !== 'brevo'));
}

{
  const etat = internet();
  // Cas réel du 3 octobre 2026 : la production Cloudflare ne suivait pas main.
  etat.brancheProduction = 'ancienne-branche';
  const mxAvant = JSON.stringify(etat.zone.find((e) => e.rrset_type === 'MX'));
  const r = await executer({ mode: 'appliquer', confirmation: CONFIRMATION, secrets });
  const ordre = etat.ecritures.map((e) => `${e.service} ${e.methode} ${e.chemin.split('/').slice(-2).join('/')}`);
  const indice = (motif) => ordre.findIndex((o) => o.includes(motif));
  verifier('Mise en ligne complète : recette verte', r.reussite === true, r.journal.filter((l) => ['echec', 'bloquant', 'alerte'].includes(l.statut)).map((l) => l.texte).join(' | '));
  const brancheFixee = etat.ecritures.findIndex((e) => e.corps?.production_branch === 'main');
  verifier(
    'Branche de production remise sur main avant la reconstruction',
    etat.brancheProduction === 'main' && brancheFixee > -1 && brancheFixee < indice('cloudflare POST trudaines-dpe/deployments')
  );
  verifier('Variables posées avant toute bascule DNS', indice('cloudflare PATCH') > -1 && indice('cloudflare PATCH') < indice('www/CNAME'));
  verifier('Production reconstruite avant la bascule', indice('cloudflare POST trudaines-dpe/deployments') > -1 && indice('cloudflare POST trudaines-dpe/deployments') < indice('www/CNAME'));
  verifier('Domaine déclaré chez Cloudflare avant le CNAME', indice('cloudflare POST trudaines-dpe/domains') > -1 && indice('cloudflare POST trudaines-dpe/domains') < indice('www/CNAME'));
  verifier('Clé Brevo posée en secret, jamais en clair', etat.variables.BREVO_API_KEY?.type === 'secret_text' && etat.variables.BREVO_LISTE_VENDEURS?.type === 'plain_text');
  verifier('Quatre listes créées dans leur dossier', ['Vendeurs', 'Acheteurs', 'Candidats', 'Téléchargements'].every((n) => etat.listes.some((l) => l.name === n && l.folderId === 9)));
  verifier('Numéros de listes transmis à Cloudflare', etat.variables.BREVO_LISTE_TELECHARGEMENTS?.value === String(etat.listes.find((l) => l.name === 'Téléchargements').id));
  verifier('Tous les attributs du site créés', ['ORIGINE', 'DATE_OPTIN', 'SECTEUR_SOUHAITE', 'GUIDE'].every((n) => etat.attributs.some((a) => a.name === n)));
  verifier('MX strictement intacts', JSON.stringify(etat.zone.find((e) => e.rrset_type === 'MX')) === mxAvant);
  const txt = etat.zone.find((e) => e.rrset_name === '@' && e.rrset_type === 'TXT');
  verifier('SPF conservé, code Brevo ajouté', txt.rrset_values[0] === SPF && txt.rrset_values.includes('"brevo-code:abc123"'));
  verifier('DKIM Gandi Mail intact', etat.zone.some((e) => e.rrset_name === 'gm1._domainkey' && e.rrset_values[0] === 'gm1.gandimail.net.'));
  verifier('www en CNAME vers Pages, plus aucun A', etat.zone.filter((e) => e.rrset_name === 'www').map((e) => e.rrset_type).join() === 'CNAME');
  verifier('Racine redirigée en 301 https vers www', etat.redirections[0]?.url === 'https://www.trudaines.com' && etat.redirections[0].protocol === 'https');
  verifier('IPv6 de l’ancien hébergeur retirée de la racine', !etat.zone.some((e) => e.rrset_name === '@' && e.rrset_type === 'AAAA'));
  verifier('Formulaire réel envoyé en recette', r.recette?.controles.some((c) => c.nom.startsWith('Formulaire réel') && c.ok));
  verifier('Sauvegarde de rétablissement produite', r.sauvegarde?.www?.[0]?.rrset_type === 'A' && r.sauvegarde.racine.some((e) => e.rrset_type === 'AAAA'));

  const avant = etat.ecritures.length;
  const bis = await executer({ mode: 'appliquer', confirmation: CONFIRMATION, secrets });
  const nouvelles = etat.ecritures.slice(avant).filter((e) => e.service !== 'cloudflare' && !e.chemin.endsWith('/authenticate'));
  verifier('Deuxième passage : rien n’est recréé ni réécrit', bis.reussite === true && nouvelles.length === 0, nouvelles.map((e) => `${e.methode} ${e.chemin}`).join(', '));

  const rb = await executer({ mode: 'retablir', secrets, ordre: { sauvegarde: r.sauvegarde } });
  const www = etat.zone.filter((e) => e.rrset_name === 'www');
  verifier('Rétablissement : www revient à son état d’origine', rb.reussite === true && www.length === 1 && www[0].rrset_type === 'A' && www[0].rrset_values[0] === '203.0.113.10');
}

console.log(echecs ? `${echecs} échec(s)` : 'Toute la mise en ligne se comporte comme prévu.');
process.exit(echecs ? 1 : 0);
