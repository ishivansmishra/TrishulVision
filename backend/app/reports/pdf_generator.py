from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
import io


def generate_pdf(report_data: dict) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    c.setTitle("TrishulVision Mining Report")

    c.setFont("Helvetica-Bold", 18)
    c.drawString(2*cm, height - 2.5*cm, "TrishulVision Mining Detection Report")
    c.setFont("Helvetica", 10)
    c.drawString(2*cm, height - 3.2*cm, "Automated AI analysis with GIS and DEM integration")

    y = height - 4.5*cm
    # Key metrics
    est = (report_data or {}).get('estimation') or {}
    area = (report_data or {}).get('area_ha')
    tx = (report_data or {}).get('tx_hash')
    metrics = [
        ("Area analyzed (ha)", str(area) if area is not None else "N/A"),
        ("Estimated depth (m)", str(est.get('depth_m', 'N/A'))),
        ("Estimated volume (m^3)", str(est.get('volume_m3', 'N/A'))),
        ("Blockchain tx/hash", tx or "N/A"),
    ]
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, y, "Key Metrics:")
    y -= 0.8*cm
    c.setFont("Helvetica", 11)
    for k, v in metrics:
        c.drawString(2.5*cm, y, f"- {k}: {v}")
        y -= 0.7*cm

    # Notes
    y -= 0.4*cm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, y, "Notes:")
    y -= 0.8*cm
    c.setFont("Helvetica", 10)
    for line in [
        "This document is auto-generated. Visual overlays and 3D terrain are available in the portal.",
        "Values are estimates unless ground-truth validated.",
    ]:
        c.drawString(2.5*cm, y, f"- {line}")
        y -= 0.6*cm

    c.showPage()
    c.save()
    return buf.getvalue()
