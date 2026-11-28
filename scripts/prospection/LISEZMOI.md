# Prospection autour des DPE

`dpe-immeubles.py` sert la routine quotidienne de prospection de l'agence :

1. il relève dans le jeu `dpe03existant` de l'ADEME les DPE (appartement ou immeuble entier) des sept derniers
   jours dans le 9e, le 10e, le 17e et le 18e, toutes étiquettes, et les regroupe par immeuble ;
2. il cherche dans l'annuaire des entreprises (recherche-entreprises.api.gouv.fr) les sociétés actives installées à
   chaque adresse, avec leurs dirigeants publiés, et signale les propriétaires probables (SCI, sociétés civiles,
   activités immobilières 68.xx) ; au delà de 30 sociétés, l'adresse est marquée « domiciliation probable ».

Aucun email n'est deviné : l'annuaire n'en donne pas. La routine cherche seulement l'adresse générique que la
société publie elle même sur son site (contact@, info@), et ne prépare que des brouillons Gmail que Samy envoie.

Le résultat contient des noms de dirigeants : il s'écrit hors du dépôt (dossier temporaire), jamais ici, le dépôt
étant public. Les suivis vivent dans la feuille Google « Trudaines prospection », onglets `Untitled` (immeubles) et
`Sociétés DPE` (sociétés, emails, statuts).

```
python3 -I scripts/prospection/dpe-immeubles.py --sortie /tmp/dpe.json --deja /tmp/deja.txt
```
