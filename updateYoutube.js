import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

    // SÄKERHETSSPÄRR 1: Om kvoten är slut, stoppa boten direkt så att inget förstörs!
    if (data.error && data.error.code === 403) {
      console.error("🚨 Kritisk API Quota Error! Stoppar boten för att skydda databasen.");
      process.exit(1); 
    }

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const videoId = item.id.videoId;
        const title = item.snippet.title;

        let team2 = "TBD";
        const titleLower = title.toLowerCase();

        for (const possibleTeam of CHANNELS) {
          if (possibleTeam.teamName !== channel.teamName && titleLower.includes(possibleTeam.teamName.toLowerCase())) {
            team2 = possibleTeam.teamName;
            break;
          }
        }

        if (team2 === "TBD") {
          const match = title.match(/ (vs|mot|-) (.+)/i);
          if (match && match[2]) {
             let guessedName = match[2].trim();
             guessedName = guessedName.split('-')[0].split('|')[0].trim(); 
             if (guessedName.length > 2) {
                 team2 = guessedName;
             }
          }
        }

        let exactStartTime = status === 'live' ? 'Live Now' : 'Upcoming';
        let liveViewers = null;

        try {
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          
          // SÄKERHETSSPÄRR 2: Klagar YouTube när vi ber om tid? Hoppa över denna video idag!
          if (detailsData.error) {
              console.log(`⚠️ Kunde inte hämta exakt tid för ${title} (möjligt kvot-fel). Hoppar över för att inte skriva över bra data.`);
              continue; // Avbryter just denna match och går vidare till nästa
          }

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
          console.log("Nätverksfel vid detaljhämtning", e);
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
          team2: team2,
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
