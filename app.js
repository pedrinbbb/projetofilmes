/* =============================================
   GOATCINE — App Logic
   ============================================= */

// ---- MOVIE DATABASE ----
const MOVIES = {
  trending: [
    {
      id: 1,
      title: "Dune: Part Two",
      year: 2024,
      duration: "2h 46min",
      rating: 8.5,
      genre: "Ficção Científica",
      desc: "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família. Confrontando uma escolha entre o amor de sua vida e o destino do universo, ele se esforça para evitar um futuro terrível.",
      poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
      director: "Denis Villeneuve",
      cast: "Timothée Chalamet, Zendaya, Rebecca Ferguson",
      category: "trending"
    },
    {
      id: 2,
      title: "Oppenheimer",
      year: 2023,
      duration: "3h 0min",
      rating: 8.3,
      genre: "Drama / História",
      desc: "A história do físico J. Robert Oppenheimer e seu papel no desenvolvimento da primeira bomba atômica durante a Segunda Guerra Mundial. Uma obra-prima cinematográfica de Christopher Nolan.",
      poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
      director: "Christopher Nolan",
      cast: "Cillian Murphy, Emily Blunt, Matt Damon",
      category: "trending"
    },
    {
      id: 3,
      title: "Poor Things",
      year: 2023,
      duration: "2h 21min",
      rating: 8.0,
      genre: "Fantasia / Drama",
      desc: "A incrível história de Bella Baxter, uma jovem mulher trazida de volta à vida pelo brilhante e incomum cientista Dr. Godwin Baxter. Sob a proteção de Baxter, Bella anseia por aprender.",
      poster: "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXIf8XMjUZbCIOI.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/5YZbUmjbMa3ClvSoRdnMYJi7LVKS.jpg",
      director: "Yorgos Lanthimos",
      cast: "Emma Stone, Mark Ruffalo, Willem Dafoe",
      category: "trending"
    },
    {
      id: 4,
      title: "The Batman",
      year: 2022,
      duration: "2h 56min",
      rating: 7.8,
      genre: "Ação / Drama",
      desc: "No segundo ano de Batman patrulhando Gotham, um assassino em série conhecido como Charada começa a deixar pistas enigmáticas, desafiando o Cavaleiro das Trevas a descobrir sua identidade.",
      poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
      director: "Matt Reeves",
      cast: "Robert Pattinson, Zoë Kravitz, Paul Dano",
      category: "trending"
    },
    {
      id: 5,
      title: "Parasite",
      year: 2019,
      duration: "2h 12min",
      rating: 8.5,
      genre: "Thriller / Drama",
      desc: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan. Vencedor do Oscar de Melhor Filme.",
      poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/TU9NIjwzjoKPwQHoKn5HEhkEL3.jpg",
      director: "Bong Joon Ho",
      cast: "Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong",
      category: "trending"
    },
    {
      id: 6,
      title: "Interstellar",
      year: 2014,
      duration: "2h 49min",
      rating: 8.6,
      genre: "Ficção Científica",
      desc: "Equipe de exploradores que viajam por um buraco de minhoca no espaço na tentativa de garantir a sobrevivência da humanidade. Uma jornada épica pelo cosmos com Christopher Nolan.",
      poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
      director: "Christopher Nolan",
      cast: "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
      category: "trending"
    },
    {
      id: 7,
      title: "Past Lives",
      year: 2023,
      duration: "1h 46min",
      rating: 7.9,
      genre: "Romance / Drama",
      desc: "Duas amizades de infância são separadas depois que uma delas emigra da Coreia. Vinte anos depois, eles se reencontram em Nova York por uma semana enquanto confrontam o que poderia ter sido.",
      poster: "https://image.tmdb.org/t/p/w500/k3waqVXSngKtCCpGhRZNsOlCgXB.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/eHMh7kChaNeD4VTdMhZuFlatNSA.jpg",
      director: "Celine Song",
      cast: "Greta Lee, Teo Yoo, John Magaro",
      category: "trending"
    },
    {
      id: 8,
      title: "Everything Everywhere",
      year: 2022,
      duration: "2h 19min",
      rating: 7.8,
      genre: "Ação / Comédia",
      desc: "An aging Chinese immigrant is swept up in an insane adventure, where she alone can save the world by exploring other universes connecting with the lives she could have led.",
      poster: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/feSiISwgEpVzR1v3zv2n2LsbXLC.jpg",
      director: "Daniel Kwan",
      cast: "Michelle Yeoh, Ke Huy Quan, Jamie Lee Curtis",
      category: "trending"
    },
  ],
  new: [
    {
      id: 9,
      title: "Furiosa",
      year: 2024,
      duration: "2h 28min",
      rating: 7.8,
      genre: "Ação / Aventura",
      desc: "A origem de Furiosa desde a terra natal e como ela chegou a governar o War Rig. Uma épica de ação e sobrevivência no mundo pós-apocalíptico de Mad Max.",
      poster: "https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/fqv8v6AycXKsivp1T5yKtLbGXce.jpg",
      director: "George Miller",
      cast: "Anya Taylor-Joy, Chris Hemsworth, Tom Burke",
      category: "new"
    },
    {
      id: 10,
      title: "Civil War",
      year: 2024,
      duration: "1h 49min",
      rating: 7.3,
      genre: "Ação / Drama",
      desc: "A team of military-embedded journalists race against time to reach DC before rebel factions descend upon the White House. Um olhar perturbador sobre um futuro próximo.",
      poster: "https://image.tmdb.org/t/p/w500/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/ugS5FVfCI3RV0ZwZtBV3HAV75OX.jpg",
      director: "Alex Garland",
      cast: "Kirsten Dunst, Wagner Moura, Cailee Spaeny",
      category: "new"
    },
    {
      id: 11,
      title: "Longlegs",
      year: 2024,
      duration: "1h 41min",
      rating: 6.3,
      genre: "Terror / Thriller",
      desc: "Uma agente do FBI é chamada para ajudar a capturar um serial killer solitário. Um thriller psicológico aterrorizante com Nicolas Cage em performance memorável.",
      poster: "https://image.tmdb.org/t/p/w500/qRaa8x5Q2bAZOaOnLm5K7kPHxij.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/3TNSoa0UHGEzEz5WZOE4BtaEsYE.jpg",
      director: "Osgood Perkins",
      cast: "Maika Monroe, Nicolas Cage, Alicia Witt",
      category: "new"
    },
    {
      id: 12,
      title: "Inside Out 2",
      year: 2024,
      duration: "1h 40min",
      rating: 7.5,
      genre: "Animação / Comédia",
      desc: "Riley entra na adolescência e novas emoções surgem na cabeça dela, colocando em risco a harmonia estabelecida pelas emoções originais. Uma sequência emocionante e necessária.",
      poster: "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/tEHbMiMU0wvtinCJzPAZoMRPWNX.jpg",
      director: "Kelsey Mann",
      cast: "Amy Poehler, Maya Hawke, Kensington Tallman",
      category: "new"
    },
    {
      id: 13,
      title: "Alien: Romulus",
      year: 2024,
      duration: "1h 59min",
      rating: 7.3,
      genre: "Terror / Ficção",
      desc: "Um grupo de jovens colonizadores do espaço profundo se veem face a face com a forma de vida mais aterrorizante do universo. Um retorno às origens da franquia Alien.",
      poster: "https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/9SSEUrSqhljBMzRe4aBTh17rUaC.jpg",
      director: "Fede Álvarez",
      cast: "Cailee Spaeny, David Jonsson, Archie Renaux",
      category: "new"
    },
    {
      id: 14,
      title: "Deadpool & Wolverine",
      year: 2024,
      duration: "2h 7min",
      rating: 7.7,
      genre: "Ação / Comédia",
      desc: "Deadpool recruta um relutante Wolverine para uma missão que impacta a história do MCU. O duo mais improvável do cinema em uma aventura caótica e divertida.",
      poster: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
      director: "Shawn Levy",
      cast: "Ryan Reynolds, Hugh Jackman, Emma Corrin",
      category: "new"
    },
    {
      id: 15,
      title: "Challengers",
      year: 2024,
      duration: "2h 11min",
      rating: 7.4,
      genre: "Drama / Romance",
      desc: "A former tennis prodigy turned coach puts her husband and her ex-boyfriend, now rivals, against each other. Um triângulo amoroso servido com tensão e estilo por Luca Guadagnino.",
      poster: "https://image.tmdb.org/t/p/w500/H6vke7MJABMCmBT7Kw4PPZP0XT.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/2rmK7mnchw9Xr3XdiAwdt5OXcIh.jpg",
      director: "Luca Guadagnino",
      cast: "Zendaya, Mike Faist, Josh O'Connor",
      category: "new"
    },
    {
      id: 16,
      title: "Twisters",
      year: 2024,
      duration: "2h 2min",
      rating: 7.2,
      genre: "Ação / Aventura",
      desc: "Kate Cooper, ex-perseguidora de tempestades traumatizada por um incidente no passado, é atraída de volta para as planícies do Oklahoma por seu amigo de infância.",
      poster: "https://image.tmdb.org/t/p/w500/pjnD08FlMAIXsfOLKQbovhFbOpo.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/cOXKUkFKqHQpIVaVZMornoTe6BP.jpg",
      director: "Lee Isaac Chung",
      cast: "Daisy Edgar-Jones, Glen Powell, Anthony Ramos",
      category: "new"
    },
  ],
  action: [
    {
      id: 17,
      title: "Mission: Impossible 7",
      year: 2023,
      duration: "2h 43min",
      rating: 7.7,
      genre: "Ação / Aventura",
      desc: "Ethan Hunt e sua equipe IMF embarcam em sua missão mais perigosa até agora: rastrear uma ameaça de arma nova e terrível antes que ela se espalhe.",
      poster: "https://image.tmdb.org/t/p/w500/NNxYkU70HPurnNCSiCjYAmacwm.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/8Up8DZ8PLRZ23VVUP9mfAzZjRMF.jpg",
      director: "Christopher McQuarrie",
      cast: "Tom Cruise, Hayley Atwell, Ving Rhames",
      category: "action"
    },
    {
      id: 18,
      title: "Top Gun: Maverick",
      year: 2022,
      duration: "2h 10min",
      rating: 8.2,
      genre: "Ação / Drama",
      desc: "Após mais de trinta anos de serviço como um dos principais pilotos da marinha, Pete Mitchell está onde sempre pertenceu, empurrando o envelope como piloto corajoso.",
      poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/AkB5TbGRmItPMNIMODHHCxGBzgs.jpg",
      director: "Joseph Kosinski",
      cast: "Tom Cruise, Miles Teller, Jennifer Connelly",
      category: "action"
    },
    {
      id: 19,
      title: "John Wick 4",
      year: 2023,
      duration: "2h 49min",
      rating: 7.7,
      genre: "Ação / Thriller",
      desc: "John Wick descobre um caminho para derrotar a Alta Mesa. Mas antes de ganhar sua liberdade, Wick deve enfrentar um novo inimigo com alianças poderosas.",
      poster: "https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/aeqZdp31F6VBqWmVYKkacfpj7RZ.jpg",
      director: "Chad Stahelski",
      cast: "Keanu Reeves, Donnie Yen, Bill Skarsgård",
      category: "action"
    },
    {
      id: 20,
      title: "Avatar: The Way of Water",
      year: 2022,
      duration: "3h 12min",
      rating: 7.6,
      genre: "Ficção / Aventura",
      desc: "Jake Sully e Ney'tiri formaram uma família e fazem tudo para ficar juntos. No entanto, eles devem deixar seu lar e explorar as regiões de Pandora.",
      poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/s16H6tpK2utvwDtzZ8Qy8tMp5ED.jpg",
      director: "James Cameron",
      cast: "Sam Worthington, Zoe Saldana, Sigourney Weaver",
      category: "action"
    },
    {
      id: 21,
      title: "Black Panther: Wakanda Forever",
      year: 2022,
      duration: "2h 41min",
      rating: 7.1,
      genre: "Ação / Aventura",
      desc: "A rainha Ramonda, Shuri, M'Baku, Okoye e os Doras Milaje lutam para proteger sua nação das potências mundiais intervencionistas após a morte do rei T'Challa.",
      poster: "https://image.tmdb.org/t/p/w500/sv1xJUazXoQuI2bsktqKkm59SBHH.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/xDMIl84Qo5Tsu62c9DGWhmPI67A.jpg",
      director: "Ryan Coogler",
      cast: "Letitia Wright, Lupita Nyong'o, Angela Bassett",
      category: "action"
    },
    {
      id: 22,
      title: "Gladiator II",
      year: 2024,
      duration: "2h 28min",
      rating: 6.8,
      genre: "Ação / Drama",
      desc: "Anos após os eventos do primeiro Gladiador, Lucio assiste ao Império Romano ser governado por tiranos. Para poder lutar pelos povos de Roma, ele deve entrar no Coliseu.",
      poster: "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/tkm9LkM7RfKpTNqpGKJJ8prIqYR.jpg",
      director: "Ridley Scott",
      cast: "Paul Mescal, Pedro Pascal, Denzel Washington",
      category: "action"
    },
    {
      id: 23,
      title: "The Fall Guy",
      year: 2024,
      duration: "2h 6min",
      rating: 7.2,
      genre: "Ação / Comédia",
      desc: "A stuntman, fresh off an almost career-ending accident, is thrown back into action when the star of a studio's biggest film goes missing.",
      poster: "https://image.tmdb.org/t/p/w500/oBIQDKcqNxKckjugtmzpIIOgoc4.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/H5HjE7Xb9N09rbWn1zBfxgI8uz.jpg",
      director: "David Leitch",
      cast: "Ryan Gosling, Emily Blunt, Winston Duke",
      category: "action"
    },
    {
      id: 24,
      title: "Thor: Love and Thunder",
      year: 2022,
      duration: "1h 59min",
      rating: 6.3,
      genre: "Ação / Fantasia",
      desc: "Thor embarca em uma jornada diferente de tudo que já enfrentou — uma busca pela paz interior. Mas seu retiro é interrompido por um assassino galáctico chamado Gorr.",
      poster: "https://image.tmdb.org/t/p/w500/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg",
      backdrop: "https://image.tmdb.org/t/p/w1280/57lGJCPuMjCDfRGCsJkEwN9XBKJ.jpg",
      director: "Taika Waititi",
      cast: "Chris Hemsworth, Natalie Portman, Christian Bale",
      category: "action"
    },
  ]
};

