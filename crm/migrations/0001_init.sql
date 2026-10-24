-- CRM Trudaines, schéma initial. Base Cloudflare D1 (SQLite), liée au projet Pages sous le nom CRM.
-- Appliqué par scripts/crm/preparer.mjs ; chaque fichier de ce dossier ne s'applique qu'une fois.
-- Dates en texte ISO 8601 (UTC), téléphones au format international (+33...).

-- Une adresse, au numéro près. Identifiant de la Base Adresse Nationale quand elle la reconnaît,
-- sinon « adr: » suivi de l'adresse normalisée.
CREATE TABLE IF NOT EXISTS immeuble (
  id TEXT PRIMARY KEY,
  adresse TEXT NOT NULL,
  numero TEXT,
  voie TEXT,
  code_postal TEXT,
  commune TEXT,
  latitude REAL,
  longitude REAL,
  notes TEXT,
  cree_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS immeuble_voie ON immeuble (code_postal, voie);

CREATE TABLE IF NOT EXISTS personne (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom TEXT,
  nom TEXT,
  email TEXT,
  telephone TEXT,
  -- Rôles séparés par des virgules : proprietaire, acquereur, bailleur, locataire, apporteur, gardien, notaire, partenaire.
  roles TEXT NOT NULL DEFAULT '',
  -- Accord pour recevoir de l'information de l'agence (case du formulaire), et sa date.
  consentement INTEGER NOT NULL DEFAULT 0,
  consentement_le TEXT,
  -- Première source connue : « Formulaire estimation », « Terrain », « WinWin »...
  origine TEXT,
  notes TEXT,
  cree_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  maj_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS personne_email ON personne (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS personne_telephone ON personne (telephone);

-- Un projet : une vente, un achat, une gestion, une chasse. Le cœur du suivi : son étape et sa prochaine action.
CREATE TABLE IF NOT EXISTS projet (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personne_id INTEGER NOT NULL REFERENCES personne (id),
  immeuble_id TEXT REFERENCES immeuble (id),
  nature TEXT NOT NULL,
  etape TEXT NOT NULL,
  adresse TEXT,
  lot TEXT,
  -- Détails du formulaire en JSON : surface, pièces, étage, budget, fourchette vue...
  details TEXT,
  horizon TEXT,
  source TEXT NOT NULL,
  apporteur_id INTEGER REFERENCES personne (id),
  prochaine_action TEXT,
  prochaine_action_le TEXT,
  honoraires_prevus INTEGER,
  motif_cloture TEXT,
  cree_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  maj_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  etape_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS projet_personne ON projet (personne_id);
CREATE INDEX IF NOT EXISTS projet_action ON projet (prochaine_action_le);
CREATE INDEX IF NOT EXISTS projet_immeuble ON projet (immeuble_id);

-- Tout ce qui s'est passé : appel, SMS, email, rendez-vous, porte-à-porte, note.
CREATE TABLE IF NOT EXISTS echange (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personne_id INTEGER NOT NULL REFERENCES personne (id),
  projet_id INTEGER REFERENCES projet (id),
  le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  canal TEXT NOT NULL,
  resume TEXT,
  auteur TEXT
);
CREATE INDEX IF NOT EXISTS echange_personne ON echange (personne_id, le);

-- Messages de suivi préparés par le CRM et envoyés chaque matin par .github/workflows/crm.yml.
CREATE TABLE IF NOT EXISTS relance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projet (id),
  modele TEXT NOT NULL,
  prevue_le TEXT NOT NULL,
  -- prevue, envoyee, essai (partie à l'adresse d'essai), annulee
  statut TEXT NOT NULL DEFAULT 'prevue',
  traitee_le TEXT,
  UNIQUE (projet_id, modele)
);
CREATE INDEX IF NOT EXISTS relance_prevue ON relance (statut, prevue_le);

-- Connecteur privé /crm/mcp : clients inscrits, codes d'autorisation et jetons, conservés sous forme d'empreinte.
CREATE TABLE IF NOT EXISTS oauth_client (
  id TEXT PRIMARY KEY,
  nom TEXT,
  redirections TEXT NOT NULL,
  cree_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE TABLE IF NOT EXISTS oauth_code (
  empreinte TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirection TEXT NOT NULL,
  defi TEXT NOT NULL,
  utilisateur TEXT NOT NULL,
  expire_le INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_jeton (
  empreinte TEXT PRIMARY KEY,
  genre TEXT NOT NULL,
  client_id TEXT NOT NULL,
  utilisateur TEXT NOT NULL,
  expire_le INTEGER NOT NULL
);
