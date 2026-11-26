# Licensing in one page

Each kind of thing in this project has the licence that fits it. Short version:

| What | Licence | In plain words |
|---|---|---|
| **Source code**: the app, scripts, themes, interface translations | [AGPL-3.0-or-later](LICENSES/AGPL-3.0-or-later.txt) | Use, study, change and share freely. If you run a modified version as a service, you must offer its users the modified source. |
| **Documentation**: `docs/`, README, guides | [CC BY-SA 4.0](LICENSES/CC-BY-SA-4.0.txt) | Copy and adapt with credit. Share your adaptation under the same terms. |
| **Fill-in templates**: privacy policy, impact assessment | [CC BY 4.0](LICENSES/CC-BY-4.0.txt) | Copy and adapt with credit. Your adapted copy is yours, with no sharing obligation. |
| **Bundled fonts** | [SIL OFL 1.1](LICENSES/OFL-1.1.txt) | Use and redistribute. Each font keeps its own notice. |
| **Name and logo** | [Not open](LICENSES/LicenseRef-Qohesion-Brand.txt) | You may refer to the project and show the logo unmodified to say you use Qohesion. Do not present your own product or service as Qohesion. A [draft policy](docs/trademark-policy.md) gives the detail. |
| **Your organization's data** on any installation | Yours | We never claim it. For the hosted service, see the [terms of use](docs/terms-of-use.md). |

## Why not Creative Commons for the code?

Creative Commons licences are made for creative works. They say nothing about source code, patents or the obligation to share modifications, and Creative Commons itself recommends against using them for software. So the code uses a software licence, and Creative Commons covers the documents.

## Why AGPL for the code?

Qohesion handles votes, so people must be able to inspect what runs. The AGPL closes a gap that ordinary open-source licences leave open: anyone who changes the code and offers it as a hosted service, including the official one, must publish those changes. That keeps every host, ours included, on the same footing, and it is what lets members trust a result without trusting a particular host.

"Or later" means you may also use the code under any later AGPL version published by the Free Software Foundation.

## The hosted service

Running Qohesion on your own server is free and always will be. The official hosted service has its own [terms of use](docs/terms-of-use.md). Paying for it never unlocks features: there is one codebase, under the licences above.

## Contributing

You keep the copyright on what you write and license it under the licences above. To say so, sign your commits (`git commit -s`), which certifies the [Developer Certificate of Origin](https://developercertificate.org). See [CONTRIBUTING.md](CONTRIBUTING.md).

Interface translations belong to the software (AGPL). Translations of documents follow the documentation licence.

## Machine-readable

This repository follows the [REUSE](https://reuse.software) specification: [`REUSE.toml`](REUSE.toml) maps every path to its licence and [`LICENSES/`](LICENSES/) holds each licence text.

---

## En bref (français)

| Élément | Licence | En clair |
|---|---|---|
| **Code source** (application, scripts, thèmes, traductions de l’interface) | AGPL-3.0 ou ultérieure | Utilisez, étudiez, modifiez et partagez librement. Si vous exploitez une version modifiée comme service, vous devez en offrir le code source à ses utilisateurs. |
| **Documentation** | CC BY-SA 4.0 | Copiez et adaptez en citant la source. Partagez votre adaptation aux mêmes conditions. |
| **Modèles à remplir** (politique de confidentialité, évaluation des facteurs relatifs à la vie privée) | CC BY 4.0 | Copiez et adaptez en citant la source. Votre version vous appartient, sans obligation de la partager. |
| **Polices** | SIL OFL 1.1 | Utilisation et redistribution libres. |
| **Nom et logo** | Non libres | Vous pouvez mentionner le projet et montrer le logo tel quel pour dire que vous utilisez Qohesion. Ne présentez pas votre propre produit ou service comme étant Qohesion. Une [ébauche de politique](docs/trademark-policy.md) donne le détail. |
| **Les données de votre organisation** | Les vôtres | Nous ne les revendiquons jamais. Pour le service hébergé, voir les [conditions d’utilisation](docs/terms-of-use.md). |

Les licences Creative Commons ne conviennent pas au code : elles ne disent rien du code source, des brevets ni du partage des modifications. Le code est donc sous AGPL, et Creative Commons couvre les documents.

Cette page ne remplace pas un avis juridique.