// Top 10 compiled from best movies
const TOP10 = [
  MOVIES.trending[5], // Interstellar 8.6
  MOVIES.trending[0], // Dune 2 - 8.5
  MOVIES.trending[4], // Parasite - 8.5
  MOVIES.trending[1], // Oppenheimer - 8.3
  MOVIES.action[1],   // Top Gun - 8.2
  MOVIES.trending[2], // Poor Things - 8.0
  MOVIES.trending[6], // Past Lives - 7.9
  MOVIES.trending[3], // The Batman - 7.8
  MOVIES.new[0],      // Furiosa - 7.8
  MOVIES.action[2],   // John Wick 4 - 7.7
];

// Hero slides
const HERO_SLIDES = [
  {
    title: "Dune: Part Two",
    year: 2024,
    duration: "2h 46min",
    rating: 8.5,
    genre: "Ficção Científica",
    desc: "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família. Uma épica jornada cinematográfica.",
    backdrop: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    movieId: 1
  },
  {
    title: "Interstellar",
    year: 2014,
    duration: "2h 49min",
    rating: 8.6,
    genre: "Ficção Científica",
    desc: "Uma equipe de exploradores viaja por um buraco de minhoca no espaço na tentativa de garantir a sobrevivência da humanidade. Uma obra-prima de Christopher Nolan.",
    backdrop: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    movieId: 6
  },
  {
    title: "Oppenheimer",
    year: 2023,
    duration: "3h 0min",
    rating: 8.3,
    genre: "Drama / História",
    desc: "A história do físico J. Robert Oppenheimer e seu papel no desenvolvimento da primeira bomba atômica. Vencedor de 7 Oscars, incluindo Melhor Filme.",
    backdrop: "https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
    movieId: 2
  }
];

