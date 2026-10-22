import React, { forwardRef } from "react";
import { CERTIFICATE_BRAND_NAME, CERTIFICATE_LOGO_URL } from "./certificateConfig";

const cornerShape = { clipPath: "polygon(100% 0,100% 100%,0 0)" };
const baseShape = { clipPath: "polygon(0 0,100% 0,90% 100%,0 100%)" };

/** Modern Geometric certificate layout. Fixed 1000px width; rendered to PDF. */
const CertificateDesign = forwardRef(function CertificateDesign({ cert, learnerName }, ref) {
  const issued = cert.issued_date
    ? new Date(cert.issued_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";
  const hasScore = cert.final_score !== undefined && cert.final_score !== null && cert.final_score !== "";
  const courseTitle = cert.metadata?.course_title || cert.title;
  const competencies = cert.competencies_demonstrated || [];

  return (
    <div
      ref={ref}
      className="relative isolate box-border w-[1000px] overflow-hidden border border-[#d9ddf4] bg-white px-[58px] pb-[38px] pt-[46px] text-[#111747]"
      style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif' }}
    >
      <div className="absolute right-0 top-0 -z-10 h-[190px] w-[230px] bg-[#0202ff]" style={cornerShape} />
      <div className="absolute bottom-0 left-0 -z-10 h-[34px] w-[360px] bg-[#e6e8ff]" style={baseShape} />

      <div className="relative border border-[#dfe2f7] px-8 pb-6 pt-[26px]">
        <div className="absolute -left-px -top-px h-20 w-2 bg-[#0202ff]" />

        <div className="mb-6 flex items-center justify-between">
          <img
            src={CERTIFICATE_LOGO_URL}
            alt={CERTIFICATE_BRAND_NAME}
            crossOrigin="anonymous"
            width={613}
            height={225}
            className="-ml-2 h-auto w-[240px] max-w-none"
          />
          <span className="mr-[10px] h-[38px] w-[38px] rotate-45 border border-[#c9cdf3]" />
        </div>

        <p className="mb-[7px] text-[12px] font-bold uppercase leading-[1.4] tracking-[0.2em] text-[#555fd4]">
          Certificate of Completion
        </p>
        <h1 className="m-0 text-[37px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#111747]">
          {cert.title}
        </h1>
        <p className="mb-[9px] mt-[18px] text-[47px] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#0202ff]">
          {learnerName}
        </p>
        <p className="m-0 text-[17px] leading-[1.45] text-[#333b69]">Course: {courseTitle}</p>

        <div className="mt-7 grid grid-cols-2 gap-7 border-l-4 border-[#0202ff] bg-[#e6e8ff] px-[19px] py-4">
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11px] font-bold uppercase leading-[1.35] tracking-[0.15em] text-[#555b93]">Issued</span>
            <span className="text-[15px] font-semibold leading-[1.4] text-[#171d50]">{issued}</span>
          </div>
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11px] font-bold uppercase leading-[1.35] tracking-[0.15em] text-[#555b93]">Score</span>
            <span className="text-[15px] font-semibold leading-[1.4] text-[#171d50]">{hasScore ? `${cert.final_score}%` : "—"}</span>
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between gap-5">
          <div className="flex flex-col gap-2">
            {competencies.length > 0 && (
              <>
                <span className="text-[11px] font-bold uppercase leading-[1.35] tracking-[0.15em] text-[#555b93]">Competencies</span>
                <div className="flex flex-wrap gap-2">
                  {competencies.map((comp) => (
                    <span key={comp} className="border border-[#c7cbef] bg-white px-[11px] py-1.5 text-[12px] font-semibold leading-[1.2] text-[#222a64]">
                      {comp}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-end gap-[15px]">
            {hasScore && (
              <div className="flex flex-col items-center gap-1 bg-[#0202ff] px-[14px] py-[9px] text-white">
                <span className="text-[9px] font-bold uppercase leading-[1.35] tracking-[0.15em] text-[#dfe1ff]">Score</span>
                <strong className="text-[17px] leading-[1.2]">{cert.final_score}%</strong>
              </div>
            )}
            <div className="max-w-[270px] text-right [overflow-wrap:anywhere]">
              <span className="text-[11px] font-bold uppercase leading-[1.35] tracking-[0.15em] text-[#555b93]">Code</span>
              <div className="text-[11px] font-semibold leading-[1.4] tracking-[0.035em] text-[#39406f]">{cert.verification_code}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 h-px bg-[#dfe2f7]" />
      </div>
    </div>
  );
});

export default CertificateDesign;