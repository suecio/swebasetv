import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// 1. Firebase-konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyCIhHn43vsrzHFOmaTIRE7vWHTptgoWNJ4",
  authDomain: "swebasetv.firebaseapp.com",
  projectId: "swebasetv",
  storageBucket: "swebasetv.firebasestorage.app",
  messagingSenderId: "951909848848",
  appId: "1:951909848848:web:c84ab1c92001bf74a3b795"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. YouTube-konfiguration (Nyckel hämtas från GitHub Secrets)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// 3. De aktuella kanalerna för lagen
const CHANNELS = [
  { id: "UCcjCxWAhhHgdqRqtUfAPahg", teamName: "Sundbyberg" },
  { id: "UCz_f37hbWTXGIBJsAHm-oIw", teamName: "Stockholm" },
  { id: "UCezpHWTtnumh9jaE2ghxseg", teamName: "Gefle" },
  { id: "UCkpMvl5JmjD1ox5t8ZQsHhA", teamName: "Rättvik" },
  { id: "UCRuzEIjH2RjQdIl7s2aTpvg", teamName: "Karlskoga" },
  { id: "UCkGcX-HoODvO7dzNxd4zY5Q", teamName: "Leksand" },
  { id: "UC1v9Z1hWzi6UGjvRsiTE_vg", teamName: "Swe3 förbundet" },
  { id: "UCYWvkaR-99U-d64ea3tdCmQ", teamName: "Skövde" },
  { id: "UCi9Dsmn-DYWorA_nOf-W-5A", teamName: "Sölvesborg" },
  { id: "UCRWuifSS5gbBo4ua9W2BvlA", teamName: "Umeå" }
];

async function fetchGames() {
  console.log("Startar synkronisering med YouTube...");

  for (const channel of CHANNELS) {
    // Kolla efter pågående (live) sändningar
    await fetchAndSave(channel, 'live');
    // Kolla efter kommande (upcoming) sändningar
    await fetchAndSave(channel, 'upcoming');
  }

  console.log("Synkronisering slutförd!");
  process.exit(0);
}

async function fetchAndSave(channel, status) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&eventType=${status}&type=video&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const videoId = item.id.videoId;
        const title = item.snippet.title;

        // --- NY KOD: Hämta exakt starttid från YouTube ---
        let exactStartTime = status === 'live' ? 'Live Now' : 'Upcoming';
        try {
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          if (detailsData.items && detailsData.items.length > 0) {
            const streamDetails = detailsData.items[0].liveStreamingDetails;
            if (streamDetails && streamDetails.scheduledStartTime) {
              exactStartTime = streamDetails.scheduledStartTime; // ISO Date String (e.g., 2026-05-14T18:00:00Z)
            }
          }
        } catch (e) {
          console.log("Kunde inte hämta exakt starttid", e);
        }
        // ------------------------------------

        // Identifiera automatiskt om det är Baseboll eller Softboll utifrån titeln
        const titleLower = title.toLowerCase();
        const sport = titleLower.includes('softboll') || titleLower.includes('softball') 
          ? 'Softball' 
          : 'Baseball';

        const gameData = {
          title: title,
          team1: channel.teamName, // Använd kanalens ägare som lag 1
          team2: "TBD", // Kan ändras manuellt i Firebase om man vill
          status: status,
          videoId: videoId,
          startTime: exactStartTime,
          league: "Elitserien",
          sport: sport
        };

        // Spara i Firebase (videoId används som dokument-ID för att undvika dubbletter)
        await setDoc(doc(db, "games", videoId), gameData);
        console.log(`Sparade ${status}-match: ${title}`);
      }
    }
  } catch (error) {
    console.error(`Fel vid hämtning för ${channel.teamName}:`, error);
  }
}

fetchGames();
