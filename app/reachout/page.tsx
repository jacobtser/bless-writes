import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reach Out",
};

export default function ReachoutPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(176,141,79,0.14),transparent),var(--paper)] px-5 py-14">
      <div className="w-full max-w-3xl">
        <h1 className="mb-8 text-center font-display text-4xl font-semibold tracking-tight text-ink">Reach out to the author</h1>
        <div className="rounded-2xl bg-white shadow-lg">
          <form
            action="https://formspree.io/f/xjyyangv"
            method="POST"
            target="_blank"
            rel="noopener noreferrer"
            className="grid gap-5 p-8"
          >
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink-faint">Your name</label>
              <input
                id="name"
                type="text"
                name="name"
                required
                className="mt-1 w-full rounded-lg border border-pine/30 bg-paper px-4 py-2.5 focus:border-pine focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-faint">Email address</label>
              <input
                id="email"
                type="email"
                name="_replyto"
                required
                className="mt-1 w-full rounded-lg border border-pine/30 bg-paper px-4 py-2.5 focus:border-pine focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-ink-faint">Message</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className="mt-1 w-full rounded-lg border border-pine/30 bg-paper px-4 py-2.5 focus:border-pine focus:outline-none"
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-pine px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pine-deep"
            >
              Send message
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-ink-faint">
          Your email is used only to reply to your inquiry — never shared.
        </p>
      </div>
    </main>
  );
}
