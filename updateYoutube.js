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

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// --- SÄSONGSINSTÄLLNINGAR ---
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
    await fetchAndSave(channel, 'completed'); 
  }

  console.log("Synkronisering slutförd!");
  process.exit(0);
}

async function fetchAndSave(channel, status) {
  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&eventType=${status}&type=video&key=${YOUTUBE_API_KEY}&maxResults=50`;
    
    if (status === 'completed') {
      url += `&publishedAfter=${PUBLISHED_AFTER}&publishedBefore=${PUBLISHED_BEFORE}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const videoId = item.id.videoId;
        const title = item.snippet.title;

        // --- TEAM 2 AUTO-DETECTION ---
        let team2 = "TBD";
        const titleLower = title.toLowerCase();

        // 1. First, check if any of our known teams are mentioned in the title
        for (const possibleTeam of CHANNELS) {
          // Prevent setting Team 1 as Team 2, and check if the title contains their name
          if (possibleTeam.teamName !== channel.teamName && titleLower.includes(possibleTeam.teamName.toLowerCase())) {
            team2 = possibleTeam.teamName;
            break;
          }
        }

        // 2. Fallback: If it's still TBD, try to guess based on "vs" or "mot"
        if (team2 === "TBD") {
          const match = title.match(/ (vs|mot|-) (.+)/i);
          if (match && match[2]) {
             let guessedName = match[2].trim();
             // Clean up extra text like " - Game 1"
             guessedName = guessedName.split('-')[0].split('|')[0].trim(); 
             if (guessedName.length > 2) {
                 team2 = guessedName;
             }
          }
        }
        // -----------------------------

        // Variables to hold extra data
        let exactStartTime = status === 'live' ? 'Live Now' : 'Upcoming';
        let liveViewers = null;

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
              if (status === 'live' && streamDetails.concurrentViewers) {
                 liveViewers = streamDetails.concurrentViewers;
              }
            }
          }
        } catch (e) {
          console.log("Kunde inte hämta exakt starttid/tittare", e);
        }

        if (exactStartTime === 'Upcoming' && status === 'completed') {
            exactStartTime = item.snippet.publishedAt;
        }

        const sport = titleLower.includes('softboll') || titleLower.includes('softball') 
          ? 'Softball' 
          : 'Baseball';

        const dbStatus = status === 'completed' ? 'past' : status;

        const gameData = {
          title: title,
          team1: channel.teamName, 
          team2: team2, // Now uses our new Auto-Detected opponent!
          status: dbStatus,
          videoId: videoId,
          startTime: exactStartTime,
          league: "Elitserien",
          sport: sport,
          season: TARGET_YEAR.toString()
        };

        if (liveViewers) {
          gameData.viewers = liveViewers;
        }

        await setDoc(doc(db, "games", videoId), gameData);
        console.log(`Sparade ${dbStatus}-match: ${channel.teamName} vs ${team2} (${exactStartTime})`);
      }
    }
  } catch (error) {
    console.error(`Fel vid hämtning för ${channel.teamName} (${status}):`, error);
  }
}

fetchGames();
