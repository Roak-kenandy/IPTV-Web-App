export interface MenuItem {
  id: string
  label: string
  icon: string
  route: 'tv' | 'movies' | 'about' | 'section'
}

export interface DetailRow {
  label: string
  valueHtml: string
}

export interface SectionItem {
  name: string
  descriptionHtml: string
  image: string
  video: string
  qr: string
  qrCaption: string
  detailsLabel?: string
  details: DetailRow[]
}

export interface Section {
  title: string
  kind: 'facility' | 'dining'
  items: SectionItem[]
}

export interface Channel {
  id: string
  name: string
  category: string
  image: string
  video?: string
}

export interface Movie {
  id: string
  title: string
  year: number
  duration: string
  rating: string
  cast: string
  description: string
  thumbnail: string
  poster: string
  trailer: string
  video: string
}

export interface Movies {
  title: string
  subtitle: string
  detailsSubtitle: string
  castLabel: string
  trailerLabel: string
  watchLabel: string
  hints: Record<'select' | 'navigate' | 'choose' | 'play' | 'pause' | 'seek' | 'back' | 'stop', string>
  categories: { name: string; movies: Movie[] }[]
}

export interface Content {
  roomNumber: string
  guestName: string
  theme: Record<string, string>
  logo: string
  appBar: { roomIcon: string; timeIcon: string; dateIcon: string }
  footer: { guide: string; homeIcon: string; tvIcon: string }
  drawerBackText: string
  welcome: {
    title: string
    video: string
    image: string
  }
  home: { slideIntervalSec: number; slides: string[]; music?: string; menu: MenuItem[] }
  sections: Record<string, Section>
  tv: { instruction: string; categories: string[]; channels: Channel[] }
  movies: Movies
  about: {
    name: string
    descriptionHtml: string
    image: string
    website: string
    websiteLabel: string
    qrCaption: string
    socials: { name: string; icon: string; url: string }[]
  }
}

export type Route =
  | { name: 'welcome' }
  | { name: 'home' }
  | { name: 'tv' }
  | { name: 'movies' }
  | { name: 'about' }
  | { name: 'section'; id: string }

export type RemoteKey = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'chup' | 'chdown'
