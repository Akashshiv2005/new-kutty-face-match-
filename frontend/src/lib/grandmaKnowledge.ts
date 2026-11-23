// Grandma (Paati) Wisdom & KuttyStory Knowledge Engine
// Combines real 24-hour parenting routines, website book data, FAQs, and warm grandmotherly storytelling

export interface GrandmaMessage {
  id: string;
  sender: "grandma" | "user";
  text: string;
  timestamp: string;
  actionLink?: {
    label: string;
    href: string;
  };
  highlight?: string;
  quickPrompts?: string[];
}

export interface RoutineStageInfo {
  id: string;
  time: string;
  start_hour: number;
  end_hour: number;
  activity: string;
  parenting_idea: string;
  category: "morning" | "day" | "evening" | "night";
  iconName: string;
  grandmaAdvice: string;
}

// 24-Hour Verified Routine Stages (matching backend /api/parenting-routine)
export const GRANDMA_ROUTINE_STAGES: RoutineStageInfo[] = [
  {
    id: "stage-1",
    time: "6:30 – 7:00 AM",
    start_hour: 6.5,
    end_hour: 7.0,
    activity: "Wake Up & Smile",
    parenting_idea: "Hugs, gratitude and brushing teeth.",
    category: "morning",
    iconName: "Sun",
    grandmaAdvice:
      "A warm good morning, my sweet child! 🌅 The moment little eyes open, don't rush. Give a long, cozy 10-second hug before feet touch the floor. In Grandma's home, we whisper: 'Today is going to be full of small wonders!' Brushing teeth becomes an adventure when we sing a 2-minute bubble song together!"
  },
  {
    id: "stage-2",
    time: "7:00 – 8:00 AM",
    start_hour: 7.0,
    end_hour: 8.0,
    activity: "Healthy Morning",
    parenting_idea: "Breakfast and getting ready.",
    category: "morning",
    iconName: "Coffee",
    grandmaAdvice:
      "Breakfast fuels little champions! 🥛 If your little one is fussy with food, Grandma's secret is 'The Rainbow Plate'—make dosas with a funny carrot smile or cut fruit into stars. Never force food with anger; a happy tummy digests with joy. Keep water bottles ready and give them choices: 'Do you want the blue socks or the yellow ones today?'"
  },
  {
    id: "stage-3",
    time: "8:00 AM – 2:00 PM",
    start_hour: 8.0,
    end_hour: 14.0,
    activity: "School & Learning",
    parenting_idea: "Lessons, lunch and friendships.",
    category: "day",
    iconName: "Backpack",
    grandmaAdvice:
      "Off to explore the world! 🎒 When saying goodbye at school gates, Grandma says: keep your farewell cheerful and confident. A quick secret handshake or a small drawn heart on their wrist ('Grandma's invisible hug button') reminds them that love is always traveling with them."
  },
  {
    id: "stage-4",
    time: "2:00 – 3:00 PM",
    start_hour: 14.0,
    end_hour: 15.0,
    activity: "Lunch & Relaxation",
    parenting_idea: "Food, connection and quiet time.",
    category: "day",
    iconName: "Utensils",
    grandmaAdvice:
      "Welcome home, my brave little star! 🍲 When children return from school, their emotional bucket is full and their energy is low. Don't bombard them with 'How was school? Did you finish homework?'. First give warm food, water, and 20 minutes of gentle silence or cuddles. They will open up when their heart feels rested."
  },
  {
    id: "stage-5",
    time: "3:00 – 4:00 PM",
    start_hour: 15.0,
    end_hour: 16.0,
    activity: "Creative Time",
    parenting_idea: "Art, puzzles and imaginative play.",
    category: "day",
    iconName: "Palette",
    grandmaAdvice:
      "Imagination time! 🎨 Put away the screens and give them cardboard boxes, crayons, and clay. When children build castles and draw flying unicorns, their brains build deep problem-solving pathways. Grandma always says: the messiest hands create the brightest minds!"
  },
  {
    id: "stage-6",
    time: "4:00 – 5:30 PM",
    start_hour: 16.0,
    end_hour: 17.5,
    activity: "Outdoor Play",
    parenting_idea: "Movement and active games.",
    category: "evening",
    iconName: "Trees",
    grandmaAdvice:
      "Sunlight and fresh air are nature's medicine! 🌳 Let little feet run on the grass, climb stairs, or chase butterflies. 60 minutes of real outdoor movement releases built-up stress and prepares their body for deep, restorative sleep later tonight."
  },
  {
    id: "stage-7",
    time: "5:30 – 6:30 PM",
    start_hour: 17.5,
    end_hour: 18.5,
    activity: "Homework & Reading",
    parenting_idea: "Learning with gentle support.",
    category: "evening",
    iconName: "BookOpen",
    grandmaAdvice:
      "Learning should feel like unlocking a treasure chest! 📖 If your child struggles with reading or maths, sit beside them with a calm smile. Break tasks into tiny 15-minute bursts. Praise their effort, not just the marks: 'I love how carefully you tried that problem, Kanna!'"
  },
  {
    id: "stage-8",
    time: "6:30 – 7:30 PM",
    start_hour: 18.5,
    end_hour: 19.5,
    activity: "Family & Dinner",
    parenting_idea: "Conversation and shared meals.",
    category: "evening",
    iconName: "HeartHandshake",
    grandmaAdvice:
      "Dinner together is family magic! 🍲 Turn off televisions and phones. Play Grandma's favorite dinner table game: 'Rose, Thorn & Bud'—each person shares one sweet moment (Rose), one small difficulty (Thorn), and one hope for tomorrow (Bud). This builds lifelong emotional closeness."
  },
  {
    id: "stage-9",
    time: "7:30 – 8:00 PM",
    start_hour: 19.5,
    end_hour: 20.0,
    activity: "Bedtime Preparation",
    parenting_idea: "Wash, brush teeth and wind down.",
    category: "night",
    iconName: "Sparkles",
    grandmaAdvice:
      "Dim the golden lights! ✨ The brain needs warm, amber lighting to release sleep hormones. Brush teeth gently, put on cozy cotton pyjamas, and rub a drop of warm coconut or lavender oil on their palms. The daytime world is closing; the magical dream world is waking up."
  },
  {
    id: "stage-10",
    time: "8:00 – 8:30 PM",
    start_hour: 20.0,
    end_hour: 20.5,
    activity: "KuttyStory Magic",
    parenting_idea: "Read together and imagine.",
    category: "night",
    iconName: "BookMarked",
    grandmaAdvice:
      "The most precious 30 minutes of childhood! 🌟 Snuggle close and open their personalised KuttyStory book. When a child sees their own smiling face riding the magical unicorn or making wishes under the starlight, their self-belief soars to the skies. Read slowly, use funny voices, and let them touch the pages."
  },
  {
    id: "stage-11",
    time: "8:30 PM – 6:30 AM",
    start_hour: 20.5,
    end_hour: 30.5, // Overnight
    activity: "Sweet Dreams",
    parenting_idea: "10 hours of sleep.",
    category: "night",
    iconName: "Moon",
    grandmaAdvice:
      "Sleep tight, little angel! 🌙 Whispering Grandma's night blessing: 'You are safe, you are cherished, and tomorrow will bring new joys.' Children need 10 to 11 hours of quiet sleep so their memories organize and their bodies grow strong. Good night, sweet dreams!"
  }
];

