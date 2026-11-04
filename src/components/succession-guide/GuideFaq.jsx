import { FAQS } from "./guideContent";

export default function GuideFaq() {
  return (
    <section id="faq" className="max-w-3xl scroll-mt-24">
      <h2 className="font-serif text-[1.75rem] leading-tight tracking-[-0.015em] text-[#151515] md:text-[2rem]">
        Frequently asked questions
      </h2>
      <div className="mt-8 divide-y divide-[#E6E1D7] border-y border-[#E6E1D7]">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
              <span className="text-[15.5px] font-semibold leading-snug text-[#151515]">{item.q}</span>
              <span className="mt-0.5 text-xl leading-none text-[#8A847D] transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 pr-8 text-[15px] leading-[1.75] text-[#4A4540]">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}