import React from "react";

const cards = [
  {
    title: "For the manager",
    quote: "\u201cI do not need another program. I need help this week.\u201d",
    body: "New leaders need support tied to real work, not another disconnected requirement.",
  },
  {
    title: "For HR and Talent",
    quote: "\u201cI have programs, but no single defensible leadership story.\u201d",
    body: "Data is spread across systems, and progress is difficult to explain upward.",
  },
  {
    title: "For the executive sponsor",
    quote: "\u201cWe still discover risk too late and cannot prove impact.\u201d",
    body: "Leadership investment lacks early signals, visibility, and a clear line to outcomes.",
  },
];

export default function LandingProblem() {
  return (
    <section id="home-problem" className="py-24 bg-white px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0202FF] mb-4">
          The current gap
        </p>
        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-950 mb-5 max-w-2xl">
          Why support still arrives too late
        </h2>
        <p className="text-base text-gray-500 leading-relaxed max-w-2xl mb-14">
          Healthcare organizations already invest in leadership programs, coaching, and learning. The problem is timing: support often arrives after the behavior, team impact, and risk are already visible.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-white border border-gray-100 rounded-xl p-7 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                {card.title}
              </div>
              <blockquote className="text-base font-serif font-semibold text-gray-900 leading-snug mb-4">
                {card.quote}
              </blockquote>
              <p className="text-sm text-gray-500 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}