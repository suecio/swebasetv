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

// 2. YouTube-konfiguration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// --- SÄSONGSINSTÄLLNINGAR ---
// Ändra detta årtal för att skrapa tidigare säsonger (t.ex. 2025)
const TARGET_YEAR = 2026; 
const PUBLISHED_AFTER = `${TARGET_YEAR}-01-01T00:00:00Z`;
const PUBLISHED_BEFORE = `${TARGET_YEAR}-12-31T23:59:59Z`;

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
  console.log(`Startar synkronisering med YouTube för säsong ${TARGET_YEAR}...`);

  for (const channel of CHANNELS) {
    console.log(`Letar i ${channel.teamName}...`);
    await fetchAndSave(channel, 'live');
    await fetchAndSave(channel, 'upcoming');
    // Kolla efter avslutade (completed) sändningar för det valda året
    await fetchAndSave(channel, 'completed'); 
  }

  console.log("Synkronisering slutförd!");
  process.exit(0);
}

async function fetchAndSave(channel, status) {
  try {
    // maxResults=50 ensures we get a good chunk of the archive
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&eventType=${status}&type=video&key=${YOUTUBE_API_KEY}&maxResults=50`;
    
    // Om vi letar efter gamla matcher, begränsa sökningen till valt år
    if (status === 'completed') {
      url += `&publishedAfter=${PUBLISHED_AFTER}&publishedBefore=${PUBLISHED_BEFORE}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const videoId = item.id.videoId;
        const title = item.snippet.title;

        // Hämta exakt starttid
        let exactStartTime = status === 'live' ? 'Live Now' : 'Upcoming';
        try {
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          if (detailsData.items && detailsData.items.length > 0) {
            const streamDetails = detailsData.items[0].liveStreamingDetails;
            if (streamDetails) {
              if (status === 'completed' && streamDetails.actualStartTime) {
                exactStartTime = streamDetails.actualStartTime;
              } else if (streamDetails.scheduledStartTime) {
                exactStartTime = streamDetails.scheduledStartTime;
              }
            }
          }
        } catch (e) {
          console.log("Kunde inte hämta exakt starttid", e);
        }

        // Fallback: If YouTube stripped the live streaming details from an old video, use publish date
        if (exactStartTime === 'Upcoming' && status === 'completed') {
            exactStartTime = item.snippet.publishedAt;
        }

        const titleLower = title.toLowerCase();
        const sport = titleLower.includes('softboll') || titleLower.includes('softball') 
          ? 'Softball' 
          : 'Baseball';

        // Konvertera YouTubes 'completed' till vår apps 'past'
        const dbStatus = status === 'completed' ? 'past' : status;

        const gameData = {
          title: title,
          team1: channel.teamName, 
          team2: "TBD", 
          status: dbStatus,
          videoId: videoId,
          startTime: exactStartTime,
          league: "Elitserien",
          sport: sport,
          season: TARGET_YEAR.toString() // Lägg till säsongen!
        };

        await setDoc(doc(db, "games", videoId), gameData);
        console.log(`Sparade ${dbStatus}-match: ${title} (${exactStartTime})`);
      }
    }
  } catch (error) {
    console.error(`Fel vid hämtning för ${channel.teamName} (${status}):`, error);
  }
}

fetchGames();
