# Modèles maîtres, relances & script d'appel — Trudaines

Variables de personnalisation (champs de fusion) :
`{{ETABLISSEMENT}}` · `{{GESTIONNAIRE}}` · `{{ADRESSE}}` · `{{ARRONDISSEMENT}}` · `{{ACCROCHE}}` · `{{SPECIALITE}}`

---

## 🟦 EMAIL 1 — Premier contact (modèle maître)

**Objet :** Accompagner vos familles dans un moment délicat — {{ETABLISSEMENT}}

> Bonjour,
>
> {{ACCROCHE}}
>
> Je me permets de vous écrire car, dans votre métier, vous accompagnez chaque jour des familles à un moment de bascule : l'entrée d'un parent en établissement. Et derrière ce moment se cache souvent une question lourde et anxiogène pour elles — que faire du logement, comment financer l'accueil, comment préparer la transmission sans abîmer l'équilibre familial ni la sérénité de la personne.
>
> Je m'appelle Samy Santamarina, je dirige **Trudaines**. Mon métier n'est pas de « vendre de l'immobilier » : c'est d'accompagner ces familles avec une approche de conseil, d'écoute, et une vraie expertise du droit de la famille et du patrimoine. L'objectif est simple : que la personne reste au centre, que la transmission se fasse sereinement, et que vos résidents et leurs proches soient déchargés de cette angoisse.
>
> Beaucoup de directeurs et d'équipes sociales me disent à quel point disposer d'un interlocuteur de confiance sur ces sujets soulage les familles — et leur facilite, à eux aussi, l'accompagnement.
>
> Seriez-vous disponible **30 minutes** pour en échanger, sans aucun engagement ? Vous pouvez choisir directement un créneau ici :
> 👉 https://calendar.app.google/6PUSSyjkwazbJHRo9
>
> Avec toute ma considération pour le travail que vous menez auprès de vos résidents,
>
> **Samy Santamarina**
> Trudaines — Conseil patrimonial & immobilier, approche humaine
> 📞 06 20 46 59 12 · ✉️ samy.santamarina@trudaines.com
>
> *Message professionnel adressé à {{ETABLISSEMENT}}. Si vous ne souhaitez pas être recontacté, répondez simplement « stop » à cet email et je n'en ferai rien d'autre.*

---

## 🟩 EMAIL 2 — Relance à J+5 / J+6 (nouvel angle : l'atelier gratuit)

**Objet :** Une idée concrète pour les familles de {{ETABLISSEMENT}}

> Bonjour,
>
> Je reviens vers vous brièvement. Plutôt qu'un simple échange, je peux aussi vous proposer quelque chose de concret et **entièrement gratuit pour vos familles** : un court atelier (ou une permanence ponctuelle) sur le thème *« Bien préparer la transmission et le financement de l'accueil d'un proche »*.
>
> C'est souvent un vrai soulagement pour les proches : ils repartent avec des repères clairs sur la vente ou la conservation du logement, la succession, la donation — et beaucoup moins d'anxiété.
>
> Si l'idée vous parle, réservons 30 minutes pour la calibrer ensemble :
> 👉 https://calendar.app.google/6PUSSyjkwazbJHRo9
>
> Bien à vous,
> **Samy Santamarina** — Trudaines · 📞 06 20 46 59 12

---

## �amber EMAIL 3 — Email de rupture à J+12 (celui qui convertit le plus)

**Objet :** Je n'insiste pas — la porte reste ouverte

> Bonjour,
>
> Je ne veux surtout pas encombrer votre boîte mail : c'est mon dernier message. Je sais combien votre quotidien auprès de vos résidents est prenant.
>
> Si un jour une famille de {{ETABLISSEMENT}} se trouve démunie face à la vente d'un logement ou à une succession à préparer, pensez simplement à moi : je serai là, avec écoute et bienveillance, pour l'accompagner.
>
> Je vous laisse mes coordonnées, et vous souhaite le meilleur dans votre belle mission.
>
> **Samy Santamarina** — Trudaines
> 📞 06 20 46 59 12 · ✉️ samy.santamarina@trudaines.com · 🗓️ https://calendar.app.google/6PUSSyjkwazbJHRo9

---

## 📞 Script d'appel téléphonique (pour relancer un email resté sans réponse)

**Accroche (15 sec)** :
> « Bonjour, Samy Santamarina de Trudaines. Je ne vous dérange pas longtemps. Je vous ai écrit la semaine dernière — j'accompagne les familles de vos résidents quand se pose la question du logement ou de la succession au moment de l'entrée en établissement. Est-ce que c'est vous qui suivez ces sujets, ou plutôt votre assistante sociale / responsable des admissions ? »

**Si bon interlocuteur** :
> « En deux mots : mon rôle, c'est de soulager les familles sur ces décisions patrimoniales souvent angoissantes, avec une approche de conseil et une expertise du droit de la famille. Beaucoup d'établissements trouvent utile d'avoir un interlocuteur de confiance à recommander. Je vous propose un café de 30 minutes, sans engagement — qu'en pensez-vous ? »

**Si "on n'a pas le droit / ça ne nous intéresse pas"** :
> « Je comprends tout à fait, et je ne vous demande aucune contrepartie. Mon offre la plus simple, c'est un atelier gratuit pour vos familles. Si ça peut leur rendre service, je suis à disposition. Je vous laisse mon numéro. »

**Objections fréquentes & réponses**
- *« On ne peut pas favoriser un prestataire »* → « Bien sûr, je ne vous demande aucune exclusivité ni recommandation nominative — juste d'être une ressource parmi d'autres que les familles peuvent solliciter si elles le souhaitent. »
- *« Envoyez une doc »* → « Avec plaisir. Pour être utile et pas juste un mail de plus, je vous appelle 5 minutes après pour voir ce qui colle à votre établissement ? »
- *« On verra plus tard »* → « Parfait, je vous recale ça dans deux mois. Bonne continuation à vous et vos équipes. »

---

## ✅ Checklist avant envoi de masse
- [ ] SPF + DKIM + DMARC actifs sur `trudaines.com`
- [ ] Emails « à reconfirmer » revérifiés sur la page contact (1 clic) ou par appel
- [ ] 20–30 envois/jour max au démarrage, montée en charge progressive
- [ ] Créneaux mardi→jeudi 8h–10h / 17h–18h30
- [ ] Relances programmées J+5 et J+12
- [ ] Tableur de suivi (statut : envoyé / ouvert / répondu / RDV pris)
