// ===== AniList API Configuration =====
export const ANILIST_API_URL = 'https://graphql.anilist.co';

// ===== GraphQL Queries =====
export const QUERIES = {
  trending: `query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id title { romaji english } coverImage { large extraLarge }
        bannerImage averageScore popularity genres status format
        episodes duration season seasonYear studios { nodes { name } }
      }
    }
  }`,

  popular: `query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`,

  popularThisYear: `query ($year: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, seasonYear: $year, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large extraLarge }
        bannerImage averageScore genres status episodes
      }
    }
  }`,

  seasonal: `query ($year: Int, $season: MediaSeason, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(seasonYear: $year, season: $season, type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore status episodes genres
      }
    }
  }`,

  search: `query ($search: String, $genre: String, $genre_in: [String], $year: Int, $status: MediaStatus, $format: MediaFormat, $sort: [MediaSort], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(search: $search, genre: $genre, genre_in: $genre_in, seasonYear: $year, status: $status, format: $format, type: ANIME, sort: $sort) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes format
      }
    }
  }`,

  details: `query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id title { romaji english native } description
      coverImage { large extraLarge } bannerImage
      averageScore popularity favourites genres status format
      episodes duration source season seasonYear
      studios { nodes { name } }
      trailer { id site thumbnail }
      externalLinks { site url }
      characters(sort: ROLE, perPage: 12) {
        nodes { id name { full } image { large } }
      }
      staff(sort: RELEVANCE, perPage: 8) {
        edges { role node { id name { full } image { large } } }
      }
      recommendations(perPage: 6) {
        nodes {
          mediaRecommendation {
            id title { romaji } coverImage { large } averageScore
          }
        }
      }
    }
  }`,

  topRated: `query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: SCORE_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`,

  genres: `query { GenreCollection }`,

  searchSuggestions: `query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME) {
        id title { romaji english }
      }
    }
  }`,

  byGenre: `query ($genre: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`,

  byYear: `query ($year: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`,

  byStudio: `query ($studio: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(studio: $studio, type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`
};

// ===== Constants =====
export const GENRES = [
  "Action","Adventure","Comedy","Drama","Romance","Fantasy","Sci-Fi","Horror",
  "Mystery","Thriller","Supernatural","Psychological","Slice of Life","Sports",
  "Mecha","Ecchi","Harem","Yaoi","Yuri","Isekai","Mahou Shoujo","Music",
  "Historical","Martial Arts","Military","School","Gore","Parody","Samurai",
  "Vampire","Demons","Magic","War","Post-Apocalyptic","Cyberpunk","Space",
  "Time Travel","Cooking","Game","Super Power","Cars","Kids","Neo-noir",
  "Philosophical","Survival","Suspense","Western","Villainess","Coming-of-age",
  "Epic","Girls with guns","Sentai","Sword and sorcery","Crossover"
];

export const GENRE_ICONS = {
  "Action":"⚔️","Adventure":"🗺️","Comedy":"😂","Drama":"🎭","Romance":"💕",
  "Fantasy":"🧙","Sci-Fi":"🚀","Horror":"👻","Mystery":"🔍","Thriller":"😱",
  "Supernatural":"👻","Psychological":"🧠","Slice of Life":"🌸","Sports":"⚽",
  "Mecha":"🤖","Ecchi":"😏","Harem":"💕","Yaoi":"💙","Yuri":"💗","Isekai":"🌀",
  "Mahou Shoujo":"✨","Music":"🎵","Historical":"📜","Martial Arts":"🥋",
  "Military":"🎖️","School":"🏫","Gore":"🩸","Parody":"🤡","Samurai":"⚔️",
  "Vampire":"🧛","Demons":"😈","Magic":"🪄","War":"💥","Post-Apocalyptic":"☢️",
  "Cyberpunk":"🌃","Space":"🌌","Time Travel":"⏰","Cooking":"🍳","Game":"🎮",
  "Super Power":"💪","Cars":"🏎️","Kids":"👶","Neo-noir":"🕵️","Philosophical":"🤔",
  "Survival":"🏕️","Suspense":"😰","Western":"🤠","Villainess":"👸",
  "Coming-of-age":"🌱","Epic":"🏔️","Girls with guns":"🔫","Sentai":"🦸",
  "Sword and sorcery":"🗡️","Crossover":"🔗"
};

export const STUDIO_LIST = [
  "Toei Animation","Madhouse","Bones","Kyoto Animation","Sunrise",
  "Production I.G","A-1 Pictures","MAPPA","Wit Studio","Studio Pierrot",
  "ufotable","Shaft","CloverWorks","Trigger","Lerche","White Fox",
  "J.C.Staff","David Production","Studio Deen","Silver Link",
  "OLM","TMS Entertainment","P.A. Works","8bit","C2C"
];

export const YEARS = Array.from({length: 50}, (_, i) => new Date().getFullYear() - i);
export const SEASONS = ["WINTER","SPRING","SUMMER","FALL"];

export const STATUSES = [
  { value: "FINISHED", label: "Finished" },
  { value: "RELEASING", label: "Releasing" },
  { value: "NOT_YET_RELEASED", label: "Not Yet Released" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "HIATUS", label: "Hiatus" }
];

export const FORMATS = [
  { value: "TV", label: "TV" },
  { value: "TV_SHORT", label: "TV Short" },
  { value: "MOVIE", label: "Movie" },
  { value: "SPECIAL", label: "Special" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "MUSIC", label: "Music" }
];

export const SEASON_ICONS = { WINTER: "❄️", SPRING: "🌸", SUMMER: "☀️", FALL: "🍂" };
export const SEASON_NAMES = { WINTER: "Winter", SPRING: "Spring", SUMMER: "Summer", FALL: "Fall" };

export const SEARCH_HISTORY_KEY = 'aniclone_search_history';
export const MAX_SEARCH_HISTORY = 5;
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
