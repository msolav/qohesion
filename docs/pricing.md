# Pricing tiers (draft) / Tarifs (ébauche)

## English

Draft, proposed in [ADR 0006](adr/0006-pricing-and-limits.md). The hosted service does not exist yet, nothing can be purchased, and the prices are a starting point that is not final. Amounts are in Canadian dollars, before tax. This page describes planned offers.

### The offers

| | Free | Event pass | Self-hosted |
|---|---|---|---|
| Price | $0 | One payment per voting event, by size (see below) | $0 for the software |
| Used for | Small polls | A vote or poll on the hosted service, up to 5,000 addresses on the roll | Running the software on the organization's own server |
| Roll size | Up to 50 participants a poll | Up to the size paid for | No limit set by the software |
| Events | As many as the monthly allowance of verification emails permits | One event per pass | No limit set by the software |
| Verification emails | One per participant, within the monthly allowance | One per participant, included [reminders: to define] | Sent through the organization's own SMTP service |
| Features | All | All | All |
| Where data is kept | The hosted service [location: to define] | The hosted service [location: to define] | The organization's own server |
| Support | Public issue tracker | Email [response time: to define] | Public issue tracker. Paid support is quoted |

### Event pass sizes

The size is the number of addresses on the roll.

| Addresses on the roll | Price |
|---|---|
| Up to 100 | $19 |
| Up to 300 | $39 |
| Up to 1,000 | $99 |
| Up to 5,000 | $249 |
| More than 5,000 | Quoted |

### The same in every offer

- The software and all of its features. A payment changes limits, hosting and support. It never unlocks a feature.
- The licence: the code is under the AGPL-3.0-or-later, and the [terms of use](terms-of-use.md) allow an organization to close its account and export all of its data at any time.
- Receipt codes and verification of the result.

### What counts as an event

An event is one vote or poll with its roll, open for at most [30 days]. A second vote with the same roll is a second event. [To define: whether the pass covers a second round of the same vote.]

### Not decided

- Whether the size is fixed at payment or moves up if late additions exceed it.
- A discount for volunteer-run groups, and what proves eligibility.
- Display of taxes.
- An annual plan, which is not offered at launch.

The reasoning, the figures that support the prices and the open questions are in [ADR 0006](adr/0006-pricing-and-limits.md).

---

## Français

Ébauche, proposée dans l’[ADR 0006](adr/0006-pricing-and-limits.md) (en anglais). Le service hébergé n’existe pas encore, rien ne peut être acheté, et les prix sont un point de départ, non définitif. Les montants sont en dollars canadiens, avant taxes. Cette page décrit des offres prévues.

### Les offres

| | Gratuit | Forfait par scrutin | Auto-hébergé |
|---|---|---|---|
| Prix | 0 $ | Un paiement par scrutin, selon la taille (voir plus bas) | 0 $ pour le logiciel |
| Utilisation | Les petits sondages | Un vote ou un sondage sur le service hébergé, jusqu’à 5 000 adresses sur la liste | Faire fonctionner le logiciel sur le serveur de l’organisation |
| Taille de la liste | Jusqu’à 50 participants par scrutin | Jusqu’à la taille payée | Aucune limite fixée par le logiciel |
| Scrutins | Autant que l’allocation mensuelle de courriels de vérification le permet | Un scrutin par forfait | Aucune limite fixée par le logiciel |
| Courriels de vérification | Un par participant, dans la limite de l’allocation mensuelle | Un par participant, inclus [rappels: à définir] | Envoyés par le service de courriel de l’organisation |
| Fonctions | Toutes | Toutes | Toutes |
| Lieu de conservation des données | Le service hébergé [lieu: à définir] | Le service hébergé [lieu: à définir] | Le serveur de l’organisation |
| Soutien | Suivi public des problèmes | Courriel [délai de réponse: à définir] | Suivi public des problèmes. Le soutien payant est offert sur soumission |

### Tailles du forfait par scrutin

La taille correspond au nombre d’adresses sur la liste des votants.

| Adresses sur la liste | Prix |
|---|---|
| Jusqu’à 100 | 19 $ |
| Jusqu’à 300 | 39 $ |
| Jusqu’à 1 000 | 99 $ |
| Jusqu’à 5 000 | 249 $ |
| Plus de 5 000 | Sur soumission |

### Identique dans toutes les offres

- Le logiciel et toutes ses fonctions. Un paiement change les limites, l’hébergement et le soutien. Il ne débloque jamais une fonction.
- La licence: le code est sous AGPL-3.0 ou ultérieure, et les [conditions d’utilisation](terms-of-use.md) permettent à une organisation de fermer son compte et d’exporter toutes ses données en tout temps.
- Les codes de reçu et la vérification du résultat.

### Ce qu’est un scrutin

Un scrutin est un vote ou un sondage avec sa liste de votants, ouvert au plus [30 jours]. Un second vote avec la même liste est un second scrutin. [À définir: si le forfait couvre un second tour du même vote.]

### Points à décider

- Si la taille est fixée au paiement ou si elle monte quand les ajouts tardifs la dépassent.
- Un rabais pour les groupes bénévoles, et la preuve d’admissibilité.
- L’affichage des taxes.
- Un forfait annuel, qui n’est pas offert au lancement.

Le raisonnement, les chiffres qui appuient les prix et les questions ouvertes figurent dans l’[ADR 0006](adr/0006-pricing-and-limits.md) (en anglais).
