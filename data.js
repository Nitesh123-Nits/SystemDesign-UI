const QUESTIONS = [
  {
    id: 1, icon: "🐦", title: "Design Twitter / X",
    company: "Twitter, Meta, Amazon", difficulty: "hard",
    tags: ["Social Media", "Feed", "Scaling"],
    desc: "Design a social media platform with tweets, followers, timelines and search at scale.",
    readTime: "25 min",
    requirements: {
      functional: ["Post tweets (text, images, video)", "Follow/unfollow users", "Home timeline (chronological + ranked)", "Like, retweet, reply", "Search tweets and users", "Notifications"],
      nonFunctional: ["500M daily active users", "100M tweets/day", "Read-heavy (100:1 read-write ratio)", "Low latency timeline (<200ms)", "High availability (99.99%)"]
    },
    scope: {
      in: ["Post/Retweet/Reply logic", "Follower graph & Fan-out service", "Timeline pre-computation", "Search indexing"],
      out: ["Ad-revenue optimization", "E2E Encrypted DMs", "Machine learning sentiment analysis"]
    },
    capacity: [
      { label: "Daily Tweets", value: "100M", unit: "tweets/day" },
      { label: "Write QPS", value: "1,200", unit: "req/sec" },
      { label: "Read QPS", value: "120K", unit: "req/sec" },
      { label: "Storage/day", value: "~100GB", unit: "/day" }
    ],
    boe: [
      { label: "Write QPS Calculation", calc: "100,000,000 tweets / 86,400 seconds", result: "1,157 requests/sec (Avg)" },
      { label: "Read QPS Calculation", calc: "1,200 write QPS × 100 (Read Ratio)", result: "120,000 requests/sec" },
      { label: "Tweet Storage/Day", calc: "100M tweets × 300 bytes (avg metadata)", result: "30 GB/day" },
      { label: "Media Storage/Day", calc: "10M images × 200KB + 1M videos × 2MB", result: "4 TB/day" }
    ],
    hld: {
      layers: [
        { label: "User Layer", nodes: [{ type: "client", name: "Mobile/Web App", icon: "📱", detail: "React Native / Next.js clients with WebSocket support" }] },
        { label: "Delivery Layer", arrow: "HTTPS / TLS", nodes: [{ type: "cdn", name: "Edge CDN", icon: "🌐", detail: "Akamai/Cloudflare. Caches static assets & media." }] },
        { label: "Ingress Layer", arrow: "API Calls", nodes: [{ type: "lb", name: "Load Balancer", icon: "⚖️", detail: "Nginx/HAProxy. SSL Termination & Health Checks." }, { type: "gateway", name: "API Gateway", icon: "🛡️", detail: "Auth, Rate Limiting, Routing" }] },
        { label: "Service Layer", arrow: "gRPC / REST", nodes: [
          { type: "service", name: "Tweet Service", icon: "✍️", detail: "Handles posting and retrieval of tweets" },
          { type: "service", name: "Fan-out Service", icon: "📢", detail: "Pushes tweets to followers' timelines" },
          { type: "service", name: "Search Service", icon: "🔍", detail: "Elasticsearch-based indexing and search" }
        ]},
        { label: "Async Layer", arrow: "Pub/Sub", nodes: [{ type: "queue", name: "Kafka Broker", icon: "📨", detail: "Message stream for analytics and async processing" }] },
        { label: "Persistence Layer", nodes: [
          { type: "db", name: "Cassandra", icon: "🗄️", detail: "Main tweet storage. Scalable, high write throughput." },
          { type: "cache", name: "Redis Timeline", icon: "⚡", detail: "In-memory pre-computed newsfeeds" },
          { type: "db", name: "Postgres", icon: "🏢", detail: "Relational data: User profiles, follows, relationships" }
        ]}
      ],
      flows: [
        { title: "Tweet Write Path", desc: "User posts ➔ LB ➔ Tweet Service ➔ Cassandra (Store) ➔ Kafka (Event). Fan-out worker pulls from Kafka ➔ updates Redis timelines for all online followers." },
        { title: "Timeline Read Path", desc: "User opens app ➔ LB ➔ Feed Service ➔ Redis (Fetch pre-computed feed). If cache miss, fetch from Cassandra (Slow Path)." }
      ]
    },
    dataModel: [
      {
        entity: "User", db: "PostgreSQL",
        fields: [
          { name: "user_id", type: "UUID", note: "Primary Key" },
          { name: "username", type: "VARCHAR(25)", note: "Unique" },
          { name: "bio", type: "TEXT", note: "User description" },
          { name: "created_at", type: "TIMESTAMP", note: "Account creation date" }
        ]
      },
      {
        entity: "Tweet", db: "Cassandra",
        fields: [
          { name: "tweet_id", type: "TIMEUUID", note: "Primary Key (Shard Key)" },
          { name: "creator_id", type: "UUID", note: "FK to User" },
          { name: "content", type: "VARCHAR(280)", note: "Tweet text" },
          { name: "media_url", type: "VARCHAR(255)", note: "Link to S3" }
        ]
      },
      {
        entity: "Follows", db: "PostgreSQL / Graph",
        fields: [
          { name: "follower_id", type: "UUID", note: "Composite PK" },
          { name: "followee_id", type: "UUID", note: "Composite PK" },
          { name: "timestamp", type: "TIMESTAMP", note: "Follow date" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/tweets", desc: "Post a new tweet. { content: string, media_ids: [] }" },
      { method: "GET", path: "/v1/timeline", desc: "Fetch home timeline for current user. Supports pagination." },
      { method: "POST", path: "/v1/users/:id/follow", desc: "Follow a specific user." }
    ],
    deepDive: [
      {
        icon: "📢", title: "Fan-out on Write Strategy",
        points: [
          { heading: "What is it?", body: "When a user posts, we proactively push the tweet ID into the Redis timelines of all their followers." },
          { heading: "The Pro", body: "Reading the timeline is extremely fast (O(1) Redis lookup). Perfect for heavy read traffic." },
          { heading: "The Con", body: "The 'Celebrity Problem'. If a user has 50M followers, one write triggers 50M Redis updates, causing massive spikes." }
        ],
        diagram: ["Post Tweet", "Store in DB", "Fetch Followers", "Push to 10M Caches"]
      },
      {
        icon: "⚡", title: "Hybrid Timeline Approach",
        points: [
          { heading: "The Solution", body: "Social graph is split by celebrity status. Regular users use 'Fan-out on Write'. Celebrities use 'Fan-out on Read'." },
          { heading: "Implementation", body: "Maintain a 'Celebrity List'. At read time, merge the Redis pre-computed feed with recent tweets from celebrities the user follows." }
        ]
      }
    ],
    tradeoffs: [
      { option: "Fan-out on Write", pro: "O(1) read latency for timelines", con: "Celebrity write-latency spike", when: "Most users with low-to-medium follower counts" },
      { option: "Fan-out on Read", pro: "Efficient for celebrities; no write-spike", con: "Slow reads (merging results)", when: "Users with millions of followers" },
      { option: "Hybrid Approach", pro: "Balanced performance across all user types", con: "Increased system complexity (Logic to split paths)", when: "Standard for high-scale social apps" }
    ],
    bottlenecks: [
      { problem: "Hot keys in Redis timelines", solution: "Distribute celebrity feeds into separate 'Celebrity Stores' or use fan-out on read." },
      { problem: "Database replication lag for follow counts", solution: "Use Redis INCR for real-time counts, sync with DB asynchronously." }
    ],
    qa: [
      { q: "How do you handle retweets?", a: "Retweets are treated as a special tweet type with a pointer to the original tweet_id. When fetching the timeline, we resolve these references." },
      { q: "How do you ensure timeline consistency?", a: "We use idempotent fan-out workers and exactly-once delivery semantics in Kafka where possible, though eventual consistency is acceptable for most feeds." },
      { q: "What happens if the Redis timeline server crashes?", a: "We rebuild the timeline from the Cassandra Tweet store. This is slower (active recovery) but ensures no data is lost." }
    ],
    tips: [
      { icon: "📣", title: "Celebrity Problem", text: "Proactively mentioning the 'Fan-out on Write' vs 'Fan-out on Read' trade-off for celebrities is a major signal in this interview." },
      { icon: "🔄", title: "Eventual Consistency", text: "Don't promise hard consistency for follower counts or social graphs; it's too expensive to Scale. Explain why eventual consistency is okay for UX." }
    ],
    signals: {
      hire: ["Discussed fan-out on write vs. read trade-offs", "Proposed hybrid model for celebrities", "Understood eventual consistency for social graphs"],
      nohire: ["Ignored write amplification for celebrities", "No plan for timeline caching", "Proposed synchronous fan-out for all users"]
    },
    related: [2, 5, 9]
  },
  {
    id: 2, icon: "📺", title: "Design YouTube / Netflix",
    company: "Google, Netflix, Meta", difficulty: "hard",
    tags: ["Video Streaming", "CDN", "Encoding"],
    desc: "Design a video streaming platform supporting upload, transcoding, and global delivery.",
    readTime: "30 min",
    requirements: {
      functional: ["Upload videos", "Stream video at multiple resolutions", "Search and recommendations", "Like, comment, subscribe", "User channels and playlists"],
      nonFunctional: ["1B users, 500 hours uploaded/min", "Low buffering (<2s start latency)", "Global CDN delivery", "High availability", "Adaptive bitrate streaming"]
    },
    scope: {
      in: ["Video uploading & Transcoding pipeline", "Metadata storage", "CDN distribution logic", "View counter service"],
      out: ["Real-time video chat", "Copyright infringement detection (ContentID)", "Video editing suite"]
    },
    capacity: [
      { label: "Upload Rate", value: "500hr", unit: "/min" },
      { label: "Video Storage", value: "~1EB", unit: "total" },
      { label: "Daily Views", value: "5B", unit: "videos/day" },
      { label: "Peak CDN", value: "1Tbps+", unit: "bandwidth" }
    ],
    boe: [
      { label: "Storage Calculation", calc: "500 hrs/min × 60 min × 10GB (multires)", result: "300 TB / hour" },
      { label: "Daily Storage", calc: "300 TB/hr × 24 hours", result: "7.2 PB / day" },
      { label: "Read QPS (Views)", calc: "5,000,000,000 views / 86,400 seconds", result: "57,870 views/sec" },
      { label: "Bandwidth (Outbound)", calc: "58K views/sec × 500MB (avg video size)", result: "29 TB/sec (Distributed)" }
    ],
    hld: {
      layers: [
        { label: "Client Layer", nodes: [{ type: "client", name: "DASH/HLS Player", icon: "📺", detail: "Adaptive Bitrate Streaming (ABR) support" }] },
        { label: "Edge Layer", arrow: "Video Chunks", nodes: [{ type: "cdn", name: "Netflix Open Connect", icon: "🌐", detail: "Global edge points of presence (PoPs)" }] },
        { label: "Ingress Layer", arrow: "API Calls", nodes: [{ type: "lb", name: "Global LB", icon: "⚖️", detail: "Anycast IP routing to nearest DC" }, { type: "gateway", name: "API Gateway", icon: "🛡️", detail: "Auth, Metadata updates, Search" }] },
        { label: "Ingestion Layer", arrow: "Uploads", nodes: [
          { type: "service", name: "Upload Service", icon: "📤", detail: "Handles chunked uploads and resumption" },
          { type: "queue", name: "Job Queue", icon: "📨", detail: "Kafka topics for transcoding tasks" }
        ]},
        { label: "Processing Layer", arrow: "DAG Tasks", nodes: [{ type: "service", name: "Transcoding Pipeline", icon: "🎬", detail: "Distributed workers for encoding to 360p, 720p, 4K" }] },
        { label: "Persistence Layer", nodes: [
          { type: "storage", name: "Object Store (S3)", icon: "☁️", detail: "Stores raw and transcoded video segments" },
          { type: "db", name: "Metadata DB (Vitess)", icon: "🗄️", detail: "Scalable MySQL for video/user metadata" },
          { type: "cache", name: "Redis", icon: "⚡", detail: "Caching hot video metadata & view counts" }
        ]}
      ],
      flows: [
        { title: "Video Upload Path", desc: "User uploads chunks ➔ Upload Service ➔ Object Store (Raw). Notify Backend ➔ Kafka Task ➔ Transcoding Pipeline ➔ Segments stored in S3 ➔ Metadata updated." },
        { title: "Streaming Path", desc: "User requests video ➔ API Gateway ➔ Fetch metadata ➔ return Manifest (M3U8/MPD) ➔ Client requests chunks from CDN ➔ Edge cache hit/miss ➔ Playback." }
      ]
    },
    dataModel: [
      {
        entity: "VideoMetadata", db: "MySQL (Vitess)",
        fields: [
          { name: "video_id", type: "UUID", note: "PK" },
          { name: "title", type: "VARCHAR(255)", note: "Searchable" },
          { name: "duration", type: "INT", note: "Seconds" },
          { name: "manifest_url", type: "VARCHAR(512)", note: "Link to master manifest in S3" },
          { name: "status", type: "ENUM", note: "Uploading, Transcoding, Ready" }
        ]
      },
      {
        entity: "User", db: "MySQL",
        fields: [
          { name: "user_id", type: "UUID", note: "PK" },
          { name: "channel_id", type: "UUID", note: "FK to Channel" },
          { name: "email", type: "VARCHAR(255)", note: "Unique" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/videos/upload", desc: "Initiate multipart upload session." },
      { method: "GET", path: "/v1/videos/:id/metadata", desc: "Fetch manifest and video details." },
      { method: "POST", path: "/v1/videos/:id/comments", desc: "Post a comment on a video." }
    ],
    deepDive: [
      {
        icon: "🎬", title: "Video Transcoding Pipeline",
        points: [
          { heading: "Complexity", body: "500 hrs/min of video requires specialized hardware (ASICs/GPUs) and a massive distributed task scheduler." },
          { heading: "The DAG Approach", body: "Treat transcoding as a Directed Acyclic Graph. Step 1: Inspection. Step 2: Split into 10s chunks. Step 3: Parallel encoding. Step 4: Quality check. Step 5: Merge manifests." }
        ],
        diagram: ["Raw Video", "Chunker", "Parallel Workers (360p, 720p, 1080p)", "Manifest Packer"]
      }
    ],
    tradeoffs: [
      { option: "CDN Pull", pro: "Easy to maintain; automated", con: "First request is slow; origin spike", when: "General long-tail content" },
      { option: "CDN Push", pro: "Immediate performance for all requests", con: "Storage costs; complex synchronization", when: "High-traffic 'Trending' videos or Live events" },
      { option: "Fixed vs Variable Chunking", pro: "Fixed is simpler; Variable is better for ABR", con: "Variable requires more transcoding compute", when: "Adaptive bitrate streaming over HLS/DASH" }
    ],
    bottlenecks: [
      { problem: "Transcoding backlog", solution: "Priority-based queuing: encode 360p first for 'Instant playback', queue 4K for later." },
      { problem: "CDN Origin Spikes", solution: "Shielding layer (Origin Cache) and multi-level CDN distribution." }
    ],
    qa: [
      { q: "How do you handle copyright (Content ID)?", a: "Use a background asynchronous task. Fingerprint the audio/video and compare hashes against a large database of known content." },
      { q: "How do you ensure low latency globally?", a: "Use Anycast IP with Global Load Balancing to route users to the nearest CDN Edge location (PoP)." },
      { q: "How are view counts handled?", a: "Use an append-only log or Kafka topic for view events. Aggregate in-memory (Spark/Flink) and update the main DB periodically to avoid hot-row locking." }
    ],
    tips: [
      { icon: "🎬", title: "DAG Pipeline", text: "Explain transcoding as a Directed Acyclic Graph (DAG) for parallel processing of bitrates and chunk merging." },
      { icon: "🌐", title: "Edge Computing", text: "Discuss how modern streamers (Netflix/YouTube) use specialized hardware or local peering at ISPs to bypass the public internet." }
    ],
    signals: {
      hire: ["Explained DAG-based transcoding pipeline", "Mentioned CDN caching and edge delivery", "Discussed adaptive bitrate streaming"],
      nohire: ["Proposed synchronous video encoding", "Ignored global bandwidth costs", "No plan for hot-video caching"]
    },
    related: [1, 6, 8]
  },
  {
    id: 3, icon: "🚗", title: "Design Uber / Lyft",
    company: "Uber, Lyft, Ola", difficulty: "hard",
    tags: ["GPS", "Real-time", "Matching"],
    desc: "Design a ride-sharing platform with real-time location tracking and driver-rider matching.",
    readTime: "25 min",
    requirements: {
      functional: ["Request rides", "Match rider with nearby driver", "Real-time location tracking", "Fare calculation", "Trip history and receipts"],
      nonFunctional: ["Matching latency <1s", "Location updates every 4 seconds", "High availability", "Consistent pricing", "Global scale"]
    },
    scope: {
      in: ["Geospatial indexing (Geohash/Quadtree)", "Matching algorithm architecture", "Trip lifecycle & Pub/Sub", "Payment ledger"],
      out: ["Autonomous vehicle control", "Insurance underwriting", "Advanced carpooling (UberPool) routing"]
    },
    capacity: [
      { label: "Active Drivers", value: "5M", unit: "globally" },
      { label: "Location Updates", value: "1.25M", unit: "req/sec" },
      { label: "Rides/day", value: "20M", unit: "rides" },
      { label: "Match Latency", value: "<1s", unit: "p99" }
    ],
    boe: [
      { label: "Location Update QPS", calc: "5,000,000 drivers / 4 seconds", result: "1,250,000 req/sec" },
      { label: "Matching QPS", calc: "20,000,000 rides / 86,400 seconds", result: "231 requests/sec (Avg)" },
      { label: "Peak Matching", calc: "231 × 10 (Peak Multiplier)", result: "2,300+ req/sec" },
      { label: "GPS Storage/Year", calc: "1.25M updates/s × 32 bytes × 86400 × 365", result: "1.2 PB / Year" }
    ],
    hld: {
      layers: [
        { label: "Client Layer", nodes: [
          { type: "client", name: "Rider App", icon: "📱", detail: "Request rides, track GPS" },
          { type: "client", name: "Driver App", icon: "🚗", detail: "Broadcast GPS, Accept rides" }
        ]},
        { label: "Communication Layer", arrow: "WebSockets", nodes: [{ type: "gateway", name: "Socket Mirror", icon: "🔌", detail: "Highly scalable WebSocket fleet for TCP push" }] },
        { label: "Routing Layer", arrow: "Events", nodes: [{ type: "lb", name: "API Gateway", icon: "🛡️", detail: "gRPC routing and Auth" }] },
        { label: "Intelligence Layer", arrow: "Geo-spatial", nodes: [
          { type: "service", name: "Location Service", icon: "📍", detail: "Updates driver geohash in cache" },
          { type: "service", name: "Match Service", icon: "🔗", detail: "Matches driver using Quadtree" },
          { type: "service", name: "Pricing Service", icon: "💰", detail: "Calculates surge pricing" }
        ]},
        { label: "Persistence Layer", nodes: [
          { type: "cache", name: "Redis Geo", icon: "⚡", detail: "In-memory geospatial index (GEORADIUS)" },
          { type: "db", name: "Cassandra", icon: "🗄️", detail: "Stores entire history of trip coordinates" },
          { type: "db", name: "PostgreSQL", icon: "🏢", detail: "Transactional data: Billing, Users, Profile" }
        ]}
      ],
      flows: [
        { title: "Driver Location Flow", desc: "Driver App ➔ WebSocket ➔ Location Service ➔ Redis (Update Geo Index). Every 4 seconds." },
        { title: "Rider Match Flow", desc: "Rider ➔ Match Service ➔ Query Redis (Nearby Drivers) ➔ Filter by ETA ➔ Send offer to Driver ➔ WebSocket Push." }
      ]
    },
    dataModel: [
      {
        entity: "DriverLocation", db: "Redis / Cassandra",
        fields: [
          { name: "driver_id", type: "UUID", note: "PK" },
          { name: "lat_long", type: "POINT", note: "Current coordinate" },
          { name: "geohash", type: "VARCHAR(12)", note: "Indexed for fast search" },
          { name: "last_ping", type: "TIMESTAMP", note: "Heartbeat check" }
        ]
      },
      {
        entity: "Trip", db: "PostgreSQL",
        fields: [
          { name: "trip_id", type: "UUID", note: "PK" },
          { name: "rider_id", type: "UUID", note: "FK" },
          { name: "driver_id", type: "UUID", note: "FK" },
          { name: "status", type: "ENUM", note: "Requested, Matching, Active, Done" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/rides/request", desc: "Request a ride from A to B. { source: [], dest: [] }" },
      { method: "PATCH", path: "/v1/drivers/location", desc: "Update current GPS (Alternative to WebSocket)." },
      { method: "GET", path: "/v1/trips/:id", desc: "Get real-time trip status." }
    ],
    deepDive: [
      {
        icon: "📍", title: "Geospatial Indexing",
        points: [
          { heading: "Geohash vs Quadtree", body: "Geohash converts 2D coordinates into a 1D string. Better for simple range searches. Quadtree is more adaptive to user density." },
          { heading: "Google S2 Library", body: "Alternative used by Uber. Maps the sphere into a 1D space using Hilbert Curves for extremely efficient spatial queries." }
        ],
        diagram: ["Map Coordinate", "64-bit S2 Cell ID", "Redis Index Search", "Nearby Driver List"]
      }
    ],
    tradeoffs: [
      { option: "Geohash", pro: "Easy to implement; standard SQL support", con: "Uniform grid size; hard to re-index", when: "Simple range searches" },
      { option: "Quadtree", pro: "Adaptive to user density", con: "Memory intensive; hard to distribute", when: "High density urban environments" },
      { option: "Google S2 Cells", pro: "Extremely fast; Hilbert curve mapping", con: "Complex implementation", when: "Global apps like Uber/Pokémon GO" }
    ],
    bottlenecks: [
      { problem: "1.2M location updates/sec", solution: "Shard the connection gateway by city/region to keep traffic local." },
      { problem: "Double matching of same driver", solution: "Use Redis distributed locks with a short TTL (5-10s) during matching." }
    ],
    qa: [
      { q: "How is surge pricing calculated?", a: "Based on supply (drivers in S2 cell) vs demand (active riders). The system uses real-time event aggregation (Flink) to update surge multipliers on the map." },
      { q: "How do you handle driver disconnection?", a: "The WebSocket gateway detects heartbeats. If a driver misses 3 heartbeats, we remove them from the 'Active' set in Redis." },
      { q: "What's the 'Celebrity' problem for Uber?", a: "Large events (Stadiums). The match service pre-allocates a pickup-point queue rather than individual GPS matching to handle the density." }
    ],
    tips: [
      { icon: "📍", title: "Geo-indexing", text: "Choose a library (S2/H3) and stick to it. Explain why 2D indexing is insufficient for 1M/s traffic." },
      { icon: "🚗", title: "City-Level Sharding", text: "Uber doesn't match a rider in NY with a driver in LA. Shard your database and servers by 'City ID' to reduce search space." }
    ],
    signals: {
      hire: ["Explained geospatial indexing (S2/H3/Geohash)", "Discussed city-level sharding", "Proposed persistent WebSocket for real-time tracking"],
      nohire: ["Proposed O(N) search for nearby drivers", "No plan for 1M+ RPS location updates", "Ignored double-matching race conditions"]
    },
    related: [7, 4, 10]
  },
  {
    id: 4, icon: "💬", title: "Design WhatsApp",
    company: "Meta, Telegram, Signal", difficulty: "medium",
    tags: ["Messaging", "E2E Encryption", "Presence"],
    desc: "Design a real-time messaging app with 1:1 chats, group chats, delivery receipts and media sharing.",
    readTime: "22 min",
    requirements: {
      functional: ["1:1 and group messaging", "Message delivery receipts (sent/delivered/read)", "Online presence / last seen", "Media sharing (images, video, docs)", "End-to-end encryption"],
      nonFunctional: ["2B users", "100B messages/day", "Message delivery <100ms", "Offline message queuing", "99.99% uptime"]
    },
    scope: {
      in: ["WebSocket/TCP connection management", "Message persistence (Cassandra)", "Presence service (Redis)", "Group chat fan-out"],
      out: ["VoIP/Video call signaling", "E2E Encryption implementation details", "Status/Stories features"]
    },
    capacity: [
      { label: "Daily Messages", value: "100B", unit: "/day" },
      { label: "Write QPS", value: "1.15M", unit: "req/sec" },
      { label: "Active Users", value: "2B", unit: "globally" },
      { label: "Message Latency", value: "<100ms", unit: "p99" }
    ],
    boe: [
      { label: "Message QPS Calculation", calc: "100,000,000,000 msgs / 86,400 seconds", result: "1,157,407 msgs/sec" },
      { label: "Message Storage/Year", calc: "100B msgs/day × 100 bytes × 365 days", result: "3.6 PB / Year" },
      { label: "Media Storage/Day", calc: "2B images/day × 200KB + 100M videos × 2MB", result: "600 TB / day" }
    ],
    hld: {
      layers: [
        { label: "Client Layer", nodes: [
          { type: "client", name: "WhatsApp Mobile", icon: "📱", detail: "Maintains long-lived WebSocket connections" }
        ]},
        { label: "Connection Layer", arrow: "TCP/WebSocket", nodes: [
          { type: "gateway", name: "Socket Manager", icon: "🔌", detail: "Maintains 100K+ concurrent connections per node" }
        ]},
        { label: "Core Service Layer", arrow: "Msg Routing", nodes: [
          { type: "service", name: "Message Service", icon: "📨", detail: "Routes messages and handles idempotency" },
          { type: "service", name: "Presence Service", icon: "🟢", detail: "Handles 'Last Seen' and Online status (Redis)" },
          { type: "service", name: "Group Service", icon: "👥", detail: "Manages group memberships and fan-out" }
        ]},
        { label: "Push Layer", arrow: "Callbacks", nodes: [
          { type: "service", name: "Push Gateway", icon: "🔔", detail: "Interfaces with FCM (Android) and APNS (iOS)" }
        ]},
        { label: "Persistence Layer", nodes: [
          { type: "db", name: "Cassandra (Messages)", icon: "🗄️", detail: "Stores individual and group chat messages" },
          { type: "cache", name: "Redis (Session)", icon: "⚡", detail: "Online status and connection mappings" },
          { type: "storage", name: "Media (S3)", icon: "☁️", detail: "Encrypted images, videos, and documents" }
        ]}
      ],
      flows: [
        { title: "One-to-One Message", desc: "Client1 ➔ WebSocket ➔ Message Service ➔ Cassandra (Store) ➔ Check Client2 Connection ➔ Push to Socket/FCM." },
        { title: "Presence Update", desc: "Client pings Socket Manager ➔ Every 30s ➔ Update TTL in Redis. If stale ➔ Notify user offline." }
      ]
    },
    dataModel: [
      {
        entity: "Message", db: "Cassandra",
        fields: [
          { name: "chat_id", type: "UUID", note: "Partition Key (UserA_UserB)" },
          { name: "message_id", type: "TIMEUUID", note: "Clustering Key (Sorted by time)" },
          { name: "sender_id", type: "UUID", note: "FK User" },
          { name: "payload", type: "TEXT", note: "Encrypted message content" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/messages", desc: "Send message (fallback if WebSocket disconnected)." },
      { method: "GET", path: "/v1/chats/:id", desc: "Fetch chat history with pagination." }
    ],
    deepDive: [
      {
        icon: "🟢", title: "Last Seen / Presence Optimization",
        points: [
          { heading: "The 10M QPS Problem", body: "Checking presence for every contact in a user list causes massive spikes. Don't push presence changes proactively." },
          { heading: "Pull Pattern", body: "Only fetch presence for visible contacts in the current UI view. Use Redis bitstrings for high-performance status tracking." }
        ]
      }
    ],
    tradeoffs: [
      { option: "TCP vs WebSockets", pro: "TCP is lower level; WebSockets is easier for mobile/web", con: "Custom frame handling in TCP", when: "Bidirectional real-time apps" },
      { option: "Strong vs Eventual Presence", pro: "Accurate 'Last Seen'", con: "Massive write load", when: "Eventual consistency is standard for social apps" }
    ],
    bottlenecks: [
      { problem: "Billion user presence updates", solution: "Push updates only to 'Active Contacts' currently in view, not the entire list." },
      { problem: "Message ordering in groups", solution: "Use a centralized sequencer or logical clocks for message matching." }
    ],
    qa: [
      { q: "How are group messages handled?", a: "Fan-out on the server: a single incoming message is replicated into the delivery queues of all group members." },
      { q: "How do you handle 'Last Seen'?", a: "Client updates a heartbeat in Redis with a TTL. Last-seen is only fetched when the contact is actually visible in the UI." },
      { q: "How do you handle offline users?", a: "Store in a Cassandra 'Pending' table. Once a user reconnects, the server pushes all queued messages." }
    ],
    tips: [
      { icon: "🔌", title: "Connection Managers", text: "Explain how you'd scale to 2B users using a horizontally sharded fleet of 'Connection Manager' servers." },
      { icon: "🔐", title: "E2E Encryption", text: "Mention the Signal Protocol. The server only sees encrypted blobs; keys live on the devices." }
    ],
    signals: {
      hire: ["Proposed distributed connection gateway", "Understood user presence fetch-on-visibility optimization", "Mentioned E2E encryption without key management on server"],
      nohire: ["Proposed polling for presence", "No plan for 2B user scale", "Ignored offline message queuing"]
    },
    related: [1, 9, 6]
  },
  {
    id: 5, icon: "🔍", title: "Design Google Search",
    company: "Google, Bing, DuckDuckGo", difficulty: "hard",
    tags: ["Search Engine", "Indexing", "Crawling"],
    desc: "Design a web-scale search engine with crawling, indexing, ranking and real-time query serving.",
    readTime: "35 min",
    requirements: {
      functional: ["Web crawling", "Indexing web pages", "Search query processing", "Ranked results (PageRank)", "Query suggestions / autocomplete"],
      nonFunctional: ["Index petabytes of web pages", "Query latency <200ms", "Fresh index (crawl cycle)", "Billions of daily queries", "Fault tolerant crawling"]
    },
    scope: {
      in: ["URL Frontier & Prioritization", "Distributed fetchers", "HTML parsing & Link extraction", "URL Deduplication (Bloom Filters)"],
      out: ["Ranking algorithms (PageRank)", "Full-text search engine UI", "Deep-web/Dark-web crawling"]
    },
    capacity: [
      { label: "Web Pages", value: "1B", unit: "/month" },
      { label: "Storage/yr", value: "1.2PB", unit: "total" },
      { label: "Read QPS", value: "0", unit: "N/A" },
      { label: "Fetch QPS", value: "400", unit: "req/sec" }
    ],
    boe: [
      { label: "QPS Calculation", calc: "1,000,000,000 pages / 30 days / 86,400 seconds", result: "385 pages/sec" },
      { label: "Storage Calculation", calc: "1B pages × 100KB (avg page size)", result: "100 TB / month" },
      { label: "Bandwidth Ingress", calc: "400 QPS × 100KB", result: "40 MB/sec" }
    ],
    hld: {
      layers: [
        { label: "Seeding Layer", nodes: [{ type: "db", name: "URL Seed List", icon: "🌱", detail: "Initial list of high-value domains (.com, .org)" }] },
        { label: "Strategy Layer", nodes: [
          { type: "service", name: "URL Frontier", icon: "🚧", detail: "Prioritizes and manages politeness per domain" },
          { type: "service", name: "DNS Resolver", icon: "🔍", detail: "Local cache for domain-to-IP mappings" }
        ]},
        { label: "Fetcher Layer", nodes: [
          { type: "service", name: "HTML Fetcher", icon: "🌐", detail: "Handles HTTP/S requests and robots.txt checks" },
          { type: "service", name: "Content Filter", icon: "🛡️", detail: "Deduper and spam/adult content detection" }
        ]},
        { label: "Persistence Layer", nodes: [
          { type: "storage", name: "Raw Page Store", icon: "☁️", detail: "BigTable / GCS - stores raw compressed HTML" },
          { type: "db", name: "Metadata Graph", icon: "🗄️", detail: "Stores extracted links and PageRank metadata" }
        ]}
      ],
      flows: [
        { title: "Crawling Cycle", desc: "URL Frontier ➔ Fetcher ➔ Robots.txt check ➔ Download HTML ➔ Parsers (Extract Links) ➔ Dedup ➔ Push new URLs to Frontier." }
      ]
    },
    dataModel: [
      {
        entity: "URL_Frontier", db: "Redis / HBase",
        fields: [
          { name: "url_hash", type: "UUID", note: "Shard Key" },
          { name: "full_url", type: "TEXT", note: "Canonicalized URL" },
          { name: "priority", type: "FLOAT", note: "Based on quality/PageRank" },
          { name: "next_crawl", type: "TIMESTAMP", note: "Politeness delay" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/admin/seeds", desc: "Admin tool to inject new root URLs." },
      { method: "GET", path: "/v1/status/stats", desc: "Monitor current crawl throughput." }
    ],
    deepDive: [
      {
        icon: "🚧", title: "Politeness & Priority in URL Frontier",
        points: [
          { heading: "Politeness", body: "Maintain N domain-specific queues. One worker assigned to one queue ensures only one concurrent request per host." },
          { heading: "Priority", body: "Calculate a 'Quality Score' (from PageRank/Backlinks). Use N priority levels; workers pull more heavily from higher levels." }
        ]
      }
    ],
    tradeoffs: [
      { option: "BFS vs DFS", pro: "BFS is better for breadth/reach", con: "Memory intensive (Frontier size)", when: "Standard web crawl" },
      { option: "Bloom Filters vs Hash Set", pro: "Bloom filter is extremely memory efficient", con: "Small false positive rate (might skip a few pages)", when: "URL deduplication at 10B+ scale" }
    ],
    bottlenecks: [
      { problem: "DNS Resolution Overhead", solution: "Maintain a local high-performance DNS cache for fetched domains." },
      { problem: "Spider Traps / Cyclic URLs", solution: "Limit URL depth and use content hashing to detect duplicate pages under different URLs." }
    ],
    qa: [
      { q: "What is the URL Frontier?", a: "A priority queue that manages URL processing order, ensuring we crawl high-value domains first while respecting 'Politeness' (not hitting one domain too fast)." },
      { q: "How do you handle 'Robots.txt'?", a: "Cache the robots.txt file for every domain and check it before every fetch to ensure compliance." },
      { q: "How do you detect duplicate content?", a: "Use Jaccard similarity or MinHash on the HTML content rather than just the URL." }
    ],
    tips: [
      { icon: "🚧", title: "Politeness Strategy", text: "Explain that hitting a server too hard can lead to IP bans. Discuss per-domain rate limiting and wait times." },
      { icon: "🌱", title: "Freshness", text: "Mention that critical pages (news/stock sites) are re-crawled more frequently than static personal blogs." }
    ],
    signals: {
      hire: ["Focused on 'Politeness' and robots.txt", "Proposed Bloom Filters for URL dedup", "Discussed DNS caching at the fetcher level", "Understood priority-based frontier management"],
      nohire: ["Ignored DNS resolution time", "No plan for cycle detection", "Proposed a single SQL table for the URL frontier", "Didn't consider bandwidth per fetcher node"]
    },
    related: [10, 8, 11]
  },
  {
    id: 6, icon: "📸", title: "Design Instagram",
    company: "Meta, Pinterest, Snapchat", difficulty: "medium",
    tags: ["Social Media", "Media Upload", "Feed"],
    desc: "Design a photo/video sharing social network with feeds, stories, and explore functionality.",
    readTime: "20 min",
    requirements: {
      functional: ["Upload photos and videos", "Follow users, see their posts in feed", "Like and comment", "Stories (ephemeral content)", "Explore/discover page"],
      nonFunctional: ["1B users, 100M posts/day", "Feed load <500ms", "Media delivery via CDN", "High availability", "Eventual consistency for feed"]
    },
    scope: {
      in: ["Image storage & CDN strategy", "Newsfeed pre-computation", "Follower graph partitioning", "Metadata sharding"],
      out: ["Image filtration/AI sorting", "Private accounts & permissions", "Direct Messaging"]
    },
    capacity: [
      { label: "Daily Uploads", value: "100M", unit: "/day" },
      { label: "Feed Views", value: "5B", unit: "views/day" },
      { label: "Active Users", value: "500M", unit: "DAU" },
      { label: "Storage/yr", value: "70PB", unit: "total" }
    ],
    boe: [
      { label: "Write QPS", calc: "100,000,000 / 86,400s", result: "1,157 req/sec" },
      { label: "Read QPS (Feed)", calc: "5B views / 86,400s", result: "57,870 views/sec" },
      { label: "Daily Storage", calc: "100M images/day × 2MB (optimized versions)", result: "200 TB / day" }
    ],
    hld: {
      layers: [
        { label: "Client Layer", nodes: [{ type: "client", name: "Instagram Mobile App", icon: "📱", detail: "Handles parallel image chunk uploads" }] },
        { label: "Edge Layer", arrow: "CDN Cache Hit", nodes: [{ type: "cdn", name: "Multi-region CDN", icon: "🌐", detail: "Akamai/CloudFront for images & thumbnails" }] },
        { label: "Processing Layer", arrow: "Ingestion", nodes: [
          { type: "service", name: "Img Processor", icon: "📐", detail: "Asynchronously creates thumbnails (150x150, 600x600)" },
          { type: "queue", name: "Asset Queue", icon: "📨", detail: "Kafka topic for post-upload processing" }
        ]},
        { label: "Feed Layer", arrow: "Retrieval", nodes: [
          { type: "service", name: "Feed Service", icon: "📰", detail: "Aggregates content based on follower graph" },
          { type: "service", name: "Ranker", icon: "⭐", detail: "ML-based scoring for personalized feeds" }
        ]},
        { label: "Persistence Layer", nodes: [
          { type: "storage", name: "Object Store (S3)", icon: "☁️", detail: "Original and transcoded image assets" },
          { type: "db", name: "Relational (Metadata)", icon: "🗄️", detail: "PostgreSQL for Users, Follows, Post metadata" },
          { type: "cache", name: "Redis (Feed Cache)", icon: "⚡", detail: "Caches pre-computed feeds for 500M users" }
        ]}
      ],
      flows: [
        { title: "Upload Post", desc: "App ➔ API Gateway ➔ Store Raw S3 ➔ Kafka Event ➔ Img Processor (Thumbnails) ➔ Update Metadata DB ➔ Notify followers." }
      ]
    },
    dataModel: [
      {
        entity: "Photo", db: "PostgreSQL",
        fields: [
          { name: "photo_id", type: "UUID", note: "PK" },
          { name: "user_id", type: "UUID", note: "FK User" },
          { name: "s3_base_url", type: "VARCHAR(255)", note: "Base storage link" },
          { name: "has_thumbnails", type: "BOOLEAN", note: "Status flag" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/media/upload", desc: "Upload image and create post metadata." },
      { method: "GET", path: "/v1/feeds/home", desc: "Get personalized feed for user." }
    ],
    deepDive: [
      {
        icon: "📰", title: "Feed Generation (Pull vs Push)",
        points: [
          { heading: "Push Pattern", body: "On image upload, write post ID to timeline caches of all 1,000 followers. High write, O(1) read." },
          { heading: "Hybrid Pattern", body: "For celebrities, keep their posts separate. At read time, merge follower's cache with celebrity posts." }
        ]
      }
    ],
    signals: {
      hire: ["Discussed feed fan-out strategies", "Understood media processing pipelines", "Mentioned CDN caching for images"],
      nohire: ["Proposed synchronous feed generation", "Ignored write amplification for celebrities", "No plan for image resizing"]
    },
    tradeoffs: [
      { option: "Push vs Pull Feed", pro: "O(1) read latency", con: "Unbounded write load for celebrities", when: "Most active users" },
      { option: "In-memory Feed vs DB Fetch", pro: "Immediate UX", con: "Memory cost is high", when: "Standard for modern social apps" }
    ],
    bottlenecks: [
      { problem: "Celebrity Feed generation", solution: "Use a hybrid model: push for regulars, pull for celebrities at read-time." },
      { problem: "Media storage growth", solution: "Aggressive compression and multi-tier storage (S3 Standard to IA)." }
    ],
    qa: [
      { q: "How are photos handled?", a: "Uploaded to S3. A serverless function or worker generates thumbnails (100x100, 600x600) and stores them back." },
      { q: "What's the ranking signal?", a: "Recency, user engagement history, and 'Hotness' (likes/min)." },
      { q: "How to handle Explore?", a: "Offline ML models generate candidate sets for each user; serving layer filters based on real-time kills." }
    ],
    tips: [
      { icon: "📸", title: "Media Scaling", text: "Discuss CDN cache-hit ratios and why images should be resized on the edge or during ingestion." },
      { icon: "📉", title: "Scale-out", text: "Mention Cassandra/Scylla for high-volume metadata storage like likes and comments." }
    ],
    related: [1, 2, 4]
  },
  {
    id: 7, icon: "🛒", title: "Design Amazon / E-Commerce",
    company: "Amazon, Flipkart, eBay", difficulty: "hard",
    tags: ["E-Commerce", "Inventory", "Payments"],
    desc: "Design a large-scale e-commerce platform with product catalog, cart, orders, and payments.",
    readTime: "28 min",
    requirements: {
      functional: ["Product catalog and search", "Shopping cart", "Order placement and tracking", "Payment processing", "Inventory management", "Reviews and ratings"],
      nonFunctional: ["Millions of concurrent users", "Flash sale handling (10x spikes)", "No overselling", "Payment consistency (ACID)", "Product search <100ms"]
    },
    scope: {
      in: ["Cart state synchronization", "Order placement & Inventory locking", "Payment gateway integration", "Search & Listing"],
      out: ["Logistics & Courier tracking", "Review moderation AI", "Seller dashboard features"]
    },
    capacity: [
      { label: "Active Shoppers", value: "100M", unit: "DAU" },
      { label: "Daily Orders", value: "1M", unit: "/day" },
      { label: "Catalog Size", value: "10B", unit: "items" },
      { label: "Search QPS", value: "100K", unit: "req/sec" }
    ],
    boe: [
      { label: "Order QPS", calc: "1,000,000 orders / 86,400s", result: "12 req/sec (Avg)" },
      { label: "Search QPS", calc: "100,000,000 shoppers × 5 searches/day", result: "5,787 req/sec" },
      { label: "Inventory Metadata", calc: "10B items × 2KB (desc/params)", result: "20 TB" }
    ],
    hld: {
      layers: [
        { label: "Engagement Layer", nodes: [
          { type: "client", name: "Web / Mobile", icon: "🛍️", detail: "Product discovery and cart management" }
        ]},
        { label: "Ingress Layer", arrow: "TLS 1.3", nodes: [{ type: "lb", name: "Global LB", icon: "🛡️", detail: "Edge routing and SSL termination" }] },
        { label: "Core Service Layer", arrow: "Microservices", nodes: [
          { type: "service", name: "Search Service", icon: "🔍", detail: "Elasticsearch based faceted search" },
          { type: "service", name: "Order Service", icon: "📦", detail: "Transactional workflow orchestration" },
          { type: "service", name: "Inventory", icon: "🏬", detail: "Critical stock tracking and reservation" }
        ]},
        { label: "Process Layer", arrow: "Async", nodes: [
          { type: "service", name: "Payment Gateway", icon: "💳", detail: "Stripe/PayPal integration via Sagas" },
          { type: "queue", name: "Order Queue", icon: "📨", detail: "Kafka for order processing and shipping" }
        ]},
        { label: "Persistence Layer", nodes: [
          { type: "db", name: "MySQL (Orders)", icon: "🗄️", detail: "ACID compliant storage for transactional data" },
          { type: "cache", name: "Redis (Cart)", icon: "⚡", detail: "High-speed storage for shopping sessions" },
          { type: "db", name: "Elasticsearch", icon: "🔎", detail: "Product catalog and facet indexing" }
        ]}
      ],
      flows: [
        { title: "Product Checkout", desc: "Add to Cart (Redis) ➔ Place Order ➔ Inventory Reservation ➔ Payment Success ➔ Update Order Status ➔ Clear Cart." }
      ]
    },
    dataModel: [
      {
        entity: "Order", db: "PostgreSQL",
        fields: [
          { name: "order_id", type: "UUID", note: "PK" },
          { name: "shopper_id", type: "UUID", note: "FK User" },
          { name: "total_amount", type: "DECIMAL", note: "With currency code" },
          { name: "status", type: "ENUM", note: "Pending, Paid, Shipped" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/orders/checkout", desc: "Commit cart to order workflow." },
      { method: "GET", path: "/v1/search/products", desc: "Search with facets. { q: string, filters: {} }" }
    ],
    deepDive: [
      {
        icon: "🏬", title: "Inventory Reservation Logic",
        points: [
          { heading: "Atomic Decrement", body: "Use 'SELECT ... FOR UPDATE' in SQL to prevent over-selling. Lock the stock row at the moment of reservation." },
          { heading: "TTL Reservations", body: "Reserve stock for 15 minutes. If no payment, release stock back to pool using a worker." }
        ]
      }
    ],
    signals: {
      hire: ["Discussed inventory locking strategies", "Understood Saga pattern for distributed transactions", "Proposed Redis for cart performance"],
      nohire: ["Proposed single DB for everything", "No plan for flash sale traffic spikes", "Ignored ACID requirements for payments"]
    },
    tradeoffs: [
      { option: "Optimistic vs Pessimistic Locks", pro: "Optimistic scales better", con: "Pessimistic prevents all race conditions easily", when: "High-contention flash sales" },
      { option: "Eventual consistency for Search", pro: "Extremely fast discovery", con: "Index might show out-of-stock items for a few seconds", when: "Product catalogs" }
    ],
    bottlenecks: [
      { problem: "Flash sale concurrency", solution: "Redis INCR for inventory counts; only commit to DB after payment success." },
      { problem: "Payment gateway latency", solution: "Use asynchronous webhooks and idempotency keys to avoid double charging." }
    ],
    qa: [
      { q: "How were payments made atomic?", a: "Using the Saga pattern. Each step (reserve stock -> pay -> ship) has a compensating action (release stock) if the next step fails." },
      { q: "How to handle huge cart sessions?", a: "Store cart in Redis. On checkout, validate items against the latest stock in the main DB." }
    ],
    tips: [
      { icon: "🛒", title: "Inventory First", text: "Focus heavily on why 'No Overselling' is the hardest requirement. Discuss locking and isolation levels." },
      { icon: "💳", title: "Idempotency", text: "Stripe-style idempotency keys are mandatory for payment systems." }
    ],
    related: [3, 11, 12]
  },
  {
    id: 8, icon: "☁️", title: "Design Dropbox / Google Drive",
    company: "Dropbox, Google, Box", difficulty: "medium",
    tags: ["File Storage", "Sync", "CDN"],
    desc: "Design a cloud file storage and synchronization service with versioning and sharing.",
    readTime: "20 min",
    requirements: {
      functional: ["Upload and download files", "Sync files across devices", "Share files/folders with others", "File versioning", "Offline access"],
      nonFunctional: ["1B users, 50PB storage", "Fast sync, delta updates only", "Strong consistency for metadata", "Deduplication to save storage", "Conflict resolution"]
    },
    scope: {
      in: ["Block-level deduplication", "Delta sync algorithm", "Metadata service", "Block storage (S3)"],
      out: ["Collaborative editing (Google Docs)", "File preview/rendering", "Advanced sharing permissions"]
    },
    capacity: [
      { label: "Active Users", value: "1B", unit: "registered" },
      { label: "Total Data", value: "10PB", unit: "global" },
      { label: "Upload QPS", value: "2K", unit: "req/sec" },
      { label: "Consistency", value: "Strong", unit: "Metadata" }
    ],
    boe: [
      { label: "User Storage", calc: "500M active × 100MB new data/user/year", result: "5.7 PB / year" },
      { label: "Upload Bandwidth", calc: "2000 uploads/sec × 500KB (avg chunk)", result: "1 GB/sec" },
      { label: "Metadata Storage", calc: "1B files × 1KB meta/file", result: "1 TB" }
    ],
    hld: {
      layers: [
        { label: "Client Layer", nodes: [
          { type: "client", name: "Desktop Sync Client", icon: "💻", detail: "Monitors local file changes (Watchdog)" },
          { type: "client", name: "Cloud Sync (Mobile)", icon: "📱", detail: "On-demand block retrieval" }
        ]},
        { label: "Ingress Layer", arrow: "Delta Blocks", nodes: [{ type: "lb", name: "API Gateway", icon: "🛡️", detail: "HTTP/2 streaming for large files" }] },
        { label: "Logic Layer", arrow: "Coordination", nodes: [
          { type: "service", name: "Block Service", icon: "🧱", detail: "Splits files into 4MB chunks and dedups" },
          { type: "service", name: "Metadata Service", icon: "🏷️", detail: "Manages file versions, namespaces, blocks" },
          { type: "service", name: "Notification", icon: "🔔", detail: "Push updates to all devices (WebSockets)" }
        ]},
        { label: "Persistence Layer", nodes: [
          { type: "storage", name: "Block Store (S3)", icon: "☁️", detail: "Immutable storage for raw file chunks" },
          { type: "db", name: "MySQL (Metadata)", icon: "🗄️", detail: "Sharded metadata (User -> Files -> Blocks)" },
          { type: "cache", name: "Memcached", icon: "⚡", detail: "Caching hot file metadata" }
        ]}
      ],
      flows: [
        { title: "File Upload Flow", desc: "Client splits file into blocks ➔ Dedup check ➔ Upload missing blocks to S3 ➔ Update Metadata DB ➔ Notify other devices via WebSocket." }
      ]
    },
    dataModel: [
      {
        entity: "FileMetadata", db: "MySQL",
        fields: [
          { name: "file_id", type: "UUID", note: "PK" },
          { name: "user_id", type: "UUID", note: "FK" },
          { name: "parent_path", type: "VARCHAR", note: "Dir structure" },
          { name: "version", type: "INT", note: "Optimistic locking" }
        ]
      },
      {
        entity: "FileBlockMapping", db: "MySQL",
        fields: [
          { name: "file_id", type: "UUID", note: "Composite PK" },
          { name: "block_order", type: "INT", note: "Composite PK" },
          { name: "block_hash", type: "VARCHAR", note: "Pointer to S3 object" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/files/upload_session", desc: "Initiate multi-block upload." },
      { method: "GET", path: "/v1/metadata/poll", desc: "Long-polling for file updates." }
    ],
    deepDive: [
      {
        icon: "🧱", title: "Delta Sync & Content Addressable Storage",
        points: [
          { heading: "Block-level Hashing", body: "Instead of re-uploading the whole file, hash 4MB blocks. If only 1 block changed, only that block is uploaded." },
          { heading: "Deduplication", body: "If two users upload the same file, we only store the blocks once in S3 and map multiple metadata entries to it." }
        ]
      }
    ],
    signals: {
      hire: ["Explained block-level deduplication", "Understood metadata vs block storage separation", "Mentioned delta sync algorithms"],
      nohire: ["Proposed whole-file uploads", "No plan for conflict resolution", "Ignored bandwidth optimization"]
    },
    related: [2, 7, 5]
  },
  {
    id: 9, icon: "🔔", title: "Design Notification System",
    company: "Uber, Facebook, LinkedIn", difficulty: "medium",
    tags: ["Notifications", "Push", "Email", "Fan-out"],
    desc: "Design a scalable multi-channel notification system supporting push, email, SMS and in-app.",
    readTime: "18 min",
    requirements: {
      functional: ["Send push notifications (iOS/Android)", "Email notifications", "SMS notifications", "In-app notifications", "Notification preferences and opt-out"],
      nonFunctional: ["10M+ notifications/day", "Delivery within a few seconds", "Deduplication", "Priority queuing", "Analytics and tracking"]
    },
    scope: {
      in: ["Notification API & Rate Limiting", "Priority queues", "External provider interfaces", "Status tracking & Retries"],
      out: ["Content generation/marketing AI", "Deep-link verification", "User segmentation & Targeting"]
    },
    capacity: [
      { label: "Daily Volume", value: "1B", unit: "notifs" },
      { label: "Peak Load", value: "10K", unit: "req/sec" },
      { label: "Avg Latency", value: "2s", unit: "end-to-end" },
      { label: "Retry Policy", value: "Exponential", unit: "backoff" }
    ],
    boe: [
      { label: "Write QPS", calc: "1,000,000,000 / 86,400s", result: "11,574 req/sec" },
      { label: "Metadata Storage", calc: "1B notifs × 500 bytes", result: "500 GB / day" },
      { label: "Bandwidth Out", calc: "1B notifs × 1KB payload", result: "1 TB / day" }
    ],
    hld: {
      layers: [
        { label: "Ingress Layer", nodes: [
          { type: "service", name: "Notification API", icon: "🔌", detail: "Internal microservices trigger notifications here" },
          { type: "lb", name: "Rate Limiter", icon: "🛡️", detail: "Prevents spamming users (Redis-based)" }
        ]},
        { label: "Processing Layer", arrow: "Async Queues", nodes: [
          { type: "service", name: "Validator", icon: "✅", detail: "Verifies user preferences and device tokens" },
          { type: "queue", name: "Notif Queue", icon: "📨", detail: "Slices by priority (Email vs Push)" }
        ]},
        { label: "Delivery Layer", arrow: "External APIs", nodes: [
          { type: "service", name: "Push Connector", icon: "📱", detail: "FCM / APNS worker" },
          { type: "service", name: "Email Connector", icon: "📧", detail: "SES / SendGrid worker" },
          { type: "service", name: "SMS Connector", icon: "💬", detail: "Twilio / Vonage worker" }
        ]},
        { label: "Persistence Layer", nodes: [
          { type: "db", name: "User Settings", icon: "🗄️", detail: "Opt-in/out and tone preferences" },
          { type: "db", name: "Notif Log", icon: "📜", detail: "History for status tracking and retries" }
        ]}
      ],
      flows: [
        { title: "Notification Dispatch", desc: "Service trigger ➔ Rate Limit check ➔ Fetch user preferences ➔ Push to Queue ➔ Worker calls 3rd Party API ➔ Log success." }
      ]
    },
    dataModel: [
      {
        entity: "NotificationLog", db: "DynamoDB / Cassandra",
        fields: [
          { name: "notif_id", type: "UUID", note: "PK" },
          { name: "user_id", type: "UUID", note: "Index" },
          { name: "type", type: "ENUM", note: "PUSH/EMAIL/SMS" },
          { name: "status", type: "ENUM", note: "SENT/FAILED/RETRY" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/notifications/send", desc: "Trigger a new notification." },
      { method: "GET", path: "/v1/users/:id/preferences", desc: "Allow users to toggle channels." }
    ],
    deepDive: [
      {
        icon: "🛡️", title: "Rate Limiting & Priority Queues",
        points: [
          { heading: "Token Bucket", body: "Limit users to N notifications per hour. Use Redis to store counters with TTLs." },
          { heading: "Priority Levels", body: "Use separate queues for 'High' (OTP, Payment) and 'Low' (Marketing). Ensure High-priority workers are never starved." }
        ]
      }
    ],
    signals: {
      hire: ["Discussed retry mechanisms", "Understood 3rd party API failures", "Proposed priority-based queuing"],
      nohire: ["Proposed single queue for all types", "No plan for rate limiting", "Ignored user opt-out preferences"]
    },
    tradeoffs: [
      { option: "Distributed Queue (Kafka) vs DB Polling", pro: "Kafka is high-throughput & low-latency", con: "Complexity of managing Kafka clusters", when: "Standard for high-scale notification systems" },
      { option: "Channel-specific Services", pro: "Isolation: SMS failure doesn't block Email", con: "More microservices to manage", when: "Large multi-channel apps" }
    ],
    bottlenecks: [
      { problem: "Downstream Provider Throttling (Twilio/SendGrid)", solution: "Implement per-provider rate limiting and exponential backoff on retries." },
      { problem: "Notification Storms (breaking news)", solution: "Prioritize critical alerts (OTP) and buffer/batch non-critical updates (Likes)." }
    ],
    qa: [
      { q: "How do you handle duplicate notifications?", a: "Every notification event has a unique 'Deduplication ID'. The delivery service checks this ID in Redis before sending to avoid double pings." },
      { q: "How do you handle user preferences?", a: "A 'Preferences Service' sits before the fan-out. It filters out channels the user has disabled (e.g., opted out of SMS)." }
    ],
    tips: [
      { icon: "🔔", title: "Retry with Backoff", text: "Third-party APIs (FCM/Apple) will fail. Always discuss exponential backoff and 'Dead Letter Queues' for failed sends." },
      { icon: "🛡️", title: "Rate Limiting", text: "Don't spam! Mention how to prevent a single event from triggering 100 notifications to the same user." }
    ],
    related: [1, 4, 6]
  },
  {
    id: 10, icon: "🏷️", title: "Design URL Shortener (TinyURL)",
    company: "TinyURL, Bitly, Twitter", difficulty: "easy",
    tags: ["Hashing", "Redirection", "Analytics"],
    desc: "Design a URL shortening service that converts long URLs to short codes with analytics.",
    readTime: "15 min",
    requirements: {
      functional: ["Shorten long URLs", "Redirect short URL to original", "Custom aliases", "Analytics (click count, geography)", "URL expiry"],
      nonFunctional: ["100M URLs created/day", "10B redirects/day", "Redirect latency <10ms", "High availability", "URL uniqueness guaranteed"]
    },
    scope: {
      in: ["URL Hashing (Base62)", "Key Generation Service (KGS)", "High-performance redirection", "Cache-aside strategy"],
      out: ["Malicious URL detection", "QR Code generation", "Advanced analytics dashboards"]
    },
    capacity: [
      { label: "New URLs", value: "100M", unit: "/month" },
      { label: "Read Requests", value: "10B", unit: "/month" },
      { label: "Read/Write Ratio", value: "100:1", unit: "heavy read" },
      { label: "Avg Storage", value: "15TB", unit: "over 5yr" }
    ],
    boe: [
      { label: "Write QPS", calc: "100,000,000 / 30 / 86,400", result: "40 req/sec" },
      { label: "Read QPS", calc: "10,000,000,000 / 30 / 86,400", result: "4,000 req/sec" },
      { label: "Storage Calculation", calc: "100M URLs × 500 bytes × 60 months", result: "3 TB / 5 yr" }
    ],
    hld: {
      layers: [
        { label: "Client Layer", nodes: [{ type: "client", name: "Web / API Client", icon: "🔗", detail: "Redirects or shortens URLs" }] },
        { label: "Logic Layer", nodes: [
          { type: "service", name: "Shortening Service", icon: "✂️", detail: "Generates unique Base62 hash strings" },
          { type: "service", name: "Redirection", icon: "↪️", detail: "Handles 301/302 HTTP redirects" }
        ]},
        { label: "Support Layer", arrow: "Pre-compute", nodes: [{ type: "service", name: "Token Service (KGS)", icon: "🔑", detail: "Pre-generates unique IDs to avoid collisions" }] },
        { label: "Persistence Layer", nodes: [
          { type: "db", name: "NoSQL DB", icon: "🗄️", detail: "Mapping of short_id ➔ original_url" },
          { type: "cache", name: "Redis Cache", icon: "⚡", detail: "Caches the top 20% most active URLs" }
        ]}
      ],
      flows: [
        { title: "URL Redirection", desc: "Client calls short_id ➔ Check Redis ➔ If Miss: Check DB ➔ If Found: Cache in Redis ➔ Return 301 Redirect." }
      ]
    },
    dataModel: [
      {
        entity: "ShortURL", db: "DynamoDB / NoSQL",
        fields: [
          { name: "short_id", type: "STRING", note: "Partition Key (Base62)" },
          { name: "original_url", type: "STRING", note: "Destination" },
          { name: "created_at", type: "TIMESTAMP", note: "For TTL/Cleanup" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/urls/shorten", desc: "Generate a new short link." },
      { method: "GET", path: "/:short_id", desc: "Redirect to original." }
    ],
    deepDive: [
      {
        icon: "🔑", title: "Key Generation Service (KGS)",
        points: [
          { heading: "Eliminating Write Latency", body: "Pre-calculate 6-character Base62 strings at idle time. Store in a separate 'unused keys' table." },
          { heading: "Avoiding Collisions", body: "The KGS ensures no two worker nodes ever grab the same key by using a central database with row-level locks on 'Checkout'." }
        ]
      }
    ],
    signals: {
      hire: ["Discussed Base62 vs Base64", "Proposed Key Generation Service", "Mentioned 301 vs 302 redirects"],
      nohire: ["Proposed SQL LIKE search for redirects", "Didn't account for hash collisions", "Proposed too-long hashes"]
    },
    tradeoffs: [
      { option: "Base62 Encoding vs MD5/SHA", pro: "Shorter URLs; human readable", con: "Higher collision risk if not carefully generated", when: "Standard for URL shorteners" },
      { option: "301 (Permanent) vs 302 (Found)", pro: "301 reduces server load (browser caches)", con: "302 allows for better analytics tracking", when: "Analytics-heavy redirects" }
    ],
    bottlenecks: [
      { problem: "KGS Coordination", solution: "Pre-allocate ranges of keys to each worker node to avoid hitting the KGS for every single write." },
      { problem: "Database Read Hotspots", solution: "Use a cache-aside strategy (Redis) for the top 10% most popular/trending short URLs." }
    ],
    qa: [
      { q: "How to handle custom aliases?", a: "Check the 'Custom' table first. If the alias is taken, return 400. If available, map it permanently to the destination URL." },
      { q: "How do you handle 10B redirects/day?", a: "Read traffic is almost entirely cacheable. Use a distributed cache (Redis/Memcached) and scale horizontally." }
    ],
    tips: [
      { icon: "🔑", title: "KGS Service", text: "A 'Key Generation Service' is the pro answer. It pre-computes unique keys and hands them out to workers in-memory." },
      { icon: "📊", title: "Analytics Store", text: "Discuss why you should use a Time-series DB or clickstream (Kafka -> Spark) for analytics rather than updating a SQL row for every click." }
    ],
    related: [9, 5, 11]
  },
  {
    id: 11, icon: "🔎", title: "Design Typeahead / Autocomplete",
    company: "Google, Twitter, LinkedIn", difficulty: "medium",
    tags: ["Search", "Trie", "Ranking"],
    desc: "Design a real-time search autocomplete system that suggests queries as users type.",
    readTime: "18 min",
    requirements: {
      functional: ["Suggest top-K completions as user types", "Rank by popularity", "Update suggestions based on trends", "Personalized suggestions"],
      nonFunctional: ["Response <100ms", "Handle 10B queries/day", "Freshness within hours", "High availability"]
    },
    scope: {
      in: ["Trie-based prefix matching", "Offline aggregation pipeline", "Client-side debouncing", "Browser/Edge caching"],
      out: ["Spell-checking & Auto-correct", "Natural Language Understanding (NLU)", "Voice-to-text integration"]
    },
    capacity: [
      { label: "DAU", value: "200M", unit: "users" },
      { label: "Search Volume", value: "1B", unit: "/day" },
      { label: "Result Latency", value: "<100ms", unit: "target" },
      { label: "Storage", value: "500GB", unit: "Trie data" }
    ],
    boe: [
      { label: "Search QPS", calc: "1,000,000,000 searches / 86,400s", result: "11,574 searches/sec" },
      { label: "Peak QPS", calc: "11,574 × 2 (Peak factor)", result: "23,148 req/sec" },
      { label: "Trie Storage", calc: "100M keywords × 30 bytes + freq data", result: "~5 GB" }
    ],
    hld: {
      layers: [
        { label: "Client Layer", nodes: [{ type: "client", name: "Search Bar Client", icon: "🎹", detail: "Throttles events via Debouncing (200ms)" }] },
        { label: "Edge Layer", nodes: [{ type: "cache", name: "Browser / Edge Cache", icon: "🌐", detail: "Caches common prefixes (e.g., 'goo')" }] },
        { label: "Query Layer", nodes: [
          { type: "service", name: "Trie Service", icon: "🌳", detail: "In-memory prefix matching engine" },
          { type: "lb", name: "Service Discovery", icon: "🛡️", detail: "Routes requests to specific Trie shards" }
        ]},
        { label: "Data Pipeline", arrow: "Offline", nodes: [
          { type: "service", name: "Aggregator", icon: "📈", detail: "MapReduce job to calculate query frequencies" },
          { type: "db", name: "Trie Builder", icon: "🏗️", detail: "Serializes the Trie into S3/Snapshot files" }
        ]},
        { label: "Persistence Layer", nodes: [
          { type: "db", name: "Keyword DB", icon: "🗄️", detail: "Permanent storage of keyword history" },
          { type: "cache", name: "Hot Trie Cache", icon: "⚡", detail: "Redis/Memcached for most frequent queries" }
        ]}
      ],
      flows: [
        { title: "Suggest Flow", desc: "User types 'a' (Debounce) ➔ Trie Service ➔ Prefix search 'a' ➔ Return top 10 keywords by freq ➔ Display in UI." }
      ]
    },
    dataModel: [
      {
        entity: "TrieNode", db: "In-Memory",
        fields: [
          { name: "char", type: "CHAR", note: "Current character" },
          { name: "is_end", type: "BOOL", note: "Terminator mark" },
          { name: "freq", type: "INT", note: "Total search count" },
          { name: "top_k", type: "LIST<str>", note: "Optimization: Pre-stored top suggestions" }
        ]
      }
    ],
    apis: [
      { method: "GET", path: "/v1/suggest", desc: "?q=prefix&limit=10" },
      { method: "POST", path: "/v1/admin/rebuild_trie", desc: "Trigger offline aggregation." }
    ],
    deepDive: [
      {
        icon: "🌳", title: "Trie Optimization for Performance",
        points: [
          { heading: "Pre-stored Top K", body: "Store the top 10 suggestions at each node. This avoids a DFS traversal on every keystroke, reducing read complexity to O(L)." },
          { heading: "Sampling", body: "For 1B searches, don't aggregate everything. Sample 0.1% or 1% of logs to build frequencies." }
        ]
      }
    ],
    signals: {
      hire: ["Discussed Trie sharding", "Mentioned client-side debouncing", "Proposed offline aggregation pipeline"],
      nohire: ["Proposed SQL LIKE '%prefix%'", "No consideration for suggestion ranking", "Ignored result latency requirements"]
    },
    tradeoffs: [
      { option: "Trie on Server vs Client", pro: "Server handles massive datasets", con: "Network latency on every keystroke", when: "Standard for web-scale search" },
      { option: "Sharding by Prefix vs Range", pro: "Prefix sharding enables local search", con: "Hot spots for common letters (e.g., 'S')", when: "High-volume typeahead" }
    ],
    bottlenecks: [
      { problem: "Trending search spikes", solution: "Use a small auxiliary 'Trending Trie' or Redis cache with short TTL for viral keywords." },
      { problem: "Memory limit on a single Trie node", solution: "Shard the Trie by the first 1-2 characters across multiple servers." }
    ],
    qa: [
      { q: "How are suggestions ranked?", a: "Primarily by search frequency. We can also boost results based on personalization (user history) or geo-proximity (local trends)." },
      { q: "How is the Trie updated?", a: "Offline pipeline (Spark/MapReduce) rebuilds the Trie every few hours. The new Trie is serialized, pushed to servers, and swapped in-memory." }
    ],
    tips: [
      { icon: "🎹", title: "Debouncing", text: "Always mention 'Client-side debouncing' (e.g., wait 200ms of no-typing before sending request) to save 80% of server load." },
      { icon: "🌳", title: "Pre-stored Top K", text: "The killer optimization: store the top-K suggestions at each Trie node to avoid DFS traversal during the query." }
    ],
    related: [5, 10, 9]
  },
  {
    id: 12, icon: "💳", title: "Design Payment System",
    company: "Stripe, PayPal, Square", difficulty: "hard",
    tags: ["Payments", "ACID", "Idempotency"],
    desc: "Design a reliable payment processing system handling transactions, refunds and reconciliation.",
    readTime: "25 min",
    requirements: {
      functional: ["Process payments (credit card, wallet)", "Handle refunds and disputes", "Transaction history", "Multi-currency support", "Fraud detection"],
      nonFunctional: ["ACID transactions — no double charges", "99.999% uptime", "Idempotent APIs", "PCI-DSS compliance", "Sub-second processing"]
    },
    scope: {
      in: ["Payment execution & Reconciliation", "Idempotency mechanism", "Double-entry ledger", "Gateway abstraction"],
      out: ["Card network issuing logic", "Physical POS hardware drivers", "Cryptocurrency exchange"]
    },
    capacity: [
      { label: "Transactions", value: "1M", unit: "/day" },
      { label: "Peak Load", value: "10K", unit: "TPS" },
      { label: "Availability", value: "99.999%", unit: "target" },
      { label: "Storage", value: "20TB", unit: "Ledger" }
    ],
    boe: [
      { label: "Daily TPS", calc: "1,000,000 / 86,400", result: "12 TPS (Avg)" },
      { label: "Ledger Growth", calc: "1M txs/day × 1KB audit log", result: "1 GB / day" },
      { label: "Compliance storage", calc: "7 Years retention", result: "2.5 TB ledger data" }
    ],
    hld: {
      layers: [
        { label: "Client Layer", nodes: [{ type: "client", name: "Checkout Page", icon: "🛒", detail: "Collects payment tokens (not card #s)" }] },
        { label: "Gatekeeper Layer", nodes: [
          { type: "service", name: "Payment Service", icon: "🛡️", detail: "Primary entry point and idempotency manager" },
          { type: "service", name: "Risk Service", icon: "🕵️", detail: "Fraud detection and velocity checks" }
        ]},
        { label: "External Layer", arrow: "PCI-DSS", nodes: [{ type: "service", name: "Gateway Interface", icon: "💳", detail: "Stripe / Braintree / Cybersource SDKs" }] },
        { label: "Financial Layer", arrow: "Atomic", nodes: [
          { type: "service", name: "Ledger", icon: "📜", detail: "Double-entry accounting system" },
          { type: "service", name: "Reconciliation", icon: "⚖️", detail: "Daily audit of internal vs external banks" }
        ]},
        { label: "Persistence Layer", nodes: [
          { type: "db", name: "Immutable Ledger", icon: "🗄️", detail: "Highly consistent Relational DB (SQL)" },
          { type: "queue", name: "Settlement Queue", icon: "📨", detail: "Kafka for async webhooks/callbacks" }
        ]}
      ],
      flows: [
        { title: "Payment Flow", desc: "User Clicks Pay ➔ Check Risk ➔ Create Order ➔ Post to External Gateway ➔ Success ➔ Post to Ledger ➔ Notify User." }
      ]
    },
    dataModel: [
      {
        entity: "Transaction", db: "PostgreSQL",
        fields: [
          { name: "tx_id", type: "UUID", note: "PK" },
          { name: "idempotency_key", type: "STRING", note: "Unique index" },
          { name: "amount", type: "INT", note: "In smallest currency unit" },
          { name: "state", type: "ENUM", note: "Pending, Success, Failed" }
        ]
      }
    ],
    apis: [
      { method: "POST", path: "/v1/payments", desc: "Execute a new transaction." },
      { method: "GET", path: "/v1/payments/:id/status", desc: "Poll for settlement status." }
    ],
    deepDive: [
      {
        icon: "🕵️", title: "Idempotency & Double Charging",
        points: [
          { heading: "The Idempotency Key", body: "Every request must have a client-side unique ID. The server stores this ID in a 'Processed Requests' table. If seen again, return the previous result instead of re-charging." },
          { heading: "Distributed Locks", body: "Use Redis (Redlock) or SQL locks during the critical section to prevent multiple concurrent threads from charging the same user ID." }
        ]
      }
    ],
    signals: {
      hire: ["Discussed idempotency keys", "Proposed double-entry accounting", "Understood PCI-DSS compliance"],
      nohire: ["Ignored idempotency", "Proposed eventually consistent DB for ledger", "No plan for manual reconciliation"]
    },
    tradeoffs: [
      { option: "2PC vs Sagas", pro: "2PC ensures atomicity", con: "Blocking and slow for distributed systems", when: "High-consistency ledger updates" },
      { option: "SQL Ledger vs NoSQL", pro: "SQL ACID is safe for money", con: "Harder to scale horizontally", when: "Standard for core financial ledgers" }
    ],
    bottlenecks: [
      { problem: "Hot Wallet locking", solution: "Shard account balances or use an append-only transaction log instead of immediate balance updates." },
      { problem: "External Payment Gateway failure", solution: "Implement resilient retry queues and a reconciliation service to fix mismatches later." }
    ],
    qa: [
      { q: "How do you prevent double-charging on retries?", a: "Every payment request must include a client-generated idempotency key (UUID). Server stores key + result in DB. On retry with same key: return stored result, do NOT reprocess. Set TTL on idempotency keys (e.g., 24h). This pattern is used by Stripe for all write operations." },
      { q: "How do you handle distributed payment transactions?", a: "Use the two-phase commit protocol or the Saga pattern. For payment: Reservation (hold funds) → Confirmation (capture funds). If confirmation fails, cancel reservation. Store state machine transitions persistently. Never leave a transaction in an intermediate state without a recovery path." }
    ],
    tips: [
      { icon: "🔑", title: "Idempotency is Non-Negotiable", text: "Networks fail. Retries happen. Every payment API must be idempotent. Show you understand this intuitively." },
      { icon: "📋", title: "Event Sourcing for Audit", text: "Payments need a complete audit trail. Store every state transition as an immutable event. Reconstruct state by replaying events." }
    ],
    related: [7, 3, 9]
  },
  {
    id: 13, icon: "📍", title: "Design Yelp / Nearby Places",
    company: "Yelp, Google Maps, Facebook", difficulty: "medium",
    tags: ["Geo-spatial", "Proximity Service", "Caching"],
    desc: "Design a proximity service to find nearby places like restaurants or hotels.",
    readTime: "18 min",
    requirements: {
      functional: ["Search for nearby businesses by category", "Add/Update/Delete businesses", "User reviews and ratings", "Real-time query based on radius"],
      nonFunctional: ["Search latency <200ms", "1B businesses indexed", "High availability for reads", "Slightly delayed updates (consistency)"]
    },
    scope: {
      in: ["Geospatial indexing (Geohash)", "Radius search algorithms", "Business metadata storage", "City-level caching"],
      out: ["GPS navigation routing", "Photo/Image OCR for menus", "Ad-placement within results"]
    },
    capacity: [
      { label: "Places", value: "500M", unit: "entries" },
      { label: "Searches", value: "2M", unit: "/min" },
      { label: "Radius", value: "1-10km", unit: "range" },
      { label: "Updates", value: "10K", unit: "/sec" }
    ],
    boe: [
      { label: "Search QPS", calc: "2,000,000 / 60", result: "33,333 req/sec" },
      { label: "Spatial Index", calc: "500M places × 8 bytes (Geohash)", result: "4 GB RAM" },
      { label: "Total Metadata", calc: "500M places × 2KB (Reviews/Photos)", result: "1 TB" }
    ],
    hld: {
      layers: [
        { label: "Ingress Layer", nodes: [{ type: "lb", name: "API Gateway", icon: "🏢", detail: "Auth and Geo-routing" }] },
        { label: "Search Layer", nodes: [
          { type: "service", name: "Proximity Service", icon: "📍", detail: "Converts Lat/Long to Geohash" },
          { type: "cache", name: "Geohash Cache", icon: "⚡", detail: "Redis Sorted Sets for fast radius search" }
        ]},
        { label: "Data Layer", arrow: "Spatial Query", nodes: [
          { type: "db", name: "PostGIS", icon: "🌍", detail: "Native spatial indexing (R-Tree / GIST)" },
          { type: "db", name: "Business Store", icon: "🗄️", detail: "Metadata, hours, and menus" }
        ]}
      ],
      flows: [
        { title: "Nearby Search", desc: "User (Lat, Long) ➔ Get Geohash ➔ Find 8 neighbors ➔ Query Geohash index in Redis ➔ Merge results ➔ Return businesses." }
      ]
    },
    dataModel: [
      {
        entity: "Business", db: "PostgreSQL",
        fields: [
          { name: "id", type: "UUID", note: "PK" },
          { name: "geohash", type: "VARCHAR(12)", note: "Spatial index" },
          { name: "lat_long", type: "POINT", note: "PostGIS storage" },
          { name: "category", type: "STRING", note: "Search filter" }
        ]
      }
    ],
    apis: [
      { method: "GET", path: "/v1/search/nearby", desc: "?lat=x&lng=y&radius=z" },
      { method: "POST", path: "/v1/business", desc: "Add or update place details." }
    ],
    deepDive: [
      {
        icon: "🌍", title: "Geohashing vs QuadTrees",
        points: [
          { heading: "Geohashing", body: "Divide earth into grids. Map 2D coords to a 1D string. Great for simple radius searches using prefix matching." },
          { heading: "QuadTrees", body: "Hierarchical tree where nodes split when they have too many points. Better than Geohash for varied density (cities vs deserts)." }
        ]
      }
    ],
    signals: {
      hire: ["Discussed Geohashing vs QuadTrees", "Proposed PostGIS for spatial queries", "Mentioned neighbor grid search"],
      nohire: ["Proposed O(N) distance check in SQL", "No plan for data volume of 500M places", "Ignored caching for popular areas"]
    },
    tradeoffs: [
      { option: "Geohash vs QuadTree", pro: "Geohash is simple prefix search", con: "QuadTree is better for balanced density", when: "Standard proximity search" },
      { option: "SQL Spatial vs Redis Geo", pro: "SQL is better for metadata filtering", con: "Redis is much faster for simple radius search", when: "High-concurrency read-heavy apps" }
    ],
    bottlenecks: [
      { problem: "Top-heavy search in major cities (e.g., London)", solution: "Cache the results for popular regions/categories (e.g., 'London Sushi') in Redis." },
      { problem: "Slow metadata joins", solution: "Denormalize basic business data (name, rating) into the spatial index to avoid DB hits on every result entry." }
    ],
    qa: [
      { q: "How to handle businesses with multiple locations?", a: "Each physical location is its own entry in the spatial index, but they all point to the same 'Brand ID' in the metadata DB." },
      { q: "How do neighbors work in Geohashing?", a: "When searching at the edge of a grid, the system must also check the 8 surrounding grid cells to ensure no nearby points are missed." }
    ],
    tips: [
      { icon: "📍", title: "Spatial Indexing", text: "Understand Geohash vs QuadTree. One is grid-based (static), one is tree-based (dynamic). Explain why you chose one over the other." },
      { icon: "🌍", title: "R-Tree / PostGIS", text: "Mention specialized DB extensions like PostGIS for PostgreSQL. It handles all the complex geo-math for you." }
    ],
    related: [3, 5, 7]
  },
  {
    id: 14, icon: "🆔", title: "Design Distributed ID (Snowflake)",
    company: "Twitter, Discord, Netflix", difficulty: "easy",
    tags: ["Distributed Systems", "Unique ID", "Zookeeper"],
    desc: "Design a system to generate unique 64-bit IDs in a distributed environment at high scale.",
    readTime: "12 min",
    requirements: {
      functional: ["Generate unique 64-bit IDs", "IDs should be roughly ordered by time", "High availability (>99.999%)", "Scale to 10k+ IDs/sec per node"],
      nonFunctional: ["No central database for ID generation", "Low latency (<2ms)", "No ID collisions ever"]
    },
    scope: {
      in: ["Snowflake-style bit allocation", "Worker coordination (Zookeeper)", "Clock skew handling", "Client SDK logic"],
      out: ["Global sequence synchronizer", "Authentication & Authz for IDs", "Long-term storage of IDs"]
    },
    capacity: [
      { label: "ID Volume", value: "10K", unit: "/sec" },
      { label: "Collision Risk", value: "0%", unit: "target" },
      { label: "ID Bits", value: "64", unit: "total" },
      { label: "Scalability", value: "Infinite", unit: "potential" }
    ],
    boe: [
      { label: "Max Throughput", calc: "4,096 IDs per ms per node", result: "4.1M IDs/sec/node" },
      { label: "Life Span", calc: "2^41 ms (Epoch bits)", result: "69 Years" }
    ],
    hld: {
      layers: [
        { label: "Generation Layer", nodes: [
          { type: "service", name: "Snowflake Worker", icon: "❄️", detail: "Generates 64-bit IDs in-memory" },
          { type: "service", name: "Coordination", icon: "🤝", detail: "Zookeeper/Etcd to assign unique Worker IDs" }
        ]},
        { label: "Structure Layer", nodes: [
          { type: "db", name: "Epoch Time", icon: "🕒", detail: "41 bits for millisecond timestamp" },
          { name: "Machine ID", icon: "💻", detail: "10 bits (Max 1024 workers)" },
          { name: "Sequence", icon: "🔢", detail: "12 bits (Max 4096 IDs/ms)" }
        ]}
      ],
      flows: [
        { title: "ID Generation", desc: "Get current MS ➔ Check Worker ID ➔ If same MS: Increment Sequence ➔ If new MS: Reset Sequence to 0 ➔ Return 64-bit INT." }
      ]
    },
    dataModel: [
      {
        entity: "Snowflake_ID", db: "64-bit Integer",
        fields: [
          { name: "sign_bit", type: "1 bit", note: "Reserved" },
          { name: "timestamp", type: "41 bits", note: "MS from custom epoch" },
          { name: "datacenter_id", type: "5 bits", note: "32 DCs" },
          { name: "worker_id", type: "5 bits", note: "32 Nodes/DC" },
          { name: "sequence", type: "12 bits", note: "Auto-reset every MS" }
        ]
      }
    ],
    apis: [
      { method: "GET", path: "/v1/next_id", desc: "Retrieve a unique 64-bit ID." }
    ],
    deepDive: [
      {
        icon: "🤝", title: "Avoiding Centralized Bottlenecks",
        points: [
          { heading: "No DB Auto-increment", body: "Centralized DBs are slow and SPOFs. Snowflake generates IDs in-memory without network calls." },
          { heading: "Zookeeper Role", body: "Zookeeper is only used for Worker ID registration at boot time, not for setiap ID request." }
        ]
      }
    ],
    signals: {
      hire: ["Understood bit-level 64-bit structure", "Proposed Zookeeper for worker-id assignment", "Mentioned clock skew handling"],
      nohire: ["Proposed UUIDs (too long/unsorted)", "Proposed centralized DB auto-increment", "Didn't consider clock drift"]
    },
    related: [1, 9, 10]
  }
];

const CONCEPTS = [
  {
    id: "c1", icon: "⚖️", title: "Load Balancing",
    color: "#7c5cfc",
    desc: "Distribute incoming traffic across multiple servers to ensure no single server is overwhelmed.",
    tags: ["Round Robin", "Least Connections", "IP Hash"],
    detail: `<strong>Algorithms:</strong><br>
    • <strong>Round Robin</strong> — Rotate requests evenly. Simple, works well for similar servers.<br>
    • <strong>Weighted Round Robin</strong> — Servers with more capacity get more requests.<br>
    • <strong>Least Connections</strong> — Send to the server with fewest active connections.<br>
    • <strong>IP Hash</strong> — Same client always hits same server (useful for session affinity).<br><br>
    <strong>L4 vs L7:</strong> L4 LB works at TCP level (fast, no content inspection). L7 LB understands HTTP — can route by URL path, headers, cookies.<br><br>
    <strong>Health Checks:</strong> LB periodically pings backends. Failed servers are temporarily removed from rotation.`
  },
  {
    id: "c2", icon: "⚡", title: "Caching",
    color: "#ffb347",
    desc: "Store frequently accessed data in fast storage to reduce database load and improve response times.",
    tags: ["Redis", "Memcached", "CDN", "Write-through"],
    detail: `<strong>Cache Strategies:</strong><br>
    • <strong>Cache-Aside (Lazy Loading)</strong> — App checks cache first, loads from DB on miss, populates cache. Most common.<br>
    • <strong>Write-Through</strong> — Write to cache and DB simultaneously. Always consistent, higher write latency.<br>
    • <strong>Write-Behind (Write-Back)</strong> — Write to cache only, async flush to DB. Fast writes, risk of data loss.<br><br>
    <strong>Eviction Policies:</strong> LRU (Least Recently Used), LFU (Least Frequently Used), TTL-based.<br><br>
    <strong>Cache Pitfalls:</strong><br>
    • Cache Thundering Herd — many requests miss cache simultaneously and hammer DB. Fix: mutex lock + probabilistic early expiry.<br>
    • Cache Stampede on invalidation — use soft TTL + background refresh.`
  },
  {
    id: "c3", icon: "🗄️", title: "Database Sharding",
    color: "#34d399",
    desc: "Horizontal partitioning of data across multiple databases to scale writes and storage.",
    tags: ["Horizontal Scaling", "Consistent Hashing", "Partition Key"],
    detail: `<strong>Sharding Strategies:</strong><br>
    • <strong>Hash Sharding</strong> — shard = hash(key) % N. Even distribution but resharding is painful.<br>
    • <strong>Range Sharding</strong> — user A-M on shard1, N-Z on shard2. Easy range queries but hot spots.<br>
    • <strong>Consistent Hashing</strong> — Virtual nodes on a ring. Adding a shard only moves ~1/N of keys. Used by Cassandra, DynamoDB.<br><br>
    <strong>Challenges:</strong> Cross-shard joins, distributed transactions, rebalancing. For cross-shard queries, consider denormalization or a search index.`
  },
  {
    id: "c4", icon: "📨", title: "Message Queues",
    color: "#f87171",
    desc: "Asynchronous communication between services, enabling decoupling, buffering, and fan-out.",
    tags: ["Kafka", "RabbitMQ", "SQS", "Pub/Sub"],
    detail: `<strong>When to use:</strong> Decoupling producers from consumers, handling traffic spikes, fan-out to multiple consumers, guaranteed delivery.<br><br>
    <strong>Kafka:</strong> Append-only log, retained forever (configurable), multiple consumer groups can re-read. Great for event streaming.<br>
    <strong>RabbitMQ:</strong> Traditional message broker, messages deleted after consumption. Good for task queues.<br><br>
    <strong>Key Concepts:</strong><br>
    • <strong>At-least-once delivery</strong> — Acknowledge only after processing. May get duplicates → need idempotent consumers.<br>
    • <strong>Exactly-once</strong> — Expensive, use idempotency + transactions instead.<br>
    • <strong>Consumer Groups</strong> — Each group gets all messages; within a group, messages are distributed.`
  },
  {
    id: "c5", icon: "🌐", title: "CDN",
    color: "#00d4ff",
    desc: "Content Delivery Networks cache static assets at edge locations close to users globally.",
    tags: ["Edge Caching", "Static Assets", "Latency"],
    detail: `<strong>How it works:</strong> CDN provider has PoPs (points of presence) around the world. Static content (images, JS, CSS, video) is cached at the edge nearest to the user.<br><br>
    <strong>Push vs Pull CDN:</strong><br>
    • <strong>Push CDN</strong> — You pre-upload content to all edge nodes. Good for predictable, popular content.<br>
    • <strong>Pull CDN</strong> — Edge fetches from origin on first request, caches it. Simpler but first request is slow.<br><br>
    <strong>Cache Invalidation:</strong> CDN caches are hard to invalidate globally. Best practice: version your assets (app.v2.js) so new deployments don't serve stale files.`
  },
  {
    id: "c6", icon: "📈", title: "CAP Theorem",
    color: "#ff6bae",
    desc: "A distributed system can only guarantee two of three: Consistency, Availability, Partition Tolerance.",
    tags: ["Consistency", "Availability", "Partition"],
    detail: `<strong>The Three Properties:</strong><br>
    • <strong>Consistency</strong> — Every read sees the most recent write.<br>
    • <strong>Availability</strong> — Every request receives a response (not always the latest data).<br>
    • <strong>Partition Tolerance</strong> — System continues despite network partitions.<br><br>
    Since network partitions always occur in distributed systems, you must choose CP or AP:<br>
    • <strong>CP Systems:</strong> Zookeeper, HBase — return error during partition to preserve consistency.<br>
    • <strong>AP Systems:</strong> Cassandra, DynamoDB — serve potentially stale data to remain available.<br><br>
    <strong>PACELC extension:</strong> Also considers latency vs consistency tradeoff even when no partition.`
  },
  {
    id: "c7", icon: "🔄", title: "Consistent Hashing",
    color: "#a78bfa",
    desc: "A hashing technique that minimizes key remapping when nodes are added or removed.",
    tags: ["Ring", "Virtual Nodes", "Load Distribution"],
    detail: `<strong>Problem it solves:</strong> Traditional modulo hashing: when you add a server, almost all keys must be remapped (massive cache misses).<br><br>
    <strong>How it works:</strong><br>
    1. Map servers and keys to the same hash ring (0 to 2^32).<br>
    2. Each key is served by the first server clockwise from it.<br>
    3. Adding/removing a server only affects ~1/N of keys.<br><br>
    <strong>Virtual Nodes:</strong> Each physical server gets multiple positions on the ring. Ensures uniform distribution even with heterogeneous servers. Used by Cassandra, Redis Cluster, Dynamo.`
  },
  {
    id: "c8", icon: "📊", title: "Rate Limiting",
    color: "#fb923c",
    desc: "Control the rate of requests a client can make to protect services from abuse and overload.",
    tags: ["Token Bucket", "Leaky Bucket", "Sliding Window"],
    detail: `<strong>Algorithms:</strong><br>
    • <strong>Token Bucket</strong> — Bucket fills at fixed rate; each request consumes a token. Allows bursts up to bucket capacity. Used by AWS API Gateway.<br>
    • <strong>Leaky Bucket</strong> — Requests processed at fixed rate. Excess queued or dropped. Smooth output.<br>
    • <strong>Fixed Window</strong> — Count requests per time window. Simple but susceptible to boundary spikes.<br>
    • <strong>Sliding Window Log</strong> — Precise, track each request timestamp. High memory.<br>
    • <strong>Sliding Window Counter</strong> — Approximates sliding window with less memory.<br><br>
    <strong>Distributed Rate Limiting:</strong> Store counters in Redis. Use INCR + EXPIRE. For multi-region: eventual consistency trade-off accepted.`
  },
  {
    id: "c9", icon: "🏗️", title: "Microservices",
    color: "#34d399",
    desc: "Architectural pattern where applications are split into small, independently deployable services.",
    tags: ["API Gateway", "Service Mesh", "Event-Driven"],
    detail: `<strong>Key Patterns:</strong><br>
    • <strong>API Gateway</strong> — Single entry point; handles auth, rate limiting, routing.<br>
    • <strong>Service Discovery</strong> — Services register themselves (Consul, Eureka); clients discover at runtime.<br>
    • <strong>Circuit Breaker</strong> — Stop calling a failing service to prevent cascading failures. Return cached response or error gracefully.<br>
    • <strong>Saga Pattern</strong> — Manage distributed transactions across services without 2PC.<br><br>
    <strong>Communication:</strong><br>
    • Synchronous: REST or gRPC (low latency, tight coupling)<br>
    • Asynchronous: Kafka/RabbitMQ (loose coupling, resilience)<br><br>
    <strong>Trade-offs vs Monolith:</strong> Complexity of distributed systems, network overhead, but independent scaling and deployment.`
  },
  {
    id: "c10", icon: "🔐", title: "Security in System Design",
    color: "#f87171",
    desc: "Essential security patterns every system design must address: auth, encryption, and input validation.",
    tags: ["JWT", "OAuth2", "TLS", "Encryption"],
    detail: `<strong>Authentication & Authorization:</strong><br>
    • <strong>JWT</strong> — Stateless tokens; include claims. Validate at each service without DB lookup.<br>
    • <strong>OAuth2 / OIDC</strong> — Delegated auth; third-party login. Access tokens + refresh tokens.<br>
    • <strong>API Keys</strong> — Simple for internal services; rotate regularly.<br><br>
    <strong>Encryption:</strong><br>
    • In-transit: TLS 1.3 everywhere. Mutual TLS (mTLS) between microservices.<br>
    • At-rest: AES-256. Manage keys with KMS (AWS KMS, Vault).<br>
    • E2E Encryption: Client holds keys; server cannot decrypt (Signal Protocol).<br><br>
    <strong>Defense in Depth:</strong> WAF → API Gateway → Service-level auth → DB-level access control.`
  },
  {
    id: "c11", icon: "📉", title: "Scaling Strategies",
    color: "#00d4ff",
    desc: "Vertical and horizontal scaling patterns to handle growing traffic and data volumes.",
    tags: ["Horizontal", "Vertical", "Auto-scaling"],
    detail: `<strong>Vertical Scaling (Scale-Up):</strong> Add more CPU/RAM to existing server. Simple, but has physical limits and single point of failure.<br><br>
    <strong>Horizontal Scaling (Scale-Out):</strong> Add more servers. Requires stateless services, load balancer, distributed sessions.<br><br>
    <strong>Auto-scaling:</strong> Cloud services (AWS Auto Scaling) add/remove instances based on CPU, memory, or custom metrics.<br><br>
    <strong>Scaling Individual Components:</strong><br>
    • <strong>Read Replicas</strong> — Scale DB reads; replicate data to multiple read-only copies.<br>
    • <strong>CQRS</strong> — Separate read and write models; optimize each independently.<br>
    • <strong>Data Partitioning (Sharding)</strong> — Scale writes by splitting data.<br>
    • <strong>Microservices</strong> — Scale each service independently.`
  },
  {
    id: "c12", icon: "📝", title: "SQL vs NoSQL",
    color: "#ffb347",
    desc: "Choosing the right database type: relational vs non-relational trade-offs for different use cases.",
    tags: ["ACID", "BASE", "Schema", "Scale"],
    detail: `<strong>When to Use SQL (PostgreSQL, MySQL):</strong><br>
    • ACID transactions required (payments, orders)<br>
    • Complex relationships and joins<br>
    • Structured data with fixed schema<br>
    • Strong consistency is must-have<br><br>
    <strong>When to Use NoSQL:</strong><br>
    • <strong>Document (MongoDB)</strong> — Flexible schema, JSON data, content management<br>
    • <strong>Key-Value (Redis, DynamoDB)</strong> — Simple access patterns, sessions, caching<br>
    • <strong>Wide-Column (Cassandra, HBase)</strong> — Time-series, events, high write throughput<br>
    • <strong>Graph (Neo4j)</strong> — Social networks, recommendation engines<br><br>
    <strong>Golden Rule:</strong> Most systems use BOTH. SQL for transactional data, NoSQL for scale-out or flexible schema needs.`
  },
  {
    id: "c13", icon: "💳", title: "OLTP",
    color: "#4f46e5",
    desc: "Online Transaction Processing: Optimized for high-concurrency, short database transactions.",
    tags: ["Transactions", "ACID", "Row-based", "MySQL"],
    detail: `<strong>Characteristics:</strong><br>
    • <strong>High Concurrency:</strong> Thousands of users performing small reads/writes.<br>
    • <strong>ACID Compliant:</strong> Focus on data integrity (Atomicity, Consistency, Isolation, Durability).<br>
    • <strong>Row-based Storage:</strong> Optimized for fetching entire records (e.g., a specific user or order).<br><br>
    <strong>Use Cases:</strong> ATM transactions, E-commerce checkouts, User profile updates.<br>
    <strong>Technologies:</strong> PostgreSQL, MySQL, Oracle, SQL Server.`
  },
  {
    id: "c14", icon: "📊", title: "OLAP",
    color: "#f59e0b",
    desc: "Online Analytical Processing: Optimized for complex queries and large-scale data analysis.",
    tags: ["Analytics", "Columnar", "Aggregations", "BigQuery"],
    detail: `<strong>Characteristics:</strong><br>
    • <strong>Complex Queries:</strong> Involves heavy aggregations (SUM, AVG) and long-running JOINs.<br>
    • <strong>Columnar Storage:</strong> Stores data by column, allowing extremely fast scans of specific fields across billions of rows.<br>
    • <strong>Batch Processing:</strong> Data usually updated in large batches rather than real-time transactions.<br><br>
    <strong>Use Cases:</strong> Yearly revenue reports, User trend analysis, Marketing attribution.<br>
    <strong>Technologies:</strong> ClickHouse, Snowflake, BigQuery, Amazon Redshift.`
  },
  {
    id: "c15", icon: "🗄️", title: "Apache Cassandra",
    color: "#1287b1",
    desc: "A wide-column, distributed NoSQL database designed for massive write-heavy workloads.",
    tags: ["Wide-column", "Write-heavy", "P2P", "LSM Tree"],
    detail: `<strong>Key Features:</strong><br>
    • <strong>Masterless Architecture:</strong> Peer-to-peer gossip protocol ensures no single point of failure.<br>
    • <strong>LSM Tree based writes:</strong> Writes are sequential appends to a commit log and then SStables (extremely fast).<br>
    • <strong>Tunable Consistency:</strong> QUORUM, ONE, ALL levels let you trade consistency for latency.<br><br>
    <strong>Trade-offs:</strong> No Joins, No Foreign Keys. You must 'design for the query' (one table per query pattern).`
  },
  {
    id: "c16", icon: "⚡", title: "Amazon DynamoDB",
    color: "#ff9900",
    desc: "A serverless, key-value and document database that delivers single-digit millisecond performance at any scale.",
    tags: ["Key-Value", "Serverless", "Managed", "Consistent Hashing"],
    detail: `<strong>Key Features:</strong><br>
    • <strong>Fully Managed:</strong> Automatic scaling, backup, and geo-replication (Global Tables).<br>
    • <strong>Partitions:</strong> Data is automatically sharded based on a Partition Key (Hashed).<br>
    • <strong>DAX (DynamoDB Accelerator):</strong> In-memory cache for 10x faster read performance.<br><br>
    <strong>When to use:</strong> When you need high availability and low maintenance for semi-structured data.`
  },
  {
    id: "c17", icon: "🔥", title: "Apache Spark",
    color: "#e25a1c",
    desc: "A multi-language engine for executing data engineering, data science, and machine learning on single-node or clusters.",
    tags: ["Batch Processing", "In-Memory", "Iterative", "RDD"],
    detail: `<strong>Key Features:</strong><br>
    • <strong>In-Memory Computation:</strong> 100x faster than Hadoop MapReduce by keeping intermediate data in RAM.<br>
    • <strong>Unified Engine:</strong> Supports SQL, Streaming (Micro-batch), Machine Learning (MLlib), and Graph API.<br>
    • <strong>DAG Scheduler:</strong> Optimizes operator pipelines before execution.<br><br>
    <strong>Best for:</strong> ETL, Large-scale ML, Data exploration on Petabyte scale.`
  },
  {
    id: "c18", icon: "🌊", title: "Apache Flink",
    color: "#e6526f",
    desc: "Stateful computations over data streams, optimized for low-latency real-time processing.",
    tags: ["Stream Processing", "Exactly-once", "Low Latency", "Watermarks"],
    detail: `<strong>Key Features:</strong><br>
    • <strong>True Streaming:</strong> Processes events one by one (vs Spark's micro-batching).<br>
    • <strong>Stateful:</strong> Can remember per-user or per-key state across windows.<br>
    • <strong>Exactly-Once Guarantees:</strong> Checkpointing ensures data is processed correctly even during failures.<br><br>
    <strong>Best for:</strong> Real-time fraud detection, Monitoring, Real-time dashboards.`
  },
  {
    id: "c19", icon: "🆚", title: "gRPC vs REST",
    color: "#059669",
    desc: "Comparing the two most dominant communication protocols for internal and external APIs.",
    tags: ["Communication", "Protobuf", "JSON", "HTTP/2"],
    detail: `<strong>gRPC:</strong><br>
    • Uses Protocol Buffers (Binary) - very small and fast.<br>
    • Built on HTTP/2 (Bidirectional, Multiplexing).<br>
    • Strong typing / Code generation.<br><br>
    <strong>REST:</strong><br>
    • Uses JSON (Human readable text) - larger payload.<br>
    • HTTP/1.1 or 2.<br>
    • Universal, works in every browser.<br><br>
    <strong>The Decision:</strong> gRPC for internal microservices, REST for public-facing APIs or web clients.`
  },
  {
    id: "c20", icon: "🆚", title: "Kafka vs RabbitMQ",
    color: "#be185d",
    desc: "Deciding between the 'Log-based Stream' and 'Traditional Message Broker' patterns.",
    tags: ["Message Queue", "Streaming", "Pub/Sub", "ACK"],
    detail: `<strong>Apache Kafka (Log-based):</strong><br>
    • <strong>Durable:</strong> Messages stored on disk for a long time.<br>
    • <strong>Replayability:</strong> Consumers can re-read old messages.<br>
    • <strong>Scale:</strong> Millions of messages per second.<br><br>
    <strong>RabbitMQ (Queue-based):</strong><br>
    • <strong>Smart Broker:</strong> Handles routing (fanout, direct, topic).<br>
    • <strong>ACK strategy:</strong> Message deleted once consumed.<br>
    • <strong>Priority Queues:</strong> Supported natively.<br><br>
    <strong>The Decision:</strong> Kafka for event streaming and high volume. RabbitMQ for complex routing and task queues.`
  },
  {
    id: "c21", icon: "🌸", title: "Bloom Filters",
    color: "#f472b6",
    desc: "A space-efficient probabilistic data structure used to test whether an element is a member of a set.",
    tags: ["Probabilistic", "Optimization", "NoSQL"],
    detail: `<strong>How it works:</strong> Consists of a bit array and multiple hash functions. Adding an element sets bits at hash indexes. Checking an element: if any bit is 0, element is 100% NOT in set. If all are 1, element is PROBABLY in set (false positive possible).<br><br>
    <strong>Use Cases:</strong><br>
    • Checking if a URL has already been crawled (Web Crawler).<br>
    • Google Bigtable: avoiding disk reads for non-existent rows.<br>
    • Medium: avoiding showing the same recommendation twice.<br><br>
    <strong>Trade-offs:</strong> No false negatives, but false positives happen. Cannot remove elements from a standard Bloom filter.`
  },
  {
    id: "c22", icon: "🕒", title: "Vector Clocks",
    color: "#e879f9",
    desc: "A mechanism for capturing chronological order and detecting causality violations in distributed systems.",
    tags: ["Causality", "Conflict", "Distributed DB"],
    detail: `<strong>The Problem:</strong> Physical clocks drift. In a multi-master DB, two writes to the same key might happen "at the same time" on different nodes. Who wins?<br><br>
    <strong>How it works:</strong> Each node maintains a counter array [node1_counter, node2_counter, ...]. Every write increments the local counter. When syncing, nodes compare vectors to determine if one write "happened before" another or if they are concurrent (conflict).<br><br>
    <strong>Use Case:</strong> Amazon DynamoDB (original paper) and Riak use vector clocks for conflict resolution.`
  },
  {
    id: "c23", icon: "🤝", title: "Quorum (R + W > N)",
    color: "#38bdf8",
    desc: "A consensus-based approach for distributed read and write operations to ensure data consistency.",
    tags: ["Consensus", "Consistency", "Dynamo"],
    detail: `<strong>The Formula: R + W > N</strong><br>
    • <strong>N</strong>: Total replicas.<br>
    • <strong>W</strong>: Minimum nodes that must acknowledge a successful write.<br>
    • <strong>R</strong>: Minimum nodes that must respond to a successful read.<br><br>
    <strong>Impact:</strong><br>
    • <strong>High Consistency:</strong> W=N, R=1 (but any 1 node failure blocks writes).<br>
    • <strong>High Availability:</strong> W=1, R=N (any node failure blocks reads, but writes are fast).<br>
    • <strong>Balanced:</strong> Typically W=Quorum (N/2+1), R=Quorum. This handles up to N/2 node failures while maintaining consistency.`
  },
  {
    id: "c24", icon: "💓", title: "Heartbeat & Gossip",
    color: "#fb7185",
    desc: "Failure detection and state propagation mechanisms in a peer-to-peer distributed network.",
    tags: ["Failure Detection", "P2P", "Propogation"],
    detail: `<strong>Heartbeat:</strong> Nodes periodically ping a central coordinator or each other to say "I am alive". If pings stop, the node is marked as failed.<br><br>
    <strong>Gossip Protocol:</strong> An epidemic-style communication where each node randomly picks a neighbor and shares everything it knows. In O(log N) time, the whole cluster knows about a node failure or state change.<br><br>
    <strong>Use Cases:</strong> Redis Cluster, Cassandra, and Consul use Gossip for cluster membership and health checks.`
  },
  {
    id: "c25", icon: "📜", title: "Write-Ahead Log (WAL)",
    color: "#94a3b8",
    desc: "A standard technique for providing atomicity and durability in database systems.",
    tags: ["Durability", "ACID", "Recovery"],
    detail: `<strong>How it works:</strong> Changes are first recorded in a persistent, append-only log on disk <em>before</em> being applied to the actual data files. If the system crashes, the DB can replay the WAL to recover to the last committed state.<br><br>
    <strong>Benefits:</strong><br>
    • <strong>Durability:</strong> Ensures data isn't lost during a power failure.<br>
    • <strong>Performance:</strong> Appending to a log is a sequential disk write (fast) compared to updating multiple random pages in a data file.<br><br>
    <strong>Technologies:</strong> PostgreSQL, MySQL (Redo Log), Kafka, Cassandra.`
  },
  {
    id: "c26", icon: "📡", title: "Service Discovery",
    color: "#1d4ed8",
    desc: "Automatically detecting devices and services on a computer network to facilitate communication.",
    tags: ["Microservices", "Registry", "Networking"],
    detail: `<strong>Client-side Discovery:</strong> Client queries a Service Registry (like Eureka), gets the IP, and load balances locally.<br><br>
    <strong>Server-side Discovery:</strong> Client hits a Load Balancer (like NGINX/AWS ELB), which queries the registry and routes the request.<br><br>
    <strong>Registry:</strong> A highly available database (Consul, Etcd, Zookeeper) that keeps track of the health and location of every service instance.`
  },
  {
    id: "c27", icon: "🔁", title: "Database Replication",
    color: "#8b5cf6",
    desc: "Keeping multiple copies of the same data across different servers to improve availability and read performance.",
    tags: ["High Availability", "Read Scalability", "Failover"],
    detail: `<strong>Strategies:</strong><br>
    • <strong>Single-Leader:</strong> Updates go to leader, then sync to followers. Simple, but leader is SPOF for writes.<br>
    • <strong>Multi-Leader:</strong> Multiple nodes accept writes. Great for multiple data centers but needs conflict resolution.<br>
    • <strong>Leaderless:</strong> Client sends writes to multiple nodes (Dynamo/Cassandra style). High write availability.<br><br>
    <strong>Sync vs Async:</strong> Sync replication ensures no data loss but increases write latency. Async is faster but risks data loss on failover.`
  },
  {
    id: "c28", icon: "🚀", title: "Edge Computing",
    color: "#10b981",
    desc: "Processing data closer to the source of the generation (users/IoT) rather than in a central cloud.",
    tags: ["Latency", "IoT", "Cloudflare"],
    detail: `<strong>Why Edge?</strong> Reduces latency for real-time apps, saves bandwidth by not sending everything to the cloud, and can handle data locally for privacy.<br><br>
    <strong>Example:</strong> Cloudflare Workers. You write code that runs on the CDN edge node itself, modifying requests or serving content before it even hits your origin server.`
  },
  {
    id: "c29", icon: "💎", title: "S3 Select / Pushdown",
    color: "#3b82f6",
    desc: "Retrieving only the subset of data from an object by using simple SQL expressions at the storage layer.",
    tags: ["Storage", "Optimization", "SQL", "Big Data"],
    detail: `<strong>The Problem:</strong> Fetching a 1GB CSV just to read 2 rows wastes bandwidth and CPU. S3 Select lets you query the object <em>in-place</em>.<br><br>
    <strong>Benefits:</strong><br>
    • <strong>Efficiency:</strong> Up to 400% improvement in query performance.<br>
    • <strong>Cost:</strong> Dramatically reduces data transfer costs by only sending necessary bytes over the network.<br><br>
    <strong>Common use:</strong> Big Data analytics on Parquet/JSON files in S3.`
  },
  {
    id: "c30", icon: "🔌", title: "Circuit Breaker",
    color: "#ef4444",
    desc: "A design pattern used to detect failures and encapsulate the logic of preventing a failure from constantly recurring.",
    tags: ["Fault Tolerance", "Microservices", "Resilience"],
    detail: `<strong>States:</strong><br>
    • <strong>Closed:</strong> Standard operation. Requests flow normally.<br>
    • <strong>Open:</strong> Failure threshold hit. Requests fail immediately with a fallback/error to protect the system.<br>
    • <strong>Half-Open:</strong> Periodically allow a few requests to see if the downstream service has recovered.<br><br>
    <strong>Why use:</strong> prevents cascading failures in microservice architectures.`
  },
  {
    id: "c31", icon: "🔄", title: "CQRS",
    color: "#8b5cf6",
    desc: "Command Query Responsibility Segregation — separating the data model for reads from the model for writes.",
    tags: ["Architecture", "Read/Write", "Event Sourcing"],
    detail: `<strong>How it works:</strong> Commands (Writes) use one model/database (optimized for consistency). Queries (Reads) use another (e.g., Elasticsearch, Read Replicas) optimized for performance.<br><br>
    <strong>When to use:</strong> When read and write workloads have very different performance characteristics or require complex search logic.<br><br>
    <strong>Trade-offs:</strong> Increased system complexity and eventual consistency between the write and read stores.`
  },
  {
    id: "c32", icon: "🌊", title: "Backpressure",
    color: "#06b6d4",
    desc: "A mechanism for a slow consumer to inform a fast producer to slow down, preventing buffer overflows.",
    tags: ["Flow Control", "Streaming", "Reactive"],
    detail: `<strong>The Problem:</strong> A producer sends data faster than a consumer can process it, leading to memory exhaustion (OOM).<br><br>
    <strong>Strategies:</strong><br>
    • <strong>Drop:</strong> Discard incoming data (e.g., non-critical logs).<br>
    • <strong>Buffer:</strong> Hold data in a queue (limited by memory/disk).<br>
    • <strong>Signal:</strong> Consumer explicitly tells producer to pause or slow down.<br><br>
    <strong>Tech:</strong> standard in TCP flow control and Reactive Streams (RxJS, Project Reactor).`
  },
  {
    id: "c33", icon: "📜", title: "Two-Phase Commit (2PC)",
    color: "#fb923c",
    desc: "A distributed algorithm that coordinates all processes in a distributed atomic transaction to commit or roll back.",
    tags: ["Distributed Transactions", "Consistency", "Atomicity"],
    detail: `<strong>Phases:</strong><br>
    • <strong>Prepare:</strong> Coordinator asks all nodes if they are ready to commit. Nodes lock resources.<br>
    • <strong>Commit/Rollback:</strong> If all say YES, coordinator tells everyone to commit. Otherwise, everyone rolls back.<br><br>
    <strong>Cons:</strong> A blocking protocol. If the coordinator fails, resources remain locked (SPOF). Not suitable for high-scale/latency systems.`
  },
  {
    id: "c34", icon: "🗳️", title: "Raft Consensus",
    color: "#8b5cf6",
    desc: "A consensus algorithm designed as an alternative to Paxos, focusing on understandability and clear leader election.",
    tags: ["Consensus", "Distributed Systems", "Fault Tolerance"],
    detail: `<strong>How it works:</strong> Nodes are either Follower, Candidate, or Leader. The Leader handles all client requests and replicates logs to followers. If a leader fails, a new election is triggered.<br><br>
    <strong>Key Components:</strong> Leader Election, Log Replication, and Safety guarantees.<br><br>
    <strong>Used in:</strong> etcd (Kubernetes), CockroachDB, TiDB.`
  },
  {
    id: "c35", icon: "💎", title: "S3 Select / Pushdown",
    color: "#3b82f6",
    desc: "Retrieving only the subset of data from an object by using simple SQL expressions at the storage layer.",
    tags: ["Storage", "Optimization", "SQL", "Big Data"],
    detail: `<strong>The Problem:</strong> Fetching a 1GB CSV just to read 2 rows wastes bandwidth and CPU. S3 Select lets you query the object <em>in-place</em>.<br><br>
    <strong>Benefits:</strong><br>
    • <strong>Efficiency:</strong> Up to 400% improvement in query performance.<br>
    • <strong>Cost:</strong> Dramatically reduces data transfer costs by only sending necessary bytes over the network.<br><br>
    <strong>Common use:</strong> Big Data analytics on Parquet/JSON files in S3.`
  },
  {
    id: "c36", icon: "💎", title: "S3 Select / Pushdown",
    color: "#3b82f6",
    desc: "Retrieving only the subset of data from an object by using simple SQL expressions at the storage layer.",
    tags: ["Storage", "Optimization", "SQL", "Big Data"],
    detail: `<strong>The Problem:</strong> Fetching a 1GB CSV just to read 2 rows wastes bandwidth and CPU. S3 Select lets you query the object <em>in-place</em>.<br><br>
    <strong>Benefits:</strong><br>
    • <strong>Efficiency:</strong> Up to 400% improvement in query performance.<br>
    • <strong>Cost:</strong> Dramatically reduces data transfer costs by only sending necessary bytes over the network.<br><br>
    <strong>Common use:</strong> Big Data analytics on Parquet/JSON files in S3.`
  },
  {
    id: "c37", icon: "🪵", title: "LSM-Trees",
    color: "#f59e0b",
    desc: "Log-Structured Merge-Trees: A data structure optimized for high-throughput write workloads.",
    tags: ["Storage Engines", "Writes", "Databases"],
    detail: `<strong>Mechanism:</strong> Writes are strictly appended to an in-memory 'MemTable'. When full, it's flushed to disk as an immutable sorted 'SSTable'. Background 'Compaction' merges these files.<br><br>
    <strong>Pros:</strong> Sequential writes (extremely fast), high write throughput.<br><br>
    <strong>Used in:</strong> Cassandra, RocksDB, LevelDB, InfluxDB.`
  },
  {
    id: "c38", icon: "🚀", title: "gRPC",
    color: "#2563eb",
    desc: "Modern high-performance RPC framework using Protocol Buffers (Protobuf) and HTTP/2.",
    tags: ["Protocols", "Communication", "Microservices"],
    detail: `<strong>Features:</strong> Binary serialization (faster than JSON), Bi-directional streaming, multiplexing (over one connection), and strictly typed contracts (.proto files).<br><br>
    <strong>Compare with REST:</strong> REST is text-based (JSON) and resource-oriented. gRPC is binary-based and action-oriented.`
  },
  {
    id: "c39", icon: "🚈", title: "QUIC (HTTP/3)",
    color: "#ec4899",
    desc: "A modern transport layer protocol built over UDP, reducing latency and solving Head-of-Line blocking.",
    tags: ["Protocols", "Networking", "Performance"],
    detail: `<strong>Key Features:</strong> Faster connection setup (0-RTT), improved congestion control, and connection migration (keeping streams alive when switching between Wi-Fi/Mobile).<br><br>
    <strong>Why it matters:</strong> Unlike TCP, a dropped packet in QUIC only stalls its own stream, not the entire connection (No HOL blocking).`
  },
  {
    id: "c40", icon: "🧵", title: "Saga Pattern",
    color: "#8b5cf6",
    desc: "A failure management pattern that coordinates multiple local transactions to maintain data consistency in microservices.",
    tags: ["Distributed Transactions", "Microservices", "Reliability"],
    detail: `<strong>Types:</strong><br>
    • <strong>Orchestration:</strong> A central controller tells services when to execute transactions.<br>
    • <strong>Choreography:</strong> Services exchange events and decide their next action locally.<br><br>
    <strong>Compensating Transaction:</strong> If a step fails, the system triggers 'undo' actions for previously successful steps.`
  },
  {
    id: "c41", icon: "🛡️", title: "Service Mesh",
    color: "#6366f1",
    desc: "A dedicated infrastructure layer for handling service-to-service communication, often using a Sidecar proxy.",
    tags: ["Infrastructure", "Observability", "Microservices"],
    detail: `<strong>Capabilities:</strong> Service discovery, load balancing, encryption (mTLS), observability (tracing), and resiliency (retries, circuit breakers).<br><br>
    <strong>Architecture:</strong> Data Plane (Proxies like Envoy) + Control Plane (Istio, Linkerd).`
  },
  {
    id: "c42", icon: "🌳", title: "Merkle Trees",
    color: "#14b8a6",
    desc: "A hash tree used to efficiently verify the integrity and consistency of large data structures.",
    tags: ["Cryptography", "Data Integrity", "P2P"],
    detail: `<strong>How it works:</strong> Every leaf node is a hash of a data block. Non-leaf nodes are hashes of their children. The root hash represents the entire dataset.<br><br>
    <strong>Uses:</strong> Blockchain (Bitcoin/Ethereum), Git, P2P file sharing (BitTorrent), NoSQL anti-entropy (Dynamo DB/Cassandra).`
  },
  {
    id: "c43", icon: "💎", title: "S3 Select / Pushdown",
    color: "#3b82f6",
    desc: "Retrieving only the subset of data from an object by using simple SQL expressions at the storage layer.",
    tags: ["Storage", "Optimization", "SQL", "Big Data"],
    detail: `<strong>The Problem:</strong> Fetching a 1GB CSV just to read 2 rows wastes bandwidth and CPU. S3 Select lets you query the object <em>in-place</em>.<br><br>
    <strong>Benefits:</strong><br>
    • <strong>Efficiency:</strong> Up to 400% improvement in query performance.<br>
    • <strong>Cost:</strong> Dramatically reduces data transfer costs by only sending necessary bytes over the network.<br><br>
    <strong>Common use:</strong> Big Data analytics on Parquet/JSON files in S3.`
  },
  {
    id: "c44", icon: "💎", title: "S3 Select / Pushdown",
    color: "#3b82f6",
    desc: "Retrieving only the subset of data from an object by using simple SQL expressions at the storage layer.",
    tags: ["Storage", "Optimization", "SQL", "Big Data"],
    detail: `<strong>The Problem:</strong> Fetching a 1GB CSV just to read 2 rows wastes bandwidth and CPU. S3 Select lets you query the object <em>in-place</em>.<br><br>
    <strong>Benefits:</strong><br>
    • <strong>Efficiency:</strong> Up to 400% improvement in query performance.<br>
    • <strong>Cost:</strong> Dramatically reduces data transfer costs by only sending necessary bytes over the network.<br><br>
    <strong>Common use:</strong> Big Data analytics on Parquet/JSON files in S3.`
  },
  {
    id: "c45", icon: "💎", title: "S3 Select / Pushdown",
    color: "#3b82f6",
    desc: "Retrieving only the subset of data from an object by using simple SQL expressions at the storage layer.",
    tags: ["Storage", "Optimization", "SQL", "Big Data"],
    detail: `<strong>The Problem:</strong> Fetching a 1GB CSV just to read 2 rows wastes bandwidth and CPU. S3 Select lets you query the object <em>in-place</em>.<br><br>
    <strong>Benefits:</strong><br>
    • <strong>Efficiency:</strong> Up to 400% improvement in query performance.<br>
    • <strong>Cost:</strong> Dramatically reduces data transfer costs by only sending necessary bytes over the network.<br><br>
    <strong>Common use:</strong> Big Data analytics on Parquet/JSON files in S3.`
  },
  {
    id: "c46", icon: "🕰️", title: "Clock Synchronization",
    color: "#8b5cf6",
    desc: "Determining the order of events in a system without a perfectly synchronized global clock.",
    tags: ["Distributed Systems", "Consistency", "Ordering"],
    detail: `<strong>Strategies:</strong><br>
    • <strong>Physical Clocks (NTP):</strong> Synchronizing to accurate time sources (often has skew/drift).<br>
    • <strong>Logical Clocks (Lamport):</strong> Assigning monotonically increasing numbers based on event causality (A before B).<br>
    • <strong>Hybrid/TrueTime:</strong> Using GPS/Atomic clocks with an 'uncertainty interval' (e.g., Google Spanner).`
  },
  {
    id: "c47", icon: "🔐", title: "Distributed Locking",
    color: "#fb923c",
    desc: "A mechanism to ensure mutual exclusion across multiple processes running on different machines.",
    tags: ["Concurrency", "Distributed Systems", "Synchronization"],
    detail: `<strong>Approaches:</strong><br>
    • <strong>Redis (Redlock):</strong> Using multiple Redis nodes to achieve a majority lock state.<br>
    • <strong>etcd/Zookeeper:</strong> Using ephemeral nodes and 'watches' to manage lock ownership and failover.<br><br>
    <strong>Risk:</strong> Always account for 'fencing tokens' to prevent stale holders from accessing resources after their lease expires.`
  },
  {
    id: "c48", icon: "🛸", title: "Sidecar Pattern",
    color: "#06b6d4",
    desc: "Deploying a helper component alongside the main application container to handle cross-cutting concerns.",
    tags: ["Architecture", "Microservices", "Infrastructure"],
    detail: `<strong>Responsibilities:</strong> Logging, monitoring, security (mTLS), and network resilience (retries, circuit breaking).<br><br>
    <strong>Benefit:</strong> Decouples infrastructure logic from business code. The application doesn't need to know the Service Mesh exists.`
  },
  {
    id: "c49", icon: "💎", title: "S3 Select / Pushdown",
    color: "#3b82f6",
    desc: "Retrieving only the subset of data from an object by using simple SQL expressions at the storage layer.",
    tags: ["Storage", "Optimization", "SQL", "Big Data"],
    detail: `<strong>The Problem:</strong> Fetching a 1GB CSV just to read 2 rows wastes bandwidth and CPU. S3 Select lets you query the object <em>in-place</em>.<br><br>
    <strong>Benefits:</strong><br>
    • <strong>Efficiency:</strong> Up to 400% improvement in query performance.<br>
    • <strong>Cost:</strong> Dramatically reduces data transfer costs by only sending necessary bytes over the network.<br><br>
    <strong>Common use:</strong> Big Data analytics on Parquet/JSON files in S3.`
  },
  {
    id: "c50", icon: "🌳", title: "Strangler Fig Pattern",
    color: "#10b981",
    desc: "A pattern used to incrementally migrate a legacy system by gradually replacing specific pieces of functionality with new applications.",
    tags: ["Microservices", "Migration", "Architecture"],
    detail: `<strong>How it works:</strong> An API Gateway or proxy intercepts all requests. It routes traffic for migrated features to the new microservices, and routes everything else to the legacy monolith. Over time, the monolith is 'strangled' and decommissioned.`
  },
  {
    id: "c51", icon: "🎭", title: "BFF (Backend for Frontend)",
    color: "#eab308",
    desc: "Creating separate backend services specifically tailored to the needs of different client types (e.g., Web, Mobile).",
    tags: ["Microservices", "API", "Patterns"],
    detail: `<strong>The Problem:</strong> A single general-purpose API can become a bottleneck and deliver too much/too little data for specific clients.<br><br>
    <strong>The Solution:</strong> The Mobile app talks to a Mobile BFF. The Web app talks to a Web BFF. Each BFF orchestrates calls to the downstream microservices and formats the data perfectly for its client.`
  },
  {
    id: "c52", icon: "🔎", title: "Distributed Tracing",
    color: "#a855f7",
    desc: "A method used to profile and monitor applications, especially those built using a microservices architecture.",
    tags: ["Distributed Systems", "Observability", "Microservices"],
    detail: `<strong>Core Concepts:</strong><br>
    • <strong>Trace:</strong> The entire journey of a request across all services.<br>
    • <strong>Span:</strong> A single unit of work (e.g., a DB query or an HTTP call) within that trace. Each span has a parent ID and trace ID.<br><br>
    <strong>Tools:</strong> Jaeger, Zipkin, OpenTelemetry.`
  },
  {
    id: "c53", icon: "🧠", title: "Split-Brain Problem",
    color: "#f43f5e",
    desc: "A state in a cluster where nodes lose contact with each other and both form their own independent active sub-clusters.",
    tags: ["Distributed Systems", "Consistency", "Failures"],
    detail: `<strong>The Danger:</strong> Without knowing about each other, both partitions might try to write to storage simultaneously, leading to massive data corruption.<br><br>
    <strong>Prevention:</strong> STONITH (Shoot The Other Node In The Head - fencing the isolated node), Quorums (requiring >50% votes to perform actions), and Leases.`
  },
  {
    id: "c54", icon: "👑", title: "Leader Election",
    color: "#fbbf24",
    desc: "The process of designating a single node as the organizer or coordinator in a distributed network.",
    tags: ["Distributed Systems", "Coordination", "Consensus"],
    detail: `<strong>Why it's needed:</strong> To prevent multiple nodes from conflicting when performing state-changing tasks (e.g., assigning partitions in Kafka, updating the WAL).<br><br>
    <strong>Who does it:</strong> Usually handled via consensus algorithms (Raft, Paxos) or coordinated by tools like Zookeeper/etcd.`
  },
  {
    id: "c55", icon: "🏢", title: "Domain-Driven Design (DDD)",
    color: "#6366f1",
    desc: "An approach to software development for complex needs by connecting the implementation to an evolving model.",
    tags: ["Architecture", "Microservices", "Design"],
    detail: `<strong>Core Concepts:</strong> Bounded Contexts, Ubiquitous Language, Entities, Value Objects, and Aggregates.<br><br>
    <strong>Why it matters:</strong> It helps identify the natural boundaries of microservices, preventing tightly coupled 'distributed monoliths'.`,
    links: [
      { label: "Martin Fowler: Bounded Context", url: "https://martinfowler.com/bliki/BoundedContext.html" }
    ]
  },
  {
    id: "c56", icon: "📤", title: "Transactional Outbox Pattern",
    color: "#f59e0b",
    desc: "A reliable mechanism for safely updating a database and sending messages/events to a broker in a single transaction.",
    tags: ["Microservices", "Events", "Consistency"],
    detail: `<strong>The Problem:</strong> Updating a DB and sending a Kafka event isn't atomic. If the DB commits but Kafka fails, the system is inconsistent.<br><br>
    <strong>Solution:</strong> Write the event to an 'Outbox' table in the same DB transaction. A separate process (like Debezium CDC) reads the outbox and guarantees at-least-once delivery to the broker.`,
    links: [
      { label: "Microservices.io: Outbox Pattern", url: "https://microservices.io/patterns/data/transactional-outbox.html" }
    ]
  },
  {
    id: "c57", icon: "🚢", title: "Bulkhead Pattern",
    color: "#0891b2",
    desc: "A resilience pattern that isolates elements of an application into pools so that if one fails, the others will continue to function.",
    tags: ["Resilience", "Microservices", "Architecture"],
    detail: `<strong>Analogy:</strong> Like partitioned sections of a ship's hull. If one fills with water, the ship doesn't sink.<br><br>
    <strong>Usage:</strong> Assigning separate connection pools or thread pools for different downstream services. If Service A hangs, it only exhausts its own pool, keeping Service B completely reachable.`,
    links: [
      { label: "Microsoft: Bulkhead Pattern", url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead" }
    ]
  },
  {
    id: "c58", icon: "🐒", title: "Chaos Engineering",
    color: "#ef4444",
    desc: "The discipline of experimenting on a system in order to build confidence in its capability to withstand turbulent conditions.",
    tags: ["Reliability", "Distributed Systems", "Testing"],
    detail: `<strong>How it works:</strong> Intentionally terminating instances, simulating network latency, taking down entire datacenters (e.g., Netflix Chaos Monkey).<br><br>
    <strong>Goal:</strong> Validate that automated fallback mechanisms works before a real outage happens.`,
    links: [
      { label: "Principles of Chaos Engineering", url: "https://principlesofchaos.org/" }
    ]
  },
  {
    id: "c59", icon: "🧩", title: "CRDTs (Conflict-free Replicated Data Types)",
    color: "#8b5cf6",
    desc: "Data structures that can be replicated across multiple computers without need for coordination.",
    tags: ["Distributed Systems", "Algorithms", "Consistency"],
    detail: `<strong>Types:</strong><br>
    • <strong>State-based (CmRDT):</strong> Send the entire state and merge it using mathematical rules.<br>
    • <strong>Operation-based (CvRDT):</strong> Only transmit operations, assuming causal delivery.<br><br>
    <strong>Uses:</strong> Collaborative editing (Figma, Google Docs), highly available shopping carts (Riak), distributed counters.`,
    links: [
      { label: "An Interactive Intro to CRDTs", url: "https://jakelazaroff.com/words/an-interactive-intro-to-crdts/" }
    ]
  }
];

const UNIVERSAL_TRADEOFFS = [
  {
    title: "Latency vs Throughput",
    icon: "⏱️",
    desc: "The choice between making a single request as fast as possible vs making the system handle as many requests as possible.",
    pro: "Latency focus gives immediate UX (real-time). Throughput focus maximizes efficiency per dollar.",
    con: "Optimizing for latency often limits batching (decreasing throughput). Optimizing for throughput adds buffering (increasing latency).",
    analogy: "A sports car (Latency) vs a city bus (Throughput)."
  },
  {
    title: "Consistency vs Availability",
    icon: "⚖️",
    desc: "The fundamental CAP theorem trade-off when a network partition occurs.",
    pro: "Consistency ensures everyone sees the same truth. Availability ensures everyone gets a response.",
    con: "CP systems might time out during failures. AP systems might return stale/incorrect data.",
    analogy: "A legal contract (Consistency) vs a social media feed (Availability)."
  },
  {
    title: "Read vs Write Optimization",
    icon: "📖",
    desc: "Deciding whether to optimize for fast data retrieval or fast data insertion.",
    pro: "Read optimization (Indexing, Denormalization) speeds up 99% of user interactions. Write optimization (No index, WAL) is critical for logging and telemetry.",
    con: "Indexes make writes slow and consume storage. No indexes make search O(N).",
    analogy: "An organized library (Read-optimized) vs a junk drawer (Write-optimized)."
  },
  {
    title: "SQL vs NoSQL",
    icon: "🗄️",
    desc: "Choosing between structured, relational integrity and flexible, horizontal scalability.",
    pro: "SQL provides ACID guarantees and complex joins. NoSQL provides massive horizontal scale and flexible schema.",
    con: "SQL is harder to scale horizontally. NoSQL lacks standard join support and relational integrity.",
    analogy: "A professional filing cabinet (SQL) vs a giant pile of folders (NoSQL)."
  },
  {
    title: "Sync vs Async Communication",
    icon: "💬",
    desc: "Choices for how services talk to each other across the network.",
    pro: "Sync (REST/gRPC) is simple to reason about and provides immediate results. Async (Kafka/RabbitMQ) handles spikes and decouples systems.",
    con: "Sync creates tight coupling and cascaded failures. Async adds complexity (eventual consistency, message tracking).",
    analogy: "A phone call (Sync) vs an email (Async)."
  },
  {
    title: "Strong vs Eventual Consistency",
    icon: "📅",
    desc: "How fast data updates must propagate across the entire system.",
    pro: "Strong consistency prevents double-spending and confusion. Eventual consistency allows for global-scale performance.",
    con: "Strong consistency is slow (often requires 2PC). Eventual consistency requires conflict handling logic.",
    analogy: "A bank balance (Strong) vs a YouTube view count (Eventual)."
  },
  {
    title: "Vertical vs Horizontal Scaling",
    icon: "🏗️",
    desc: "How to increase system capacity as traffic Grows.",
    pro: "Vertical is easy (change instance type). Horizontal is 'limitless' and provides high availability.",
    con: "Vertical has a ceiling and is a single point of failure. Horizontal requires complex load balancing and sharding.",
    analogy: "Building a taller skyscraper (Vertical) vs building an entire neighborhood (Horizontal)."
  },
  {
    title: "Stateful vs Stateless",
    icon: "💾",
    desc: "Deciding if servers should retain client context between requests.",
    pro: "Stateful allows for extremely low latency as context is local. Stateless scales perfectly as any server can handle any request.",
    con: "Stateful is hard to rebalance and prone to session loss on failure. Stateless needs a fast external store (Redis).",
    analogy: "A local bakery (Stateful) vs. a vending machine (Stateless)."
  },
  {
    title: "Polling vs Push (WebSockets)",
    icon: "📡",
    desc: "Choice between client-driven vs. server-driven data delivery.",
    pro: "Polling is standard/simple and works through most proxies. Push provides true real-time updates and lower bandwidth.",
    con: "Polling has high HTTP overhead and latency. Push requires persistent TCP connections (scaling limit).",
    analogy: "Checking your mailbox (Polling) vs. getting a text message (Push)."
  },
  {
    title: "Centralized vs Decentralized (P2P)",
    icon: "🕸️",
    desc: "Architectural choice for the center of control and data.",
    pro: "Centralized is easy to manage, update, and secure. Decentralized has no single point of failure and respects privacy.",
    con: "Centralized is a bottleneck and SPOF. Decentralized is hard to coordinate and eventually consistent.",
    analogy: "A corporate office (Centralized) vs. a neighborhood watch (Decentralized)."
  },
  {
    title: "B-Tree vs LSM-Tree",
    icon: "🏗️",
    desc: "Choosing between read-optimized and write-optimized disk storage engines.",
    pro: "B-Trees (MySQL, Postgres) offer fast, predictable reads and efficient range queries. LSM-Trees (Cassandra, RocksDB) offer extreme write throughput.",
    con: "B-Trees can suffer from write amplification and fragmentation. LSM-Trees have 'read amplification' and need heavy background compaction.",
    analogy: "An organized library with a central index (B-Tree) vs. a stack of sorted daily journals (LSM-Tree)."
  },
  {
    title: "Orchestration vs Choreography",
    icon: "🎻",
    desc: "Design patterns for coordinating long-running business processes (Sagas).",
    pro: "Orchestration is easier to manage and monitor. Choreography is highly scalable and services are loosely coupled.",
    con: "Orchestration creates a central bottleneck/coupling point. Choreography is much harder to debug and track globally.",
    analogy: "A conductor leading an orchestra (Orchestration) vs. a flash mob (Choreography)."
  },
  {
    title: "Serverless vs Containers (K8s)",
    icon: "☁️",
    desc: "Trade-offs between abstracting the infrastructure vs. having full control over it.",
    pro: "Serverless (Lambda) scales to zero and has zero management. Containers (K8s) provide environment consistency and avoid vendor lock-in.",
    con: "Serverless has 'cold start' latency and rigid resource limits. K8s is notoriously complex to set up and manage.",
    analogy: "Taking a taxi (Serverless) vs. leasing and driving your own car (Containers)."
  },
  {
     title: "PACELC Theorem",
     icon: "⚖️",
     desc: "The extension to CAP that describes trade-offs during normal operation (no partition).",
     pro: "Describes the choice between Latency and Consistency when the system is healthy (normal operation).",
     con: "More complex to reason about than CAP. Forces decisions even during 'good' times.",
     analogy: "Choosing between a fast drive vs a safe drive even on a clear day."
  },
  {
     title: "Database Sharding vs Partitioning",
     icon: "🍰",
     desc: "Choices for splitting data to achieve scale or performance.",
     pro: "Partitioning (Vertical/Horizontal) improves query speed on one node. Sharding spreads data across many nodes for infinite scale.",
     con: "Sharding adds massive complexity (cross-shard joins, rebalancing). Partitioning of one node has a ceiling.",
     analogy: "Sorting files into drawers (Partitioning) vs. buying more filing cabinets (Sharding)."
  }
];

const TOPICS = [
  { id: "all", label: "🌐 All", questions: [1,2,3,4,5,6,7,8,9,10,11,12,13,14] },
  { id: "social", label: "📱 Social Media", questions: [1,6] },
  { id: "streaming", label: "🎬 Streaming", questions: [2] },
  { id: "messaging", label: "💬 Messaging", questions: [4,9] },
  { id: "search", label: "🔍 Search", questions: [5,11] },
  { id: "ecommerce", label: "🛒 E-Commerce", questions: [7] },
  { id: "storage", label: "☁️ Storage", questions: [8] },
  { id: "maps", label: "🗺️ Maps & Ride", questions: [3,13] },
  { id: "finance", label: "💳 Finance", questions: [12] },
  { id: "dist-sys", label: "🌐 Distributed Systems", questions: [8,5,11,12,14,2] },
  { id: "misc", label: "🔧 Utilities", questions: [10,14] }
];

const DIST_SYS_IDS = ['c6', 'c7', 'c10', 'c13', 'c14', 'c22', 'c23', 'c24', 'c33', 'c34', 'c46', 'c47', 'c52', 'c53', 'c54', 'c58', 'c59'];
const MICROSEC_IDS = ['c9', 'c15', 'c16', 'c17', 'c18', 'c19', 'c20', 'c21', 'c25', 'c26', 'c30', 'c31', 'c32', 'c37', 'c38', 'c39', 'c40', 'c41', 'c42', 'c48', 'c50', 'c51', 'c55', 'c56', 'c57'];

const DISTRIBUTED_CONCEPTS = CONCEPTS.filter(c => DIST_SYS_IDS.includes(c.id));
const MICROSERVICES_CONCEPTS = CONCEPTS.filter(c => MICROSEC_IDS.includes(c.id));

const CONCEPT_LINKS = {
  "c1": [{ label: "Horizontal vs Vertical Scaling", url: "https://www.cloudzero.com/blog/horizontal-vs-vertical-scaling" }],
  "c2": [{ label: "Redis Caching Strategies", url: "https://redis.com/redis-enterprise/data-structures/caching/" }],
  "c3": [{ label: "Database Sharding Principles", url: "https://www.digitalocean.com/community/tutorials/understanding-database-sharding" }],
  "c4": [{ label: "Message Queues vs Pub/Sub", url: "https://aws.amazon.com/message-queue/" }],
  "c5": [{ label: "CDN Architecture: What is a CDN?", url: "https://www.cloudflare.com/learning/cdn/what-is-a-cdn/" }],
  "c6": [{ label: "IBM: CAP Theorem Explained", url: "https://www.ibm.com/topics/cap-theorem" }],
  "c7": [{ label: "Consistent Hashing Algorithm", url: "https://www.toptal.com/big-data/consistent-hashing" }],
  "c8": [{ label: "Rate Limiting Strategies", url: "https://stripe.com/blog/rate-limiters" }],
  "c9": [{ label: "Martin Fowler: Microservices", url: "https://martinfowler.com/articles/microservices.html" }],
  "c10": [{ label: "OWASP: System Design Security", url: "https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html" }],
  "c11": [{ label: "Scaling Up vs Scaling Out", url: "https://www.ibm.com/topics/scale-out-vs-scale-up" }],
  "c12": [{ label: "SQL vs NoSQL: High-level differences", url: "https://www.mongodb.com/nosql-explained/nosql-vs-sql" }],
  "c13": [{ label: "OLTP vs OLAP", url: "https://aws.amazon.com/compare/the-difference-between-olap-and-oltp/" }],
  "c14": [{ label: "Columnar Storage Explained", url: "https://www.snowflake.com/guides/columnar-database/" }],
  "c15": [{ label: "Datastax: Cassandra Architecture", url: "https://docs.datastax.com/en/cassandra-oss/3.0/cassandra/architecture/archIntro.html" }],
  "c16": [{ label: "Amazon DynamoDB Deep Dive", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.html" }],
  "c17": [{ label: "Apache Spark Core Concepts", url: "https://spark.apache.org/docs/latest/cluster-overview.html" }],
  "c18": [{ label: "Apache Flink Architecture", url: "https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/flink-architecture/" }],
  "c19": [{ label: "gRPC vs REST: Comparing APIs", url: "https://cloud.google.com/blog/products/api-management/understanding-grpc-rest-and-their-differences" }],
  "c20": [{ label: "Kafka vs RabbitMQ: Which one to choose?", url: "https://www.cloudamqp.com/blog/when-to-use-rabbitmq-or-apache-kafka.html" }],
  "c21": [{ label: "Bloom Filters: Space-efficient Probabilistic Sets", url: "https://en.wikipedia.org/wiki/Bloom_filter" }],
  "c22": [{ label: "Why Vector Clocks are hard", url: "https://riak.com/posts/technical/why-vector-clocks-are-hard/" }],
  "c23": [{ label: "Quorum-based Consistency", url: "https://en.wikipedia.org/wiki/Quorum_(distributed_computing)" }],
  "c24": [{ label: "Gossip Protocol Guide", url: "https://en.wikipedia.org/wiki/Gossip_protocol" }],
  "c25": [{ label: "Write-Ahead Log (WAL) Principles", url: "https://en.wikipedia.org/wiki/Write-ahead_logging" }],
  "c26": [{ label: "Service Discovery in Microservices", url: "https://microservices.io/patterns/client-side-discovery.html" }],
  "c27": [{ label: "Database Replication Strategies", url: "https://en.wikipedia.org/wiki/Replication_(computing)" }],
  "c28": [{ label: "What is Edge Computing?", url: "https://www.cloudflare.com/learning/edge-computing/what-is-edge-computing/" }],
  "c29": [{ label: "AWS S3 Select Documentation", url: "https://aws.amazon.com/s3/features/s3-select/" }],
  "c30": [{ label: "Martin Fowler: Circuit Breaker", url: "https://martinfowler.com/bliki/CircuitBreaker.html" }],
  "c31": [{ label: "CQRS Pattern", url: "https://microservices.io/patterns/data/cqrs.html" }],
  "c32": [{ label: "Backpressure in Streaming Systems", url: "https://medium.com/@jayphelps/backpressure-explained-illustrated-7fbc0a4843" }],
  "c33": [{ label: "Two-Phase Commit Protocol", url: "https://en.wikipedia.org/wiki/Two-phase_commit_protocol" }],
  "c34": [{ label: "The Secret Lives of Data (Raft)", url: "http://thesecretlivesofdata.com/raft/" }],
  "c37": [{ label: "LSM-Trees vs B-Trees", url: "https://en.wikipedia.org/wiki/Log-structured_merge-tree" }],
  "c38": [{ label: "gRPC: High Performance RPC", url: "https://grpc.io/docs/what-is-grpc/introduction/" }],
  "c39": [{ label: "HTTP/3 and QUIC", url: "https://www.cloudflare.com/learning/performance/what-is-http-3/" }],
  "c40": [{ label: "Saga Pattern: Distributed Transactions", url: "https://microservices.io/patterns/data/saga.html" }],
  "c41": [{ label: "What is a Service Mesh?", url: "https://www.redhat.com/en/topics/microservices/what-is-a-service-mesh" }],
  "c42": [{ label: "Merkle Trees in Distributed Systems", url: "https://en.wikipedia.org/wiki/Merkle_tree" }],
  "c46": [{ label: "Google Spanner & TrueTime", url: "https://cloud.google.com/spanner/docs/true-time-external-consistency" }],
  "c47": [{ label: "Distributed Locks with Redis", url: "https://redis.io/docs/manual/patterns/distributed-locks/" }],
  "c48": [{ label: "Sidecar Pattern", url: "https://docs.microsoft.com/en-us/azure/architecture/patterns/sidecar" }],
  "c50": [{ label: "Martin Fowler: Strangler Fig", url: "https://martinfowler.com/bliki/StranglerFigApplication.html" }],
  "c51": [{ label: "BFF Pattern", url: "https://samnewman.io/patterns/architectural/bff/" }],
  "c52": [{ label: "OpenTelemetry: Distributed Tracing", url: "https://opentelemetry.io/docs/concepts/observability-primer/#distributed-traces" }],
  "c53": [{ label: "Split-Brain in Distributed Systems", url: "https://en.wikipedia.org/wiki/Split-brain_(computing)" }],
  "c54": [{ label: "AWS: Leader Election", url: "https://aws.amazon.com/builders-library/leader-election-in-distributed-systems/" }],
  "c55": [{ label: "Domain-Driven Design", url: "https://martinfowler.com/bliki/DomainDrivenDesign.html" }],
  "c56": [{ label: "Transactional Outbox Pattern", url: "https://microservices.io/patterns/data/transactional-outbox.html" }],
  "c57": [{ label: "Bulkhead Pattern", url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead" }],
  "c58": [{ label: "Principles of Chaos Engineering", url: "https://principlesofchaos.org/" }],
  "c59": [{ label: "Interactive Intro to CRDTs", url: "https://jakelazaroff.com/words/an-interactive-intro-to-crdts/" }]
};

const TRADEOFF_LINKS = {
  "Latency vs Throughput": [{ label: "Understanding Latency vs Throughput", url: "https://aws.amazon.com/compare/the-difference-between-throughput-and-latency/" }],
  "Consistency vs Availability": [{ label: "CAP Theorem Revisited", url: "https://robertgreiner.com/cap-theorem-revisited/" }, { label: "PACELC Overview", url: "https://en.wikipedia.org/wiki/PACELC_theorem" }],
  "Read vs Write Optimization": [{ label: "B-Trees vs LSM-Trees", url: "https://en.wikipedia.org/wiki/Log-structured_merge-tree" }],
  "SQL vs NoSQL": [{ label: "SQL vs NoSQL: High-level differences", url: "https://www.mongodb.com/nosql-explained/nosql-vs-sql" }],
  "Sync vs Async Communication": [{ label: "Synchronous vs Asynchronous Microservices", url: "https://tanzu.vmware.com/developer/guides/spring-microservices-sync-async/" }],
  "Stateful vs Stateless": [{ label: "Stateless Architecture in Cloud", url: "https://www.redhat.com/en/topics/cloud-native-apps/stateful-vs-stateless" }],
  "Monolith vs Distributed": [{ label: "Microservices vs Monolith Architecture", url: "https://www.atlassian.com/microservices/microservices-architecture/microservices-vs-monolith" }],
  "Vertical vs Horizontal Scaling": [{ label: "Scaling Up vs Scaling Out", url: "https://www.ibm.com/topics/scale-out-vs-scale-up" }],
  "Sharding vs Partitioning": [{ label: "Database Sharding Principles", url: "https://www.digitalocean.com/community/tutorials/understanding-database-sharding" }]
};

const GUIDES_DATA = [
  {
    id: "g1",
    icon: "🗄️",
    title: "Cassandra Architecture Deep Dive",
    desc: "A rich exploration into the fundamental mechanics of Apache Cassandra, ring topology, and tuning.",
    tags: ["NoSQL", "Wide-Column", "Distributed DB"],
    color: "#ff3366",
    url: "cassandra-architecture.html"
  },
  {
    id: "g2",
    icon: "✨",
    title: "Clean Code Principles",
    desc: "The ultimate guide to writing maintainable, scalable, and legible code.",
    tags: ["Best Practices", "Refactoring", "Clean Code"],
    color: "#00d4ff",
    url: "clean-code.html"
  },
  {
    id: "g3",
    icon: "☁️",
    title: "Cloud Services Masterclass",
    desc: "A sprawling overview of modern cloud infrastructure mapping native services.",
    tags: ["AWS", "Cloud Native", "Infrastructure"],
    color: "#ffaa00",
    url: "cloud-services.html"
  },
  {
    id: "g4",
    icon: "🌐",
    title: "The DNS Journey",
    desc: "A step-by-step technical walk-through of the Domain Name System resolution process.",
    tags: ["Networking", "DNS", "Protocols"],
    color: "#7c5cfc",
    url: "dns-journey.html"
  },
  {
    id: "g6",
    icon: "📬",
    title: "Kafka vs RabbitMQ (Enhanced)",
    desc: "Deep comparative mechanics between two titans of message brokering and event streaming.",
    tags: ["Kafka", "RabbitMQ", "Message Brokers"],
    color: "#ff3366",
    url: "kafka-rabbitmq-enhanced.html"
  },
  {
    id: "g7",
    icon: "📨",
    title: "Kafka vs RabbitMQ Basics",
    desc: "The foundational introductory guide to messaging queues.",
    tags: ["Pub-Sub", "Queues"],
    color: "#7c5cfc",
    url: "kafka-rabbitmq.html"
  },
  {
    id: "g8",
    icon: "🧱",
    title: "Microservices Flow & Design",
    desc: "A visual explanation of microservices workflows and API gateway routing.",
    tags: ["Architecture", "Microservices", "API Gateway"],
    color: "#00f0ff",
    url: "microservices-flow.html"
  },
  {
    id: "g9",
    icon: "🍃",
    title: "Spring Boot + Kafka/RabbitMQ",
    desc: "Detailed implementation and architecture for integrating message brokers in Spring Boot.",
    tags: ["Spring Boot", "Java", "Messaging"],
    color: "#32CD32",
    url: "springboot-kafka-rabbitmq.html"
  },
  {
    id: "g10",
    icon: "🏗️",
    title: "Modern Data Architecture",
    desc: "A complete visual guide to Kafka, Flink, Spark, ETL/ELT, Data Lake, Warehouse & OLAP.",
    tags: ["Data Engineering", "Big Data", "Architecture"],
    color: "#f59e0b",
    url: "modern-data-architecture.html"
  },
  {
    id: "g11",
    icon: "⎈",
    title: "Kubernetes Architecture Deep Dive",
    desc: "A comprehensive guide to Kubernetes components, control plane, worker nodes, and service mesh.",
    tags: ["Kubernetes", "Orchestration", "Cloud Native", "Architecture"],
    color: "#3178c6",
    url: "kubernetes-architecture.html"
  },
  {
    id: "g12",
    icon: "🔭",
    title: "Observability Stacks Reference",
    desc: "A deep dive into the 3 pillars of observability: Logs, Metrics, and Traces with ELK, EFK, and Grafana stacks.",
    tags: ["Observability", "Monitoring", "ELK", "Grafana", "Prometheus"],
    color: "#f5a623",
    url: "observability-stacks.html"
  },
  {
    id: "g13",
    icon: "🎨",
    title: "LLD Interview Prep Guide",
    desc: "Master Object-Oriented Programming (OOP) concepts, SOLID principles, and the 23 Gang of Four (GoF) design patterns.",
    tags: ["LLD", "Object Oriented", "Design Patterns", "SOLID"],
    color: "#6c63ff",
    url: "lld-interview-prep.html"
  },
  {
    id: "g14",
    icon: "🛒",
    title: "Ecommerce HLD Interview Guide",
    desc: "A comprehensive high-level design for an online delivery platform like Amazon, covering orders, inventory, and fulfillment.",
    tags: ["Ecommerce", "HLD", "Scalability", "System Design"],
    color: "#f97316",
    url: "ecommerce-hld-interview.html"
  },
  {
    id: "g15",
    icon: "🔎",
    title: "Search Platform HLD",
    desc: "Designing a scalable search platform with indexing, ranking, and retrieval for massive datasets.",
    tags: ["Search", "Indexing", "HLD", "Elasticsearch"],
    color: "#3b82f6",
    url: "search-platform-hld.html"
  },
  {
    id: "g16",
    icon: "📱",
    title: "TikTok System Design",
    desc: "Architecture of a short-video social platform covering feed generation, video processing, and low-latency delivery.",
    tags: ["Social Media", "Video", "TikTok", "Feed"],
    color: "#ff0050",
    url: "tiktok-system-design.html"
  },
  {
    id: "g17",
    icon: "🐦",
    title: "Twitter HLD Deep Dive",
    desc: "An in-depth look at Twitter's architecture, including the feed service, fan-out strategy, and real-time updates.",
    tags: ["Twitter", "HLD", "Microservices", "Fan-out"],
    color: "#1da1f2",
    url: "twitter-hld.html"
  }
];

const QUESTION_LINKS = {
  1: [
    { label: "High Scalability: Twitter Architecture", url: "http://highscalability.com/blog/2013/7/8/the-architecture-twitter-uses-to-deal-with-150m-active-users.html" },
    { label: "Twitter's Real-Time Delivery System", url: "https://blog.twitter.com/engineering/en_us/topics/infrastructure/2017/the-infrastructure-behind-twitter-scale" }
  ],
  2: [
    { label: "Netflix TechBlog: Streaming Architecture", url: "https://netflixtechblog.com/" },
    { label: "How Netflix Scales its API with GraphQL", url: "https://netflixtechblog.com/how-netflix-scales-its-api-with-graphql-federation-part-1-ae355cecadee" }
  ],
  3: [
    { label: "Uber Architecture Deep Dive", url: "http://highscalability.com/blog/2015/9/14/how-uber-scales-their-real-time-market-platform.html" }
  ],
  4: [
    { label: "WhatsApp Architecture", url: "http://highscalability.com/blog/2014/2/26/the-whatsapp-architecture-facebook-bought-for-19-billion.html" },
    { label: "Erlang in WhatsApp", url: "https://www.erlang-factory.com/upload/presentations/558/efsf2012-whatsapp-scaling.pdf" }
  ],
  5: [
    { label: "Hello Interview: Search Indexing", url: "https://www.hellointerview.com/learn/system-design/answer-keys/search-indexing" },
    { label: "Google Search Architecture", url: "https://systemdesignhandbook.com/chapters/search-engine" }
  ],
  6: [
    { label: "Instagram Architecture Update", url: "http://highscalability.com/blog/2011/12/6/instagram-architecture-update-from-5-to-30-million-users-in-9.html" },
    { label: "Design Instagram (Photo Sharing)", url: "https://medium.com/@narengowda/system-design-interview-instagram-photo-sharing-app-3ade35cecadee" }
  ],
  7: [
    { label: "Amazon Inventory Policy", url: "https://www.amazon.science/tag/supply-chain-optimization" },
    { label: "ByteByteGo: E-Commerce System", url: "https://bytebytego.com/courses/system-design-interview/design-an-ecommerce-system" }
  ],
  8: [
    { label: "The Dropbox Architecture", url: "http://highscalability.com/blog/2013/10/21/the-dropbox-architecture.html" },
    { label: "Design Google Drive/Dropbox", url: "https://medium.com/@narengowda/system-design-google-drive-dropbox-88834cadee" }
  ],
  9: [
    { label: "ByteByteGo: Notification System", url: "https://bytebytego.com/courses/system-design-interview/design-a-notification-system" }
  ],
  10: [
    { label: "System Design: URL Shortener", url: "https://www.geeksforgeeks.org/system-design-url-shortening-service/" },
    { label: "TinyURL Architecture", url: "http://highscalability.com/blog/2009/4/27/tinyurl-architecture.html" }
  ],
  11: [
    { label: "Design Autocomplete / Typeahead", url: "https://bytebytego.com/courses/system-design-interview/design-search-autocomplete" }
  ],
  12: [
    { label: "Stripe Architecture", url: "https://stripe.com/blog/engineering" },
    { label: "Idempotency Keys", url: "https://stripe.com/docs/api/idempotent_requests" }
  ],
  13: [
    { label: "Yelp Architecture (Search at Scale)", url: "http://highscalability.com/blog/2015/7/27/yelp-architecture-search-at-scale.html" }
  ],
  14: [
    { label: "Snowflake Architecture Deep Dive", url: "https://www.snowflake.com/blog/snowflake-architecture-deep-dive/" },
    { label: "Twitter Snowflake ID Generation", url: "https://blog.twitter.com/engineering/en_us/a/2010/announcing-snowflake" }
  ]
};