// ---- STATE ----
let currentHeroSlide = 0;
let heroInterval = null;
let myList = new Set();
let isSearchOpen = false;

// ---- DOM REFS ----
const $ = (id) => document.getElementById(id);
const loadingScreen = $('loading-screen');
const loadingBar = $('loading-bar');
const navbar = $('navbar');
const searchBar = $('search-bar');
const searchBtn = $('nav-search-btn');
const searchInput = $('search-input');
const searchClose = $('search-close');
const modalOverlay = $('modal-overlay');
const modal = $('modal');
const modalClose = $('modal-close');
const toast = $('toast');
const heroTitle = $('hero-title');
const heroBadge = $('hero-badge');
const heroMeta = $('hero-meta');
const heroDesc = $('hero-desc');
const heroBg = $('hero-bg');
const heroParticles = $('hero-particles');

// ---- LOADING ----
function simulateLoading() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 18 + 4;
    if (progress >= 100) {
      progress = 100;
      loadingBar.style.width = '100%';
      clearInterval(interval);
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        initApp();
      }, 400);
    } else {
      loadingBar.style.width = progress + '%';
    }
  }, 80);
}

// ---- INIT ----
function initApp() {
  createParticles();
  renderCarousel('carousel-trending', MOVIES.trending);
  renderCarousel('carousel-new', MOVIES.new);
  renderCarousel('carousel-action', MOVIES.action);
  renderTop10();
  initCarouselArrows();
  initHeroSlider();
  initNavbar();
  initSearch();
  initModal();
  initCategoryTabs();
  initHeroButtons();
  initSeeAllButtons();
}

