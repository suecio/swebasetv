import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// 1. Firebase Setup (Reusing your exact config)
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

// 2. YouTube Setup (Key comes from GitHub Secrets)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; 

// TODO: Replace these with the actual IDs you gathered!
const CHANNELS = [
  { id: "UC_x5XG1OV2P6uZZ5FSM9Ttw", teamName: "Stockholm Monarchs" },
  { id: "UC_placeholder_id_2", teamName: "Leksand Lumberjacks" }
];

async function fetchGames() {
  console.log("Starting YouTube Sync...");
  
  for (const channel of CHANNELS) {
    // Ping YouTube for LIVE streams
    await fetchAndSave(channel, 'live');
    // Ping YouTube for UPCOMING streams
    await fetchAndSave(channel, 'upcoming');
  }
  
  console.log("Sync Complete!");
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
        
        // Auto-detect the sport from the YouTube title!
        const titleLower = title.toLowerCase();
        const sport = titleLower.includes('softboll') || titleLower.includes('softball') 
          ? 'Softball' 
          : 'Baseball';

        const gameData = {
          title: title,
          team1: channel.teamName, // We use the channel owner as Team 1
          team2: "TBD", // You can manually edit this in Firebase later if you want
          status: status,
          videoId: videoId,
          startTime: status === 'live' ? 'Live Now' : 'Upcoming',
          league: "Elitserien", // Default league
          sport: sport
        };

        // Save to Firebase (Using the VideoID prevents us from adding duplicates!)
        await setDoc(doc(db, "games", videoId), gameData);
        console.log(`Saved ${status} game: ${title}`);
      }
    }
  } catch (error) {
    console.error(`Error fetching for ${channel.teamName}:`, error);
  }
}

fetchGames();
