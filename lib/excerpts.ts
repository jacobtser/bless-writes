export interface BookExcerpt {
  /** Stable slug shared by the storefront and the production seed. */
  slug: string;
  /** Short editorial label above the excerpt title. */
  kicker: string;
  /** A headline written for the excerpt, not necessarily the chapter title. */
  displayTitle: string;
  /** The book's own subtitle, used in the book feature. */
  bookSubtitle: string;
  chapterTitle: string;
  readingTime: string;
  lead: string;
  paragraphs: string[];
  pullQuote: string;
  /** Insert the pull quote after this zero-based paragraph. */
  pullQuoteAfter: number;
  /** Chapter titles shown as a compact "inside the book" list. */
  inside: string[];
}

/**
 * Curated public excerpts. These are intentionally short, self-contained
 * scenes chosen to show the voice of each book before the purchase decision.
 *
 * The full books remain private and are only streamed through /api/view-book.
 */
const EXCERPTS: BookExcerpt[] = [
  {
    slug: "faith-beyond-my-resources",
    kicker: "From Chapter One",
    displayTitle: "The prayer before the storm",
    bookSubtitle: "A journey of prayer, perseverance, and God's provision.",
    chapterTitle: "When You Have a Dream but No Resources",
    readingTime: "1 min read",
    lead: "A boy learns to pray while walking home, long before the prayers that would carry him through closed doors, hardship, and the search for a scholarship.",
    paragraphs: [
      "From my childhood, my parents introduced my siblings and me to Christ. We went to church, we prayed, and we took part in church activities. I learned to fast sometimes, and gradually prayer became more than something I did because my parents told me to. It became something I personally desired. Looking back, I realize my parents were building something in me that money could never buy: my relationship with God.",
      "I became so accustomed to praying that I sometimes prayed while walking, quietly talking to God under my breath. To me, it was normal. Then one day a friend noticed me and asked something that made me instantly conscious of myself: \u201cAre you becoming mad?\u201d After that I prayed in my mind instead \u2014 but the prayer did not stop. I had simply learned to pray differently.",
      "That experience reminds me of something important: I did not start praying because I was poor. I did not start praying because I needed a scholarship. I did not start praying because my father died. Prayer had been planted in me long before the storms came.",
    ],
    pullQuote: "Prayer had been planted in me long before the storms came.",
    pullQuoteAfter: 1,
    inside: [
      "When God Seems Silent",
      "When Doors Keep Closing",
      "When You Must Wait",
      "When the Answer Finally Comes",
    ],
  },
  {
    slug: "from-a-five-cedi-mat-to-first-class",
    kicker: "From Chapter One",
    displayTitle: "The village boy",
    bookSubtitle: "A story of faith, resilience, honest work, and opportunity.",
    chapterTitle: "The Village Boy",
    readingTime: "2 min read",
    lead: "A boy from Kasseh grows up hawking fish and sachet water, carries 30 pesewas to school, and is made an office boy in Primary Six \u2014 the first small responsibility that would quietly prepare him for a future he could not yet imagine.",
    paragraphs: [
      "Every story has a beginning, and mine began in Kasseh, a vibrant community in the Ada-East District of Ghana. I grew up in a modest family where life was never easy. We rarely had the things we wanted, but my parents worked tirelessly to provide for us and send us to school. My father, the late Moses Abanam Koranteng, was a commercial driver. My mother, Joyce Nortey Koranteng, was a petty trader \u2014 walking long distances to sell at the local market, and on off-market days hawking items from our house.",
      "As children, we could see these struggles and quickly learned to contribute in whatever small ways we could. My siblings and I started petty trading ourselves, hawking fish, sachet water, bananas, and other small items. We were not chasing grand business dreams at that age; we were helping our parents put food on the table. Those streets taught me a lesson textbooks could never capture: there is true dignity in honest work, no matter how small it may seem.",
      "In lower primary I received about 30 pesewas as school allowance; in upper primary it rose to about 70 pesewas, often only after pleading with my parents. Those amounts were a constant reminder of our financial constraints. By Primary Six, I was appointed office boy at Korlekope D/A Basic School \u2014 the first official responsibility entrusted to me by anyone outside my home. I was a thoroughly average student then, certainly not the boy anyone expected to graduate with First Class Honours. But that small responsibility taught me that the things we consider small are quietly preparing us for futures we have not yet imagined.",
    ],
    pullQuote: "There is true dignity in honest work, no matter how small it may seem.",
    pullQuoteAfter: 1,
    inside: [
      "We Sold to Survive",
      "Old Uniforms, Big Dreams",
      "The Quiz That Changed My Confidence",
      "The Five-Cedi Mat",
    ],
  },
];

const BY_SLUG = new Map(EXCERPTS.map((excerpt) => [excerpt.slug, excerpt]));

const DEMO_ALIASES: Record<string, string> = {
  "demo-1": "faith-beyond-my-resources",
  "demo-2": "from-a-five-cedi-mat-to-first-class",
};

export function getBookExcerpt(slug: string | null | undefined): BookExcerpt | null {
  if (!slug) return null;
  return BY_SLUG.get(DEMO_ALIASES[slug] ?? slug) ?? null;
}