// ---- PARTICLES ----
function createParticles() {
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 12 + 8}s;
      animation-delay: ${Math.random() * 10}s;
      --drift: ${(Math.random() - 0.5) * 120}px;
      opacity: 0;
    `;
    heroParticles.appendChild(p);
  }
}

// ---- MOVIE CARD RENDER ----
function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card fade-in';
  card.setAttribute('role', 'listitem');
  card.setAttribute('aria-label', `${movie.title} (${movie.year}) - Avaliação: ${movie.rating}`);
  card.dataset.id = movie.id;

  card.innerHTML = `
    <img class="card-poster" 
         src="${movie.poster}" 
         alt="Poster do filme ${movie.title}"
         loading="lazy"
         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22270%22 viewBox=%220 0 180 270%22><rect width=%22180%22 height=%22270%22 fill=%22%23161616%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23FFD700%22 font-size=%2240%22>🎬</text></svg>'" />
    <div class="card-overlay">
      <div class="card-play-btn" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <polygon points="5,3 19,12 5,21" fill="#000"/>
        </svg>
      </div>
      <div class="card-title">${movie.title}</div>
      <div class="card-rating">⭐ ${movie.rating}</div>
    </div>
    <div class="card-info">
      <div class="card-name">${movie.title}</div>
      <div class="card-year">${movie.year} · ${movie.genre}</div>
    </div>
  `;

  card.addEventListener('click', () => openModal(movie));
  return card;
}

// ---- CAROUSEL RENDER ----
function renderCarousel(carouselId, movies) {
  const carousel = $(carouselId);
  if (!carousel) return;
  carousel.innerHTML = '';
  movies.forEach(m => carousel.appendChild(createMovieCard(m)));
}

// ---- TOP 10 ----
function renderTop10() {
  const grid = $('top10-grid');
  if (!grid) return;
  grid.innerHTML = '';
  TOP10.forEach((movie, idx) => {
    const card = document.createElement('div');
    card.className = 'top10-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `#${idx + 1} ${movie.title}`);
    card.innerHTML = `
      <div class="top10-number">${idx + 1}</div>
      <img class="top10-poster" 
           src="${movie.poster}" 
           alt="Poster do filme ${movie.title}"
           loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22><rect width=%22200%22 height=%22300%22 fill=%22%23161616%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23FFD700%22 font-size=%2248%22>🎬</text></svg>'" />
      <div class="top10-overlay">
        <div class="top10-title">${movie.title}</div>
        <div class="top10-rating">⭐ ${movie.rating}</div>
      </div>
    `;
    card.addEventListener('click', () => openModal(movie));
    grid.appendChild(card);
  });
}

