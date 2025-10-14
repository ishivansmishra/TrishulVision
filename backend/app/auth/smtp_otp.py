import smtplib
import random
import logging
from email.message import EmailMessage
from ..config import settings


def send_otp(email: str) -> str:
    otp = str(random.randint(100000, 999999))
    # TODO: persist OTP in DB with expiry (already persisted by caller)
    msg = EmailMessage()
    msg['Subject'] = 'Your TrishulVision OTP'
    frm = settings.SMTP_FROM or settings.SMTP_USER or "no-reply@localhost"
    msg['From'] = frm
    msg['To'] = email
    msg.set_content(f'Your OTP is: {otp}')
    try:
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
                if settings.SMTP_USER:
                    s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
                if settings.SMTP_TLS:
                    s.starttls()
                if settings.SMTP_USER:
                    s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.send_message(msg)
        logging.info("Sent OTP email to %s via SMTP host %s", email, settings.SMTP_HOST)
    except Exception as e:
        # fall back to logging in dev; keep a controlled dev-visible OTP if explicitly allowed
        logging.warning("SMTP error while sending OTP to %s: %s", email, e)
        if getattr(settings, 'LOG_OTP_ON_FAILURE', True):
            logging.info("OTP for %s: %s", email, otp)
    return otp
