import React from "react";
import { AlertTriangle, TrendingDown, Users, BarChart3, Activity, Shield, RefreshCw, Layers, TrendingUp, Repeat } from "lucide-react";
import { getIndustryConfig } from "./industryConfig";

const ICON_MAP = {
  AlertTriangle,
  TrendingDown,
  Users,
  BarChart3,
  Activity,
  Shield,
  RefreshCw,
  Layers,
  TrendingUp,
  Repeat,
};

export default function IndustryProblem({ industry }) {
  const cfg = getIndustryConfig(industry);
  const { problem } = cfg;

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{problem.heading}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">{problem.intro}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {problem.cards.map((p) => {
            const Icon = ICON_MAP[p.icon] || AlertTriangle;
            return (
              <div key={p.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: p.color + "15" }}
                >
                  <Icon className="w-5 h-5" style={{ color: p.color }} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}