// ---- CAROUSEL ARROWS ----
function initCarouselArrows() {
  const pairs = [
    ['arrow-left-0', 'arrow-right-0', 'carousel-trending'],
    ['arrow-left-1', 'arrow-right-1', 'carousel-new'],
    ['arrow-left-2', 'arrow-right-2', 'carousel-action'],
  ];

  pairs.forEach(([leftId, rightId, carouselId]) => {
    const left = $(leftId);
    const right = $(rightId);
    const carousel = $(carouselId);
    if (!left || !right || !carousel) return;

    const scrollAmount = 600;
    left.addEventListener('click', () => carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
    right.addEventListener('click', () => carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
  });
}

// ---- HERO SLIDER ----
function updateHeroSlide(idx) {
  const slide = HERO_SLIDES[idx];

  // Update background
  heroBg.style.background = `
    linear-gradient(135deg, #1a0e00 0%, #0d0800 30%, #080808 60%, #050505 100%)
  `;

  // Animate content
  const content = document.querySelector('.hero-content');
  content.style.opacity = '0';
  content.style.transform = 'translateY(12px)';

  setTimeout(() => {
    heroTitle.textContent = slide.title;
    heroMeta.innerHTML = `
      <span class="meta-rating">⭐ ${slide.rating}</span>
      <span class="meta-sep">·</span>
      <span class="meta-year">${slide.year}</span>
      <span class="meta-sep">·</span>
      <span class="meta-duration">${slide.duration}</span>
      <span class="meta-sep">·</span>
      <span class="meta-genre">${slide.genre}</span>
    `;
    heroDesc.textContent = slide.desc;

    // Watch button
    const watchBtn = $('hero-watch-btn');
    if (watchBtn) watchBtn.dataset.movieId = slide.movieId;

    content.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';
  }, 200);

  // Update indicators
  document.querySelectorAll('.indicator').forEach((ind, i) => {
    ind.classList.toggle('active', i === idx);
    ind.setAttribute('aria-pressed', i === idx ? 'true' : 'false');
  });

  currentHeroSlide = idx;
}

function initHeroSlider() {
  document.querySelectorAll('.indicator').forEach((ind, i) => {
    ind.addEventListener('click', () => {
      clearInterval(heroInterval);
      updateHeroSlide(i);
      heroInterval = setInterval(() => {
        updateHeroSlide((currentHeroSlide + 1) % HERO_SLIDES.length);
      }, 7000);
    });
  });

  heroInterval = setInterval(() => {
    updateHeroSlide((currentHeroSlide + 1) % HERO_SLIDES.length);
  }, 7000);
}

function initHeroButtons() {
  const watchBtn = $('hero-watch-btn');
  const listBtn = $('hero-list-btn');
  const infoBtn = $('hero-info-btn');

  if (watchBtn) {
    watchBtn.addEventListener('click', () => {
      showToast('▶ Reproduzindo ' + HERO_SLIDES[currentHeroSlide].title + '...');
    });
  }

  if (listBtn) {
    listBtn.addEventListener('click', () => {
      showToast('✓ Adicionado à sua lista!');
    });
  }

  if (infoBtn) {
    infoBtn.addEventListener('click', () => {
      const movie = findMovieById(HERO_SLIDES[currentHeroSlide].movieId);
      if (movie) openModal(movie);
    });
  }
}

// ---- NAVBAR ----
function initNavbar() {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });

  // Mobile hamburger
  const hamburger = $('nav-hamburger');
  const navLinks = $('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.style.display === 'flex';
      navLinks.style.display = isOpen ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '100%';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = 'rgba(8,8,8,0.97)';
      navLinks.style.padding = '16px 24px';
      navLinks.style.borderTop = '1px solid rgba(255,215,0,0.2)';
      hamburger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  }

  // Nav link active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// ---- SEARCH ----
function initSearch() {
  searchBtn.addEventListener('click', () => {
    isSearchOpen = !isSearchOpen;
    searchBar.classList.toggle('open', isSearchOpen);
    if (isSearchOpen) {
      setTimeout(() => searchInput.focus(), 100);
    }
  });

  searchClose.addEventListener('click', () => {
    isSearchOpen = false;
    searchBar.classList.remove('open');
    searchInput.value = '';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isSearchOpen) {
        isSearchOpen = false;
        searchBar.classList.remove('open');
        searchInput.value = '';
      }
      if (modalOverlay.classList.contains('open')) {
        closeModal();
      }
    }
  });

  searchInput.addEventListener('input', debounce((e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) return;

    const allMovies = [...MOVIES.trending, ...MOVIES.new, ...MOVIES.action];
    const found = allMovies.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.genre.toLowerCase().includes(q) ||
      m.director.toLowerCase().includes(q)
    );

    if (found.length > 0) {
      showToast(`🔍 ${found.length} resultado(s) para "${e.target.value}"`);
    }
  }, 500));
}