// Helper to get active routine stage based on current local hour
export function getCurrentRoutineStage(): RoutineStageInfo {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  for (const stage of GRANDMA_ROUTINE_STAGES) {
    if (stage.end_hour > 24) {
      // Overnight stage (e.g., 20.5 to 30.5 => 8:30 PM to 6:30 AM)
      if (currentHour >= stage.start_hour || currentHour < stage.end_hour - 24) {
        return stage;
      }
    } else if (currentHour >= stage.start_hour && currentHour < stage.end_hour) {
      return stage;
    }
  }
  return GRANDMA_ROUTINE_STAGES[9]; // Default to KuttyStory Magic
}

// Bedtime Mini-Story Generator
export function generateBedtimeStory(childName: string = "Kanna", theme: string = "unicorn"): {
  title: string;
  text: string;
  moral: string;
} {
  const name = childName.trim() || "Kanna";
  const cleanTheme = theme.toLowerCase();

  if (cleanTheme.includes("dino") || cleanTheme.includes("dinosaur")) {
    return {
      title: `${name} and the Sleepy T-Rex`,
      text: `Once upon a twilight in the ancient whispering jungle, little ${name} discovered a tiny baby dinosaur named Pip. Pip was feeling grumbly because he didn't want to close his heavy dinosaur eyes. 
${name} smiled gently, took Pip's green scaly hand, and taught him the Secret Cloud Breathing: 'Breathe in starlight, breathe out the grumbles.' 
Together, they counted three glowing fireflies floating over the mossy trees. Pip gave a huge yawn that shook the forest leaves, curled his tail into a soft doughnut, and rested his head beside ${name}.`,
      moral: "Even the strongest giants in the world rest peacefully when guided by patience and love."
    };
  }

  if (cleanTheme.includes("star") || cleanTheme.includes("moon") || cleanTheme.includes("space")) {
    return {
      title: `${name}'s Voyage to the Moon Pillow`,
      text: `Far above the sleepy rooftops of India, a silver moonbeam tapped on ${name}'s window. It invited ${name} on a gentle ride across the velvet sky in a boat woven from spun cotton clouds.
Along the Milky Way, ${name} caught three glowing stardust sparks: one for courage, one for kindness, and one for sweet dreaming.
The Great Owl of the Stars whispered: 'Sleep now, brave ${name}. The stars will watch over your dreams until the morning sun rises.'`,
      moral: "You are never alone; the universe watches over your sleep with endless warmth."
    };
  }

  // Default: Magical Unicorn
  return {
    title: `${name} and the Whispering Unicorn`,
    text: `Near the quiet hills of emerald moss, little ${name} was walking barefoot on soft rose petals when a magical silver unicorn named Lumina appeared with sparkling amethyst eyes. 
Lumina bowed gracefully and touched her glowing horn to ${name}'s forehead. In that gentle touch, ${name} felt all the day's tiredness turn into warm, golden light. 
'Dear ${name},' whispered Lumina in a voice like soft silver bells, 'every wish made with a kind heart travels straight to the highest stars.' With a gentle nuzzle, Lumina curled beside ${name} under the velvet night sky.`,
    moral: "Kindness is the strongest magic, and peaceful sleep is the path to tomorrow's wonders."
  };
}

