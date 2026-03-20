// Sticker packs — using free open-source Telegram-compatible sticker URLs
// In production these would be uploaded to Cloudinary

export interface Sticker {
  id: string;
  url: string;
  alt: string;
  pack: string;
}

export interface StickerPack {
  id: string;
  name: string;
  emoji: string;
  stickers: Sticker[];
}

// Using publicly available emoji-style sticker images from open sources
export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'reactions',
    name: 'Reactions',
    emoji: '😄',
    stickers: [
      { id: 'r1', pack: 'reactions', alt: 'Thumbs up',    url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp' },
      { id: 'r2', pack: 'reactions', alt: 'Heart',        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp' },
      { id: 'r3', pack: 'reactions', alt: 'Fire',         url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp' },
      { id: 'r4', pack: 'reactions', alt: 'Party',        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp' },
      { id: 'r5', pack: 'reactions', alt: 'Clap',         url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.webp' },
      { id: 'r6', pack: 'reactions', alt: 'Cry laugh',    url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp' },
      { id: 'r7', pack: 'reactions', alt: 'Mind blown',   url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.webp' },
      { id: 'r8', pack: 'reactions', alt: 'Rocket',       url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp' },
      { id: 'r9', pack: 'reactions', alt: 'Wave',         url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.webp' },
      { id: 'r10', pack: 'reactions', alt: 'Hundred',     url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.webp' },
      { id: 'r11', pack: 'reactions', alt: 'OK hand',     url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44c/512.webp' },
      { id: 'r12', pack: 'reactions', alt: 'Star struck',  url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.webp' },
    ],
  },
  {
    id: 'animals',
    name: 'Animals',
    emoji: '🐶',
    stickers: [
      { id: 'a1', pack: 'animals', alt: 'Dog',       url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.webp' },
      { id: 'a2', pack: 'animals', alt: 'Cat',       url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f431/512.webp' },
      { id: 'a3', pack: 'animals', alt: 'Fox',       url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f98a/512.webp' },
      { id: 'a4', pack: 'animals', alt: 'Panda',     url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43c/512.webp' },
      { id: 'a5', pack: 'animals', alt: 'Penguin',   url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f427/512.webp' },
      { id: 'a6', pack: 'animals', alt: 'Frog',      url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f438/512.webp' },
      { id: 'a7', pack: 'animals', alt: 'Owl',       url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f989/512.webp' },
      { id: 'a8', pack: 'animals', alt: 'Unicorn',   url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.webp' },
      { id: 'a9', pack: 'animals', alt: 'Dragon',    url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f432/512.webp' },
      { id: 'a10', pack: 'animals', alt: 'Shark',    url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f988/512.webp' },
      { id: 'a11', pack: 'animals', alt: 'Octopus',  url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f419/512.webp' },
      { id: 'a12', pack: 'animals', alt: 'Turtle',   url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f422/512.webp' },
    ],
  },
  {
    id: 'food',
    name: 'Food',
    emoji: '🍕',
    stickers: [
      { id: 'f1', pack: 'food', alt: 'Pizza',     url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f355/512.webp' },
      { id: 'f2', pack: 'food', alt: 'Burger',    url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f354/512.webp' },
      { id: 'f3', pack: 'food', alt: 'Sushi',     url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f363/512.webp' },
      { id: 'f4', pack: 'food', alt: 'Taco',      url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f32e/512.webp' },
      { id: 'f5', pack: 'food', alt: 'Cake',      url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f370/512.webp' },
      { id: 'f6', pack: 'food', alt: 'Avocado',   url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f951/512.webp' },
      { id: 'f7', pack: 'food', alt: 'Coffee',    url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2615/512.webp' },
      { id: 'f8', pack: 'food', alt: 'Boba',      url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f9cb/512.webp' },
      { id: 'f9', pack: 'food', alt: 'Ramen',     url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f35c/512.webp' },
      { id: 'f10', pack: 'food', alt: 'Donut',    url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f369/512.webp' },
      { id: 'f11', pack: 'food', alt: 'Ice cream', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f368/512.webp' },
      { id: 'f12', pack: 'food', alt: 'Watermelon', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f349/512.webp' },
    ],
  },
];

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
