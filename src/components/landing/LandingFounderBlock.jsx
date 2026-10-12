import React from "react";
import { Link } from "react-router-dom";

export default function LandingFounderBlock() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <img
            src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/f336eb700_g6u1oy.jpg"
            alt="Emilio Osoria, Founder of Curiosity Led"
            className="w-24 h-24 rounded-2xl object-cover border border-gray-200 flex-shrink-0"
          />
          <div>
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
              <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
              <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">Why I built this</span>
            </div>
            <h2 className="text-2xl font-bold text-[#0a0a0a] leading-tight mb-4">
              Hi, I'm Emilio Osoria.
            </h2>
            <p className="text-gray-600 text-base leading-relaxed mb-4">
              I started Curiosity Led because manager development is broken. Organizations spend billions on training, coaching, and assessments every year. Almost none of it produces evidence that anything actually changed.
            </p>
            <p className="text-gray-600 text-base leading-relaxed mb-6">
              Curiosity Led is what I wish I had when I was building and leading teams. It works inside the tools managers already use — Teams, Slack, email — so support arrives in the flow of work, not in a separate portal nobody opens.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/in/emilioosoria"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#0202ff] hover:underline"
              >
                Connect on LinkedIn →
              </a>
              <Link to="/about" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                Read the full story
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}