// Helper to match whole words or exact phrases safely without accidental substring collisions
function hasIntent(text: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    const trimmed = p.trim().toLowerCase();
    if (!trimmed) return false;
    if (trimmed.includes(" ")) {
      return text.includes(trimmed);
    }
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${trimmed}([^a-zA-Z0-9]|$)`, "i");
    return regex.test(text);
  });
}

// Complete knowledge base evaluator
export function answerGrandmaQuery(query: string, childName?: string): GrandmaMessage {
  // Normalize typos like "bed tym" -> "bed time", "tym" -> "time"
  const q = query.toLowerCase().replace(/\btym\b/g, "time").trim();
  const name = childName || "Kanna";

  // 1. Direct Greetings
  if (
    hasIntent(q, [
      "hi",
      "hello",
      "hey",
      "vanakkam",
      "namaste",
      "vanakam",
      "good morning",
      "good afternoon",
      "good evening",
      "who are you",
      "what is your name"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Hi Kanna! 👵✨ So lovely to chat with you!

I am **Kutty Grandma**. What can Grandma help you with today? Ask me for our list of storybooks, a soothing bedtime story, our 24-hour routine tips, or how our personalised storybooks work!`,
      timestamp: "Just now",
      quickPrompts: [
        "📚 List out stories",
        "🌙 Tell me a bedtime story",
        "⏰ What's our routine now?",
        "📖 How does KuttyStory work?",
        "💰 Book prices & delivery"
      ]
    };
  }

  // 2. Direct Contact & Customer Support
  if (
    hasIntent(q, [
      "contact",
      "phone",
      "phone number",
      "call",
      "whatsapp",
      "email",
      "support",
      "help",
      "customer care",
      "human",
      "talk to human",
      "customer support"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Here is how you can directly connect with our caring KuttyStory team, Kanna: 📞✨

📱 **WhatsApp:** +91 90031 69615
📧 **Email:** info@kuttystory.co.in
📍 **Office & Atelier Base:** Tiruchirappalli (Trichy), Tamil Nadu, India
🕒 **Hours:** Monday to Saturday, 9:00 AM – 7:00 PM IST

We are always delighted to help you with orders, preview questions, or custom celebrations!`,
      timestamp: "Just now",
      actionLink: {
        label: "💬 Chat with Us on WhatsApp",
        href: "https://wa.me/919003169615"
      },
      quickPrompts: ["📚 List out stories", "✨ Own story personalise", "💰 Price details"]
    };
  }

  // 3. Own Story Personalise / Custom Story Commission
  if (
    hasIntent(q, [
      "own story personalise",
      "own story personalize",
      "personalise own story",
      "personalize own story",
      "own story",
      "write own story",
      "write my own story",
      "write our own story",
      "my own story",
      "our own story",
      "custom story",
      "custom storyline",
      "custom plot",
      "create my own story",
      "create our own story",
      "make my own story",
      "can i write my own story",
      "can i make my own story"
    ]) ||
    (q.includes("own story") && (q.includes("personal") || q.includes("write") || q.includes("make") || q.includes("create")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `How wonderful, Kanna! If you would like to personalise your **own custom story** or create a completely unique storyline for your child, please **contact KuttyStory directly**! ✍️🌟📖

Our in-house authors, story architects, and artists will collaborate with you one-on-one to craft your child's custom adventure and turn your family's personal memories or story ideas into an archival illustrated book.

📞 **Contact KuttyStory Directly:**
📱 **WhatsApp:** +91 90031 69615
📧 **Email:** info@kuttystory.co.in
📍 **Office:** Trichy, Tamil Nadu
🕒 **Hours:** Monday to Saturday, 9:00 AM – 7:00 PM IST

Message our team on WhatsApp with your story idea, and we will guide you every step of the way!`,
      timestamp: "Just now",
      actionLink: {
        label: "💬 Contact KuttyStory on WhatsApp",
        href: "https://wa.me/919003169615"
      },
      quickPrompts: ["💰 Price details", "🚚 Delivery period", "📚 List out stories"]
    };
  }

  // 4. Founder / Owner Details (from About Section)
  if (
    hasIntent(q, [
      "founder",
      "owner",
      "who is the founder",
      "who is the owner",
      "who is founder",
      "who is owner",
      "founder details",
      "owner details",
      "who started kuttystory",
      "who started",
      "who created kuttystory",
      "who created",
      "who runs kuttystory",
      "who runs",
      "jamila",
      "jamila kamal",
      "ceo",
      "about founder",
      "founder message",
      "who is behind kuttystory",
      "story behind kuttystory"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Grandma is proud to share the story of our founder from our About section! 🌸👩‍👧✨

**Jamila Kamal — Founder & CEO of KuttyStory**

- 🌟 **A Mother's Love & Vision:** Jamila started her professional journey as an engineer, but becoming a mother transformed the way she saw the world. Watching her child grow sparked a beautiful thought: *"What if every child could become the hero of their own story?"*
- 🏛️ **40-Year Family Printing Legacy:** KuttyStory builds upon a modernized 40-year-old printing company founded by her father, operating an **ISO 9001:2000 & ZED Gold certified** high-precision printing atelier in Tamil Nadu.
- 💖 **Empowerment & Child Wonder:** For Jamila, KuttyStory is a heartfelt celebration of motherhood, women's empowerment, childhood dreams, and giving every child the courage to know they are valued and cherished.
- 🎯 **Our Purpose:** Making every little one feel proud and loved — one heirloom storybook at a time!`,
      timestamp: "Just now",
      actionLink: {
        label: "📖 Read Jamila's Founder Message",
        href: "/about"
      },
      quickPrompts: ["🏢 Office location", "✨ Own story personalise", "📚 List out stories"]
    };
  }

  // 5. Office Location (Tamil Nadu, Trichy)
  if (
    hasIntent(q, [
      "office location",
      "office address",
      "where is your office",
      "where is the office",
      "where is kuttystory located",
      "where are you located",
      "where is your company",
      "headquarters",
      "head office",
      "company address",
      "studio location",
      "atelier location",
      "office",
      "address",
      "trichy office",
      "tamil nadu office",
      "where based",
      "where are you from"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `KuttyStory's office and printing atelier are proudly located in **Trichy (Tiruchirappalli), Tamil Nadu**! 📍🏛️✨

🏢 **Office & Printing Atelier Base:**
Tiruchirappalli (Trichy), Tamil Nadu, India

Every physical storybook is designed, bound, and inspected right here in our Trichy atelier, carrying forward our 40-year family printing heritage.

📞 **Connect with our Trichy Office:**
📱 **WhatsApp:** +91 90031 69615
📧 **Email:** info@kuttystory.co.in
🕒 **Hours:** Monday to Saturday, 9:00 AM – 7:00 PM IST`,
      timestamp: "Just now",
      actionLink: {
        label: "🏛️ Learn About Our Trichy Atelier",
        href: "/about"
      },
      quickPrompts: ["🚚 Available deliver area", "🚚 Delivery period", "✨ Own story personalise"]
    };
  }

  // 6. Available Deliver Area (All Over India)
  if (
    hasIntent(q, [
      "available deliver area",
      "available delivery area",
      "delivery area",
      "deliver area",
      "where do you deliver",
      "where do you ship",
      "shipping area",
      "delivery locations",
      "serviceable area",
      "serviceable pincodes",
      "serviceable pincode",
      "delivery coverage",
      "shipping locations",
      "do you deliver to",
      "can you deliver to",
      "deliver to my city",
      "deliver to my state",
      "all over india",
      "across india"
    ]) ||
    (q.includes("deliver") && (q.includes("area") || q.includes("where") || q.includes("state") || q.includes("city") || q.includes("location")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Grandma has wonderful news for you: our available delivery area is **all over India**! 🇮🇳🚚📦

- 📦 **Pan-India Coverage:** We deliver our physical hardcover books to every city, town, and pincode across all **28 states and union territories** of India!
- 🚚 **Secure Doorstep Courier:** Hand-packaged safely so your heirloom arrives in immaculate condition.
- 📱 **Digital PDF Edition:** Instant download anywhere in India and across the globe!`,
      timestamp: "Just now",
      actionLink: {
        label: "📍 View Where Stories Travel Across India",
        href: "/footsteps"
      },
      quickPrompts: ["🚚 Delivery period", "💰 Price details", "📚 List out stories"]
    };
  }

  // 7. Delivery Period & Timeline
  if (
    hasIntent(q, [
      "delivery period",
      "delivery time",
      "how long does delivery take",
      "how long to deliver",
      "how long will it take",
      "delivery days",
      "how many days",
      "shipping time",
      "dispatch time",
      "when will i receive",
      "when will it arrive",
      "delivery speed",
      "courier time",
      "shipping days"
    ]) ||
    (q.includes("delivery") && (q.includes("period") || q.includes("time") || q.includes("day") || q.includes("when") || q.includes("long")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Grandma knows little eyes are eager to hold their very own book! Here is our delivery period: 🚚⏱️📦

- 📱 **Digital PDF Edition:** **Instant PDF download!** As soon as your book rendering is complete, you can download and read the high-resolution storybook right away on your iPad, phone, or laptop.
- 📚 **Physical Hard Copy Edition:** Delivered in **10 to 15 days** across India. (The exact delivery timeline depends on the delivery person / courier partner and your destination area).
- 🔍 **Tracked Courier:** Once dispatched from our Trichy atelier, you will receive full express tracking updates to follow your book's journey!`,
      timestamp: "Just now",
      actionLink: {
        label: "📍 Explore Story Footsteps",
        href: "/footsteps"
      },
      quickPrompts: ["🚚 Available deliver area", "💰 Price details", "✨ Own story personalise"]
    };
  }

  // 8. Price Details & Rates
  if (
    hasIntent(q, [
      "price details",
      "pricing details",
      "price detail",
      "book price",
      "book prices",
      "rate details",
      "cost details",
      "how much does it cost",
      "price",
      "prices",
      "cost",
      "pricing",
      "how much",
      "rate",
      "rates",
      "discount",
      "coupon",
      "welcome20",
      "offer",
      "hardcover price",
      "hard copy price",
      "pdf price"
    ]) ||
    (q.includes("price") || q.includes("cost") || q.includes("rate"))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Grandma believes in transparent, honest pricing for our little heroes! Here are our price details: 💰✨

- 📱 **Digital PDF Edition:** High-resolution digital storybook with instant download to read on tablet, iPad, or print at home.
- 📚 **Keepsake Hardcopy Edition:** Premium 8×8 inch hardbound heirloom book crafted on 170gsm silk archival paper with vibrant, fade-proof colors.
- 🏷️ **Based on Admin Updated Rates:** Hardcopy and digital rates are based on the latest rates updated by our admin in the story catalog (typically ₹799 for digital PDF and ₹1,399 / ₹1,400 for hardcover keepsake).
- 🎁 **Special Blessing:** Use coupon code **WELCOME20** at checkout for a warm discount on your first book!`,
      timestamp: "Just now",
      actionLink: {
        label: "📖 View Catalog & Admin Rates",
        href: "/stories"
      },
      quickPrompts: ["🚚 Delivery period", "🚚 Available deliver area", "✨ Own story personalise"]
    };
  }

  // 9. Delivery & Shipping (General)
  if (
    hasIntent(q, [
      "delivery",
      "shipping",
      "ship",
      "dispatch",
      "courier",
      "track order"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Here is everything you need to know about KuttyStory delivery & shipping, Kanna! 🚚📦✨

- 📍 **Available Delivery Area:** **All over India**! We ship to all 28 states and union territories.
- 📱 **Digital PDF:** Instant download immediately after generation.
- 📚 **Physical Hard Copy:** Delivered within **10 to 15 days** across India (timeline based on delivery person / courier partner and location).
- 🏛️ **Crafted In:** Trichy (Tiruchirappalli), Tamil Nadu, packed safely in our archival presentation package.`,
      timestamp: "Just now",
      actionLink: {
        label: "📍 View Where Stories Travel",
        href: "/footsteps"
      },
      quickPrompts: ["💰 Price details", "✨ Own story personalise", "📚 List out stories"]
    };
  }

  // 3. List Out Stories / Available Books / Catalog (Checked BEFORE story narration!)
  if (
    hasIntent(q, [
      "list out stories",
      "list stories",
      "list of stories",
      "show stories",
      "what stories",
      "stories list",
      "available stories",
      "available books",
      "what books",
      "show books",
      "story list",
      "book list",
      "which stories",
      "all stories",
      "catalog",
      "catalogue",
      "book collection"
    ]) ||
    (q.includes("list") && (q.includes("stor") || q.includes("book")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Here are our cherished personalised storybook adventures, Kanna! 📚✨

🦄 **1. The Girl and the Magical Unicorn (Ages 3–8)**
A magical forest journey of friendship, courage, and sparkling amethysts where your child rides a glowing silver unicorn.

🦖 **2. The Boy and the Dinosaur Valley (Ages 3–8)**
A thrilling prehistoric quest where your little hero tames gentle giant dinosaurs and explores the jungle.

🚀 **3. The Brave Little Astronaut (Ages 4–8)**
A cosmic space voyage exploring the moon, shooting stars, and distant galaxies.

🌿 **4. Nature Explorers (Ages 3–7)**
A gentle discovery story celebrating curiosity, wildlife, and kindness towards all living things.

✨ **Every single book is personalised:** Your child's name is on the cover, and their smiling face is illustrated into every spread across 24 pages! Available in instant digital PDF or archival hardcover based on admin-updated catalog rates.`,
      timestamp: "Just now",
      actionLink: {
        label: "📚 Explore All Storybooks & Previews",
        href: "/stories"
      },
      quickPrompts: ["📖 How it works?", "💰 Book prices & delivery", "🌙 Tell a bedtime story"]
    };
  }

  // 4. Describe Bedtime Story / What is a Bedtime Story
  if (
    hasIntent(q, [
      "describe bedtime story",
      "describe the bedtime story",
      "describe bed time story",
      "describe the bed time story",
      "what is bedtime story",
      "what is a bedtime story",
      "explain bedtime story",
      "describe story",
      "describe the story",
      "about bedtime story",
      "what are bedtime stories",
      "bedtime story description",
      "unicorn story details"
    ]) ||
    (q.includes("describe") && (q.includes("stor") || q.includes("book")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Grandma would love to describe our bedtime stories for you! 🌙📖✨

Our bedtime storybooks are specially designed for the **8:00 – 8:30 PM KuttyStory Magic** bedtime ritual:

🌟 **1. Your Child Is The Hero:**
Seeing their own face and name inside the book creates immense comfort and self-worth before falling asleep.

🎶 **2. Gentle Calming Rhythm:**
Written with soft, soothing cadence and peaceful vocabulary to help little minds transition from energetic daytime play to deep, restful slumber.

🎨 **3. Dreamy Archival Artwork:**
24 vibrant 8×8 inch spreads printed on 170gsm silk archival paper that doesn't strain eyes in warm evening lighting.

💖 **4. Loving Moral Lessons:**
Every tale gently highlights empathy, courage, and family love.

Would you like Grandma to tell you a sample bedtime story right now, or see how to create one for your child?`,
      timestamp: "Just now",
      actionLink: {
        label: "✨ Personalize a Bedtime Book",
        href: "/stories"
      },
      quickPrompts: ["🌙 Tell me a bedtime story", "📚 List out stories", "⏰ Right now routine"]
    };
  }

  // 5. Tell Me a Bedtime Story (Explicit Narration Request Only)
  if (
    hasIntent(q, [
      "tell me a story",
      "tell a story",
      "tell bedtime story",
      "tell me a bedtime story",
      "tell me bedtime story",
      "narrate a story",
      "read me a story",
      "read a story",
      "say a story",
      "kadhai sollu",
      "tell story",
      "make up a story",
      "bedtime story for"
    ]) ||
    (q.includes("tell") && (q.includes("stor") || q.includes("kadhai")))
  ) {
    let theme = "unicorn";
    if (hasIntent(q, ["dino", "dinosaur", "trex"])) theme = "dinosaur";
    if (hasIntent(q, ["star", "stars", "space", "moon", "astronaut"])) theme = "star";

    const story = generateBedtimeStory(name, theme);
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Sit close, ${name}, wrap your blanket tight, and listen to Grandma's voice... 👵✨

**${story.title}**

${story.text}

🌟 **Grandma's Golden Lesson:**
"${story.moral}"

Would you love to see your child star as the hero inside a full 24-page archival picture book?`,
      timestamp: "Just now",
      highlight: story.title,
      actionLink: {
        label: "✨ Explore Personalised Books",
        href: "/stories"
      },
      quickPrompts: ["🌙 Tell another story", "📚 List out stories", "⏰ What's our routine now?"]
    };
  }

  // 4A. Current Time Routine ("In this time what to do", "What to do now", "Right now routine")
  if (
    hasIntent(q, [
      "in this time what to do",
      "what to do in this time",
      "what to do at this time",
      "what should i do in this time",
      "what should i do at this time",
      "in this time",
      "at this time",
      "what to do now",
      "what should i do now",
      "what should we do now",
      "what to do right now",
      "right now what to do",
      "now what to do",
      "routine now",
      "right now routine",
      "current routine",
      "current time",
      "what's our routine now",
      "what is our routine now",
      "what should child do now",
      "what should we do right now",
      "what to do this time"
    ]) ||
    ((q.includes("now") || q.includes("this time")) && (q.includes("what to do") || q.includes("what should") || q.includes("routine")))
  ) {
    const current = getCurrentRoutineStage();
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Aha, my dear Amma & Appa! 👵 Looking at Grandma's clock right now:

🕒 **Current Active Stage (${current.time}):** ${current.activity}
🌱 **Parenting Focus:** ${current.parenting_idea}

${current.grandmaAdvice}

💡 **Grandma's Golden Reminder:**
Children thrive on a predictable, loving rhythm of warmth, food, outdoor movement, and bedtime stories. You don't have to be perfect; just be present with a warm heart!`,
      timestamp: "Just now",
      highlight: `${current.activity} (${current.time})`,
      actionLink: {
        label: "🌸 View Full 24-Hour Routine",
        href: "/about#parenting-routine"
      },
      quickPrompts: ["🍲 Afternoon what to do", "🌅 Morning routine", "🌳 Evening routine", "🌙 Night & bedtime tips"]
    };
  }

  // 4B. Afternoon Routine & Tips ("Afternoon what to do", "What to do in afternoon", "Afternoon routine")
  if (
    hasIntent(q, [
      "afternoon what to do",
      "what to do in afternoon",
      "what to do afternoon",
      "what to do in the afternoon",
      "what should we do in afternoon",
      "what should i do in afternoon",
      "afternoon tips",
      "afternoon parenting tips",
      "afternoon routine",
      "afternoon schedule",
      "afternoon advice",
      "afternoon plan",
      "after lunch",
      "after lunch what to do",
      "lunch time",
      "lunch routine",
      "post school",
      "after school",
      "after school routine",
      "coming home from school",
      "nap time",
      "afternoon nap",
      "afternoon"
    ]) ||
    (q.includes("afternoon") && (q.includes("what") || q.includes("do") || q.includes("tip") || q.includes("routine") || q.includes("help")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Welcome to our cozy afternoon rhythm, Amma & Appa! 🍲☀️👵

Afternoons are a crucial bridge for children between the noisy structure of school and the outdoor freedom of evening:

🍲 **2:00 – 3:00 PM: Lunch & Emotional Decompression**
- **Refill the Tank First:** When children step through the door, their emotional battery is drained and sensory bucket is full. Resist asking immediately: *"How was school? Did you finish your lunch box? Any homework today?"*
- **Grandma's 20-Minute Grace:** Give them a warm home-cooked meal, a big glass of water, and 20 minutes of gentle silence or cuddles. When their tummy and heart feel rested, their stories will tumble out naturally!

🎨 **3:00 – 4:00 PM: Screen-Free Creative Wonder**
- **Protect Sensitive Brain Waves:** Avoid turning on cartoons, YouTube, or phones right after school—it hypes an already overstimulated nervous system.
- **Hands-On Free Play:** Set out crayons, clay, building blocks, or empty cardboard boxes. Imaginative play lets their brain digest the day's lessons through creative stories.
- **Quiet Rest:** Even if your child has outgrown afternoon naps, 30 minutes of lying down snuggled with a storybook restores everyone's evening patience.

🌳 **Coming Up Next (4:00 PM):** Outdoor movement, running in the fresh air, and releasing built-up tension!`,
      timestamp: "Just now",
      highlight: "Afternoon Rhythm (2:00 – 4:00 PM)",
      actionLink: {
        label: "🌸 View Full 24-Hour Routine",
        href: "/about#parenting-routine"
      },
      quickPrompts: ["🌳 Evening play routine", "⏰ What to do right now?", "🌙 Night & bedtime tips", "🥦 Fussy eating tip"]
    };
  }

  // 4C. Morning Routine & Tips ("Morning what to do", "What to do in morning", "Morning routine")
  if (
    hasIntent(q, [
      "morning what to do",
      "what to do in morning",
      "what to do in the morning",
      "what should we do in morning",
      "what should i do in morning",
      "morning tips",
      "morning parenting tips",
      "morning routine",
      "morning schedule",
      "morning advice",
      "wake up",
      "waking up",
      "wake up routine",
      "breakfast",
      "breakfast routine",
      "getting ready for school",
      "school drop off",
      "morning tantrum",
      "morning"
    ]) ||
    (q.includes("morning") && (q.includes("what") || q.includes("do") || q.includes("tip") || q.includes("routine") || q.includes("help")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Good morning, my bright little sunrise! 🌅👵

How the morning starts sets the emotional compass for your child's entire day:

☀️ **6:30 – 7:00 AM: Wake Up & Smile**
- **The 10-Second Snuggle:** Don't start the morning shouting alarms or rush orders. Sit on the edge of their bed, gently stroke their hair, and give a warm 10-second hug before little feet touch the floor.
- **Bubble Brush Song:** Turn brushing teeth into a 2-minute bubble-making game with a cheerful song rather than a morning struggle.

🥛 **7:00 – 8:00 AM: Healthy Rainbow Breakfast**
- **The Power of Two Choices:** Avoid morning power battles. Offer two positive choices: *"Do you want the red apple stars or banana slices today?"* or *"The blue socks or yellow socks?"*
- **The Rainbow Plate:** A dosa with a carrot smile or warm porridge fuels their brain without morning tears.

🎒 **8:00 AM – 2:00 PM: Confident School Farewell**
- **Grandma's Invisible Hug Button:** Draw a tiny heart with your finger on their wrist. Tell them: *"Whenever you feel nervous or miss home today, press this button—my hug travels through the air straight to you!"*`,
      timestamp: "Just now",
      highlight: "Morning Rhythm (6:30 – 8:00 AM)",
      actionLink: {
        label: "🌸 View Full 24-Hour Routine",
        href: "/about#parenting-routine"
      },
      quickPrompts: ["🍲 Afternoon what to do", "⏰ What to do right now?", "🌳 Evening routine", "🥦 Fussy eating secret"]
    };
  }

  // 4D. Evening Routine & Play Tips ("Evening what to do", "What to do in evening", "Outdoor play", "Homework")
  if (
    hasIntent(q, [
      "evening what to do",
      "what to do in evening",
      "what to do in the evening",
      "what should we do in evening",
      "what should i do in evening",
      "evening tips",
      "evening parenting tips",
      "evening routine",
      "evening schedule",
      "outdoor play",
      "outdoor routine",
      "play time",
      "playtime",
      "homework",
      "homework tips",
      "study time",
      "study routine",
      "evening"
    ]) ||
    (q.includes("evening") && (q.includes("what") || q.includes("do") || q.includes("tip") || q.includes("routine") || q.includes("help")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Good evening, my dear family! 🌇🌳👵

Evenings are for reconnecting, burning physical energy, and curious, gentle learning:

🌳 **4:00 – 5:30 PM: Outdoor Play & Natural Movement**
- **Sunlight is Nature's Medicine:** Let little feet touch grass, climb stairs, chase butterflies, or pedal cycles. 60 minutes of real outdoor movement releases built-up school stress and naturally triggers melatonin later for deep sleep tonight.
- **Set the Internal Clock:** Late afternoon sunlight helps reset their circadian rhythm better than any medicine.

📖 **5:30 – 6:30 PM: Bite-Sized Homework & Curiosity**
- **The 15-Minute Rule:** A young child's attention span is short. Break study into 15-minute bursts with a 3-minute water or stretch break.
- **Praise Effort, Not Just Marks:** Instead of saying *"You got full marks!"*, say: *"I love how patiently and bravely you tried that tricky spelling, Kanna!"*

🍲 **Coming Up Next (6:30 PM):** Warm family dinner and the 'Rose, Thorn & Bud' conversation game!`,
      timestamp: "Just now",
      highlight: "Evening Rhythm (4:00 – 6:30 PM)",
      actionLink: {
        label: "🌸 View Full 24-Hour Routine",
        href: "/about#parenting-routine"
      },
      quickPrompts: ["🌙 Night & bedtime routine", "⏰ What to do right now?", "🍲 Afternoon what to do", "🧸 Tantrum soother"]
    };
  }

  // 4E. Night, Dinner & Bedtime Routine ("Night what to do", "What to do at night", "Bedtime routine", "Sleep tips")
  if (
    hasIntent(q, [
      "night what to do",
      "what to do at night",
      "what to do in night",
      "what should we do at night",
      "what should i do at night",
      "night tips",
      "night routine",
      "night schedule",
      "bedtime routine",
      "bed time routine",
      "sleep routine",
      "sleep tips",
      "bedtime tips",
      "dinner",
      "dinner routine",
      "dinner time",
      "before sleeping",
      "how to make child sleep",
      "child not sleeping",
      "bedtime struggle",
      "sleep advice",
      "night",
      "bedtime",
      "sleeping"
    ]) ||
    (q.includes("night") && (q.includes("what") || q.includes("do") || q.includes("tip") || q.includes("routine") || q.includes("help")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `The stars are beginning to sparkle, my dear! 🌙✨👵

A peaceful bedtime begins two hours before sleep:

🍲 **6:30 – 7:30 PM: Screen-Free Family Dinner**
- **Rose, Thorn & Bud:** Turn off mobile phones and TV. Grandma's golden dinner game: each family member shares one sweet highlight (Rose), one small challenge (Thorn), and one hope for tomorrow (Bud). This builds lifelong emotional closeness.

✨ **7:30 – 8:00 PM: Golden Wind-Down**
- **Dim to Amber Lights:** Blue screen light blocks sleep hormones. Turn off harsh white lights and switch to warm amber lamps.
- **Grandma's Warm Touch:** A drop of warm coconut or lavender oil rubbed gently on their palms or feet instantly slows down a busy heart.

📖 **8:00 – 8:30 PM: KuttyStory Bedtime Magic**
- **Snuggle Close:** Read their personalised storybook where *they* are the brave hero riding the magical unicorn or making wishes under the stars. Seeing themselves as valued and loved instills unshakeable self-belief before they close their eyes.

🌙 **8:30 PM – 6:30 AM: Deep Restorative Sleep**
- Children need 10 to 11 hours of quiet sleep so their memories organize and their bodies grow strong.
- **Grandma's Night Blessing:** Whisper into their ear: *"You are safe, you are deeply cherished, and tomorrow will bring new joys."*`,
      timestamp: "Just now",
      highlight: "Night & Bedtime Rhythm (6:30 PM – 6:30 AM)",
      actionLink: {
        label: "📖 Explore Bedtime Storybooks",
        href: "/stories"
      },
      quickPrompts: ["🌙 Tell me a bedtime story", "⏰ What to do right now?", "☀️ Morning routine", "🥦 Fussy eating tip"]
    };
  }

  // 4F. Comprehensive 24-Hour Parenting Routine & Tips Overview
  if (
    hasIntent(q, [
      "24 hour",
      "24 hours",
      "24 hours parenting tips",
      "24 hour parenting tips",
      "24 hours tips",
      "24 hour routine",
      "24 hours routine",
      "parenting tips",
      "parenting tip",
      "parenting routine",
      "parenting advice",
      "daily routine",
      "daily rhythm",
      "daily schedule",
      "schedule for kids",
      "child routine",
      "kid routine",
      "full routine",
      "all routine",
      "routine",
      "schedule",
      "timetable",
      "time table"
    ]) ||
    (q.includes("parenting") && (q.includes("tip") || q.includes("routine") || q.includes("advice")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Hello my dear Amma & Appa! 👵 Here is KuttyStory's complete **24-Hour Verified Parenting Rhythm**, designed to nurture confident, happy, and well-rested children:

🌅 **1. Morning Rise (6:30 – 8:00 AM)**
- *6:30 – 7:00 AM (Wake Up & Smile):* 10-second morning hugs, bubble brush song, and gentle awakening.
- *7:00 – 8:00 AM (Healthy Morning):* Rainbow plate breakfast, giving simple choices (blue socks or yellow socks).

🎒 **2. School & Learning (8:00 AM – 2:00 PM)**
- Confident goodbyes with Grandma's *"Invisible Hug Button"* drawn on their wrist.

🍲 **3. Afternoon Recharge (2:00 – 4:00 PM)**
- *2:00 – 3:00 PM (Lunch & Decompression):* 20 minutes of quiet food and connection before any homework questions.
- *3:00 – 4:00 PM (Creative Time):* Screen-free arts, clay, blocks, and imaginative play.

🌳 **4. Evening Energy & Study (4:00 – 6:30 PM)**
- *4:00 – 5:30 PM (Outdoor Play):* 60 minutes of real grass, dirt, and movement to release stress.
- *5:30 – 6:30 PM (Homework & Reading):* 15-minute focused bursts with lots of praise for patience.

🌙 **5. Night & Bedtime Magic (6:30 PM – 6:30 AM)**
- *6:30 – 7:30 PM (Family Dinner):* The *'Rose, Thorn & Bud'* dinner table conversation game.
- *7:30 – 8:00 PM (Wind Down):* Dim amber lighting, warm oil on palms, cotton pyjamas.
- *8:00 – 8:30 PM (KuttyStory Reading):* Cuddling up with their personalised picture book.
- *8:30 PM – 6:30 AM (Sweet Dreams):* 10–11 hours of quiet, restorative sleep.

✨ Ask Grandma: *"Afternoon what to do"*, *"Morning what to do"*, *"What to do right now"*, or *"Tantrum advice"* for deeper wisdom!`,
      timestamp: "Just now",
      highlight: "24-Hour Parenting Routine",
      actionLink: {
        label: "🌸 View Full 24-Hour Routine",
        href: "/about#parenting-routine"
      },
      quickPrompts: ["⏰ What to do right now?", "🍲 Afternoon what to do", "☀️ Morning routine", "🌙 Night & bedtime tips"]
    };
  }

  // 5. Sibling Rivalry & Sharing Toys
  if (
    hasIntent(q, [
      "sibling",
      "siblings",
      "sibling rivalry",
      "fighting",
      "fights",
      "quarrel",
      "quarreling",
      "sharing",
      "share toys",
      "not sharing",
      "hitting each other",
      "jealous",
      "jealousy"
    ]) ||
    ((q.includes("fight") || q.includes("share")) && (q.includes("toy") || q.includes("brother") || q.includes("sister") || q.includes("kids")))
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Oh, sibling squabbles! Grandma has seen generations of little brothers and sisters battle over the very same wooden train! 🚂👵

Here is Grandma's gentle peace formula:
1. **Don't Be the Court Judge:** If you always say *"Give it to your younger brother!"*, the elder feels resentful, and the younger learns to cry for favors. Instead say: *"Two children want one toy. What can we do together?"*
2. **The Turn-Taking Egg Timer:** Give them a 5-minute visual sand timer. *"When the sand drops, Lumina the Unicorn passes the toy to your sister!"* Children respect clocks much better than parental commands!
3. **1-on-1 Special Minutes:** Sibling rivalry is often a cry for undivided love. Give each child just 10 minutes of solo cuddle or play time with you every single day.`,
      timestamp: "Just now",
      quickPrompts: ["⏰ Current routine tip", "🧸 Tantrum soother", "🌙 Tell a bedtime story"]
    };
  }

  // 6. Separation Anxiety & School Drop-Off Tears
  if (
    hasIntent(q, [
      "separation anxiety",
      "school crying",
      "crying at school",
      "crying drop off",
      "drop off tears",
      "scared of school",
      "clingy",
      "clinging",
      "crying when i leave"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Those little tear-filled eyes break a parent's heart, Grandma knows! 🥺❤️👵

Here is Grandma's reassurance secret for school drop-offs:
1. **Never Sneak Away:** If a parent vanishes while the child looks away, the child's world feels unpredictable and they cling twice as hard next time. Always give a loving, confident goodbye.
2. **The Invisible Heart Button:** Before dropping them off, draw a small heart on their wrist with your finger. Tell them: *"Whenever you press this button today, my hug travels through the air right to you!"*
3. **Predictable Pickup Promise:** Children don't understand clock hours. Instead of saying *"I'll be back at 2 PM"*, say: *"Amma will be waiting right at the door after your afternoon snack and story time!"*`,
      timestamp: "Just now",
      quickPrompts: ["🌅 Morning routine", "⏰ What to do right now?", "🌙 Bedtime story"]
    };
  }

  // 7. Fear of the Dark & Nightmares
  if (
    hasIntent(q, [
      "fear of dark",
      "afraid of dark",
      "afraid of the dark",
      "nightmare",
      "nightmares",
      "bad dream",
      "bad dreams",
      "waking up at night",
      "scared to sleep",
      "monster",
      "monsters"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Night fears are very real to a tender, imaginative mind! 🌙✨👵

Grandma's bedside remedies:
1. **Grandma's Starlight Spray:** Take a small clean spray bottle with water and two drops of soothing rosewater. Label it *"Starlight Dream Mist"*. A gentle mist over their pillow dissolves bad dream worries like magic!
2. **Warm Golden Nightlight:** Ensure lighting is low and warm amber—not cold blue or pitch black.
3. **The Guardian Hero Book:** Read their personalised KuttyStory book where they conquer dark forests or fly with unicorns. Tell them: *"Look how brave you are in this book. That same bravery sleeps inside your heart tonight!"*`,
      timestamp: "Just now",
      quickPrompts: ["🌙 Tell me a bedtime story", "⏰ What to do right now?", "📖 Explore storybooks"]
    };
  }

  // 5. Fussy Eater / Food Advice
  if (
    hasIntent(q, [
      "fussy",
      "fussy eater",
      "fussy eating",
      "picky eater",
      "not eating",
      "refuse to eat",
      "refuses to eat",
      "food tantrum",
      "vegetable",
      "vegetables",
      "healthy food",
      "eat food",
      "eating tip"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Oh, the little food protest! Grandma knows this secret well! 🥦👵

1. **Never Make the Table a Battlefield:** If a child feels pushed, their tummy tightens. Offer food with a calm smile.
2. **The Dinosaur Crunch Game:** 'Can you show Grandma how a strong baby T-Rex munches this crunchy green carrot tree?'
3. **The 1-Bite Rule:** 'You don't have to finish it all, Kanna. Just give it one brave explorer bite!'
4. **Stories at the Table:** Tell them how the food was grown with sunlight and raindrops. Food eaten with laughter nourishes the spirit twice as much!`,
      timestamp: "Just now",
      quickPrompts: ["⏰ Current routine tip", "🌙 Tell a bedtime story", "🧸 Tantrum advice"]
    };
  }

  // 6. Tantrums, Meltdowns & Big Feelings
  if (
    hasIntent(q, [
      "tantrum",
      "tantrums",
      "meltdown",
      "meltdowns",
      "crying",
      "screaming",
      "stubborn",
      "big feelings",
      "angry child",
      "calm down",
      "soothe"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Come here, take a deep breath, dear parent. You are doing a wonderful job. ❤️👵

When little ones melt down, their brain is in a storm:
- **Do Not Lecture During the Storm:** Logic doesn't enter a brain that is flooding with big feelings.
- **Be the Anchor:** Get down to eye level, open your arms, and say softly: *'I see you are feeling big anger. You are safe. I am right here.'*
- **The Magic Butterfly Hug:** Cross hands over the chest and gently tap each shoulder alternately. It calms the nervous system in minutes.
- **After the Rain:** When they are calm and snuggled, talk about the feeling gently and read a story together.`,
      timestamp: "Just now",
      quickPrompts: ["⏰ Routine tip", "🌙 Bedtime story", "📖 Storybooks for kids"]
    };
  }

  // 7. How Personalisation Works & Creating a Book
  if (
    hasIntent(q, [
      "how it works",
      "how does it work",
      "personalise",
      "personalize",
      "custom book",
      "create book",
      "make book",
      "create a book",
      "steps",
      "photo upload",
      "how to make",
      "flipbook",
      "preview"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `It is as simple as magic in 4 easy steps, my dear! ✨📖

1. **Pick an Adventure:** Choose a heartwarming tale like *The Girl and the Magical Unicorn* (for ages 3–8).
2. **Add Your Child's Details:** Enter their name, gender, and upload a clear, smiling smartphone photo with guardian consent.
3. **Interactive 3D Virtual Flipbook:** Watch your child become the hero on every illustrated page and flip through the entire book before paying!
4. **Cherish Forever:** Order as an instant digital PDF or a luxury 8×8 inch hardbound keepsake delivered to your door!`,
      timestamp: "Just now",
      actionLink: {
        label: "🎨 Personalize a Story Book Now",
        href: "/how-it-works"
      },
      quickPrompts: ["💰 How much does it cost?", "🚚 Delivery timeline", "🔒 Is photo safe?"]
    };
  }



  // 10. Photo Safety & Child Privacy
  if (
    hasIntent(q, [
      "photo safe",
      "is photo safe",
      "privacy",
      "security",
      "child photo",
      "protect",
      "encrypted",
      "consent"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Grandma protects children above everything else in this world! 🛡️❤️

- **Guardian Consent First:** Photos are only accepted with guardian authorization.
- **Strictly Private:** Uploaded photos are processed in encrypted memory exclusively to generate your child's storybook illustrations.
- **Never Sold or Shared:** We never sell child data, and photos are NEVER used to train public AI models.
- **Encrypted Storage:** Only you and our secured printing atelier can produce the ordered keepsake.`,
      timestamp: "Just now",
      actionLink: {
        label: "🔒 Read Full Privacy Policy",
        href: "/privacy"
      },
      quickPrompts: ["🎨 How to make a book", "💰 Pricing", "🌙 Bedtime story"]
    };
  }

  // 11. Age Groups & Books
  if (
    hasIntent(q, [
      "age",
      "ages",
      "age group",
      "which age",
      "how old",
      "toddler",
      "preschooler",
      "3 year old",
      "4 year old",
      "5 year old",
      "6 year old",
      "7 year old",
      "8 year old"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Our storybooks are specially tailored for little minds aged **3 to 8 years old**! 👧👦✨

- **Ages 3–5 (Early Wonder):** Rich colorful spreads, gentle rhyming cadence, and seeing their own smiling face helps them love books before they even read!
- **Ages 6–8 (Budding Readers):** Engaging chapter rhythm, uplifting courage themes, and building deep reading confidence as they point: *'Look Amma, that is literally ME!'*`,
      timestamp: "Just now",
      actionLink: {
        label: "📚 Browse Stories by Age",
        href: "/stories#by-age"
      },
      quickPrompts: ["🌙 Tell a bedtime story", "💰 Pricing", "⏰ Current routine tip"]
    };
  }

  // 12. Bulk Orders & Birthday Return Gifts
  if (
    hasIntent(q, [
      "bulk",
      "return gift",
      "return gifts",
      "birthday return",
      "birthday gift",
      "birthday party",
      "group order"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `What a wonderful thought! 🎁✨ Personalised storybooks make the most meaningful birthday return gifts that children keep on their shelves for years, long after plastic toys are forgotten!

We provide custom milestone box-sets and birthday packages. You can reach our atelier directly via WhatsApp for celebration packages.`,
      timestamp: "Just now",
      actionLink: {
        label: "🎁 Explore Return Gift Collections",
        href: "/collections#birthday-return-gifts"
      },
      quickPrompts: ["💬 Chat on WhatsApp", "💰 Pricing", "🎨 How it works"]
    };
  }

  // 13. Screen Time Reduction
  if (
    hasIntent(q, [
      "screen",
      "screen time",
      "phone addiction",
      "gadget",
      "mobile addiction",
      "tv time",
      "ipad"
    ])
  ) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Grandma understands the modern struggle! 📱❌ Screens are bright and hypnotic, but books build heart and empathy.

Here is Grandma's gentle secret:
1. **Don't Just Say 'No', Replace It:** When you take the phone, hand them a storybook with their own picture, a sketchpad, or invite them to help you stir dosa batter!
2. **Screen-Free Bedrooms:** Keep charging cables outside sleeping areas.
3. **The 30-Minute Golden Rule:** No screens 30 minutes before bed; replace it with our 8:00 PM KuttyStory reading habit!`,
      timestamp: "Just now",
      quickPrompts: ["⏰ Current routine tip", "🌙 Tell a bedtime story", "📖 Explore storybooks"]
    };
  }

  // 14. Tamil Language & Regional
  if (hasIntent(q, ["tamil", "tamil book", "tamil story", "languages", "language"])) {
    return {
      id: `msg-${Date.now()}`,
      sender: "grandma",
      text: `Hi Kanna! 🙏 KuttyStory was born right in the historic heart of Tiruchirappalli, Tamil Nadu. 

Our main stories are currently printed in crystal-clear English so children build strong early reading vocabulary, and our Tamil storybook editions are currently in active development for select titles!`,
      timestamp: "Just now",
      actionLink: {
        label: "🏛️ About Our Tiruchirappalli Atelier",
        href: "/about"
      },
      quickPrompts: ["🎨 Explore Stories", "💰 Pricing", "🌙 Bedtime story"]
    };
  }

  // 16. Irrelevant / Unmatched Query: State clearly that Grandma couldn't understand and provide contact details
  return {
    id: `msg-${Date.now()}`,
    sender: "grandma",
    text: `Aaha Kanna, Grandma couldn't quite understand that question! 👵💭

I am here to share our storybooks, soothing bedtime stories, our 24-hour parenting routines, and help you create personalised KuttyStory books where your child is the hero.

For other questions or personal support, our caring team is always here to help:
📱 **WhatsApp:** +91 90031 69615
📧 **Email:** info@kuttystory.co.in
📍 **Atelier:** Tiruchirappalli, Tamil Nadu
🕒 **Hours:** Monday to Saturday, 9:00 AM – 7:00 PM IST

Feel free to message our team directly, or ask Grandma about our stories and parenting tips!`,
    timestamp: "Just now",
    actionLink: {
      label: "💬 Chat on WhatsApp",
      href: "https://wa.me/919003169615"
    },
    quickPrompts: [
      "📚 List out stories",
      "🌙 Tell me a bedtime story",
      "⏰ What's our routine now?",
      "📖 How does KuttyStory work?",
      "💰 Book prices & delivery"
    ]
  };
}