// ---- CATEGORY TABS ----
function initCategoryTabs() {
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.cat-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
    });
  });
}

// ---- MODAL ----
function findMovieById(id) {
  const allMovies = [...MOVIES.trending, ...MOVIES.new, ...MOVIES.action];
  return allMovies.find(m => m.id === id);
}

function openModal(movie) {
  const modalTitle = $('modal-title');
  const modalDesc = $('modal-desc');
  const modalMeta = $('modal-meta');
  const modalBackdrop = $('modal-backdrop');
  const modalDetailList = $('modal-detail-list');
  const modalSimilarGrid = $('modal-similar-grid');
  const modalWatchBtn = $('modal-watch-btn');
  const modalListBtn = $('modal-list-btn');

  // Set content
  modalTitle.textContent = movie.title;
  modalDesc.textContent = movie.desc;
  modalBackdrop.src = movie.backdrop || movie.poster;
  modalBackdrop.alt = `Imagem de ${movie.title}`;

  modalMeta.innerHTML = `
    <span class="meta-rating">⭐ ${movie.rating}</span>
    <span class="meta-sep">·</span>
    <span class="meta-year">${movie.year}</span>
    <span class="meta-sep">·</span>
    <span class="meta-duration">${movie.duration}</span>
    <span class="meta-sep">·</span>
    <span class="meta-genre">${movie.genre}</span>
  `;

  modalDetailList.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Diretor</span>
      <span class="detail-value">${movie.director}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Elenco</span>
      <span class="detail-value">${movie.cast}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Gênero</span>
      <span class="detail-value">${movie.genre}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Ano</span>
      <span class="detail-value">${movie.year}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Duração</span>
      <span class="detail-value">${movie.duration}</span>
    </div>
  `;

  // Similar movies
  const allMovies = [...MOVIES.trending, ...MOVIES.new, ...MOVIES.action];
  const similar = allMovies.filter(m => m.id !== movie.id && (
    m.genre.split('/')[0].trim() === movie.genre.split('/')[0].trim() ||
    m.category === movie.category
  )).slice(0, 4);

  modalSimilarGrid.innerHTML = '';
  similar.forEach(m => {
    const card = document.createElement('div');
    card.className = 'similar-card';
    card.innerHTML = `
      <img src="${m.poster}" alt="${m.title}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22><rect width=%22200%22 height=%22300%22 fill=%22%23161616%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23FFD700%22 font-size=%2248%22>🎬</text></svg>'" />
      <div class="similar-card-name">${m.title}</div>
    `;
    card.addEventListener('click', () => openModal(m));
    modalSimilarGrid.appendChild(card);
  });

  // Watch & List buttons
  modalWatchBtn.onclick = () => {
    showToast(`▶ Reproduzindo ${movie.title}...`);
    closeModal();
  };

  modalListBtn.onclick = () => {
    if (myList.has(movie.id)) {
      myList.delete(movie.id);
      showToast(`✕ Removido da sua lista`);
    } else {
      myList.add(movie.id);
      showToast(`✓ ${movie.title} adicionado à lista!`);
    }
  };

  // Show modal
  modalOverlay.classList.add('open');
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.scrollTop = 0;
}

function closeModal() {
  modalOverlay.classList.remove('open');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initModal() {
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

// ---- TOAST ----
let toastTimeout;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ---- UTILS ----
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ---- SEE ALL buttons ----
function initSeeAllButtons() {
  ['see-all-trending', 'see-all-new', 'see-all-top10', 'see-all-action'].forEach(id => {
    const btn = $(id);
    if (btn) btn.addEventListener('click', () => showToast('📽 Carregando catálogo completo...'));
  });

  const explorBtn = $('originals-explore-btn');
  if (explorBtn) explorBtn.addEventListener('click', () => showToast('🏆 Explorando GOATCINE Originais...'));
}

// ---- USER SESSION ----
function initUserSession() {
  try {
    const user = JSON.parse(localStorage.getItem('goatcine_user'));
    if (!user) return;

    // Update avatar letter
    const avatarLetter = $('nav-avatar-letter');
    if (avatarLetter) {
      avatarLetter.textContent = (user.avatar || user.name?.[0] || 'G').toUpperCase();
    }

    // Logout on avatar click
    const avatar = $('nav-avatar');
    if (avatar) {
      // Dropdown-style tooltip hint
      avatar.style.cursor = 'pointer';
      avatar.addEventListener('click', () => {
        const confirmed = confirm(`👋 Sair da conta?\n\nUsuário: ${user.name}\nEmail: ${user.email}`);
        if (confirmed) {
          localStorage.removeItem('goatcine_user');
          showToast('👋 Até logo! Redirecionando...');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1200);
        }
      });
    }
  } catch (e) {
    // If session is corrupt, redirect to login
    localStorage.removeItem('goatcine_user');
    window.location.href = 'login.html';
  }
}

// ---- START ----
document.addEventListener('DOMContentLoaded', () => {
  initUserSession();
  simulateLoading();
});

