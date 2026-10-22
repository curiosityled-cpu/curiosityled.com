import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import CertificateDesign from "./CertificateDesign";

const fileSafe = (text) => (text || "certificate").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

/** Renders the certificate off-screen and saves it as a landscape PDF. */
export async function downloadCertificate(cert, learnerName) {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;";
  document.body.appendChild(host);

  const root = createRoot(host);
  const ref = React.createRef();
  flushSync(() => root.render(React.createElement(CertificateDesign, { ref, cert, learnerName })));

  try {
    const node = ref.current;
    const images = Array.from(node.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => { img.onload = res; img.onerror = res; })))
    );

    const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${fileSafe(cert.title)}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}