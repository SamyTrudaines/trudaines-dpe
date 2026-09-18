import { cabinet } from '../data/site';

const url = cabinet.domaine;

export const agenceSchema = (noteMoyenne?: { note: number; nombre: number }) => ({
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  '@id': `${url}/#cabinet`,
  name: 'Trudaines Immobilier',
  alternateName: 'Trudaines',
  url,
  logo: `${url}/images/logo.svg`,
  image: `${url}/images/og-trudaines.jpg`,
  description:
    "Cabinet de vente immobilière à Paris 9e nord, Montmartre et Paris 10e. Estimation, vente et gestion locative d'appartements.",
  telephone: cabinet.telephoneLien,
  email: cabinet.email,
  founder: { '@type': 'Person', name: cabinet.fondateur },
  address: {
    '@type': 'PostalAddress',
    streetAddress: cabinet.adresse,
    addressLocality: 'Paris',
    postalCode: cabinet.codePostal,
    addressCountry: 'FR',
  },
  geo: { '@type': 'GeoCoordinates', latitude: cabinet.latitude, longitude: cabinet.longitude },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '20:00',
    },
  ],
  areaServed: [
    { '@type': 'City', name: 'Paris 9e arrondissement' },
    { '@type': 'City', name: 'Paris 18e arrondissement' },
    { '@type': 'City', name: 'Paris 10e arrondissement' },
  ],
  priceRange: '300000 - 1500000 EUR',
  ...(noteMoyenne && noteMoyenne.nombre > 0
    ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: noteMoyenne.note.toFixed(1),
          reviewCount: noteMoyenne.nombre,
          bestRating: '5',
        },
      }
    : {}),
});

export const filAriane = (elements: { nom: string; url: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: elements.map((e, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: e.nom,
    item: `${url}${e.url}`,
  })),
});

export const faqSchema = (questions: { question: string; reponse: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: questions.map((q) => ({
    '@type': 'Question',
    name: q.question,
    acceptedAnswer: { '@type': 'Answer', text: q.reponse },
  })),
});
